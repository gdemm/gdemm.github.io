// Native XinZhao animation-event resource keys and attachment bones.
export function xinQAttackVfx(vfx,event){
 if(event.hero!=='XinZhao')return false;
 const match=/^XinZhaoQThrust([123])$/.exec(event.presentationSpellName||'');if(!match)return false;
 const n=Number(match[1]),u=event.source;
 if(event.phase==='attackStart'&&u){const bone=n===1?'Lower_Weapon2':'C_Buffbone_GLB_Layout_Loc';vfx.emit(`XinZhao_Base_Q_Swipe_0${n}`,Object.assign(vfx.host(u.x,u.y,0,u),{bone,classicBoneFrame:true,sampleBirth:true,seedParticles:true}),.5);}
 if(event.phase==='hit'&&event.target){const v=event.target;vfx.emit(`XinZhao_Base_Q_Swipe_0${n}_Tar`,Object.assign(vfx.host(v.x,v.y,0,v),{sampleBirth:true,seedParticles:true}),.4);}
 return true;
}
