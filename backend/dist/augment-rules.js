import {isBotUnit} from './bot-haste.js';
import {lightEmUpHit} from './augment-light-em-up.js';
import {feyAfterDamage} from './augment-fey-magic.js';
import {surgeOnCast,updateSurgeField,surgeAfterDamage} from './augment-surge-field.js';
import {updateChannelShield} from './augment-channel-shield.js';
import {updateSonata} from './augment-sonata.js';
import {crueltyControl} from './augment-cruelty.js';
import {updateBoomerangAugment} from './augment-boomerang.js';
import {updateFirefox} from './augment-firefox.js';
import {updateDivineIntervention} from './augment-divine-intervention.js';
import {searingDawnHit} from './augment-searing-dawn.js';
import {deliverQuestReward} from './augment-item-quests.js';
import {updateBrushAugments,brushDamageMultiplier} from './augment-brush.js';
import {tankEngineTakedown,tankEngineMultiplier} from './tank-engine.js';
import {fiveStats,fiveAfterDamage,updateFive} from './augment-five.js';
import {modifierOnCast,modifierAfterDamage,modifierDamage,modifierHaste} from './augment-spell-modifiers.js';
import {boundOnCast,boundAfterDamage,updateBoundEffects} from './augment-bound-effects.js';
import {healUnit,shieldUnit,supportOmnivamp} from './combat-support.js';
import {coreStatBonuses,coreCooldown,coreOnCast,coreAfterDamage,coreTakedown,updateCoreUnit} from './augment-core.js';
import {expansionStats,expansionAfterDamage,expansionTakedown,updateExpansion} from './augment-expansion.js';
import {updateAugmentWindow} from './augment-window.js';
import {augmentRequirementReason} from './augment-eligibility.js';
import {AUGMENTS} from './augment-catalog.js?v=hextech-aram-3';
const BY_ID=new Map(AUGMENTS.map(a=>[a.id,a]));
export const AUGMENT_MILESTONES=[3,7,11,15];
export const augmentById=id=>BY_ID.get(id);
export const augmentValue=(id,key)=>Number(BY_ID.get(id)?.values?.[key]||0);
export const augmentAttackDamage=u=>hasAugment(u,'ARAM_Marksmage')?(u.ap||0)*augmentValue('ARAM_Marksmage','APRatio'):0;
export const augmentEligibilityReason=(u,id)=>BY_ID.has(id)?augmentRequirementReason(u,id):'该强化未接入当前版本。';
export const isAugmentEligible=(u,id)=>BY_ID.has(id)&&!augmentRequirementReason(u,id);
export const hasAugment=(u,id)=>u.augments?.includes(id);
const mage=u=>['Lux','Ahri'].includes(u.hero?.id),melee=u=>(u.nativeRange||u.hero?.range||500)<300;
const roleScore=(a,u)=>{const id=a.id;let n=1;if(mage(u)&&/Witch|Jeweled|Infernal|Master|MindtoMatter|CritNCast/.test(id))n+=5;if(!mage(u)&&/Blunt|Deft|Heavy|FanTheHammer|ItsCritical|TapDancer|Scoped|Scopiest/.test(id))n+=5;if(melee(u)&&/Goliath|Perseverance|TankEngine|Courage|Goredrink|SpinToWin/.test(id))n+=5;if(u.hero?.id==='Garen'&&id==='ARAM_SpinToWin')n+=12;if(['Ashe','Jinx'].includes(u.hero?.id)&&/FanTheHammer|Jeweled|Deft|ItsCritical|Scoped/.test(id))n+=7;if(u.hero?.id==='Ezreal'&&/MysticPunch|Jeweled|InfernalConduit|Scoped/.test(id))n+=7;return n;};
function candidates(u,round){const taken=new Set(u.augments||[]),allowed=round===0?[0,1]:round===1?[0,1,2]:round===2?[1,2]:[0,1,2];return AUGMENTS.filter(a=>allowed.includes(a.rarity)&&!taken.has(a.id)&&isAugmentEligible(u,a.id));}
function sample(list,u,random,exclude=new Set()){const pool=list.filter(a=>!exclude.has(a.id));let total=pool.reduce((n,a)=>n+roleScore(a,u),0),roll=random()*total;for(const a of pool){roll-=roleScore(a,u);if(roll<=0)return a;}return pool.at(-1);}
export function offerAugments(u,random=Math.random){if(isBotUnit(u)){u.augmentOffers=[];return u.augmentOffers;}const round=Math.min(3,u.augmentRound||0),pool=candidates(u,round),chosen=[],ids=new Set();if(round>=2){const prism=pool.filter(a=>a.rarity===2),a=sample(prism,u,random,ids);if(a){chosen.push(a);ids.add(a.id);}}while(chosen.length<3){const a=sample(pool,u,random,ids);if(!a)break;chosen.push(a);ids.add(a.id);}u.augmentOffers=chosen.map(a=>a.id);return u.augmentOffers;}
export function repairAugmentOffers(u,random=Math.random){if(!u.augmentOffers?.length)return false;const old=u.augmentOffers,pool=candidates(u,Math.min(3,u.augmentRound||0)),reserved=new Set(old.filter(id=>isAugmentEligible(u,id)&&!u.augments?.includes(id))),seen=new Set();let changed=false;u.augmentOffers=old.map(id=>{if(isAugmentEligible(u,id)&&!u.augments?.includes(id)&&!seen.has(id)){seen.add(id);return id;}changed=true;const a=sample(pool,u,random,new Set([...reserved,...seen]));if(a){seen.add(a.id);return a.id;}return null;}).filter(Boolean);return changed;}
export function initAugments(u,random=Math.random){if(isBotUnit(u)){u.augments=[];u.augmentOffers=[];u.augmentRound=0;u.augmentRerolls=0;return;}u.augments??=[];u.augmentRound=u.augments.length;u.augmentRerolls=-1;u.augmentOffers??=[];if(!u.augmentOffers.length&&u.augmentRound===0)offerAugments(u,random);else repairAugmentOffers(u,random);}
export function chooseAugment(u,id){if(isBotUnit(u))return false;if(!isAugmentEligible(u,id)||!u.augmentOffers?.includes(id)||u.augments.includes(id)||u.augments.length>=4)return false;u.augments.push(id);u.augmentOffers=[];u.augmentRound=u.augments.length;return true;}
export function rerollAugment(u,index,random=Math.random){if(!Number.isInteger(index)||index<0||index>2)return false;repairAugmentOffers(u,random);if(u.augmentRerolls===0||!u.augmentOffers?.[index])return false;const pool=candidates(u,Math.min(3,u.augmentRound||0)),exclude=new Set([...u.augmentOffers,...u.augments]),next=sample(pool,u,random,exclude);if(!next)return false;u.augmentOffers[index]=next.id;if(u.augmentRerolls>0)u.augmentRerolls--;return true;}
export function augmentStatBonuses(u){const b={hpMultiplier:1,hp:0,adMultiplier:1,ad:0,apMultiplier:1,ap:0,attackSpeed:0,crit:0,abilityHaste:0,movePercent:0,range:0,omnivamp:0,healShield:0,percentPen:0,ultimateHaste:0,snowballHaste:0};
 if(hasAugment(u,'ARAM_Recursion'))b.abilityHaste+=augmentValue('ARAM_Recursion','AbilityHaste');if(hasAugment(u,'ARAM_CelestialBody'))b.hp+=augmentValue('ARAM_CelestialBody','Health');
 if(hasAugment(u,'ARAM_BluntForce'))b.adMultiplier*=1.2;if(hasAugment(u,'ARAM_WitchfulThinking'))b.ap+=70;if(hasAugment(u,'ARAM_Deft'))b.attackSpeed+=.6;if(hasAugment(u,'ARAM_Goredrink'))b.omnivamp+=.15;if(hasAugment(u,'Vampirism'))b.omnivamp+=.25;if(hasAugment(u,'ARAM_FirstAidKit'))b.healShield+=.2;if(hasAugment(u,'ARAM_ItsCritical'))b.crit+=.5;if(hasAugment(u,'ARAM_JeweledGauntlet'))b.crit+=.25;
 if(hasAugment(u,'ARAM_Goliath')){b.hpMultiplier*=1.35;b.adMultiplier*=1.15;b.apMultiplier*=1.15;}if(hasAugment(u,'GlassCannon'))b.hpMultiplier*=.7;if(hasAugment(u,'ARAM_BacktoBasics'))b.abilityHaste+=70;if(hasAugment(u,'InfiniteRecursion'))b.abilityHaste+=60+3*(u.augmentTakedowns||0);if(hasAugment(u,'CritNCast'))b.abilityHaste+=(u.crit||0)*40;
 if(hasAugment(u,'ARAM_ScopedWeapons'))b.range+=melee(u)?75:50;if(hasAugment(u,'ARAM_ScopiestWeapons'))b.range+=melee(u)?250:150;if(hasAugment(u,'ARAM_GiantSlayer'))b.movePercent+=.2;if(hasAugment(u,'ARAM_ThreadtheNeedle'))b.percentPen=.18;if(hasAugment(u,'SnowballUpgrade'))b.snowballHaste=50;if(hasAugment(u,'UltimateAwakening'))b.ultimateHaste+=30;
 if(hasAugment(u,'ARAM_MindtoMatter'))b.hp+=Math.min(99999,(u.maxMp||0)*.5);if(hasAugment(u,'ARAM_TankEngine'))b.hpMultiplier*=tankEngineMultiplier(u);if(hasAugment(u,'SoulEater'))b.hp+=u.augmentSoulHp||0;b.ad+=u.augmentTempAD||0;b.ap+=u.augmentTempAP||0;return fiveStats(u,coreStatBonuses(u,expansionStats(u,b)));}
