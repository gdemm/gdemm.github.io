import {realmId} from './classic-realms.js';
import {shieldUnit} from './combat-support.js';
import {calculation} from './classic-calculations.js';
import {lineEnd,segmentDistance} from './classic-geometry.js';
import {state,scale,distance,value,passiveValue,effectValue,bonusAD,unitTarget,canCast,beginCast,cue,dash,knockup,damage,enemies,slowUnit} from './classic-common.js';
function eqContact(g,u,h,from,to){const s=state(u);for(const v of enemies(g,u))if(!s.eqHits.includes(v.id)&&segmentDistance(v,from,to)<=value(u,2,'EKnockUpAoE',180)*scale(g)*.5+v.radius){s.eqHits.push(v.id);h.hit(g,{source:u,effectState:'q',onHit:t=>knockup(g,u,t,.75)},v,0);}}
export function castJarvan(g,i,aim,h){
 const u=g.player,s=state(u),wall=(g.zones||[]).find(z=>z.kind==='jarvanWall'&&z.source===u&&z.age<z.duration);
 if(i===3&&wall){if(!canCast(g,u,i,{ignoreCooldown:true,ignoreCost:true}))return false;wall.age=wall.duration;s.wallUntil=0;cue(g,u,'JarvanIV_Base_R_Wall_death_01',wall);return true;}
 if(!canCast(g,u,i))return false;
 if([0,2].includes(i)&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 if(i===3&&(!unitTarget(g,u,aim,650)||aim.kind!=='hero'||u.root>0||u.grounded>0))return false;
 beginCast(g,u,i,aim,h);
 if(i===0){const from={x:u.x,y:u.y},to=lineEnd(u,aim,770*scale(g));u.castUntil=g.time+.35;
  h.schedule(g,u,.35,()=>{
   for(const v of enemies(g,u))if(segmentDistance(v,from,to)<=35*scale(g)+v.radius)h.hit(g,{source:u,effectState:'q',damageType:'physical',aoe:true,onHit:target=>{target.classicArmorShred={amount:Math.max(target.classicArmorShred?.until>g.time?target.classicArmorShred.amount:0,value(u,0,'BaseARShred')),until:g.time+3};}},v,calculation(u,0,'TotalDamage'));
   const flag=(g.zones||[]).filter(z=>z.kind==='jarvanFlag'&&z.source===u&&z.age<z.duration&&distance(z,from)<=880*scale(g)&&segmentDistance(z,from,lineEnd(from,to,880*scale(g)))<=60*scale(g)).sort((a,b)=>distance(a,from)-distance(b,from))[0];
   if(flag&&!(u.root>0||u.grounded>0)){s.eqHits=[];s.eqLast={x:u.x,y:u.y};s.eqUntil=g.time+1;dash(g,u,flag,1000,{speed:value(u,2,'EDashSpeed',1400),throughWalls:true,done:()=>{eqContact(g,u,h,s.eqLast,u);s.eqUntil=0;}});}
  });cue(g,u,'JarvanIV_Base_Q_buff_01');
 }
 if(i===1){let count=0;for(const v of enemies(g,u))if(distance(v,u)<=625*scale(g)+v.radius){h.hit(g,{source:u,effectState:'w',slow:2,slowPercent:value(u,1,'BaseSlowAmount'),onHit:t=>{slowUnit(g,t,2,value(u,1,'BaseSlowAmount'));if(t.kind==='hero')count++;}},v,0);}
  shieldUnit(g,u,u,calculation(u,1,'TotalShield')+count*calculation(u,1,'BonusShield'),effectValue(u,1,4,4),{state:'w',key:'jarvanW'});
 }
 if(i===2){const target=lineEnd(u,aim,Math.min(860*scale(g),distance(u,aim)));h.schedule(g,u,.25,()=>{
  g.zones??=[];const flag={id:g.counter++,kind:'jarvanFlag',source:u,...target,r:175*scale(g),age:0,duration:effectValue(u,2,4,8)};g.zones.push(flag);g.fx('native',flag.x,flag.y,u.hero.color,40,.65,{hero:u.hero.id,classicRealmId:realmId(u),nativeName:'JarvanIV_Base_E_hit_01',nativeDuration:.65,nativeGround:true,facing:u.facing});
  for(const v of enemies(g,u))if(distance(v,flag)<=flag.r+v.radius)h.hit(g,{source:u,effectState:'e',damageType:'magic',aoe:true},v,calculation(u,2,'TotalDamage'));cue(g,u,'JarvanIV_Base_E_flag_hld_01',flag,flag.duration);
 });}
 if(i===3){dash(g,u,aim,650,{speed:1600,throughWalls:true,done:()=>{const center={x:u.x,y:u.y};for(const v of enemies(g,u))if(distance(v,center)<=340*scale(g)+v.radius)h.hit(g,{source:u,effectState:'r',damageType:'physical',aoe:true},v,calculation(u,3,'DamageCalc'));
  g.zones??=[];const z={id:g.counter++,kind:'jarvanWall',source:u,...center,r:340*scale(g),age:0,duration:value(u,3,'WallDuration',3.5)};g.zones.push(z);s.wallUntil=g.time+z.duration;
 }});u.unstoppableUntil=g.time+u.dash.duration;cue(g,u,'JarvanIV_Base_R_cas_01');}
 return true;
}
export function jarvanAfterDamage(g,u,v,{basic,meta,beforeHp}){
 if(!basic||meta.classicProc||!['hero','minion'].includes(v.kind))return;const s=state(u);s.cadence??={};if((s.cadence[v.id]??-Infinity)>g.time)return;s.cadence[v.id]=g.time+calculation(u,-1,'TooltipCooldown');
 let amount=Math.max(passiveValue(u,'MinimumCadenceDamage',20),(beforeHp??v.hp)*passiveValue(u,'TooltipCurrentHealthDamage',.08));if(v.kind!=='hero')amount=Math.min(passiveValue(u,'MaximumCadenceDamage',400),amount);damage(g,u,v,amount,'physical','passive');cue(g,u,'JarvanIV_Base_Q_crown_01',v);
}
export function updateJarvan(g,u,dt,h){const s=state(u);if(s.eqUntil>g.time){eqContact(g,u,h,s.eqLast,u);s.eqLast={x:u.x,y:u.y};}}
export function jarvanAS(g,u){let aura=0;for(const z of g.zones||[])if(z.kind==='jarvanFlag'&&z.age<z.duration&&z.source.team===u.team&&distance(z,u)<=1000*scale(g))aura=Math.max(aura,value(z.source,2,'BaseAuraAS'));
 return aura+(u.hero.id==='JarvanIV'?value(u,2,'PermanentAttackSpeed'):0);
}
