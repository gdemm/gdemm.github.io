export const MARKSMAN_MAPPING={Vayne:{attack:[null,'Vayne_Base_BA_mis','Vayne_Base_BA_tar']},Tristana:{attack:['Tristana_Base_BA_cas','Tristana_Base_BA_mis','Tristana_Base_BA_tar']}};
export class MarksmanPresentation{
 constructor(vfx){this.vfx=vfx;this.active=new Map();}
 reset(){for(const x of this.active.values())x.stopped=true;this.active.clear();}
 update(g){const wanted=new Set(),keep=(key,name,u)=>{const id=key+':'+name;wanted.add(id);let x=this.active.get(id);if(!x||x.stopped){x=this.vfx.emit(name,Object.assign(this.vfx.host(u.x,u.y,0,u),{sampleBirth:true,seedParticles:true}),1);if(x)this.active.set(id,x);}if(x){x.host.follow=u;x.host.classicPersistent=true;x.duration=x.age+1;}};
  for(const u of g.units||[]){if(!u.alive)continue;const s=u.classic||{};
   if(u.hero?.id==='Vayne'){
    if(s.qUntil>g.time)keep('q:'+u.id,'Vayne_Base_Q_buf',u);
    if(s.rUntil>g.time)keep('r:'+u.id,'Vayne_Base_R_buf_chst',u);
    if(s.silverUntil>g.time&&s.silverStacks>0){const v=g.units.find(v=>v.id===s.silverTarget&&v.alive);if(v)keep('silver:'+u.id,'vayne_base_W_ring'+s.silverStacks,v);}
   }
   if(u.hero?.id==='Tristana'&&s.qUntil>g.time)keep('q:'+u.id,'Tristana_Base_Q_Buf',u);
   for(const[id,b]of Object.entries(u.classicTristanaBombs||{}))if(b.until>g.time){const variant=b.stacks>=3?'_max':b.stacks===2?'_3':b.stacks===1?'_2':'';keep('bomb:'+u.id+':'+id,'Tristana_Base_E_charge_buff'+variant,u);}
  }
  for(const[id,x]of this.active)if(!wanted.has(id)){x.stopped=true;this.active.delete(id);}
 }
}
