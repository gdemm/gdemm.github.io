import {syncModeHaste} from '../dist/bot-haste.js';
import {recipientRealmView,canInteract} from '../dist/classic-realms.js';
import {teamTrapView} from '../dist/trap-visibility.js';
import {enterCannon,launchCannon,cancelCannon,cannonPosition} from '../dist/cannon-gameplay.js';
import {thinkContinuousBot} from './smart-continuous-bots.js';
import {chooseContinuousBotHeroes,chooseAddedBotHero} from './continuous-bot-roster.js';
import {onlineHumans,roomBlocksBots,clearRoomBots,ROOM_HUMAN_BOT_LIMIT} from './room-bot-limit.js';
import {mappedSpawnPosition,freeTeamSlot} from '../dist/spawn-position.js';
import {IDLE_AFTER_MS,IDLE_CHOICE_MS,notePlayerActivity} from './idle-policy.js';
import {initAugments,repairAugmentOffers} from '../dist/augment-rules.js';
import {canSelectAugment} from '../dist/augment-window.js';
import {signalsFor,sendPing,showMastery} from '../dist/signals.js';
import { randomBytes, randomInt } from 'node:crypto';
import { Game, HEROES, clamp } from '../dist/engine.js';
import { MAP_CONFIG } from '../dist/map-config.js';
import { gameSnapshot, playerFloaters, playerAnnouncement } from './snapshot.js';
import {chatHistory,sendRoomChat,scoreboardFor,installCombatStats} from './match-social.js';

import {PROTOCOL_VERSION} from '../dist/protocol.js';
export {PROTOCOL_VERSION};
export const MAX_ROOMS = 16;
export const MAX_SESSIONS = 64;
export const MAX_PLAYERS = 50;
export const MAX_ROOM_BOTS = 30;
const RECONNECT_GRACE_MS = 15_000;
const EMPTY_ROOM_TTL_MS = 30_000;
export const ENDED_ROOM_TTL_MS = 60_000;
export const MAX_MATCH_DURATION_MS = 45 * 60_000;

const HERO_BY_ID = new Map(HEROES.map((hero) => [hero.id, hero]));
const TEAM_NAMES = ['蓝方', '红方'];
const battleKey=room=>`${room.id}:${room.round??0}`;
export const PRO_PLAYER_BOT_NAMES = ['UZI','Faker','Xiaohu','Bin','TheShy','Rookie','JackeyLove','Ruler','Chovy','Knight','Deft','Scout','Meiko','Ming','Canyon','ShowMaker','Karsa','MLXG','Clearlove','Caps','Peanut','Keria','Zeus','Kanavi','Tian','Doinb','369','Bdd','Ambition','Rekkles','Perkz'];
function botNickname(used,avoid=new Set()){let available=PRO_PLAYER_BOT_NAMES.filter(name=>!used.has(name)&&!avoid.has(name));if(!available.length)available=PRO_PLAYER_BOT_NAMES.filter(name=>!used.has(name));return available.length?available[randomInt(available.length)]:`Faker${randomInt(1000,9999)}`;}

const nav = {
  canWalk(x, y) {
    return Number.isFinite(x) && Number.isFinite(y) && x >= 5 && x <= 3195 && y >= -400 && y <= 400;
  },
  snap(x, y) {
    return { x: clamp(Number(x) || 0, 5, 3195), y: clamp(Number(y) || 0, -400, 400) };
  },
};

// Lets a host (the offline worker) swap in the real map walk grid; game.navigation keeps this same object.
export function setArenaNavigation(real){if(real?.canWalk&&real?.snap){nav.canWalk=real.canWalk;nav.snap=real.snap;}}

function safeText(value, fallback, max) {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
  return text || fallback;
}

function roomCode() {
  return randomBytes(3).toString('hex').toUpperCase();
}

function publicPlayer(record) {
  return {
    bot: Boolean(record.bot),
    id: record.peer.id,
    name: record.peer.name,
    team: record.team,
    hero: record.heroId,
    ready: record.ready,
    inGame: Boolean(record.unit),
    connected: record.peer.connected,
    kills: record.kills||0,
    deaths: record.deaths||0,
  };
}

function localState(record) {
  return {
    peerId: record.peer.id,
    unitId: record.unitId,
    gold: record.gold,
    // Network frames are retained as delta baselines. Keep their local data
    // immutable when a later purchase mutates the authoritative record.
    items: [...record.items],
    itemStacks: { ...record.itemStacks },
    shopHistory: record.shopHistory.map((entry) => ({
      ...entry,
      items: [...(entry.items ?? [])],
      itemStacks: { ...(entry.itemStacks ?? {}) },
    })),
    kills: record.kills,
    deaths: record.deaths,
    assists: record.assists,
  };
}

export class AramArena {
  constructor({singleRoom=process.env.ARAM_SINGLE_ROOM==='1'}={}) {
    this.singleRoomEnabled=singleRoom;this.primaryRoomId=null;
    this.rooms = new Map();
    this.peers = new Map();
    this.tokens = new Map();
    this.nextPeerId = 1;
    this.lobbyDirty = true;
    this.lastBroadcast = 0;
    this.broadcastFromTick = true;
  }

  activeRooms(){return this.singleRoomEnabled?(this.primaryRoomId&&this.rooms.has(this.primaryRoomId)?[this.rooms.get(this.primaryRoomId)]:[]):this.rooms.values();}

