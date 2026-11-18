import {itemStasis} from './item-effects.js';
export const MASTERY_LEVEL=10, MASTERY_DURATION=4, MASTERY_COOLDOWN=6;
export const PINGS={basic:{label:'信号',fx:'SR_Pings_Blue',sound:'basic'},caution:{label:'小心',fx:'SR_Pings_Caution',sound:'danger'},retreat:{label:'撤退',fx:'SR_Pings_Retreat',sound:'retreat'},push:{label:'推进',fx:'SR_Pings_Push',sound:'basic'},omw:{label:'正在路上',fx:'SR_Pings_OMW',sound:'omw'},allin:{label:'全力进攻',fx:'SR_Pings_All_In',sound:'attack'},assist:{label:'请求协助',fx:'SR_Pings_Assist',sound:'assist'},needvision:{label:'需要视野',fx:'SR_Pings_NeedVision',sound:'basic'},missing:{label:'敌人消失',fx:'SR_Pings_Missing',sound:'missing'},vision:{label:'此处有眼',fx:'SR_Pings_EnemyVision',sound:'vision'},clearvision:{label:'视野已排除',fx:'SR_Pings_EnemyVisionCleared',sound:'vision'},attack:{label:'攻击目标',fx:'SR_Pings_Attack',sound:'attack'},defend:{label:'保护目标',fx:'SR_Pings_Defend',sound:'defend'}};
const stores=new WeakMap();function store(g){let s=stores.get(g);if(!s){s={id:0,quota:new WeakMap(),mastery:new WeakMap()};stores.set(g,s);}return s;}
function append(g,e){g.signals??=[];g.signals=g.signals.filter(s=>g.time-s.time<8);g.signals.push(e);if(g.signals.length>128)g.signals.shift();return e;}
export function sendPing(g,u,type,point,targetId){
 if(!u||u.kind!=='hero'||g.winner!==null||!Object.prototype.hasOwnProperty.call(PINGS,type)||!Number.isFinite(point?.x)||!Number.isFinite(point?.y)||Math.abs(point.x)>10000||Math.abs(point.y)>10000)return false;
 const s=store(g),q=s.quota.get(u)||{tokens:6,at:g.time};q.tokens=Math.min(6,q.tokens+Math.max(0,g.time-q.at));q.at=g.time;s.quota.set(u,q);if(q.tokens<1)return false;
 let target=Number.isInteger(targetId)?g.units.find(v=>v.id===targetId):null;
 if(target&&!target.alive)target=null;if(type==='basic'&&target)type=target.team!==u.team?'attack':target.kind==='tower'?'defend':'basic';
 if(type==='attack'&&target?.team===u.team||type==='defend'&&target?.team!==u.team)return false;
 const pos=target?{x:target.x,y:target.y}:g.navigation?.snap?g.navigation.snap(point.x,point.y):{x:Math.max(0,Math.min(3200,point.x)),y:Math.max(-1600,Math.min(1600,point.y))};q.tokens--;
 return append(g,{id:++s.id,kind:'ping',type,sourceId:u.id,peerId:u.netPeerId??null,team:u.team,name:u.playerName||u.hero?.title||u.hero?.name,x:pos.x,y:pos.y,targetId:target?.id??null,time:g.time,until:g.time+3});
}
export function showMastery(g,u){if(!u?.alive||u.kind!=='hero'||g.winner!==null||itemStasis(g,u))return false;const s=store(g);if(g.time<(s.mastery.get(u)||0))return false;s.mastery.set(u,g.time+MASTERY_COOLDOWN);u.masteryLevel=MASTERY_LEVEL;u.masteryReadyAt=g.time+MASTERY_COOLDOWN;return append(g,{id:++s.id,kind:'mastery',sourceId:u.id,peerId:u.netPeerId??null,team:u.team,name:u.playerName||u.hero?.title||u.hero?.name,level:MASTERY_LEVEL,x:u.x,y:u.y,time:g.time,until:g.time+MASTERY_DURATION});}
export function signalsFor(g,viewer){if(!viewer)return[];return(g.signals||[]).filter(e=>e.until>g.time&&(e.kind==='ping'?e.team===viewer.team:g.units.some(u=>u.id===e.sourceId&&u.alive&&u.visible!==false)));}