export function augmentCooldownHaste(u,index){let n=index===3?(u.augmentUltimateHaste||0):u.augmentBasicHaste||0;const bread=['ARAM_BreadAndButter','ARAM_BreadAndJam','ARAM_BreadAndCheese'][index];if(bread&&hasAugment(u,bread))n+=augmentValue(bread,['QAbilityHaste','WAbilityHaste','EAbilityHaste'][index]);if(hasAugment(u,'ARAM_Dashing')&&((u.hero?.id==='Ahri'&&index===3)||(u.hero?.id==='Ezreal'&&index===2)))n+=175;if(hasAugment(u,'ARAM_SpinToWin')&&u.hero?.id==='Garen'&&index===2)n+=30;return n+modifierHaste(u,index);}
export const combatCooldownMultiplier=(u,index)=>coreCooldown(u,index)??100/(100+(u.abilityHaste||0)+augmentCooldownHaste(u,index));
export function canCastWithAugments(u,index){return !(index===3&&hasAugment(u,'ARAM_BacktoBasics'));}
export function augmentModifyDamage(game,v,damage,source,basic,meta={}){if(v?.augmentInvulnerableUntil>game.time||v?.divineInvulnerableUntil>game.time)return 0;if(!source?.hero)return damage;damage*=brushDamageMultiplier(game,source);if(hasAugment(source,'ARAM_CelestialBody'))damage*=1-augmentValue('ARAM_CelestialBody','DamageReduction');if(meta.augmentProc)return damage;let m=modifierDamage(source,meta);if(hasAugment(source,'ARAM_BacktoBasics')&&!basic&&meta.state!=='r')m*=1.35;if(hasAugment(source,'ARAM_SpinToWin')&&source.hero.id==='Garen'&&meta.state==='e')m*=1.3;if(hasAugment(source,'ARAM_GiantSlayer')&&v.kind==='hero')m*=1.1;if(source.augmentSymphonyStacks)m*=1+source.augmentSymphonyStacks*.0075;if(hasAugment(source,'ARAM_JeweledGauntlet')&&!basic&&game.random()<Math.min(1,source.crit||0)){m*=1.45;meta.critical=true;}return damage*m;}
const heal=(g,u,n,options={})=>healUnit(g,u,u,n,options);
const trigger=(u,key,now,cd)=>{u.augmentTimers??={};if((u.augmentTimers[key]||0)>now)return false;u.augmentTimers[key]=now+cd;return true;};
const queue=(g,u,v,amount,type,name,delay=.001)=>{if(!v.alive||amount<=0)return;g.combatTimers.push({u,time:g.time+delay,action:()=>{if(v.alive){g.hurt(v,amount,u,0,0,type,false,{augmentProc:true,periodic:name==='炼狱导管',state:'augment'});g.event(`${name} · ${Math.round(amount)}`);}}});};
export function augmentAfterDamage(g,{v,source,dealt,hitDamage,rawDamage,damageType,basic,meta,stun=0,slow=0}){lightEmUpHit(g,{source,v,basic,hitDamage,meta});feyAfterDamage(g,{source,target:v,hitDamage,meta});surgeAfterDamage(g,{source,v,dealt,meta});crueltyControl(g,source,v,{...meta,immobilize:Math.max(stun,meta.immobilize||0)});searingDawnHit(g,{source,target:v,basic,meta,hitDamage});expansionAfterDamage(g,{v,source,dealt,basic,meta});coreAfterDamage(g,{v,source,dealt,basic,meta,stun,slow});boundAfterDamage(g,{v,source,dealt,rawDamage,damageType,basic,meta});modifierAfterDamage(g,{v,source,dealt,hitDamage,basic,meta});fiveAfterDamage(g,{v,source,dealt,basic,meta});if(!source?.hero||meta.augmentProc||dealt<=0)return;if(v.kind==='hero'){source.augmentCombatUntil=g.time+5;source.augmentLastCombat=g.time;v.augmentLastDamaged=g.time;}
 if(source.augmentOmnivamp||supportOmnivamp(source))heal(g,source,dealt*((source.augmentOmnivamp||0)+supportOmnivamp(source)),{kind:'omnivamp'});
 if(v.kind!=='hero')return;
 if(hasAugment(source,'ARAM_HeavyHitter')&&basic)queue(g,source,v,source.maxHp*.035,'physical','重量级打击手');
 if(hasAugment(source,'GlassCannon'))queue(g,source,v,dealt*(melee(source)?.25:.15),'true','玻璃大炮');
 if(hasAugment(source,'ARAM_InfernalSoul')&&trigger(source,'infernal',g.time,3))queue(g,source,v,45+source.level*3,'magic','炼狱龙魂');
 if(hasAugment(source,'ARAM_OceanSoul')&&trigger(source,'ocean',g.time,5)){heal(g,source,source.maxHp*.025);if(!source.noMana)source.mp=Math.min(source.maxMp,source.mp+source.maxMp*.025);}
 if(hasAugment(source,'ARAM_MysticPunch')&&basic)source.skills=source.skills.map((c,i)=>i<4?Math.max(0,c-1.25):c);
 if(hasAugment(source,'ARAM_FanTheHammer')&&basic&&trigger(source,'fan',g.time,1))queue(g,source,v,dealt*.3,'physical','连拨击锤');
 if(hasAugment(source,'ARAM_InfernalConduit')&&!basic&&trigger(source,'conduit:'+v.id,g.time,1))for(let i=1;i<=3;i++)queue(g,source,v,12+source.level*.6,'magic','炼狱导管',i*.5);
 if(hasAugment(source,'ARAM_MasterofDuality')){if(basic)source.augmentTempAP=Math.min(80,(source.augmentTempAP||0)+5);else source.augmentTempAD=Math.min(48,(source.augmentTempAD||0)+3);source.augmentDualityUntil=g.time+5;}
 if(hasAugment(source,'ARAM_SymphonyofWar')){source.augmentSymphonyStacks=Math.min(12,(source.augmentSymphonyStacks||0)+(basic?1:2));source.augmentSymphonyUntil=g.time+5;if(basic){source.augmentTempoStacks=Math.min(6,(source.augmentTempoStacks||0)+1);source.augmentTempoUntil=g.time+6;}}
 if(hasAugment(source,'ARAM_TapDancer')&&basic){source.augmentTapStacks=Math.min(10,(source.augmentTapStacks||0)+1);source.augmentTapUntil=g.time+5;}
 const immobilize=stun||meta.immobilize;if(immobilize&&hasAugment(source,'ARAM_CourageoftheColossus')&&trigger(source,'colossus',g.time,5))shieldUnit(g,source,source,source.maxHp*.04,3,{kind:'augment'});
 if(immobilize&&hasAugment(source,'SoulEater')&&trigger(source,'souleater:'+v.id,g.time,5)){source.augmentSoulHp=(source.augmentSoulHp||0)+20;source.maxHp+=20;source.hp+=20;}
 if(hasAugment(source,'ARAM_ThreadtheNeedle')){v.augmentShredUntil=g.time+5;v.augmentShred=.18;}
}
export function augmentOnCast(g,u,index,aim,from){surgeOnCast(g,u,index);modifierOnCast(g,u,index,aim,from);coreOnCast(g,u,index);boundOnCast(g,u,index,aim);if(index===3){if(hasAugment(u,'UltimateAwakening')&&trigger(u,'awakening',g.time,20)){for(let i=0;i<3;i++)u.skills[i]=0;u.augmentBasicHaste=300;u.augmentBasicHasteUntil=g.time+15;}if(hasAugment(u,'ARAM_UltimateRevolution')&&trigger(u,'ultreset',g.time,75))u.skills[3]=0;if(hasAugment(u,'ARAM_CantTouchThis')&&trigger(u,'canttouch',g.time,8))u.augmentInvulnerableUntil=g.time+2;}
 const dash=index===-1||(u.hero?.id==='Ahri'&&index===3)||(u.hero?.id==='Ezreal'&&index===2);if(dash&&hasAugment(u,'ARAM_Earthwake')){const x=aim.x,y=aim.y;g.combatTimers.push({u,time:g.time+.75,action:()=>{for(const v of g.enemies(u))if(v.kind==='hero'&&Math.hypot(v.x-x,v.y-y)<150+v.radius)g.hurt(v,70+10*u.level+(u.ap||0)*.6,u,0,1,'physical',false,{augmentProc:true,state:'augment'});}});}}
