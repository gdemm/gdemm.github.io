// Native Kiwi: per-spell lockout6s, delay1s, radius300.
export function crueltyControl(game,source,target,meta={}){
 if(!source?.augments?.includes('ARAM_Cruelty')||!target?.alive||target.kind!=='hero'||source.team===target.team||source.farmOnly||meta.augmentProc||meta.itemProc)return;
 const slot=/^[qwer]/.test(meta.state||'')?meta.state[0]:null;
 if(!slot||!(meta.immobilize>0||meta.grounded>0)||target.unstoppableUntil>game.time)return;
 const timers=source.crueltyCooldowns??={};if((timers[slot]??-Infinity)>game.time)return;
 timers[slot]=game.time+6;
 const damage=50+100*(Math.max(1,Math.min(18,source.level||1))-1)/17+.4*(source.ap||0)+.04*source.maxHp;
 (game.crueltyComets??=[]).push({id:game.counter++,sourceId:source.id,team:source.team,x:target.x,y:target.y,at:game.time+1,damage});
}
export function updateCruelty(game){
 const pending=[];
 for(const c of game.crueltyComets||[]){
  const source=game.units.find(u=>u.id===c.sourceId);if(!source)continue;
  if(c.at>game.time){pending.push(c);continue;}
  const radius=300/(game.mapConfig?.scale||2);
  for(const v of game.units)if(v.alive&&v.team!==c.team&&['hero','minion'].includes(v.kind)&&game.canHit(v)&&Math.hypot(v.x-c.x,v.y-c.y)<=radius+(v.radius||0))game.hurt(v,c.damage,source,0,0,'magic',false,{state:'augment',augmentProc:true});
  game.fx('crueltyImpact',c.x,c.y,'#a48dfa',radius,.5);
 }
 game.crueltyComets=pending;
}
