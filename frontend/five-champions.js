import {permanentSkillStackGain} from './permanent-skill-stacks.js';
import {COMBAT_DATA} from './combat-data.js';
import {healUnit} from './combat-support.js';
import {augmentOnCast,canCastWithAugments,combatCooldownMultiplier} from './augment-rules.js';
import {addTrapZone} from './trap-limit.js';
export const FIVE_HEROES=new Set(['Teemo','MasterYi','Chogath','Sylas','Veigar']);
const k=g=>1/(g.mapConfig?.scale||2),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),rank=(u,i)=>u.spellRanks?.[i]||1;
const spec=(u,i)=>COMBAT_DATA[u.hero.id].spells[COMBAT_DATA[u.hero.id].abilityNames[i]].data;
export const fiveValue=(u,i,key,f=0)=>spec(u,i).DataValues?.find(v=>v.name===key)?.values?.[rank(u,i)]??f;
const foes=(g,u)=>g.enemies(u).filter(v=>['hero','minion'].includes(v.kind));
const effect=(g,u,name,p=u,d=.7)=>g.fx('native',p.x,p.y,u.hero.color,40,d,{hero:u.hero.id,nativeName:name,nativeDuration:d,follow:p===u?u:null,nativeGround:p!==u,facing:u.facing});
const movePoint=(g,u,p,r)=>{const d=dist(u,p)||1,t=Math.min(1,r*k(g)/d),q={x:u.x+(p.x-u.x)*t,y:u.y+(p.y-u.y)*t};return g.navigation?g.navigation.snap(q.x,q.y):q;};
export function fiveRange(u,i){if(u.hero.id==='Teemo')return[680,0,0,[400,650,900][Math.min(2,rank(u,3)-1)]][i];if(u.hero.id==='MasterYi')return[600,0,0,0][i];if(u.hero.id==='Chogath')return[950,650,0,175+Math.min(25,(u.feastStacks||0)*2.5)][i];if(u.hero.id==='Veigar')return[1050,950,725,650][i];return[775,400,u.sylasEUntil>0?800:400,950][i];}
export function fiveTargeting(u,i){if(u.hero.id==='Teemo')return['Unit','Self','Self','Location'][i];if(u.hero.id==='MasterYi')return['Unit','Self','Self','Self'][i];if(u.hero.id==='Chogath')return['AreaClamped','Cone','Self','Unit'][i];if(u.hero.id==='Veigar')return['Location','AreaClamped','AreaClamped','Unit'][i];return['Location','Unit','Location','Unit'][i];}
export function fiveCooldown(u,i){if(u.hero.id==='MasterYi'&&i===1)return 9;if(u.hero.id==='Veigar'&&i===1)return 8*Math.pow(.9,Math.floor((u.veigarStacks||0)/50));return spec(u,i).Cooldown?.values?.[rank(u,i)]??spec(u,i).cooldownTime?.[rank(u,i)]??0;}
export function fiveStats(g,u){if(u.veigarStacks)u.ap+=u.veigarStacks;if(u.feastBonusHp){const old=u.maxHp;u.maxHp+=u.feastBonusHp;u.hp=Math.min(u.maxHp,u.hp+u.maxHp-old);u.augmentSize*=1+Math.min(1.5,(u.feastStacks||0)*.06);}if(u.hero.id==='Teemo'){const speed=u.teemoWUntil>g.time?fiveValue(u,1,'ActiveMoveSpeedBonus',.24):g.time-(u.augmentLastDamaged??-99)>=5?fiveValue(u,1,'PassiveMoveSpeedBonus',.12):0;u.speed*=1+speed;if(u.teemoAmbushUntil>g.time)u.itemAttackSpeed+=.2+.6*clamp((u.level-1)/17,0,1);}if(u.yiRUntil>g.time){u.itemAttackSpeed+=(u.yiRSpeed||.25);u.speed*=1+(u.yiRMove||.4);}if(u.hero.id==='Sylas'&&(u.sylasPassive||0)>0)u.itemAttackSpeed+=1.25;if(u.hero.id==='Chogath'&&u.choEUntil>g.time&&(u.choEAttacks||0)>0)u.itemRangeBonus+=50;u.power=1+(u.ap||0)/150;}
export function cancelFiveChannel(g,u){if(u?.yiMeditateUntil>g.time){u.yiMeditateUntil=0;u.castUntil=0;u.animUntil=0;}}
export function fiveIncoming(g,v,n,source,type){if(v.yiMeditateUntil>g.time&&type!=='true'){let reduction=(v.yiMeditateDR||.45)+(g.time-v.yiMeditateStart<.5?.25:0);if(source.kind==='tower')reduction*=.5;return n*(1-Math.min(.9,reduction));}return n;}
export function fiveAfterDamage(g,u,v,{basic,meta,dealt}){
 if(!u?.hero||u.sylasActingAs||u.team===v.team||dealt<=0)return;
 if(u.hero.id==='Veigar'&&!basic&&/^[qwer]$/.test(meta.state||'')&&!meta.periodic){u.veigarTokens??={};const key=`${meta.castToken??g.time}:${meta.state}:${v.id}`;if(!Object.prototype.hasOwnProperty.call(u.veigarTokens,key)){u.veigarTokens[key]=g.time;if(v.hero)u.veigarStacks=(u.veigarStacks||0)+permanentSkillStackGain(u,1);if(!v.alive&&meta.state==='q')u.veigarStacks=(u.veigarStacks||0)+permanentSkillStackGain(u,v.kind==='minion'?1:2);}}
}
export function fiveTakedown(g,u,v){if(!u?.hero||u.sylasActingAs)return;if(u.hero.id==='Veigar')u.veigarStacks=(u.veigarStacks||0)+permanentSkillStackGain(u,5);if(u.hero.id==='MasterYi'||u.sylasBorrowedR?.id==='MasterYi'&&u.yiRUntil>g.time){for(let i=0;i<3;i++)u.skills[i]*=.3;if(u.yiRUntil>g.time)u.yiRUntil+=7;}}
export function fiveKilledUnit(g,u,v){if(u?.hero?.id==='Chogath'&&!u.sylasActingAs){healUnit(g,u,u,17+3*u.level,{kind:'passive'});u.mp=Math.min(u.maxMp,u.mp+3.25+.25*u.level);}}
function poison(g,u,v,key,dps,duration,state){v.fiveDots??=[];const old=v.fiveDots.find(d=>d.source===u&&d.key===key);if(old){old.until=g.time+duration;old.dps=dps;}else v.fiveDots.push({source:u,key,dps,until:g.time+duration,next:g.time+1,state});}
export function fiveAttack(g,u,v,h){if(!FIVE_HEROES.has(u.hero.id))return;const id=u.hero.id;
 if(id==='Teemo'){h.hit(g,{source:u,effectState:'e',damageType:'magic',hitEffect:'Teemo_Base_E_tar'},v,fiveValue(u,2,'ImpactBaseDamage',9)+.3*(u.ap||0));poison(g,u,v,'teemoE',fiveValue(u,2,'TickBaseDamage',6)+.1*(u.ap||0),4,'e');}
 if(id==='MasterYi'){u.yiHits=(u.yiHits||0)+1;u.skills[0]=Math.max(0,u.skills[0]-combatCooldownMultiplier(u,0));if(u.yiEUntil>g.time)h.hit(g,{source:u,effectState:'e',damageType:'true'},v,fiveValue(u,2,'BaseDamage',20)+.35*Math.max(0,u.damage-u.hero.damage));if(u.yiHits%4===0&&v.alive){g.hurt(v,u.damage*.5,u,0,0,'physical',true,{state:'passive',fiveRepeat:true});u.yiHits=1;u.skills[0]=Math.max(0,u.skills[0]-combatCooldownMultiplier(u,0));if(u.yiEUntil>g.time)h.hit(g,{source:u,effectState:"e",damageType:"true"},v,fiveValue(u,2,"BaseDamage",20)+.35*Math.max(0,u.damage-u.hero.damage));}}
 if(id==='Chogath'&&u.choEUntil>g.time&&u.choEAttacks>0){u.choEAttacks--;const dx=v.x-u.x,dy=v.y-u.y,d=Math.hypot(dx,dy)||1;h.missile(g,u,'VorpalSpikes','e',{x:u.x+dx/d*500*k(g),y:u.y+dy/d*500*k(g)},{range:500,pierce:true,filter:t=>['hero','minion'].includes(t.kind),damage:0,missileEffect:'Chogath_Base_E_mis',onHit:t=>h.hit(g,{source:u,effectState:'e',damageType:'magic',slow:1.5,slowPercent:fiveValue(u,2,'SlowAmountPercentage',30)/100},t,fiveValue(u,2,'BaseDamage',30)+.3*(u.ap||0)+t.maxHp*(fiveValue(u,2,'PercentHealthDamage',2.5)+.5*(u.feastStacks||0))/100)});}
 if(id==='Sylas'&&(u.sylasPassive||0)>0){u.sylasPassive--;for(const t of foes(g,u))if(dist(t,u)<=400*k(g)+t.radius)h.hit(g,{source:u,effectState:'passive',damageType:'magic',hitEffect:'Sylas_Base_P_hit'},t,5+2.5*u.level+.25*(u.ap||0)+.25*u.damage);effect(g,u,'Sylas_Base_P_Nova');}
}
const wrapped=new WeakSet();
function donorContext(g,u,hero,fn){const original=u.hero,mp=u.mp,flag=u.sylasActingAs,oldTimers=new Set(g.combatTimers||[]),oldProjectiles=new Set(g.projectiles||[]),oldDash=u.dash;u.hero=hero;u.sylasActingAs=true;try{return fn();}finally{u.hero=original;u.mp=mp;u.sylasActingAs=flag;for(const t of g.combatTimers||[])if(t.u===u&&!oldTimers.has(t)&&t.action&&!wrapped.has(t.action)){const f=t.action;t.action=(...args)=>donorContext(g,u,hero,()=>f(...args));wrapped.add(t.action);}for(const p of g.projectiles||[])if(p.source===u&&!oldProjectiles.has(p))for(const key of ['onHit','onArrive'])if(p[key]&&!wrapped.has(p[key])){const f=p[key];p[key]=(...args)=>donorContext(g,u,hero,()=>f(...args));wrapped.add(p[key]);}if(u.dash!==oldDash&&u.dash?.done&&!wrapped.has(u.dash.done)){const f=u.dash.done;u.dash.done=(...args)=>donorContext(g,u,hero,()=>f(...args));wrapped.add(u.dash.done);}g.refreshAugmentStats?.(u);}}
function borrow(g,u,aim,h){const hero=u.sylasStolenHero||u.sylasBorrowedR;if(!hero)return false;const oldCd=u.skills[3],oldMP=u.mp;u.skills[3]=0;u.mp=Math.max(1000,u.mp);let ok=false;try{ok=donorContext(g,u,hero,()=>h.castNative(g,3,aim));}finally{u.mp=oldMP;}if(!ok){u.skills[3]=oldCd;return false;}u.sylasBorrowedR=hero;u.sylasStolenHero=null;u.sylasPassive=Math.min(3,(u.sylasPassive||0)+1);u.skills[3]=Math.max(0,(u.sylasNextStealAt||g.time)-g.time);return true;}
export function castFive(g,i,aim,h){const u=g.player,id=u.hero.id;
 if(!u.alive||g.winner!==null||u.stun>0||u.silence>0||u.charm>0||u.itemStasisUntil>g.time||!canCastWithAugments(u,i))return false;
 if(id==='Teemo'&&i===2){g.notice('毒性射击是被动，普攻自动附毒',u);return false;}
 const activeBorrow=id==='Sylas'&&i===3&&(u.sylasStolenHero||u.sylasBorrowedR&&(u.jhinChannel||u.ahriCharges>0&&u.ahriRUntil>g.time||u.dariusRRecastUntil>g.time));if(activeBorrow)return borrow(g,u,aim,h);
 const recast=id==='Sylas'&&i===2&&u.sylasEUntil>g.time;
 if(u.castUntil>g.time||u.dash||u.skills[i]>0&&!recast)return false;
 const self=fiveTargeting(u,i)==='Self';aim??=self?u:null;if(!aim||!Number.isFinite(aim.x)||!Number.isFinite(aim.y))return false;
 const targeted=fiveTargeting(u,i)==='Unit';if(targeted&&(!aim.alive||aim.team===u.team||!['hero','minion'].includes(aim.kind)||!g.canHit(aim)||dist(u,aim)>fiveRange(u,i)*k(g)+aim.radius))return false;
 if(id==='Veigar'&&i===3&&aim.kind!=='hero')return false;
 if(id==='Sylas'&&i===3&&(!aim.hero||aim.hero.id==='Sylas'||!COMBAT_DATA[aim.hero.id]||(u.sylasEnemyLocks?.[aim.id]||0)>g.time))return false;
 if(id==='Teemo'&&i===3&&(u.teemoAmmo??3)<=0)return false;
 if((id==='MasterYi'&&i===0||id==='Sylas'&&[1,2].includes(i))&&(u.root>0||u.grounded>0))return false;
 const cost=recast?0:spec(u,i).mana?.[rank(u,i)-1]||0;if(u.mp<cost)return false;u.mp-=cost;if(!recast)u.skills[i]=fiveCooldown(u,i)*combatCooldownMultiplier(u,i);h.cancelAttack(u);cancelFiveChannel(g,u);g.shopHistory=[];const from={x:u.x,y:u.y},p=movePoint(g,u,aim,fiveRange(u,i)||1000),d=dist(u,aim)||1,dir={x:(aim.x-u.x)/d,y:(aim.y-u.y)/d};u.animation='qwer'[i];u.animationSerial++;u.animUntil=g.time+.5;u.castUntil=g.time+(self?0:.2);if(!self)u.facing=Math.atan2(dir.x,dir.y);h.combatEvent(g,u,'qwer'[i],'cast',{from,aim:{x:aim.x,y:aim.y}});augmentOnCast(g,u,i,aim,from);if(id==='Sylas')u.sylasPassive=Math.min(3,(u.sylasPassive||0)+1);
 const damage=(v,n,type='magic',extra={})=>h.hit(g,{source:u,effectState:'qwer'[i],damageType:type,...extra},v,n);
 if(id==='Teemo'){
  if(i===0)h.missile(g,u,'TeemoQ','q',aim,{target:aim,range:680,damage:fiveValue(u,0,'BaseDamage',80)+.7*(u.ap||0),onHit:v=>{v.blindUntil=g.time+fiveValue(u,0,'BlindDuration',2)*(v.hero?1:2);},hitEffect:'Teemo_Base_Q_tar'});
  if(i===1)u.teemoWUntil=g.time+3;
  if(i===3){u.teemoAmmo=(u.teemoAmmo??3)-1;u.teemoRechargeAt??=g.time+(35-5*rank(u,3))*combatCooldownMultiplier(u,3);addTrapZone(g,{id:g.counter++,kind:'teemoTrap',source:u,x:p.x,y:p.y,age:0,duration:300,arm:1,r:160*k(g),damage:fiveValue(u,3,'BaseDamage',200)+.5*(u.ap||0),slow:fiveValue(u,3,'SlowAmount',30)/100});effect(g,u,'Teemo_Base_R_CollisionBox_Ring',p,3);}
 }
 if(id==='MasterYi'){
  if(i===0){u.yiUntargetableUntil=g.time+.8;u.dest=null;u.target=null;u.castUntil=g.time+.8;const list=[aim,...foes(g,u).filter(v=>v!==aim&&dist(v,aim)<=600*k(g))].slice(0,4);h.schedule(g,u,.8,()=>{const valid=list.filter(v=>v.alive);if(!valid.length)return;for(const v of valid)damage(v,(fiveValue(u,0,'BaseDamage',20)+.7*u.damage)*(valid.length===1?1.75:1),'physical');const to=g.navigation?g.navigation.snap(aim.x-dir.x*50*k(g),aim.y-dir.y*50*k(g)):{x:aim.x-dir.x*50*k(g),y:aim.y-dir.y*50*k(g)};u.x=to.x;u.y=to.y;effect(g,u,'MasterYi_Base_Q_End');});}
  if(i===1){u.yiMeditateStart=g.time;u.yiMeditateUntil=g.time+4;u.yiMeditateDR=fiveValue(u,1,'DamageReduction',.45);u.castUntil=g.time+4;u.dest=null;u.target=null;effect(g,u,'MasterYi_Base_W_Buf',u,4);}
  if(i===2)u.yiEUntil=g.time+5;
  if(i===3){u.yiRUntil=g.time+7;u.yiRSpeed=fiveValue(u,3,'RASBonus',25)/100;u.yiRMove=fiveValue(u,3,'RMSBonus',40)/100;u.slow=0;effect(g,u,'MasterYi_Base_R_Buf',u,7);}
 }
 if(id==='Chogath'){
  if(i===0){effect(g,u,'Chogath_Base_Q_Ally_team',p,.65);h.schedule(g,u,.625,()=>{for(const v of foes(g,u))if(dist(v,p)<=250*k(g)+v.radius){damage(v,fiveValue(u,0,'BaseDamage',80)+(u.ap||0),'magic',{stun:1,slow:1.5,slowPercent:.6});v.airborne=1;v.airborneTotal=1;v.airborneSourceId=u.id;}});}
  if(i===1)for(const v of foes(g,u)){const dv=dist(u,v),along=(v.x-u.x)*dir.x+(v.y-u.y)*dir.y;if(dv<=650*k(g)+v.radius&&along/(dv||1)>.707)damage(v,[0,75,125,175,225,275][rank(u,1)]+.7*(u.ap||0),'magic',{silence:1.4+.2*rank(u,1)});}
  if(i===2){u.choEAttacks=3;u.choEUntil=g.time+6;u.cd=0;}
  if(i===3){damage(aim,(aim.hero?fiveValue(u,3,'RBaseDamage',300):1200)+.5*(u.ap||0)+.1*Math.max(0,u.maxHp-u.hero.hp),'true');if(!aim.alive&&(aim.hero||(u.feastMinions||0)<6)){if(!aim.hero)u.feastMinions=(u.feastMinions||0)+1;const gained=permanentSkillStackGain(u,1);u.feastStacks=(u.feastStacks||0)+gained;u.feastBonusHp=(u.feastBonusHp||0)+gained*fiveValue(u,3,'RHealthPerStack',80);g.refreshAugmentStats?.(u);}effect(g,u,'Chogath_Base_R_tar',aim);}
 }
 if(id==='Veigar'){
  if(i===0)h.missile(g,u,'VeigarBalefulStrike','q',aim,{range:1050,pierce:true,maxHits:2,filter:v=>['hero','minion'].includes(v.kind),damage:fiveValue(u,0,'BaseDamage',80)+fiveValue(u,0,'APRatio',.5)*(u.ap||0)});
  if(i===1){effect(g,u,'Veigar_Base_W_warning',p,1.2);h.schedule(g,u,1.2,()=>{effect(g,u,'Veigar_Base_W_aoe_explosion',p);for(const v of foes(g,u))if(dist(v,p)<=225*k(g)+v.radius)damage(v,fiveValue(u,1,'BaseDamage',85)+fiveValue(u,1,'APRatio',.7)*(u.ap||0));});}
  if(i===2){g.zones.push({id:g.counter++,kind:'veigarCage',source:u,x:p.x,y:p.y,r:390*k(g),age:0,duration:3.5,arm:.5,stun:fiveValue(u,2,'StunDuration',1.5),hit:new Set(),previous:{}});effect(g,u,'Veigar_Base_E_cage_green',p,3.5);}
  if(i===3)h.missile(g,u,'VeigarR','r',aim,{target:aim,range:650,damage:0,onHit:v=>damage(v,(fiveValue(u,3,'BaseDamage',175)+fiveValue(u,3,'APRatio',.65)*(u.ap||0))*(1+clamp((1-v.hp/v.maxHp)/.667,0,1)))});
 }
 if(id==='Sylas'){
  if(i===0){for(const v of foes(g,u)){const along=(v.x-u.x)*dir.x+(v.y-u.y)*dir.y,side=Math.abs((v.x-u.x)*dir.y-(v.y-u.y)*dir.x);if(along>=0&&along<=775*k(g)&&side<=90*k(g)+v.radius)damage(v,fiveValue(u,0,'BaseDamage',40)+.4*(u.ap||0),'magic',{slow:1.5,slowPercent:fiveValue(u,0,'SlowAmount',.15)});}effect(g,u,'Sylas_Base_Q_X_Mark_Anticipation',p,.6);h.schedule(g,u,.6,()=>{effect(g,u,'Sylas_Base_Q_GroundAoE',p);for(const v of foes(g,u))if(dist(v,p)<=180*k(g)+v.radius)damage(v,(fiveValue(u,0,'ExplosionBaseDamage',60)+.8*(u.ap||0))*(v.hero?1:.4));});}
  if(i===1){u.dash={kind:'sylasW',from,to:{x:aim.x-dir.x*40*k(g),y:aim.y-dir.y*40*k(g)},start:g.time,duration:.15,done:()=>{if(!aim.alive)return;damage(aim,fiveValue(u,1,'Damage',75)+.6*(u.ap||0));if(aim.hero)healUnit(g,u,u,(fiveValue(u,1,'Healing',20)+.3*(u.ap||0)+.05*Math.max(0,u.maxHp-u.hero.hp))*(1+clamp((1-u.hp/u.maxHp)/.6,0,1)),{state:'w'});}};}
  if(i===2&&!recast){u.sylasEUntil=g.time+3.5;u.dash={kind:'sylasE',from,to:p,start:g.time,duration:.2};}
  if(i===2&&recast){u.sylasEUntil=0;h.missile(g,u,'SylasE2','e',aim,{range:800,filter:v=>['hero','minion'].includes(v.kind),damage:fiveValue(u,2,'PullDamage',80)+.8*(u.ap||0),onHit:v=>{u.dash={kind:'sylasE2',from:{x:u.x,y:u.y},to:{x:v.x-dir.x*40*k(g),y:v.y-dir.y*40*k(g)},start:g.time,duration:.2};v.airborne=.5;v.airborneTotal=.5;v.stun=Math.max(v.stun||0,.5);v.airborneSourceId=u.id;}});}
  if(i===3){u.sylasStolenHero=aim.hero;u.sylasBorrowedR=null;u.sylasHeldUntil=g.time+90;u.sylasNextStealAt=g.time+u.skills[3];u.sylasEnemyLocks??={};u.sylasEnemyLocks[aim.id]=g.time+Math.max(40,(aim.hero.skills?.[3]?.[2]||60)*2);u.skills[3]=0;effect(g,u,'Sylas_Base_R_Ult_Absorbed');}
 }
 return true;
}
export function updateFiveChampions(g,dt,h){
 for(const u of g.units){if(u.fiveDots){for(const d of u.fiveDots){if(d.next<=g.time&&d.until>=g.time){d.next=g.time+1;h.hit(g,{source:d.source,effectState:d.state,damageType:'magic',periodic:true},u,d.dps);}}u.fiveDots=u.fiveDots.filter(d=>u.alive&&d.until>g.time);}
  if(!u.hero)continue;
  if(u.hero.id==='Sylas'&&u.jhinChannel&&(u.stun>0||u.silence>0||!u.alive||g.time>=u.jhinChannel.until)){u.jhinChannel=null;u.castUntil=0;}
  if(u.hero.id==='Sylas'&&u.mundoRUntil>g.time)healUnit(g,u,u,(u.mundoRHealPerSecond||0)*dt,{state:'r'});
  if(!u.alive){u.yiMeditateUntil=0;u.yiRUntil=0;u.yiEUntil=0;u.sylasStolenHero=null;u.sylasBorrowedR=null;u.teemoStealth=false;continue;}
  if(u.hero.id==='Teemo'){if((u.teemoAmmo??3)<fiveValue(u,3,'MaxAmmo',3)&&g.time>=(u.teemoRechargeAt??Infinity)){u.teemoAmmo=(u.teemoAmmo??3)+1;u.teemoRechargeAt=u.teemoAmmo<fiveValue(u,3,'MaxAmmo',3)?g.time+(35-5*rank(u,3))*combatCooldownMultiplier(u,3):null;}const moving=u.teemoLastX!==undefined&&Math.hypot(u.x-u.teemoLastX,u.y-u.teemoLastY)>.1;const busy=moving||u.attackWindup||u.animUntil>g.time||g.time-(u.augmentLastDamaged??-99)<1.5;if(busy){if(u.teemoStealth)u.teemoAmbushUntil=g.time+5;u.teemoStealth=false;u.teemoStillAt=g.time;}else if(g.time-(u.teemoStillAt??0)>=1.5)u.teemoStealth=true;u.teemoLastX=u.x;u.teemoLastY=u.y;}
  if(u.yiRUntil>g.time)u.slow=0;
  if(u.yiMeditateUntil>g.time){if(u.stun>0||u.silence>0||u.charm>0||u.mp<=0)cancelFiveChannel(g,u);else{const data={...u,hero:{id:'MasterYi'}};u.mp=Math.max(0,u.mp-u.maxMp*.06*dt);healUnit(g,u,u,(fiveValue(data,1,'BaseHeal',120)+(u.ap||0)*.5)/4*(1+Math.min(1,1-u.hp/u.maxHp))*dt,{state:'w'});}}
  if(u.hero.id==='Sylas'&&u.sylasStolenHero&&u.sylasHeldUntil<=g.time){u.sylasStolenHero=null;u.skills[3]=Math.max(0,u.sylasNextStealAt-g.time);}
  if(u.veigarTokens)for(const [key,t]of Object.entries(u.veigarTokens))if(g.time-t>10)delete u.veigarTokens[key];
  if((FIVE_HEROES.has(u.hero.id)||u.feastBonusHp||u.yiRUntil>g.time)&&g.time>=(u.fiveNextStats||0)){u.fiveNextStats=g.time+.25;g.refreshAugmentStats?.(u);}
 }
 for(const z of g.zones||[]){if(z.kind==='teemoTrap'&&z.age>=z.arm&&z.age<z.duration){const target=foes(g,z.source).find(v=>dist(v,z)<=z.r+v.radius);if(target){z.duration=z.age;for(const v of foes(g,z.source))if(dist(v,z)<=450*k(g)+v.radius){v.slow=Math.max(v.slow||0,4);v.slowPercent=z.slow;poison(g,z.source,v,'mushroom',z.damage/4,4,'r');}effect(g,z.source,'Teemo_Base_R_tar',z,1);}}
  if(z.kind==='veigarCage'&&z.age>=z.arm&&z.age<z.duration)for(const v of foes(g,z.source)){const d=dist(v,z),old=z.previous[v.id]??d;if(!z.hit.has(v.id)&&(Math.abs(d-z.r)<=v.radius+20*k(g)||(old-z.r)*(d-z.r)<0)){z.hit.add(v.id);h.hit(g,{source:z.source,effectState:'e',damageType:'magic',stun:z.stun},v,.001);v.dash=null;}z.previous[v.id]=d;}
 }
}
