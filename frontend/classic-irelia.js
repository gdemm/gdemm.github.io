import {realmId} from './classic-realms.js';
import {coreBlockSpell} from './augment-core.js';
import {blockItemSpell} from './item-stacks.js';
import {healUnit} from './combat-support.js';
import {calculation} from './classic-calculations.js';
import {segmentDistance,lineEnd,circleCrossing} from './classic-geometry.js';
import {state,scale,distance,value,passiveValue,cooldown,unitTarget,canCast,beginCast,cue,dash,damage,enemies,clamp} from './classic-common.js';
function grant(g,u,v,token){const s=state(u);s.stackTokens??={};const key=String(token)+':'+(v.kind==='hero'?v.id:'minions');if(token!=null&&s.stackTokens[key])return;s.stackTokens[key]=g.time+6;s.stacks=Math.min(passiveValue(u,'MaxStacks',4),(s.stackUntil>g.time?s.stacks||0:0)+1);s.stackUntil=g.time+passiveValue(u,'BuffDuration',6);}
function mark(g,u,v){if(v.kind==='hero'){v.classicIreliaMark??={};v.classicIreliaMark[u.id]=g.time+5;}}
function releaseW(g,u,aim,h){const s=state(u),charge=s.w;if(!charge)return false;s.w=null;u.classicRootUntil=0;u.classicCastLockUntil=0;u.classicDisarmedUntil=0;s.wDRUntil=g.time+.25;
 const ratio=clamp((g.time-charge.start)/value(u,1,'ChargeTimeForMax',.75),0,1),amount=calculation(u,1,'MinDamageCalc')+(calculation(u,1,'MaxDamageCalc')-calculation(u,1,'MinDamageCalc'))*ratio,to=lineEnd(u,aim||charge.aim,825*scale(g));
 for(const v of enemies(g,u))if(segmentDistance(v,u,to)<=60*scale(g)+v.radius||distance(v,u)<=275*scale(g)+v.radius)h.hit(g,{source:u,effectState:'w',castToken:charge.token,damageType:'physical',aoe:true},v,amount);
 u.animation='w2';u.animationSerial++;u.animUntil=g.time+.3;h.combatEvent(g,u,'w','release',{aim:to,audioCue:'IreliaW2_OnCast'});cue(g,u,ratio>=1?'Irelia_Base_W_Swipe_Empowered':'Irelia_Base_W_Swipe');return true;
}
function secondBlade(g,u,aim,h){const s=state(u),first=s.blade;if(!first)return false;s.blade=null;const end=lineEnd(u,aim,Math.min(distance(u,aim),850*scale(g)));h.schedule(g,u,value(u,2,'RevTime',.35),()=>{for(const v of enemies(g,u))if(segmentDistance(v,first,end)<=45*scale(g)+v.radius)h.hit(g,{source:u,effectState:'e',castToken:first.token,damageType:'magic',stun:value(u,2,'StunDuration',.75),aoe:true,onHit:v=>mark(g,u,v)},v,calculation(u,2,'TotalDamage'));g.fx('native',first.x,first.y,u.hero.color,40,.65,{hero:u.hero.id,nativeName:'Irelia_Base_E_Beam',nativeDuration:.65,nativeGround:true,nativeBeamEnd:{x:end.x,y:end.y},classicRealmId:realmId(u)});});return true;}
export function castIrelia(g,i,aim,h){
 const u=g.player,s=state(u);
 if(i===1&&s.w){if(!u.alive)return false;return releaseW(g,u,aim,h);}
 const recast=i===2&&s.blade&&s.blade.until>g.time;
 if(!canCast(g,u,i,{ignoreCooldown:!!recast,ignoreCost:!!recast,allowDuringDash:i===2})||recast&&g.time<s.blade.readyAt)return false;
 if(i===0&&(!unitTarget(g,u,aim,600)||u.root>0||u.grounded>0))return false;
 if(i!==0&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 const token=beginCast(g,u,i,aim,h,recast?{cd:null,spend:false,animation:'e2'}:i===0?{cd:Math.max(0,cooldown(u,0)-value(u,3,'CooldownAmount'))}:{});
 if(i===0){dash(g,u,aim,600,{throughWalls:true,speed:value(u,0,'DashSpeedBonus',1400)+u.baseMoveSpeed/scale(g),done:()=>{if(!aim.alive)return;const packet={effectState:'q',castToken:token};if(coreBlockSpell(g,u,aim,packet)||blockItemSpell(g,u,aim,packet))return;const marked=aim.classicIreliaMark?.[u.id]>g.time,ok=h.hit(g,{source:u,effectState:'q',castToken:token,damageType:'physical',basic:true},aim,calculation(u,0,aim.kind==='minion'?'MinionDamage':'ChampionDamage'))!==false;if(!ok)return;healUnit(g,u,u,calculation(u,0,'HealAmount'),{state:'q'});if(marked||!aim.alive)u.skills[0]=0;if(aim.classicIreliaMark)delete aim.classicIreliaMark[u.id];cue(g,u,'Irelia_Base_Q_Proc',aim);}});u.dash.trackTarget=aim;cue(g,u,'Irelia_Base_Q_Dash');}
 if(i===1){s.w={start:g.time,until:g.time+value(u,1,'MaxDuration',1.5),aim:{x:aim.x,y:aim.y},token};u.classicRootUntil=s.w.until;u.classicCastLockUntil=s.w.until;u.classicDisarmedUntil=s.w.until;}
 if(i===2){if(recast)secondBlade(g,u,aim,h);else{s.blade={...lineEnd(u,aim,Math.min(distance(u,aim),850*scale(g))),until:g.time+value(u,2,'BuffDuration',3.5),readyAt:g.time+value(u,2,'CDBetweenCast',.25),token};}}
 if(i===3){h.missile(g,u,'IreliaR','r',aim,{range:950,damage:0,filter:v=>v.kind==='hero',missileEffect:'Irelia_Base_R_Mis',onHit:v=>{
  for(const target of enemies(g,u))if(distance(v,target)<=300*scale(g)+target.radius)h.hit(g,{source:u,effectState:'r',castToken:token,damageType:'magic',aoe:true,onHit:t=>mark(g,u,t)},target,calculation(u,3,'MissileDamage'));
  g.zones??=[];g.zones.push({id:g.counter++,kind:'ireliaBlades',source:u,x:v.x,y:v.y,r:350*scale(g),age:0,duration:value(u,3,'ZoneDuration',2.5),hitIds:[],last:Object.fromEntries(enemies(g,u).map(t=>[t.id,{x:t.x,y:t.y}]))});cue(g,u,'Irelia_Base_R_groundlines',v,2.5);
 }});}
 return true;
}
export function ireliaAfterDamage(g,u,v,{basic,meta}){
 if(meta.classicProc)return;const s=state(u);
 if('qwer'.includes(meta.state)&&meta.state?.length===1)grant(g,u,v,meta.castToken);
 if(basic){if(s.stackUntil>g.time)s.stackUntil=g.time+passiveValue(u,'BuffDuration',6);if(s.stacks>=passiveValue(u,'MaxStacks',4))damage(g,u,v,calculation(u,-1,'OnHitBonus')*(['tower','nexus','inhibitor'].includes(v.kind)?passiveValue(u,'OnHitStructureMod',.5):1),'magic','passive');}
}
export function updateIrelia(g,u,dt,h){const s=state(u);if(s.stackUntil<=g.time)s.stacks=0;for(const[k,t]of Object.entries(s.stackTokens||{}))if(t<=g.time)delete s.stackTokens[k];if(s.w&&s.w.until<=g.time)releaseW(g,u,s.w.aim,h);if(s.blade&&s.blade.until<=g.time)secondBlade(g,u,u,h);}
export function ireliaAS(g,u){return state(u).stackUntil>g.time?(state(u).stacks||0)*calculation(u,-1,'SingleStackAS')/100:0;}
export function ireliaDR(g,u,type){if(type==='true'||!(state(u).w||state(u).wDRUntil>g.time))return 1;return 1-clamp(calculation(u,1,type==='magic'?'FinalMagicDR':'FinalPhysicalDR')/100,0,.95);}
export function updateIreliaZones(g,h){for(const z of g.zones||[])if(z.kind==='ireliaBlades'&&z.age<z.duration)for(const v of enemies(g,z.source)){
 const previous=z.last[v.id]||v;z.last[v.id]={x:v.x,y:v.y};if(z.hitIds.includes(v.id)||circleCrossing(previous,v,z,z.r)===null)continue;z.hitIds.push(v.id);h.hit(g,{source:z.source,effectState:'r',damageType:'magic',slow:value(z.source,3,'CCDuration',1.5),slowPercent:value(z.source,3,'SlowAmount',90)/100,aoe:true},v,calculation(z.source,3,'ZoneDamage'));cue(g,z.source,'Irelia_Base_R_Wall_Hit',v);
}}
