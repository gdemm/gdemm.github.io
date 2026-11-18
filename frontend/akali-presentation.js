export class AkaliPresentation{
 constructor(vfx,toNative){this.vfx=vfx;this.toNative=toNative;this.active=new Map();}
 reset(){for(const e of this.active.values())e.stopped=true;this.active.clear();}
 host(p,aim=p,follow=null){const a=this.toNative(p.x,p.y),b=this.toNative(aim.x,aim.y);return Object.assign(this.vfx.host(p.x,p.y,Math.atan2(b.x-a.x,b.z-a.z),follow),{height:0,sampleBirth:true,seedParticles:true});}
 event(e){if(e.hero!=='Akali')return false;const u=e.source;if(!u)return true;
  if(e.phase==='cast'){const name={q:'Akali_Base_Q_Cas',w:'Akali_Base_W_Cas',e:e.animation==='e2'?'Akali_Base_E_Dash_Dust':'Akali_Base_E_Run',r:'Akali_Base_R_Cas'}[e.state];if(name)this.vfx.emit(name,this.host(u,e.aim||u,u),.6);}
  if(e.phase==='hit'&&e.target){const name={q:'Akali_Base_Q_Tar',e:'Akali_Base_E_Tar',r:'Akali_Base_R_Tar',attack:'Akali_Base_BA_Tar'}[e.state];if(name)this.vfx.emit(name,this.host(e.target,e.target,e.target),.5);}
  return true;
 }
 update(g){const wanted=new Set(),keep=(key,name,point,follow=null)=>{wanted.add(key);let e=this.active.get(key);if(!e||e.stopped){e=this.vfx.emit(name,this.host(point,point,follow),1);if(e)this.active.set(key,e);}if(e){e.host.follow=follow;e.host.x=point.x;e.host.y=point.y;e.host.classicPersistent=true;e.duration=e.age+1;}return e;};
  for(const z of g.zones||[])if(z.kind==='akaliSmoke'&&z.age<z.duration&&z.source?.alive&&(z.classicRealmId||0)===(g.player?.classicRealmId||0)){
   const mid=(z.r+(z.inner||0))/2;
   for(let i=0;i<8;i++){const angle=i*Math.PI/4,p={x:z.x+Math.cos(angle)*mid,y:z.y+Math.sin(angle)*mid};keep('smoke:'+z.id+':'+i,'Akali_Base_W_Smoke_Ring_Node',p,p);}
  }
  for(const u of g.units||[]){if(!u.alive||u.hero?.id!=='Akali')continue;const s=u.classic||{};
   if(s.pEmpoweredUntil>g.time)keep('weapon:'+u.id,'Akali_Base_P_WeaponGlow',u,u);
   if(u.id!==g.player?.id){if(u.team!==g.player?.team&&s.eMark?.until>g.time&&s.eMark.target?.id===g.player?.id&&s.eMark.target.alive)keep('enemy-mark:'+u.id,'Akali_Base_E_Enemy_Indicator_Red',s.eMark.target,s.eMark.target);continue;}
   if(s.pRing?.until>g.time)keep('ring:'+u.id,'Akali_Base_P_Indicator_Circle_Self',s.pRing);
   if(s.eMark?.until>g.time&&s.eMark.point)keep('smoke-mark:'+u.id,'Akali_Base_E_Enemy_Indicator_Smoke',s.eMark.point);
   if(s.eMark?.until>g.time&&s.eMark.target?.alive)keep('mark:'+u.id,'Akali_Base_E_Enemy_Indicator',s.eMark.target,s.eMark.target);
  }
  for(const[key,e]of this.active)if(!wanted.has(key)){e.stopped=true;this.active.delete(key);}
 }
}
