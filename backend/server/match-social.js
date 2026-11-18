export const CHAT_LIMIT=200;
export const CHAT_HISTORY_LIMIT=80;
export const ASSIST_WINDOW=10;

export function cleanChat(value){
  if(typeof value!=='string')throw new Error('请输入聊天内容');
  const text=value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim();
  if(!text)throw new Error('聊天内容不能为空');
  if(Array.from(text).length>CHAT_LIMIT)throw new Error(`每条消息最多 ${CHAT_LIMIT} 个字`);
  return text;
}
function wireChat(entry){const {recipients,...message}=entry;return message;}
export function chatHistory(room,record){
  return(room.chat||[]).filter(m=>m.channel==='all'||m.team===record.team&&m.recipients.includes(record.peer.id)).map(wireChat);
}
export function sendRoomChat(room,record,message,now=Date.now()){
  const text=cleanChat(message.text),channel=message.channel??'team';
  if(!['team','all'].includes(channel))throw new Error('聊天频道无效');
  const peer=record.peer;
  if(!peer.connected)throw new Error('连接中断，请重连后发送');
  const quota=peer.chatQuota??{tokens:4,at:now};
  quota.tokens=Math.min(4,quota.tokens+Math.max(0,now-quota.at)/1500);quota.at=now;peer.chatQuota=quota;
  if(quota.tokens<1)throw new Error('消息发送过快，请稍候再试');
  quota.tokens--;
  const recipients=[...room.players.values()].filter(p=>channel==='all'||p.team===record.team).map(p=>p.peer.id);
  const entry={id:`${room.id}:${room.chatSequence=(room.chatSequence||0)+1}`,roomId:room.id,channel,team:record.team,peerId:peer.id,name:peer.name,hero:record.heroId,text,time:room.game?.time??0,at:now,recipients};
  room.chat??=[];room.chat.push(entry);if(room.chat.length>CHAT_HISTORY_LIMIT)room.chat.splice(0,room.chat.length-CHAT_HISTORY_LIMIT);
  for(const p of room.players.values())if(p.peer.connected&&recipients.includes(p.peer.id))p.peer.send({type:'chat',roomId:room.id,message:wireChat(entry)});
  return entry;
}
export function scoreboardFor(room){
  return [...room.players.values(),...(room.bots||[])].map(r=>({
    id:r.peer.id,unitId:r.unitId,name:r.peer.name,hero:r.heroId,team:r.team,connected:r.peer.connected,inGame:Boolean(r.unit),
    level:r.unit?.level??0,alive:r.unit?.alive??false,kills:r.kills,deaths:r.deaths,assists:r.assists,
    items:[...r.items].slice(0,6),itemStacks:{...r.itemStacks},augments:[...(r.unit?.augments??[])].slice(0,4),
  }));
}

// The engine emits once at the alive -> dead boundary, before recursive item procs.
export function installCombatStats(room){
 const g=room.game;
 g.onUnitGold=(unit,n)=>{const r=[...room.players.values(),...(room.bots||[])].find(r=>r.unit===unit);if(!r)return;r.gold+=n;if(g.player===unit)g.gold+=n;};
 g.onMinionDeath=({killer})=>{const r=[...room.players.values(),...(room.bots||[])].find(r=>r.unit===killer);if(!r)return;r.gold+=35;if(g.player===killer)g.gold+=35;killer.creepScore=(killer.creepScore||0)+1;};
 g.onHeroDeath=({killer,victim,helpers})=>{
  const roster=[...room.players.values(),...(room.bots||[])],record=u=>roster.find(r=>r.unit===u);
  const v=record(victim),k=record(killer);if(v)v.deaths++;
  const award=(r,gold)=>{if(!r)return;r.gold+=gold;if(g.player===r.unit)g.gold+=gold;};
  if(k){k.kills++;award(k,260);}
  for(const u of helpers){const h=record(u);if(h){h.assists++;award(h,100);}}
  room.kdaDirty=true;
 };
}
