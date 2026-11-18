export class AatroxPresentation {
 constructor(vfx){this.vfx=vfx;this.active=new Map();}
 reset(){for(const e of this.active.values())e.stopped=true;this.active.clear();}
 update(g){
  const wanted=new Set(),keep=(key,name,point,height)=>{wanted.add(key);let e=this.active.get(key);if(!e||e.stopped){e=this.vfx.emit(name,Object.assign(this.vfx.host(point.x,point.y,0,point),{sampleBirth:true,seedParticles:true,height,classicPersistent:true}),1);if(e)this.active.set(key,e);}if(e){e.host.follow=point;e.duration=e.age+1;}return e;};
  for(const z of g.zones||[])if(z.kind==='aatroxChain'&&!z.broken&&z.age<z.duration&&z.target?.alive){
   // The ground anchor remains at impact location, not the moving target.
   keep('chain-area:'+z.id,'Aatrox_Base_W_Core_Area',z,0);
   const beam=keep('chain-beam:'+z.id,'Aatrox_Base_W_Beam_Tar',z.target,0);if(beam)beam.host.classicTetherAnchor=z;
  }
  for(const u of g.units||[])if(u.alive&&u.hero?.id==='Aatrox'){
   const s=u.classic||{};if(s.rUntil>g.time&&s.rSpeedUntil>g.time)keep('speed:'+u.id,'Aatrox_Base_R_SpeedBuff',u,140);
  }
  for(const[key,e]of this.active)if(!wanted.has(key)){e.stopped=true;this.active.delete(key);}
 }
}
