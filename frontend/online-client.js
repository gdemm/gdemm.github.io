import {SelectionReturn} from './selection-return.js';
import {renderTeamBotControls} from './team-bot-controls.js';
import {createSocketDecoder} from './socket-decoder.js';
import {createServerDialog} from './server-dialog.js';
import {serverRegions,regionTokenKey,regionalRooms} from './server-regions.js';
import {initialSummonerName,SUMMONER_NAME_KEY} from './summoner-name.js';
import {installLobbyFlow,updateLobbyFlow,renderTeamRoster} from './lobby-flow.js';
import {sameUnitIdentity} from './model-identity.js';
import {renderRoomList,canJoinRoom} from './room-list.js';
import {applyStateDelta} from './state-delta.js?v=prediction-1';
import {PROTOCOL_VERSION} from './protocol.js';
const TOKEN_KEY = 'howling-abyss-online-token-v1';
const NAME_KEY = SUMMONER_NAME_KEY;

function apiOrigin() {
  const configured = globalThis.__ARAM_GAME_API_ORIGIN__ || '';
  if (!configured) return location.origin;
  const url = new URL(configured);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('联机服务器地址无效');
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');
  return url.origin + path;
}

function wsUrl(origin=apiOrigin()) {
  const base = new URL(origin);
  const prefix = base.pathname === '/' ? '' : base.pathname.replace(/\/+$/, '');
  return `${base.protocol === 'https:' ? 'wss:' : 'ws:'}//${base.host}${prefix}/ws`;
}

function text(id) {
  return document.getElementById(id);
}

export class AramOnline {
  constructor({ getLoadout, onEnter, onState, onLeave, onChat=()=>{} }) {
    this.getLoadout = getLoadout;
    this.onEnter = onEnter;
    this.onState = onState;
    this.onLeave = onLeave;
    this.onChat = onChat;
    this.ws = null;
    this.connected = false;
    this.connecting = false;
    this.active = false;
    this.id = 0;
    this.room = null;
    this.rooms = [];
    this.region='local';this.regionalLists=new Map();
    try{const saved=localStorage.getItem('aram-region');if(this.nodes().some(n=>n.id===saved))this.region=saved;else localStorage.setItem('aram-region',this.region);}catch{}
    this.ping = 0;this.lastPongAt=0;
    this.attempts = 0;
    this.stopped = true;
    this.retryTimer = 0;
    this.heartbeat = 0;
    this.stateWatchdog = 0;
    this.selectionReturn=new SelectionReturn({send:m=>this.send(m),loadout:()=>this.getLoadout(),onReturn:()=>{this.active=false;this.spectating=false;this.onLeave();},changed:()=>this.render(),notice:(m,error)=>this.status(m,error)});
    this.bind();
    this.render();
  }

