import {grantedModeHaste} from './bot-haste.js';
import {polymorphed} from './augment-fey-magic.js';
import {triggerFlashbang} from './augment-flashbang.js';
import {healUnit,notifyAllyBuff} from './combat-support.js';
import {owns,av,coreMobility,coreFlashCooldown} from './augment-core.js';
import {itemStasis} from './item-effects.js';
import {unitsPerNative,cancelAttack,combatEvent,missile} from './native-combat.js';
import {URF_ABILITY_HASTE} from './urf-rules.js?v=hextech-aram-3';
import {augmentOnCast} from './augment-rules.js?v=hextech-aram-3';
// Riot Data Dragon 13.24.1 base values; URF 300 haste: Riot patch 11.3.
export const SUMMONERS={
 flash2:{name:'第二个闪现',baseCooldown:60,range:400,icon:'assets/ui/flash.png',description:'闪闪现现提供的第二个闪现，基础冷却60秒'},
 flash:{name:'闪现',baseCooldown:300,range:400,icon:'assets/ui/flash.png',description:'朝指针位置闪烁，最远 400 游戏单位；近点不会强制闪到最远处'},
 heal:{name:'治疗术',baseCooldown:240,range:850,icon:'assets/ui/heal.png',description:'为自身及一位友军恢复 80–318 生命，提供 1 秒 30% 移速；不恢复法力'},
 mark:{name:'标记／冲刺',baseCooldown:80,range:1600,icon:'assets/ui/mark.png',description:'雪球命中第一个敌人并标记 3 秒；再次施放冲刺至目标，造成真实伤害'}
};
export const summonerId=(u,index)=>u.summoners?.[index-4]||['flash','heal'][index-4];
export const summonerCooldown=(g,id)=>SUMMONERS[id].baseCooldown*100/(100+grantedModeHaste(g.player)+(owns(g.player,'Flash2')?av('Flash2','SummonerHaste'):0)+(id==='mark'?(g.player?.augmentSnowballHaste||0):0));
export const summonerDescription=(g,index)=>{const id=summonerId(g.player,index),d=SUMMONERS[id];return [d.name,d.description,Math.round(summonerCooldown(g,id)*10)/10,0];};
export function castSummoner(g,index,aim){
 const u=g.player,id=summonerId(u,index),d=SUMMONERS[id],k=unitsPerNative(g);if(!d||!u.alive||itemStasis(g,u)||g.winner!==null)return false;
 const locked=polymorphed(g,u)||u.stun>0||u.charm>0||u.root>0||u.silence>0||u.grounded>0;
 if(id==='mark'&&u.snowballMark?.until>g.time&&u.snowballMark.target.alive){if(locked)return false;const t=u.snowballMark.target;u.snowballMark=null;cancelAttack(u);u.dest=null;const from={x:u.x,y:u.y},distance=Math.hypot(t.x-u.x,t.y-u.y);u.dash={from,to:{x:t.x,y:t.y},trackTarget:t,start:g.time,duration:Math.max(.08,distance/(2500*k)),done:()=>{if(owns(u,'GoldenSnowball'))u.augmentInvulnerableUntil=g.time+av('GoldenSnowball','InvulnerabilityDuration');if(t.alive){g.hurt(t,10+5*u.level,u,0,0,'true',false,{state:'mark',hitEffect:'Summoner_Snowball_Explosion'});combatEvent(g,u,'mark','summonerDashHit',{hero:'Summoner',target:t,x:t.x,y:t.y});}}};u.skills[index]=Math.max(0,u.skills[index]-summonerCooldown(g,id)*.25);combatEvent(g,u,'mark','summonerDash',{hero:'Summoner',from,target:t});return true;}
 if(u.skills[index]>0||id!=='heal'&&locked)return false;
 const event=(phase,extra={})=>combatEvent(g,u,id,phase,{hero:'Summoner',...extra});
 if(id==='flash'||id==='flash2'){
  const dx=(aim?.x??u.x)-u.x,dy=(aim?.y??u.y)-u.y,dist=Math.hypot(dx,dy);if(dist<.01)return false;
  const r=Math.min(d.range*k,dist),from={x:u.x,y:u.y};let to={x:u.x+dx/dist*r,y:u.y+dy/dist*r};
  if(g.navigation&&!g.navigation.canWalk(to.x,to.y)){to=g.navigation.snap(to.x,to.y);if(Math.hypot(to.x-u.x,to.y-u.y)>d.range*k+150*k)return false;}
  cancelAttack(u);u.x=to.x;u.y=to.y;u.dest=null;u.dash=null;u.order='idle';event('summonerBlink',{from,to});augmentOnCast(g,u,-1,to,from);coreMobility(g,u);
 }else if(id==='heal'){
  const allies=g.units.filter(t=>t!==u&&t.alive&&t.kind==='hero'&&t.team===u.team&&Math.hypot(t.x-u.x,t.y-u.y)<=d.range*k);
  const target=allies.find(t=>t.id===aim?.id)||allies.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  for(const t of [u,target].filter(Boolean)){let healing=80+14*(Math.min(18,Math.max(1,u.level))-1);if(t.healReductionUntil>g.time)healing*=.5;if(t!==u&&g.mapConfig)healing*=.5;healUnit(g,u,t,healing,{state:'heal'});t.healReductionUntil=g.time+35;t.summonerSpeed=1;notifyAllyBuff(g,u,t);event('summonerHeal',{target:t,x:t.x,y:t.y});}
 }else{
  cancelAttack(u);const p=missile(g,u,'SummonerSnowball','mark',aim,{range:d.range,damage:10+5*u.level,damageType:'true',filter:t=>['hero','minion'].includes(t.kind),missileEffect:'ha_summonersnowball_throw',hitEffect:'Summoner_Snowball_Explosion',speed:1200*k,minSpeed:1200*k,maxSpeed:1200*k,r:50*k,acceleration:0,onHit:t=>{if(owns(u,'ARAM_Snowday'))g.hurt(t,(10+5*u.level)*av('ARAM_Snowday','DamageAmp'),u,0,0,'magic',false,{augmentProc:true,state:'mark'});if(owns(u,'BiggestSnowballEver')&&t.kind==='hero'){g.hurt(t,(u.ap||0)*av('BiggestSnowballEver','APRatio')+Math.max(0,u.damage-u.hero.damage)*av('BiggestSnowballEver','bADRatio'),u,0,0,'magic',false,{augmentProc:true,state:'mark'});if(t.unstoppableUntil<=g.time||!t.unstoppableUntil){t.airborne=av('BiggestSnowballEver','KnockUpDuration');t.airborneTotal=t.airborne;t.airborneSourceId=u.id;t.airborneAbility='mark';t.stun=Math.max(t.stun||0,t.airborne);}t.slow=av('BiggestSnowballEver','SlowDuration');t.slowPercent=av('BiggestSnowballEver','MoveSpeedModTooltip');}u.snowballMark={target:t,until:g.time+3};event('summonerMark',{target:t,x:t.x,y:t.y});}});if(owns(u,'BiggestSnowballEver')){p.r*=2;p.filter=t=>t.kind==='hero';}const angle=Math.atan2(aim.y-u.y,aim.x-u.x);p.vx=Math.cos(angle)*p.speed;p.vy=Math.sin(angle)*p.speed;event('summonerCast');
 }
 u.skills[index]=coreFlashCooldown(g,u,id,summonerCooldown(g,id));if(id==='flash'||id==='flash2')triggerFlashbang(g,u);g.shopHistory=[];return true;
}
