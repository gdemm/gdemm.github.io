import {blockItemSpell} from './item-stacks.js';
import {coreBlockSpell} from './augment-core.js';
import {COMBAT_DATA} from './combat-data.js';
import {healUnit} from './combat-support.js';
import {augmentOnCast,canCastWithAugments,combatCooldownMultiplier} from './augment-rules.js';
const spec=i=>COMBAT_DATA.Tryndamere.spells[COMBAT_DATA.Tryndamere.abilityNames[i]].data;
export const tryndValue=(u,i,n,f=0)=>spec(i).DataValues?.find(v=>v.name===n)?.values?.[u.spellRanks?.[i]||1]??f;
const k=g=>1/(g.mapConfig?.scale||2),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const effect=(g,u,name,d=.6)=>g.fx('native',u.x,u.y,u.hero.color,50,d,{hero:'Tryndamere',nativeName:name,nativeDuration:d,follow:u});
export function tryndFury(g,u,n){u.tryndFury=clamp((u.tryndFury||0)+n,0,100);u.tryndCombatAt=g.time;}
export function tryndCrit(u){return Math.min(1,(u.crit||0)+(u.hero?.id==='Tryndamere'?(u.tryndFury||0)*.004:0));}
export function tryndAttack(g,u,v,critical){if(u.hero?.id!=='Tryndamere')return;tryndFury(g,u,critical?10:5);if(critical)u.skills[2]=Math.max(0,u.skills[2]-tryndValue(u,2,v.kind==='hero'?'ChampCDRefund':'NonChampCDRefund',v.kind==='hero'?1.5:.75));}
export function tryndDamage(g,u,v){if(u?.hero?.id==='Tryndamere'&&!v.alive)tryndFury(g,u,10);if(v.hero?.id==='Tryndamere')v.tryndCombatAt=g.time;}
export function tryndHealthFloor(g,u,d){if((u.hero?.id==='Tryndamere'||u.sylasBorrowedR?.id==='Tryndamere')&&u.tryndRUntil>g.time)return Math.min(d,Math.max(0,u.hp-tryndValue(u,3,'TryndRMinHealth',30)));return d;}
export function updateTryndamere(g,u,dt,h){
 if(u.hero?.id!=='Tryndamere'&&!u.tryndStatAdjustment&&!u.tryndWUntil)return;
 const old=u.tryndStatAdjustment||0;
 const bonus=u.hero?.id==='Tryndamere'?tryndValue(u,0,'MaximumBonusAD',20)*clamp((1-u.hp/u.maxHp)/.9,0,1):0;
 const reduction=u.tryndWUntil>g.time?u.tryndWReduction||0:0;
 u.damage=Math.max(0,u.damage-old+bonus-reduction);u.tryndStatAdjustment=bonus-reduction;
 if(u.hero?.id!=='Tryndamere'||!u.alive)return;
 if(g.time-(u.tryndCombatAt??0)>8)u.tryndFury=Math.max(0,(u.tryndFury||0)-5*dt);
 const spin=u.tryndSpin;
 if(spin){
  const a=spin.previous,b=u,dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
  for(const v of g.enemies(u)){
   if(!['hero','minion'].includes(v.kind)||spin.hit.has(v.id))continue;
   const t=l?clamp(((v.x-a.x)*dx+(v.y-a.y)*dy)/l,0,1):0;
   if(Math.hypot(v.x-a.x-t*dx,v.y-a.y-t*dy)>tryndValue(u,2,'DamageAoE',225)*k(g)/2+v.radius)continue;
   spin.hit.add(v.id);h.hit(g,{source:u,effectState:'e',damageType:'physical',hitEffect:'Tryndamere_Base_E_BloodSlash_01'},v,spin.damage);tryndFury(g,u,tryndValue(u,2,v.kind==='hero'?'ChampFuryGain':'NonChampFuryGain',2));
  }
  spin.previous={x:u.x,y:u.y};if(g.time>=spin.until||!u.dash)u.tryndSpin=null;
 }
}
export function castTryndamere(g,i,aim,h){
 const u=g.player;if(!u.alive||g.winner!==null||u.skills[i]>0||!canCastWithAugments(u,i))return false;
 if(i!==3&&(u.stun>0||u.silence>0||u.charm>0||u.castUntil>g.time||u.dash))return false;
 if(i===3&&u.tryndRUntil>g.time)return false;
 if(i===2&&(u.root>0||u.grounded>0||!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 const enemies=g.enemies(u).filter(v=>v.kind==='hero'&&Math.hypot(v.x-u.x,v.y-u.y)<=850*k(g)+v.radius);
 if(i===1&&!enemies.length)return false;
 u.skills[i]=spec(i).Cooldown.values[u.spellRanks?.[i]||1]*combatCooldownMultiplier(u,i);
 if(i!==3)h.cancelAttack(u);if(!u.dash){u.animation='qwer'[i];u.animationSerial++;u.animUntil=g.time+.35;}g.shopHistory=[];const from={x:u.x,y:u.y};h.combatEvent(g,u,'qwer'[i],'cast',{from,aim:aim||u});augmentOnCast(g,u,i,aim||u,from);
 if(i===0){const fury=u.tryndFury||0;u.tryndFury=0;healUnit(g,u,u,tryndValue(u,0,'BaseHealing',30)+tryndValue(u,0,'APRatio',.3)*(u.ap||0)+fury*(tryndValue(u,0,'BonusHealPerFury',.5)+tryndValue(u,0,'APRatioPerFury',.012)*(u.ap||0)),{state:'q'});effect(g,u,'Tryndamere_Base_Q_Heal_01');}
 if(i===1)for(const v of enemies){if(coreBlockSpell(g,u,v,{})||blockItemSpell(g,u,v,{}))continue;v.tryndWUntil=g.time+tryndValue(u,1,'ReductionDuration',4);v.tryndWReduction=-tryndValue(u,1,'ADReduction',-20);const away=(v.x-u.x)*Math.sin(v.facing||0)+(v.y-u.y)*Math.cos(v.facing||0)>0;if(away){g.hurt(v,0,u,0,tryndValue(u,1,'SlowDuration',3.25),'magic',false,{state:'w'});v.slowPercent=-tryndValue(u,1,'SlowPotency',-.3);g.fx('native',v.x,v.y,u.hero.color,40,1,{hero:'Tryndamere',nativeName:'Tryndamere_Base_W_Buf_Chicken_01',follow:v});}}
 if(i===2){let dx=aim.x-u.x,dy=aim.y-u.y,l=Math.hypot(dx,dy);const r=Math.min(l,650*k(g));if(!l){dx=Math.sin(u.facing||0);dy=Math.cos(u.facing||0);l=1;}let to={x:u.x+dx/l*r,y:u.y+dy/l*r};if(g.navigation)to=g.navigation.snap(to.x,to.y);const duration=Math.max(.1,Math.hypot(to.x-u.x,to.y-u.y)/(1300*k(g)));u.dest=null;u.facing=Math.atan2(dx,dy);u.dash={kind:'tryndE',from,to,start:g.time,duration};u.tryndSpin={previous:from,until:g.time+duration,hit:new Set(),damage:tryndValue(u,2,'Damage',80)+Math.max(0,u.damage-u.hero.damage-Math.max(0,u.level-3)*4)*tryndValue(u,2,'ADRatio',1)+(u.ap||0)*tryndValue(u,2,'APRatio',.8)};u.animation='e';u.animationSerial++;u.animUntil=g.time+duration;effect(g,u,'Tryndamere_Base_E_Slash',duration);}
 if(i===3){u.tryndRUntil=g.time+tryndValue(u,3,'TryndRDuration',5);tryndFury(g,u,tryndValue(u,3,'TryndRFuryGain',50));effect(g,u,'Tryndamere_Base_R_buf_01',5);}
 return true;
}
