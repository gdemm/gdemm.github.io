import {constrainRealm} from './classic-realms.js';
export const dot=(a,b)=>a.x*b.x+a.y*b.y;
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
export function inCone(p,origin,aim,range,halfAngle,radius=0){const dx=aim.x-origin.x,dy=aim.y-origin.y,len=Math.hypot(dx,dy)||1,px=p.x-origin.x,py=p.y-origin.y,d=Math.hypot(px,py);return d<=range+radius&&(d<=radius||(px*dx+py*dy)/(len*d)>=Math.cos(halfAngle));}
export function lineEnd(origin,aim,length){const dx=aim.x-origin.x,dy=aim.y-origin.y,d=Math.hypot(dx,dy)||1;return{x:origin.x+dx/d*length,y:origin.y+dy/d*length};}
// Find the earliest crossing of a circle on a segment, including traversing it
// entirely in a large step (both endpoints can lie outside).
export function circleCrossing(from,to,center,radius){const dx=to.x-from.x,dy=to.y-from.y,ox=from.x-center.x,oy=from.y-center.y,a=dx*dx+dy*dy;if(a<1e-12)return null;const b=2*(ox*dx+oy*dy),c=ox*ox+oy*oy-radius*radius,disc=b*b-4*a*c;if(disc<0)return null;const roots=[(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)].filter(t=>t>=0&&t<=1);return roots.length?Math.min(...roots):null;}
export function constrainClassicTerrain(g,u,from,to){let result={...to};for(const z of g.zones||[]){if(z.kind!=='jarvanWall'||z.age>=z.duration)continue;const inside=Math.hypot(from.x-z.x,from.y-z.y)<z.r,edge=z.r+(inside?-1:1)*((u.radius||0)+4),t=circleCrossing(from,result,z,Math.max(2,edge));if(t!==null){const safe=Math.max(0,t-.002);result={x:from.x+(result.x-from.x)*safe,y:from.y+(result.y-from.y)*safe};}}return constrainRealm(g,u,result);}
