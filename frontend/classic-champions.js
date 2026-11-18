import {cancelKaisaEvolution} from './classic-kaisa.js';
import {updateClassicClones} from './classic-clones.js';
import {castMonkeyKing,monkeyAfterDamage,updateMonkey,monkeyAS,monkeyRange,monkeyArmor,monkeyIncoming,monkeyMove,monkeyAttackStart} from './classic-monkeyking.js';
import {castZed,updateZed,zedAfterDamage,updateZedMarks} from './classic-zed.js';
import {castAkali,akaliAfterDamage,updateAkali,akaliRange,akaliMove,revealAkali} from './classic-akali.js';
import {castMordekaiser,mordeAfterDamage,mordeIncoming,updateMorde,mordeDeath,mordeMove} from './classic-mordekaiser.js';
import {castYone,yoneBasic,yoneCritStats,yoneCooldown,yoneAfterDamage,updateYone,yoneMove} from './classic-yone.js';
import {castEkko,ekkoAttackStart,ekkoAfterDamage,updateEkko,ekkoMove,ekkoRange,recordEkkoDamage,resetEkkoHistory,updateEkkoZones} from './classic-ekko.js';
import {canInteract,realmId,constrainRealm} from './classic-realms.js';
export {canInteract,realmId,constrainRealm,recipientRealmView} from './classic-realms.js';
import {castLeeSin,leeAfterDamage,updateLeeSin,updateLeeKicks,leeAS} from './classic-leesin.js';
import {castIrelia,ireliaAfterDamage,updateIrelia,ireliaAS,ireliaDR,updateIreliaZones} from './classic-irelia.js';
import {castAatrox,aatroxAfterDamage,updateAatrox,updateAatroxChains,aatroxMove,aatroxTakedown} from './classic-aatrox.js';
import {castGalio,initGalio,galioBasic,galioAfterDamage,cancelGalioChannel,updateGalio,galioMove,galioIncoming,consumeMagicShields,updateGalioTornadoes} from './classic-galio.js';
import {castDiana,dianaAfterDamage,updateDiana,dianaAS} from './classic-diana.js';
import {castXinZhao,xinAfterDamage,xinAS,xinBlocksDamage} from './classic-xinzhao.js';
import {castJarvan,jarvanAfterDamage,updateJarvan,jarvanAS} from './classic-jarvan.js';
import {castRiven,rivenAfterDamage,updateRiven,rivenRange} from './classic-riven.js';
import {runClassicJobs} from './classic-common.js';
export {updateClassicMissile} from './classic-missiles.js';
export {constrainClassicTerrain} from './classic-geometry.js';
import {castKaisa,updateKaisa,kaisaAfterDamage,kaisaPlasma,kaisaMove,kaisaAttackSpeed} from './classic-kaisa.js';
import {CLASSIC_IDS} from './classic-roster.js';
import {CLASSIC_NATIVE} from './classic-data.js';
import {nativeSpell,value,passiveValue,cost,cooldown,state} from './classic-common.js';
import {castVayne,vayneAfterDamage,updateVayne,vayneMove,vayneTakedown} from './classic-vayne.js';
import {castTristana,tristanaAfterDamage,tristanaRange,updateTristanaBombs,tristanaTargetDeath} from './classic-tristana.js';
export const CLASSIC_IMPLEMENTED=new Set(['Kaisa','Vayne','Tristana','Diana','XinZhao','JarvanIV','Riven','LeeSin','Irelia','Aatrox','Galio','Mordekaiser','Yone','Ekko']);
export const isClassic=u=>CLASSIC_IDS.has(u?.hero?.id);
export const isClassicMelee=u=>isClassic(u)&&!['Kaisa','Vayne','Tristana'].includes(u.hero.id);
export function classicCost(u,i){const s=state(u),now=u.augmentCurrentTime||0;return u.hero.id==='LeeSin'&&((i===0&&s.qUntil>now)||(i===1&&s.wUntil>now)||(i===2&&s.eUntil>now))?30:cost(u,i);}
export function classicCooldown(u,i){if(u.hero.id==='Yone')return yoneCooldown(u,i);return u.hero.id==='Irelia'&&i===0?Math.max(0,cooldown(u,i)-value(u,3,'CooldownAmount')):cooldown(u,i);}
export function classicRange(u,i){if(u.hero.id==='MonkeyKing')return [0,300,650,315][i];
 if(u.hero.id==='Akali')return [550,0,state(u).eMark?10000:825,state(u).rUntil>(u.augmentCurrentTime||0)?715:675][i];
 if(u.hero.id==='Mordekaiser')return [675,0,700,650][i];
 if(u.hero.id==='Yone')return [state(u).qStacks>=2?1000:475,600,300,1000][i];
 if(u.hero.id==='Ekko')return [1075,1600,350,0][i];
 if(u.hero.id==='LeeSin')return [state(u).qUntil>(u.augmentCurrentTime||0)?1300:1100,700,450,375][i];
 if(u.hero.id==='Irelia')return [600,825,850,950][i];
 if(u.hero.id==='Aatrox')return [state(u).qStep?500:625,825,300,0][i];
 if(u.hero.id==='Galio')return [825,475,650,([4000,4000,4750,5500][u.spellRanks?.[3]||1])][i];
 if(u.hero.id==='Diana')return [900,200,825,475][i];
 if(u.hero.id==='XinZhao')return [0,1000,state(u).markUntil>(u.augmentCurrentTime||0)?1100:650,500][i];
 if(u.hero.id==='JarvanIV')return [770,625,860,650][i];
 if(u.hero.id==='Riven')return [275,260,250,1100][i];
 if(u.hero.id==='Kaisa')return [600,3000,0,value(u,3,'RRange')][i];
 if(u.hero.id==='Vayne')return [300,0,550,0][i];
 if(u.hero.id==='Tristana')return [0,900,550+tristanaRange(u),550+tristanaRange(u)][i];
 const spell=nativeSpell(u,i);return (spell.castRangeDisplayOverride||spell.castRange)?.[u.spellRanks?.[i]||1]||0;
}
export function classicTargeting(u,i){if(u.hero.id==='MonkeyKing')return ['Self','Location','Unit','Self'][i];if(u.hero.id==='Zed'){const now=u.augmentCurrentTime||0,r=state(u).zedRecasts||{};return ['Location',r.w?.until>now?'Self':'Location','Self',r.r?.until>now?'Self':'Unit'][i];}
 if(u.hero.id==='Akali')return ['Cone','Self',state(u).eMark?'Self':'Location',state(u).rUntil>(u.augmentCurrentTime||0)?'Location':'Unit'][i];
 if(u.hero.id==='Mordekaiser')return ['Location','Self','Location','Unit'][i];
 if(u.hero.id==='Yone')return ['Location','Location',state(u).soul?'Self':'Location','Location'][i];
 if(u.hero.id==='Ekko')return ['Location','AreaClamped','Location','Self'][i];
 if(u.hero.id==='LeeSin')return [state(u).qUntil>(u.augmentCurrentTime||0)?'Self':'Location',state(u).wUntil>(u.augmentCurrentTime||0)?'Self':'Unit','Self','Unit'][i];
 if(u.hero.id==='Irelia')return ['Unit','Location','Location','Location'][i];
 if(u.hero.id==='Aatrox')return ['Location','Location','Location','Self'][i];
 if(u.hero.id==='Galio')return ['Location','Self','Location','Unit'][i];
 if(u.hero.id==='Diana')return ['Location','Self','Unit','Self'][i];
 if(u.hero.id==='XinZhao')return ['Self','Location','Unit','Self'][i];
 if(u.hero.id==='JarvanIV')return ['Location','Self','AreaClamped',state(u).wallUntil>(u.augmentCurrentTime||0)?'Self':'Unit'][i];
 if(u.hero.id==='Riven')return ['Location','Self','Location','Location'][i];
 if(u.hero.id==='Kaisa')return ['Self','Location','Self','Location'][i];
 if(u.hero.id==='Vayne')return ['Location','Self','Unit','Self'][i];
 if(u.hero.id==='Tristana')return ['Self','AreaClamped','Unit','Unit'][i];
 return nativeSpell(u,i).mTargetingTypeData?.__type||'Unit';
}
export function configureClassicHero(g,u){
 if(!isClassic(u))return;const c=CLASSIC_NATIVE[u.hero.id].character,s=state(u),resource=c.primaryAbilityResource;
 u.noMana=['Mordekaiser','Yone','Riven','Aatrox'].includes(u.hero.id);u.classicEnergy=resource?.arType===1;
 const max=u.noMana?0:resource?.['{726ee5cd}']?.baseValue??600;
 u.maxMp=max+(resource?.['{6216bf7b}']?.baseValue||0)*Math.max(0,u.level-1);
 if(!s.initialized){u.mp=u.maxMp;s.initialized=true;}
 if(u.hero.id==='Galio')initGalio(g,u);
 if(u.hero.id==='Mordekaiser')u.classicMagicPen=value(u,2,'MagicPen');
 if(u.hero.id==='Yone'&&u.critDamageMultiplier===undefined)u.critDamageMultiplier=1.75*passiveValue(u,'CritDamageMod',.95);
 u.classicBonusAD??=0;u.classicADMultiplier??=1;
}
export function castClassic(g,i,aim,h){if(g.player.hero.id==='MonkeyKing')return castMonkeyKing(g,i,aim,h);if(g.player.hero.id==='Zed')return castZed(g,i,aim,h);
 if(g.player.hero.id==='Akali')return castAkali(g,i,aim,h);
 if(g.player.hero.id==='Mordekaiser')return castMordekaiser(g,i,aim,h);
 if(g.player.hero.id==='Yone')return castYone(g,i,aim,h);
 if(g.player.hero.id==='Ekko')return castEkko(g,i,aim,h);
 if(g.player.hero.id==='LeeSin')return castLeeSin(g,i,aim,h);
 if(g.player.hero.id==='Irelia')return castIrelia(g,i,aim,h);
 if(g.player.hero.id==='Aatrox')return castAatrox(g,i,aim,h);
 if(g.player.hero.id==='Galio')return castGalio(g,i,aim,h);
 if(g.player.hero.id==='Diana')return castDiana(g,i,aim,h);
 if(g.player.hero.id==='XinZhao')return castXinZhao(g,i,aim,h);
 if(g.player.hero.id==='JarvanIV')return castJarvan(g,i,aim,h);
 if(g.player.hero.id==='Riven')return castRiven(g,i,aim,h);
 if(g.player.hero.id==='Kaisa')return castKaisa(g,i,aim,h);
 if(g.player.hero.id==='Vayne')return castVayne(g,i,aim,h);
 if(g.player.hero.id==='Tristana')return castTristana(g,i,aim,h);
 // Explicitly unavailable while under development; never fall through to a generic spell.
 return false;
}
export function classicAfterDamage(g,u,v,info){if(!isClassic(u)||u.team===v.team)return;if(u.hero.id==='MonkeyKing')monkeyAfterDamage(g,u,v,info);if(u.hero.id==='Zed')zedAfterDamage(g,u,v,info);if(u.hero.id==='Akali')akaliAfterDamage(g,u,v,info);if(u.hero.id==='Mordekaiser')mordeAfterDamage(g,u,v,info);if(u.hero.id==='Yone')yoneAfterDamage(g,u,v,info);if(u.hero.id==='Ekko')ekkoAfterDamage(g,u,v,info);if(u.hero.id==='LeeSin')leeAfterDamage(g,u,v,info);if(u.hero.id==='Irelia')ireliaAfterDamage(g,u,v,info);if(u.hero.id==='Aatrox')aatroxAfterDamage(g,u,v,info);if(u.hero.id==='Galio')galioAfterDamage(g,u,v,info);if(u.hero.id==='Diana')dianaAfterDamage(g,u,v,info);if(u.hero.id==='XinZhao')xinAfterDamage(g,u,v,info);if(u.hero.id==='JarvanIV')jarvanAfterDamage(g,u,v,info);if(u.hero.id==='Riven')rivenAfterDamage(g,u,v,info);if(u.hero.id==='Kaisa')kaisaAfterDamage(g,u,v,info);if(u.hero.id==='Vayne')vayneAfterDamage(g,u,v,info);if(u.hero.id==='Tristana')tristanaAfterDamage(g,u,v,info);}
export function updateClassicHero(g,u,dt,h){if(u.hero.id==='MonkeyKing')updateMonkey(g,u,dt,h);if(u.hero.id==='Zed')updateZed(g,u);if(u.hero.id==='Akali')updateAkali(g,u,h);if(u.hero.id==='Mordekaiser'){u.classicMagicPen=value(u,2,'MagicPen');updateMorde(g,u,dt,h);}if(u.hero.id==='Yone')updateYone(g,u,dt,h);if(u.hero.id==='Ekko')updateEkko(g,u);if(u.hero.id==='LeeSin')updateLeeSin(g,u);if(u.hero.id==='Irelia')updateIrelia(g,u,dt,h);if(u.hero.id==='Aatrox')updateAatrox(g,u);if(u.hero.id==='Galio')updateGalio(g,u,dt,h);if(u.hero.id==='Diana')updateDiana(g,u,dt,h);if(u.hero.id==='JarvanIV')updateJarvan(g,u,dt,h);if(u.hero.id==='Riven')updateRiven(g,u);if(u.hero.id==='Kaisa')updateKaisa(g,u);if(u.hero.id==='Vayne')updateVayne(g,u);}
export function updateClassicWorld(g,dt,h){updateClassicClones(g,dt,h);updateZedMarks(g);for(const u of g.units)if(realmId(u)){const p=constrainRealm(g,u,u);u.x=p.x;u.y=p.y;}for(const z of g.zones||[])z.classicRealmId??=realmId(z.source);runClassicJobs(g);updateEkkoZones(g,h);updateTristanaBombs(g);updateLeeKicks(g,h);updateIreliaZones(g,h);updateAatroxChains(g,h);updateGalioTornadoes(g,h);for(const u of g.units)if(u.classicMagicShields)u.classicMagicShields=u.classicMagicShields.filter(s=>s.until>g.time&&s.remaining>0);}
export function classicAttackStart(g,u,target){if(u.hero.id==='MonkeyKing')monkeyAttackStart(g,u,target);if(u.hero.id==='Akali')revealAkali(g,u);if(u.hero.id==='Ekko')ekkoAttackStart(g,u,target);if(u.hero.id==='Vayne'){state(u).stealthUntil=0;u.teemoStealth=false;}}
export function classicMoveBonus(g,u,target){if(u.hero?.id==='MonkeyKing')return monkeyMove(g,u);return u.hero?.id==='Akali'?akaliMove(g,u,target):u.hero?.id==='Mordekaiser'?mordeMove(g,u):u.hero?.id==='Yone'?yoneMove(g,u):u.hero?.id==='Ekko'?ekkoMove(g,u):u.hero?.id==='Aatrox'?aatroxMove(g,u):u.hero?.id==='Galio'?galioMove(g,u):u.hero?.id==='Kaisa'?kaisaMove(g,u):u.hero?.id==='Vayne'?vayneMove(g,u,target):0;}
export function classicAttackSpeed(g,u){let bonus=jarvanAS(g,u);if(u.hero.id==='MonkeyKing')bonus+=monkeyAS(g,u);if(u.hero.id==='LeeSin')bonus+=leeAS(g,u);if(u.hero.id==='Irelia')bonus+=ireliaAS(g,u);if(u.hero.id==='Diana')bonus+=dianaAS(g,u);if(u.hero.id==='XinZhao')bonus+=xinAS(g,u);if(u.hero.id==='Kaisa')bonus+=kaisaAttackSpeed(g,u);if(u.hero.id==='Tristana'&&state(u).qUntil>g.time)bonus+=value(u,0,'AttackSpeedMod');return bonus;}
export function classicRangeBonus(u){if(u.hero.id==='MonkeyKing')return monkeyRange(u);return u.hero.id==='Akali'?akaliRange(u):u.hero.id==='Ekko'?ekkoRange(u):u.hero.id==='Aatrox'&&(state(u).pReadyAt||0)<=(u.augmentCurrentTime||0)?passiveValue(u,'PBonusAARange',50):u.hero.id==='Riven'?rivenRange(u):u.hero.id==='Tristana'?tristanaRange(u):0;}
export function classicDamageAllowed(g,v,source){return canInteract(source,v)&&!xinBlocksDamage(g,v,source);}
export function classicTakedown(g,u,v){if(u?.hero?.id==='Aatrox')aatroxTakedown(g,u);if(u?.hero?.id==='Vayne')vayneTakedown(g,u,v);if(u?.hero?.id==='Tristana')u.skills[1]=0;}
export function classicDeath(g,u){
 mordeDeath(g,u);if(u.hero?.id==='Ekko')resetEkkoHistory(u);for(const z of g.zones||[])if(z.kind==='yoneSpirit'&&z.source===u)z.age=z.duration;tristanaTargetDeath(g,u);u.classicPlasma={};u.classicMagicShields=[];u.classicTaunt=null;
 if(!isClassic(u))return;
 const hadBonus=u.classicBonusAD||u.classicADMultiplier!==1,evolved=u.classic?.evolved;u.classic={initialized:true,...(evolved?{evolved}: {})};u.classicBonusAD=0;u.classicADMultiplier=1;u.classicEnergyBonus=0;u.teemoStealth=false;u.classicDisarmedUntil=0;u.classicCastLockUntil=0;u.classicRootUntil=0;u.classicUntargetableUntil=0;u.classicSelfHealMultiplier=1;if(u.hero.id==='Galio')u.classicGalioShield=undefined;
 if(hadBonus)g.refreshAugmentStats(u);
}

