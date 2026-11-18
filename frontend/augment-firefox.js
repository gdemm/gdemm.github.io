// Kiwi Firefox: auto every7s, three flames lasting2.5s; delayed acquisition.
export function updateFirefox(game,unit){
 if(!unit.augments?.includes('ARAM_Firefox'))return;
 const s=unit.firefox??={nextAt:game.time+7,remaining:0,until:0,releaseAt:0,hits:{}};
 if(!unit.alive){s.remaining=0;s.speedUntil=0;return;}
 if(game.time>=s.nextAt){s.nextAt=game.time+7;s.remaining=3;s.until=game.time+2.5;s.releaseAt=game.time+.25;s.speedUntil=game.time+2;s.hits={};game.fx('ring',unit.x,unit.y,'#ffb875',75,2.5,{follow:unit});}
 if(s.speedUntil>game.time)unit.augmentMoveMultiplier*=1.25;
 if(!s.remaining||s.until<=game.time||s.releaseAt>game.time)return;
 const k=1/(game.mapConfig?.scale||2);
 const enemies=game.units.filter(v=>v.alive&&v.team!==unit.team&&!v.teemoStealth&&game.canHit(v)&&['hero','minion'].includes(v.kind)&&(!unit.farmOnly||v.kind==='minion')&&Math.hypot(v.x-unit.x,v.y-unit.y)<=550*k+(v.radius||0));
 enemies.sort((a,b)=>(a.kind==='hero'?0:1)-(b.kind==='hero'?0:1)||Math.hypot(a.x-unit.x,a.y-unit.y)-Math.hypot(b.x-unit.x,b.y-unit.y)||a.id-b.id);
 const target=enemies[0];if(!target)return;
 const baseAD=unit.hero.damage+Math.max(0,unit.level-3)*4;
 const base=35+125*(Math.max(1,Math.min(18,unit.level))-1)/17+.25*(unit.ap||0)+.25*Math.max(0,unit.damage-baseAD);
 const hits=s.hits;
 game.shoot(unit,Math.atan2(target.y-unit.y,target.x-unit.x),{firefox:true,target,damage:base,damageType:'magic',basic:false,augmentProc:true,color:'#ffc26b',speed:1800*k,life:3,r:5,
  impactDamage:v=>{const repeated=(hits[v.id]||0)>0;hits[v.id]=(hits[v.id]||0)+1;return base*(repeated?.3:1)*(v.kind==='minion'&&v.hp/v.maxHp<.2?2:1);}});
 s.remaining--;s.releaseAt=game.time+.4;
}
export function firefoxDeath(unit){if(unit.firefox){unit.firefox.remaining=0;unit.firefox.speedUntil=0;}}
