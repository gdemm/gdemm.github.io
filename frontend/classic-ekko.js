import {healUnit,shieldUnit} from './combat-support.js';
import {calculation} from './classic-calculations.js';
import {segmentDistance,lineEnd} from './classic-geometry.js';
import {realmId,constrainRealm} from './classic-realms.js';
import {state,scale,distance,value,passiveValue,canCast,beginCast,cue,dash,damage,enemies,clamp,slowUnit,stunUnit} from './classic-common.js';
const histories=new WeakMap();
function history(u){let h=histories.get(u);if(!h){h={points:[],damage:0,last:-Infinity};histories.set(u,h);}return h;}
export function recordEkkoDamage(u,amount){if(u.hero?.id==='Ekko'&&amount>0)history(u).damage+=amount;}
export function resetEkkoHistory(u){histories.delete(u);u.classicEcho=null;}
function oldPoint(g,u){const h=history(u);return [...h.points].reverse().find(p=>p.time<=g.time-4);}
function passive(g,u,v){if(!v.alive||!['hero','minion'].includes(v.kind))return;v.classicEkkoMarks??={};let p=v.classicEkkoMarks[u.id];if(p?.lockUntil>g.time)return;if(!p||p.until<=g.time)p=v.classicEkkoMarks[u.id]={stacks:0,until:0,lockUntil:0};p.stacks++;p.until=g.time+4;if(p.stacks<3)return;p.stacks=0;p.lockUntil=g.time+passiveValue(u,'LockoutTime',4);damage(g,u,v,calculation(u,-1,'ThreeHitDamage'),'magic','passive');if(v.kind==='hero')state(u).speedUntil=g.time+calculation(u,-1,'SpeedDuration');cue(g,u,'Ekko_Base_P_Proc',v);}
export function castEkko(g,i,aim,h){const u=g.player,s=state(u);if(!canCast(g,u,i))return false;if([0,1,2].includes(i)&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;if([2,3].includes(i)&&(u.root>0||u.grounded>0))return false;const echo=i===3?oldPoint(g,u):null;if(i===3&&!echo)return false;
 const token=beginCast(g,u,i,aim||u,h);
 if(i===0){const p=h.missile(g,u,'EkkoQ','q',aim,{audioCue:'EkkoQMis_hit',range:1075,damage:calculation(u,0,'InitialDamage'),damageType:'magic',castToken:token,pierce:true,r:55*scale(g),life:10,missileEffect:'Ekko_Base_Q_Mis_Throw',classicEkkoQ:{phase:'out',outDamage:calculation(u,0,'InitialDamage'),backDamage:calculation(u,0,'RecallDamage'),slow:Math.abs(value(u,0,'SlowPercent',-.4)),expand:value(u,0,'ExpandDuration',1.75)},onHit:()=>{}});p.speed=1650*scale(g);const dir=Math.atan2(aim.y-u.y,aim.x-u.x);p.vx=Math.cos(dir)*p.speed;p.vy=Math.sin(dir)*p.speed;}
 if(i===1){const center=lineEnd(u,aim,Math.min(distance(u,aim),1600*scale(g)));g.zones??=[];g.zones.push({id:g.counter++,kind:'ekkoW',source:u,...center,r:value(u,1,'AoERadius',375)*scale(g),age:0,duration:value(u,1,'DelayBeforeDetonation',3)+value(u,1,'SlowZoneDuration',1.5),armAt:g.time+value(u,1,'DelayBeforeDetonation',3),revealAt:g.time+value(u,1,'DelayBeforeEnemyCanSee',2),castToken:token,triggered:false});}
 if(i===2){dash(g,u,aim,value(u,2,'DashDistance',350),{throughWalls:true,speed:1150});s.eUntil=g.time+value(u,2,'BuffDuration',3);u.cd=0;cue(g,u,'Ekko_Base_E_Roll_Blur');}
 if(i===3){const to=constrainRealm(g,u,echo),lost=Math.max(0,history(u).damage-echo.damage),heal=calculation(u,3,'TotalBaseHeal')*(1+value(u,3,'PercentHealAmpPerPercentMissingHealth',3)*lost/u.maxHp);u.classicUntargetableUntil=g.time+.5;u.classicCastLockUntil=g.time+.5;u.classicDisarmedUntil=g.time+.5;
  dash(g,u,to,10000,{throughWalls:true,speed:Math.max(1,distance(u,to)/(.5*scale(g))),done:()=>{u.classicUntargetableUntil=0;u.classicCastLockUntil=0;u.classicDisarmedUntil=0;healUnit(g,u,u,heal,{state:'r'});for(const v of enemies(g,u))if(distance(u,v)<=value(u,3,'AoERadius',375)*scale(g)+v.radius)h.hit(g,{source:u,effectState:'r',castToken:token,damageType:'magic',aoe:true},v,calculation(u,3,'TotalDamage'));cue(g,u,'Ekko_Base_R_Tar');}});cue(g,u,'Ekko_Base_R_Disappear');
 }
 return true;
}
export function ekkoAttackStart(g,u,v){const s=state(u);if(!(s.eUntil>g.time)||!v?.alive)return;s.eUntil=0;s.eEmpoweredTarget=v.id;const dx=v.x-u.x,dy=v.y-u.y,len=Math.hypot(dx,dy)||1;let point={x:v.x-dx/len*(u.radius+v.radius+5),y:v.y-dy/len*(u.radius+v.radius+5)};if(g.navigation)point=g.navigation.snap(point.x,point.y);point=constrainRealm(g,u,point);u.x=point.x;u.y=point.y;cue(g,u,'Ekko_Base_E_Appear');}
export function ekkoAfterDamage(g,u,v,{basic,meta,beforeHp}){if(meta.classicProc||meta.itemProc||meta.augmentProc||meta.supportProc)return;const s=state(u);
 if(basic){if(s.eEmpoweredTarget===v.id){s.eEmpoweredTarget=null;damage(g,u,v,calculation(u,2,'TotalDamage'),'magic','e');cue(g,u,'Ekko_Base_E_Tar',v);}if((beforeHp??v.hp)/v.maxHp<value(u,1,'BelowHealthThreshold',.3)){let amount=(v.maxHp-v.hp)*calculation(u,1,'MissingHealthPercent');if(v.kind==='minion')amount=clamp(amount,value(u,1,'OnHitMinMinionDamage',15),value(u,1,'OnHitMaxMinionDamage',150));damage(g,u,v,amount,'magic','w');}}
 if(basic||['q','e','r'].includes(meta.state))passive(g,u,v);
}
export function updateEkko(g,u){const h=history(u);if(g.time-h.last>=.05){h.points.push({x:u.x,y:u.y,time:g.time,damage:h.damage,realmId:realmId(u)});h.last=g.time;while(h.points.length>100||h.points.length&&h.points[0].time<g.time-5)h.points.shift();}const echo=oldPoint(g,u);u.classicEcho=echo?{x:echo.x,y:echo.y,time:echo.time}:null;}
export function ekkoMove(g,u){return state(u).speedUntil>g.time?u.baseMoveSpeed*calculation(u,-1,'BonusMS'):0;}
export function ekkoRange(u){return state(u).eUntil>(u.augmentCurrentTime||0)?value(u,2,'AttackRangeIncrease',300):0;}
export function updateEkkoZones(g,h){for(const z of g.zones||[])if(z.kind==='ekkoW'&&z.age<z.duration&&!z.triggered&&g.time>=z.armAt){for(const v of enemies(g,z.source))if(distance(v,z)<=z.r+v.radius)slowUnit(g,v,.15,value(z.source,1,'SlowPercent',40)/100);if(z.source.alive&&realmId(z)===realmId(z.source)&&distance(z.source,z)<=z.r+z.source.radius){z.triggered=true;h.combatEvent(g,z.source,'w','zoneTrigger',{x:z.x,y:z.y,audioCue:'EkkoWMis_OnHitLocation'});shieldUnit(g,z.source,z.source,calculation(z.source,1,'TotalShield'),2,{state:'w',key:'ekkoW'});for(const v of enemies(g,z.source))if(distance(v,z)<=z.r+v.radius)h.hit(g,{source:z.source,effectState:'w',onHit:t=>stunUnit(g,z.source,t,value(z.source,1,'StunDuration',2.25))},v,0);cue(g,z.source,'Ekko_Base_W_Detonate',z);}}}
export function updateEkkoMissile(g,p,dt,h){const data=p.classicEkkoQ;if(!data)return false;p.age+=dt;p.life-=dt;if(p.life<=0)return true;const from={x:p.x,y:p.y};
 if(data.phase==='expand'&&g.time>=data.returnAt){data.phase='return';p.returning=true;p.audioCue='EkkoQReturn_hit';p.hit.clear();p.damage=data.backDamage;p.missileEffect='Ekko_Base_Q_Mis_Return';}
 if(data.phase==='out'){const step=Math.min(p.speed*dt,Math.max(0,p.range-p.distance));p.x+=p.vx/p.speed*step;p.y+=p.vy/p.speed*step;p.distance+=step;}
 if(data.phase==='return'){const d=distance(p,p.source),step=2300*scale(g)*dt;if(d<=step){p.life=0;return true;}p.vx=(p.source.x-p.x)/d*2300*scale(g);p.vy=(p.source.y-p.y)/d*2300*scale(g);p.x+=p.vx*dt;p.y+=p.vy*dt;}
 if(h.windwallBlocks(g,p,from)){p.life=0;return true;}
 let contact=false;for(const v of enemies(g,p.source)){const radius=data.phase==='expand'?value(p.source,0,'SlowZoneRadius',165)*scale(g):p.r;if(data.phase==='expand'&&distance(v,p)<=radius+v.radius)slowUnit(g,v,.2,data.slow);if(p.hit.has(v.id)||segmentDistance(v,from,p)>radius+v.radius)continue;p.hit.add(v.id);h.hit(g,p,v);contact=true;if(data.phase!=='return')slowUnit(g,v,.5,data.slow);}
 if(data.phase==='out'&&(contact||p.distance>=p.range)){data.phase='expand';data.returnAt=g.time+data.expand;cue(g,p.source,'Ekko_Base_Q_Aoe_Dilation',p,data.expand);}
 return true;
}
