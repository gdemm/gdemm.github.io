// Presentation only: derived from authoritative unit/projectile state.
// No timers, target choices, damage or scene objects are created by rendering.
export function drawAutocastAugments(ctx,game,project){
 const k=1/(game.mapConfig?.scale||2);
 const orb=(x,y,z,r,color)=>{const p=project(x,y,z);if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();};
 ctx.save();
 for(const u of game.units){
  if(!u.alive||u.teemoStealth&&u.team!==game.player?.team)continue;
  const s=u.firefox;
  if(s?.until>game.time)for(let i=3-Math.min(3,s.remaining||0);i<3;i++){
   const angle=game.time*3+i*Math.PI*2/3,x=u.x+Math.cos(angle)*150*k,y=u.y+Math.sin(angle)*150*k;
   orb(x,y,55,7,'#ed7525');orb(x,y,55,3,'#fff1a0');
  }
  if(u.sonata?.auraUntil>game.time){
   ctx.strokeStyle=u.sonata.melody==='heal'?'#69d6ad':'#78bfff';ctx.lineWidth=2;ctx.beginPath();
   for(let i=0;i<=32;i++){const a=i*Math.PI/16,p=project(u.x+Math.cos(a)*400*k,u.y+Math.sin(a)*400*k,8);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}ctx.stroke();
  }
  if(u.surgeField?.until>game.time){
   const f=u.surgeField;ctx.strokeStyle=f.leaving?'#735387':'#c59cff';ctx.lineWidth=2;ctx.beginPath();
   for(let i=0;i<=32;i++){const a=i*Math.PI/16,p=project(f.x+Math.cos(a)*300*k,f.y+Math.sin(a)*300*k,5);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}ctx.stroke();
  }
  const pending=u.divineIntervention?.pendingAt;
  if(pending!=null&&pending>game.time){
   const t=Math.max(0,Math.min(1,1-(pending-game.time)/2.5));
   orb(u.x,u.y,70+170*(1-t),8,'#eee2ff');
   ctx.strokeStyle='#b4a3ff';ctx.lineWidth=2;ctx.beginPath();
   for(let i=0;i<=24;i++){const a=i*Math.PI*2/24,p=project(u.x+Math.cos(a)*400*k,u.y+Math.sin(a)*400*k,5);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}ctx.stroke();
  }
  if(u.divineInvulnerableUntil>game.time){const p=project(u.x,u.y,65);ctx.strokeStyle='#fff1a0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,22,0,Math.PI*2);ctx.stroke();}
 }
 for(const p of game.projectiles){
  if(p.life<=0)continue;
  if(p.lightEmUp)orb(p.x,p.y,48,4,'#ffd872');
  if(p.surgeMissile)orb(p.x,p.y,48,5,'#c59cff');
  if(p.firefox)orb(p.x,p.y,48,6,'#ffc26b');
  if(p.augmentBoomerang){
   ctx.strokeStyle=p.returning?'#ffd495':'#e9a253';ctx.lineWidth=4;ctx.beginPath();
   for(let i=0;i<3;i++){const a=game.time*12+(i-1)*1.3,r=i===1?5:28,q=project(p.x+Math.cos(a)*r*k,p.y+Math.sin(a)*r*k,48);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);}ctx.stroke();
  }
 }
 for(const c of game.crueltyComets||[]){
  const t=Math.max(0,Math.min(1,1-(c.at-game.time)));
  orb(c.x,c.y,60+220*(1-t),8,'#bda1ff');
  const center=project(c.x,c.y,5);ctx.strokeStyle='#9673d5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(center.x,center.y,16+8*t,0,Math.PI*2);ctx.stroke();
 }
 for(const e of game.effects||[])if(e.type==='crueltyImpact'&&e.life>0){const p=project(e.x,e.y,20);ctx.strokeStyle='#bda1ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,8+28*(1-e.life/e.max),0,Math.PI*2);ctx.stroke();}
 ctx.restore();
}
