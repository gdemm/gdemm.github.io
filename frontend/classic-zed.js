// Isolated implementation; release roster does not expose this champion.
import {segmentDistance} from './classic-geometry.js';
import {calculation} from './classic-calculations.js';
import {state,canCast,beginCast,scale,value,passiveValue,distance,enemies,damage,travelPoint,slowUnit,unitTarget,cue} from './classic-common.js';
import {canInteract,realmId,constrainRealm} from './classic-realms.js';
export function zedShadows(g,u){return(g.zones||[]).filter(z=>z.kind==='zedShadow'&&z.source===u&&z.age<z.duration&&g.time>=z.readyAt&&canInteract(z,u));}
const qCasts=new WeakMap();
export function castZed(g,i,aim,h){const u=g.player,s=state(u);
 if(i===3){
  const shadow=zedShadows(g,u).find(z=>z.slot==='r'&&!z.swapped),recast=!!shadow;
  if(!canCast(g,u,i,{ignoreCooldown:recast,ignoreCost:recast})||u.root>0||u.grounded>0)return false;
  if(recast){if(g.time<shadow.swapReadyAt)return false;const old={x:u.x,y:u.y},to=constrainRealm(g,u,shadow);beginCast(g,u,i,to,h,{cd:null,spend:false,animation:'r2'});u.x=to.x;u.y=to.y;u.dest=null;shadow.x=old.x;shadow.y=old.y;shadow.swapped=true;updateZed(g,u);return true;}
  if(!unitTarget(g,u,aim,625)||aim.kind!=='hero')return false;
  const from={x:u.x,y:u.y},token=beginCast(g,u,i,aim,h);u.classicUntargetableUntil=g.time+.75;u.classicCastLockUntil=g.time+.75;u.classicDisarmedUntil=g.time+.75;u.dest=null;cue(g,u,'Zed_Base_R_Dash',u,.75);
  h.schedule(g,u,.75,()=>{
   u.classicUntargetableUntil=0;u.classicCastLockUntil=0;u.classicDisarmedUntil=0;
   if(!aim.alive||!canInteract(u,aim))return;
   const dx=aim.x-from.x,dy=aim.y-from.y,n=Math.hypot(dx,dy)||1;let to={x:aim.x+dx/n*100*scale(g),y:aim.y+dy/n*100*scale(g)};if(g.navigation)to=g.navigation.snap(to.x,to.y);to=constrainRealm(g,u,to);u.x=to.x;u.y=to.y;cue(g,u,'Zed_Base_R_tar_Impact',aim,.7);
   g.zones??=[];g.zones.push({id:g.counter++,kind:'zedShadow',slot:'r',source:u,classicRealmId:realmId(u),...from,age:0,duration:value(u,3,'RCanSwapBuffDuration',7.5),readyAt:g.time,swapReadyAt:g.time+value(u,3,'RReactivateCD',.5),arrived:true,swapped:false});
   h.hit(g,{source:u,effectState:'r',castToken:token,onHit:v=>g.zones.push({id:g.counter++,kind:'zedDeathMark',source:u,target:v,targetLife:v.lifeSerial||0,classicRealmId:realmId(u),x:v.x,y:v.y,age:0,duration:value(u,3,'RDeathMarkDuration',3)+.1,detonateAt:g.time+value(u,3,'RDeathMarkDuration',3),stored:0,base:calculation(u,3,'RCalculatedDamage'),ratio:value(u,3,'RDamageAmp',.25)})},aim,0);
  });return true;
 }
 if(i===0){
  if(!canCast(g,u,i)||!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y))return false;
  const token=beginCast(g,u,i,aim,h),group={targets:new Map(),refunded:false};
  for(const origin of [u,...zedShadows(g,u)]){const angle=Math.atan2(aim.y-origin.y,aim.x-origin.x),speed=1700*scale(g);
   const p=h.missile(g,u,'ZedQ','q',aim,{range:900,x:origin.x,y:origin.y,fromX:origin.x,fromY:origin.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,speed,damage:calculation(u,0,'TotalDamage'),damageType:'physical',castToken:token,pierce:true,r:50*scale(g),classicZedQ:true,missileEffect:'Zed_Base_Q_Mis',hitEffect:'Zed_Base_Q_tar',zedOrigin:origin===u?'self':origin.id});qCasts.set(p,group);
  }
  return true;
 }
 if(i===1){
  const shadow=zedShadows(g,u).find(z=>z.slot==='w'&&!z.swapped),recast=!!shadow;
  if(!canCast(g,u,i,{ignoreCooldown:recast,ignoreCost:recast})||u.root>0||u.grounded>0)return false;
  if(recast){if(distance(u,shadow)>value(u,1,'RecastRange',2000)*scale(g))return false;const old={x:u.x,y:u.y};let to=constrainRealm(g,u,shadow);if(g.navigation)to=g.navigation.snap(to.x,to.y);beginCast(g,u,i,to,h,{cd:null,spend:false,animation:'w2'});u.x=to.x;u.y=to.y;u.dest=null;u.attackWindup=null;shadow.x=old.x;shadow.y=old.y;shadow.swapped=true;updateZed(g,u);return true;}
  // A shadow in transit is not a second cast opportunity.
  if((g.zones||[]).some(z=>z.kind==='zedShadow'&&z.slot==='w'&&z.source===u&&z.age<z.duration))return false;
  if(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y))return false;
  beginCast(g,u,i,aim,h);const to=travelPoint(g,u,aim,650,{throughWalls:true}),from={x:u.x,y:u.y},transit=distance(from,to)/(2500*scale(g));
  g.zones??=[];g.zones.push({id:g.counter++,kind:'zedShadow',slot:'w',source:u,classicRealmId:realmId(u),...from,from,to,start:g.time,readyAt:g.time+transit,age:0,duration:value(u,1,'ShadowDuration',5.25),swapped:false});return true;
 }
 if(i===2){
  if(!canCast(g,u,i))return false;const token=beginCast(g,u,i,aim||u,h),origins=[u,...zedShadows(g,u)];let refunded=false;
  for(const v of enemies(g,u)){const hits=origins.filter(o=>distance(o,v)<=value(u,2,o===u?'ZedRadius':'ShadowRadius',o===u?315:290)*scale(g)+v.radius);if(!hits.length)continue;
   h.hit(g,{source:u,effectState:'e',castToken:token,damageType:'physical',aoe:true,onHit:t=>{
    if(hits.includes(u)&&t.kind==='hero')u.skills[1]=Math.max(0,u.skills[1]-value(u,2,'ShadowHitCDR',3));
    if(hits.some(o=>o!==u))slowUnit(g,t,value(u,2,'SlowDuration',1.5),Math.abs(value(u,2,hits.length>1?'MoveSpeedModBonus':'MoveSpeedMod',-.2)));
    if(hits.length>1&&!refunded){refunded=true;u.mp=Math.min(u.maxMp,u.mp+value(u,1,'EnergyRestoreDoubleHit',30));}
   }},v,calculation(u,2,'TotalDamage'));
  }
  return true;
 }
 return false;
}
export function updateZed(g,u){const s=state(u);s.zedRecasts={};
 for(const z of g.zones||[])if(z.kind==='zedShadow'&&z.source===u&&!z.swapped&&z.age<z.duration&&canInteract(z,u)){
  s.zedRecasts[z.slot]={until:g.time+z.duration-z.age,readyAt:Math.max(z.readyAt||0,z.swapReadyAt||0),inRange:z.slot==='r'||distance(u,z)<=value(u,1,'RecastRange',2000)*scale(g)};
 }
for(const z of g.zones||[])if(z.kind==='zedShadow'&&z.source===u){if(!u.alive||!canInteract(u,z)){z.age=z.duration;continue;}if(g.time<z.readyAt){const t=Math.min(1,(g.time-z.start)/Math.max(.001,z.readyAt-z.start));z.x=z.from.x+(z.to.x-z.from.x)*t;z.y=z.from.y+(z.to.y-z.from.y)*t;}else if(!z.arrived){z.x=z.to.x;z.y=z.to.y;z.arrived=true;}}
 for(const[id,until]of Object.entries(s.passiveTargets||{}))if(until<=g.time)delete s.passiveTargets[id];
}
export function zedAfterDamage(g,u,v,{basic,meta,beforeHp,dealt,rawDamage,damageType}){
 if(damageType!=='true'&&!meta.zedDetonation&&dealt>0)for(const z of g.zones||[])if(z.kind==='zedDeathMark'&&z.source===u&&z.target===v&&!z.detonated&&z.age<z.duration&&g.time<z.detonateAt)z.stored+=Math.max(0,rawDamage??dealt);
if(!basic||meta.classicProc||!['hero','minion'].includes(v.kind)||!v.alive)return;const s=state(u);s.passiveTargets??={};if((s.passiveTargets[v.id]||0)>g.time||(beforeHp??v.hp)/v.maxHp>=passiveValue(u,'CurrentHealthThreshold',.5))return;s.passiveTargets[v.id]=g.time+passiveValue(u,'PerUnitCD',10);damage(g,u,v,v.maxHp*calculation(u,-1,'{6a1a62e9}'),'magic','passive');cue(g,u,'zed_Base_passive_proc_tar',v);}

