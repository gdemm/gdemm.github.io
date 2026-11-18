import {combatCooldownMultiplier} from './augment-rules.js';
import {state,scale,distance,value,passiveValue,cooldown,bonusAD,unitTarget,canCast,beginCast,cue,dash,push,defer,damage} from './classic-common.js';
function qCooldown(g,u){const s=state(u);return cooldown(u,0)*combatCooldownMultiplier(u,0)*(s.rUntil>g.time?1-value(u,3,'TumbleCDReduction')/100:1);}
function finishTumble(g,u){const s=state(u);s.qUntil=0;u.skills[0]=qCooldown(g,u);}
function silver(g,u,v){
 if(!v.alive||!['hero','minion'].includes(v.kind))return;
 const s=state(u);if(s.silverTarget!==v.id||s.silverUntil<=g.time)s.silverStacks=0;
 s.silverTarget=v.id;s.silverUntil=g.time+value(u,1,'DebuffDuration',3.5);s.silverStacks=(s.silverStacks||0)+1;
 if(s.silverStacks>=3){s.silverStacks=0;damage(g,u,v,Math.max(value(u,1,'DamageFloor'),v.maxHp*value(u,1,'MaxHealthRatio')),'true','w');cue(g,u,'Vayne_Base_W_tar',v);}

}
export function castVayne(g,i,aim,h){
 const u=g.player,s=state(u);if(i===1||!canCast(g,u,i))return false;
 if(i===0&&(s.qUntil>g.time||u.root>0||u.grounded>0||!aim||!Number.isFinite(aim.x)||!Number.isFinite(aim.y)))return false;
 if(i===2&&!unitTarget(g,u,aim,550))return false;
 if(i===3&&s.rUntil>g.time)return false;
 beginCast(g,u,i,aim,h,{cd:i===0?0:cooldown(u,i)});u.teemoStealth=false;
 if(i===0){
  s.qUntil=g.time+value(u,0,'Duration',3);dash(g,u,aim,300,{speed:900});u.cd=0;cue(g,u,'Vayne_Base_Q_cas');
  if(s.rUntil>g.time){s.stealthUntil=g.time+value(u,3,'TumbleStealthDuration',1);u.teemoStealth=true;cue(g,u,'Vayne_Base_R_cas_invisible');}
 }
 if(i===2){
  const hitDamage=value(u,2,'Damage')+.5*bonusAD(u);
  h.missile(g,u,'VayneCondemn','e',aim,{target:aim,damage:hitDamage,damageType:'physical',range:25000,speed:2200*scale(g),hitEffect:'Vayne_Base_E_tar',missileEffect:'Vayne_Base_E_mis',onHit:v=>{
   silver(g,u,v);if(!v.alive)return;
   const result=push(g,u,v,value(u,2,'KnockbackDistance',475));
   if(result.blocked&&result.moved)defer(g,result.duration,()=>{if(!v.alive)return;damage(g,u,v,hitDamage*value(u,2,'StunDamage',1.5),'physical','e',{stun:value(u,2,'StunDuration',1.5)});cue(g,u,'Vayne_Base_E_terrain_tar',v);});
  }});
 }
 if(i===3){s.rUntil=g.time+value(u,3,'BaseDuration');u.classicBonusAD=value(u,3,'BonusAttackDamage');g.refreshAugmentStats(u);}
 return true;
}
export function vayneAfterDamage(g,u,v,{basic,meta}){
 if(v.kind==='hero'){state(u).damagedHeroAt??={};state(u).damagedHeroAt[v.id]=g.time;}
 if(!basic||meta.classicProc)return;
 const s=state(u);
 if(s.qUntil>g.time){finishTumble(g,u);if(v.alive)damage(g,u,v,value(u,0,'TotalADRatio')*u.damage+value(u,0,'APRatio')*(u.ap||0),'physical','q');cue(g,u,'Vayne_Base_Q_tar',v);}
 silver(g,u,v);
}
export function updateVayne(g,u){
 const s=state(u);
 if(s.qUntil&&s.qUntil<=g.time)finishTumble(g,u);
 if(s.silverUntil<=g.time)s.silverStacks=0;
 if(s.stealthUntil<=g.time)u.teemoStealth=false;
 if(s.rUntil<=g.time&&u.classicBonusAD){u.classicBonusAD=0;g.refreshAugmentStats(u);}
}
export function vayneMove(g,u,target){
 const s=state(u),dx=target.x-u.x,dy=target.y-u.y,length=Math.hypot(dx,dy);if(length<1)return 0;
 const near=g.units.some(v=>v.kind==='hero'&&v.alive&&v.team!==u.team&&!v.teemoStealth&&distance(u,v)<=passiveValue(u,'Range',2000)*scale(g)&&((v.x-u.x)*dx+(v.y-u.y)*dy)/(Math.max(1,distance(u,v))*length)>.75);
 return near?(s.rUntil>g.time?value(u,3,'MovementSpeed',90):passiveValue(u,'MovementSpeed',30))*scale(g):0;
}
export function vayneTakedown(g,u,v){const s=state(u);if(s.rUntil>g.time&&((v.lastHit===u&&v.lastHitTime>=g.time-value(u,3,'DamagedMarkerDuration',3))||(s.damagedHeroAt?.[v.id]??-Infinity)>=g.time-value(u,3,'DamagedMarkerDuration',3)))s.rUntil=Math.min(s.rUntil+value(u,3,'DurationToAdd',4),g.time+value(u,3,'BaseDuration'));}
