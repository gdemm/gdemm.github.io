import {shieldUnit} from './combat-support.js';
import {calculation} from './classic-calculations.js';
import {inCone,lineEnd,segmentDistance} from './classic-geometry.js';
import {state,scale,distance,value,passiveValue,canCast,beginCast,cue,dash,forceTo,damage,enemies,clamp,slowUnit} from './classic-common.js';
export function castDiana(g,i,aim,h){
 const u=g.player,s=state(u);if(!canCast(g,u,i))return false;
 if(i===0&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 if(i===2&&(!aim?.alive||aim.team===u.team||!['hero','minion'].includes(aim.kind)||!g.units.includes(aim)||!g.canHit(aim)||aim.teemoStealth||distance(u,aim)>825*scale(g)+aim.radius+u.radius||u.root>0||u.grounded>0))return false;
 beginCast(g,u,i,aim,h);s.passiveASUntil=g.time+passiveValue(u,'BuffDuration',5);
 if(i===0){
  const from={x:u.x,y:u.y},to=lineEnd(u,aim,Math.min(900*scale(g),distance(u,aim))),dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1;
  const control={x:(from.x+to.x)/2-dy/len*len*.5,y:(from.y+to.y)/2+dx/len*len*.5};
  h.missile(g,u,'DianaQ','q',aim,{damage:calculation(u,0,'TotalDamage'),damageType:'magic',range:1000,pierce:true,r:45*scale(g),missileEffect:'Diana_Base_Q_Mis',classicCurve:{from,to,control,duration:.45},onHit:v=>{v.classicMoonlight??={};v.classicMoonlight[u.id]=g.time+value(u,0,'MoonlightDuration',3);}});
 }
 if(i===1){s.orbs=3;s.orbAlive=[true,true,true];s.orbAngle=0;s.orbCenter={x:u.x,y:u.y};s.wUntil=g.time+value(u,1,'ShieldDuration',5);s.orbNextAt=g.time;
  shieldUnit(g,u,u,calculation(u,1,'ShieldValue'),value(u,1,'ShieldDuration',5),{state:'w',key:'dianaW'});
 }
 if(i===2){const marked=aim.classicMoonlight?.[u.id]>g.time;
  dash(g,u,aim,825,{throughWalls:true,speed:2000,done:()=>{const consumed=marked||aim.classicMoonlight?.[u.id]>g.time;if(consumed){for(const v of g.units)if(v.classicMoonlight)delete v.classicMoonlight[u.id];u.skills[2]=value(u,2,'CDResetTime',.25);}if(!aim.alive)return;h.hit(g,{source:u,effectState:'e',damageType:'magic'},aim,value(u,2,'BaseDamage')+value(u,2,'APRatio')*(u.ap||0));cue(g,u,'Diana_Base_R_Tar',aim);}});u.dash.trackTarget=aim;cue(g,u,'Diana_Base_R_Dash_Start');
 }
 if(i===3){let champions=0;for(const v of enemies(g,u))if(distance(v,u)<=475*scale(g)+v.radius){h.hit(g,{source:u,effectState:'r',audioCue:'DianaR_hit',slow:value(u,3,'SlowDuration',2),slowPercent:Math.abs(value(u,3,'SlowPotency',-.4)),onHit:target=>{if(target.kind==='hero')champions++;slowUnit(g,target,value(u,3,'SlowDuration',2),Math.abs(value(u,3,'SlowPotency',-.4)));const dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy)||1;forceTo(g,u,target,{x:u.x+dx/d*70*scale(g),y:u.y+dy/d*70*scale(g)},{duration:.25});}},v,0);}
  if(champions)h.schedule(g,u,value(u,3,'Delay',1),()=>{const amount=value(u,3,'Damage')+.6*(u.ap||0)+(champions-1)*(value(u,3,'MultihitAmp')+.15*(u.ap||0));for(const v of enemies(g,u))if(distance(v,u)<=475*scale(g)+v.radius)h.hit(g,{source:u,effectState:'r',audioCue:'DianaR_emp_hit',damageType:'magic',aoe:true},v,amount);cue(g,u,'Diana_Base_R_explosion');});
  cue(g,u,'Diana_Base_R_Cas');
 }
 return true;
}
export function dianaAfterDamage(g,u,v,{basic,meta}){
 if(!basic||meta.classicProc)return;const s=state(u);s.passiveHits=(s.passiveHits||0)+1;if(s.passiveHits<passiveValue(u,'AttackCount',3))return;s.passiveHits=0;
 for(const target of enemies(g,u))if(inCone(target,u,v,250*scale(g),Math.PI/2,target.radius))damage(g,u,target,calculation(u,-1,'CleaveDamage'),'magic','passive',{aoe:true});cue(g,u,'Diana_Base_P_tar',v);
}
export function updateDiana(g,u,dt,h){
 const s=state(u);if(!s.orbs)return;if(s.wUntil<=g.time){s.orbs=0;s.orbAlive=[];return;}
 const oldAngle=s.orbAngle||0,oldCenter=s.orbCenter||u;s.orbAngle=oldAngle+dt*5;
 for(let i=0;i<3;i++)if(s.orbAlive[i]){
  const angle=s.orbAngle+i*Math.PI*2/3,old=oldAngle+i*Math.PI*2/3,radius=150*scale(g);
  const from={x:oldCenter.x+Math.cos(old)*radius,y:oldCenter.y+Math.sin(old)*radius},orb={x:u.x+Math.cos(angle)*radius,y:u.y+Math.sin(angle)*radius};
  const target=enemies(g,u).find(v=>segmentDistance(v,from,orb)<=v.radius+30*scale(g));if(!target)continue;
  s.orbAlive[i]=false;s.orbs--;
  for(const v of enemies(g,u))if(distance(v,target)<=100*scale(g)+v.radius)h.hit(g,{source:u,effectState:'w',damageType:'magic',aoe:true},v,value(u,1,'OrbDamage')+value(u,1,'OrbAPRatio')*(u.ap||0));cue(g,u,'Diana_Base_W_Tar',target);
 }
 s.orbCenter={x:u.x,y:u.y};
 if(!s.orbs){for(const p of u.supportState?.shieldParts||[])if(p.key==='dianaW')p.until=g.time+value(u,1,'ShieldDuration',5);shieldUnit(g,u,u,calculation(u,1,'ShieldValue'),value(u,1,'ShieldDuration',5),{state:'w',key:'dianaWRefresh'});cue(g,u,'Diana_Base_W_Refreshed');}
}
export function dianaAS(g,u){return calculation(u,-1,'BonusAS')*(state(u).passiveASUntil>g.time?3:1);}
