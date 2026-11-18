import {healUnit,shieldUnit} from './combat-support.js';
import {calculation} from './classic-calculations.js';
import {segmentDistance} from './classic-geometry.js';
import {state,scale,distance,value,passiveValue,unitTarget,canCast,beginCast,cue,dash,push,knockup,enemies,slowUnit} from './classic-common.js';
function flurry(g,u){state(u).flurry=2;state(u).flurryUntil=g.time+3;}
export function leeRecast(g,u,i){const s=state(u);return i===0?s.qUntil>g.time:i===1?s.wUntil>g.time:i===2?s.eUntil>g.time:false;}
export function castLeeSin(g,i,aim,h){
 const u=g.player,s=state(u),recast=leeRecast(g,u,i);if(!canCast(g,u,i,{ignoreCooldown:recast,ignoreCost:recast})||recast&&u.mp<30)return false;
 let target=aim;
 if(i===0&&recast){target=g.units.find(v=>v.id===s.qTarget);if(!unitTarget(g,u,target,1300)||u.root>0||u.grounded>0)return false;}
 if(i===0&&!recast&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 if(i===1&&!recast){target=aim||u;if(!g.units.includes(target)||!target.alive||target.team!==u.team||!['hero','minion','ward','clone'].includes(target.kind)||distance(u,target)>700*scale(g)+target.radius||target!==u&&(u.root>0||u.grounded>0))return false;}
 if(i===3&&(!unitTarget(g,u,aim,375)||aim.kind!=='hero'))return false;
 beginCast(g,u,i,target,h,recast?{cd:null,spend:false,animation:'qwer'[i]+'2'}:i===1&&target===u?{animation:'w-self'}:{});if(recast)u.mp-=30;flurry(g,u);
 if(i===0&&!recast){h.missile(g,u,'LeeSinQOne','q',aim,{range:1100,damage:calculation(u,0,'InitialDamage'),damageType:'physical',missileEffect:'LeeSin_Base_Q_mis_01',onHit:v=>{s.qTarget=v.id;s.qUntil=g.time+value(u,0,'ReactivateTime',3);}});}
 if(i===0&&recast){s.qUntil=0;dash(g,u,target,1300,{speed:value(u,0,'DashSpeed',1350),throughWalls:true,done:()=>{if(target.alive)h.hit(g,{source:u,effectState:'q',damageType:'physical'},target,calculation(u,0,'RecastDamage')*(1+value(u,0,'Q2MaxMissingHealthMod',1)*(1-target.hp/target.maxHp)));}});u.dash.trackTarget=target;cue(g,u,'LeeSin_Base_Q_Dash_Trail');}
 if(i===1&&!recast){s.wUntil=g.time+value(u,1,'W1ReactivateTime',3);const grant=()=>{if(target.kind==='hero'){const n=calculation(u,1,'ShieldAmount'),duration=value(u,1,'ShieldDuration',2);shieldUnit(g,u,u,n,duration,{state:'w',key:'leeW'});if(target!==u&&target.alive)shieldUnit(g,u,target,n,duration,{state:'w',key:'leeW:'+u.id});}cue(g,u,'LeeSin_Base_W_Shield',target,2);};
  if(target.kind==='hero')u.skills[1]*=1-value(u,1,'W1CooldownRecovered',.5);
  if(target===u)grant();else{dash(g,u,target,700,{speed:value(u,1,'DashSpeed',1350),throughWalls:true,done:grant});u.dash.trackTarget=target;cue(g,u,'LeeSin_Base_W_Dash_ToAlly');}
 }
 if(i===1&&recast){s.wUntil=0;s.vampUntil=g.time+value(u,1,'LifestealAndSpellVampTime',4);}
 if(i===2&&!recast){s.eUntil=g.time+value(u,2,'ReactivateTime',3);s.eTargets=[];for(const v of enemies(g,u))if(distance(v,u)<=450*scale(g)+v.radius)h.hit(g,{source:u,effectState:'e',damageType:'magic',aoe:true,onHit:t=>{s.eTargets.push(t.id);cue(g,u,'LeeSin_Base_E_Debuff_onEnemy',t,3);}},v,calculation(u,2,'InitialDamage'));cue(g,u,'LeeSin_Base_E_cas');}
 if(i===2&&recast){s.eUntil=0;for(const v of enemies(g,u))if(s.eTargets.includes(v.id)&&distance(v,u)<=575*scale(g)+v.radius)slowUnit(g,v,value(u,2,'SlowDuration',4),value(u,2,'SlowAmount')/100);cue(g,u,'LeeSin_Base_E_Debuff_Cas');}
 if(i===3){u.castUntil=g.time+.25;h.schedule(g,u,.25,()=>{if(!aim.alive)return;const amount=calculation(u,3,'Damage');h.hit(g,{source:u,effectState:'r',damageType:'physical',onHit:v=>{
  const moved=push(g,u,v,value(u,3,'KickDistance',800),{duration:.5});if(!moved.moved)return;
  g.zones??=[];g.zones.push({id:g.counter++,kind:'leeKick',source:u,target:v,last:{x:v.x,y:v.y},x:v.x,y:v.y,age:0,duration:.6,hitIds:[v.id],damage:amount+v.maxHp*value(u,3,'PercentHPCarryThrough',12)/100});cue(g,u,'LeeSin_Base_R_self_mis',v,.5);
 }},aim,amount);});cue(g,u,'LeeSin_Base_R_kick_cas');}
 return true;
}
export function leeAfterDamage(g,u,v,{basic,meta,dealt}){
 const s=state(u);if(s.vampUntil>g.time&&dealt>0&&!meta.supportProc&&!meta.augmentProc)healUnit(g,u,u,dealt*value(u,1,'LifestealAndSpellVamp')/100,{kind:'leeVamp'});
 if(basic&&!meta.classicProc&&s.flurry>0&&s.flurryUntil>g.time){u.mp=Math.min(u.maxMp,u.mp+calculation(u,-1,s.flurry===2?'TTFirstHitEnergy':'EnergyReturn'));s.flurry--;}
}
export function updateLeeSin(g,u){const s=state(u);if(s.qUntil>g.time&&!g.units.some(v=>v.id===s.qTarget&&v.alive))s.qUntil=0;if(s.flurryUntil<=g.time)s.flurry=0;}
export function updateLeeKicks(g,h){for(const z of g.zones||[])if(z.kind==='leeKick'&&z.age<z.duration){for(const v of enemies(g,z.source))if(v.kind==='hero'&&!z.hitIds.includes(v.id)&&segmentDistance(v,z.last,z.target)<=v.radius+z.target.radius){z.hitIds.push(v.id);h.hit(g,{source:z.source,effectState:'r',damageType:'physical',onHit:t=>knockup(g,z.source,t,1)},v,z.damage);cue(g,z.source,'LeeSin_Base_R_unit_impact',v);}z.last={x:z.target.x,y:z.target.y};}}
export function leeAS(g,u){return state(u).flurry>0&&state(u).flurryUntil>g.time?passiveValue(u,'PassiveAS',40)/100:0;}
