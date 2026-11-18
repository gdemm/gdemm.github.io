import {healUnit,shieldUnit} from './combat-support.js';
// Shared, authoritative primitives used by the full-catalogue rollout.
// Unsupported catalogue records are deliberately not eligible until their hooks exist.
import {AUGMENTS} from './augment-catalog.js';
import {COMBAT_DATA} from './combat-data.js';
const byId=new Map(AUGMENTS.map(a=>[a.id,a]));
export const owns=(u,id)=>!!u?.augments?.includes(id);
export const av=(id,key,fallback=0)=>Number(byId.get(id)?.values?.[key]??fallback);
const scale=g=>g.mapConfig?.scale||2,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const refresh=(g,u)=>g.refreshAugmentStats?.(u);
const state=u=>u.augmentCore??={timers:{},shields:[],stacks:{}};
const gate=(g,u,key,cd)=>{const s=state(u);if((s.timers[key]??-Infinity)>g.time)return false;s.timers[key]=g.time+cd;return true;};
const enemies=(g,u,at=u,r=Infinity)=>g.units.filter(v=>v.alive&&v.kind==='hero'&&v.team!==u.team&&!u.farmOnly&&g.canHit(v)&&dist(v,at)*scale(g)<=r+v.radius*scale(g));
const proc=(g,u,v,n,type='magic',slow=0,periodic=false)=>{if(v.alive&&n>0)g.hurt(v,n,u,0,slow,type,false,{augmentProc:true,periodic,state:'augment'});};
function later(g,u,delay,action){g.augmentJobs??=[];g.augmentJobs.push({at:g.time+delay,source:u,action});}
function addShield(g,u,key,n,duration=1e9){if(!u.alive||!(n>0))return;const s=state(u),old=s.shields.find(b=>b.key===key);if(old){u.shield=Math.max(0,u.shield-old.remaining);s.shields=s.shields.filter(b=>b!==old);}n=shieldUnit(g,u,u,n,duration,{kind:'augment',externalLifetime:true});s.shields.push({key,remaining:n,initial:n,start:g.time,until:g.time+duration});u.shieldTime=Math.max(u.shieldTime||0,duration+.1);g.fx?.('ring',u.x,u.y,'#b9dfeb',60,.4);}
export function consumeCoreShields(g,u,n){const s=u.augmentCore;if(!s)return;for(const b of s.shields){const spent=Math.min(n,b.remaining);b.remaining-=spent;n-=spent;if(b.key==='brain'&&b.remaining<=0&&!s.timers.brain)s.timers.brain=g.time+70;if(n<=0)break;}}
export function coreStatBonuses(u,b){const s=state(u),now=u.augmentCurrentTime||0;
 if(owns(u,'ARAM_MadScientist')){if(s.form==='large'){b.hpMultiplier*=1+av('ARAM_MadScientist','HealthAmp');b.adMultiplier*=1+av('ARAM_MadScientist','ADAmp');b.apMultiplier*=1+av('ARAM_MadScientist','APAmp');}else if(s.form==='small'){b.movePercent+=av('ARAM_MadScientist','MovespeedAmp');b.abilityHaste+=av('ARAM_MadScientist','Haste');}}
 if(owns(u,'SkipTheBasics'))b.abilityHaste+=av('SkipTheBasics','Haste');
 if(owns(u,'ShrinkEngine')){b.abilityHaste+=(s.stacks.shrink||0)*av('ShrinkEngine','HastePerStack');b.movePercent+=(s.stacks.shrink||0)*av('ShrinkEngine','MoveSpeedAmpPerStack');}
 if(owns(u,'ARAM_SlapAround')){const af=(s.stacks.slap||0)*av('ARAM_SlapAround','AdaptiveForce');if(['Lux','Ahri'].includes(u.hero?.id))b.ap+=af;else b.ad+=af*.6;}
 b.resists=(owns(u,'ARAM_OutlawsGrit')&&s.gritUntil>now?(s.stacks.grit||0)*av('ARAM_OutlawsGrit','ResistsPerStack'):0)+(owns(u,'Adamant')&&s.adamantUntil>now?(s.stacks.adamant||0)*av('Adamant','Resists'):0);
 for(const id of ['GoldenSnowball','BiggestSnowballEver'])if(owns(u,id))b.snowballHaste+=av(id,'Haste');if(owns(u,'ARAM_Snowday'))b.snowballHaste+=av('ARAM_Snowday','AH');
 return b;
}
export function corePostStats(g,u){const s=state(u),base=u.hero.damage+Math.max(0,u.level-3)*4;
 if(owns(u,'ARAM_ADAPt')){u.ap=(u.ap+Math.max(0,u.damage-base)*av('ARAM_ADAPt','ConversionRate'))*(1+av('ARAM_ADAPt','APAmp'));u.damage=base;}
 else if(owns(u,'ARAM_escAPADe')){u.damage=(u.damage+u.ap*av('ARAM_escAPADe','ConversionRate'))*(1+av('ARAM_escAPADe','ADAmp'));u.ap=0;}u.power=1+u.ap/150;
}
export function coreSizeStats(g,u){const s=state(u);const baseSize=u.augmentSize||1;u.augmentCoreBaseSize=baseSize*(owns(u,'ARAM_MadScientist')?(s.form==='large'?1+av('ARAM_MadScientist','SizeAmp'):1-av('ARAM_MadScientist','SizeAmp')):1)*(owns(u,'ShrinkEngine')?Math.max(.2,1-(s.stacks.shrink||0)*av('ShrinkEngine','SizeReductionPerStack')):1);u.augmentSize=u.augmentCoreBaseSize;
}
export function coreChoice(g,u,id){const s=state(u);if(id==='ARAM_MadScientist'){s.form=g.random()<.5?'large':'small';s.life=u.lifeSerial||0;}if(id==='ARAM_BigBrain')s.brainPending=true;if(['GoldenSnowball','ARAM_Snowday','BiggestSnowballEver'].includes(id)&&!u.summoners?.includes('mark')){u.summoners??=['flash','heal'];u.summoners[1]='mark';}if(id==='Flash2'){u.summoners=['flash','flash2'];u.skills[4]=u.skills[5]=0;}if(id==='ARAM_Flashy'){s.flashCharges=3;s.flashRecharge=0;}}
export function coreCooldown(u,index){return owns(u,'SkipTheBasics')?(index===3?100/(100+(u.abilityHaste||0)*1.5):1):null;}
export function originalCooldown(u,index){const c=COMBAT_DATA[u.hero?.id],spell=c?.spells?.[c?.abilityNames?.[index]]?.data,rank=u.spellRanks?.[index]||1;return spell?.Cooldown?.values?.[rank]??spell?.cooldownTime?.[rank]??(u.hero?.id==='Lux'&&index===0?10:0);}
export function coreOnCast(g,u,index){const s=state(u);if(index<0)return;
 if(owns(u,'ARAM_Archmage')){const pool=[0,1,2,3].filter(i=>i!==index&&u.skills[i]>0&&!(u.hero.id==='Yasuo'&&i===2));if(pool.length){const i=pool[Math.min(pool.length-1,Math.floor(g.random()*pool.length))];u.skills[i]=Math.max(0,u.skills[i]-originalCooldown(u,index)*av('ARAM_Archmage','RefundPercent'));}}
 if(index===3){if(owns(u,'FinalForm')&&gate(g,u,'final',av('FinalForm','Cooldown'))){s.finalUntil=g.time+av('FinalForm','AugDuration');addShield(g,u,'final',u.maxHp*av('FinalForm','MaxHealthShield'),av('FinalForm','AugDuration'));}
 if(owns(u,'ARAM_ItsKillingTime')&&gate(g,u,'killing',av('ARAM_ItsKillingTime','Cooldown'))){const targets=enemies(g,u).map(v=>({v,n:0}));s.killing={until:g.time+av('ARAM_ItsKillingTime','MarkDuration'),targets};}}
}
export function coreMobility(g,u){const s=state(u);if(!u.alive)return;
 if(owns(u,'ARAM_OutlawsGrit')){s.stacks.grit=Math.min(av('ARAM_OutlawsGrit','MaxStacks'),(s.gritUntil>g.time?s.stacks.grit||0:0)+1);s.gritUntil=g.time+av('ARAM_OutlawsGrit','Refresh');refresh(g,u);}
 if(owns(u,'ARAM_ShadowRunner'))s.shadowUntil=g.time+av('ARAM_ShadowRunner','BuffDuration');
 if(owns(u,'SwiftAndSafe')&&gate(g,u,'swift',av('SwiftAndSafe','Cooldown')))addShield(g,u,'swift',(u.ap||0)*av('SwiftAndSafe','APPercent')+u.damage*av('SwiftAndSafe','ADPercent'),av('SwiftAndSafe','ShieldDuration'));
}
export function coreControl(g,u,v,meta={}){if(!u?.hero||!u.alive||v.kind!=='hero'||u.team===v.team||u.farmOnly||v.unstoppableUntil>g.time)return;g.onAugmentControl?.(u,v,meta);const s=state(u),token=u.itemEffects?.castTokens?.[meta.state?.[0]]??meta.state??'control';
 for(const [id,key] of [['ARAM_SlapAround','slap'],['Adamant','adamant']])if(owns(u,id)&&gate(g,u,key+':'+token,av(id,'SpellIDCD'))){s.stacks[key]=Math.min(key==='slap'?Infinity:av(id,'MaxStacks'),(key==='adamant'&&s.adamantUntil<=g.time?0:s.stacks[key]||0)+1);if(key==='adamant')s.adamantUntil=g.time+av(id,'AugDuration');refresh(g,u);}
}
export function coreBlockSpell(g,u,v,p){if(p?.basic||u?.team===v.team||!owns(v,'VeilOfWarding'))return false;const s=state(v);if((s.timers.veil??-Infinity)>g.time)return false;s.timers.veil=g.time+av('VeilOfWarding','Cooldown');g.fx?.('ring',v.x,v.y,'#86a5ff',65,.5);return true;}
export function coreDamage(g,v,n,u,type,meta){if(!u?.hero)return n;if(owns(u,'ARAM_DontBlink')&&v.kind==='hero')n*=1+Math.max(0,u.speed*(u.augmentMoveMultiplier||1)-v.speed*(v.augmentMoveMultiplier||1))*scale(g)*av('ARAM_DontBlink','BonusDamagePerMSDifference');return n;}
export function coreAfterDamage(g,{v,source:u,dealt,basic,meta,stun=0,slow=0}){if(!(dealt>0))return;
 if(v?.hero&&v.alive&&v.hp>0&&owns(v,'EscapePlan')&&v.hp/v.maxHp<=av('EscapePlan','HealthThreshold')&&gate(g,v,'escape',av('EscapePlan','Cooldown'))){state(v).escapeUntil=g.time+av('EscapePlan','Duration');addShield(g,v,'escape',v.maxHp*av('EscapePlan','ShieldRatio'),av('EscapePlan','Duration'));}
 if(!u?.hero||u.team===v.team||v.kind!=='hero'||u.farmOnly)return;const s=state(u);
 const stored=s.killing?.targets.find(t=>t.v===v);if(stored&&s.killing.until>g.time&&!meta.killingDetonation)stored.n+=Math.max(0,Math.min(dealt,dealt+v.hp))*av('ARAM_ItsKillingTime','DamageStorePercentage');
 if(stun||meta.immobilize)coreControl(g,u,v,meta);
 if(slow&&owns(u,'ARAM_IceCold'))state(v).iceUntil=g.time+av('ARAM_IceCold','SlowDuration');
 if(meta.augmentProc||meta.itemProc)return;
 if(s.finalUntil>g.time&&u.alive)healUnit(g,u,u,dealt*av('FinalForm','OmniVamp'),{kind:'omnivamp'});
 const spell=!basic&&/^[qwer]/.test(meta.state||''),index='qwer'.indexOf(meta.state?.[0]),token=u.itemEffects?.castTokens?.[meta.state?.[0]]??meta.state;
 if(spell&&index<3&&owns(u,'ARAM_SkilledSniper')&&dist(u,v)*scale(g)>=av('ARAM_SkilledSniper','SnipeDistance')&&gate(g,u,'sniper:'+token,3)){const ratio=meta.periodic?av('ARAM_SkilledSniper','PeriodicReductionAmount'):av('ARAM_SkilledSniper','ReducedCooldownPercent');u.skills[index]=Math.max(0,u.skills[index]-originalCooldown(u,index)*ratio);}
 if(spell&&owns(u,'ARAM_MagicMissile')&&gate(g,u,'magicmissile',av('ARAM_MagicMissile','Cooldown'))){const factor=1+2*Math.min(1,dist(u,v)*scale(g)/av('ARAM_MagicMissile','MaxRangeThreshold'));for(let i=0;i<av('ARAM_MagicMissile','NumberOfMissiles');i++)later(g,u,i*.12,()=>{if(v.alive){const angle=Math.atan2(v.y-u.y,v.x-u.x);g.shoot(u,angle,{target:v,damage:v.maxHp*av('ARAM_MagicMissile','MaxHealthDamagePerMissile')*factor,damageType:'true',basic:false,augmentProc:true,color:'#caaaef',life:8,speed:800/scale(g),r:4});}});}
 if(basic&&owns(u,'ARAM_Firebrand')){v.augmentBurns??={};const old=v.augmentBurns[u.id];v.augmentBurns[u.id]={source:u,stacks:(old?.until>g.time?old.stacks:0)+1,until:g.time+av('ARAM_Firebrand','BleedDuration'),next:old?.until>g.time?old.next:g.time+1};}
 if(basic&&owns(u,'ARAM_Juiced')&&!u.noMana&&u.mp>0){const cost=u.mp*av('ARAM_Juiced','ManaPercentReduction');u.mp-=cost;const crit=g.random()<(u.crit||0);proc(g,u,v,u.maxMp*av('ARAM_Juiced','ManaPercentDamagePercent')*(crit?u.critDamageMultiplier||1.75:1));}
}
export function coreTakedown(g,u,v){if(!u?.alive)return;const s=state(u);if(owns(u,'ShrinkEngine')){s.stacks.shrink=(s.stacks.shrink||0)+1;refresh(g,u);}if(owns(u,'ARAM_SpiritualPurification'))later(g,u,.05,()=>{for(const enemy of enemies(g,u,v,av('ARAM_SpiritualPurification','AoERadius'))){enemy.slowPercent=av('ARAM_SpiritualPurification','SlowAmount');proc(g,u,enemy,enemy.hp*av('ARAM_SpiritualPurification','PercentCurrentHealthDamage'),'magic',av('ARAM_SpiritualPurification','SlowDuration'));}});}
export function coreDeath(g,u){const s=u.augmentCore;if(s){s.shields=[];s.finalUntil=s.escapeUntil=s.shadowUntil=s.gritUntil=s.adamantUntil=0;s.stacks.grit=s.stacks.adamant=0;s.stacks.slap=(s.stacks.slap||0)*(1-av('ARAM_SlapAround','PercentOfStacksLost'));s.stacks.shrink=Math.floor((s.stacks.shrink||0)*(1-av('ShrinkEngine','PercentOfStacksLost')));s.brainPending=true;delete s.timers.brain;}
 u.augmentBurns={};if(owns(u,'ARAM_DiveBomber')){const point={x:u.x,y:u.y},damage=u.maxHp*av('ARAM_DiveBomber','PercentMaxHPDamage');later(g,u,.05,()=>{g.fx?.('burst',point.x,point.y,'#de92ff',av('ARAM_DiveBomber','ExplosionRadius')/scale(g),.7);for(const v of enemies(g,u,point,av('ARAM_DiveBomber','ExplosionRadius')))proc(g,u,v,damage,'true');});}}
