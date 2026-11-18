import {healUnit} from './combat-support.js';
import {calculation} from './classic-calculations.js';
import {inCone,lineEnd,segmentDistance} from './classic-geometry.js';
import {state,scale,distance,value,bonusAD,unitTarget,canCast,beginCast,cue,dash,push,knockup,damage,enemies,clamp} from './classic-common.js';
function challenge(g,u,v){if(v.kind==='hero'){state(u).challengeId=v.id;state(u).challengeUntil=g.time+value(u,3,'MarkDuration',3);}}
export function castXinZhao(g,i,aim,h){
 const u=g.player,s=state(u);if(!canCast(g,u,i))return false;
 if(i===1&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 const range=aim?.classicXinMarked?.[u.id]>g.time?1100:650;
 if(i===2&&(!unitTarget(g,u,aim,range)||u.root>0||u.grounded>0))return false;
 beginCast(g,u,i,aim,h);
 if(i===0){s.qHits=3;s.qUntil=g.time+5;u.cd=0;cue(g,u,'XinZhao_Base_Q_Cas',u,5);}
 if(i===1){
  const from={x:u.x,y:u.y},to=lineEnd(u,aim,1000*scale(g)),duration=clamp(.5/(1+(u.itemAttackSpeed||0)*.5),.35,.5);u.castUntil=g.time+duration;cue(g,u,'XinZhao_Base_W_BodySwirl_Cas',u,duration);
  const minionMultiplier=v=>v.kind==='minion'?Math.min(1,(50+Math.max(0,u.level-1)*3.333)/100):1;
  h.schedule(g,u,duration*.45,()=>{for(const v of enemies(g,u))if(inCone(v,from,to,450*scale(g),Math.PI/3,v.radius))h.hit(g,{source:u,effectState:'w',damageType:'physical',slow:.5,slowPercent:.5,aoe:true},v,calculation(u,1,'SlashDamage')*minionMultiplier(v));cue(g,u,'XinZhao_Base_W_SlashTrail');});
  h.schedule(g,u,duration,()=>{for(const v of enemies(g,u))if(segmentDistance(v,from,to)<=70*scale(g)+v.radius)h.hit(g,{source:u,effectState:'w',audioCue:'XinZhaoWMissile_OnHit',damageType:'physical',slow:calculation(u,1,'TotalSlowDuration'),slowPercent:.5,aoe:true,onHit:target=>{cue(g,u,'XinZhao_Base_W_Thrust_tar',target);if(target.kind==='hero'){target.classicXinMarked??={};target.classicXinMarked[u.id]=g.time+value(u,1,'MarkDuration',3);s.markUntil=target.classicXinMarked[u.id];}}},v,calculation(u,1,'ThrustDamage')*minionMultiplier(v));cue(g,u,'XinZhao_Base_W_ThrustImpact',to);});
 }
 if(i===2){challenge(g,u,aim);s.eUntil=g.time+value(u,2,'ASDuration',5);dash(g,u,aim,range,{speed:1800,throughWalls:true,done:()=>{for(const v of enemies(g,u))if(distance(v,u)<=value(u,2,'AoERadius',250)*scale(g)+v.radius)h.hit(g,{source:u,effectState:'e',damageType:'magic',slow:value(u,2,'SlowDuration',.5),slowPercent:value(u,2,'SlowAmount',30)/100,aoe:true},v,calculation(u,2,'ChargeDamage'));cue(g,u,'XinZhao_Base_E_AOE_Swirl_Tar');}});u.dash.trackTarget=aim;cue(g,u,'XinZhao_Base_E_Cas');}
 if(i===3){s.rUntil=g.time+value(u,3,'MissileDefenseBaseDuration',4);
  for(const v of enemies(g,u))if(distance(v,u)<=500*scale(g)+v.radius)h.hit(g,{source:u,effectState:'r',audioCue:v.id===s.challengeId&&s.challengeUntil>g.time?'XinZhaoR_hitlocation_challenged':'XinZhaoR_hitlocation_knockback',damageType:'physical',aoe:true,onHit:target=>{if(target.id!==s.challengeId||s.challengeUntil<=g.time)push(g,u,target,600,{duration:.5});}},v,calculation(u,3,'TotalDamage')+value(u,3,'PercentCurrentHealthDamage',.15)*v.hp);
  cue(g,u,'XinZhao_Base_R_Cas');
 }
 return true;
}
export function xinAfterDamage(g,u,v,{basic,meta}){
 if(!basic||meta.classicProc)return;const s=state(u);challenge(g,u,v);s.passiveHits=(s.passiveHits||0)+1;
 if(s.passiveHits>=3){s.passiveHits=0;damage(g,u,v,calculation(u,-1,'TotalDamage'),'physical','passive');healUnit(g,u,u,calculation(u,-1,'TotalHealing'),{kind:'passive'});cue(g,u,'XinZhao_Base_W_Heal_Passive');}
 if(s.qHits>0&&s.qUntil>g.time){s.qHits--;damage(g,u,v,calculation(u,0,'BonusDamage'),'physical','q');for(const i of [1,2])u.skills[i]=Math.max(0,u.skills[i]-1);if(!s.qHits){knockup(g,u,v,value(u,0,'KnockUpDuration',.75));cue(g,u,'XinZhao_Base_Q_Knockup_Tar',v);}}
}
export function xinAS(g,u){return state(u).eUntil>g.time?value(u,2,'ASMod')+value(u,2,'APToASRatio')*(u.ap||0):0;}
export function xinBlocksDamage(g,v,source){return v.hero?.id==='XinZhao'&&state(v).rUntil>g.time&&source?.team!==v.team&&source?.kind!=='tower'&&distance(v,source)>value(v,3,'MissileDefenseRadius',450)*scale(g);}
