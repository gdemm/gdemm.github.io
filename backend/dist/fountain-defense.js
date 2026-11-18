// Fountain defence removes health directly, outside all damage/absorption hooks.
export const FOUNTAIN_DPS=5000;
export function installFountains(g){
 if(!g.mapConfig||g.fountainDefense===false)return;
 for(const team of [0,1]){
  const template=g.mapConfig.structures.find(u=>u.kind==='tower'&&u.team===team);
  g.add({kind:'tower',fountain:true,team,x:team?3140:60,y:60,hp:1,damage:FOUNTAIN_DPS,range:180,period:.25,radius:28,model:template?.model||(team?'RedTurret':'Turret'),label:'泉水防御塔',nativeTransform:template?.nativeTransform});
 }
}
export function updateFountain(g,u,dt){
 // Towers cannot be damaged and do not gate the nexus or other structures.
 const targets=g.units.filter(v=>v.alive&&v.team!==u.team&&['hero','minion'].includes(v.kind)&&Math.hypot(v.x-u.x,v.y-u.y)<=u.range);
 targets.sort((a,b)=>(a.kind==='hero'?0:1)-(b.kind==='hero'?0:1)||Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y));
 const v=targets.find(v=>v.id===u.fountainTargetId&&v.kind===targets[0]?.kind)||targets[0];
 // Keep fractional attack progress across brief exits or target changes.
 // Idle time never accumulates, so re-entry cannot release banked damage.
 if(!v){u.fountainTargetId=null;return;}
 u.fountainTargetId=v.id;u.fountainElapsed=(u.fountainElapsed||0)+dt;
 if(u.fountainElapsed+1e-9<.25)return;
 while(v.alive&&u.fountainElapsed+1e-9>=.25){u.fountainElapsed=Math.max(0,u.fountainElapsed-.25);g.removeHealth(v,FOUNTAIN_DPS*.25,u);}
 g.fx('fountainBeam',v.x,v.y,u.team?'#ff718a':'#74dfff',0,.25,{fromX:u.x,fromY:u.y});
}
export function drawFountainBeams(ctx,g,project){
 for(const f of g.effects||[]){if(f.type!=='fountainBeam')continue;const a=project(f.fromX,f.fromY,160),b=project(f.x,f.y,45);ctx.save();ctx.strokeStyle=f.color;ctx.lineWidth=4;ctx.shadowColor=f.color;ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}
}