export function augmentOnKill(g,u,v){expansionTakedown(g,u);coreTakedown(g,u,v);if(!u?.hero||v.kind!=='hero')return;u.augmentTakedowns=(u.augmentTakedowns||0)+1;tankEngineTakedown(g,u,v);if(hasAugment(u,'InfiniteRecursion')){u.abilityHaste+=3;u.haste=100/(100+u.abilityHaste);}}
export function updateDerivedAugmentStats(g,u){
 const haste=hasAugment(u,'ARAM_Eureka')?(u.ap||0)*augmentValue('ARAM_Eureka','APToHasteConversion'):0;
 u.abilityHaste=(u.abilityHaste||0)-(u.augmentEurekaHaste||0)+haste;u.augmentEurekaHaste=haste;u.haste=100/(100+u.abilityHaste);
 const move=hasAugment(u,'ARAM_WithHaste')?u.abilityHaste*augmentValue('ARAM_WithHaste','AbilityHasteToMSConversion'):0;
 u.speed+=(move-(u.augmentHasteMoveNative||0))/(g.mapConfig?.scale||2)*(u.augmentMoveStatMultiplier??1);u.augmentHasteMoveNative=move;
}
export function updateAugments(g,u,dt){if(!u.hero)return;deliverQuestReward(g,u);updateDivineIntervention(g,u);updateBrushAugments(g,u);updateAugmentWindow(g,u);updateDerivedAugmentStats(g,u);if(u.augmentOffers?.some(id=>!isAugmentEligible(u,id)))repairAugmentOffers(u,g.random);u.augmentCurrentTime=g.time;if(!u.augmentOffers?.length&&(u.augmentRound||0)<AUGMENT_MILESTONES.length&&u.level>=AUGMENT_MILESTONES[u.augmentRound])offerAugments(u,g.random);if(u.augmentBasicHasteUntil<=g.time)u.augmentBasicHaste=0;if(u.augmentDualityUntil<=g.time){u.augmentTempAD=0;u.augmentTempAP=0;}if(u.augmentSymphonyUntil<=g.time)u.augmentSymphonyStacks=0;if(u.augmentTempoUntil<=g.time)u.augmentTempoStacks=0;if(u.augmentTapUntil<=g.time)u.augmentTapStacks=0;u.augmentAttackSpeed=(u.augmentTempoStacks||0)*.1+(u.augmentTapStacks||0)*.05;u.augmentMoveMultiplier=1+(u.augmentTapStacks||0)*.03;if(hasAugment(u,'ARAM_Perseverance'))heal(g,u,(u.hp/u.maxHp<.25?20:10)*dt,{regen:true});if(hasAugment(u,'ARAM_MountainSoul')&&g.time-(u.augmentLastDamaged??-99)>8){if((u.shield||0)<u.maxHp*.1)shieldUnit(g,u,u,u.maxHp*.1-(u.shield||0),9,{raw:true,key:'mountain'});}if(hasAugment(u,'ARAM_Homeguard')&&g.time-(u.augmentLastDamaged??-99)>6)u.augmentMoveMultiplier*=2;updateExpansion(g,u,dt);updateCoreUnit(g,u,dt);updateBoundEffects(g,u);updateFive(g,u);updateFirefox(g,u);updateBoomerangAugment(g,u);updateSonata(g,u);updateChannelShield(g,u,dt);updateSurgeField(g,u);}
