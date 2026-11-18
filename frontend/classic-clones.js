import {updateForcedMovement} from './extra-champions.js';
import {calculation} from './classic-calculations.js';
// Ability-owned, stationary actors. They are not room bots or scoreboard players.
import {state,value,distance,scale,knockup} from './classic-common.js';
import {canInteract,realmId} from './classic-realms.js';
export function spawnMonkeyClone(g,u){
 const c=g.hero(u.hero,u.team,u.slot,false);
 Object.assign(c,{kind:'clone',model:'MonkeyKing',classicClone:true,cloneOwner:u,cloneExpires:g.time+value(u,1,'CloneDuration',4),cloneDamageRatio:value(u,1,'CloneDamageMod',.4),classicRealmId:realmId(u),x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,armor:u.armor,mr:u.mr,damage:u.damage,ap:u.ap,period:u.period,range:u.range,crit:u.crit,nativeCombat:false,autoAttack:false,player:false,speed:0,order:'stop',dest:null,target:null,cloneNextAttack:g.time+.25});
 c.cloneQUntil=state(u).qUntil||0;if(state(u).spin)c.cloneSpin={...state(u).spin};return c;
}
export function updateClassicClones(g,dt,h){
 for(const c of g.units.filter(u=>u.classicClone)){
  const owner=c.cloneOwner;
  if(!c.alive||g.time>=c.cloneExpires||!owner||!canInteract(c,owner)){c.alive=false;c.hp=0;continue;}
  c.airborne=Math.max(0,(c.airborne||0)-dt);c.root=Math.max(0,(c.root||0)-dt);
  c.stun=Math.max(0,(c.stun||0)-dt);c.silence=Math.max(0,(c.silence||0)-dt);
  if(updateForcedMovement(g,c))continue;
  if(c.cloneSpin){const spin=c.cloneSpin,tick=value(owner,3,'SecondsPerTick',.25);
   while(spin.nextTick<=g.time+1e-9&&spin.nextTick<=spin.until+1e-9){spin.nextTick+=tick;for(const target of g.enemies(c))if(['hero','minion','clone'].includes(target.kind)&&distance(c,target)<=315*scale(g)+target.radius){const n=(calculation(owner,3,'DamagePerSecondTotal')+target.maxHp*value(owner,3,'BasePercentMaxHPDmgPerSec'))*tick*c.cloneDamageRatio;h.hit(g,{source:owner,effectState:'cloneR',audioCue:'MonkeyKingSpinToWin_hit',castToken:spin.token,damageType:'physical',periodic:true,aoe:true,itemAttack:false,onHit:v=>{if(!spin.hits.has(v.id)){spin.hits.add(v.id);knockup(g,owner,v,value(owner,3,'KnockupDuration',.6));}}},target,n);}}
   c.animation='r';c.animUntil=spin.until;if(g.time>=spin.until)c.cloneSpin=null;else continue;
  }
  if(c.stun>0||c.cloneNextAttack>g.time)continue;
  const valid=v=>v?.alive&&v.team!==c.team&&canInteract(c,v)&&g.canHit(v)&&!v.teemoStealth&&['hero','minion','clone'].includes(v.kind)&&distance(c,v)<=(owner.nativeRange+(c.cloneQUntil>g.time?value(owner,0,'AttackRangeBonus',135):0))*scale(g)+c.radius+v.radius;
  let target=state(owner).cloneTarget;if(!valid(target))target=g.enemies(c).filter(valid).sort((a,b)=>distance(c,a)-distance(c,b))[0];if(!target)continue;
  c.cloneNextAttack=g.time+Math.max(.1,owner.period);c.target=target;c.animation=c.cloneQUntil>g.time?'crit':'attack';c.animationSerial++;c.animUntil=g.time+.3;c.facing=Math.atan2(target.x-c.x,target.y-c.y);
  const empowered=c.cloneQUntil>g.time;h.combatEvent(g,c,'attack','attackStart',{target,audioCue:empowered?'MonkeyKingQAttack_OnCast':'MonkeyKingBasicAttack_OnCast'});
  c.cloneQUntil=0;
  h.hit(g,{source:owner,effectState:empowered?'cloneQ':'cloneAttack',audioCue:empowered?'MonkeyKingQAttack_OnHit':'MonkeyKingBasicAttack_OnHit',damageType:'physical',itemAttack:false,onHit:v=>{owner.skills[0]=Math.max(0,owner.skills[0]-value(owner,0,'CooldownDecrease',.5));if(empowered)v.classicArmorShred={until:g.time+value(owner,0,'ShredDuration',3),amount:value(owner,0,'ArmorShredPercent',.1)};}},target,(owner.damage+(empowered?calculation(owner,0,'TotalDamage'):0))*c.cloneDamageRatio);
 }
 const expired=new Set(g.units.filter(u=>u.classicClone&&!u.alive));
 if(expired.size){g.units=g.units.filter(u=>!expired.has(u));for(const u of g.units){if(expired.has(u.target))u.target=null;if(expired.has(u.attackWindup?.target))u.attackWindup=null;}}
}

export function mirrorMonkey(g,u,slot){for(const c of g.units)if(c.classicClone&&c.cloneOwner===u&&c.alive&&c.cloneExpires>g.time&&canInteract(c,u)){
 if(slot===0){c.cloneQUntil=state(u).qUntil;c.cloneNextAttack=g.time;}
 if(slot===3){c.cloneSpin={...state(u).spin};c.animation='r';c.animationSerial++;c.animUntil=c.cloneSpin.until;}
}}
