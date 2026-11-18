// Installed Kiwi values: initial 15s, cycle35s, warning2.5s, immunity2.5s, radius400.
export function updateDivineIntervention(game,unit){
 if(!unit.augments?.includes('ARAM_DivineIntervention'))return;
 const s=unit.divineIntervention??={nextAt:game.time+15,pendingAt:null};
 if(!unit.alive){s.pendingAt=null;return;}
 if(s.pendingAt!==null&&game.time>=s.pendingAt){
  s.pendingAt=null;
  const radius=400/(game.mapConfig?.scale||2);
  for(const ally of game.units){
   if(!ally.alive||ally.kind!=='hero'||ally.team!==unit.team||Math.hypot(ally.x-unit.x,ally.y-unit.y)>radius+(ally.radius||0))continue;
   ally.divineInvulnerableUntil=Math.max(ally.divineInvulnerableUntil||0,game.time+2.5);
   game.fx('ring',ally.x,ally.y,'#fff3ab',45,2.5,{follow:ally});
  }
 }
 if(game.time>=s.nextAt){
  // At most one activation after a long suspended update, not catch-up bursts.
  s.nextAt=game.time+35;s.pendingAt=game.time+2.5;
  game.fx('ring',unit.x,unit.y,'#d8d2ff',400/(game.mapConfig?.scale||2),2.5,{follow:unit});
 }
}
export function divineInterventionDeath(unit){
 unit.divineInvulnerableUntil=0;
 if(unit.divineIntervention)unit.divineIntervention.pendingAt=null;
}
