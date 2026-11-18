import {xinQAttackVfx} from './classic-q-attack-vfx.js';
// Heroes with dedicated presentation handlers are intentionally excluded.
export const CLASSIC_ATTACK_HITS={Kaisa:'Kaisa_Base_AA_tar',LeeSin:'LeeSin_Base_BA_01',Diana:'Diana_Base_BA_tar',Riven:'Riven_Base_BA_tar',Irelia:'Irelia_Base_BA_Hit',XinZhao:'XinZhao_Base_BA_Tar',JarvanIV:'JarvanIV_Base_BA_tar_01',Aatrox:'Aatrox_Base_AA_Hit_Tar01',Galio:'Galio_Base_BA_hit_tar'};
export const CLASSIC_CRIT_HITS={Kaisa:'Kaisa_Base_AA_tar_Crit',LeeSin:'LeeSin_Base_BA_crit_01',Riven:'Riven_Base_BA_Crit_tar',Irelia:'Irelia_Base_BA_Hit_Crit',XinZhao:'XinZhao_Base_BA_Crit_Tar',JarvanIV:'JarvanIV_Base_BA_tar_crit_01',Aatrox:'Aatrox_Base_AA_Crit_Hit_Tar'};
export function classicAttackHit(vfx,event){if(xinQAttackVfx(vfx,event))return true;
 const name=(event.critical&&CLASSIC_CRIT_HITS[event.hero])||CLASSIC_ATTACK_HITS[event.hero];
 if(!name||event.phase!=='hit'||event.state!=='attack'||!event.target)return false;
 const target=event.target;
 vfx.emit(name,Object.assign(vfx.host(target.x,target.y,0,target),{sampleBirth:true,seedParticles:true}),.45);return true;
}
