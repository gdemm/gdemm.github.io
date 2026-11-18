import{av,owns}from'./augment-core.js';
const state=u=>u.augmentFive??={timers:{},charges:3};
const level=(u,a,b)=>a+(b-a)*Math.max(0,Math.min(17,(u.level||1)-1))/17;
const bad=u=>Math.max(0,u.damage-u.hero.damage-Math.max(0,u.level-3)*4);
function ready(g,u,key,cd){const s=state(u);if((s.timers[key]??-Infinity)>g.time)return false;s.timers[key]=g.time+cd;return true;}
export function fiveStats(u,b){for(const id of['CriticalMissile','Twinfire'])if(owns(u,id))b.crit+=av(id,'CrtiChance');return b;}
export function fiveAfterDamage(g,{v,source:u,dealt,basic,meta}){if(!u?.hero||u.team===v.team||v.kind!=='hero'||u.farmOnly||dealt<=0)return;const effective=Math.max(0,Math.min(dealt,dealt+v.hp));
 if(owns(u,'BloodMoneyBurn')&&(meta.periodic||meta.dariusBleed))g.creditUnitGold(u,effective*av('BloodMoneyBurn','PercentGoldFromDamage'));
 if(meta.augmentProc||meta.itemProc||!u.alive||!v.alive||v.hp<=0)return;
 if(basic&&meta.itemAttack!==false&&owns(u,'ARAM_ShrinkRay'))v.shrinkRayUntil=g.time+3;
 for(const id of['CriticalMissile','Twinfire']){const trigger=id==='CriticalMissile'?meta.critical:!basic&&/^[qwer]/.test(meta.state||'');if(!trigger||!owns(u,id)||!ready(g,u,id,av(id,'Cooldown')))continue;const count=1+Math.floor(Math.min(1,u.crit||0)*av(id,'AdditionalMisDivision')),damage=id==='CriticalMissile'?level(u,15,65):level(u,10,30)+bad(u)*av(id,'ADRatio')+(u.ap||0)*av(id,'APRatio');for(let i=0;i<count;i++){const angle=Math.atan2(v.y-u.y,v.x-u.x)+(i-(count-1)/2)*.1;g.shoot(u,angle,{target:v,damage,damageType:'magic',basic:false,augmentProc:true,color:id==='CriticalMissile'?'#ffe08b':'#d780f5',life:10,speed:600,r:4});}}
 if(owns(u,'Goldrend')&&(basic?meta.itemAttack!==false:/^[qwer]/.test(meta.state||''))){const s=state(u);if(s.charges>0){s.charges--;s.rechargeAt??=g.time+av('Goldrend','TimerDuration');s.speedUntil=g.time+av('Goldrend','MovementSpeedDuration');g.creditUnitGold(u,av('Goldrend','GoldPerProc'));g.hurt(v,level(u,50,150)+(u.ap||0)*av('Goldrend','APRatio')+bad(u)*av('Goldrend','BonusADRatio'),u,0,0,'magic',false,{augmentProc:true,state:'augment'});}}
}
export function updateFive(g,u){const s=u.augmentFive;if(s){if(s.rechargeAt&&s.rechargeAt<=g.time){s.charges=av('Goldrend','TotalLoops');delete s.rechargeAt;}if(s.speedUntil>g.time)u.augmentMoveMultiplier*=1+av('Goldrend','PercentMovespeedGain');for(const[key,until]of Object.entries(s.timers))if(until<=g.time)delete s.timers[key];}if(u.shrinkRayUntil>g.time)u.augmentSize*=1-av('ARAM_ShrinkRay','DamageReduction');}
export const fiveDamageMultiplier=(g,u)=>u?.shrinkRayUntil>g.time?1-av('ARAM_ShrinkRay','DamageReduction'):1;
