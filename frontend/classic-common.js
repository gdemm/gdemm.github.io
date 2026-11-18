import {canInteract,realmId,constrainRealm} from './classic-realms.js';
import {itemTenacity} from './item-actives.js';
import {constrainClassicTerrain} from './classic-geometry.js';
import {mundoPreventControl} from './ryze-mundo.js';
import {itemStasis} from './item-effects.js';
import {CLASSIC_NATIVE} from './classic-data.js';
import {canCastWithAugments,augmentOnCast,combatCooldownMultiplier} from './augment-rules.js';
export const scale=g=>1/(g.mapConfig?.scale||2),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const state=u=>u.classic??={};
export const nativeSpell=(u,index)=>CLASSIC_NATIVE[u.hero.id]?.spells[CLASSIC_NATIVE[u.hero.id]?.abilityNames[index]]?.data||{};
export const rank=(u,i)=>u.spellRanks?.[i]||1;
export function value(u,i,name,fallback=0){return nativeSpell(u,i).DataValues?.find(d=>d.name.toLowerCase()===name.toLowerCase())?.values?.[rank(u,i)]??fallback;}
export const passiveValue=(u,name,fallback=0)=>CLASSIC_NATIVE[u.hero.id]?.passive?.DataValues?.find(d=>d.name.toLowerCase()===name.toLowerCase())?.values?.[1]??fallback;
export const cooldown=(u,i)=>(nativeSpell(u,i).Cooldown?.values||nativeSpell(u,i).cooldownTime)?.[rank(u,i)]??0;
export const cost=(u,i)=>u.noMana?0:nativeSpell(u,i).mana?.[rank(u,i)-1]??0;
export const bonusAD=u=>Math.max(0,u.damage-u.hero.damage-Math.max(0,u.level-3)*4);
export const enemies=(g,u,structures=false)=>g.enemies(u).filter(v=>structures||['hero','minion','clone'].includes(v.kind));
export const unitTarget=(g,u,v,range,structures=false)=>!!v&&v.alive&&v.team!==u.team&&g.units.includes(v)&&g.canHit(v)&&canInteract(u,v)&&(structures||['hero','minion','clone'].includes(v.kind))&&!v.teemoStealth&&distance(u,v)<=range*scale(g)+u.radius+(v.radius||0);
export function canCast(g,u,i,{ignoreCooldown=false,ignoreCost=false,allowDuringDash=false,ignoreCastLock=false}={}){return u.alive&&g.winner===null&&!(u.stun>0||u.silence>0||u.charm>0||u.castUntil>g.time||u.classicCastLockUntil>g.time&&!ignoreCastLock||u.classicTaunt?.until>g.time||u.forcedMove||u.dash&&!allowDuringDash)&&(ignoreCooldown||u.skills[i]<=0)&&canCastWithAugments(u,i)&&(ignoreCost||u.mp>=cost(u,i));}
export function beginCast(g,u,i,aim,h,{cd=cooldown(u,i),spend=true,animation='qwer'[i]}={}){
 if(spend)u.mp-=cost(u,i);if(cd!==null)u.skills[i]=cd*combatCooldownMultiplier(u,i);h.cancelAttack(u);u.animation=animation;u.animationSerial++;u.animUntil=g.time+.3;
 const at=aim||u,from={x:u.x,y:u.y};u.facing=Math.atan2(at.x-u.x,at.y-u.y);const event=h.combatEvent(g,u,'qwer'[i],'cast',{aim:at,from,animation});augmentOnCast(g,u,i,at,from);g.shopHistory=[];return event.id;
}
export function cue(g,u,name,point=u,duration=.65){g.fx('native',point.x,point.y,u.hero.color,40,duration,{hero:u.hero.id,classicRealmId:realmId(u),nativeName:name,nativeDuration:duration,facing:u.facing,follow:point===u?u:undefined});}
// Sample the whole segment: a blocked middle cell must not be bypassed by a valid endpoint.
export function travelPoint(g,from,aim,range,{throughWalls=false}={}){
 const dx=aim.x-from.x,dy=aim.y-from.y,d=Math.hypot(dx,dy);if(!d)return {x:from.x,y:from.y,blocked:false};
 const reach=Math.min(d,range*scale(g));let point={x:from.x,y:from.y},blocked=false;
 const steps=Math.max(1,Math.ceil(reach/(8*scale(g))));
 for(let i=1;i<=steps;i++){
  const p={x:from.x+dx/d*reach*i/steps,y:from.y+dy/d*reach*i/steps};
  if(!throughWalls){const limited=constrainClassicTerrain(g,from,point,p);if(distance(limited,p)>.01){point=limited;blocked=true;break;}}
  if(g.navigation&&!g.navigation.canWalk(p.x,p.y)){if(!throughWalls){blocked=true;break;}}else point=p;
 }
 return {...constrainRealm(g,from,point),blocked};
}
export function dash(g,u,aim,range,{speed=1200,throughWalls=false,done=()=>{}}={}){
 const to=travelPoint(g,u,aim,range,{throughWalls}),from={x:u.x,y:u.y};u.dest=null;u.attackWindup=null;
 u.dash={kind:'classicDash',classicCrossWalls:throughWalls,from,to,start:g.time,duration:Math.max(.08,distance(from,to)/(speed*scale(g))),done};return to;
}
export function defer(g,seconds,action){g.classicJobs??=[];g.classicJobs.push({at:g.time+seconds,action});}
export function runClassicJobs(g){const jobs=g.classicJobs||[];g.classicJobs=[];for(const job of jobs)if(job.at<=g.time)job.action();else g.classicJobs.push(job);}
export function forceTo(g,u,v,to,{duration=.25,airborne=true}={}){
 if(!canInteract(u,v)||!v.alive||v.unstoppableUntil>g.time||itemStasis(g,v)||!mundoPreventControl(g,v,duration))return false;
 v.dash=null;v.dest=null;v.attackWindup=null;v.forcedMove={kind:'classicDisplacement',from:{x:v.x,y:v.y},to:constrainRealm(g,v,{x:to.x,y:to.y}),start:g.time,duration};
 if(airborne){v.airborne=Math.max(v.airborne||0,duration);v.airborneTotal=duration;v.airborneSourceId=u.id;}
 g.onAugmentControl?.(u,v,{immobilize:duration});return true;
}
export function push(g,u,v,length,{duration=.25}={}){
 const dx=v.x-u.x,dy=v.y-u.y,d=Math.hypot(dx,dy)||1;
 const to=travelPoint(g,v,{x:v.x+dx/d*length*scale(g),y:v.y+dy/d*length*scale(g)},length);
 return {...to,duration,moved:forceTo(g,u,v,to,{duration})};
}
export function knockup(g,u,v,duration){return forceTo(g,u,v,v,{duration});}
export function damage(g,u,v,amount,type,stateKey,extra={}){if(amount>0)g.hurt(v,amount,u,extra.stun||0,extra.slow||0,type,false,{state:stateKey,classicProc:true,...extra});}
export const effectValue=(u,i,e,fallback=0)=>nativeSpell(u,i).mEffectAmount?.[e-1]?.value?.[rank(u,i)]??fallback;

export function slowUnit(g,v,duration,amount){const previous=v.slow>0?v.slowPercent||0:0;v.slow=Math.max(v.slow||0,duration*itemTenacity(g,v));v.slowPercent=Math.max(previous,amount);}
export function tauntUnit(g,u,v,duration){if(!canInteract(u,v)||v.unstoppableUntil>g.time||itemStasis(g,v))return false;duration=mundoPreventControl(g,v,duration);if(!duration)return false;v.classicTaunt={source:u,until:g.time+duration*itemTenacity(g,v)};v.attackWindup=null;g.onAugmentControl?.(u,v,{immobilize:duration});return true;}

export function stunUnit(g,u,v,duration){if(!canInteract(u,v)||v.unstoppableUntil>g.time||itemStasis(g,v))return false;duration=mundoPreventControl(g,v,duration);if(!duration)return false;v.stun=Math.max(v.stun||0,duration*itemTenacity(g,v));g.onAugmentControl?.(u,v,{immobilize:duration});return true;}