  hello(name, token, send) {
    let peer = typeof token === 'string' ? this.tokens.get(token) : undefined;
    const resumed = Boolean(peer);
    if (!peer) {
      if (this.peers.size >= MAX_SESSIONS) throw new Error('服务器人数已满，请稍后再试');
      const usedNames = new Set([...this.peers.values()].map(peer => peer.name));
      const start = randomInt(9000);
      let assignedName;
      for (let offset = 0; offset < 9000; offset++) {
        const candidate = '召唤师' + (1000 + (start + offset) % 9000);
        if (!usedNames.has(candidate)) { assignedName = candidate; break; }
      }
      const sessionToken = randomBytes(24).toString('hex');
      peer = {
        id: this.nextPeerId++,
        token: sessionToken,
        name: assignedName,
        send,
        connected: true,
        roomId: null,
        disconnectedAt: 0,
      };
      this.peers.set(peer.id, peer);
      this.tokens.set(sessionToken, peer);
    } else {
      peer.send = send;
      peer.connected = true;
      peer.disconnectedAt = 0;
      peer.idleDetachedRound=undefined;
      peer.pendingDetachedLeaveAt=0;
      peer.idlePromptAt=0;
      const room = peer.roomId ? this.rooms.get(peer.roomId) : null;
      const record = room?.players.get(peer.id);
      if (record) record.peer = peer;
    }
    peer.send({ type: 'welcome', id: peer.id, name: peer.name, token: peer.token, resumed, protocol: PROTOCOL_VERSION });
    if(peer.roomId){const room=this.rooms.get(peer.roomId);if(room)this.enforceRoomBotLimit(room);}
    peer.send({ type: 'lobby', rooms: this.list(), botPolicy:this.botPolicy() });
    if (peer.roomId) {
      const room = this.rooms.get(peer.roomId);
      if (room) this.sendRoom(room, peer);
      else peer.roomId = null;
    }
    peer.lastInputAt=Date.now();
    peer.nativeEffectCursor=undefined;
    this.resendEndedState(peer);
    this.lobbyDirty = true;
    return peer;
  }

  disconnect(peer) {
    peer.connected = false;
    this.lobbyDirty = true;
    peer.disconnectedAt = Date.now();
    const room = peer.roomId ? this.rooms.get(peer.roomId) : null;
    const record = room?.players.get(peer.id);
    if (record?.unit && room.phase === 'playing') {
      record.unit.order = 'hold';
      record.unit.dest = null;
      record.unit.target = null;
    }
    if(record?.unit&&!record.spectator)this.resetUnattendedBots(room);
    if (room) this.broadcastRoom(room);
    this.lobbyDirty = true;
  }

  enableContinuousRoom() {
    this.continuousEnabled=true;
    this.ensureContinuousRoom();
  }

  ensureContinuousRoom() {
    if(this.singleRoomEnabled)this.continuousEnabled=true;
    if(!this.continuousEnabled)return;
    let room=this.singleRoomEnabled?this.rooms.get(this.primaryRoomId):[...this.rooms.values()].find(r=>r.continuous);
    if(!room){
      if(this.rooms.size>=MAX_ROOMS)return;
      let id=roomCode();while(this.rooms.has(id))id=roomCode();
      room={id,name:'1234',hostId:0,maxPlayers:MAX_PLAYERS,phase:'waiting',players:new Map(),bots:[],game:null,createdAt:Date.now(),emptyAt:0,fountainDefense:true,continuous:true,round:0,nextBotId:-3};
      this.rooms.set(id,room);if(this.singleRoomEnabled)this.primaryRoomId=id;this.lobbyDirty=true;
    }
    if(process.env.ARAM_DISABLE_BOTS==='1'){
      if(room.phase==='waiting'&&!room.game){
        const human=[...room.players.values()].find(record=>record.peer.connected);
        if(human){human.spectator=false;this.restartContinuousRoom(room);}
      }
      return;
    }
    if(!room.bots.length){
      const policy=this.botPolicy();if(!policy.allowed||policy.bots+2>30)return;
      room.bots=['Garen','Jinx'].map((heroId,index)=>({bot:true,peer:{id:-1-index,name:'',connected:true},team:index%2,heroId,summoners:['flash','heal'],ready:true,unit:null,unitId:null,gold:3500,items:[],itemStacks:{},shopHistory:[],kills:0,deaths:0,assists:0}));
      this.restartContinuousRoom(room);
    }
  }

  restartContinuousRoom(room) {
    if(process.env.ARAM_DISABLE_BOTS!=='1'&&![...room.players.values()].some(r=>r.peer.connected)){
      clearRoomBots(room);
      room.nextQuickBotTeam=0;
      room.bots=['Garen','Jinx'].map((heroId,team)=>({bot:true,manual:false,peer:{id:-1-team,name:'',connected:true},team,heroId,summoners:['flash','heal'],ready:true,unit:null,unitId:null,gold:3500,items:[],itemStacks:{},shopHistory:[],kills:0,deaths:0,assists:0}));
    }
    for(const record of [...room.players.values()])if(record.peer.idleDetachedRound!==undefined)this.dropDetachedPeer(record.peer);
    if(!room.bots.length){
      const human=[...room.players.values()].find(record=>record.peer.connected);
      if(!human){room.game=null;room.phase='waiting';this.broadcastRoom(room);this.lobbyDirty=true;return;}
      human.spectator=false;
    }
    room.round++;
    room.chat=[];room.chatSequence=0;
    const nextHeroes=chooseContinuousBotHeroes(room.bots.map(bot=>bot.heroId));
    const usedNames=new Set([...room.players.values()].map(record=>record.peer.name));
    const previousNames=new Set(room.bots.map(bot=>bot.peer.name).filter(Boolean));
    room.bots.forEach((bot,index)=>{
      bot.heroId=nextHeroes[index];
      bot.peer.name=botNickname(usedNames,previousNames);usedNames.add(bot.peer.name);
    });
    for(const bot of room.bots)Object.assign(bot,{smartState:null,failedAugmentOffers:null,unit:null,unitId:null,gold:3500,items:[],itemStacks:{},shopHistory:[],kills:0,deaths:0,assists:0,nextBuy:0});
    this.createGame(room);room.phase='playing';delete room.endedAt;this.broadcastRoom(room);this.broadcastState(room);this.lobbyDirty=true;
  }

  enforceRoomBotLimit(room){
    if(!roomBlocksBots(room)||!clearRoomBots(room))return false;
    this.lobbyDirty=true;this.broadcastRoom(room);if(room.game&&room.phase==='playing')this.broadcastState(room);return true;
  }

  botPolicy() {
    const humans=[...this.peers.values()].filter(p=>p.connected).length;
    const bots=[...this.rooms.values()].filter(r=>r.phase!=='ended').reduce((n,r)=>n+(r.bots?.length||0),0);
    const reason=process.env.ARAM_DISABLE_BOTS==='1'?'人机功能已禁用':bots>=30?'全服人机已达30个，暂时禁止新增人机':'';
    return {humans,bots,allowed:!reason,reason,maxPerRoom:MAX_ROOM_BOTS};
  }

  list() {
    return [...this.activeRooms()].filter(room => room.phase !== 'ended').map((room) => this.summary(room));
  }

