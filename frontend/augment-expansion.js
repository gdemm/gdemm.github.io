import {healUnit} from './combat-support.js';
// Installed Kiwi values, with explicit web-mode trigger boundaries.
import {AUGMENTS} from './augment-catalog.js';
const data=new Map(AUGMENTS.map(a=>[a.id,a.values]));
const has=(u,id)=>u?.augments?.includes(id),value=(id,key)=>Number(data.get(id)?.[key]||0);
const gate=(u,key,time,cd)=>{u.augmentExpansionTimers??={};if((u.augmentExpansionTimers[key]??-Infinity)>time)return false;u.augmentExpansionTimers[key]=time+cd;return true;};
export function expansionStats(u,b){
 if(has(u,'ARAM_LegDay')){b.moveFlat=(b.moveFlat||0)+value('ARAM_LegDay','MovementSpeed');}
 if(has(u,'ARAM_ScopierWeapons'))b.range+=value('ARAM_ScopierWeapons',(u.nativeRange||u.hero?.range||500)<300?'MeleeRangeIncrease':'RangedRangeIncrease');
 for(const id of ['ARAM_SoulSiphon','ARAM_TankItOrLeaveIt','CriticalRhythm'])if(has(u,id))b.crit+=value(id,'CritChance');
 if(has(u,'ARAM_PhenomenalEvil'))b.ap+=u.augmentEvilAP||0;
 return b;
}
export function expansionChoice(g,u,id){if(id==='Donation')g.gold+=value(id,'GoldAmount');if(id==='ARAM_PhenomenalEvil'&&u.augments.length===2)u.augmentEvilAP=(u.augmentEvilAP||0)+value(id,'StartingAPIfSecondAugment');}
export function expansionSlowMultiplier(u){return has(u,'ARAM_LegDay')?1-value('ARAM_LegDay','SlowResist'):1;}
export function expansionDefence(g,v,damage,type){if(type!=='true'&&has(v,'ARAM_TankItOrLeaveIt')&&g.random()<Math.min(value('ARAM_TankItOrLeaveIt','MaxChance'),v.crit||0))damage*=1-value('ARAM_TankItOrLeaveIt','DamageReduction');return damage;}
export function expansionResistance(v,time){return v.augmentErosionUntil>time?1-(v.augmentErosionStacks||0)*value('ARAM_Erosion','Shred'):1;}
export function expansionAfterDamage(g,{v,source,dealt,basic,meta}){
 if(v?.hero&&v.alive&&v.hp>0&&has(v,'ARAM_DawnbringersResolve')&&v.hp/v.maxHp<value('ARAM_DawnbringersResolve','HealthThreshold')&&gate(v,'dawn',g.time,value('ARAM_DawnbringersResolve','Cooldown'))){v.augmentDawnRemaining=value('ARAM_DawnbringersResolve','Duration');v.augmentDawnHealPerSecond=v.maxHp*value('ARAM_DawnbringersResolve','HealAmount')/v.augmentDawnRemaining;}
 if(!source?.hero||source.team===v.team||dealt<=0||v.kind!=='hero'||meta.augmentProc||meta.itemProc)return;
 if(meta.critical&&source.alive){if(has(source,'ARAM_SoulSiphon'))healUnit(g,source,source,Math.max(0,Math.min(dealt,dealt+v.hp))*value('ARAM_SoulSiphon','HealPercentage'),{kind:'augment'});if(basic&&has(source,'CriticalRhythm')){source.augmentCriticalStacks=Math.min(value('CriticalRhythm','MaxStack'),(source.augmentCriticalUntil>g.time?source.augmentCriticalStacks||0:0)+1);source.augmentCriticalUntil=g.time+value('CriticalRhythm','BuffDuration');}}
 if(has(source,'ARAM_Erosion')){v.augmentErosionStacks=Math.min(value('ARAM_Erosion','MaxStacks'),(v.augmentErosionUntil>g.time?v.augmentErosionStacks||0:0)+1);v.augmentErosionUntil=g.time+value('ARAM_Erosion','ShredDuration');}
 if(!basic&&/^[qwer](?:$|[-\d])/.test(meta.state||'')&&has(source,'ARAM_PhenomenalEvil')){const token=source.itemEffects?.castTokens?.[meta.state[0]]??meta.state;const key='evil:'+v.id+':'+token;source.augmentExpansionTimers??={};if((source.augmentExpansionTimers[key]??-Infinity)<=g.time&&gate(source,'evil',g.time,value('ARAM_PhenomenalEvil','ProcCooldown'))){source.augmentExpansionTimers[key]=g.time+value('ARAM_PhenomenalEvil','SpellIDCD');source.augmentEvilAP=(source.augmentEvilAP||0)+value('ARAM_PhenomenalEvil','APPerProc');g.refreshAugmentStats?.(source);}}
}
export function expansionTakedown(g,u){if(u?.alive&&has(u,'ARAM_GetExcited'))u.augmentExcitedUntil=g.time+value('ARAM_GetExcited','BuffDuration');}
export function expansionDeath(u){u.augmentDawnRemaining=0;u.augmentDawnHealPerSecond=0;u.augmentCriticalStacks=0;u.augmentCriticalUntil=0;u.augmentExcitedUntil=0;u.augmentErosionStacks=0;u.augmentErosionUntil=0;if(u.augmentExpansionTimers)delete u.augmentExpansionTimers.dawn;}
export function updateExpansion(g,u,dt){
 // Expire per-cast locks to keep long matches' network state bounded.
 if(u.augmentExpansionTimers)for(const key of Object.keys(u.augmentExpansionTimers))if(u.augmentExpansionTimers[key]<=g.time)delete u.augmentExpansionTimers[key];
 if(!u.alive)return;
 if(u.augmentCriticalUntil<=g.time)u.augmentCriticalStacks=0;
 if(has(u,'CriticalRhythm'))u.augmentAttackSpeed+=(u.augmentCriticalStacks||0)*value('CriticalRhythm','ASPerStack');
 if(has(u,'ARAM_GetExcited')&&u.augmentExcitedUntil>g.time){u.augmentAttackSpeed+=value('ARAM_GetExcited','ASBuff');u.augmentMoveMultiplier*=1+value('ARAM_GetExcited','MSBuff');}
 if(u.augmentDawnRemaining>0){const elapsed=Math.min(dt,u.augmentDawnRemaining);u.augmentDawnRemaining-=elapsed;healUnit(g,u,u,u.augmentDawnHealPerSecond*elapsed,{kind:'augment'});}
}
