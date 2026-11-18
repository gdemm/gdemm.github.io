export class DianaPresentation{
 constructor(vfx){this.vfx=vfx;this.active=new Map();}
 reset(){for(const e of this.active.values())e.stopped=true;this.active.clear();}
 update(g){const wanted=new Set(),keep=(key,name,p)=>{wanted.add(key);let e=this.active.get(key);if(!e||e.stopped){e=this.vfx.emit(name,Object.assign(this.vfx.host(p.x,p.y,0,p),{height:0,sampleBirth:true,seedParticles:true}),1);if(e)this.active.set(key,e);}if(e){e.host.follow=p;e.host.classicPersistent=true;e.duration=e.age+1;}};
  for(const u of g.units||[]){if(!u.alive)continue;
   if(Object.values(u.classicMoonlight||{}).some(until=>until>g.time))keep('moon:'+u.id,'Diana_Base_Q_Moonlight',u);
   if(u.hero?.id!=='Diana')continue;const s=u.classic||{};
   if((u.supportState?.shieldParts||[]).some(p=>['dianaW','dianaWRefresh'].includes(p.key)&&p.remaining>0&&p.until>g.time))keep('shield:'+u.id,'Diana_Base_W_Shield',u);
   if(s.wUntil>g.time)for(let i=0;i<3;i++)if(s.orbAlive?.[i]){const angle=(s.orbAngle||0)+i*Math.PI*2/3,r=150/(g.mapConfig?.scale||2);keep('orb:'+u.id+':'+i,'Diana_Base_W_Orb',{x:u.x+Math.cos(angle)*r,y:u.y+Math.sin(angle)*r});}
  }
  for(const[key,e]of this.active)if(!wanted.has(key)){e.stopped=true;this.active.delete(key);}
 }
}
