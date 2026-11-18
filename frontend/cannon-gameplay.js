import {beginCannonCue,cancelCannonCue} from './cannon-cues.js';
// Local trial balance values: not claimed to be Riot's server-side rules.
export const CANNON_RULES={range:1500,speed:900,minFlight:.65,maxFlight:4,damage:200,apRatio:.3,adRatio:.5,radius:85,cooldown:10,aimTimeout:20,useRange:255};
export function cannonPosition(g,team){const p={x:team?3010:190,y:100};return g.navigation?g.navigation.snap(p.x,p.y):p;}
export function cannonBlocked(g,u){return !u?.alive||u.kind!=='hero'||g.winner!==null||u.stun>0||u.root>0||u.silence>0||u.charm>0||u.airborne>0||u.fearUntil>g.time||u.itemStasisUntil>g.time||u.yiUntargetableUntil>g.time||u.castUntil>g.time||u.jhinChannel||u.mfChannel||u.spin>0||u.expansionBerserk?.until>g.time;}
export function enterCannon(g,u,team=u?.team){
 if(!g.mapConfig||team!==0&&team!==1||cannonBlocked(g,u)||u.cannonState||u.hexgateChannel||u.cannonReadyAt>g.time)return false;
 const p=cannonPosition(g,team);if(Math.hypot(u.x-p.x,u.y-p.y)>CANNON_RULES.useRange)return false;
 u.dest=u.target=u.attackWindup=null;u.order='stop';u.teemoStealth=false;
 u.cannonState={phase:'aim',team,started:g.time,until:g.time+CANNON_RULES.aimTimeout,damage:u.damageTakenTotal||0,fromX:u.x,fromY:u.y};
 return true;
}
export function cancelCannon(g,u){
 if(u.cannonState?.phase==='flight')return false;
 u.cannonState=null;cancelCannonCue(g,u.id);return true;
}
export function launchCannon(g,u,x,y){
 const s=u.cannonState;
 if(!s||s.phase!=='aim'||cannonBlocked(g,u)||!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>10000||Math.abs(y)>10000||g.time>s.until)return false;
 const p=g.navigation?g.navigation.snap(x,y):{x:Math.max(5,Math.min(3195,x)),y:Math.max(-350,Math.min(350,y))};
 const enhanced=u.augments?.includes('Overextender')||false,range=CANNON_RULES.range+(enhanced?12000/(g.mapConfig?.scale||2):0);
 const dist=Math.hypot(p.x-s.fromX,p.y-s.fromY);
 if(dist>range||dist<35)return false;
 const duration=Math.max(CANNON_RULES.minFlight,Math.min(CANNON_RULES.maxFlight,dist/(CANNON_RULES.speed*(enhanced?1.5:1))));
 Object.assign(s,{phase:'flight',x:p.x,y:p.y,started:g.time,until:g.time+duration,enhanced});
 u.cannonReadyAt=g.time+CANNON_RULES.cooldown;u.augmentSpawnWindow=false;
 beginCannonCue(g,u,{x:p.x,y:p.y,duration,enhanced});return true;
}
export function updateCannon(g,u){
 const s=u.cannonState;if(!s)return false;
 if(!u.alive||g.winner!==null){u.cannonState=null;u.cannonLift=0;cancelCannonCue(g,u.id);return false;}
 if(s.phase==='aim'){
  if(cannonBlocked(g,u)||g.time>s.until||(u.damageTakenTotal||0)>s.damage||Math.hypot(u.x-s.fromX,u.y-s.fromY)>3){cancelCannon(g,u);return false;}
  return true;
 }
 const progress=Math.max(0,Math.min(1,(g.time-s.started)/(s.until-s.started)));
 u.x=s.fromX+(s.x-s.fromX)*progress;u.y=s.fromY+(s.y-s.fromY)*progress;u.cannonLift=Math.sin(progress*Math.PI)*160;
 if(progress<1)return true;
 if(s.enhanced)u.overextenderDistanceNative=(u.overextenderDistanceNative||0)+Math.hypot(s.x-s.fromX,s.y-s.fromY)*(g.mapConfig?.scale||2);
 u.cannonLift=0;u.cannonState=null;u.dest=u.target=u.attackWindup=null;u.order='stop';
 const amount=(CANNON_RULES.damage+(u.ap||0)*CANNON_RULES.apRatio+Math.max(0,u.damage-(u.hero?.damage||0))*CANNON_RULES.adRatio)*(s.enhanced?1.5:1);
 for(const v of [...g.units])if(v.alive&&v.team!==u.team&&['hero','minion'].includes(v.kind)&&Math.hypot(v.x-u.x,v.y-u.y)<=CANNON_RULES.radius+(v.radius||0)&&g.canHit(v))g.hurt(v,amount,u,0,0,'magic',false,{cannon:true,itemProc:true,augmentProc:true,state:'cannon'});
 return true;
}