  summary(room) {
    return {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      count: room.players.size + (room.bots?.length||0),
      botCount: room.bots?.length||0,
      removableBotCount: (room.bots||[]).filter(bot=>bot.manual).length,
      nextQuickBotTeam:room.nextQuickBotTeam??0,
      removableBotCounts:[0,1].map(team=>(room.bots||[]).filter(bot=>bot.manual&&bot.team===team).length),
      roomBotsBlocked:roomBlocksBots(room),
      connectedCount: [...room.players.values()].filter((record) => record.peer.connected).length + (room.bots?.length||0),
      phase: room.phase,
      maxPlayers: room.maxPlayers,
      createdAt: room.createdAt,
      fountainDefense: room.fountainDefense !== false,
      continuous:!!room.continuous,matchmaking:!!room.matchmaking,round:room.round||0,
    };
  }

  roomView(room) {
    return {
      ...this.summary(room),
      players: [...room.players.values(),...(room.bots||[])].map(publicPlayer),
      winner: room.game?.winner ?? null,
    };
  }

  recordFor(peer) {
    const room = peer.roomId ? this.rooms.get(peer.roomId) : null;
    const record = room?.players.get(peer.id);
    if (!room || !record) throw new Error('请先加入房间');
    return { room, record };
  }

  command(peer, message) {
    notePlayerActivity(peer,message);
    switch (message.type) {
      case 'idleJoin':
        return;
      case 'battleReady': {
        const {room,record}=this.recordFor(peer);
        if(room.phase!=='playing'||!record.unit||record.spectator||message.roomId!==room.id||Number(message.round??0)!==(room.round??0))return false;
        peer.battleReadyKey=battleKey(room);
        peer.lastInputAt=Date.now();
        peer.idlePromptAt=0;
        return true;
      }
      case 'idleCancel': {
        const room=peer.roomId?this.rooms.get(peer.roomId):null;
        if(!peer.idleDialog||!peer.idlePromptAt||!room?.players.get(peer.id)?.unit||room.phase!=='playing')return;
        this.detachIdle(peer,room,4004);
        return;
      }
      case 'create':
        return this.create(peer, message);
      case 'match':
        return this.match(peer, message);
      case 'join':
        return this.join(peer, message);
      case 'leave':
        return this.leave(peer);
      case 'quickAddBot': {const {room}=this.recordFor(peer);const team=room.nextQuickBotTeam??0;const added=this.addBot(peer,false,team);if(added){room.nextQuickBotTeam=1-team;this.broadcastRoom(room);}return added;}
      case 'addBot':
        return this.addBot(peer,false,message.team);
      case 'removeBot':
        return this.removeBot(peer,message.team);
      case 'ready':
        return this.ready(peer, message);
      case 'enter':
        return this.enter(peer, message);
      case 'team':
        return this.team(peer, message.team);
      case 'start':
        return this.start(peer);
      case 'chat': {
        try { const {room,record}=this.recordFor(peer);return sendRoomChat(room,record,message); }
        catch(error){peer.send({type:'chatError',roomId:peer.roomId,message:error.message});return false;}
      }
      case 'ping':
        peer.send({ type: 'pong', at: Number(message.at) || Date.now() });
        return;
      default:
        return this.gameCommand(peer, message);
    }
  }

  create(peer, message) {
    if(this.singleRoomEnabled)return this.match(peer,message);
    if (this.rooms.size >= MAX_ROOMS) throw new Error('房间数量已达上限');
    if (peer.roomId) this.leave(peer);
    let id = roomCode();
    while (this.rooms.has(id)) id = roomCode();
    const room = {
      id,
      name: safeText(message.name, `${peer.name}的房间`, 24),
      hostId: peer.id,
      maxPlayers: clamp(Math.floor(Number(message.maxPlayers) || MAX_PLAYERS), 2, MAX_PLAYERS),
      fountainDefense: message.fountainDefense !== false,
      phase: 'waiting',
      players: new Map(),
      game: null,
      createdAt: Date.now(),
      emptyAt: 0,
    };
    this.rooms.set(id, room);
    this.addPlayer(room, peer, message);
    this.broadcastRoom(room);
    this.sendChatHistory(room,peer);
    this.lobbyDirty = true;
  }

  match(peer, message) {
    if(this.singleRoomEnabled){this.ensureContinuousRoom();const room=this.rooms.get(this.primaryRoomId);if(!room)throw Error('对局初始化中，请稍后再试');return this.join(peer,{...message,id:room.id});}
    if (peer.roomId) {
      const room=this.rooms.get(peer.roomId);
      if (room) return this.sendRoom(room,peer);
    }
    // Keep humans together instead of producing multiple one-player rooms.
    const candidates=[...this.rooms.values()].filter(room=>
      (room.continuous||room.matchmaking)&&room.phase!=='ended'
      &&room.players.size+(room.bots?.length||0)<room.maxPlayers);
    candidates.sort((a,b)=>onlineHumans(b)-onlineHumans(a)||Number(b.continuous)-Number(a.continuous)||a.createdAt-b.createdAt);
    if (candidates.length) return this.join(peer,{...message,id:candidates[0].id});
    this.create(peer,{...message,name:'匹配对局',maxPlayers:MAX_PLAYERS});
    const room=this.rooms.get(peer.roomId);
    if (!room) throw new Error('匹配房间创建失败');
    room.matchmaking=true;
    room.players.get(peer.id).spectator=true;
    if(process.env.ARAM_DISABLE_BOTS!=='1')for(let i=0;i<2;i++){
      try{this.addBot(peer,true);}catch{break;}
    }
    if(room.bots?.length)this.start(peer);
    return room;
  }

  join(peer, message) {
    if(this.singleRoomEnabled)this.ensureContinuousRoom();
    const room = this.rooms.get(this.singleRoomEnabled?this.primaryRoomId:String(message.id ?? '').trim().toUpperCase());
    if (!room) throw new Error('房间不存在或已解散');
    if (peer.roomId === room.id) return this.sendRoom(room, peer);
    if (peer.roomId) this.leave(peer);
    if (room.phase === 'ended') throw new Error('本局已经结束');
    if(!room.continuous&&room.players.size<room.maxPlayers&&onlineHumans(room)+(peer.connected?1:0)>ROOM_HUMAN_BOT_LIMIT&&clearRoomBots(room))this.lobbyDirty=true;
    if (room.players.size + (room.bots?.length||0) >= room.maxPlayers) throw new Error('房间已满');
    this.addPlayer(room, peer, message);
    this.broadcastRoom(room);
    this.sendChatHistory(room,peer);
    this.lobbyDirty = true;
  }

