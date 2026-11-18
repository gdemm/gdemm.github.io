import {spawnMonkeyClone,mirrorMonkey} from './classic-clones.js';
import {healUnit} from './combat-support.js';
// Offline champion implementation; intentionally excluded from production selection.
import {calculation} from './classic-calculations.js';
import {state,canCast,beginCast as baseBeginCast,value,scale,distance,unitTarget,enemies,dash,damage,passiveValue,knockup} from './classic-common.js';
import {canInteract} from './classic-realms.js';
function beginCast(g,u,i,aim,h,options){const token=baseBeginCast(g,u,i,aim,h,options);if(i!==1){state(u).wStealthUntil=0;u.teemoStealth=false;}return token;}
export function castMonkeyKing(g,i,aim,h){const u=g.player,s=state(u);
 if(i===1){if(!canCast(g,u,i)||u.root>0||u.grounded>0||!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y))return false;beginCast(g,u,i,aim,h);spawnMonkeyClone(g,u);s.wStealthUntil=g.time+value(u,1,'StealthDuration',1);u.teemoStealth=true;dash(g,u,aim,value(u,1,'RangeClamp',300),{throughWalls:true,speed:value(u,1,'DashSpeed',900)});return true;}
 if(i===3){
  if(s.spin?.until>g.time){if(!canCast(g,u,i,{ignoreCooldown:true,ignoreCost:true})||g.time<s.spin.cancelAt)return false;cancelMonkeySpin(g,u);return true;}
  const second=s.rSecondUntil>g.time;
  if(!canCast(g,u,i,{ignoreCooldown:second,ignoreCost:second})||s.spin?.until>g.time||second&&g.time<s.rReadyAt)return false;
  const token=beginCast(g,u,i,u,h,second?{cd:null,spend:false}:{}),duration=value(u,3,'SpinDuration',2);
  if(second)s.rSecondUntil=0;else{s.rSecondUntil=g.time+value(u,3,'RecastWindow',8);s.rReadyAt=g.time+value(u,3,'LockoutTimeBetweenCasts',1);}
  s.spin={cancelAt:g.time+value(u,3,'LockoutTimeBetweenCasts',1),until:g.time+duration,nextTick:g.time+value(u,3,'SecondsPerTick',.25),hits:new Set(),token};u.classicDisarmedUntil=s.spin.until;u.animUntil=s.spin.until;mirrorMonkey(g,u,3);return true;
 }
 if(i===0){if(!canCast(g,u,i))return false;cancelMonkeySpin(g,u);beginCast(g,u,i,u,h);s.qUntil=g.time+value(u,0,'BuffDuration',6);u.cd=0;mirrorMonkey(g,u,0);return true;}
 if(i===2){if(!canCast(g,u,i)||u.root>0||u.grounded>0||!unitTarget(g,u,aim,650))return false;
  cancelMonkeySpin(g,u);const token=beginCast(g,u,i,aim,h),extra=enemies(g,u).filter(v=>v!==aim&&distance(v,aim)<=value(u,2,'ExtraTargetRange',700)*scale(g)).sort((a,b)=>distance(a,aim)-distance(b,aim)).slice(0,value(u,2,'ExtraTargets',2));
  s.eTarget=aim;
  dash(g,u,aim,650,{throughWalls:true,speed:value(u,2,'DashSpeed',1050),done:()=>{s.eTarget=null;if(!aim.alive||!canInteract(u,aim))return;s.eUntil=g.time+value(u,2,'AttackSpeedDuration',5);for(const v of [aim,...extra])if(v.alive&&canInteract(u,v))h.hit(g,{source:u,effectState:'e',castToken:token,damageType:'magic',aoe:true},v,calculation(u,2,'TotalDamage'));}});return true;
 }
 return false;
}
export function monkeyAfterDamage(g,u,v,{basic,meta,dealt}){if(dealt<=0||meta.classicProc)return;const s=state(u);if(v.kind==='hero')monkeyStack(g,u);
 if(basic||['q','e','r'].includes(meta.state))u.skills[0]=Math.max(0,u.skills[0]-value(u,0,'CooldownDecrease',.5));
 if(basic&&s.qUntil>g.time){s.qUntil=0;v.classicArmorShred={until:g.time+value(u,0,'ShredDuration',3),amount:value(u,0,'ArmorShredPercent',.1)};damage(g,u,v,calculation(u,0,'TotalDamage'),'physical','q');}
}
export function updateMonkey(g,u,dt=0,h){const s=state(u);if(s.wStealthUntil!==undefined)u.teemoStealth=s.wStealthUntil>g.time;
 if(s.spin){const spin=s.spin,tick=value(u,3,'SecondsPerTick',.25);
  while(spin.nextTick<=g.time+1e-9&&spin.nextTick<=spin.until+1e-9){spin.nextTick+=tick;for(const v of enemies(g,u))if(distance(u,v)<=315*scale(g)+v.radius){const n=(calculation(u,3,'DamagePerSecondTotal')+v.maxHp*value(u,3,'BasePercentMaxHPDmgPerSec'))*tick;h.hit(g,{source:u,effectState:'r',castToken:spin.token,damageType:'physical',periodic:true,aoe:true,onHit:t=>{if(!spin.hits.has(t.id)){spin.hits.add(t.id);knockup(g,u,t,value(u,3,'KnockupDuration',.6));}}},v,n);}}
  if(g.time>=spin.until){s.spin=null;u.classicDisarmedUntil=0;}
 }
 if(s.pStacks>0&&g.time>=s.pDecayAt){const interval=passiveValue(u,'FallOffRate',1);const lost=1+Math.floor((g.time-s.pDecayAt)/interval);s.pStacks=Math.max(0,s.pStacks-lost);s.pDecayAt+=lost*interval;}
 const armor=monkeyArmor(u);if(u.classicMonkeyArmor!==armor){u.classicMonkeyArmor=armor;g.refreshAugmentStats(u);}
 if(u.alive&&dt>0)healUnit(g,u,u,u.maxHp*passiveValue(u,'HealthPercentPer5',.0035)*(1+(s.pStacks||0))/5*dt,{regen:true,kind:'stoneSkin'});
if(s.eTarget){if(!s.eTarget.alive||!canInteract(u,s.eTarget)){u.dash=null;s.eTarget=null;}else if(u.dash?.kind==='classicDash'){const v=s.eTarget,dx=v.x-u.x,dy=v.y-u.y,n=Math.hypot(dx,dy)||1,offset=value(u,2,'EndPointOffsetDistance',75)*scale(g);u.dash.to={x:v.x-dx/n*offset,y:v.y-dy/n*offset};}else s.eTarget=null;}}
export const monkeyAS=(g,u)=>state(u).eUntil>g.time?value(u,2,'AttackSpeed',.4):0;
export const monkeyRange=u=>state(u).qUntil>(u.augmentCurrentTime||0)?value(u,0,'AttackRangeBonus',135):0;

export function monkeyArmor(u){return calculation(u,-1,'BonusArmor')*(1+(state(u).pStacks||0)*passiveValue(u,'StackMultiplier',1));}
export function monkeyStack(g,u){const s=state(u);s.pStacks=Math.min(passiveValue(u,'MaxStacks',5),(s.pStacks||0)+1);s.pDecayAt=g.time+passiveValue(u,'StackDuration',5);u.classicMonkeyArmor=monkeyArmor(u);g.refreshAugmentStats(u);}
export function monkeyIncoming(g,u,source,amount){if(amount>0&&source?.kind==='hero'&&source.team!==u.team)monkeyStack(g,u);return amount;}

export const monkeyMove=(g,u)=>state(u).spin?.until>g.time?u.baseMoveSpeed*value(u,3,'MoveSpeed',.2):0;

export function cancelMonkeySpin(g,u){const s=state(u);if(!s.spin)return;s.spin=null;u.classicDisarmedUntil=0;u.animUntil=g.time;u.animation='idle';}

export function monkeyAttackStart(g,u,target){state(u).wStealthUntil=0;u.teemoStealth=false;state(u).cloneTarget=target;}
