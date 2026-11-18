import {COMBAT_DATA} from './combat-data.js';
import {augmentOnCast,canCastWithAugments,combatCooldownMultiplier} from './augment-rules.js';
const spec=i=>COMBAT_DATA.MissFortune.spells[COMBAT_DATA.MissFortune.abilityNames[i]].data;
export const mfValue=(u,i,n,f=0)=>spec(i).DataValues?.find(v=>v.name===n)?.values?.[u.spellRanks?.[i]||1]??f;
const k=g=>1/(g.mapConfig?.scale||2),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const foes=(g,u)=>g.enemies(u).filter(v=>['hero','minion'].includes(v.kind));
const effect=(g,u,name,p=u,d=.6)=>g.fx('native',p.x,p.y,u.hero.color,40,d,{hero:'MissFortune',nativeName:name,nativeDuration:d,follow:p===u?u:null,nativeGround:p!==u});
export function cancelMissFortune(g,u){if(!u?.mfChannel)return;u.mfChannel=null;u.castUntil=g.time;u.animUntil=g.time;u.animation='idle';}
export function missFortuneLoveTap(g,u,v,h){
 if(u.mfLastTarget===v.id)return 0;u.mfLastTarget=v.id;
 const ratio=.5+[4,7,9,11,13,20,25,30].filter(l=>u.level>=l).length*.1;
 const n=u.damage*ratio*(v.kind==='minion'?.5:1);
 if(v.alive)h.hit(g,{source:u,effectState:'passive',damageType:'physical',basic:false,hitEffect:'MissFortune_Base_P_Tar'},v,n);
 u.skills[1]=Math.max(0,u.skills[1]-mfValue(u,1,'LoveTapBaseRefund',2)*combatCooldownMultiplier(u,1));
 effect(g,u,'MissFortune_Base_P_Mark',v,1);h.combatEvent(g,u,'passive','cast',{target:v});return n;
}
export function mfAttackOptions(g,u,v,h){return{hitEffect:'MissFortune_Base_BA_Tar',missileEffect:'MissFortune_Base_BA_mis',onHit:target=>missFortuneLoveTap(g,u,target,h)};}
export function castMissFortune(g,i,aim,h){
 const u=g.player,scale=k(g);
 if(!u.alive||g.winner!==null||u.stun>0||u.silence>0||u.charm>0||u.dash||u.mfChannel||u.castUntil>g.time||u.skills[i]>0||!canCastWithAugments(u,i))return false;
 if(i===0&&(!aim?.alive||aim.team===u.team||!['hero','minion'].includes(aim.kind)||!g.canHit(aim)||dist(u,aim)>550*scale+aim.radius))return false;
 if(i!==1&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 const cost=spec(i).mana[(u.spellRanks?.[i]||1)-1];if(u.mp<cost){g.notice('法力不足',u);return false;}u.mp-=cost;u.skills[i]=spec(i).Cooldown.values[u.spellRanks?.[i]||1]*combatCooldownMultiplier(u,i);
 const from={x:u.x,y:u.y},length=dist(u,aim||u)||1,dir={x:((aim?.x??u.x)-u.x)/length,y:((aim?.y??u.y)-u.y)/length};if(Math.hypot(dir.x,dir.y)<.01){dir.x=Math.sin(u.facing||0);dir.y=Math.cos(u.facing||0);}
 h.cancelAttack(u);g.shopHistory=[];u.animation='qwer'[i];u.animationSerial++;u.castUntil=g.time+(i===1?0:.25);u.animUntil=g.time+.4;u.facing=Math.atan2(dir.x,dir.y);const event=h.combatEvent(g,u,'qwer'[i],'cast',{from,aim:{x:aim?.x??u.x,y:aim?.y??u.y}});augmentOnCast(g,u,i,aim||u,from);
 if(i===0){
  const target=aim,amount=mfValue(u,0,'BaseDamage')+u.damage*mfValue(u,0,'ADRatio',1)+(u.ap||0)*mfValue(u,0,'APRatio',.35);
  h.schedule(g,u,.25,()=>{if(!target.alive)return;h.missile(g,u,'MissFortuneRicochetShot','q',target,{target,range:25000,damage:amount,damageType:'physical',missileEffect:'MissFortune_Base_Q_Mis',hitEffect:'MissFortune_Base_Q_Tar',onHit:v=>{
   missFortuneLoveTap(g,u,v,h);const killed=!v.alive;
   const candidates=foes(g,u).filter(t=>t!==v&&dist(t,v)<=500*scale+t.radius&&((t.x-v.x)*dir.x+(t.y-v.y)*dir.y)>0&&((t.x-v.x)*dir.x+(t.y-v.y)*dir.y)/(dist(t,v)||1)>=Math.cos(Math.PI/3));
   candidates.sort((a,b)=>(a.kind==='hero'?0:1)-(b.kind==='hero'?0:1)||dist(a,v)-dist(b,v));const next=candidates[0];if(!next)return;
   const critical=killed||g.random()<(u.crit||0),mult=critical?1+mfValue(u,0,'BounceCriticalMod',.5)*((u.critDamageMultiplier||1.75)-1):1;
   h.missile(g,u,'MissFortuneRicochetShot','q',next,{x:v.x,y:v.y,fromX:v.x,fromY:v.y,target:next,range:25000,damage:amount*mult,critical,damageType:'physical',missileEffect:'MissFortune_Base_Q_Mis',hitEffect:killed?'MissFortune_Base_Q_Tar_killed':'MissFortune_Base_Q_second_tar',onHit:t=>missFortuneLoveTap(g,u,t,h)});
  }});});
 }
 if(i===1){u.animation='idle';u.mfWUntil=g.time+mfValue(u,1,'ActiveDuration',4);u.mfLastDamaged=g.time-7;effect(g,u,'MissFortune_Base_W_buf',u,4);effect(g,u,'MissFortune_Base_W_MaxStart');}
 if(i===2){const range=Math.min(length,1000*scale),p={x:u.x+dir.x*range,y:u.y+dir.y*range},duration=mfValue(u,2,'BaseDuration',2),start=g.time+mfValue(u,2,'CastDelay',.25);g.zones.push({id:g.counter++,kind:'mfRain',source:u,x:p.x,y:p.y,r:350*scale,age:0,duration:duration+.25,start,nextTick:start+.25,until:start+duration});effect(g,u,'MissFortune_Base_E_cas',p,duration+.25);h.combatEvent(g,u,'e','zoneStart',{zone:{kind:'mfRain',duration},x:p.x,y:p.y});}
 if(i===3){const duration=mfValue(u,3,'BaseChannelDuration',3);u.dest=null;u.target=null;u.mfChannel={from,dir,start:g.time,until:g.time+duration,nextTick:g.time,waves:mfValue(u,3,'BaseWaves',14),emitted:0};u.castUntil=g.time+duration;u.animUntil=u.castUntil;event.channelUntil=u.castUntil;}
 return true;
}
export function updateMissFortuneWorld(g,dt,h){
 for(const z of g.zones||[])if(z.kind==='mfRain'){
  while(z.nextTick<=g.time+1e-8&&z.nextTick<=z.until+1e-8){z.nextTick+=.25;for(const v of foes(g,z.source))if(dist(z,v)<=z.r+v.radius)h.hit(g,{source:z.source,effectState:'e',damageType:'magic',periodic:true,slow:.35,slowPercent:Math.min(.95,mfValue(z.source,2,'BaseSlowAmount',.4)+(z.source.ap||0)*mfValue(z.source,2,'SlowPer100AP',.0006)),hitEffect:'MissFortune_Base_E_Unit_Tar'},v,(mfValue(z.source,2,'BaseDamagePerSecond',35)+(z.source.ap||0)*mfValue(z.source,2,'APRatioPerSecond',.6))*.25);}
 }
 for(const u of g.units){if(u.hero?.id!=='MissFortune'&&!(u.sylasBorrowedR?.id==='MissFortune'&&u.mfChannel))continue;
  const c=u.mfChannel;if(!c)continue;
  if(!u.alive||u.stun>0||u.charm>0||u.silence>0||u.airborne>0||u.forcedMove||u.itemStasisUntil>g.time){cancelMissFortune(g,u);continue;}
  while(c.nextTick<=g.time+1e-8&&c.emitted<c.waves){c.emitted++;c.nextTick=c.start+c.emitted*3/c.waves;const scale=k(g),angle=Math.atan2(c.dir.y,c.dir.x),critical=g.random()<(u.crit||0),damage=(mfValue(u,3,'BaseDamage',20)+u.damage*mfValue(u,3,'tADRatio',.6)+(u.ap||0)*mfValue(u,3,'APRatio',.25))*(critical?1+mfValue(u,3,'CritDamageMultiplier',.3)*((u.critDamageMultiplier||1.75)-1):1);
   for(const v of foes(g,u)){const along=(v.x-c.from.x)*c.dir.x+(v.y-c.from.y)*c.dir.y,d=dist(v,c.from);if(d<=1400*scale+v.radius&&along>=0&&along/(d||1)>=Math.cos(Math.PI/6)&&!h.windwallBlocks(g,{x:v.x,y:v.y,source:u,r:0,life:1},c.from))h.hit(g,{source:u,effectState:'r',damageType:'physical',periodic:true,critical,hitEffect:'MissFortune_Base_R_Tar'},v,damage);}
   for(let j=-2;j<=2;j++){const a=angle+j*Math.PI/12;h.missile(g,u,'MissFortuneRShotExtra','r',{x:u.x+Math.cos(a)*100,y:u.y+Math.sin(a)*100},{range:1400,damage:0,noCollision:true,speed:2000*scale,minSpeed:2000*scale,maxSpeed:2000*scale,acceleration:0,missileEffect:'MissFortune_Base_R_mis'});}
  }
  if(g.time>=c.until)cancelMissFortune(g,u);
 }
}
export function mfStatModifiers(g,u){
 if(u.hero?.id!=='MissFortune')return{as:0,move:0};
 const elapsed=g.time-(u.mfLastDamaged??0),move=elapsed>=7?mfValue(u,1,'PassiveMaxMS',60):elapsed>=4?mfValue(u,1,'PassiveBaseMS',30):0;
 return{as:u.mfWUntil>g.time?mfValue(u,1,'ActiveAS',.4):0,move};
}
