// Decisions only: healing and pickup amounts/cooldowns remain authoritative engine rules.
const claims=new WeakMap(),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function teamClaims(room,team){let teams=claims.get(room);if(!teams)claims.set(room,teams=[new Map(),new Map()]);return teams[team]||(teams[team]=new Map());}
export function releaseBotRelic(room,bot){const s=bot.smartState;if(!s?.healingRelic)return;const map=teamClaims(room,bot.unit.team);if(map.get(s.healingRelic)?.unit===bot.unit)map.delete(s.healingRelic);s.healingRelic=null;}
export function tryBotHealing(arena,room,bot,dangerAt){
 const g=room.game,u=bot.unit,hp=u.hp/u.maxHp;
 if(!u.alive||hp>=.45||u.itemStasisUntil>g.time)return false;
 // Don't burn limited heals in the fountain, which already supplies recovery.
 if(u.team?u.x>=2990:u.x<=210)return false;
 return arena.withPlayer(room,bot,()=>{
  const summoners=u.summoners||bot.summoners||['flash','heal'],healSlot=summoners.indexOf('heal');
  const summoner=()=>healSlot>=0&&g.cast(healSlot+4,u);
  const locked=u.castUntil>g.time||u.dash||u.forcedMove||u.stun>0||u.silence>0||u.charm>0||u.root>0;
  if((hp<.2||locked)&&summoner())return 'instant';
  if(locked)return false;
  if(u.hero.id==='DrMundo'){
   if(u.mundoWUntil>g.time&&u.mundoWStored>u.maxHp*.025&&g.time>=u.mundoWRecastAt&&g.cast(1,u))return 'instant';
   if(!(u.mundoRUntil>g.time)&&g.cast(3,u))return 'instant';
  }
  if(u.hero.id==='MasterYi'&&!dangerAt(g,u,u)&&g.cast(1,u))return 'channel';
  if(summoner())return 'instant';
  return false;
 });
}
export function chooseBotRelic(room,bot,dangerAt,accept=null){
 const g=room.game,u=bot.unit,s=bot.smartState,limit=700/(g.mapConfig?.scale||2),map=teamClaims(room,u.team);
 for(const [r,c]of map)if(!c.unit.alive||c.until<=g.time||r.ready>g.time||c.unit.hp/c.unit.maxHp>=.6)map.delete(r);
 if(!u.alive||u.root>0||u.hp/u.maxHp>=.45){releaseBotRelic(room,bot);return null;}
 const safe=r=>{
  if(accept&&!accept(r))return false;
  if(!Number.isFinite(r.x)||!Number.isFinite(r.y)||r.ready>g.time||distance(u,r)>limit)return false;
  const claim=map.get(r);if(claim&&claim.unit!==u)return false;
  // Check route, not only destination: never walk through an enemy fountain/tower.
  const steps=Math.max(1,Math.ceil(distance(u,r)/30));for(let i=1;i<=steps;i++){const p={x:u.x+(r.x-u.x)*i/steps,y:u.y+(r.y-u.y)*i/steps};if(dangerAt(g,u,p)||g.navigation&&!g.navigation.canWalk(p.x,p.y))return false;}
  return true;
 };
 let relic=s.healingRelic;if(!relic||!(g.relics||[]).includes(relic)||!safe(relic)){releaseBotRelic(room,bot);relic=(g.relics||[]).filter(safe).sort((a,b)=>distance(u,a)-distance(u,b))[0];}
 if(!relic)return null;
 s.healingRelic=relic;map.set(relic,{unit:u,until:g.time+2});return relic;
}
