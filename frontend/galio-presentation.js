export class GalioPresentation {
 constructor(vfx){this.vfx=vfx;this.active=new Map();this.phases=new Map();}
 reset(){for(const e of this.active.values())e.stopped=true;this.active.clear();this.phases.clear();}
 update(g){const wanted=new Set(),seen=new Set(),keep=(key,name,p,height)=>{wanted.add(key);let e=this.active.get(key);if(!e||e.stopped){e=this.vfx.emit(name,Object.assign(this.vfx.host(p.x,p.y,0,p),{height,sampleBirth:true,seedParticles:true,classicPersistent:true}),1);if(e)this.active.set(key,e);}if(e){e.host.follow=p;e.duration=e.age+1;}};
  for(const u of g.units||[]){const r=u.classic?.r;if(!u.alive||u.hero?.id!=='Galio'||!r||!['channel','flight'].includes(r.phase))continue;
   seen.add(u.id);const previous=this.phases.get(u.id);
   if(r.phase==='flight'&&previous?.phase==='channel'&&previous.token===r.token)this.vfx.emit('Galio_Base_R_Cas_Takeoff',Object.assign(this.vfx.host(u.x,u.y,0),{height:0,sampleBirth:true,seedParticles:true}),.5);
   this.phases.set(u.id,{phase:r.phase,token:r.token});
   const side=u.team===g.player?.team?'Ally':'Enemy';
   keep('landing:'+u.id+':'+side,'Galio_Base_R_Tar_Ground_'+side,r.center,0);
   if(r.phase==='channel')keep('charge:'+u.id,'Galio_Base_R_Cas_ChargeUp',u,140);
   if(r.phase==='flight')keep('flight:'+u.id,'Galio_Base_R_Cas_Fly',u,140);
  }
  for(const id of this.phases.keys())if(!seen.has(id))this.phases.delete(id);
  for(const[key,e]of this.active)if(!wanted.has(key)){e.stopped=true;this.active.delete(key);}
 }
}
