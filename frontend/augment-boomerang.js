export function updateBoomerangAugment(g,u){
 if(!u.alive||!u.augments?.includes('ARAM_OkBoomerang'))return;
 u.boomerangNextAt??=g.time+7;if(g.time<u.boomerangNextAt)return;
 const k=1/(g.mapConfig?.scale||2),range=1500*k;
 const target=g.nearest(u,range,v=>['hero','minion'].includes(v.kind)&&(!u.farmOnly||v.kind==='minion'));
 if(!target)return;
 u.boomerangNextAt=g.time+7;
 const angle=Math.atan2(target.y-u.y,target.x-u.x),baseAD=u.hero.damage+Math.max(0,u.level-3)*4;
 g.shoot(u,angle,{augmentBoomerang:true,basic:false,augmentProc:true,damageType:'physical',damage:40+160*(Math.max(1,Math.min(18,u.level))-1)/17+.3*Math.max(0,u.damage-baseAD)+.2*(u.ap||0),speed:1450*k,r:45*k,life:8,pierce:true,x:u.x,y:u.y,endX:u.x+Math.cos(angle)*range,endY:u.y+Math.sin(angle)*range,returning:false,color:'#e9a253'});
}
const segmentDistance=(p,a,b)=>{const x=b.x-a.x,y=b.y-a.y,d=x*x+y*y,t=d?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/d)):0;return Math.hypot(p.x-a.x-t*x,p.y-a.y-t*y);};
export function updateBoomerangProjectile(g,p,dt,blocked){
 if(!p.source.alive||!g.units.includes(p.source)){p.life=0;return;}
 p.life-=dt;if(p.life<=0)return;
 const k=1/(g.mapConfig?.scale||2),to=p.returning?p.source:{x:p.endX,y:p.endY},old={x:p.x,y:p.y};
 const dx=to.x-p.x,dy=to.y-p.y,d=Math.hypot(dx,dy),speed=(p.returning?1200:1450)*k,step=Math.min(d,speed*dt);
 p.vx=d?dx/d*speed:0;p.vy=d?dy/d*speed:0;p.x+=d?dx/d*step:0;p.y+=d?dy/d*step:0;
 const stopped=blocked?.(g,p,old);
 for(const v of g.units){
  if(v.team===p.source.team||!['hero','minion'].includes(v.kind)||!g.canHit(v)||p.hit.has(v.id)||p.source.farmOnly&&v.kind!=='minion'||segmentDistance(v,old,p)>p.r+(v.radius||0))continue;
  p.hit.add(v.id);g.hurt(v,p.damage,p.source,0,0,'physical',false,{augmentProc:true,state:'augment'});
 }
 if(stopped)return;
 if(step>=d){if(p.returning)p.life=0;else{p.returning=true;p.hit.clear();}}
}
