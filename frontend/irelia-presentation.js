// Persistent effects follow authoritative state, not a fixed cast-time lifetime.
export class IreliaPresentation {
 constructor(vfx){this.vfx=vfx;this.active=new Map();}
 reset(){for(const e of this.active.values())e.stopped=true;this.active.clear();}
 update(g){
  const wanted=new Set();
  const keep=(key,name,p,bone=null)=>{
   wanted.add(key);let e=this.active.get(key);
   if(!e||e.stopped){e=this.vfx.emit(name,Object.assign(this.vfx.host(p.x,p.y,0,p),{height:0,sampleBirth:true,seedParticles:true,...(bone?{bone,classicBoneFrame:true}:{})}),1);if(e)this.active.set(key,e);}
   if(e){e.host.follow=p;e.host.classicPersistent=true;e.duration=e.age+1;}
  };
  for(const u of g.units||[]){
   if(!u.alive)continue;
   if(Object.values(u.classicIreliaMark||{}).some(until=>until>g.time))keep('mark:'+u.id,'Irelia_Base_Q_Mark',u);
   if(u.hero?.id!=='Irelia')continue;
   const s=u.classic||{};
   if(s.stacks>=4&&s.stackUntil>g.time){keep('passive:'+u.id,'Irelia_Base_P_buf',u);for(let i=1;i<=6;i++)keep('sword:'+u.id+':'+i,'Irelia_Base_P_Blades_Stacks_4',u,'Sword'+i+'_Skn');}
   if(s.w?.until>g.time)keep('charge:'+u.id,'Irelia_Base_W_DR',u);
   if(s.blade?.until>g.time)keep('blade:'+u.id+':'+s.blade.token,'Irelia_Base_E_Blades',s.blade);
  }
  for(const[key,e]of this.active)if(!wanted.has(key)){e.stopped=true;this.active.delete(key);}
 }
}
