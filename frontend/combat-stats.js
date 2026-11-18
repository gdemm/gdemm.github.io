// Shared offline/authoritative-server death ledger. Weak references never enter snapshots.
export const ASSIST_WINDOW=10, EXECUTION_WINDOW=20, MULTIKILL_WINDOW=10;
const ledgers=new WeakMap();
function state(g){let s=ledgers.get(g);if(!s){s={damage:new WeakMap(),firstBlood:false,sequence:0};ledgers.set(g,s);}return s;}
export function recordHeroContribution(g,v,source,applied){
 if(v.kind!=='hero'||source?.kind!=='hero'||source.team===v.team||!(applied>0))return;
 const s=state(g);let map=s.damage.get(v);if(!map){map=new Map();s.damage.set(v,map);}map.delete(source);map.set(source,g.time);
 for(const[u,t]of map)if(g.time-t>EXECUTION_WINDOW)map.delete(u);
}
const participant=u=>u?{id:u.id,hero:u.hero?.id||null,name:u.playerName||u.netName||u.hero?.title||u.hero?.name||(u.kind==='tower'?'防御塔':'小兵'),team:u.team}:null;
export function resolveHeroDeath(g,v,source){
 const s=state(g),map=s.damage.get(v)||new Map();s.damage.delete(v);
 let killer=source?.kind==='hero'&&source.team!==v.team?source:null;
 if(!killer)for(const[u,t]of map)if(u.team!==v.team&&g.time-t<=EXECUTION_WINDOW)killer=u;
 const helpers=killer?[...map].filter(([u,t])=>u!==killer&&u.team===killer.team&&g.time-t<=ASSIST_WINDOW).map(([u])=>u):[];
 const shutdown=(v.killStreak||0)>=3;v.deaths=(v.deaths||0)+1;v.killStreak=0;
 // Multi-kills survive the killer's death (posthumous spells can still chain).
 let multi=0,firstBlood=false;
 if(killer){
  const old=killer.multiKills||0,previousVictims=killer.multiVictims||[];
  const extended=old===4&&previousVictims.every(id=>{const u=g.units.find(x=>x.id===id);return u&&!u.alive&&(u.lifeSerial||0)===(killer.multiVictimLives?.[id]||0);});
  const chain=g.time-(killer.lastKillAt??-Infinity)<=(extended?30:MULTIKILL_WINDOW)&&!previousVictims.includes(v.id);
  multi=chain?old+1:1;killer.multiKills=multi;killer.multiVictims=chain?[...previousVictims,v.id]:[v.id];killer.lastKillAt=g.time;killer.multiVictimLives=chain?{...killer.multiVictimLives,[v.id]:v.lifeSerial||0}:{[v.id]:v.lifeSerial||0};
  killer.kills=(killer.kills||0)+1;killer.killStreak=(killer.killStreak||0)+1;g.score[killer.team]++;
  firstBlood=!s.firstBlood;s.firstBlood=true;
 }
 for(const u of helpers)u.assists=(u.assists||0)+1;
 const e={id:++s.sequence,time:g.time,killer:participant(killer),victim:participant(v),source:participant(source),assists:helpers.map(participant),firstBlood,execution:!killer,multi,streak:killer?.killStreak||0,shutdown:!!killer&&shutdown};
 g.killEvents??=[];g.killEvents.push(e);if(g.killEvents.length>24)g.killEvents.shift();
 g.event(killer?`${e.killer.name} 击杀了 ${e.victim.name}`:`${e.victim.name} 被处决`);
 if(g.onHeroDeath)g.onHeroDeath({event:e,killer,victim:v,helpers});
 else{if(v===g.player)g.deaths++;if(killer===g.player){g.kills++;g.gold+=260;}if(helpers.includes(g.player)){g.assists++;g.gold+=100;}}
 return killer;
}