export function updateZedQ(g,p,dt,h){if(!p.classicZedQ)return false;p.age=(p.age||0)+dt;p.life-=dt;if(p.life<=0)return true;
 const from={x:p.x,y:p.y},step=Math.min(p.speed*dt,Math.max(0,p.range-p.distance)),angle=Math.atan2(p.vy,p.vx);p.x+=Math.cos(angle)*step;p.y+=Math.sin(angle)*step;p.distance+=step;
 if(h.windwallBlocks(g,p,from)){p.life=0;return true;}
 const targets=enemies(g,p.source).filter(v=>!p.hit.has(v.id)&&segmentDistance(v,from,p)<=p.r+v.radius).sort((a,b)=>distance(from,a)-distance(from,b)),group=qCasts.get(p);
 for(const v of targets){const pierced=p.hit.size>0,previous=group?.targets.get(v.id)||new Set();p.hit.add(v.id);
  const amount=(pierced?calculation(p.source,0,'PassThroughDamage'):p.damage)*(previous.size>0?.6:1);
  h.hit(g,{...p,hitEffect:previous.size>0?'Zed_Base_Q_Tar_Double':'Zed_Base_Q_tar',audioCue:previous.size>0?'ZedShurikenMisTwo_hit':'ZedShurikenMisOne_hit',onHit:()=>{previous.add(p.zedOrigin);group?.targets.set(v.id,previous);if(group&&!group.refunded&&previous.size>1){group.refunded=true;p.source.mp=Math.min(p.source.maxMp,p.source.mp+value(p.source,1,'EnergyRestoreDoubleHit',30));}}},v,amount);
 }
 if(p.distance>=p.range)p.life=0;return true;
}

export function updateZedMarks(g){for(const z of g.zones||[])if(z.kind==='zedDeathMark'&&!z.detonated){
 if(!z.target?.alive||(z.target.lifeSerial||0)!==z.targetLife){z.detonated=true;z.age=z.duration;continue;}
 z.x=z.target.x;z.y=z.target.y;
 if(g.time>=z.detonateAt){z.detonated=true;z.age=z.duration;if(canInteract(z.source,z.target)){damage(g,z.source,z.target,z.base+z.stored*z.ratio,'physical','r',{zedDetonation:true});cue(g,z.source,z.target.alive?'Zed_Base_R_Tar_pop_noKill':'Zed_Base_R_Tar_pop_Kill',z.target,.8);}}
}}