  addPlayer(room, peer, loadout = {}) {
    const blue = [...room.players.values()].filter((record) => record.team === 0).length+(room.bots||[]).filter(b=>b.team===0).length;
    const red = room.players.size+(room.bots?.length||0)-blue;
    const heroId = HERO_BY_ID.has(loadout.hero) ? loadout.hero : 'Ashe';
    const supplied = Array.isArray(loadout.summoners) ? loadout.summoners.slice(0, 2) : [];
    const valid = new Set(['flash', 'heal', 'mark']);
    const summoners = supplied.length === 2 && supplied[0] !== supplied[1] && supplied.every((id) => valid.has(id)) ? supplied : ['flash', 'heal'];
    const record = {
      peer,
      team: blue <= red ? 0 : 1,
      heroId,
      summoners,
      ready: true,
      unitId: null,
      unit: null,
      gold: 99999,
      items: [],
      itemStacks: {},
      shopHistory: [],
      kills: 0,
      deaths: 0,
      assists: 0,
    };
    if(room.continuous||room.matchmaking)record.spectator=true;
    room.players.set(peer.id, record);
    peer.roomId = room.id;
    room.emptyAt = 0;
    this.enforceRoomBotLimit(room);
    return record;
  }

  resetUnattendedBots(room) {
    if(!room||room.phase!=='playing'||!room.game||process.env.ARAM_DISABLE_BOTS==='1'||[...room.players.values()].some(r=>r.peer.connected&&r.unit&&!r.spectator))return false;
    room.bots??=[];
    const keep=[0,1].map(team=>(room.bots||[]).find(b=>b.team===team&&!b.manual)||(room.bots||[]).find(b=>b.team===team)).filter(Boolean);
    clearRoomBots(room,(room.bots||[]).filter(b=>!keep.includes(b)));
    for(const bot of keep)bot.manual=false;
    for(const team of [0,1])if(!room.bots.some(b=>b.team===team)){
      const usedIds=new Set([...room.players.values(),...room.bots].map(r=>r.peer.id));let id=room.nextBotId??-1;while(usedIds.has(id))id--;room.nextBotId=id-1;
      const names=new Set([...room.players.values(),...room.bots].map(r=>r.peer.name));
      const bot={bot:true,manual:false,peer:{id,name:botNickname(names),connected:true},team,heroId:team?'Jinx':'Garen',summoners:['flash','heal'],ready:true,unit:null,unitId:null,gold:3500,items:[],itemStacks:{},shopHistory:[],kills:0,deaths:0,assists:0,smartState:null,failedAugmentOffers:null,nextBuy:0};
      const game=room.game,slot=freeTeamSlot(game.units,team),unit=game.hero(HERO_BY_ID.get(bot.heroId),team,slot),point=mappedSpawnPosition(team,slot),spawn=nav.snap(point.x,point.y);
      Object.assign(unit,{x:spawn.x,y:spawn.y,dest:null,target:null,farmOnly:false,smartBot:true,playerName:bot.peer.name,netPeerId:bot.peer.id});syncModeHaste(unit);bot.unit=unit;bot.unitId=unit.id;bot.nextBuy=game.time+2;room.bots.push(bot);initAugments(unit,game.random);this.pickBotAugments(room,bot);this.shopBot(room,bot);
    }
    room.nextQuickBotTeam=0;this.broadcastRoom(room);this.broadcastState(room);this.lobbyDirty=true;return true;
  }

  leave(peer) {
    const room = peer.roomId ? this.rooms.get(peer.roomId) : null;
    peer.roomId = null;
    peer.idleDetachedRound=undefined;
    peer.pendingDetachedLeaveAt=0;
    peer.idlePromptAt=0;
    if (!room) {
      peer.send({ type: 'room', room: null });
      return;
    }
    const record = room.players.get(peer.id);
    room.players.delete(peer.id);
    if (record?.unit && room.game) {
      room.game.units = room.game.units.filter((unit) => unit !== record.unit);
    }
    if(room.continuous&&room.game?.player===record?.unit){
      const next=[...room.players.values()].find(entry=>entry.unit&&entry.peer.connected)?.unit??room.bots[0]?.unit;
      if(next)room.game.player=next;
      else {room.game=null;room.phase='waiting';}
    }
    if (room.hostId === peer.id) room.hostId = room.players.keys().next().value ?? 0;
    peer.send({ type: 'room', room: null });
    if(record?.unit&&!record.spectator)this.resetUnattendedBots(room);
    if (!room.players.size) room.emptyAt = Date.now();
    else this.broadcastRoom(room);
    this.lobbyDirty = true;
  }

  dissolveEndedRoom(room) {
    this.rooms.delete(room.id);
    for (const {peer} of room.players.values()) {
      if (peer.roomId !== room.id) continue;
      peer.roomId = null;
      // Keep the lobby socket/session, but close the completed match UI.
      if (peer.connected) peer.send({type:'room',room:null,reason:'match-ended'});
      if(peer.idleDetachedRound!==undefined){this.peers.delete(peer.id);this.tokens.delete(peer.token);peer.idleDetachedRound=undefined;}
    }
    room.players.clear();
    room.bots = [];
    room.game = null;
    room.chat = [];
    this.lobbyDirty = true;
  }

  ready(peer, message) {
    const { room, record } = this.recordFor(peer);
    if (room.phase === 'ended' || (room.phase === 'playing' && record.unit)) throw new Error('英雄已经进入战场');
    if (!HERO_BY_ID.has(message.hero)) throw new Error('英雄不可用');
    const summoners = Array.isArray(message.summoners) ? message.summoners.slice(0, 2) : [];
    const valid = new Set(['flash', 'heal', 'mark']);
    if (summoners.length !== 2 || summoners[0] === summoners[1] || summoners.some((id) => !valid.has(id))) {
      throw new Error('召唤师技能配置无效');
    }
    record.heroId = message.hero;
    record.summoners = summoners;
    record.ready = true;
    this.broadcastRoom(room);
    this.lobbyDirty = true;
  }

