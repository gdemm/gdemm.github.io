import {mundoPreventControl} from './ryze-mundo.js';
import {COMBAT_DATA} from './combat-data.js';
import {augmentOnCast,canCastWithAugments,combatCooldownMultiplier,augmentAttackDamage} from './augment-rules.js';
import {shieldUnit} from './combat-support.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),scale=g=>1/(g.mapConfig?.scale||2);
export const isColossus=u=>['Malphite','RiftHerald'].includes(u?.hero?.id);
export const colossusRange=(u,i)=>u.hero.id==='Malphite'?[625,0,400,1000][i]:[475,375,0,1100][i];
export const colossusTargeting=(u,i)=>u.hero.id==='Malphite'&&i===0?'Unit':[1,2].includes(i)?'Self':'Location';
const sourceSpell=(u,i)=>COMBAT_DATA.Malphite.spells[COMBAT_DATA.Malphite.abilityNames[i]].data;
const sourceValue=(u,i,name,fallback)=>sourceSpell(u,i).DataValues?.find(v=>v.name===name)?.values?.[u.spellRanks?.[i]||1]??fallback;
export const colossusCost=(u,i)=>u.hero.id==='Malphite'?(sourceSpell(u,i).mana?.[(u.spellRanks?.[i]||1)-1]??0):0;
export const colossusCooldown=(u,i)=>u.hero.id==='Malphite'?sourceSpell(u,i).Cooldown.values[u.spellRanks?.[i]||1]:[8,10,14,60][i];
const enemies=(g,u)=>g.enemies(u).filter(v=>['hero','minion'].includes(v.kind));
const point=(g,u,aim,range)=>{const d=dist(u,aim)||1,r=Math.min(d,range*scale(g));const p={x:u.x+(aim.x-u.x)/d*r,y:u.y+(aim.y-u.y)/d*r};return g.navigation?g.navigation.snap(p.x,p.y):p;};
const cue=(g,u,state,phase,extra={})=>{g.combatEvents.push({id:g.counter++,source:u,hero:u.hero.id,state,phase,x:u.x,y:u.y,time:g.time,...extra});};
const fx=(g,u,state,p=u,r=80,d=.7)=>g.fx('ring',p.x,p.y,u.hero.color,r*scale(g),d,{hero:u.hero.id,state});

