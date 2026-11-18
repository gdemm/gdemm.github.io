import {lastShroudIntersection} from './classic-akali-shroud.js';
// Staged Akali kit. Unimplemented slots explicitly fail; not exposed in release roster.
import {calculation} from './classic-calculations.js';
import {inCone,segmentDistance,lineEnd} from './classic-geometry.js';
import {state,canCast,beginCast as baseBeginCast,scale,value,distance,enemies,slowUnit,dash,damage,passiveValue,unitTarget,clamp} from './classic-common.js';
import {canInteract,realmId} from './classic-realms.js';
function beginCast(g,u,i,aim,h,options){const token=baseBeginCast(g,u,i,aim,h,options);if(i!==1)revealAkali(g,u);return token;}
export function revealAkali(g,u){state(u).wRevealUntil=g.time+calculation(u,1,'{955fbaa3}');u.teemoStealth=false;}
export function shroudContains(g,u,point){const z=(g.zones||[]).find(z=>z.kind==='akaliSmoke'&&z.source===u&&z.age<z.duration&&canInteract(z,u));if(!z)return false;const d=distance(z,point);return d<=z.r&&d>=z.inner;}
export function castAkali(g,i,aim,h){
 const u=g.player,s=state(u);
 if(i===1){
  if(!canCast(g,u,i))return false;beginCast(g,u,i,u,h);
  s.wUntil=g.time+value(u,1,'BaseDuration',5);s.wMoveUntil=g.time+value(u,1,'MovementSpeedDuration',2);s.wRevealUntil=g.time+.1;
  u.classicEnergyBonus=100;u.maxMp=300;u.mp=Math.min(u.maxMp,u.mp+value(u,1,'EnergyRestore',100));
  g.zones??=[];g.zones.push({id:g.counter++,kind:'akaliSmoke',source:u,classicRealmId:realmId(u),x:u.x,y:u.y,age:0,duration:value(u,1,'BaseDuration',5),r:190*scale(g),inner:0});return true;
 }
 if(i===3){
  const second=s.rUntil>g.time;
  if(!canCast(g,u,i,{ignoreCooldown:second,ignoreCost:second})||u.root>0||u.grounded>0)return false;
  if(second){if(g.time<s.rReadyAt||!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y))return false;}
  else if(!unitTarget(g,u,aim,675)||aim.kind!=='hero')return false;
  const token=beginCast(g,u,i,aim,h,second?{cd:null,spend:false,animation:'r2'}:{});
  if(second)s.rUntil=0;else{s.rReadyAt=g.time+value(u,3,'CooldownBetweenCasts',2.5);s.rUntil=g.time+10;}
  const to=lineEnd(u,aim,value(u,3,'DashDistance',715)*scale(g));
  s.rSweep={from:{x:u.x,y:u.y},hit:new Set(),second,token,realmId:realmId(u)};
  dash(g,u,to,value(u,3,'DashDistance',715),{throughWalls:true,speed:second?3000:1500,done:()=>{sweepAkaliR(g,u,h);s.rSweep=null;}});
  u.animUntil=g.time+(u.dash?.duration||.3);return true;
 }
 if(i===2){
  const mark=s.eMark,recast=mark&&mark.until>g.time;
  if(!canCast(g,u,i,{ignoreCooldown:!!recast,ignoreCost:!!recast})||u.root>0||u.grounded>0)return false;
  if(recast){
   if(mark.point){if(mark.realmId!==realmId(u))return false;const point=mark.point;beginCast(g,u,i,point,h,{cd:null,spend:false,animation:'e2'});s.eMark=null;dash(g,u,point,10000,{throughWalls:true,speed:1800});return true;}
   const target=mark.target;if(!target?.alive||!g.units.includes(target)||!canInteract(u,target))return false;
   beginCast(g,u,i,target,h,{cd:null,spend:false,animation:'e2'});s.eMark=null;s.eChase={target,realmId:realmId(u)};
   dash(g,u,target,10000,{throughWalls:true,speed:1800,done:()=>{s.eChase=null;if(target.alive&&canInteract(u,target)&&distance(u,target)<150*scale(g)+target.radius)h.hit(g,{source:u,effectState:'e',damageType:'magic'},target,calculation(u,2,'E2DamageCalc'));}});
   return true;
  }
  if(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)||distance(u,aim)<.01)return false;
  const token=beginCast(g,u,i,aim,h);
  let smokeAnchor=null,impact=null;
  const markSmoke=()=>{if(smokeAnchor&&u.alive&&smokeAnchor.realmId===realmId(u)&&(g.zones||[]).some(z=>z.id===smokeAnchor.shroudId&&z.age<z.duration))s.eMark={...smokeAnchor,until:g.time+3};};
  h.missile(g,u,'AkaliEMis','e',aim,{range:825,speed:1800,damage:calculation(u,2,'E1Damage'),damageType:'magic',castToken:token,missileEffect:'Akali_Base_E_mis',r:55*scale(g),onHit:v=>{impact={alive:v.alive,x:v.x,y:v.y};if(v.alive)s.eMark={target:v,until:g.time+3};},onStep:(from,to)=>{
   if(impact?.alive)return;
   if(impact){const dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy,t=length?clamp(((impact.x-from.x)*dx+(impact.y-from.y)*dy)/length,0,1):0;to={x:from.x+dx*t,y:from.y+dy*t};}
   for(const z of g.zones||[])if(z.kind==='akaliSmoke'&&z.source===u&&z.age<z.duration&&canInteract(z,u)){const point=lastShroudIntersection(from,to,z);if(point)smokeAnchor={point:{x:point.x,y:point.y},shroudId:z.id,realmId:realmId(u)};}
   if(impact&&!impact.alive)markSmoke();
  },onArrive:markSmoke});
  const dx=aim.x-u.x,dy=aim.y-u.y,n=Math.hypot(dx,dy);
  dash(g,u,{x:u.x-dx/n*400*scale(g),y:u.y-dy/n*400*scale(g)},value(u,2,'SelfKnockbackRange',400),{throughWalls:true,speed:1200});return true;
 }
 if(i!==0)return false;
 if(!canCast(g,u,i)||!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y))return false;
 const token=beginCast(g,u,0,aim,h),from={x:u.x,y:u.y};
 u.castUntil=g.time+.25;u.animUntil=u.castUntil;
 h.schedule(g,u,.25,()=>{
  for(const v of enemies(g,u)){
   if(!inCone(v,from,aim,550*scale(g),Math.PI/4,v.radius))continue;
   const amount=calculation(u,0,'Damage');
   h.hit(g,{source:u,effectState:'q',castToken:token,damageType:'magic',aoe:true,onHit:t=>{
    if(distance(from,t)>=450*scale(g)-t.radius)slowUnit(g,t,value(u,0,'SlowDuration',.5),value(u,0,'SlowPercentage',.5));
   }},v,amount);
  }
 });
 return true;
}