  team(peer, team) {
    const { room, record } = this.recordFor(peer);
    if (room.phase === 'ended' || (room.phase === 'playing' && record.unit)) throw new Error('英雄已经进入战场');
    if (team !== 0 && team !== 1) throw new Error('阵营无效');
    const teamCount = [...room.players.values()].filter((entry) => entry.team === team && entry !== record).length+(room.bots||[]).filter(b=>b.team===team).length;
    if (teamCount >= Math.ceil(room.maxPlayers / 2)) throw new Error(`${TEAM_NAMES[team]}已满`);
    record.team = team;
    this.broadcastRoom(room);
    this.sendChatHistory(room,peer);
  }

  addBot(peer,initial=false,requestedTeam) {
    if(requestedTeam!==undefined&&requestedTeam!==0&&requestedTeam!==1)throw new Error('请选择蓝方或红方');
    if(process.env.ARAM_DISABLE_BOTS==='1')throw Error('人机功能已禁用');
    const {room,record}=this.recordFor(peer);
    const liveMatch=room.continuous||room.matchmaking;
    if(room.hostId!==peer.id&&!liveMatch)throw new Error('只有房主可以添加人机');
    if(room.phase!=='waiting'&&!(liveMatch&&room.phase==='playing'))throw new Error('此对局暂不能添加人机');
    if(roomBlocksBots(room))throw new Error('房间在线真人超过8人，禁止添加人机');
    const policy=this.botPolicy();if(!policy.allowed)throw new Error(policy.reason);
    room.bots??=[];
    if(room.bots.length>=MAX_ROOM_BOTS)throw new Error('每个房间最多添加30个人机');
    if(room.players.size+room.bots.length>=room.maxPlayers)throw new Error('房间已满');
    const roster=[...room.players.values(),...room.bots],counts=[0,1].map(t=>roster.filter(r=>r.team===t).length);
    const team=requestedTeam??(counts[0]===counts[1]?1-record.team:counts[0]<counts[1]?0:1);
    if(counts[team]>=Math.ceil(room.maxPlayers/2))throw new Error('阵营已满');
    const usedBotIds=new Set(room.bots.map(bot=>bot.peer.id));let id=room.nextBotId??-1;while(usedBotIds.has(id))id--;room.nextBotId=id-1;
    const usedNames=new Set(roster.map(r=>r.peer.name));
    const bot={bot:true,manual:!initial,peer:{id,name:botNickname(usedNames),connected:true},team,heroId:chooseAddedBotHero(room.bots.map(b=>b.heroId)),ready:true,unit:null,unitId:null,gold:3500,items:[],itemStacks:{},shopHistory:[],kills:0,deaths:0,assists:0,smartState:null,failedAugmentOffers:null,nextBuy:0};
    room.bots.push(bot);
    if(room.phase==='playing'&&room.game){
      try{
        const game=room.game,slot=freeTeamSlot(game.units,team),unit=game.hero(HERO_BY_ID.get(bot.heroId),team,slot);
        const point=mappedSpawnPosition(team,slot),spawn=nav.snap(point.x,point.y);
        Object.assign(unit,{x:spawn.x,y:spawn.y,dest:null,target:null,farmOnly:false,smartBot:true,playerName:bot.peer.name,netPeerId:bot.peer.id});
        syncModeHaste(unit);bot.unit=unit;bot.unitId=unit.id;bot.nextBuy=game.time+2;
        initAugments(unit,game.random);this.pickBotAugments(room,bot);
        this.shopBot(room,bot);
      }catch(error){clearRoomBots(room,[bot]);throw error;}
    }
    this.broadcastRoom(room);if(room.game)this.broadcastState(room);this.lobbyDirty=true;return true;
  }
  removeBot(peer,requestedTeam) {if(requestedTeam!==undefined&&requestedTeam!==0&&requestedTeam!==1)throw new Error('请选择蓝方或红方');const {room}=this.recordFor(peer);const liveMatch=room.continuous||room.matchmaking;if(room.hostId!==peer.id&&!liveMatch)throw new Error('只有房主可以移除人机');if(room.phase!=='waiting'&&!(liveMatch&&room.phase==='playing'))throw new Error('此对局暂不能移除人机');const bot=[...(room.bots||[])].reverse().find(bot=>bot.manual&&(requestedTeam===undefined||bot.team===requestedTeam));if(!bot)return false;clearRoomBots(room,[bot]);this.broadcastRoom(room);if(room.game)this.broadcastState(room);this.lobbyDirty=true;return true;}

  start(peer) {
    if(this.singleRoomEnabled){const {room,record}=this.recordFor(peer);if(room.phase==='waiting'){record.spectator=false;this.createGame(room);room.phase='playing';return this.broadcastState(room);}return this.enter(peer,{hero:record.heroId,summoners:record.summoners});}
    const { room } = this.recordFor(peer);
    if (room.hostId !== peer.id) throw new Error('只有房主可以开始对局');
    if (room.phase === 'playing') return;
    const connected = [...room.players.values()].filter((record) => record.peer.connected);
    if (!connected.length) throw new Error('房间里没有在线玩家');
    // If bot capacity is exhausted, the host can still confirm a hero and
    // start a human-only match without spawning the default placeholder pick.
    if(room.matchmaking&&!room.bots?.length)for(const record of connected)record.spectator=false;
    this.createGame(room);
    room.phase = 'playing';
    this.broadcastState(room);
    this.lobbyDirty = true;
  }

  enter(peer, message) {
    const { room, record } = this.recordFor(peer);
    if(this.singleRoomEnabled&&room.phase==='waiting'){this.ready(peer,message);return this.start(peer);}
    if (room.phase !== 'playing') throw new Error('对局尚未开始');
    peer.battleReadyKey=null;
    if (record.unit) return this.broadcastState(room);
    this.ready(peer, { ...message, type: 'ready' });
    record.spectator=false;
    this.addLatePlayer(room, record);
    this.broadcastState(room);
    this.lobbyDirty = true;
  }

