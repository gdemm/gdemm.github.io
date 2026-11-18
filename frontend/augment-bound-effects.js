import {blockItemSpell} from './item-stacks.js';
import {boundSlot,boundTo,activeBoundSkill} from './augment-bindings.js';
import {av,originalCooldown,coreControl,coreBlockSpell} from './augment-core.js';
import {healUnit} from './combat-support.js';
const data=u=>u.boundState??={timers:{},resists:[]};
const level=(u,a,b)=>a+(b-a)*Math.max(0,Math.min(17,(u.level||1)-1))/17;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),scale=g=>g.mapConfig?.scale||2;
const slot=meta=>meta.state==='rocket'?0:'qwer'.indexOf((meta.state||'')[0]);
const enemy=(g,u,v)=>v.alive&&v.hp>0&&v.kind==='hero'&&v.team!==u.team&&!u.farmOnly&&g.canHit(v);
const lock=(g,u,key,seconds)=>{const s=data(u);if((s.timers[key]??-Infinity)>g.time)return false;s.timers[key]=g.time+seconds;return true;};
const refresh=(g,u)=>{u.augmentCurrentTime=g.time;g.refreshAugmentStats?.(u);};
const proc=(g,u,v,n,type='magic')=>{if(enemy(g,u,v)&&n>0)g.hurt(v,n,u,0,0,type,false,{augmentProc:true,state:'augment'});};
export function boundOnCast(g,u,index,aim){if(index<0)return;
 if(boundTo(u,'ARAM_RabbleRousing',index)){const bhp=Math.max(0,u.maxHp-u.hero.hp-Math.max(0,u.level-3)*70),bad=Math.max(0,u.damage-u.hero.damage-Math.max(0,u.level-3)*4);healUnit(g,u,u,level(u,30,100)+bad*av('ARAM_RabbleRousing','bAD')+(u.ap||0)*av('ARAM_RabbleRousing','AP')+bhp*av('ARAM_RabbleRousing','BonusHealthPercentageHeal'),{state:'qwer'[index]});}
 const overloaded=boundSlot(u,'Overloaded');if(u.augments?.includes('Overloaded')&&overloaded!==null&&overloaded!==index)u.skills[overloaded]=0;
 if(boundTo(u,'ARAM_Terror',index)){const duration=Math.min(av('ARAM_Terror','MaximumFearDuration'),originalCooldown(u,index)/av('ARAM_Terror','FearDurationCDDenominator'));if(duration>0)for(const target of g.units)if(enemy(g,u,target)&&!(target.unstoppableUntil>g.time)&&dist(u,target)*scale(g)<=av('ARAM_Terror','FearRange')&&!coreBlockSpell(g,u,target,{})&&!blockItemSpell(g,u,target,{})){target.fearUntil=g.time+duration;target.fearSourceId=u.id;target.stun=Math.max(target.stun||0,duration);target.attackWindup=null;coreControl(g,u,target,{state:'qwer'[index]});}}
 if(boundTo(u,'ARAM_Quickstep',index)&&!(u.root>0||u.grounded>0)){const point={x:aim?.x??u.x,y:aim?.y??u.y};g.augmentJobs??=[];g.augmentJobs.push({source:u,at:g.time+.001,action:()=>{if(!u.alive||u.root>0||u.grounded>0||u.dash)return;const length=dist(u,point);if(length<1)return;const r=Math.min(length,av('ARAM_Quickstep','ChargeRange')/scale(g)),from={x:u.x,y:u.y},end={x:u.x+(point.x-u.x)*r/length,y:u.y+(point.y-u.y)*r/length},to=g.navigation?g.navigation.snap(end.x,end.y):end;if(dist(from,to)>av('ARAM_Quickstep','ChargeRange')/scale(g)+1)return;u.dash={kind:'augmentQuickstep',from,to,start:g.time,duration:.2};u.dest=null;}});}
}
export function boundAfterDamage(g,{v,source:u,dealt,basic,meta,damageType='physical',rawDamage}){if(!u?.alive||v.kind!=='hero'||u.team===v.team||u.farmOnly||dealt<=0||meta.augmentProc||meta.itemProc)return;const index=slot(meta);
 if(boundTo(u,'ARAM_SustainingStrike',index))healUnit(g,u,u,Math.max(0,Math.min(dealt,dealt+v.hp))*av('ARAM_SustainingStrike','Lifesteal'),{state:meta.state?.[0]});
 if(boundTo(u,'Bonk',index)){const n=(rawDamage??dealt)*av('Bonk','DamageMultiplier');for(const target of g.units)if(enemy(g,u,target)&&dist(target,v)*scale(g)<=av('Bonk','AoERange'))proc(g,u,target,n,damageType);}
 if(boundTo(u,'WardingWeapon',index)&&damageType!=='true'&&lock(g,u,'warding',av('WardingWeapon','Cooldown'))){data(u).resists.push({stat:damageType==='magic'?'mr':'armor',amount:level(u,7,12),until:g.time+av('WardingWeapon','Buff_Duration')});refresh(g,u);}
 const reload=boundSlot(u,'KeepGoing');if(basic&&meta.itemAttack!==false&&u.augments?.includes('KeepGoing')&&reload!==null&&(activeBoundSkill(u,reload,g.time)||index===reload))u.skills[reload]=Math.max(0,u.skills[reload]-originalCooldown(u,reload)*level(u,.15,.35));
}
export function boundControl(g,u,v,meta={}){const index=slot(meta);if(!boundTo(u,'DarkWind',index)||!enemy(g,u,v)||!(u.hp>0))return;const token=u.itemEffects?.castTokens?.[meta.state?.[0]]??meta.state;if(!lock(g,u,'darkwind:'+v.id+':'+token,5))return;const bhp=Math.max(0,u.maxHp-u.hero.hp-Math.max(0,u.level-3)*70);proc(g,u,v,level(u,15,90)+(u.ap||0)*av('DarkWind','Damage_APRatio')+u.maxHp*av('DarkWind','Damage_HPRatio'));healUnit(g,u,u,(level(u,50,200)+(u.ap||0)*av('DarkWind','Heal_APRatio')+bhp*av('DarkWind','Heal_bHPRatio'))*(1+.25+.25*(1-u.hp/u.maxHp)),{state:meta.state?.[0]});}
export function boundStatBonuses(u){const result={armor:0,mr:0};for(const r of u.boundState?.resists||[])if(r.until>(u.augmentCurrentTime||0))result[r.stat]+=r.amount;return result;}
export function updateBoundEffects(g,u){const go=boundSlot(u,'ItsGoTime');if(u.alive&&u.augments?.includes('ItsGoTime')&&go!==null&&activeBoundSkill(u,go,g.time))u.augmentMoveMultiplier*=1+level(u,.25,.45);const s=u.boundState;if(s){const old=s.resists.length;s.resists=s.resists.filter(r=>r.until>g.time);if(old!==s.resists.length)refresh(g,u);for(const[key,time]of Object.entries(s.timers))if(time<=g.time)delete s.timers[key];}
 u.boundRangeBonus=0;const index=boundSlot(u,'LittleExtraHelp');if(u.augments?.includes('LittleExtraHelp')&&index!==null&&activeBoundSkill(u,index,g.time)){const ranged=(u.nativeRange||500)>=300;u.augmentAttackSpeed+=ranged?.75*.533:.75;u.boundRangeBonus=ranged?150*.667:150;}}
export function boundDeath(u){u.boundState={timers:{},resists:[]};u.boundRangeBonus=0;u.fearUntil=0;u.fearSourceId=null;}
