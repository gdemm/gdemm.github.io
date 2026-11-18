import {healUnit} from './combat-support.js';
import {calculation} from './classic-calculations.js';
import {state,scale,distance,value,passiveValue,canCast,beginCast,cue,dash,knockup,forceTo,damage,enemies,clamp,defer} from './classic-common.js';
export function aatroxQRegion(g,u,v,dir,n){const k=scale(g),dx=(v.x-u.x)/k,dy=(v.y-u.y)/k,x=dx*dir.x+dy*dir.y,y=Math.abs(-dx*dir.y+dy*dir.x),r=v.radius/k;
 if(n===1)return {hit:x>=-r&&x<=625+r&&y<=100+r,sweet:x>=475-r&&x<=625+r&&y<=100+r};
 if(n===2)return {hit:x>=-r&&x<=500+r&&y<=120+.36*Math.max(0,x)+r,sweet:x>=350-r&&x<=500+r&&y<=120+.36*Math.max(0,x)+r};
 const d=Math.hypot(x-200,y);return {hit:d<=300+r,sweet:d<=150+r};
}
export function castAatrox(g,i,aim,h){
 const u=g.player,s=state(u),recast=i===0&&s.qStep>0&&s.qUntil>g.time;
 if(!canCast(g,u,i,{ignoreCooldown:!!recast,ignoreCost:!!recast,ignoreCastLock:i===2})||i===0&&s.qReadyAt>g.time)return false;
 if([0,1,2].includes(i)&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 if(i===2&&(u.root>0||u.grounded>0))return false;
 if(i===3&&s.rUntil>g.time)return false;
 const n=recast?s.qStep+1:1,token=beginCast(g,u,i,aim,h,{...(recast?{cd:null,spend:false}:{}),animation:i===0?(n===1?'q':'q'+n):i===2&&s.qCharging?u.animation:'qwer'[i]});
 if(i===0){s.qStep=n>=3?0:n;s.qUntil=n>=3?0:g.time+value(u,0,'QExtensionTime',4);s.qReadyAt=g.time+.65;s.qCharging=true;u.animUntil=g.time+.6;u.classicCastLockUntil=g.time+.6;u.classicRootUntil=g.time+.6;u.classicDisarmedUntil=g.time+.6;
  const dx=aim.x-u.x,dy=aim.y-u.y,len=Math.hypot(dx,dy)||1,dir={x:dx/len,y:dy/len};g.zones??=[];const warning={id:g.counter++,kind:'aatroxQWarning',source:u,x:u.x,y:u.y,dx:dir.x,dy:dir.y,stage:n,age:0,duration:.6};g.zones.push(warning);
  defer(g,.6,()=>{s.qCharging=false;u.classicCastLockUntil=0;u.classicRootUntil=0;u.classicDisarmedUntil=0;if(!u.alive)return;
   for(const v of enemies(g,u)){const shape=aatroxQRegion(g,u,v,dir,n);if(!shape.hit)continue;const amount=calculation(u,0,shape.sweet?'QEdgeDamage':'QDamage')*(1+(n-1)*value(u,0,'QRampBonus',.25))*(v.kind==='minion'?calculation(u,0,'QMinionDamage'):1);
    h.hit(g,{source:u,effectState:'q',audioCue:`AatroxQ${n}_OnHit_${shape.sweet?'sweetspot':'normal'}_all`,castToken:token,damageType:'physical',aoe:true,onHit:t=>{if(shape.sweet){knockup(g,u,t,value(u,0,'QKnockupDuration',.25));if(t.kind==='hero')s.pReadyAt=Math.max(g.time,(s.pReadyAt||0)-passiveValue(u,'PChargeRate',2));cue(g,u,'Aatrox_Base_Q_Sweet_hit_tar',t);}}},v,amount);
   }
  });cue(g,u,'Aatrox_Base_Q_cas'+n);
 }
 if(i===1){const amount=calculation(u,1,'WDamage');h.missile(g,u,'AatroxW','w',aim,{range:825,damage:amount,damageType:'magic',slow:value(u,1,'WSlowDuration',1.5),slowPercent:Math.abs(value(u,1,'WSlowPercentage',-.25)),missileEffect:'Aatrox_Base_W_mis',onHit:v=>{
  if(v.kind==='minion'){damage(g,u,v,amount,'magic','w');return;}
  if(v.kind!=='hero')return;g.zones??=[];g.zones.push({id:g.counter++,kind:'aatroxChain',source:u,target:v,x:v.x,y:v.y,r:300*scale(g),age:0,duration:1.55,triggerAt:g.time+value(u,1,'WSlowDuration',1.5),damage:amount,broken:false});
 }});cue(g,u,'Aatrox_Base_W_Cas');}
 if(i===2){dash(g,u,aim,value(u,2,'EMaxRange',300),{speed:value(u,2,'EDashSpeed',800),throughWalls:true});u.cd=0;cue(g,u,'Aatrox_Base_E_Dash');}
 if(i===3){s.rUntil=g.time+value(u,3,'RDuration',10);s.rSpeedAt=g.time;s.rSpeedUntil=g.time+value(u,3,'RSpeedMinDuration',3);u.classicADMultiplier=1+value(u,3,'RTotalADAmp');u.classicSelfHealMultiplier=1+value(u,3,'RHealingAmp');g.refreshAugmentStats(u);
  for(const v of enemies(g,u))if(v.kind==='minion'&&distance(v,u)<=value(u,3,'RFearRadius',600)*scale(g)){v.fearSourceId=u.id;v.fearUntil=g.time+value(u,3,'RMinionFearDuration',3);}
 }
 return true;
}
export function aatroxAfterDamage(g,u,v,{basic,meta,dealt}){
 const s=state(u);if(v.kind==='hero'&&dealt>0&&!meta.supportProc&&!meta.augmentProc)healUnit(g,u,u,dealt*calculation(u,2,'TotalEVamp'),{kind:'aatroxE'});
 if(meta.classicProc)return;
 if(basic&&(s.pReadyAt??0)<=g.time){s.pReadyAt=g.time+calculation(u,-1,'PCooldown');const before=v.hp;let amount=v.maxHp*calculation(u,-1,'PDamage');if(['tower','nexus','inhibitor'].includes(v.kind))amount=Math.min(amount,passiveValue(u,'PStructureCap',100));damage(g,u,v,amount,'magic','passive');if(['hero','minion'].includes(v.kind))healUnit(g,u,u,Math.max(0,before-v.hp)*passiveValue(u,'PHealingRatio',1)*(v.kind==='minion'?passiveValue(u,'PHealingMinionMod',.25):1),{kind:'aatroxPassive'});cue(g,u,'Aatrox_Base_P_Hit_Tar',v);}
 else if(v.kind==='hero'&&(basic||/^[qwer]$/.test(meta.state||'')))s.pReadyAt=Math.max(g.time,(s.pReadyAt||0)-passiveValue(u,'PChargeRate',2));
}
export function updateAatrox(g,u){const s=state(u);for(const z of g.zones||[])if(z.kind==='aatroxQWarning'&&z.source===u){z.x=u.x;z.y=u.y;}
 if(s.qUntil<=g.time)s.qStep=0;if(s.rUntil<=g.time&&(u.classicADMultiplier||1)!==1){u.classicADMultiplier=1;u.classicSelfHealMultiplier=1;g.refreshAugmentStats(u);}
}
export function updateAatroxChains(g,h){for(const z of g.zones||[])if(z.kind==='aatroxChain'&&z.age<z.duration&&!z.broken){if(!z.target.alive||distance(z.target,z)>z.r+z.target.radius){z.broken=true;z.age=z.duration;continue;}if(g.time>=z.triggerAt){z.broken=true;forceTo(g,z.source,z.target,z,{duration:.25});h.hit(g,{source:z.source,effectState:'w',audioCue:'AatroxWBump_OnBuffActivate',damageType:'magic'},z.target,z.damage);cue(g,z.source,'Aatrox_Base_W_Beam_Tar_Pull',z.target);}}}
export function aatroxMove(g,u){const s=state(u);return s.rUntil>g.time?u.baseMoveSpeed*value(u,3,'RMovementSpeedBonus')*clamp(1-(g.time-s.rSpeedAt)/value(u,3,'RSpeedMinDuration',3),0,1):0;}
export function aatroxTakedown(g,u){const s=state(u);if(s.rUntil>g.time){s.rUntil=Math.min(s.rUntil+value(u,3,'RExtension',5),g.time+value(u,3,'RDuration',10));s.rSpeedAt=g.time;s.rSpeedUntil=g.time+value(u,3,'RSpeedMinDuration',3);}}