export function akaliAfterDamage(g,u,v,{basic,meta,dealt}){
 const s=state(u);
 if(basic&&s.pEmpoweredUntil>g.time){s.pEmpoweredUntil=0;damage(g,u,v,calculation(u,-1,'Damage'),'magic','passive');}
 if(!basic&&!meta.classicProc&&dealt>0&&v.kind==='hero'&&['q','e','r'].includes(meta.state))s.pRing={x:v.x,y:v.y,r:500*scale(g),until:g.time+4,realmId:realmId(u)};
}
export function updateAkali(g,u,h){sweepAkaliR(g,u,h);if(state(u).rSweep&&!u.dash)state(u).rSweep=null;const s=state(u),ring=s.pRing;
 for(const z of g.zones||[])if(z.kind==='akaliSmoke'&&z.source===u){const expansion=clamp(z.age/3,0,1);z.r=(190+160*expansion)*scale(g);z.inner=Math.max(0,z.r-value(u,1,'CloudRadius',140)*scale(g))*clamp((z.age-1)/2,0,1);if(!u.alive||!canInteract(z,u))z.age=z.duration;}
 const towerSight=(g.units||[]).some(v=>v.alive&&v.kind==='tower'&&v.team!==u.team&&canInteract(u,v)&&distance(u,v)<=(v.range||0)+u.radius);
 u.teemoStealth=!!(s.wUntil>g.time&&!(s.wRevealUntil>g.time)&&!towerSight&&shroudContains(g,u,u));
 if(!(s.wUntil>g.time)&&u.classicEnergyBonus){u.classicEnergyBonus=0;u.maxMp=200;u.mp=Math.min(u.mp,u.maxMp);}

 if(ring){if(ring.until<=g.time||ring.realmId!==realmId(u))s.pRing=null;else if(distance(u,ring)>ring.r){s.pRing=null;s.pEmpoweredUntil=g.time+4;}}
 if(s.eMark&&(s.eMark.until<=g.time||(s.eMark.point?s.eMark.realmId!==realmId(u):!s.eMark.target?.alive||!canInteract(u,s.eMark.target))))s.eMark=null;
 if(s.eChase){if(!s.eChase.target?.alive||!canInteract(u,s.eChase.target)){u.dash=null;s.eChase=null;}else if(u.dash?.kind==='classicDash')u.dash.to={x:s.eChase.target.x,y:s.eChase.target.y};else s.eChase=null;}
}
export function akaliRange(u){return state(u).pEmpoweredUntil>(u.augmentCurrentTime||0)?125:0;}
export function akaliMove(g,u,target){const s=state(u),ring=s.pRing,dx=(target?.x??u.x)-u.x,dy=(target?.y??u.y)-u.y;
 const outward=ring&&ring.until>g.time&&((u.x-ring.x)*dx+(u.y-ring.y)*dy>0);
 const inward=s.pEmpoweredUntil>g.time&&enemies(g,u).some(v=>v.kind==='hero'&&(v.x-u.x)*dx+(v.y-u.y)*dy>0);
 const shroudSpeed=s.wMoveUntil>g.time?value(u,1,'MovementSpeed',30)/100:0;
 return u.baseMoveSpeed*Math.max(shroudSpeed,(outward||inward)?(passiveValue(u,'Level1MS',.3)+Math.floor(Math.max(0,u.level-1)/5)*passiveValue(u,'MSAdditionalBonusAtThreshold',.1)):0);
}

export function sweepAkaliR(g,u,h){const sweep=state(u).rSweep;if(!sweep)return;
 if(sweep.realmId!==realmId(u)){state(u).rSweep=null;return;}
 for(const v of enemies(g,u)){
  if(sweep.hit.has(v.id)||segmentDistance(v,sweep.from,u)>65*scale(g)+v.radius)continue;
  sweep.hit.add(v.id);
  const amount=sweep.second?calculation(u,3,'Cast2DamageMin')*(1+2*clamp((1-v.hp/v.maxHp)/(1-value(u,3,'MaxExecuteThreshold',.3)),0,1)):calculation(u,3,'Cast1Damage');
  h.hit(g,{source:u,effectState:'r',audioCue:sweep.second?'AkaliRb_hit':'AkaliR1_hit',castToken:sweep.token,damageType:'magic',aoe:true},v,amount);
 }
 sweep.from={x:u.x,y:u.y};
}