export function coreRespawn(g,u){const s=state(u);if(owns(u,'ARAM_MadScientist'))s.form=g.random()<.5?'large':'small';u.augmentCurrentTime=g.time;refresh(g,u);u.hp=u.maxHp;}
export function coreMovement(g,u,target){const s=u.augmentCore;let flat=0,m=1;if(s?.shadowUntil>g.time)flat+=av('ARAM_ShadowRunner','MSAmount')/scale(g);if(s?.iceUntil>g.time)flat-=av('ARAM_IceCold','ExtraSlowAmount')/scale(g);if(owns(u,'KillSecured')){const dx=target.x-u.x,dy=target.y-u.y;const enemy=enemies(g,u).find(v=>v.hp/v.maxHp<av('KillSecured','HealthThreshold')&&(v.x-u.x)*dx+(v.y-u.y)*dy>0&&((u.target===v)||Math.hypot(dx,dy)>0&&((v.x-u.x)*dx+(v.y-u.y)*dy)/(Math.hypot(dx,dy)*Math.max(.01,dist(u,v)))>.8));if(enemy)m+=av('KillSecured','MovementSpeed');}return{flat,m};}
export function updateCoreUnit(g,u,dt){const s=state(u);u.augmentCurrentTime=g.time;
 for(const key of ['grit','adamant'])if(s[key+'Until']&&s[key+'Until']<=g.time){s[key+'Until']=0;s.stacks[key]=0;refresh(g,u);}
 if(s.finalUntil>g.time)u.augmentMoveMultiplier*=1+av('FinalForm','MSBonus');
 const escape=s.escapeUntil>g.time?(s.escapeUntil-g.time)/av('EscapePlan','Duration'):0;u.augmentMoveMultiplier*=1+escape*av('EscapePlan','MovespeedModEnhanced');u.augmentSize=(u.augmentCoreBaseSize||u.augmentSize||1)*(1-escape*(1-av('EscapePlan','SizeMod')));
 for(const b of s.shields){if(b.key==='escape'){const remaining=b.initial*Math.max(0,(b.until-g.time)/(b.until-b.start));const remove=Math.max(0,b.remaining-remaining);b.remaining-=remove;u.shield=Math.max(0,u.shield-remove);}if(b.until<=g.time){u.shield=Math.max(0,u.shield-b.remaining);b.remaining=0;}}
 s.shields=s.shields.filter(b=>b.remaining>0);
 if(owns(u,'ARAM_BigBrain')&&s.brainInitialized&&!s.shields.some(b=>b.key==='brain')&&!s.timers.brain&&(u.ap||0)>0)s.brainPending=true;
 if(owns(u,'ARAM_BigBrain')&&(s.brainPending||!s.brainInitialized||s.timers.brain&&s.timers.brain<=g.time)){s.brainPending=false;s.brainInitialized=true;delete s.timers.brain;addShield(g,u,'brain',(u.ap||0)*av('ARAM_BigBrain','APRatio'));}
 if(owns(u,'ARAM_Quest_SteelYourHeart')&&!s.steelComplete&&(u.inventoryItems||g.items||[]).includes('3084')&&(u.heartsteelBonusHp||0)>=av('ARAM_Quest_SteelYourHeart','StackThreshold')){s.steelComplete=true;u.heartsteelBonusHp*=av('ARAM_Quest_SteelYourHeart','StackMultiplication');refresh(g,u);g.banner?.('钢化你心：任务完成');}
 if(owns(u,'ARAM_Flashy')&&s.flashRecharge&&s.flashRecharge<=g.time){s.flashCharges=3;s.flashRecharge=0;for(const i of [4,5])if((u.summoners?.[i-4]||['flash','heal'][i-4])==='flash')u.skills[i]=0;}
 for(const key of Object.keys(s.timers))if(key!=='brain'&&s.timers[key]<=g.time)delete s.timers[key];
 // Dash identity is per cast; one dash cannot award a stack every frame.
 if(u.dash&&s.lastDashStart!==u.dash.start){s.lastDashStart=u.dash.start;coreMobility(g,u);}if(!u.dash)s.lastDashStart=null;
}
export function updateCoreWorld(g){const jobs=g.augmentJobs||[];g.augmentJobs=[];for(const job of jobs){if(job.at<=g.time)job.action();else g.augmentJobs.push(job);}
 for(const u of g.units){for(const[id,b]of Object.entries(u.augmentBurns||{})){if(!u.alive||b.until<g.time){delete u.augmentBurns[id];continue;}if(b.next<=g.time){b.next+=1;proc(g,b.source,u,u.maxHp*av('ARAM_Firebrand','PercentMaxHPDamagePer5Seconds')/5*b.stacks,'magic',0,true);}}
 const s=u.augmentCore;if(s?.killing?.until<=g.time){const k=s.killing;s.killing=null;for(const{v,n}of k.targets)if(v.alive)g.hurt(v,n,u,0,0,'magic',false,{augmentProc:true,killingDetonation:true,state:'augment'});}}
}
export function coreFlashCooldown(g,u,id,cooldown){const s=state(u);if(id!=='flash'||!owns(u,'ARAM_Flashy'))return cooldown;s.flashCharges=Math.max(0,(s.flashCharges??3)-1);if(!s.flashRecharge)s.flashRecharge=g.time+av('ARAM_Flashy','AmmoRechargeTime');return s.flashCharges>0?av('ARAM_Flashy','FlashCooldown'):Math.max(0,s.flashRecharge-g.time);}
