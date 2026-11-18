// Buff visuals are reconciled against actual state, not fixed-duration replay cues.
export class FighterBuffPresentation{
 constructor(vfx){this.vfx=vfx;this.active=new Map();}
 reset(){for(const e of this.active.values())e.stopped=true;this.active.clear();}
 update(g){const wanted=new Set(),keep=(key,name,u,bone=null)=>{wanted.add(key);let e=this.active.get(key);if(!e||e.stopped){e=this.vfx.emit(name,Object.assign(this.vfx.host(u.x,u.y,0,u),{sampleBirth:true,seedParticles:true,...(bone?{bone,classicBoneFrame:true}:{})}),1);if(e)this.active.set(key,e);}if(e){e.host.follow=u;e.host.classicPersistent=true;e.duration=e.age+1;}};
  for(const u of g.units||[]){if(!u.alive)continue;const s=u.classic||{},h=u.hero?.id;
   if(h==='XinZhao'&&s.rUntil>g.time){keep('xin-shield:'+u.id,'XinZhao_Base_R_Shield',u);keep('xin-ring:'+u.id,'XinZhao_Base_R_IndicatorRing',u);}
   if(h==='JarvanIV'&&(u.supportState?.shieldParts||[]).some(p=>p.key==='jarvanW'&&p.remaining>0&&p.until>g.time))keep('jarvan-shield:'+u.id,'JarvanIV_Base_W_buf_01',u);
   if(h==='Riven'){
    if(s.rUntil>g.time)keep('riven-sword:'+u.id,'Riven_Base_R_Sword',u,'WEAPON');
    if(s.passiveCharges>0&&s.passiveUntil>g.time)keep('riven-passive:'+u.id,'Riven_Base_P_Buff_Wpn',u);
    if((u.supportState?.shieldParts||[]).some(p=>p.key==='rivenE'&&p.remaining>0&&p.until>g.time))keep('riven-shield:'+u.id,'Riven_Base_E_Shield',u);
   }
   if(h==='LeeSin'){
    if(s.flurry>0&&s.flurryUntil>g.time){keep('lee-left:'+u.id,'LeeSin_Base_P_buf_L',u);keep('lee-right:'+u.id,'LeeSin_Base_P_buf_R',u);}
    if(s.vampUntil>g.time)keep('lee-vamp:'+u.id,'LeeSin_Base_W_ironWill_armor',u);
    const marked=s.qUntil>g.time&&g.units.find(v=>v.id===s.qTarget&&v.alive);if(marked)keep('lee-q:'+u.id,'LeeSin_Base_Q_tar_indicator',marked);
   }
   if(h==='Galio'){
    if(u.classicGalioShield>0)keep('galio-passive:'+u.id,'Galio_Base_W_SelfShield',u);
    if(s.w)keep('galio-charge:'+u.id,'Galio_Base_W_DR',u);
   }
   if(Object.values(u.classicXinMarked||{}).some(until=>until>g.time))keep('xin-mark:'+u.id,'XinZhao_Base_W_tar_TargetMarker',u);
   if((u.classicMagicShields||[]).some(p=>p.remaining>0&&p.until>g.time))keep('galio-ally:'+u.id,'Galio_Base_W_AllyShield',u);
  }
  for(const[key,e]of this.active)if(!wanted.has(key)){e.stopped=true;this.active.delete(key);}
 }
}
