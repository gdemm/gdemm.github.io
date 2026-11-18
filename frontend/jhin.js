import {addTrapZone} from './trap-limit.js';
import {COMBAT_DATA} from './combat-data.js';
import {augmentOnCast,canCastWithAugments,combatCooldownMultiplier} from './augment-rules.js';
const spec=i=>COMBAT_DATA.Jhin.spells[COMBAT_DATA.Jhin.abilityNames[i]].data;
const val=(u,i,key,f=0)=>spec(i).DataValues?.find(v=>v.name===key)?.values?.[u.spellRanks?.[i]||1]??f;
const k=g=>1/(g.mapConfig?.scale||2),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const effect=(g,u,name,point=u,d=.6)=>g.fx('native',point.x,point.y,u.hero.color,40,d,{hero:'Jhin',nativeName:name,nativeDuration:d,follow:point===u?u:null,nativeGround:point!==u,facing:u.facing});
export function cancelJhin(g,u){if(!u?.jhinChannel)return;u.jhinChannel=null;u.castUntil=0;u.animUntil=0;u.animation='idle';}
export function jhinStats(u){if(u.hero?.id!=='Jhin')return;const amp=.04+.4*clamp((u.level-1)/17,0,1)+.3*(u.crit||0)+.25*(u.itemAttackSpeed||0);u.damage*=1+amp;}
export function jhinRate(g,u){if(u.hero?.id!=='Jhin')return;u.period=1/(.625*(1+.03*Math.max(0,u.level-1)));u.jhinMoveSpeed=u.jhinHasteUntil>g.time?u.baseMoveSpeed*(.1+.44*(u.itemAttackSpeed||0)):0;}
export function jhinCanAttack(g,u){return u.hero?.id!=='Jhin'||!u.jhinChannel&&!(u.jhinReloadUntil>g.time)&&(u.jhinAmmo??4)>0;}
export function jhinAttack(g,u,v,h,heartsteel=0){
 const fourth=(u.jhinAmmo??4)===1,critical=fourth||g.random()<(u.crit||0);u.jhinAmmo=(u.jhinAmmo??4)-1;u.jhinLastAttack=g.time;
 const amount=u.damage*(critical?(u.critDamageMultiplier||1.75)*.75:1)+heartsteel;
 if(critical){u.jhinHasteUntil=g.time+2;u.animation='crit';u.animationSerial++;}
 h.missile(g,u,'JhinBasicAttack','attack',v,{target:v,basic:true,critical,range:25000,damage:0,damageType:'physical',missileEffect:fourth?'Jhin_Base_BA_Mis_04':'Jhin_Base_BA_Mis_01',hitEffect:fourth?'Jhin_Base_BA_Hit_tar_04':'Jhin_Base_BA_Hit_tar_01',onHit:target=>g.hurt(target,amount+(fourth?(target.maxHp-target.hp)*(u.level>=16?.25:u.level>=11?.2:.15):0),u,0,0,'physical',true,{state:'attack',critical})});
 if(!u.jhinAmmo){u.jhinReloadUntil=g.time+2.5;h.combatEvent(g,u,'reload','cast');}
}
export function jhinMark(g,v,source,dealt){if(g.hasJhin&&dealt>0&&v.hero&&source?.hero&&source.team!==v.team){v.jhinMarks??={};v.jhinMarks[source.team]=g.time+4;}}
function trap(g,u,point,trigger=false){g.zones??=[];addTrapZone(g,{id:g.counter++,kind:'jhinTrap',source:u,x:point.x,y:point.y,r:260*k(g),age:0,duration:180,armedAt:g.time+.75,explodeAt:trigger?g.time+2:0});effect(g,u,'Jhin_Base_E_Trap_Idle',point,3);}
export function jhinKill(g,u,v){if(u?.hero?.id==='Jhin'&&!u.sylasActingAs&&v.hero)trap(g,u,v,true);}
export function castJhin(g,i,aim,h){const u=g.player;
 if(!u.alive||g.winner!==null||u.stun>0||u.silence>0||u.charm>0||u.dash||!canCastWithAugments(u,i))return false;
 if(i===3&&u.jhinChannel){const c=u.jhinChannel;if(g.time<c.next||!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y))return false;const angle=Math.atan2(aim.x-u.x,aim.y-u.y),delta=Math.atan2(Math.sin(angle-c.angle),Math.cos(angle-c.angle));if(Math.abs(delta)>Math.PI/6)return false;const fourth=c.shots===1;c.shots--;c.next=g.time+1;u.animation='rshot';u.animationSerial++;u.animUntil=g.time+.6;u.facing=angle;h.combatEvent(g,u,fourth?'r-fourth':'rshot','cast');h.missile(g,u,'JhinRShotMis','r',aim,{range:3500,filter:v=>['hero','minion'].includes(v.kind),speed:2500*k(g),damage:0,damageType:'physical',pierce:true,missileEffect:fourth?'Jhin_Base_R_Big_mis':'Jhin_Base_R_small_mis',onHit:(v,p)=>{const n=(val(u,3,'Damage',64)+.25*u.damage)*(1+3*(1-v.hp/v.maxHp))*(fourth?2:1);h.hit(g,{source:u,effectState:'r',damageType:'physical',critical:fourth,slow:.5,slowPercent:.8,shieldChecked:true},v,n);if(v.hero)p.life=0;}});if(c.shots===0)cancelJhin(g,u);return true;}
 if(u.jhinChannel||u.castUntil>g.time||u.skills[i]>0)return false;
 if(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y))return false;
 if(i===0&&(!aim.alive||aim.team===u.team||!['hero','minion'].includes(aim.kind)||!g.canHit(aim)||dist(u,aim)>550*k(g)+aim.radius))return false;
 if(i===2&&(u.jhinTraps??2)<1)return false;
 const cost=spec(i).mana[(u.spellRanks?.[i]||1)-1]||0;if(u.mp<cost)return false;u.mp-=cost;u.skills[i]=spec(i).Cooldown.values[u.spellRanks?.[i]||1]*combatCooldownMultiplier(u,i);h.cancelAttack(u);g.shopHistory=[];const from={x:u.x,y:u.y};u.facing=Math.atan2(aim.x-u.x,aim.y-u.y);u.animation='qwer'[i];u.animationSerial++;u.animUntil=g.time+.6;u.castUntil=g.time+(i===1?.75:.25);h.combatEvent(g,u,'qwer'[i],'cast',{from,aim:{x:aim.x,y:aim.y}});augmentOnCast(g,u,i,aim,from);
 if(i===0){const hit=new Set();let kills=0;const bounce=(target,n,origin)=>{const amount=(val(u,0,'BaseDamage',44)+val(u,0,'ADRatio',.44)*u.damage+.6*(u.ap||0))*(1+.35*kills);const missile=h.missile(g,u,'JhinQ','q',target,{target,range:25000,damage:amount,damageType:'physical',missileEffect:n?'Jhin_Base_Q_bounce_mis':'Jhin_Base_Q_mis',onHit:v=>{hit.add(v.id);if(!v.alive)kills++;if(n>=3)return;const next=g.enemies(u).filter(t=>['hero','minion'].includes(t.kind)&&!hit.has(t.id)&&dist(v,t)<=450*k(g)+t.radius).sort((a,b)=>dist(a,v)-dist(b,v)||a.id-b.id)[0];if(next)h.schedule(g,u,.08,()=>bounce(next,n+1,v));}});if(origin){missile.x=origin.x;missile.y=origin.y;missile.fromX=origin.x;missile.fromY=origin.y;}};bounce(aim,0,null);}
 if(i===1){const angle=u.facing,dir={x:Math.sin(angle),y:Math.cos(angle)};h.schedule(g,u,.75,()=>{effect(g,u,'Jhin_Base_W_beam',u,.5);h.combatEvent(g,u,'w','beam');const targets=g.enemies(u).filter(v=>['hero','minion'].includes(v.kind)).map(v=>({v,along:(v.x-from.x)*dir.x+(v.y-from.y)*dir.y,side:Math.abs((v.x-from.x)*dir.y-(v.y-from.y)*dir.x)})).filter(t=>t.along>=0&&t.along<=2500*k(g)&&t.side<=40*k(g)+t.v.radius).sort((a,b)=>a.along-b.along);for(const{v}of targets){if(h.windwallBlocks?.(g,{source:u,x:v.x,y:v.y,r:20*k(g),life:1},from))break;const marked=v.jhinMarks?.[u.team]>g.time;h.hit(g,{source:u,effectState:'w',damageType:'physical',root:v.hero&&marked?val(u,1,'RootDuration',1.25):0,hitEffect:'Jhin_Base_W_hit_tar'},v,(val(u,1,'BaseDamage',70)+.5*u.damage)*(v.hero?1:.75));if(v.hero)break;}});}
 if(i===2){u.jhinTraps=(u.jhinTraps??2)-1;u.jhinTrapRecharge??=g.time+val(u,2,'AmmoRechargeRateBaseTooltip',24)*combatCooldownMultiplier(u,2);const d=dist(u,aim)||1,t=Math.min(1,750*k(g)/d);trap(g,u,{x:u.x+(aim.x-u.x)*t,y:u.y+(aim.y-u.y)*t});}
 if(i===3){u.dest=null;u.order='hold';u.jhinChannel={start:g.time,angle:u.facing,until:g.time+10,shots:4,next:g.time+.75};u.castUntil=g.time+10;effect(g,u,'Jhin_Base_R_ViewCone',u,10);}
 return true;
}
export function updateJhin(g,dt,h){for(const u of g.units){if(u.hero?.id!=='Jhin')continue;
 if(u.jhinStatLevel!==u.level){u.jhinStatLevel=u.level;g.refreshAugmentStats?.(u);}
 if(!u.alive){u.jhinChannel=null;u.jhinAmmo=4;u.jhinReloadUntil=0;continue;}
 if(u.jhinChannel&&(u.stun>0||u.silence>0||u.charm>0||u.itemStasisUntil>g.time||g.time>=u.jhinChannel.until))cancelJhin(g,u);
 if(u.jhinReloadUntil&&g.time>=u.jhinReloadUntil){u.jhinAmmo=4;u.jhinReloadUntil=0;}
 if(!u.jhinReloadUntil&&(u.jhinAmmo??4)<4&&g.time-(u.jhinLastAttack??g.time)>8){u.jhinReloadUntil=g.time+2.5;h.combatEvent(g,u,'reload','cast');}
 if((u.jhinTraps??2)<2&&g.time>=(u.jhinTrapRecharge??Infinity)){u.jhinTraps=(u.jhinTraps??2)+1;u.jhinTrapRecharge=u.jhinTraps<2?g.time+val(u,2,'AmmoRechargeRateBaseTooltip',24)*combatCooldownMultiplier(u,2):null;}
 }
 for(const z of g.zones||[]){if(z.kind!=='jhinTrap'||z.duration<=z.age)continue;const u=z.source;if(!z.explodeAt&&g.time>=z.armedAt&&g.enemies(u).some(v=>['hero','minion'].includes(v.kind)&&dist(v,z)<=160*k(g)+v.radius)){z.explodeAt=g.time+2;effect(g,u,'Jhin_Base_E_Trap_activate',z,2);}
 if(z.explodeAt){for(const v of g.enemies(u))if(['hero','minion'].includes(v.kind)&&dist(v,z)<=z.r+v.radius){v.slow=Math.max(v.slow||0,.3);v.slowPercent=.35;if(v.hero){v.jhinMarks??={};v.jhinMarks[u.team]=g.time+4;}}
 if(g.time>=z.explodeAt){z.duration=z.age;effect(g,u,'Jhin_Base_E_Trap_explosion',z,1);for(const v of g.enemies(u))if(['hero','minion'].includes(v.kind)&&dist(v,z)<=z.r+v.radius){v.jhinTrapRecent??={};const reduced=!v.hero||v.jhinTrapRecent[u.id]>g.time;h.hit(g,{source:u,effectState:'e',damageType:'magic',hitEffect:'Jhin_Base_E_Trap_hit_tar'},v,(val(u,2,'BaseDamage',20)+1.2*u.damage+(u.ap||0))*(reduced?.65:1));v.jhinTrapRecent[u.id]=g.time+3;}}}
 }
}