  createGame(room) {
    room.nativeWireJournal=[[],[]];room.nativeWireLastId=[0,0];
    for(const record of room.players.values())record.peer.nativeEffectCursor=undefined;
    const records = [...room.players.values()].filter(r=>!r.spectator);
    const first = records[0]||room.bots?.[0];
    if(!first)throw new Error('房间中没有参战单位');
    const game = new Game(HERO_BY_ID.get(first.heroId), Math.random, { bots: false });
    game.player.team = first.team;
    game.player.slot = 0;
    let teamSlots = [0, 0];
    const attach = (record, unit) => {
      unit.team = record.team;
      unit.slot = teamSlots[record.team]++;
      unit.player = true;
      unit.netPeerId = record.peer.id;
      unit.playerName = record.peer.name;
      unit.summoners = [...record.summoners];
    repairAugmentOffers(unit,game.random);
      record.unit = unit;
      record.unitId = unit.id;
      record.gold = 99999;
      record.items = [];
      record.itemStacks = {};
      record.shopHistory = [];
      record.kills = 0;
      record.deaths = 0;
      record.assists = 0;
    };
    if(records.length)attach(first, game.player);else game.units=game.units.filter(u=>u!==game.player);
    for (const record of records.slice(1)) {
      attach(record, game.hero(HERO_BY_ID.get(record.heroId), record.team, 0, true));
    }
    for(const bot of room.bots||[]){const unit=game.hero(HERO_BY_ID.get(bot.heroId),bot.team,teamSlots[bot.team]++);Object.assign(unit,{farmOnly:false,smartBot:true,playerName:bot.peer.name,netPeerId:bot.peer.id});syncModeHaste(unit);bot.unit=unit;bot.unitId=unit.id;}
    game.fountainDefense = room.fountainDefense;
    game.useOriginalMap(MAP_CONFIG, nav);
    game.player = first.unit;
    room.game = game;
    room.roundStartedAt = Date.now();
    game.grantQuestItemForUnit=(unit,id)=>{
      if(id!=='4403')return false;
      const r=[...room.players.values(),...(room.bots||[])].find(r=>r.unit===unit);
      if(!r||r.items.length>=6||r.items.includes(id))return false;
      r.items.push(id);unit.inventoryItems=[...r.items];r.shopHistory=[];
      if(game.player===unit){game.items=r.items;game.shopHistory=[];}
      return true;
    };
    game.replaceItemForUnit=(unit,from,to)=>{const r=[...room.players.values(),...(room.bots||[])].find(r=>r.unit===unit);if(!r)return;const index=r.items.indexOf(from);if(index>=0)r.items.splice(index,1,to);unit.inventoryItems=[...r.items];if(game.player===unit)game.items=r.items;};
    installCombatStats(room);
    for(const bot of room.bots||[]){initAugments(bot.unit,game.random);this.pickBotAugments(room,bot);this.shopBot(room,bot);}

  }

  pickBotAugments(room,bot){return false;}

  shopBot(room,bot){const g=room.game;if(!g||!bot.unit)return;const plans={Jax:['3078','3047','3153','3053','6333','3065'],Malphite:['3068','3047','3075','4401','3083','3193'],MasterYi:['3153','3006','3124','6333','3026','3091'],DrMundo:['3084','3111','3083','3065','3075','3068'],Darius:['6631','3047','3071','3053','3074','4401'],Garen:['6631','3006','3071','3053','3742','4401'],Lux:['6655','3020','3089','3135','3157','4645'],Ezreal:['3078','3158','3004','6694','3153','3074'],Jinx:['3031','3006','6672','3085','3072','3094'],Sett:['6630','3047','3053','3748','3071','4401'],Yasuo:['3031','3006','6673','3153','6333','3072'],Ahri:['6656','3020','3089','3135','3157','4645'],Ashe:['3153','3006','3124','3085','6672','3094']},plan=plans[bot.heroId]||plans.Ashe;this.withPlayer(room,bot,g=>{if(!g.canShop())return;for(const id of plan){if(bot.items.includes(id)||id==='3004'&&bot.items.includes('3042'))continue;const q=g.quoteItem(id);if(q.ok)g.buy(id);break;}});}

  addLatePlayer(room, record) {
    const game = room.game;
    if (!game) throw new Error('对局尚未开始');
    const slot = freeTeamSlot(game.units,record.team);
    const unit = game.hero(HERO_BY_ID.get(record.heroId), record.team, slot, true);
    unit.player = true;
    unit.netPeerId = record.peer.id;
    unit.playerName = record.peer.name;
    unit.summoners = [...record.summoners];
    repairAugmentOffers(unit,game.random);
    const point=mappedSpawnPosition(record.team,slot);
    const spawn = nav.snap(point.x,point.y);
    unit.x = spawn.x;
    unit.y = spawn.y;
    unit.dest = null;
    unit.target = null;
    record.unit = unit;
    record.unitId = unit.id;
    record.gold = 99999;
    record.items = [];
    record.itemStacks = {};
    record.shopHistory = [];
    record.kills = 0;
    record.deaths = 0;
    record.assists = 0;
  }

  withPlayer(room, record, action) {
    const game = room.game;
    if (!game || !record.unit) throw new Error('对局尚未开始');
    const saved = {
      player: game.player,
      gold: game.gold,
      items: game.items,
      itemStacks: game.itemStacks,
      shopHistory: game.shopHistory,
      kills: game.kills,
      deaths: game.deaths,
      assists: game.assists,
    };
    game.player = record.unit;
    game.gold = record.gold;
    game.items = record.items;
    game.itemStacks = record.itemStacks;
    game.shopHistory = record.shopHistory;
    game.kills = record.kills;
    game.deaths = record.deaths;
    game.assists = record.assists;
    let result;
    try {
      result = action(game, record.unit);
    } finally {
      record.gold = game.gold;
      record.items = game.items;
      record.itemStacks = game.itemStacks;
      record.shopHistory = game.shopHistory;
      // KDA is owned by the server damage ledger, not the temporary local
      // player context (which otherwise double-counts immediate spell kills).
      record.unit.inventoryItems = [...record.items];
      Object.assign(game, saved);
    }
    return result;
  }

