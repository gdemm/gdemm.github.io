// Native MonkeyKing effect lifecycle, independently verified in the local developer client.
export class MonkeyPresentation{
 constructor(vfx,toNative){this.vfx=vfx;this.toNative=toNative;this.active=new Map();}
 reset(){for(const r of this.active.values())r.stopped=true;this.active.clear();}
 host(u,aim=u,follow=u){const a=this.toNative(u.x,u.y),b=this.toNative(aim.x,aim.y);return Object.assign(this.vfx.host(u.x,u.y,Math.atan2(b.x-a.x,b.z-a.z),follow),{sampleBirth:true,seedParticles:true,height:0});}
 event(e,g){if(e.hero!=='MonkeyKing')return false;const u=e.source;if(!u)return true;const aim=e.aim||u;
  if(e.phase==='cast'){const name={q:'MonkeyKing_Base_Q_Cas_01',w:u.team===g.player?.team?'MonkeyKing_Base_W_cas_ally_01':'MonkeyKing_Base_W_cas_enemy_01',e:'MonkeyKing_Base_E_Mis_self_01'}[e.state];if(name)this.vfx.emit(name,this.host(u,aim),.7);}
  if(e.phase==='attackStart')this.vfx.emit((e.presentationSpellName==='MonkeyKingQAttack'||e.audioCue==='MonkeyKingQAttack_OnCast')?'MonkeyKing_Base_Q_Cas_01':'MonkeyKing_Base_BA_01_Swipe',this.host(u,e.target||aim),.35);
  if(e.phase==='hit'){const names={attack:'MonkeyKing_Base_BA_tar_01',cloneAttack:'MonkeyKing_Base_BA_tar_01',q:'MonkeyKing_Base_Q_tar_01',cloneQ:'MonkeyKing_Base_Q_tar_01',e:'MonkeyKing_Base_E_tar_01',r:'MonkeyKing_Base_R_tar_01',cloneR:'MonkeyKing_Base_R_tar_01'},name=e.presentationSpellName==='MonkeyKingQAttack'?'MonkeyKing_Base_Q_tar_01':names[e.state];if(name&&e.target)this.vfx.emit(name,this.host(e.target,e.target,e.target),.35);}
  return true;
 }
 update(g){const wanted=new Set(),keep=(key,name,u)=>{wanted.add(key);let r=this.active.get(key);if(!r||r.stopped){r=this.vfx.emit(name,this.host(u),1);if(r)this.active.set(key,r);}if(r){r.host.follow=u;r.host.classicPersistent=true;r.duration=r.age+1;}};
  for(const u of g.units||[]){if(!u.alive||u.hero?.id!=='MonkeyKing')continue;const q=u.classicClone?u.cloneQUntil:u.classic?.qUntil,spin=u.classicClone?u.cloneSpin:u.classic?.spin;
   if(q>g.time)keep(u.id+':q','MonkeyKing_Base_Q_Buf_A',u);
   if(spin?.until>g.time)keep(u.id+':r','MonkeyKing_Base_R_Cas_01',u);
  }
  for(const[key,r]of this.active)if(!wanted.has(key)){r.stopped=true;this.active.delete(key);}
 }
}
