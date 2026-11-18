import {calculation} from './classic-calculations.js';
import {segmentDistance,lineEnd} from './classic-geometry.js';
import {state,scale,distance,value,passiveValue,canCast,beginCast,cue,dash,knockup,damage,enemies,clamp,defer,tauntUnit} from './classic-common.js';
export function initGalio(g,u){if(u.classicGalioShield===undefined)u.classicGalioShield=calculation(u,1,'TotalPassiveShield');}
function releaseW(g,u,h){const s=state(u),w=s.w;if(!w)return false;s.w=null;u.animation='w2';u.animationSerial++;u.animUntil=g.time+.4;s.wDRUntil=g.time+value(u,1,'DRLingerDuration',2);u.classicCastLockUntil=0;u.classicDisarmedUntil=0;const charge=clamp((g.time-w.start)/value(u,1,'MaxChargeDuration',2),0,1),radius=(275+200*charge)*scale(g),n=calculation(u,1,'MinTotalDamage')+(calculation(u,1,'MaxTotalDamage')-calculation(u,1,'MinTotalDamage'))*charge;
 for(const v of enemies(g,u))if(distance(v,u)<=radius+v.radius)h.hit(g,{source:u,effectState:'w',castToken:w.token,damageType:'magic',aoe:true,onHit:t=>tauntUnit(g,u,t,value(u,1,'CCDurationMin',.5)+(value(u,1,'CCDurationMax',1.5)-value(u,1,'CCDurationMin',.5))*charge)},v,n);h.combatEvent(g,u,'w','release',{audioCue:'GalioW_OnBuffDeactivate'});cue(g,u,'Galio_Base_W_Cas_AOE');return true;
}
function eContact(g,u,h){const s=state(u);if(!s.eCharge)return;const targets=enemies(g,u).filter(v=>!s.eHits.includes(v.id)&&segmentDistance(v,s.eLast,u)<=70*scale(g)+v.radius).sort((a,b)=>distance(a,s.eLast)-distance(b,s.eLast));
 for(const v of targets){s.eHits.push(v.id);h.hit(g,{source:u,effectState:'e',castToken:s.eToken,damageType:'magic',onHit:t=>{if(t.kind==='hero')knockup(g,u,t,value(u,2,'KnockupDuration',.75));}},v,calculation(u,2,v.kind==='hero'?'TotalDamage':'PVEDamage'));if(v.kind==='hero'){u.dash=null;s.eCharge=false;u.animation='e-hit';u.animationSerial++;u.animUntil=g.time+.3;u.castUntil=g.time+.1;break;}}
 s.eLast={x:u.x,y:u.y};
}
export function castGalio(g,i,aim,h){
 const u=g.player,s=state(u);if(i===1&&s.w){if(!u.alive)return false;return releaseW(g,u,h);}if(!canCast(g,u,i))return false;
 if([0,2].includes(i)&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 if(i===2&&(u.root>0||u.grounded>0))return false;
 if(i===3&&(!aim||aim===u||aim.kind!=='hero'||aim.team!==u.team||!aim.alive||!g.units.includes(aim)||distance(u,aim)>([4000,4000,4750,5500][u.spellRanks?.[3]||1])*scale(g)||u.root>0||u.grounded>0))return false;
 const token=beginCast(g,u,i,aim,h);
 if(i===0){const center=lineEnd(u,aim,Math.min(825*scale(g),distance(u,aim))),dx=center.x-u.x,dy=center.y-u.y,len=Math.hypot(dx,dy)||1,sharedHits=new Set();
  for(const side of [-1,1]){const from={x:u.x-dy/len*40*scale(g)*side,y:u.y+dx/len*40*scale(g)*side},control={x:(u.x+center.x)/2-dy/len*len*.45*side,y:(u.y+center.y)/2+dx/len*len*.45*side};h.missile(g,u,'GalioQ','q',center,{x:from.x,y:from.y,fromX:from.x,fromY:from.y,damage:calculation(u,0,'QMissileDamage'),damageType:'magic',castToken:token,pierce:true,range:950,r:40*scale(g),hit:sharedHits,classicCurve:{from,to:center,control,duration:.5},missileEffect:side<0?'Galio_Base_Q_mis':'Galio_Base_Q_mis_R'});}
  defer(g,.5,()=>{g.zones??=[];g.zones.push({id:g.counter++,kind:'galioTornado',source:u,...center,r:200*scale(g),age:0,duration:value(u,0,'SuperQDuration',2)+.05,next:g.time+.5,ticks:0,castToken:token});cue(g,u,'Galio_Base_Q_Mis_Super',center,2);});
 }
 if(i===1){s.w={start:g.time,until:g.time+value(u,1,'MaxChargeDuration',2),token};u.classicCastLockUntil=s.w.until;u.classicDisarmedUntil=s.w.until;}
 if(i===2){const start={x:u.x,y:u.y},to=lineEnd(start,aim,650*scale(g)),back=lineEnd(start,aim,-150*scale(g));s.eToken=token;s.eHits=[];u.animation='e-windup';u.animUntil=g.time+.2;
  dash(g,u,back,150,{speed:800,done:()=>{s.eCharge=true;u.animation='e';u.animationSerial++;u.animUntil=g.time+.5;s.eLast={x:u.x,y:u.y};dash(g,u,to,850,{speed:2300,done:()=>{eContact(g,u,h);s.eCharge=false;}});}});cue(g,u,'Galio_Base_E_Cas_Dust');
 }
 if(i===3){s.r={phase:'channel',until:g.time+1.25,center:{x:aim.x,y:aim.y},token};u.animation='r-channel';u.animUntil=s.r.until;u.classicRootUntil=s.r.until;u.classicCastLockUntil=g.time+2.75;u.classicDisarmedUntil=g.time+2.75;
  for(const ally of g.units)if(ally.alive&&ally.kind==='hero'&&ally.team===u.team&&distance(ally,s.r.center)<=550*scale(g)+ally.radius){ally.classicMagicShields??=[];ally.classicMagicShields.push({sourceId:u.id,remaining:calculation(u,1,'TotalPassiveShield'),until:g.time+value(u,3,'TemporaryWShieldDuration',5)});}
 }
 return true;
}
export function galioBasic(g,u,v,h,heartsteel){const s=state(u);if((s.pReadyAt||0)>g.time)return false;s.pReadyAt=g.time+calculation(u,-1,'PassiveCooldownModified');const amount=calculation(u,-1,'TotalDamage');
 for(const t of enemies(g,u,true))if(distance(v,t)<=225*scale(g)+t.radius)h.hit(g,{source:u,effectState:'passive',damageType:'magic',basic:t===v,itemAttack:t===v,aoe:true},t,amount);
 if(heartsteel>0)damage(g,u,v,heartsteel,'physical','heartsteel');cue(g,u,'Galio_Base_P_tar_Ground',v);return true;
}
export function galioAfterDamage(g,u,v,{meta,basic}){if(basic||!v.hero||!/^([qwer])$/.test(meta.state||''))return;const s=state(u);s.pTokens??={};const key=(meta.castToken??g.time)+':'+v.id;if(s.pTokens[key])return;s.pTokens[key]=g.time+5;s.pReadyAt=Math.max(g.time,(s.pReadyAt||0)-passiveValue(u,'ChargeRatePerHit',3));}
export function cancelGalioChannel(g,u){if(u.hero?.id!=='Galio'||state(u).r?.phase!=='channel')return;state(u).r=null;u.classicRootUntil=0;u.classicCastLockUntil=0;u.classicDisarmedUntil=0;}
export function updateGalio(g,u,dt,h){const s=state(u);initGalio(g,u);for(const[k,t]of Object.entries(s.pTokens||{}))if(t<=g.time)delete s.pTokens[k];
 if(g.time-(s.lastDamagedAt??-Infinity)>=calculation(u,1,'PassiveShieldOOCTimer'))u.classicGalioShield=calculation(u,1,'TotalPassiveShield');
 if(s.w&&s.w.until<=g.time)releaseW(g,u,h);eContact(g,u,h);
 if(s.r?.phase==='channel'){
  if(u.stun>0||u.silence>0||u.root>0||u.forcedMove){cancelGalioChannel(g,u);return;}
  if(s.r.until<=g.time){const cast=s.r;cast.phase='flight';u.animation='r-flight';u.animationSerial++;u.animUntil=g.time+1.5;u.classicRootUntil=0;u.classicUntargetableUntil=g.time+1.5;u.unstoppableUntil=g.time+1.5;
   dash(g,u,cast.center,6000,{speed:Math.max(1,distance(u,cast.center)/(1.5*scale(g))),throughWalls:true,done:()=>{u.classicUntargetableUntil=0;u.classicCastLockUntil=0;u.classicDisarmedUntil=0;s.r=null;u.animation='r-land';u.animationSerial++;u.animUntil=g.time+.6;
    for(const v of enemies(g,u))if(distance(v,u)<=650*scale(g)+v.radius)h.hit(g,{source:u,effectState:'r',castToken:cast.token,damageType:'magic',aoe:true,onHit:t=>knockup(g,u,t,value(u,3,'StunDurationOuter',.75))},v,calculation(u,3,'TotalDamage'));cue(g,u,'Galio_Base_R_Tar_Impact');}});
  }
 }
}
export function galioMove(g,u){return state(u).w?-u.baseMoveSpeed*value(u,1,'SelfSlowPercent',15)/100:0;}
export function galioIncoming(g,u,amount,type){const s=state(u);if(amount>0)s.lastDamagedAt=g.time;if(type!=='true'&&(s.w||s.wDRUntil>g.time))amount*=1-clamp(calculation(u,1,type==='magic'?'MagicDamageReduction':'PhysicalDamageReduction'),0,.95);amount=consumeMagicShields(g,u,amount,type);if(type==='magic'){const consumed=Math.min(amount,u.classicGalioShield||0);u.classicGalioShield=(u.classicGalioShield||0)-consumed;amount-=consumed;}return amount;}
export function consumeMagicShields(g,u,amount,type){if(type!=='magic')return amount;for(const shield of u.classicMagicShields||[])if(shield.until>g.time){const used=Math.min(amount,shield.remaining);shield.remaining-=used;amount-=used;if(!amount)break;}return amount;}
export function updateGalioTornadoes(g,h){for(const z of g.zones||[])if(z.kind==='galioTornado'&&z.age<z.duration){while(z.ticks<value(z.source,0,'TornadoTicks',4)&&z.next<=g.time){z.ticks++;z.next+=.5;for(const v of enemies(g,z.source))if(distance(v,z)<=z.r+v.radius)h.hit(g,{source:z.source,effectState:'q',castToken:z.castToken,damageType:'magic',aoe:true,periodic:true},v,v.maxHp*calculation(z.source,0,'{85f4c0e9}')/100);}}}
