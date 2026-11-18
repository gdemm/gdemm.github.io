import {shieldUnit,healUnit} from './combat-support.js';
import {calculation} from './classic-calculations.js';
import {segmentDistance,lineEnd} from './classic-geometry.js';
import {realmId} from './classic-realms.js';
import {state,scale,distance,value,passiveValue,unitTarget,canCast,beginCast,cue,forceTo,damage,enemies} from './classic-common.js';
function refresh(g,u){g.refreshAugmentStats(u);}
function removeTransfer(g,u,fields){if(!u||!fields)return;for(const[k,v]of Object.entries(fields))u.classicRealmStats[k]=(u.classicRealmStats?.[k]||0)-v;refresh(g,u);}
export function finishRealm(g,u,{victimDied=false}={}){const s=state(u),r=s.realm;if(!r||r.finished)return;r.finished=true;const victim=g.units.find(v=>v.id===r.targetId);u.classicRealmId=0;if(victim){victim.classicRealmId=0;removeTransfer(g,victim,r.victimDelta);}const zone=(g.zones||[]).find(z=>z.id===r.id);if(zone)zone.age=zone.duration;
 if(victimDied&&u.alive){s.retainedRealm={targetId:r.targetId,lifeSerial:victim?.lifeSerial||0,delta:r.casterDelta};}else removeTransfer(g,u,r.casterDelta);
 s.realm=null;
}
function beginRealm(g,u,v){
 if(!u.alive||!v.alive||realmId(u)||realmId(v))return;
 const s=state(u);if(s.retainedRealm){removeTransfer(g,u,s.retainedRealm.delta);s.retainedRealm=null;}const pct=value(u,3,'StatStealPercentScalar',.1),duration=value(u,3,'SpiritRealmDuration',7),id=g.counter++;
 const transfer={hp:v.maxHp*pct,ad:v.damage*pct,ap:(v.ap||0)*pct,armor:(v.armor||0)*pct,mr:(v.mr||0)*pct,attackSpeed:(1/Math.max(.1,v.period))*pct};
 u.classicRealmStats??={};v.classicRealmStats??={};const negative=Object.fromEntries(Object.entries(transfer).map(([k,n])=>[k,-n]));
 for(const[k,n]of Object.entries(transfer)){u.classicRealmStats[k]=(u.classicRealmStats[k]||0)+n;v.classicRealmStats[k]=(v.classicRealmStats[k]||0)-n;}
 for(const p of g.projectiles)if(p.source===u||p.source===v)p.life=0;g.zones=(g.zones||[]).filter(z=>z.source!==u&&z.source!==v);for(const actor of [u,v]){actor.dash=null;actor.forcedMove=null;actor.target=null;actor.dest=null;}u.classicRealmId=v.classicRealmId=id;g.zones??=[];g.zones.push({id,kind:'mordeRealm',classicRealmId:id,source:u,target:v,x:(u.x+v.x)/2,y:(u.y+v.y)/2,r:value(u,3,'ZoneRadius',1200)*scale(g),age:0,duration});
 s.realm={id,targetId:v.id,until:g.time+duration,casterDelta:transfer,victimDelta:negative,finished:false};refresh(g,u);refresh(g,v);cue(g,u,'Mordekaiser_Base_R_Cast');
}
function addFury(g,u,v,token){if(v.kind!=='hero')return;const s=state(u);s.pTokens??={};const key=token==null?null:token+':'+v.id;if(key&&s.pTokens[key])return;if(key)s.pTokens[key]=g.time+4;s.pStacks=Math.min(passiveValue(u,'MaximumStacks',3),(s.pUntil>g.time?s.pStacks||0:0)+1);s.pUntil=g.time+passiveValue(u,'CombatTrackingDuration',4);s.pNext??=g.time;}
export function castMordekaiser(g,i,aim,h){
 const u=g.player,s=state(u),shield=(u.supportState?.shieldParts||[]).find(p=>p.key==='mordeW'&&p.remaining>0&&p.until>g.time);
 if(i===1&&shield&&s.wUntil>g.time){if(!canCast(g,u,i,{ignoreCooldown:true,ignoreCost:true})||g.time<s.wReadyAt)return false;const remaining=shield.remaining;u.shield=Math.max(0,u.shield-remaining);shield.remaining=0;s.wUntil=0;healUnit(g,u,u,remaining*value(u,1,'HealingPercent',.35),{state:'w'});h.combatEvent(g,u,'w','recast',{audioCue:'MordekaiserWHeal_OnCast'});cue(g,u,'Mordekaiser_Base_W_Shield_Consume');return true;}
 if(!canCast(g,u,i))return false;if([0,2].includes(i)&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 if(i===3&&(!unitTarget(g,u,aim,650)||aim.kind!=='hero'||realmId(u)||realmId(aim)))return false;
 const token=beginCast(g,u,i,aim,h);
 if(i===0){const from={x:u.x,y:u.y},to=lineEnd(u,aim,675*scale(g));u.castUntil=g.time+.5;h.schedule(g,u,.5,()=>{const hit=enemies(g,u).filter(v=>segmentDistance(v,from,to)<=value(u,0,'RectangleWidth',160)*scale(g)/2+v.radius);const n=calculation(u,0,hit.length===1?'EmpoweredDamageTooltip':'QDamage');for(const v of hit)h.hit(g,{source:u,effectState:'q',castToken:token,damageType:'magic',aoe:true},v,n);cue(g,u,hit.length===1?'Mordekaiser_Base_Q_Impact_Mega':hit.length?'Mordekaiser_Base_Q_Impact':'Mordekaiser_Base_Q_Impact_Miss',to);});}
 if(i===1){const amount=Math.max(u.maxHp*value(u,1,'BaseShield',.05),Math.min(s.reserve||0,u.maxHp*value(u,1,'MaxHealthCap',.3)));s.reserve=0;s.wUntil=g.time+value(u,1,'Duration',5);s.wReadyAt=g.time+.5;shieldUnit(g,u,u,amount,value(u,1,'Duration',5),{state:'w',key:'mordeW'});}
 if(i===2){const from={x:u.x,y:u.y},to=lineEnd(u,aim,700*scale(g)),dx=(to.x-from.x)/(distance(to,from)||1),dy=(to.y-from.y)/(distance(to,from)||1);h.schedule(g,u,value(u,2,'DelayBeforeMovement',.5),()=>{for(const v of enemies(g,u))if(segmentDistance(v,from,to)<=100*scale(g)+v.radius)h.hit(g,{source:u,effectState:'e',castToken:token,damageType:'magic',aoe:true,onHit:t=>forceTo(g,u,t,{x:t.x-dx*value(u,2,'KnockTowardsDistance',250)*scale(g),y:t.y-dy*value(u,2,'KnockTowardsDistance',250)*scale(g)},{duration:.25})},v,calculation(u,2,'TotalDamage'));});}
 if(i===3){u.castUntil=g.time+.5;h.schedule(g,u,.5,()=>{if(!aim.alive||realmId(u)||realmId(aim))return;h.hit(g,{source:u,effectState:'r',onHit:v=>beginRealm(g,u,v)},aim,0);});}
 return true;
}
export function mordeAfterDamage(g,u,v,{basic,meta,dealt}){const s=state(u);if(dealt>0&&!meta.augmentProc){s.reserve=Math.min(u.maxHp*value(u,1,'MaxHealthCap',.3),(s.reserve||0)+dealt*value(u,1,'DamageConversion',.45)*(v.kind==='minion'?value(u,1,'MinionPenalty',.25):1));s.lastCombat=g.time;}
 if(meta.classicProc)return;if(basic){damage(g,u,v,calculation(u,-1,'BonusAPAuto'),'magic','passive');addFury(g,u,v,null);}else if(['q','e'].includes(meta.state))addFury(g,u,v,meta.castToken);
}
export function mordeIncoming(g,u,amount){const s=state(u);s.reserve=Math.min(u.maxHp*value(u,1,'MaxHealthCap',.3),(s.reserve||0)+amount*value(u,1,'DamageTakenConversion',.075));s.lastCombat=g.time;return amount;}
export function updateMorde(g,u,dt,h){const s=state(u);if(s.realm){const v=g.units.find(x=>x.id===s.realm.targetId);if(!v?.alive)finishRealm(g,u,{victimDied:true});else if(s.realm.until<=g.time)finishRealm(g,u);}
 if(s.retainedRealm){const v=g.units.find(x=>x.id===s.retainedRealm.targetId);if(!v||v.alive&&(v.lifeSerial||0)!==s.retainedRealm.lifeSerial){removeTransfer(g,u,s.retainedRealm.delta);s.retainedRealm=null;}}
 for(const[k,t]of Object.entries(s.pTokens||{}))if(t<=g.time)delete s.pTokens[k];if(s.pUntil<=g.time)s.pStacks=0;
 if(s.pStacks>=3&&g.time>=(s.pNext||0)){s.pNext=g.time+.25;for(const v of enemies(g,u))if(distance(u,v)<=passiveValue(u,'DoTRadius',375)*scale(g)+v.radius)h.hit(g,{source:u,effectState:'passive',damageType:'magic',periodic:true,aoe:true},v,(calculation(u,-1,'AuraDamagePerStack')+v.maxHp*calculation(u,-1,'PercentHealthForAura')/100)*.25);}
 if(g.time-(s.lastCombat??0)>value(u,1,'TimeBeforeDecay',1))s.reserve=Math.max(0,(s.reserve||0)-u.maxHp*value(u,1,'DecayPerSecond',.005)*dt);
 const part=(u.supportState?.shieldParts||[]).find(p=>p.key==='mordeW'&&p.remaining>0);if(part&&s.wUntil>g.time){const decay=part.remaining*dt/Math.max(dt,s.wUntil-g.time);part.remaining-=decay;u.shield=Math.max(0,u.shield-decay);}
}
export function mordeDeath(g,u){for(const caster of g.units){const r=caster.classic?.realm;if(r&&(caster===u||r.targetId===u.id))finishRealm(g,caster,{victimDied:r.targetId===u.id&&caster!==u});}const retained=u.classic?.retainedRealm;if(retained){removeTransfer(g,u,retained.delta);u.classic.retainedRealm=null;}}
export function mordeMove(g,u){return state(u).pStacks>=3&&state(u).pUntil>g.time?u.baseMoveSpeed*calculation(u,-1,'PassiveMovementSpeed'):0;}
