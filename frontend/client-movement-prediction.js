import {karthusSlowFactor} from './karthus-ui.js';
// Client position prediction used between authoritative snapshots.
// This restores the old walk calculation, not world ticks, combat or damage.
import {coreMovement} from './augment-core.js';
import {polymorphSlow} from './augment-fey-magic.js';
import {supportMovement} from './combat-support.js';
import {expansionSlowMultiplier} from './augment-expansion.js';
import {classicMoveBonus} from './classic-champions.js';
import {constrainClassicTerrain} from './classic-geometry.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function predictClientWalk(g,u,target,dt,forced=false){
 if(!forced&&(u.root>0||u.classicRootUntil>g.time||(u.itemStasisUntil||0)>g.time))return;
 const d=Math.hypot(u.x-target.x,u.y-target.y);if(d<5)return;
 const mobility=coreMovement(g,u,target);
 const rate=Math.max(0,u.speed-polymorphSlow(g,u)+mobility.flat+(u.mfMoveSpeed||0)+(u.jhinMoveSpeed||0)+classicMoveBonus(g,u,target))*mobility.m*supportMovement(g,u,target)*karthusSlowFactor(u,g.time,u.slow>0?1-(u.slowPercent||.45)*expansionSlowMultiplier(u):1,expansionSlowMultiplier(u))*(u.garenSpeed>0?1.35:u.ahriSpeed>0?1.4:1)*(u.summonerSpeed>0?1.3:1)*(u.settSpeedUntil>g.time?1.3:1)*(u.augmentMoveMultiplier||1)*(u.ryzeMoveMultiplier||1)*(u.mundoMoveMultiplier||1)*(u.malphiteMoveMultiplier||1)*(1+(u.itemMoveUntil>g.time?u.itemMoveBonus||0:0))*dt;
 let nx=u.x+(target.x-u.x)/d*Math.min(rate,d),ny=u.y+(target.y-u.y)/d*Math.min(rate,d);
 const constrained=constrainClassicTerrain(g,u,u,{x:nx,y:ny});nx=constrained.x;ny=constrained.y;
 if(g.navigation){
  if(g.navigation.canWalk(nx,ny)){u.x=nx;u.y=ny;}
  else if(g.navigation.canWalk(nx,u.y))u.x=nx;
  else if(g.navigation.canWalk(u.x,ny))u.y=ny;
  else{const wp=g.mapConfig.waypoints.reduce((a,b)=>Math.abs(b.x-u.x)<Math.abs(a.x-u.x)?b:a);const yy=u.y+Math.sign(wp.y-u.y)*rate;if(g.navigation.canWalk(u.x,yy))u.y=yy;}
  u.x=clamp(u.x,5,3195);u.y=clamp(u.y,-400,400);
 }else{u.x=clamp(nx,65,3135);u.y=clamp(ny,-212,212);}
}
