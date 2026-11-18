import {updateZedQ} from './classic-zed.js';
import {updateEkkoMissile} from './classic-ekko.js';
import {canInteract} from './classic-realms.js';
import {segmentDistance} from './classic-geometry.js';
export function updateClassicMissile(g,p,dt,h){
 if(!canInteract(p,p.source)||!canInteract(p,p.target)){p.life=0;return true;}
 if(updateEkkoMissile(g,p,dt,h)||updateZedQ(g,p,dt,h))return true;
 if(p.classicWiden)p.r=p.classicWiden.base+p.distance*p.classicWiden.slope;
 if(!p.classicCurve)return false;
 p.age=(p.age||0)+dt;p.life-=dt;const c=p.classicCurve,t=Math.min(1,p.age/c.duration),before={x:p.x,y:p.y};
 p.x=(1-t)*(1-t)*c.from.x+2*(1-t)*t*c.control.x+t*t*c.to.x;p.y=(1-t)*(1-t)*c.from.y+2*(1-t)*t*c.control.y+t*t*c.to.y;
 p.vx=(p.x-before.x)/dt;p.vy=(p.y-before.y)/dt;p.distance+=Math.hypot(p.x-before.x,p.y-before.y);
 if(h.windwallBlocks(g,p,before)){p.life=0;return true;}
 for(const v of g.enemies(p.source))if(['hero','minion'].includes(v.kind)&&!p.hit.has(v.id)&&segmentDistance(v,before,p)<=p.r+v.radius){p.hit.add(v.id);h.hit(g,p,v);}
 if(t>=1)p.life=0;return true;
}
