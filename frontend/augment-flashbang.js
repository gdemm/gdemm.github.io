export function triggerFlashbang(game,unit){
 if(!unit.alive||!unit.augments?.includes('ARAM_Flashbang'))return;
 const radius=300/(game.mapConfig?.scale||2);
 const damage=70+10*(Math.max(1,Math.min(18,unit.level||1))-1)+.6*(unit.ap||0)+.7*(unit.damage||0);
 game.fx('burst',unit.x,unit.y,'#ffe9ae',radius,.45);
 for(const v of game.units){
  if(!v.alive||v.team===unit.team||!['hero','minion'].includes(v.kind)||unit.farmOnly&&v.kind!=='minion'||!game.canHit(v)||Math.hypot(v.x-unit.x,v.y-unit.y)>radius+(v.radius||0))continue;
  const before=v.hp;
  game.hurt(v,damage,unit,0,1.25,'magic',false,{state:'augment',augmentProc:true});
  if(v.alive)v.slowPercent=.35;
  unit.flashbangDamage=(unit.flashbangDamage||0)+Math.max(0,before-v.hp);
 }
}
export function resetFlashbangOnDeath(unit){
 if(!unit.augments?.includes('ARAM_Flashbang'))return;
 for(let i=0;i<2;i++)if(['flash','flash2'].includes((unit.summoners||['flash','heal'])[i]))unit.skills[i+4]=0;
 if(unit.augments.includes('ARAM_Flashy')&&unit.augmentCore){unit.augmentCore.flashCharges=3;unit.augmentCore.flashRecharge=0;}
}
