import {isBoundAugment,bindingOptions} from './augment-bindings.js';
// Runtime capability boundaries, not a claim that these are Riot champion-exclusive augments.
export const AUGMENT_REQUIREMENTS=Object.freeze({
 DontChangeTheChannel:{heroes:['MasterYi','MissFortune','Jhin','Sylas'],reason:'需要当前已接入的引导技能；塞拉斯仅窃取烬或厄运小姐大招时生效。'},
 ARAM_Cruelty:{heroes:['Ashe','Lux','Ahri','Jinx','Yasuo','Sett','Darius','ElderDragon','Ryze','Malphite','RiftHerald','BaronNashor','Jhin','Chogath','Sylas','Veigar'],reason:'当前英雄没有已接入的定身技能，减速、沉默和致盲不能触发残忍。'},
 ARAM_StackosaurusRex:{heroes:['Veigar','Chogath','Sylas'],reason:'需要可获得永久技能层数的英雄；塞拉斯仅窃取科加斯盛宴时生效。'},
 ARAM_SpinToWin:{heroes:['Garen'],reason:'旋转至胜当前仅实现了盖伦 E 的旋转强化。'},
 ARAM_Dashing:{heroes:['Ahri','Ezreal'],reason:'这项位移急速当前仅接入阿狸 R 和伊泽瑞尔 E。'},
 ARAM_MindtoMatter:{mana:true,reason:'由心及物需要英雄拥有法力值。'},
 ARAM_Earthwake:{mobility:true,reason:'这项强化需要当前已接入的位移技能或闪现。'},
});
export function augmentRequirementReason(u,id){if(id==='ARAM_FeyMagic'&&(['Ryze','DrMundo','MasterYi','Tryndamere'].includes(u.hero?.id)||u.augments?.includes('ARAM_BacktoBasics')))return '需要可造成伤害的终极技能。';if(id==='ARAM_BacktoBasics'&&u.augments?.includes('ARAM_FeyMagic'))return '精怪魔法需要保留终极技能。';if(id==='ARAM_Flashbang'&&!(u.summoners||['flash','heal']).some(s=>s==='flash'||s==='flash2'))return '闪光弹需要携带闪现或第二个闪现。';if(u.hero?.id==='Ashe'&&id==='Overloaded')return '寒冰射手不能选择超负荷。';if(isBoundAugment(id)&&!bindingOptions(u,id).length)return '当前英雄没有可绑定的兼容技能。';if(id==='ARAM_ADAPt'&&u.augments?.includes('ARAM_escAPADe')||id==='ARAM_escAPADe'&&u.augments?.includes('ARAM_ADAPt'))return '两种属性转换不能同时选择。';if(id==='ARAM_Juiced'&&u.noMana)return '注魔需要法力资源。';if(id==='ARAM_Flashy'&&!(u.summoners||['flash','heal']).includes('flash'))return '闪现向前需要携带闪现。';if(u.hero?.id==='Ashe'&&['ARAM_SoulSiphon','CriticalRhythm','CriticalMissile'].includes(id))return '寒冰的暴击已转换为冰霜效果，当前不触发这项伤害暴击强化。';if(u.hero?.id==='Yasuo'&&['ARAM_BreadAndButter','ARAM_BreadAndCheese'].includes(id))return '亚索Q不受技能急速缩减，E使用固定施放间隔。';const r=AUGMENT_REQUIREMENTS[id];if(!r)return'';if(r.heroes&&!r.heroes.includes(u.hero?.id))return r.reason;if(r.mana&&(u.noMana||!(u.maxMp>0)))return r.reason;if(r.mobility&&!['Ahri','Ezreal'].includes(u.hero?.id)&&!(u.summoners||['flash','heal']).includes('flash'))return r.reason;return'';}
