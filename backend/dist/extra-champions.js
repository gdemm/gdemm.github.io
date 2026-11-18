import {classicFriendlyTarget} from './classic-friendly-target.js';
import {healUnit,shieldUnit} from './combat-support.js';
import {mundoPreventControl} from './ryze-mundo.js';
import {blockItemSpell} from './item-stacks.js';
import {coreControl,coreBlockSpell} from './augment-core.js';
import {augmentAttackDamage} from './augment-rules.js';
import {SETT_E,settEHit,settEPullEnd} from './melee-e.js';
import {SETT_W,settWHit,startSettWShield,updateSettWShield} from './sett-w.js';
import {yasuoQCooldown,yasuoQCastTime,windwallSpec,windwallContact,selectYasuoRTarget,YASUO_R_RANGE} from './yasuo-rules.js';
import {COMBAT_DATA} from './combat-data.js';
import {canCastWithAugments,augmentOnCast,combatCooldownMultiplier} from './augment-rules.js?v=hextech-aram-3';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),scale=g=>1/(g.mapConfig?.scale||2);
export const isExtraChampion=u=>u?.hero?.id==='Yasuo'||u?.hero?.id==='Sett';
function data(u,i){const d=COMBAT_DATA[u.hero.id];return d?.spells[d.abilityNames[i]]?.data||{};}
function value(u,i,name,fallback){const v=data(u,i).DataValues?.find(v=>v.name===name)?.values;return v?.[u.spellRanks?.[i]||1]??fallback;}
export function extraSkillRange(u,i){
 if(u.hero.id==='Yasuo')return i===0?value(u,0,u.yasuoStacks>=2?'TornadoRange':'StabRange',u.yasuoStacks>=2?1100:450):i===1?400:i===2?475:YASUO_R_RANGE;
 if(u.hero.id==='Sett')return [0,805,490,400][i];
 return null;
}
export function validSkillTarget(u,index,target){if(target?.classicClone)target={...target,kind:'hero'};if(u.hero.id==='Sylas'&&index===3&&u.sylasStolenHero)return validSkillTarget({...u,hero:u.sylasStolenHero},index,target);
 const friendly=classicFriendlyTarget(u,index,target);if(friendly!==null)return friendly;
 if(!target?.alive||target.team===u.team)return false;
 if(['Teemo','MasterYi','Jhin','MissFortune'].includes(u.hero.id)&&index===0)return ['hero','minion'].includes(target.kind);
 if(u.hero.id==='Yasuo'&&index===2)return ['hero','minion'].includes(target.kind);
 if(u.hero.id==='Chogath'&&index===3||u.hero.id==='Sylas'&&index===1)return ['hero','minion'].includes(target.kind);return target.kind==='hero';
}
export function championResource(u){if(u?.hero?.id==='Jhin')return {name:'弹药',value:u.jhinAmmo??4,max:4};if(u?.hero?.id==='Tryndamere')return {name:'怒气',value:u.tryndFury||0,max:100};
 if(u?.hero?.id==='Yasuo')return {name:'剑意',value:u.yasuoFlow||0,max:100};
 if(u?.hero?.id==='Sett')return {name:'豪意',value:u.settGrit||0,max:u.maxHp*.5};
 return null;
}
function cue(g,u,state,phase,point=u){g.combatEvents??=[];g.combatEvents.push({id:g.counter++,source:u,hero:u.hero.id,state,phase,x:point.x,y:point.y,time:g.time});if(g.combatEvents.length>256)g.combatEvents.splice(0,g.combatEvents.length-256);}
export function championLift(u,time){
 const carry=u.forcedMove?.holder?.dash,move=u.dash?.kind==='settR'?u.dash:carry?.kind==='settR'?carry:null;
 if(move){const t=clamp((time-move.start)/move.duration,0,1);return Math.sin(Math.PI*t)*180+(carry?60:0);}
 if(u.airborne>0)return Math.sin(Math.PI*clamp(1-u.airborne/(u.airborneTotal||1),0,1))*85;
 return 0;
}
function effect(g,u,name,point=u,duration=.7){g.fx('native',point.x,point.y,u.hero.color,40,duration,{hero:u.hero.id,nativeName:name,nativeDuration:duration,facing:u.facing,nativeGround:/AoE|EQ|_tar_double/.test(name)});}
export function beforeChampionDamage(g,v,source,damage){
 if(v.settWShield)v.settShieldBefore=v.shield;
 if(v.hero?.id==='Yasuo'&&damage>0&&source.team!==v.team&&v.yasuoFlow>=100){v.yasuoFlow=0;shieldUnit(g,v,v,100+14*v.level,1.5,{kind:'passive'});effect(g,v,'Yasuo_Base_Passive_Burst');cue(g,v,'passive','cast');}
}
export function afterChampionDamage(g,v,dealt,source){delete v.settShieldBefore;if(v.hero?.id==='Sett'&&dealt>0&&!source?.fountain){v.settGrit=Math.min(v.maxHp*.5,(v.settGrit||0)+dealt);v.settLastDamage=g.time;}}
export function clearChampionLife(u){u.tryndFury=0;u.tryndRUntil=0;u.tryndSpin=null;u.tryndWUntil=0;if(u.hero?.id==='Darius'){u.dariusW=false;u.dariusWUntil=0;u.dariusMightUntil=0;u.dariusBonusAD=0;u.dariusRRecastUntil=0;}u.dariusBleeds={};if(u.hero?.id==='Garen'){u.spin=0;u.garenSpinAnimationRate=1;}if(u.hero?.id==='Yasuo'){u.yasuoFlow=0;u.yasuoStacks=0;u.yasuoStackUntil=0;}if(u.hero?.id==='Sett'){u.settGrit=0;u.settQHits=0;u.settNextRight=false;u.settWShield=null;u.settWCast=null;u.settECast=null;}if(u.yasuoDashLocks)u.yasuoDashLocks={};u.airborne=0;u.airborneSourceId=null;u.airborneAbility=null;u.forcedMove=null;u.dash=null;}
export function updateChampionState(g,u,dt){
 if(u.hero.id==='Yasuo'){
  if(u.dash?.kind==='yasuoE'&&(u.stun>0||u.root>0||u.grounded>0))u.dash=null;
  if(u.yasuoLastX!==undefined){const moved=Math.min(distance(u,{x:u.yasuoLastX,y:u.yasuoLastY}),u.speed*dt*3);u.yasuoFlow=Math.min(100,(u.yasuoFlow||0)+moved/(scale(g)*18));}
  u.yasuoLastX=u.x;u.yasuoLastY=u.y;
  if(g.time>(u.yasuoStackUntil||0))u.yasuoStacks=0;
  if(g.time>(u.yasuoEStackUntil||0))u.yasuoEStacks=0;
 }else if(u.hero.id==='Sett'){
  updateSettWShield(g,u);
  if(g.time-(u.settLastDamage??-99)>4)u.settGrit=Math.max(0,(u.settGrit||0)-u.maxHp*.15*dt);
  if(g.time>(u.settQUntil||0))u.settQHits=0;
  if(g.time>(u.settPunchUntil||0))u.settNextRight=false;
  if(u.hp<u.maxHp)healUnit(g,u,u,dt*(1+Math.floor((1-u.hp/u.maxHp)*10))*.5,{regen:true});
 }
}
export function updateForcedMovement(g,u){
 const move=u.forcedMove;if(!move)return false;
 const t=clamp((g.time-move.start)/move.duration,0,1);
 if(move.holder&&t<1&&move.holder.alive){u.x=move.holder.x;u.y=move.holder.y;}else{u.x=move.from.x+(move.to.x-move.from.x)*t;u.y=move.from.y+(move.to.y-move.from.y)*t;}
 u.dest=null;u.target=null;
 if(t>=1){if(move.stunAfter)u.stun=Math.max(u.stun||0,move.stunAfter);if(move.slowAfter){u.slow=Math.max(u.slow||0,move.slowAfter);u.slowPercent=move.slowPercent;}u.forcedMove=null;}
 return true;
}
export function windwallBlocks(g,p,old){
 if(p.unblockable||p.beam||p.isBeam||p.source?.kind==='tower')return false;
 for(const wall of g.zones||[]){
  if(wall.kind!=='windwall'||wall.source.team===p.source?.team||wall.age>=wall.duration)continue;
  const contact=windwallContact(wall,p,old);if(!contact)continue;
  p.x=contact.x;p.y=contact.y;p.life=0;p.blockedByWindwall=wall.id;p.visualEnd={x:contact.x,y:contact.y};
  effect(g,wall.source,'Yasuo_Base_W_windwall_big_impact',contact,.4);cue(g,wall.source,'w','hit',contact);return true;
 }
 return false;
}
export function extraAttack(g,u,target,helpers){
 const right=u.hero.id==='Sett'&&Boolean(u.settNextRight),empowered=u.hero.id==='Sett'&&(u.settQHits||0)>0;
 const critical=(u.crit||0)>0&&g.random()<Math.min(1,u.crit*(u.hero.id==='Yasuo'?2.5:1));
 let damage=u.damage*(critical?(u.critDamageMultiplier||1.75)*(u.hero.id==='Yasuo'?.9:1):1);
 if(right)damage+=5+Math.max(0,u.damage-u.hero.damage)*.5;
 if(empowered){damage+=value(u,0,'BaseDamage',10)+target.maxHp*(value(u,0,'EnemyMaxHealthDamage',.01)+value(u,0,'MaxHealthTADRatio',.0001)*u.damage);u.settQHits--;}
 const state=empowered?(right?'q-attack2':'q-attack'):(right?'attack2':'attack');
 damage+=augmentAttackDamage(u);
 const spellName=u.hero.id==='Sett'?(empowered?(right?'SettQAttack2':'SettQAttack'):(right?'SettBasicAttack2':'SettBasicAttack')):'YasuoBasicAttack';
 helpers.hit(g,{source:u,effectState:state,spellName,damageType:'physical',basic:true,critical},target,damage);
 if(u.hero.id==='Sett'){u.settNextRight=!right;u.settPunchUntil=g.time+2;}
 return state;
}
export function castExtraChampion(g,index,aim,h){
 const u=g.player,id=u.hero.id,k=scale(g),s=data(u,index),rank=u.spellRanks?.[index]||1;
 const combo=id==='Yasuo'&&index===0&&u.dash?.kind==='yasuoE';
 if(u.dash&&!combo&&!(id==='Yasuo'&&index===3))return false;
 if(!u.alive||g.winner!==null||u.stun>0||u.charm>0||u.silence>0||u.forcedMove||(!combo&&u.castUntil>g.time)||!canCastWithAugments(u,index)||u.skills[index]>0)return false;
 const mobility=id==='Yasuo'&&[2,3].includes(index)||id==='Sett'&&index===3;if(mobility&&(u.root>0||u.grounded>0))return false;
 if(id==='Yasuo'&&index===3){aim=selectYasuoRTarget(g,u,aim);if(!aim){g.notice('R范围内没有可接大的击飞英雄');return false;}}
 const targeted=id==='Yasuo'&&[2,3].includes(index)||id==='Sett'&&index===3;
 if(targeted&&(!validSkillTarget(u,index,aim)||!g.canHit(aim)||distance(u,aim)>extraSkillRange(u,index)*k+(aim.radius||0))){g.notice(index===2?'请选择范围内的敌方英雄或小兵':'请选择范围内的敌方英雄');return false;}
 if(id==='Sett'&&index===3&&aim.unstoppableUntil>g.time)return false;
 if(id==='Yasuo'&&index===2&&(aim.yasuoDashLocks?.[u.id]||0)>g.time){g.notice('该目标仍在踏前斩间隔内');return false;}
 if(id==='Yasuo'&&index===3&&!(aim.airborne>0)){g.notice('狂风绝息斩只能对击飞中的敌方英雄施放');return false;}
 const baseCD=(s.Cooldown?.values||s.cooldownTime)?.[rank]??[4,20,.5,80][index];
 u.skills[index]=id==='Yasuo'&&index===2?.1:id==='Yasuo'&&index===0?yasuoQCooldown(u):baseCD*combatCooldownMultiplier(u,index)*(id==='Sett'&&index===1?3:1);
 const from={x:u.x,y:u.y},length=distance(u,aim)||1,dir={x:(aim.x-u.x)/length,y:(aim.y-u.y)/length};if(!Number.isFinite(dir.x)||Math.hypot(dir.x,dir.y)<.01){dir.x=Math.sin(u.facing||0);dir.y=Math.cos(u.facing||0);}
 const enemies=()=>g.units.filter(v=>v.alive&&v.team!==u.team&&['hero','minion'].includes(v.kind)&&g.canHit(v));
 const snap=p=>g.navigation?g.navigation.snap(clamp(p.x,5,3195),clamp(p.y,-400,400)):{x:clamp(p.x,65,3135),y:clamp(p.y,-212,212)};
 const knock=(v,duration)=>{if(!v.alive||v.unstoppableUntil>g.time||mundoPreventControl(g,v,duration)===0)return;coreControl(g,u,v,{state:'qwer'[index]});v.airborneSourceId=u.id;v.airborneAbility=id==='Yasuo'&&index===0?'q':'qwer'[index];v.airborneTotal=duration;v.airborne=Math.max(v.airborne||0,duration);v.stun=Math.max(v.stun||0,duration);v.dest=null;v.attackWindup=null;};
 const damage=(v,n,state,type='physical',extra={})=>h.hit(g,{source:u,effectState:state,spellName:COMBAT_DATA[id].abilityNames[index],damageType:type,...extra},v,n);
 const state=id==='Yasuo'&&index===0&&u.yasuoStacks>=2?'q3':'qwer'[index];
 let delay=id==='Yasuo'&&index===0?(combo?0:yasuoQCastTime(u)):id==='Sett'&&index===1?SETT_W.windup:targeted?0:s.mCastTime??.2;
 if(id==='Sett'&&index===0)delay=0;
 h.cancelAttack(u);u.animation=combo?'qdash':id==='Yasuo'&&index===0&&u.yasuoStacks===1?'q2':state;u.animationSerial++;u.animUntil=g.time+Math.max(.35,delay);u.castUntil=g.time+delay;u.facing=Math.atan2(dir.x,dir.y);g.shopHistory=[];
 const castEvent=h.combatEvent(g,u,state,'cast',{spellName:COMBAT_DATA[id].abilityNames[index],aim:{x:aim.x,y:aim.y},from,castDelay:delay});augmentOnCast(g,u,index,aim,from);
 if(id==='Yasuo'){
  if(index===0){
   const tornado=state==='q3';if(tornado)u.yasuoStacks=0;
   const execute=()=>{
    const amount=value(u,0,'BaseDamage',20)+u.damage*value(u,0,'ADRatio',1.05);
    if(combo){const hits=enemies().filter(v=>distance(v,u)<=value(u,0,'SpinWidth',260)*k+v.radius);for(const v of hits){const landed=damage(v,amount,state);if(tornado&&landed!==false)knock(v,1);}effect(g,u,tornado?'Yasuo_Base_EQ3_cas':'Yasuo_Base_EQ_cas');if(hits.length&&!tornado){u.yasuoStacks=Math.min(2,(u.yasuoStacks||0)+1);u.yasuoStackUntil=g.time+value(u,0,'GatheringStormDuration',6);}return;}
    if(tornado){const m=h.missile(g,u,'YasuoQ3Mis','q3',aim,{range:value(u,0,'TornadoRange',1100),damage:amount,damageType:'physical',speed:1200*k,minSpeed:1200*k,maxSpeed:1200*k,acceleration:0,pierce:true,r:45*k,missileEffect:'Yasuo_Base_Q_wind_mis',hitEffect:'Yasuo_Base_Q_wind_hit_tar',filter:v=>['hero','minion'].includes(v.kind),onHit:v=>knock(v,1)});m.vx=dir.x*m.speed;m.vy=dir.y*m.speed;return;}
    const hits=enemies().filter(v=>{const x=v.x-u.x,y=v.y-u.y,along=x*dir.x+y*dir.y;return along>=-v.radius&&along<=value(u,0,'StabRange',450)*k+v.radius&&Math.abs(-x*dir.y+y*dir.x)<=value(u,0,'StabWidth',80)*k*.5+v.radius;});
    for(const v of hits)damage(v,amount,'q');if(hits.length){u.yasuoStacks=Math.min(2,(u.yasuoStacks||0)+1);u.yasuoStackUntil=g.time+value(u,0,'GatheringStormDuration',6);}
   };
   h.schedule(g,u,combo?Math.max(delay,u.dash.start+u.dash.duration-g.time):delay,execute);
  }else if(index===1){
   const w=windwallSpec(u);
   h.addZone(g,u,{kind:'windwall',state:'w',...from,origin:from,previousX:from.x,previousY:from.y,dir,width:w.width*k,thickness:w.thickness*k,duration:w.duration,nativeHeight:w.height,nativeEffect:w.nativeEffect,motion:{initialSpeed:w.initialSpeed*k,minSpeed:w.minSpeed*k,acceleration:w.acceleration*k,travelRange:w.travelRange*k}});
  }else if(index===2){
   aim.yasuoDashLocks??={};aim.yasuoDashLocks[u.id]=g.time+value(u,2,'PerTargetCooldown',10);u.yasuoEStacks=Math.min(4,(u.yasuoEStacks||0)+1);u.yasuoEStackUntil=g.time+5;
   const to=snap({x:u.x+dir.x*475*k,y:u.y+dir.y*475*k});u.dest=null;u.dash={kind:'yasuoE',from,to,start:g.time,duration:Math.max(.12,distance(u,to)/((value(u,2,'BaseDashSpeed',750)+u.speed/k)*k)),done:()=>{if(aim.alive)damage(aim,(value(u,2,'BaseDamage',70)+(u.ap||0)*.6+Math.max(0,u.damage-u.hero.damage)*.2)*(1+.15*(u.yasuoEStacks-1)),'e','magic');}};
   u.animUntil=g.time+u.dash.duration;castEvent.dash={kind:u.dash.kind,from:{...from},to:{...to},start:u.dash.start,duration:u.dash.duration};
  }else if(index===3){
   const victims=enemies().filter(v=>v.kind==='hero'&&v.airborne>0&&distance(v,aim)<=value(u,3,'RRadius',400)*k&&!coreBlockSpell(g,u,v,{})&&!blockItemSpell(g,u,v,{}));const to=snap({x:aim.x-dir.x*65*k,y:aim.y-dir.y*65*k});u.x=to.x;u.y=to.y;u.dash=null;u.dest=null;u.castUntil=g.time+1;u.animUntil=g.time+1;u.yasuoFlow=100;u.yasuoRBuffUntil=g.time+15;
   for(const v of victims){v.forcedMove=null;knock(v,1);}
   h.schedule(g,u,1,()=>{for(const v of victims)if(v.alive){damage(v,value(u,3,'RBaseDamage',200)+Math.max(0,u.damage-u.hero.damage)*1.5,'r','physical',{shieldChecked:true});effect(g,u,'Yasuo_Base_R_land_tar',v);}});
  }
 }else{
  if(index===0){u.settQHits=2;u.settQUntil=g.time+4;u.settSpeedUntil=g.time+1.5;u.cd=0;}
  else if(index===1){
   const grit=u.settGrit||0;u.settGrit=0;startSettWShield(g,u,grit);u.settWCast={until:g.time+delay,dir:{...dir}};
   h.schedule(g,u,delay,()=>{u.settWCast=null;const origin={x:u.x,y:u.y},max=grit>=u.maxHp*.45,power=value(u,1,'BaseDamage',80)+grit*(value(u,1,'DamageConversionBase',.25)+.25*Math.max(0,u.damage-u.hero.damage)/100);for(const v of enemies()){const hit=settWHit(origin,dir,v,k);if(hit)damage(v,power,'w',hit.center?'true':'physical',{hitEffect:`Sett_Base_W_${max?'Max':'Min'}_Tar_${hit.center?'Center':'Edge'}`});}
    const facing=Math.atan2(dir.x,dir.y);g.fx('native',origin.x,origin.y,u.hero.color,40,1.25,{hero:'Sett',state:'w',nativeName:max?'Sett_Base_W_Max_AoE':'Sett_Base_W_Min_AoE',nativeGround:true,nativeDuration:1.25,facing});g.fx('native',origin.x,origin.y,u.hero.color,40,.6,{hero:'Sett',state:'w',nativeName:max?'Sett_Base_W_Max_Swipe':'Sett_Base_W_Min_Swipe',nativeDuration:.6,facing});});
  }else if(index===2){
   u.settECast={until:g.time+SETT_E.windup,dir:{...dir}};
   h.schedule(g,u,SETT_E.windup,()=>{u.settECast=null;const origin={x:u.x,y:u.y},hits=enemies().map(v=>({v,hit:settEHit(origin,dir,v,k)})).filter(x=>x.hit),both=hits.some(x=>x.hit.side===1)&&hits.some(x=>x.hit.side===-1);
    for(const {v}of hits){const landed=damage(v,value(u,2,'BaseDamage',50)+u.damage*.6,'e');if(landed===false||!v.alive||v.unstoppableUntil>g.time)continue;const to=snap(settEPullEnd(origin,v,k));v.forcedMove={from:{x:v.x,y:v.y},to,start:g.time,duration:SETT_E.pullDuration,stunAfter:both?SETT_E.stun:0,slowAfter:both?0:SETT_E.slowDuration,slowPercent:SETT_E.slow};knock(v,SETT_E.pullDuration);}
    if(both)effect(g,u,'Sett_Base_E_tar_child_middle');});
  }else if(index===3){
   if(coreBlockSpell(g,u,aim,{})||blockItemSpell(g,u,aim,{}))return true;const target=aim,to=snap({x:u.x+dir.x*600*k,y:u.y+dir.y*600*k}),duration=.9;const bonusHp=Math.max(0,target.maxHp-(target.hero.hp+Math.max(0,target.level-3)*70));const amount=value(u,3,'BaseDamage',200)+Math.max(0,u.damage-u.hero.damage)*1.2+bonusHp*value(u,3,'MaxHealthDamage',.4);
   u.dest=null;u.castUntil=g.time+duration;u.animUntil=g.time+duration;u.unstoppableUntil=g.time+duration;target.forcedMove={from:{x:target.x,y:target.y},to,start:g.time,duration,holder:u};target.stun=Math.max(target.stun||0,duration);target.airborne=Math.max(target.airborne||0,duration);target.airborneTotal=duration;target.airborneSourceId=u.id;target.airborneAbility='r';
   u.dash={kind:'settR',from,to,start:g.time,duration,done:()=>{target.forcedMove=null;if(target.alive){target.x=to.x;target.y=to.y;}effect(g,u,'Sett_Base_R_AoE',to,1.3);for(const v of enemies())if(distance(v,to)<=600*k+v.radius)damage(v,amount*(v===target?1:1-.5*clamp(distance(v,to)/(600*k),0,1)),'r','physical',{slow:1,slowPercent:.99,shieldChecked:v===target});}};
  }
 }
 return true;
}
