import {shieldUnit} from './combat-support.js';
import {calculation} from './classic-calculations.js';
import {inCone} from './classic-geometry.js';
import {state,scale,distance,value,passiveValue,canCast,beginCast,cue,dash,knockup,damage,enemies} from './classic-common.js';
function passive(g,u){const s=state(u);s.passiveCharges=Math.min(passiveValue(u,'Charges',3),(s.passiveCharges||0)+1);s.passiveUntil=g.time+6;}
export function castRiven(g,i,aim,h){
 const u=g.player,s=state(u),qRecast=i===0&&s.qCasts>0&&s.qUntil>g.time,rRecast=i===3&&s.rUntil>g.time&&!s.rFired;
 if(!canCast(g,u,i,{ignoreCooldown:qRecast||rRecast,ignoreCost:qRecast||rRecast,allowDuringDash:i===1||i===3}))return false;
 if([0,2].includes(i)&&(u.root>0||u.grounded>0||!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 if(rRecast&&(g.time<s.rReadyAt||!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 if(i===3&&s.rUntil>g.time&&!rRecast)return false;
 const combo=qRecast?s.qCasts+1:1;
 beginCast(g,u,i,aim,h,{...(qRecast||rRecast?{cd:null,spend:false}:{}),animation:i===0?(combo===1?'q':'q'+combo):rRecast?'r2':'qwer'[i]});passive(g,u);
 if(i===0){s.qCasts=combo;s.qUntil=g.time+4;const empowered=s.rUntil>g.time,range=(combo===3?300:225)*(empowered?1.2:1);
  dash(g,u,aim,275,{speed:1300,throughWalls:combo===3,done:()=>{for(const v of enemies(g,u))if(combo===3?distance(v,u)<=range*scale(g)+v.radius:inCone(v,u,aim,range*scale(g),Math.PI/2,v.radius))h.hit(g,{source:u,effectState:'q',damageType:'physical',aoe:true,onHit:t=>{if(combo===3)knockup(g,u,t,.75);}},v,calculation(u,0,'FirstSlashDamage'));cue(g,u,empowered?(combo===1?'Riven_Base_Q_detonate_01_Ult':'Riven_Base_Q_0'+combo+'_detonate_ult'):'Riven_Base_Q_0'+combo+'_detonate');}});
  cue(g,u,'Riven_Base_Q_0'+combo+'_Wpn_Trail'+(empowered?'_Ult':''));
  if(combo>=3){s.qCasts=0;s.qUntil=0;}
 }
 if(i===1){for(const v of enemies(g,u))if(distance(v,u)<=260*(s.rUntil>g.time?1.2:1)*scale(g)+v.radius)h.hit(g,{source:u,effectState:'w',damageType:'physical',stun:value(u,1,'StunDuration',.75),aoe:true},v,calculation(u,1,'TotalDamage'));cue(g,u,s.rUntil>g.time?'Riven_Base_W_Ult_Cas':'Riven_Base_W_Cast');if(s.rUntil>g.time)cue(g,u,'Riven_Base_W_Ult_Cas_Ground');}
 if(i===2){shieldUnit(g,u,u,calculation(u,2,'TotalShield'),value(u,2,'ShieldDuration',1.5),{state:'e',key:'rivenE'});dash(g,u,aim,250,{speed:1450});}
 if(i===3&&!rRecast){s.rUntil=g.time+value(u,3,'Duration',15);s.rReadyAt=g.time+.25;s.rFired=false;u.classicADMultiplier=1+value(u,3,'PercentBonusAD',.2);g.refreshAugmentStats(u);}
 if(rRecast){s.rFired=true;h.missile(g,u,'RivenIzunaBlade','r',aim,{range:1100,speed:1600*scale(g),r:25*scale(g),classicWiden:{base:25*scale(g),slope:.24},pierce:true,damage:0,damageType:'physical',missileEffect:'Riven_Base_R_Mis_Middle',onHit:v=>{
  const min=calculation(u,3,'MinDamage'),max=calculation(u,3,'MaxDamage');damage(g,u,v,min+(max-min)*Math.min(1,(1-v.hp/v.maxHp)/.75),'physical','r',{aoe:true});cue(g,u,v.kind==='minion'?'Riven_Base_R_Tar_Minion':'Riven_Base_R_Tar',v);
 }});cue(g,u,'Riven_Base_R_Cas');}
 return true;
}
export function rivenAfterDamage(g,u,v,{basic,meta}){if(!basic||meta.classicProc)return;const s=state(u);if(!(s.passiveCharges>0&&s.passiveUntil>g.time))return;s.passiveCharges--;damage(g,u,v,calculation(u,-1,'TotalDamage')*(['tower','nexus','inhibitor'].includes(v.kind)?passiveValue(u,'TowerRatio',.5):1),'physical','passive');}
export function updateRiven(g,u){const s=state(u);if(s.passiveUntil<=g.time)s.passiveCharges=0;if(s.qUntil<=g.time)s.qCasts=0;if(s.rUntil<=g.time&&(u.classicADMultiplier||1)!==1){u.classicADMultiplier=1;g.refreshAugmentStats(u);}}
export function rivenRange(u){return state(u).rUntil>(u.augmentCurrentTime||0)?value(u,3,'TooltipAttackRange',75):0;}