export function classicOnControl(g,u,v){if(!u||u.team===v.team||v.kind!=='hero')return;for(const ally of g.units)if(ally.hero?.id==='Kaisa'&&ally.team===u.team&&ally.alive)kaisaPlasma(g,ally,v,1,{ally:true});}

export function classicIncoming(g,u,source,amount,type){if(u.hero?.id==='MonkeyKing')monkeyIncoming(g,u,source,amount);if(u.hero?.id==='Mordekaiser')mordeIncoming(g,u,amount);if(u.hero?.id==='Irelia')amount*=ireliaDR(g,u,type);if(u.hero?.id==='Galio')return galioIncoming(g,u,amount,type);return consumeMagicShields(g,u,amount,type);}
export function classicReleaseAttack(g,u,v,h,heartsteel){return u.hero.id==='Yone'?yoneBasic(g,u,v,h,heartsteel):u.hero.id==='Galio'?galioBasic(g,u,v,h,heartsteel):false;}
export function classicResourceRegen(u){return u.classicEnergy?10:9+(u.itemManaRegen||0);}
export function classicTauntTarget(g,u){const t=u.classicTaunt;if(!t||t.until<=g.time||!t.source?.alive||!g.canHit(t.source))return null;return t.source;}
export function classicCanInputSpell(g,u,i){if(classicTauntTarget(g,u))return false;if(!(u.classicCastLockUntil>g.time))return true;return u.hero.id==='Irelia'&&i===1&&!!state(u).w||u.hero.id==='Galio'&&i===1&&!!state(u).w||u.hero.id==='Aatrox'&&i===2;}
export function classicCancelChannel(g,u){cancelGalioChannel(g,u);if(u.hero?.id==='Kaisa')cancelKaisaEvolution(g,u);}

export function classicRecordDamage(g,u,amount){recordEkkoDamage(u,amount);}
export function classicCritStats(g,u,rawCrit){if(u.hero.id==='Yone')yoneCritStats(u,rawCrit);}

export const classicArmorBonus=u=>u.hero?.id==='MonkeyKing'?monkeyArmor(u):0;
