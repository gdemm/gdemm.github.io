import {canCastWithAugments,augmentOnCast,combatCooldownMultiplier} from './augment-rules.js';
import {shieldUnit} from './combat-support.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Custom playable monster kit, not an official champion kit.
export function castBaron(g,i,aim,h){
 const u=g.player,k=1/(g.mapConfig?.scale||2);
 if(i<0||i>3||!u.alive||g.winner!==null||u.stun>0||u.silence>0||u.charm>0||u.dash||u.castUntil>g.time||u.skills[i]>0||!canCastWithAugments(u,i))return false;
 if(i!==2&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 aim??=u;const state='qwer'[i],from={x:u.x,y:u.y};u.skills[i]=[7,12,16,90][i]*combatCooldownMultiplier(u,i);h.cancelAttack(u);u.animation=state;u.animationSerial++;u.animUntil=g.time+.65;u.castUntil=g.time+.25;u.facing=Math.atan2(aim.x-u.x,aim.y-u.y);g.shopHistory=[];h.combatEvent(g,u,state,'cast',{from,aim:{x:aim.x,y:aim.y}});augmentOnCast(g,u,i,aim,from);
 const targets=()=>g.enemies(u).filter(v=>['hero','minion'].includes(v.kind));
 const hit=(v,n,extra={})=>h.hit(g,{source:u,effectState:state,damageType:'magic',...extra},v,n);
 if(i===0)h.missile(g,u,'BaronAcid','q',aim,{range:1000,damage:90+u.level*10+(u.ap||0)*.5,damageType:'magic',slow:2,slowPercent:.3,filter:v=>['hero','minion'].includes(v.kind)});
 if(i===1)h.schedule(g,u,.35,()=>{for(const v of targets())if(dist(u,v)<=400*k+v.radius)hit(v,120+u.damage*.8,{stun:.7});g.fx('ring',u.x,u.y,'#bc87ed',400*k,.6);});
 if(i===2)shieldUnit(g,u,u,u.maxHp*.2,4,{state:'e'});
 if(i===3){const d=dist(u,aim)||1,r=Math.min(d,1200*k),to={x:u.x+(aim.x-u.x)/d*r,y:u.y+(aim.y-u.y)/d*r};g.fx('ring',to.x,to.y,'#b783eb',350*k,.75);h.schedule(g,u,.75,()=>{for(const v of targets())if(dist(v,to)<=350*k+v.radius)hit(v,250+u.level*15+(u.ap||0)*.8,{stun:1});g.fx('burst',to.x,to.y,'#ce98ff',350*k,.7);});}
 return true;
}
