const PLASMA=[null,'Kaisa_Base_P_stack_01','Kaisa_Base_P_stack_02','Kaisa_Base_P_stack_03','Kaisa_Base_P_stack_05'];
export class KaisaPresentation {
 constructor(vfx){this.vfx=vfx;this.active=new Map();}
 reset(){for(const e of this.active.values())e.stopped=true;this.active.clear();}
 update(g){const wanted=new Set(),keep=(key,name,u)=>{wanted.add(key);let e=this.active.get(key);if(!e||e.stopped){e=this.vfx.emit(name,Object.assign(this.vfx.host(u.x,u.y,0,u),{sampleBirth:true,seedParticles:true,classicPersistent:true}),1);if(e)this.active.set(key,e);}if(e){e.host.follow=u;e.duration=e.age+1;}};
  for(const u of g.units||[]){if(!u.alive)continue;
   for(const [source,mark]of Object.entries(u.classicPlasma||{}))if(mark.until>g.time&&PLASMA[mark.stacks])keep('plasma:'+u.id+':'+source+':'+mark.stacks,PLASMA[mark.stacks],u);
   if(u.hero?.id!=='Kaisa')continue;
   if(u.classic?.eChargeUntil>g.time)keep('charge:'+u.id,'Kaisa_Base_E_active',u);
   if((u.supportState?.shieldParts||[]).some(s=>s.key==='kaisaR'&&s.remaining>0&&s.until>g.time))keep('shield:'+u.id,'Kaisa_Base_R_Shield_Buf',u);
  }
  for(const[key,e]of this.active)if(!wanted.has(key)){e.stopped=true;this.active.delete(key);}
 }
}
