import {equipmentReadyAt} from './item-cooldown.js';
import {healUnit} from './combat-support.js';
const inventory=(g,u)=>u.netPeerId?(u.inventoryItems||[]):u===g.player?(g.items||[]):(u.inventoryItems||[]);
const has=(g,u,id)=>inventory(g,u).includes(id),baseHp=u=>u.hero.hp+Math.max(0,u.level-3)*70;
const state=u=>u.modernItems??={};
let refreshStats=()=>{};
export const setModernStatRefresher=fn=>{refreshStats=fn;};
export function modernBonuses(g,u,ids){const s=state(u);return{omnivamp:(ids.includes('1086')?.015:0)+(ids.includes('3008')?.04+.006*(s.gluttony||0):0)};}
export function modernPostStats(g,u,ids){u.modernBloodmailAD=0;if(ids.includes('2501')){const added=Math.max(0,u.maxHp-baseHp(u))*.025;const scaled=(u.damage+added)*(.12*Math.min(1,Math.max(0,1-u.hp/u.maxHp)/.7));u.modernBloodmailAD=added+scaled;u.damage+=u.modernBloodmailAD;}}
export function modernAttackDamage(g,u,v,damage,basic,meta){if(u?.hero&&v.hero&&u.team!==v.team&&damage>0)state(u).lastCombat=g.time;return basic&&meta.itemAttack!==false&&v.kind==='minion'&&has(g,u,'1120')?damage+5:damage;}
export function modernAbsorb(g,u,damage,type){if(!u.hero)return damage;const s=state(u);if(type==='magic'&&damage>0){s.lastMagic=g.time;if(has(g,u,'2504')){const spent=Math.min(damage,s.kaenicShield||0);s.kaenicShield=Math.max(0,(s.kaenicShield||0)-spent);damage-=spent;}}return damage;}
export function beginGuardianRevive(g,u,damage){
 if(!u.hero||damage<u.hp||!has(g,u,'3026')||g.winner!==null)return damage;
 const s=state(u);if(g.time<(s.guardianCooldown||0)||s.guardianUntil)return damage;
 s.guardianCooldown=equipmentReadyAt(g,u,300);s.guardianUntil=g.time+4;s.guardianPosition={x:u.x,y:u.y};
 u.itemStasisUntil=g.time+4;u.attackWindup=null;u.dest=null;u.target=null;u.order='stop';u.dash=null;u.forcedMove=null;u.mfChannel=null;u.castUntil=g.time+4;u.animation='death';u.animationSerial++;u.animUntil=g.time+4;
 for(const v of g.units)if(v.forcedMove?.holder===u)v.forcedMove=null;
 g.fx('ring',u.x,u.y,'#d6ddff',70,4,{guardianRevive:true,follow:u});
 return Math.max(0,u.hp-1);
}
export function modernTakedown(g,u,eventId){if(!u?.hero||!has(g,u,'3008'))return;const s=state(u);if(s.lastTakedown===eventId)return;s.lastTakedown=eventId;s.gluttony=Math.min(10,(s.gluttony||0)+1);refreshStats(g,u,inventory(g,u));}
export function modernLabel(g,u,id){const s=state(u);if(id==='3026')return s.guardianUntil?`复活 ${Math.ceil(s.guardianUntil-g.time)}秒`:s.guardianCooldown>g.time?`冷却 ${Math.ceil(s.guardianCooldown-g.time)}秒`:'重生就绪';if(id==='3008')return `${s.gluttony||0}/10`;if(id==='2504')return `魔法盾 ${Math.ceil(s.kaenicShield||0)}`;return '';}
export function updateModernItems(g,dt){
 for(const u of g.units){if(!u.hero)continue;const ids=inventory(g,u),s=state(u);
  if(s.guardianUntil&&g.time>=s.guardianUntil){s.guardianUntil=0;u.hp=Math.max(1,Math.min(u.maxHp,baseHp(u)*.5));u.mp=u.noMana?0:u.maxMp;u.itemStasisUntil=0;u.castUntil=0;u.animUntil=0;u.animation='idle';u.stun=u.slow=u.silence=u.root=u.charm=u.airborne=0;u.fearUntil=0;u.x=s.guardianPosition.x;u.y=s.guardianPosition.y;g.fx('ring',u.x,u.y,'#f7edc4',90,.8);}
  if(!u.alive||s.guardianUntil)continue;
  if(ids.includes('2504')){if(!s.kaenicOwned){s.kaenicOwned=true;s.lastMagic=g.time-15;}if(g.time-(s.lastMagic??g.time)>=15)s.kaenicShield=u.maxHp*.15;}else{s.kaenicOwned=false;s.kaenicShield=0;}
  if(ids.includes('2501')){const old=u.modernBloodmailAD||0;u.damage-=old;modernPostStats(g,u,ids);}else if(u.modernBloodmailAD){u.damage-=u.modernBloodmailAD;u.modernBloodmailAD=0;}
  if(ids.includes('2502')&&g.time-Math.max(u.augmentLastDamaged??-99,s.lastCombat??-99)<5&&g.time>=(s.drainNext||0)){
   s.drainNext=equipmentReadyAt(g,u,4);let dealt=0;for(const v of g.units){if(v.kind!=='hero'||v.team===u.team||!v.alive||!g.canHit(v)||u.farmOnly||Math.hypot(v.x-u.x,v.y-u.y)>650/(g.mapConfig?.scale||2)+v.radius)continue;const before=v.hp;g.hurt(v,Math.max(0,u.maxHp-baseHp(u))*.03,u,0,0,'magic',false,{itemProc:true,augmentProc:true,state:'item'});dealt+=Math.max(0,before-v.hp);}
   if(dealt>0){healUnit(g,u,u,dealt*2.5,{kind:'item'});g.fx('ring',u.x,u.y,'#bc5978',325,.5);}
  }
 }
}