  gameCommand(peer, message) {
    const { room, record } = this.recordFor(peer);
    if (room.phase !== 'playing' || !room.game || !record.unit) throw new Error('对局尚未开始');
    if (!peer.connected) return;
    const game = room.game;
    const point = () => nav.snap(message.x, message.y);
    const transportCommands=['move','attackMove','attack','stop','cast','useItem','hexgate','cannonEnter','evolve'];
    if(record.unit.cannonState?.phase==='flight'&&transportCommands.includes(message.type))return false;
    if(record.unit.cannonState?.phase==='aim'&&transportCommands.includes(message.type))cancelCannon(game,record.unit);
    switch (message.type) {
      case 'cannonEnter':
        if(!enterCannon(game,record.unit,message.team??record.unit.team))throw new Error('请靠近加农炮；需存活、可行动且冷却完成');
        return;
      case 'cannonLaunch':
        if(!launchCannon(game,record.unit,message.x,message.y))throw new Error('无效落点：请在射程内选择可通行地面');
        return;
      case 'cannonCancel':
        return cancelCannon(game,record.unit);
      case 'hexgate':
        throw new Error('传送门已移除，请使用加农炮');
      case 'mapPing':
        return sendPing(game,record.unit,String(message.ping),{x:message.x,y:message.y},message.targetId);
      case 'mastery':
        return showMastery(game,record.unit);
      case 'move': {
        const p = point();
        return this.withPlayer(room, record, (g) => g.move(p.x, p.y));
      }
      case 'attackMove': {
        const p = point();
        return this.withPlayer(room, record, (g) => g.attackMove(p.x, p.y));
      }
      case 'attack': {
        const target = game.units.find((unit) => unit.id === Number(message.targetId));
        if (!target || target.team === record.unit.team || !canInteract(record.unit,target)) throw new Error('攻击目标无效');
        record.unit.target = target;
        record.unit.dest = null;
        record.unit.order = 'attack';
        return;
      }
      case 'stop':
        return this.withPlayer(room, record, (g) => g.stop(message.hold === true));
      case 'cast': {
        const index = Number(message.index);
        if (!Number.isInteger(index) || index < 0 || index > 5) throw new Error('技能无效');
        const target = message.targetId ? game.units.find((unit) => unit.id === Number(message.targetId)) : null;
        const p = target ?? (record.unit.hero.id==='Yasuo'&&index===3?null:point());
        return this.withPlayer(room, record, (g) => g.cast(index, p));
      }
      case 'buy':
        return this.withPlayer(room, record, (g) => g.buy(String(message.id)));
      case 'sell':
        return this.withPlayer(room, record, (g) => g.sellItem(Number(message.index)));
      case 'undo':
        return this.withPlayer(room, record, (g) => g.undoPurchase());
      case 'useItem':
        return this.withPlayer(room, record, (g) => g.useItem(Number(message.index),{x:Number.isFinite(message.x)?clamp(message.x,5,3195):undefined,y:Number.isFinite(message.y)?clamp(message.y,-400,400):undefined,targetId:message.targetId}));
      case 'evolve': {const i=message.index;if(!Number.isInteger(i)||i<0||i>2)return false;return this.withPlayer(room,record,g=>g.evolveKaisa(i));}
      case 'upgrade': {
        const index = Number(message.index);
        const unit = record.unit;
        if (!Number.isInteger(index) || index < 0 || index > 3 || !(unit.skillPoints > 0) || unit.spellRanks[index] >= 5) return;
        unit.spellRanks[index]++;
        unit.skillPoints--;
        return;
      }
      case 'augment':
        return this.withPlayer(room,record,(g)=>g.chooseAugment(String(message.id),message.binding));
      case 'augmentReroll':
        return this.withPlayer(room,record,(g)=>g.rerollAugment(Number(message.index)));
      default:
        throw new Error('不支持的操作');
    }
  }

  sendRoom(room, peer) {
    peer.send({ type: 'room', room: this.roomView(room) });
    this.sendChatHistory(room,peer);
  }

  sendChatHistory(room,peer){
    const record=room.players.get(peer.id);
    if(record)peer.send({type:'chatHistory',roomId:room.id,messages:chatHistory(room,record)});
  }

  broadcastRoom(room) {
    const message = { type: 'room', room: this.roomView(room) };
    for (const record of room.players.values()) if (record.peer.connected) record.peer.send(message);
  }

  broadcastLobby() {
    const message = { type: 'lobby', rooms: this.list(), botPolicy:this.botPolicy() };
    for (const peer of this.peers.values()) if (peer.connected&&(!this.singleRoomEnabled||!peer.roomId)) peer.send(message);
    this.lobbyDirty = false;
  }

  resendEndedState(peer) {
    const room=this.rooms.get(peer.roomId);
    if(room?.phase==='ended')this.broadcastState(room,peer.id);
  }

  broadcastState(room, recipientId = null) {
    if (!room.game) return;
    const now=Date.now();
    const recipients=[...room.players.values()].filter(r=>(recipientId===null||r.peer.id===recipientId)&&r.peer.connected&&r.unit);
    if(!recipients.length)return;
    // Reuse the same immutable room view until its public contents change.
    // The socket layer can then omit an unchanged roster from delta frames.
    const nextRoomView = this.roomView(room);
    const roomFingerprint = JSON.stringify(nextRoomView);
    if (room.wireRoomFingerprint !== roomFingerprint) {
      room.wireRoomFingerprint = roomFingerprint;
      room.wireRoomView = nextRoomView;
    }
    const roomView = room.wireRoomView;
    const sharedSnapshot={...gameSnapshot(room.game,null),scoreboard:scoreboardFor(room)};
    // Every simulation tick carries the current position of every unit.
    for(const unit of sharedSnapshot.units)if(unit.kind==='minion')unit.netPositionTime=room.game.time;
    const trapViews=[teamTrapView(sharedSnapshot,0),teamTrapView(sharedSnapshot,1)];
    room.nativeWireJournal??=[[],[]];room.nativeWireLastId??=[0,0];
    for(const team of [0,1]){
      const journal=room.nativeWireJournal[team];
      for(const effect of trapViews[team].effects)if(effect.type==='native'&&Number.isSafeInteger(effect.id)&&effect.id>room.nativeWireLastId[team]){
        journal.push({id:effect.id,at:now,effect});room.nativeWireLastId[team]=effect.id;
      }
      while(journal.length&&(now-journal[0].at>5000||journal.length>128))journal.shift();
    }
    for (const record of recipients) {
      const viewUnit=record.unit||room.bots[0]?.unit;
      const team=record.team,journal=room.nativeWireJournal[team];
      const nativeEffects=record.peer.nativeEffectCursor===undefined
        ?trapViews[team].effects.filter(effect=>effect.type==='native')
        :journal.filter(entry=>entry.id>record.peer.nativeEffectCursor).map(entry=>entry.effect);
      const effects=[...trapViews[team].effects.filter(effect=>effect.type!=='native'&&(effect.type!=='move'||effect.ownerUnitId===record.unit?.id)),...nativeEffects];
      const realmView=recipientRealmView({...trapViews[team],effects},viewUnit);
      const sent=record.peer.send({
        type: 'state',
        room: roomView,
        game: {...realmView,...playerAnnouncement(room.game,record.unit),floaters:playerFloaters(room.game,record.unit?.id),signals:signalsFor(room.game,viewUnit),local:{...localState(record),unitId:viewUnit?.id,spectator:!!record.spectator}},
      },{nativeEffectCursor:room.nativeWireLastId[team],roomId:room.id,round:room.round,team,realmId:viewUnit?.classicRealmId||0});
      if(sent!==false)record.peer.nativeEffectCursor=room.nativeWireLastId[team];
    }
  }

