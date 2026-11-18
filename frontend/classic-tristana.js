import {state,scale,distance,value,bonusAD,unitTarget,canCast,beginCast,cue,dash,push,damage,enemies,clamp} from './classic-common.js';
export const tristanaRange=u=>150*clamp((u.level-1)/17,0,1);
function explode(g,u,v,bomb){
 if(v.classicTristanaBombs?.[u.id]!==bomb)return;
 delete v.classicTristanaBombs[u.id];
 const radius=value(u,2,v.kind==='tower'?'ActiveTowerRadius':'ActiveRadius',300)*scale(g);
 const amount=(value(u,2,'ActiveBaseDamage')+value(u,2,'ActiveBADRatio')*bonusAD(u)+value(u,2,'APRatio')*(u.ap||0))*(1+bomb.stacks*value(u,2,'ActivePerStackAmp',.25))*(1+(u.crit||0)*value(u,2,'CritChanceModifier',.4)*Math.max(0,(u.critDamageMultiplier||1.75)-1));
 for(const target of enemies(g,u,true))if(distance(target,v)<=radius+target.radius){damage(g,u,target,amount,'physical','e',{aoe:true});cue(g,u,target===v?(v.kind==='tower'?'Tristana_Base_E_explosion_tar_turret':'Tristana_Base_E_explosion_tar'):'Tristana_Base_E_explosion_tar_adjacent',target);}
 if(v.kind==='hero'&&bomb.stacks>=value(u,2,'ActiveMaxStacks',4))u.skills[1]=0;
 cue(g,u,'Tristana_Base_E_explosion',v);
}
function stack(g,u,v){const bomb=v.classicTristanaBombs?.[u.id];if(!bomb)return;bomb.stacks++;if(bomb.stacks>=value(u,2,'ActiveMaxStacks',4))explode(g,u,v,bomb);}
export function castTristana(g,i,aim,h){
 const u=g.player,s=state(u);if(!canCast(g,u,i))return false;
 if(i===1&&(u.root>0||u.grounded>0||!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 if(i===2&&!unitTarget(g,u,aim,550+tristanaRange(u),true))return false;
 if(i===3&&!unitTarget(g,u,aim,550+tristanaRange(u)))return false;
 beginCast(g,u,i,aim,h);
 if(i===0){s.qUntil=g.time+value(u,0,'BuffDuration',7);}
 if(i===1){
  cue(g,u,'Tristana_Base_W_launch');
  dash(g,u,aim,900,{throughWalls:true,speed:1100,done:()=>{
   for(const v of enemies(g,u))if(distance(v,u)<=value(u,1,'DamageRadius',350)*scale(g)+v.radius){h.hit(g,{source:u,effectState:'w',damageType:'magic',slow:value(u,1,'SlowDuration',2),slowPercent:Math.abs(value(u,1,'SlowMod',-.4)),aoe:true},v,value(u,1,'BaseDamage')+value(u,1,'ADRatio')*bonusAD(u)+value(u,1,'APRatio')*(u.ap||0));stack(g,u,v);}
   cue(g,u,'Tristana_Base_W_land');
  }});
 }
 if(i===2){h.missile(g,u,'TristanaE','e',aim,{target:aim,range:25000,damage:0,missileEffect:'Tristana_Base_E_mis',onHit:v=>{
  v.classicTristanaBombs??={};v.classicTristanaBombs[u.id]={source:u,stacks:0,until:g.time+value(u,2,'ActiveDuration',4)};
 }});}
 if(i===3){h.missile(g,u,'TristanaR','r',aim,{target:aim,range:25000,damage:value(u,3,'BaseDamage')+.7*bonusAD(u)+value(u,3,'APRatio')*(u.ap||0),damageType:'magic',missileEffect:'Tristana_Base_R_mis',hitEffect:'Tristana_Base_R_tar',onHit:v=>{
  const nearby=enemies(g,u).filter(t=>distance(t,v)<=value(u,3,'KnockbackArea',200)*scale(g)+t.radius);stack(g,u,v);
  for(const t of nearby){const result=push(g,u,t,value(u,3,'KnockbackDistance'));if(result.moved)t.stun=Math.max(t.stun||0,value(u,3,'StunDuration',.4));}
 }});}
 return true;
}
export function tristanaAfterDamage(g,u,v,{basic,meta}){
 if(!basic||meta.classicProc)return;
 stack(g,u,v);
 if(!v.alive&&v.kind==='minion'){
  for(const target of enemies(g,u))if(distance(target,v)<=value(u,2,'PassiveRadius',300)*scale(g)+target.radius)damage(g,u,target,value(u,2,'PassiveBaseDamage')+.25*(u.ap||0),'magic','passive',{aoe:true});
  cue(g,u,'Tristana_Base_P_Explosion',v);
 }
}
export function updateTristanaBombs(g){for(const v of g.units)for(const bomb of Object.values(v.classicTristanaBombs||{}))if(bomb.until<=g.time||!v.alive)explode(g,bomb.source,v,bomb);}
export function tristanaTargetDeath(g,v){for(const bomb of Object.values(v.classicTristanaBombs||{}))explode(g,bomb.source,v,bomb);}