  bind() {
    this.lobbyMode='online';installLobbyFlow(this);
    const selectionStatus=document.createElement('p');selectionStatus.id='selectionReturnStatus';selectionStatus.hidden=true;selectionStatus.setAttribute('role','status');selectionStatus.setAttribute('aria-live','polite');text('onlineTeam').parentElement.prepend(selectionStatus);
    const name = text('onlineName');
    if(this.nodes().length>1){
      const selector=createServerDialog(this.nodes(),id=>this.chooseServer(id));this.serverSelector=selector;this.serverDialog=selector.dialog;this.regionButtons=selector.buttons;
      this.serverSwitch=document.createElement('button');this.serverSwitch.type='button';this.serverSwitch.textContent='切换服务器';this.serverSwitch.onclick=()=>this.openServerDialog();const refresh=text('onlineRefresh'),heading=refresh.parentElement;
      const actions=document.createElement('div');actions.className='online-room-list-actions';
      actions.style.cssText='display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-left:auto;flex:none';
      heading.append(actions);actions.append(refresh,this.serverSwitch);
      name.addEventListener('input',()=>this.render());
    }


    let nameStorage;try{nameStorage=globalThis.localStorage;}catch{}
    name.value=initialSummonerName(nameStorage);
    text('onlineConnect').onclick = () => this.openServerDialog();
    text('onlineCreate').onclick = () => {
      this.send({ type: 'create', ...this.getLoadout(), name: text('onlineRoomName').value, maxPlayers: Number(text('onlineMaxPlayers').value), fountainDefense: text('onlineFountainDefense').checked });
    };
    const botTeam=document.createElement('select');botTeam.id='onlineBotTeam';botTeam.setAttribute('aria-label','人机阵营');botTeam.innerHTML='<option value="0">蓝方</option><option value="1">红方</option>';botTeam.style.cssText='height:36px;max-width:85px;background:#102631;color:#dec992;border:1px solid #49616b;border-radius:4px;padding:0 8px';const quick=document.createElement('button');quick.id='onlineQuickBot';quick.textContent='快速添加';quick.type='button';quick.onclick=()=>this.send({type:'quickAddBot'});text('onlineBot').before(quick,botTeam);botTeam.onchange=()=>this.render();text('onlineBot').onclick = () => this.send({type:'addBot',team:Number(botTeam.value)});
    text('onlineRemoveBot').onclick = () => this.send({type:'removeBot',team:Number(botTeam.value)});
    text('onlineTeam').onclick = () => {
      const me = this.room?.players?.find((player) => player.id === this.id);
      this.send({ type: 'team', team: me?.team === 0 ? 1 : 0 });
    };
    text('onlineStart').onclick = () => {
      const me = this.room?.players?.find((player) => player.id === this.id);
      this.selectionReturn.entering(this.room);
      const sent=this.room?.phase==='playing'&&!me?.inGame?this.send({type:'enter',...this.getLoadout()}):this.send({type:'start'});
      if(!sent)this.selectionReturn.failed();
    };
    text('onlineLeave').onclick = () => this.leave();
    text('onlineRefresh').onclick = () => this.refreshRooms();
    name.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !this.connected) this.openServerDialog();
    });
  }

  openServerDialog(){
    if(this.room||this.connecting)return false;
    if(!text('onlineName').value.trim()){this.status('先输入召唤师昵称',true);text('onlineName').focus();return false;}
    if(!this.serverDialog){this.connect();return true;}
    this.serverSelector?.setSelection(this.region);this.render();if(!this.serverDialog.open)this.serverDialog.showModal();return true;
  }
  chooseServer(id){
    if(this.room||this.connecting||!this.nodes().some(n=>n.id===id))return false;
    this.serverDialog?.close();
    const connected=this.connected;
    if(id!==this.region)this.switchRegion(id);
    if(!connected)this.connect();
    return true;
  }

  connect() {
    const name = text('onlineName').value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 18);
    if (!name) {
      this.status('先输入召唤师昵称', true);
      text('onlineName').focus();
      return;
    }
    if (this.connected || this.connecting) return;
    try { localStorage.setItem(NAME_KEY, name); } catch {}
    this.stopped = false;
    this.connecting = true;
    this.status('正在连接本服务器…');
    this.render();
    const node=this.nodes().find(n=>n.id===this.region)||this.nodes()[0];
    const socket = new WebSocket(wsUrl(node.origin));
    this.ws = socket;
    const timeout = setTimeout(() => socket.close(), 8_000);
    socket.onopen = () => {
      if(socket!==this.ws)return;
      let token = '';
      try { token = localStorage.getItem(regionTokenKey(node.id)) || ''; } catch {}
      socket.send(JSON.stringify({ type: 'hello', protocol: PROTOCOL_VERSION, deltaState:1, roomDelta:1, loadingIdleGuard:1, stateAck:1, name, token }));
    };
    const decoder=createSocketDecoder(message=>{if(socket!==this.ws)return;if(message.type==='welcome')clearTimeout(timeout);this.handle(message);});
    socket.onmessage=event=>{if(socket===this.ws)decoder.decode(event.data);};
    socket.onerror = () => {};
    socket.onclose = (event) => {
      decoder.close();
      clearTimeout(timeout);
      if (socket !== this.ws) return;
      clearInterval(this.heartbeat);
      clearInterval(this.stateWatchdog);
      this.connected = false;
      this.connecting = false;
      this.selectionReturn.disconnected();
      if(this.selectionReturn.selecting)this.room=null;
      this.attempts++;
      const final = this.stopped || event.code === 4002 || event.code === 4001 || this.attempts >= 4;
      this.status(event.code === 4001 ? '此会话已在另一个页面连接，请关闭重复页面' : event.code === 4002 ? '页面版本已更新，请刷新' : final ? '服务器连接中断，请重新连接' : '连接中断，正在重连…', true);
      this.render();
      if (!final) this.retryTimer = setTimeout(() => this.connect(), this.attempts * 1_000);
    };
  }

  handle(message) {
    switch (message.type) {
      case 'welcome':
        this.lastPongAt=0;
        this.connected = true;
        this.connecting = false;
        this.attempts = 0;
        this.id = message.id;
        this.fullState = null;
        this.stateSequence = 0;
        this.lastResyncAt = -Infinity;
        this.lastPacketAt = 0;
        try { localStorage.setItem(regionTokenKey(this.region), message.token); } catch {}
        clearInterval(this.heartbeat);
        this.heartbeat = setInterval(() => this.send({ type: 'ping', at: Date.now() }), 3_000);
        clearInterval(this.stateWatchdog);
        this.stateWatchdog = setInterval(() => this.watchStateGap(), 100);
        this.status(message.resumed ? '已恢复联机会话' : '已连接本服务器');
        if(this.nodes().length>1){clearInterval(this.regionPoll);this.regionPoll=setInterval(()=>{if(!this.room&&this.connected)this.refreshRooms();},10000);this.refreshRooms();}
        this.selectionReturn.welcomed();
        this.flushPendingJoin();
        break;
      case 'lobby':
        this.botPolicy=message.botPolicy??null;
        this.setRegionalRooms(this.region,Array.isArray(message.rooms)?message.rooms:[]);
        break;
      case 'room': {
        const priorTeam=this.room?.players?.find(p=>p.id===this.id)?.team;
        const hadRoom = Boolean(this.room);
        this.room = message.room;
        if (!message.room && hadRoom) {
          const wasActive = this.active;
          this.active = false;
          if (wasActive) this.onLeave();
        }
        this.selectionReturn.room(message.room);
        const selected=message.room?.players?.find(p=>p.id===this.id);
        if(this.selectionReturn.selecting&&!this.selectionReturn.pending&&selected&&!selected.inGame&&priorTeam!==selected.team)this.status('当前已选择'+(selected.team===0?'蓝方':'红方')+'，可点击“加入战斗”。');
        break;
      }
      case 'stateDelta':
        if(!this.fullState||message.base!==this.stateSequence){this.requestStateSync();return;}
        if(!message.room&&!this.room&&!this.selectionReturn.selecting){this.requestStateSync();return;}
        message={type:'state',room:message.room??this.room,seq:message.seq,game:applyStateDelta(this.fullState,message.patch)};
      case 'state':
        const packetNow=performance.now();
        if(this.lastPacketAt&&!document.hidden){this.packetGaps??=[];this.packetGaps.push({at:packetNow,gap:packetNow-this.lastPacketAt});this.packetGaps=this.packetGaps.filter(p=>packetNow-p.at<5000);const sorted=this.packetGaps.map(p=>p.gap).sort((a,b)=>a-b);this.packetGap=Math.round(sorted.reduce((a,b)=>a+b,0)/Math.max(1,sorted.length));this.packetGapP95=Math.round(sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]||0);this.packetGapMax=Math.round(sorted.at(-1)||0);}
        this.lastPacketAt=packetNow;
        this.fullState=message.game;this.stateSequence=message.seq;
        // A socket write callback only confirms nginx received the bytes.
        // Confirm browser receipt so slow links cannot accumulate old ticks.
        if(Number.isSafeInteger(message.seq))this.send({type:'stateAck',seq:message.seq});
        if(!this.selectionReturn.acceptsState(message.game,message.room))return;
        const roundChanged=this.room?.id===message.room?.id&&message.room?.continuous&&this.lastRound!==message.room.round;
        this.lastRound=message.room?.round;this.spectating=!!message.game.local?.spectator;
        this.room = message.room;
        if (!this.active||roundChanged) {
          this.active = true;
          this.onEnter(message.game, message.room);
        }
        this.onState(message.game, message.room);
        break;
      case 'pong':
        this.ping = Math.max(0, Date.now() - Number(message.at || Date.now()));this.lastPongAt=Date.now();
        break;
      case 'chat':
      case 'chatHistory':
      case 'chatError':
        if(message.roomId===this.room?.id)this.onChat(message);
        return;
      case 'error':
        this.selectionReturn.failed();
        this.status(message.message || '操作失败', true);
        break;
    }
    // Battle snapshots arrive at 20 Hz; do not rebuild the hidden lobby every packet.
    if(message.type!=='state')this.render();
  }

  send(message) {
    if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) {
      this.status('尚未连接服务器', true);
      return false;
    }
    if (this.ws.bufferedAmount > 64_000 && message.type!=='battleReady') return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  requestStateSync() {
    const now = performance.now();
    if (now - (this.lastResyncAt ?? -Infinity) < 500) return;
    if (this.send({ type: 'stateResync' })) this.lastResyncAt = now;
  }

  watchStateGap(now=performance.now()) {
    if(!this.connected||!this.active||this.room?.phase!=='playing'||document.hidden||!this.lastPacketAt)return false;
    if(now-this.lastPacketAt<350||now-(this.lastResyncAt??-Infinity)<1000)return false;
    const before=this.lastResyncAt;
    this.requestStateSync();
    return this.lastResyncAt!==before;
  }

  action(message) {
    return this.active && !this.spectating && this.send(message);
  }

  updateLoadout() {
    const me = this.room?.players?.find((player) => player.id === this.id);
    if (this.room?.phase === 'waiting' || this.room?.phase === 'playing' && !me?.inGame) this.send({ type: 'ready', ...this.getLoadout() });
  }

  returnToSelection() {
    if(!this.connected)return false;
    return this.selectionReturn.begin(this.room,this.fullState?.local?.unitId);
  }

  leave() {
    this.selectionReturn.leave();
    if (this.room) this.send({ type: 'leave' });
  }

  close() {
    this.selectionReturn.close();
    this.stopped = true;
    clearTimeout(this.retryTimer);
    clearInterval(this.regionPoll);
    clearInterval(this.heartbeat);
    clearInterval(this.stateWatchdog);
    this.ws?.close();
  }

  nodes(){return serverRegions(apiOrigin());}
  setRegionalRooms(id,rooms){
    const node=this.nodes().find(n=>n.id===id);if(!node)return;
    this.regionalLists??=new Map();this.regionRevisions??=new Map();
    this.regionRevisions.set(id,(this.regionRevisions.get(id)||0)+1);
    this.regionalLists.set(id,regionalRooms(rooms,node));
    this.rooms=this.nodes().flatMap(n=>this.regionalLists.get(n.id)||[]);
  }
  switchRegion(id){
    if(this.room||this.connecting||!this.nodes().some(n=>n.id===id))return false;
    if(this.region===id)return false;
    const reconnect=this.connected,old=this.ws;this.ws=null;this.close();old?.close();
    this.region=id;this.pendingJoin=null;this.connected=false;this.connecting=false;this.active=false;this.id=0;this.fullState=null;this.stateSequence=0;this.botPolicy=null;this.attempts=0;
    try{localStorage.setItem('aram-region',id);}catch{}
    this.render();if(reconnect)this.connect();return true;
  }
  joinRoom(id){
    const room=this.rooms.find(r=>r.id===id);
    if(!this.connected||this.connecting||this.room||!canJoinRoom(room))return false;
    if(room.regionId&&room.regionId!==this.region){
      if(!this.switchRegion(room.regionId))return false;
      this.pendingJoin={regionId:room.regionId,id:room.serverRoomId};return true;
    }
    return this.send({type:'join',id:room.serverRoomId??room.id,...this.getLoadout()});
  }
  flushPendingJoin(){
    const pending=this.pendingJoin;this.pendingJoin=null;
    if(pending&&pending.regionId===this.region&&!this.room)this.send({type:'join',id:pending.id,...this.getLoadout()});
  }

  async refreshRooms(){
    if(this.refreshingRegions)return;
    this.refreshingRegions=true;
    const failures=[];
    try{await Promise.all(this.nodes().map(async node=>{
      const revision=this.regionRevisions?.get(node.id)||0;
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
      try{
        const response=await fetch(node.origin+'/api/rooms',{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw Error('unavailable');const rooms=await response.json();
        if(!Array.isArray(rooms))throw Error('invalid rooms');
        if((this.regionRevisions?.get(node.id)||0)===revision)this.setRegionalRooms(node.id,rooms);
      }catch{
        if((this.regionRevisions?.get(node.id)||0)===revision)this.setRegionalRooms(node.id,[]);
        failures.push(node.label);
      }finally{clearTimeout(timer);}
    }));if(failures.length)this.status(failures.join('、')+'房间列表暂时不可用，其他区服不受影响',true);
    }finally{this.refreshingRegions=false;this.render();}
  }

  status(message, error = false) {
    const output = text('onlineStatus');
    output.textContent = message;
    output.classList.toggle('error', error);
    const selectionStatus=text('selectionReturnStatus');if(selectionStatus){selectionStatus.textContent=message;selectionStatus.hidden=!error&&!this.selectionReturn?.selecting;selectionStatus.classList.toggle('error',error);}
  }

  render() {
    {const H={pentakill:['五杀乐队','技能伤害 +20%，18 级 +40%'],cafe:['甜心咖啡','血包回复翻倍，刷新时间减半'],arcade:['街机','每人第一次阵亡立刻复活'],debonair:['老板派','所有金币收入 +50%']},h=this.room?.phase==='playing'&&H[this.room.headliner];let b=document.getElementById('hxHeadliner');
     if(h&&!b){b=document.createElement('div');b.id='hxHeadliner';b.style.cssText='position:fixed;left:50%;top:228px;transform:translateX(-50%);z-index:60;pointer-events:none;padding:8px 16px;border:1px solid #c8aa6e;border-radius:4px;background:rgba(8,20,30,.88);color:#f0e6d2;font-size:14px;text-align:center;transition:all .6s';document.body.append(b);}
     const hxAug=!!document.querySelector('.augment-dialog[open]');if(b){b.style.display=hxAug?'none':'';if(hxAug){delete b.dataset.key;if(!this.hxAugPoll)this.hxAugPoll=setInterval(()=>{if(!document.querySelector('.augment-dialog[open]')){clearInterval(this.hxAugPoll);this.hxAugPoll=null;this.render();}},300);}}if(b&&!hxAug){if(!h)b.remove();else if(b.dataset.key!==this.room.headliner+':'+(this.room.round||0)){b.dataset.key=this.room.headliner+':'+(this.room.round||0);b.innerHTML='<b style="color:#f0d99a">本局演出 · '+h[0]+'</b><br><small>'+h[1]+'</small>';b.style.top='228px';b.style.fontSize='14px';clearTimeout(this.hxHeadTimer);this.hxHeadTimer=setTimeout(()=>{b.style.top='40px';b.style.fontSize='11px';b.style.padding='3px 10px';b.innerHTML='<b style="color:#f0d99a">'+h[0]+'</b> · '+h[1];},7000);}}}
    const selectionStatus=text('selectionReturnStatus'),actions=text('onlineTeam')?.parentElement;if(selectionStatus&&actions){if(this.room&&selectionStatus.parentElement!==actions)actions.prepend(selectionStatus);else if(!this.room&&selectionStatus.parentElement===actions)actions.closest('.lobby-panel')?.append(selectionStatus);}
    if(this.serverSwitch){this.serverSwitch.hidden=!this.connected;this.serverSwitch.disabled=!!this.room||this.connecting;}
    if(this.serverSelector){if(!this.serverDialog.open)this.serverSelector.setSelection(this.region);this.serverSelector.setDisabled(!!this.room||this.connecting||!text('onlineName').value.trim());}
    text('lobby').dataset.onlineStage = !this.connected ? 'identity' : this.room ? 'room' : 'browser';
    const connect = text('onlineConnect');
    renderRoomList(text('onlineRooms'),this.rooms,{enabled:this.connected&&!this.room,onJoin:id=>this.joinRoom(id)});
    connect.disabled = this.connected || this.connecting;
    connect.textContent = this.connected ? `已进入${this.region==='shanghai'?'德玛西亚':'本服务器'}${this.ping ? ` · ${this.ping}ms` : ''}` : this.connecting ? '连接中…' : '进入联机大厅';
    text('onlineCreate').disabled = !this.connected || Boolean(this.room) || Boolean(this.selectionReturn.pending);
    text('onlineRefresh').disabled = !this.connected;
    const me = this.room?.players?.find((player) => player.id === this.id);
    text('onlineTeam').disabled = Boolean(this.selectionReturn.pending) || !me || this.room.phase === 'ended' || this.room.phase === 'playing' && me.inGame;
    text('onlineTeam').textContent = me ? `当前${me.team === 0 ? '蓝方' : '红方'} · 切换到${me.team === 0 ? '红方' : '蓝方'}` : '切换阵营';
    const canStart = Boolean(me && this.room.hostId === this.id && this.room.phase === 'waiting');
    const canEnter = Boolean(me && this.room.phase === 'playing' && !me.inGame);
    text('onlineStart').disabled = !canStart && !canEnter;
    text('onlineStart').textContent = canEnter ? '加入战斗' : '开始对局';
    text('onlineLeave').disabled = !this.room || Boolean(this.selectionReturn.pending);
    if(text('backLobby'))text('backLobby').disabled=Boolean(this.selectionReturn.pending);
    const policy=this.botPolicy,canManage=me&&(this.room?.continuous||this.room?.matchmaking||this.room?.hostId===this.id&&this.room?.phase==='waiting');
    text('onlineBot').disabled=!canManage||this.room?.roomBotsBlocked||!policy?.allowed||(this.room.botCount||0)>=30||this.room.count>=this.room.maxPlayers;
    text('onlineBot').textContent=`添加人机（${this.room?.botCount||0}/30）`;
    const quick=text('onlineQuickBot');if(quick){quick.disabled=text('onlineBot').disabled;quick.title='下一次添加到'+(this.room?.nextQuickBotTeam===1?'右边（红方）':'左边（蓝方）');}text('onlineBot').title=(this.room?.roomBotsBlocked?'房间已达到人机限制':policy?.reason)||'匹配房可在对局中添加，最多30名人机';
    const botTeam=text('onlineBotTeam'),team=Number(botTeam?.value||0);if(botTeam)botTeam.disabled=!canManage;text('onlineRemoveBot').disabled=!canManage||!((this.room?.removableBotCounts?.[team]??this.room?.removableBotCount)>0);
    const roster = text('onlineRoster');
    renderTeamRoster(roster,this.room,this.id);renderTeamBotControls(this,roster);
    text('onlineRoomCode').textContent = this.room ? `房间 ${this.room.name} · ${this.room.id} · 允许中途加入` : '可加入等待中或对局中的房间';
    updateLobbyFlow(this);
  }
}

function decode(value, references, heroes, depth = 0) {
  if (value == null || typeof value !== 'object' || depth > 8) return value;
  if ('$unit' in value) return references.units.get(value.$unit) ?? null;
  if ('$projectile' in value) return references.projectiles.get(value.$projectile) ?? null;
  if ('$zone' in value) return references.zones.get(value.$zone) ?? null;
  if ('$hero' in value) return heroes.get(value.$hero) ?? null;
  if ('$set' in value) return new Set(value.$set.map((item) => decode(item, references, heroes, depth + 1)));
  if (Array.isArray(value)) return value.map((item) => decode(item, references, heroes, depth + 1));
  const result = {};
  for (const [key, item] of Object.entries(value)) result[key] = decode(item, references, heroes, depth + 1);
  return result;
}

function applyRecords(rawRecords, currentRecords, references, heroes, kind, serverTime) {
  const next = [];
  for (const raw of rawRecords ?? []) {
    const map = references[kind];
    const current = map.get(raw.id);
    const decoded = decode(raw, references, heroes);
    const oldX = current?.x;
    const oldY = current?.y;
    const target = current ?? {};
    const sampleTime=decoded.kind==='minion'&&Number.isFinite(decoded.netPositionTime)?decoded.netPositionTime:serverTime;
    const duplicate=decoded.kind==='minion'&&current&&(Number.isFinite(decoded.netPositionTime)?sampleTime===target.netSampleTime:decoded.x===target.netX&&decoded.y===target.netY&&serverTime-(target.netSampleTime??serverTime)<.095);
    const previousAge=target.netSampleAge||0,previousSampleTime=target.netSampleTime;
    const previousVX=target.netVelocityX||0,previousVY=target.netVelocityY||0;
    const gap=sampleTime-(target.netSampleTime??sampleTime);
    const dx=decoded.x-target.netX,dy=decoded.y-target.netY;
    const speedLimit=Math.max(1,(decoded.speed||0)*1.5);
    const continuous=decoded.kind==='minion'&&gap>0&&gap<=.3&&Number.isFinite(dx)&&Number.isFinite(dy)&&Math.hypot(dx,dy)<=speedLimit*gap+2;
    const canPredict=continuous&&decoded.alive!==false&&!(decoded.stun>0)&&!(decoded.root>0);
    Object.assign(target, decoded);
    target.netVelocityX=canPredict?dx/gap:0;target.netVelocityY=canPredict?dy/gap:0;
    target.netSampleTime=sampleTime;target.netSampleAge=Math.min(.1,Math.max(0,serverTime-sampleTime));
    if(duplicate){target.netSampleTime=previousSampleTime;target.netSampleAge=previousAge;target.netVelocityX=previousVX;target.netVelocityY=previousVY;}
    if(decoded.alive===false||decoded.stun>0||decoded.root>0||decoded.animUntil>serverTime&&decoded.animation==='attack'){target.netVelocityX=0;target.netVelocityY=0;}
    if (current && Number.isFinite(decoded.x) && Number.isFinite(oldX)) {
      target.x = oldX;
      target.y = oldY;
      target.netX = decoded.x;
      target.netY = decoded.y;
    } else if (Number.isFinite(decoded.x)) {
      target.netX = decoded.x;
      target.netY = decoded.y;
    }
    next.push(target);
  }
  return next;
}

const heroLookups=new WeakMap();
function heroLookup(list){let map=heroLookups.get(list);if(!map){map=new Map(list.map(h=>[h.id,h]));heroLookups.set(list,map);}return map;}
export function applyOnlineSnapshot(game, snapshot, heroList) {
  const heroes=heroLookup(heroList);
  const references = {
    units: new Map(game.hasAuthoritativeSnapshot?game.units.map((unit) => [unit.id, unit]):[]),
    projectiles: new Map(game.hasAuthoritativeSnapshot?game.projectiles.map((projectile) => [projectile.id, projectile]):[]),
    zones: new Map(game.hasAuthoritativeSnapshot?(game.zones ?? []).map((zone) => [zone.id, zone]):[]),
  };
  for (const raw of snapshot.units ?? []) {const current=references.units.get(raw.id);if(!current||!sameUnitIdentity(current,raw))references.units.set(raw.id, {});}
  game.hasAuthoritativeSnapshot=true;
  for (const raw of snapshot.projectiles ?? []) if (!references.projectiles.has(raw.id)) references.projectiles.set(raw.id, {});
  for (const raw of snapshot.zones ?? []) if (!references.zones.has(raw.id)) references.zones.set(raw.id, {});

  game.units = applyRecords(snapshot.units, game.units, references, heroes, 'units', snapshot.time);
  const liveMissiles=new Set((snapshot.projectiles||[]).map(p=>p.id));for(const old of game.projectiles)if(!liveMissiles.has(old.id))old.life=0;
  game.projectiles = applyRecords(snapshot.projectiles, game.projectiles, references, heroes, 'projectiles', snapshot.time);
  game.zones = applyRecords(snapshot.zones, game.zones ?? [], references, heroes, 'zones', snapshot.time);
  for (const key of ['combatEvents', 'effects', 'floaters', 'events', 'killEvents', 'signals', 'relics', 'augmentZones', 'crueltyComets', 'cannonFlights', 'cannonLandings']) {
    game[key] = decode(snapshot[key] ?? [], references, heroes);
  }
  for (const key of ['time', 'wave', 'nextWave', 'winner', 'announce', 'announceUntil']) game[key] = snapshot[key];
  game.netSilence=0;
  game.score = [...(snapshot.score ?? [0, 0])];
  const local = snapshot.local ?? {};
  game.player = references.units.get(local.unitId) ?? game.units[0];
  for (const unit of game.units) if (unit.kind === 'hero' && unit.netPeerId) unit.player = unit === game.player;
  if(game.predictedMove){const p=game.player,m=game.predictedMove;if(!p.alive||p.stun>0||p.root>0||p.charm>0||p.dash){game.predictedMove=null;}else if(p.dest&&Math.hypot(p.dest.x-m.x,p.dest.y-m.y)<8){m.confirmed=true;}else if(m.confirmed||m.age>.5)game.predictedMove=null;}
  game.gold = local.gold ?? 0;
  game.items = [...(local.items ?? [])];
  game.itemStacks = { ...(local.itemStacks ?? {}) };
  game.shopHistory = [...(local.shopHistory ?? [])];
  game.kills = local.kills ?? 0;
  game.deaths = local.deaths ?? 0;
  game.assists = local.assists ?? 0;
  game.scoreboard = Array.isArray(snapshot.scoreboard) ? snapshot.scoreboard : null;
}

export function interpolateOnline(game, dt) {
  game.time += Math.min(dt, 0.05);game.netSilence=(game.netSilence||0)+dt;
  const blend = 1 - Math.exp(-Math.min(dt, 0.05) * 22);
  for (const item of [...game.units, ...game.projectiles, ...(game.zones ?? [])]) {
    if (!Number.isFinite(item.netX) || !Number.isFinite(item.netY)) continue;
    if(item===game.player&&game.predictedMove&&game.netSilence<.25){
      const m=game.predictedMove;m.age+=dt;
      if(item.alive&&!(item.stun>0)&&!(item.root>0)&&!(item.charm>0)&&!item.dash&&!(item.castUntil>game.time)){
        game.walk(item,m,Math.min(dt,.05));
        if(m.confirmed){const d=Math.hypot(m.x-item.netX,m.y-item.netY)||1,lead=Math.min(.1,(game.networkPing||0)/2000)*item.speed;const tx=item.netX+(m.x-item.netX)/d*Math.min(d,lead),ty=item.netY+(m.y-item.netY)/d*Math.min(d,lead);const e=Math.hypot(item.x-tx,item.y-ty);if(e>80){item.x=tx;item.y=ty;}else if(e>8){item.x+=(tx-item.x)*.12;item.y+=(ty-item.y)*.12;}}
        continue;
      }
    }
    // Only extrapolate minions for a short gap. Never predict combat or keep
    // travelling indefinitely after a lost connection.
    item.netSampleAge=Math.min(.1,(item.netSampleAge||0)+Math.min(dt,.05));
    const minion=item.kind==='minion',ahead=minion?item.netSampleAge:0;
    const x=item.netX+(item.netVelocityX||0)*ahead,y=item.netY+(item.netVelocityY||0)*ahead;
    const smoothing=minion?1-Math.exp(-Math.min(dt,.05)*60):blend;
    item.x += (x-item.x)*smoothing;
    item.y += (y-item.y)*smoothing;
  }
}

export function bindOnlineCommands(game, online) {
 game.evolveKaisa=index=>online.action({type:'evolve',index});
  game.move = (x, y) => {if(!Number.isFinite(x)||!Number.isFinite(y)||!game.player.alive)return false;const ok=online.action({type:'move',x,y});if(ok){const p=game.navigation?game.navigation.snap(x,y):{x,y};game.predictedMove={...p,age:0,confirmed:false};game.networkPing=online.ping||0;}return ok;};
  game.attackMove = (x, y) => {game.predictedMove=null;return online.action({ type: 'attackMove', x, y });};
  game.attackTarget = (target) => {game.predictedMove=null;return online.action({ type: 'attack', targetId: target?.id });};
  game.stop = (hold = false) => {game.predictedMove=null;return online.action({ type: 'stop', hold });};
  game.cast = (index, aim) => {game.predictedMove=null;return online.action({ type: 'cast', index, x: aim?.x, y: aim?.y, targetId: aim?.id });};
  game.ping = (ping,point,targetId) => online.action({type:'mapPing',ping,x:point.x,y:point.y,targetId});
  game.mastery = () => online.action({type:'mastery'});
  game.buy = (id) => online.action({ type: 'buy', id });
  game.sellItem = (index) => online.action({ type: 'sell', index });
  game.undoPurchase = () => online.action({ type: 'undo' });
  game.useItem = (index,aim={}) => online.action({ type: 'useItem', index, x:aim.x, y:aim.y, targetId:aim.targetId });
  game.chooseAugment = (id,binding) => online.action({type:'augment',id,binding});
  game.rerollAugment = (index) => online.action({type:'augmentReroll',index});
}