  broadcastPlaying(now = Date.now(), scheduled = false) {
    for (const room of this.activeRooms()) if (room.phase === 'playing') this.broadcastState(room);
    this.lastBroadcast = now;
  }

  tick(dt, now = Date.now()) {
    this.ensureContinuousRoom();
    for (const room of this.activeRooms()) {
      this.enforceRoomBotLimit(room);
      if (room.phase !== 'playing' || !room.game) continue;
      if(room.game.winner===null&&(now-(room.roundStartedAt??now)>=MAX_MATCH_DURATION_MS||room.game.time*1000>=MAX_MATCH_DURATION_MS)){
        const objectives=[0,1].map(team=>room.game.units.filter(unit=>unit.kind==='nexus'&&unit.team===team).reduce((sum,unit)=>sum+(unit.hp||0)/Math.max(1,unit.maxHp||1),0));
        room.game.winner=objectives[0]!==objectives[1]?(objectives[0]>objectives[1]?0:1):room.game.score[0]!==room.game.score[1]?(room.game.score[0]>room.game.score[1]?0:1):randomInt(2);
        room.game.time=Math.min(room.game.time,MAX_MATCH_DURATION_MS/1000);
        room.game.announce='45分钟已到，本局结束';room.game.announceUntil=room.game.time+10;
      }else if(room.game.winner===null){
        for(const bot of room.bots||[]){this.pickBotAugments(room,bot);thinkContinuousBot(this,room,bot);}
        room.game.step(dt);
        if(room.kdaDirty){room.kdaDirty=false;this.broadcastRoom(room);}
        for (const record of [...room.players.values(),...(room.bots||[])]) record.gold += dt * 3.5;
        for(const bot of room.bots||[])if(room.game.time>=(bot.nextBuy||0)){bot.nextBuy=room.game.time+2;this.shopBot(room,bot);}
      }
      if (room.game.winner !== null) {
        if(room.continuous){this.restartContinuousRoom(room);continue;}
        room.phase = 'ended';
        room.endedAt = now;
        this.broadcastState(room);
        this.lobbyDirty = true;
      }
    }

    if (this.broadcastFromTick) this.broadcastPlaying(now);

    for (const peer of [...this.peers.values()]) {
      if(peer.pendingDetachedLeaveAt&&now>=peer.pendingDetachedLeaveAt){this.dropDetachedPeer(peer);continue;}
      if(peer.connected&&peer.idleDialog&&peer.idleDetachedRound===undefined){
        const room=peer.roomId?this.rooms.get(peer.roomId):null,record=room?.players.get(peer.id);
        if(room?.phase==='playing'&&record?.unit&&!record.spectator){
          if(peer.loadingIdleGuard&&peer.battleReadyKey!==battleKey(room)){
            peer.idlePromptAt=0;
            peer.lastInputAt=now;
            continue;
          }
          if(now-(peer.lastInputAt??now)>=IDLE_AFTER_MS){
            if(!peer.idlePromptAt){peer.idlePromptAt=now;peer.send({type:'idlePrompt',deadlineAt:now+IDLE_CHOICE_MS});}
            else if(now-peer.idlePromptAt>=IDLE_CHOICE_MS){this.detachIdle(peer,room,4005);continue;}
          }
        }else peer.idlePromptAt=0;
      }
      if(peer.idleDetachedRound!==undefined)continue;
      if (!peer.connected && peer.disconnectedAt && now - peer.disconnectedAt > RECONNECT_GRACE_MS) {
        this.leave(peer);
        this.peers.delete(peer.id);
        this.tokens.delete(peer.token);
      }
    }
    if(!this.singleRoomEnabled)for (const room of [...this.rooms.values()]) {
      if(room.continuous)continue;
      if (room.phase === 'ended') {
        room.endedAt ??= now;
        if (now - room.endedAt >= ENDED_ROOM_TTL_MS) {
          this.dissolveEndedRoom(room);
          continue;
        }
      }
      const connectedHumans=[...room.players.values()].some(record=>record.peer.connected||record.peer.idleDetachedRound!==undefined);
      if(!connectedHumans){const disconnectedAt=Math.max(0,...[...room.players.values()].map(record=>record.peer.disconnectedAt||0));room.unattendedAt||=disconnectedAt||now;if(now-room.unattendedAt>RECONNECT_GRACE_MS){for(const record of room.players.values())record.peer.roomId=null;this.rooms.delete(room.id);this.lobbyDirty=true;continue;}}
      else room.unattendedAt=0;
      if (!room.players.size && room.emptyAt && now - room.emptyAt > EMPTY_ROOM_TTL_MS) {
        this.rooms.delete(room.id);
        this.lobbyDirty = true;
      }
    }
    if (this.lobbyDirty) this.broadcastLobby();
  }

  detachIdle(peer,room,code){
    peer.idleDetachedRound=room.round;
    peer.idlePromptAt=0;
    peer.closeIdle?.(code);
  }

  dropDetachedPeer(peer){
    if(peer.roomId)this.leave(peer);
    this.peers.delete(peer.id);
    this.tokens.delete(peer.token);
  }

  scheduleDetachedLeave(token,delay=10_000){
    if(typeof token!=='string'||!/^[a-f0-9]{48}$/.test(token))return false;
    const peer=this.tokens.get(token);
    if(!peer||peer.idleDetachedRound===undefined)return false;
    if(delay<=0)this.dropDetachedPeer(peer);
    else peer.pendingDetachedLeaveAt=Date.now()+delay;
    return true;
  }
}