export function castColossus(g,index,aim,h){
 const u=g.player,id=u.hero.id,k=scale(g),targeting=colossusTargeting(u,index),targeted=targeting==='Unit';
 if(!u.alive||g.winner!==null||u.stun>0||u.charm>0||u.silence>0||u.castUntil>g.time||u.dash||u.skills[index]>0||!canCastWithAugments(u,index))return false;
 if(index===3&&u.root>0)return false;
 if(targeted&&(!aim?.alive||aim.team===u.team||!['hero','minion'].includes(aim.kind)||dist(u,aim)>colossusRange(u,index)*k+aim.radius))return false;
 if(!targeted&&!aim)aim=u;
 const cost=colossusCost(u,index);if(u.mp<cost)return false;u.mp-=cost;u.skills[index]=colossusCooldown(u,index)*combatCooldownMultiplier(u,index);h.cancelAttack(u);g.shopHistory=[];
 const state='qwer'[index],from={x:u.x,y:u.y},d=dist(u,aim)||1,dir={x:(aim.x-u.x)/d,y:(aim.y-u.y)/d};u.facing=Math.atan2(dir.x,dir.y);u.animation=state;u.animationSerial++;u.animUntil=g.time+.6;u.castUntil=g.time+.2;h.combatEvent(g,u,state,'cast',{aim:{x:aim.x,y:aim.y},from});augmentOnCast(g,u,index,aim,from);
 const hit=(v,n,type='magic',extra={})=>h.hit(g,{source:u,effectState:state,spellName:id+state.toUpperCase(),damageType:type,...extra},v,n);
 if(id==='Malphite'){
  if(index===0){h.missile(g,u,'SeismicShard','q',aim,{target:aim,range:625,damage:sourceValue(u,0,'BaseDamage',70)+(u.ap||0)*.6,damageType:'magic',slow:3,slowPercent:sourceValue(u,0,'SpeedSteal',20)/100,onHit:()=>{u.malphiteSpeedUntil=g.time+3;u.malphiteSpeedBonus=sourceValue(u,0,'SpeedSteal',20)/100;fx(g,u,'q',aim,55);}});}
  if(index===1){u.malphiteWFirst=true;u.malphiteWUntil=g.time+sourceValue(u,1,'ThunderclapBuffDuration',5);u.cd=0;fx(g,u,'w',u,70,1);}
  if(index===2)h.schedule(g,u,.2,()=>{for(const v of enemies(g,u))if(dist(u,v)<=400*k+v.radius){hit(v,sourceValue(u,2,'BaseDamage',60)+(u.ap||0)*.6+(u.armor||0)*.4);v.malphiteCrippleUntil=g.time+sourceValue(u,2,'Duration',3);v.malphiteCripple=sourceValue(u,2,'ASReduction',30)/100;}fx(g,u,'e',u,400,.5);});
  if(index===3){const to=point(g,u,aim,1000),duration=Math.max(.18,dist(u,to)/(1500*k));u.unstoppableUntil=g.time+duration;u.castUntil=g.time+duration;u.animUntil=g.time+duration;u.dash={kind:'malphiteR',from,to,start:g.time,duration,done:()=>{for(const v of enemies(g,u))if(dist(v,to)<=325*k+v.radius){const landed=hit(v,sourceValue(u,3,'BaseDamage',200)+(u.ap||0)*.9);if(landed===false||!v.alive||v.unstoppableUntil>g.time||mundoPreventControl(g,v,1.5)===0)continue;v.airborne=Math.max(v.airborne||0,1.5);v.airborneTotal=1.5;v.airborneSourceId=u.id;v.airborneAbility='r';v.stun=Math.max(v.stun||0,1.5);}fx(g,u,'r',to,325,1);}};}
 }else{
  if(index===0){const to=point(g,u,aim,475),duration=.35;u.castUntil=g.time+duration;u.animUntil=g.time+duration;u.dash={kind:'heraldLeap',from,to,start:g.time,duration,done:()=>{for(const v of enemies(g,u))if(dist(v,to)<=210*k+v.radius)hit(v,90+u.damage*.8,'physical');fx(g,u,'q',to,210,.6);}};}
  if(index===1)h.schedule(g,u,.25,()=>{for(const v of enemies(g,u))if(dist(v,u)<=375*k+v.radius){hit(v,110+u.damage*.9,'physical');v.slow=Math.max(v.slow||0,1.5);}fx(g,u,'w',u,375,.6);});
  if(index===2){shieldUnit(g,u,u,u.maxHp*.18,4,{state:'e'});u.heraldGazeUntil=g.time+4;fx(g,u,'e',u,120,1);}
  if(index===3){const to=point(g,u,aim,1100),duration=Math.max(.35,dist(u,to)/(1100*k));u.unstoppableUntil=g.time+duration;u.castUntil=g.time+duration;u.animUntil=g.time+duration;u.dash={kind:'heraldCharge',from,to,start:g.time,duration,done:()=>{for(const v of g.enemies(u))if(dist(v,to)<=300*k+v.radius){const structure=!['hero','minion'].includes(v.kind);g.hurt(v,(structure?500:180)+u.damage,u,structure?0:1,0,'physical',false,{state:'r'});}fx(g,u,'r',to,300,1);}};}
 }
 return true;
}
export function updateColossus(g,u){if(u.hero?.id==='Malphite'){u.malphiteMoveMultiplier=u.malphiteSpeedUntil>g.time?1+(u.malphiteSpeedBonus||0):1;const wanted=u.maxHp*.1;if(g.time-(u.malphiteLastDamaged??-99)>=8&&u.shield<wanted){u.shield=wanted;u.shieldTime=1e9;fx(g,u,'passive',u,70,.5);}}}
export function beforeColossusDamage(g,v,source,damage){if(damage>0&&v.hero?.id==='Malphite'&&source?.team!==v.team)v.malphiteLastDamaged=g.time;}
export function colossusAttack(g,u,v,h){
 const critical=g.random()<(u.crit||0);let damage=(u.damage+augmentAttackDamage(u))*(critical?(u.critDamageMultiplier||1.75):1),state='attack';
 if(u.hero.id==='Malphite'&&u.malphiteWUntil>g.time){
  state='w';const first=u.malphiteWFirst;u.malphiteWFirst=false;
  const n=sourceValue(u,1,first?'ThunderclapBaseDamage':'ThunderclapSplashDamage',first?30:15)+(u.ap||0)*sourceValue(u,1,first?'ThunderclapBaseDamageAPRatio':'ThunderclapSplashAP',first?.2:.3)+(u.armor||0)*.15;
  h.hit(g,{source:u,effectState:'w',damageType:'physical',basic:true,critical},v,damage);
  h.hit(g,{source:u,effectState:'w',damageType:'physical',basic:false},v,n);
  for(const t of enemies(g,u))if(t!==v&&dist(t,v)<=sourceValue(u,1,'ThunderClapSplashRange',400)*scale(g)+t.radius)h.hit(g,{source:u,effectState:'w',damageType:'physical'},t,sourceValue(u,1,'ThunderclapSplashDamage',15)+(u.ap||0)*.3+(u.armor||0)*.15);
  return state;
 }
 h.hit(g,{source:u,effectState:state,spellName:u.hero.id+'BasicAttack',damageType:'physical',basic:true,critical},v,damage);return state;
}
export function malphiteArmorMultiplier(u){return u.hero?.id==='Malphite'?1+sourceValue(u,1,'BonusArmorPassive',.1)*(u.shield>0?sourceValue(u,1,'BonusArmorPassiveMultiplier',3):1):1;}
export function clearColossus(u){u.malphiteWUntil=0;u.malphiteSpeedUntil=0;u.heraldGazeUntil=0;}
