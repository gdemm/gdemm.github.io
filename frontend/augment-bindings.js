import {COMBAT_DATA} from './combat-data.js';
// Capabilities describe implemented spells, rather than assuming every Q/W/E/R
// damages, shields, dashes, or remains active. Authoritative server validates too.
const CAPABILITIES={
 Jax:[['damage','dash'],['buff','damage'],['buff','damage','control','selfAoE'],['buff','damage','selfAoE']],
 Teemo:[['damage','missile','control'],['buff'],[],['damage','control']],MasterYi:[['damage'],['heal','buff'],['buff'],['buff']],Chogath:[['damage','control'],['damage','control'],['buff','damage'],['damage','true']],Sylas:[['damage','control'],['damage','heal','dash'],['damage','control','dash'],[]],Veigar:[['damage','missile'],['damage'],['control'],['damage','missile']],
 Jhin:[['damage','missile'],['damage','control'],['damage','control'],['damage','missile','control']],
 Tryndamere:[['heal'],['control'],['damage','dash'],['buff']],
 MissFortune:[['damage','missile'],['buff'],['damage','control'],['damage','missile']],
 BaronNashor:[['damage','missile'],['damage','control'],['shield'],['damage','control']],
 Ryze:[['damage','missile'],['damage','control'],['damage','missile'],['dash']],
 DrMundo:[['damage','missile'],['damage','buff','selfAoE'],['buff','damage'],['buff']],
 ElderDragon:[['damage','selfAoE'],['damage','shield','control','selfAoE'],['damage','dash'],['damage','true']],
 Ashe:[['buff','damage'],['damage','missile'],[],['damage','control','missile']],
 Lux:[['damage','control','missile'],['shield'],['damage','missile'],['damage']],
 Ahri:[['damage','missile'],['damage'],['damage','control','missile'],['damage','dash','buff']],
 Ezreal:[['damage','missile'],['damage','missile'],['damage','dash'],['damage','missile']],
 Garen:[['buff','damage'],['shield','buff'],['damage','buff','selfAoE'],['damage','true']],
 Jinx:[['buff','damage'],['damage','missile'],['damage','control'],['damage','missile']],
 Yasuo:[['damage','missile','control'],['terrain'],['damage','dash'],['damage','dash','control']],
 Sett:[['buff','damage'],['damage','shield','selfAoE'],['damage','control'],['damage','control','dash']],
 Darius:[['damage','selfAoE'],['buff','damage'],['control'],['damage','true','dash']],
};
export const BOUND_AUGMENTS=Object.freeze({ARAM_RabbleRousing:'any',ARAM_SustainingStrike:'damage',DoubleDefense:'shield',ARAM_Terror:'cooldown',ARAM_Quickstep:'noDash',Bonk:'damage',Overloaded:'any',WardingWeapon:'nonTrueDamage',DarkWind:'control',ItsGoTime:'activeBuff',KeepGoing:'buff',LittleExtraHelp:'buff',Missile_Split:'missile',SpellVolley:'missile',ARAM_Multishot:'missile',SnapBack:'cooldown',VoidDash:'dash',Terraind:'terrain',SpecializedEmpowerment:'damage',ARAM_SpecializedRecursion:'damageHaste'});
export const isBoundAugment=id=>Object.prototype.hasOwnProperty.call(BOUND_AUGMENTS,id);
export function bindingOptions(u,id){if(u.hero?.id==='Karthus'&&id==='Overloaded')return[0,1,2,3];const requirement=BOUND_AUGMENTS[id],spells=CAPABILITIES[u.hero?.id];if(requirement==='activeBuff')return activeBuffSlots(u);if(!requirement||!spells)return[];return spells.flatMap((tags,i)=>requirement==='damageHaste'&&tags.includes('damage')&&baseCooldown(u,i)>0&&!(u.hero?.id==='Yasuo'&&[0,2].includes(i))||requirement==='cooldown'&&baseCooldown(u,i)>0||requirement==='any'||requirement==='noDash'&&!tags.includes('dash')||requirement==='nonTrueDamage'&&tags.includes('damage')&&!tags.includes('true')||tags.includes(requirement)?[i]:[]);}
export function resolveBinding(u,id,index){if(!isBoundAugment(id))return index===undefined?null:false;const choices=bindingOptions(u,id);if(index===undefined)return choices[0]??false;return Number.isInteger(index)&&choices.includes(index)?index:false;}
export function boundSlot(u,id){const index=u.augmentBindings?.[id];return Number.isInteger(index)?index:null;}
export const boundTo=(u,id,index)=>u.augments?.includes(id)&&boundSlot(u,id)===index;
const ACTIVE_BUFFS={
 Jax:{1:(u,t)=>u.jaxWUntil>t,2:(u,t)=>u.jaxEUntil>t,3:(u,t)=>u.jaxRUntil>t},
 Malphite:{1:(u,t)=>u.malphiteWUntil>t},RiftHerald:{2:(u,t)=>u.heraldGazeUntil>t},
 Ashe:{0:(u,t)=>u.asheQ>0},Ahri:{3:(u,t)=>u.ahriRUntil>t&&u.ahriCharges>0},
 Garen:{0:u=>u.garenQ>0,1:u=>u.garenDR>0,2:u=>u.spin>0},
 Jinx:{0:u=>!!u.jinxRockets},Sett:{0:(u,t)=>u.settQHits>0&&u.settQUntil>t},Darius:{1:(u,t)=>u.dariusW&&u.dariusWUntil>t},
 Teemo:{1:(u,t)=>u.teemoWUntil>t},MasterYi:{1:(u,t)=>u.yiMeditateUntil>t,2:(u,t)=>u.yiEUntil>t,3:(u,t)=>u.yiRUntil>t},
 Chogath:{2:(u,t)=>u.choEUntil>t&&u.choEAttacks>0},
 DrMundo:{1:(u,t)=>u.mundoWUntil>t,2:(u,t)=>u.mundoEUntil>t,3:(u,t)=>u.mundoRUntil>t},
 Tryndamere:{3:(u,t)=>u.tryndRUntil>t},MissFortune:{1:(u,t)=>u.mfWUntil>t},
};
export function activeBoundSkill(u,index,time){const hero=u.hero?.id==='Sylas'&&index===3?u.sylasBorrowedR?.id:u.hero?.id;return !!ACTIVE_BUFFS[hero]?.[index]?.(u,time);}
export function activeBuffSlots(u){return u.hero?.id==='Sylas'?[3]:Object.keys(ACTIVE_BUFFS[u.hero?.id]||{}).map(Number);}
export function bindingLabel(u,id){const index=boundSlot(u,id);return index===null?'':`${'QWER'[index]} · ${u.hero?.skills?.[index]?.[0]||''}`;}

function baseCooldown(u,i){const c=COMBAT_DATA[u.hero?.id],s=c?.spells?.[c.abilityNames[i]]?.data;return s?.Cooldown?.values?.[u.spellRanks?.[i]||1]??s?.cooldownTime?.[u.spellRanks?.[i]||1]??(u.hero?.id==='Lux'&&i===0?10:0);}
