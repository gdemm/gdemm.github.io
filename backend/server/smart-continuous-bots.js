import {withNativeDecision,nearbyCandidates,nearbyTowers} from './native-nearby.js';
import {formationPoint,preferredLane} from './bot-positioning.js';
import {tryBotHealing,chooseBotRelic,releaseBotRelic} from './bot-sustain.js';
// Shared server-only controller for permanent and ordinary rooms. Private planning state lives on bot records,
// never on every broadcast snapshot. No hidden-enemy targeting or stat bonuses.
import {spellRange} from '../dist/native-combat.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const sign=u=>u.team?-1:1;
export function dangerAt(g,u,p){
 for(const tower of nearbyTowers(g,p)){
  if(!tower.alive||tower.kind!=='tower'||tower.team===u.team||dist(tower,p)>(tower.range||180)+35)continue;
  if(tower.fountain)return true;
  const tanks=nearbyCandidates(g,tower,tower.range||180).filter(v=>v.alive&&v.team===u.team&&v.kind==='minion'&&dist(tower,v)<(tower.range||180)&&dist(tower,v)<dist(tower,p)-15);
  if(!tanks.length)return true;
 }
 return false;
}
// A structure is attacked from basic-attack range, not from its own center.
// Testing the tower's coordinates always marks it dangerous, even behind a
// friendly wave, and prevents bots from ever selecting it.
export function canEngageTarget(g,u,target){
 if(!dangerAt(g,u,target))return true;
 // Ranged champions can pressure a human under tower from a safe firing spot.
 if(!['tower','inhibitor','nexus'].includes(target.kind)&&!(target.kind==='hero'&&target.netPeerId>0))return false;
 const d=dist(u,target)||1,reach=u.range+u.radius+(target.radius||0);
 const position={x:target.x+(u.x-target.x)/d*reach*.85,y:target.y+(u.y-target.y)/d*reach*.85};
 return !dangerAt(g,u,position);
}
function safePoint(g,u,p){
 const q=g.navigation?g.navigation.snap(Math.max(70,Math.min(3130,p.x)),Math.max(-360,Math.min(360,p.y))):p;
 return dangerAt(g,u,q)?null:q;
}
function walkTo(g,u,p){const q=safePoint(g,u,p);u.dest=q;return !!q;}
function rankSkills(u){
 const priorities={Garen:[2,0,1],Lux:[2,0,1],Jinx:[0,1,2],Jax:[1,2,0],DrMundo:[0,2,1],MasterYi:[0,2,1]};
 for(let n=0;n<4&&(u.skillPoints||0)>0;n++){
  const rcap=u.level>=16?3:u.level>=11?2:1;
  const slot=(u.spellRanks[3]||1)<rcap?3:(priorities[u.hero.id]||[0,2,1]).find(i=>(u.spellRanks[i]||1)<Math.min(5,Math.ceil(u.level/2)));
  if(slot===undefined)break;u.spellRanks[slot]=(u.spellRanks[slot]||1)+1;u.skillPoints--;
 }
}
function abilities(arena,room,bot,target,nearEnemies,retreat){
 const g=room.game,u=bot.unit;if(!u.alive||u.stun>0||u.silence>0||u.charm>0||u.polymorphUntil>g.time||u.itemStasisUntil>g.time||u.castUntil>g.time||u.dash)return;
 arena.withPlayer(room,bot,()=>{
  const cast=(i,aim=u)=>g.cast(i,aim),hp=u.hp/u.maxHp;
  // Summoner healing is handled centrally, including D-slot configurations.
  if(retreat){
   if(u.hero.id==='DrMundo'&&hp<.55&&cast(3,u))return;
   if(u.hero.id==='Garen'&&nearEnemies.length&&cast(1,u))return;
   if(u.hero.id==='MasterYi'&&(!nearEnemies.length||dist(u,nearEnemies[0])>220)&&hp<.55&&cast(1,u))return;
   if(hp<.18&&nearEnemies.some(v=>dist(u,v)<110)&&cast(4,{x:u.x-sign(u)*160,y:u.y}))return;
   if(u.hero.id==='Ahri'&&nearEnemies.length&&cast(3,{x:u.x-sign(u)*140,y:u.y}))return;
  }
  if(!target?.alive||target.fountain||!canEngageTarget(g,u,target))return;
  const d=dist(u,target),reach=u.range+u.radius+(target.radius||0),hero=target.kind==='hero',low=target.hp/target.maxHp<.38;
  const within=i=>d<=Math.max(reach,spellRange(u,i)/(g.mapConfig?.scale||2)+(target.radius||0));
  const trySlots=slots=>{for(const i of slots)if(within(i)&&cast(i,target))return true;return false;};
  switch(u.hero.id){
   case 'Ashe': if(u.asheFocus>=4&&d<=reach+30&&cast(0,u))return;if(hero&&(low||nearEnemies.length>1)&&trySlots([3]))return;trySlots([1]);break;
   case 'Lux': if(u.luxZone&&(dist(target,u.luxZone)<u.luxZone.r+target.radius)&&cast(2,u))return;if(hp<.65&&cast(1,u))return;if(hero&&low&&trySlots([3]))return;trySlots([0,2]);break;
   case 'Ahri': if(hero&&trySlots([2]))return;if(trySlots([0]))return;if(d<=190)cast(1,u);break;
   case 'Garen': if(hero&&low&&trySlots([3]))return;if(d<=reach+20){if(hp<.65&&cast(1,u))return;if(!(u.spin>0)&&cast(2,u))return;if(!(u.garenQ>0))cast(0,u);}break;
   case 'Darius': if(hero&&low&&trySlots([3]))return;if(hero&&d>reach&&trySlots([2]))return;if(trySlots([0]))return;if(d<=reach&&!u.dariusW)cast(1,u);break;
   case 'Sett': if(hero&&u.settGrit>u.maxHp*.15&&trySlots([1]))return;if(hero&&low&&trySlots([3]))return;if(trySlots([2]))return;if(d<=reach&&!(u.settQHits>0))cast(0,u);break;
   case 'Ezreal': if(hero&&low&&trySlots([3]))return;if(hero&&trySlots([1]))return;trySlots([0]);break;
   case 'Jinx': if(hero&&low&&d>150&&trySlots([3]))return;if(hero&&d<220&&trySlots([2]))return;if(trySlots([1]))return;if(d>reach&&!u.jinxRockets||d<150&&u.jinxRockets)cast(0,u);break;
   case 'Jax': if(hero&&d<=reach+20&&cast(3,u))return;if(d<=reach+20){if(!(u.jaxEUntil>g.time)&&cast(2,u))return;if(!(u.jaxWUntil>g.time)&&cast(1,u))return;}if(!retreat&&d>reach&&trySlots([0]))return;break;
   case 'Malphite': if(hero&&low&&trySlots([3]))return;if(trySlots([0,2]))return;if(d<=reach&&!(u.malphiteWUntil>g.time))cast(1,u);break;
   case 'MasterYi': if(retreat)return;if(hero&&d<=reach+60&&cast(3,u))return;if(d<=reach&&!(u.yiEUntil>g.time)&&cast(2,u))return;if(d>reach&&trySlots([0]))return;break;
   case 'DrMundo': if(hp<.5&&cast(3,u))return;if(trySlots([0]))return;if(d<=reach+20){if(!(u.mundoWUntil>g.time)&&cast(1,u))return;if(!(u.mundoEUntil>g.time))cast(2,u);}break;
  }
 });
}
export function thinkContinuousBot(arena,room,bot){
 if(!bot.unit||bot.unit.farmOnly)return;
 const g=room.game,u=bot.unit;
 const s=bot.smartState??={nextAt:g.time+(Math.abs(bot.peer.id)%12)*.017,retreat:false,decisions:0};
 if(g.time<s.nextAt)return;s.nextAt=g.time+.2;s.decisions++;
 if(!u.alive){releaseBotRelic(room,bot);s.retreat=false;u.dest=null;u.target=null;return;}
 rankSkills(u);
 if(u.hp/u.maxHp<.30&&!(s.noRetreatUntil>g.time))s.retreat=true;else if(u.hp/u.maxHp>=.70)s.retreat=false;
 const healing=tryBotHealing(arena,room,bot,dangerAt);
 if(healing==='channel'){releaseBotRelic(room,bot);u.dest=null;u.target=null;u.smartAllowAttack=false;return;}

 if(u.stun>0||u.charm>0||u.fearUntil>g.time||u.dash||u.forcedMove||u.mfChannel||u.jhinChannel||u.yiMeditateUntil>g.time)return;
 if(u.hp/u.maxHp>=.70)s.retreat=false;
 // No fountain recovery: once home, go back to fighting instead of idling at base.
 if(s.retreat&&Math.abs(u.x-(u.team?3080:120))<140){s.retreat=false;s.noRetreatUntil=g.time+30;}
 if(s.retreat){
  // Recover instead of repeatedly re-entering battle at the low-health threshold.
  u.target=null;u.attackWindup=null;u.smartAllowAttack=false;
  let relic=null;
  const homeward=r=>(r.x-u.x)*sign(u)<=30;
  if((g.relics||[]).some(r=>r.ready<=g.time&&homeward(r)&&dist(u,r)<=700/(g.mapConfig?.scale||2)))relic=withNativeDecision(g,()=>chooseBotRelic(room,bot,dangerAt,homeward));
  if(relic&&homeward(relic)){u.dest={x:relic.x,y:relic.y};return;}
  releaseBotRelic(room,bot);
  const base={x:u.team?3080:120,y:Math.max(-90,Math.min(90,preferredLane(u)*.4))};
  u.dest=g.navigation?g.navigation.snap(base.x,base.y):base;
  return;
 }
 return withNativeDecision(g,()=>{
 const nearby=nearbyCandidates(g,u,600);
 const heroes=nearby.filter(v=>v.alive&&v.team!==u.team&&!v.teemoStealth&&g.canHit(v)&&!v.fountain&&v.kind==='hero'&&dist(u,v)<600).sort((a,b)=>dist(u,a)-dist(u,b));
 const friends=nearby.filter(v=>v.alive&&v.team===u.team&&v.kind==='hero'&&dist(u,v)<600);
 const relic=chooseBotRelic(room,bot,dangerAt);
 if(relic){u.dest={x:relic.x,y:relic.y};u.target=null;u.smartAllowAttack=false;return;}
 // Healthy bots continue normal combat and spread-out positioning.
 const zoned=(g.zones||[]).find(z=>z.source?.team!==u.team&&z.age<z.duration&&['lux','mfRain','veigarCage'].includes(z.kind)&&dist(u,z)<(z.r||100)+u.radius);
 u.target=null;u.smartAllowAttack=false;
 if(zoned||dangerAt(g,u,u)){
  const threat=zoned||heroes[0];
  if(threat){const dx=u.x-threat.x,dy=u.y-threat.y,l=Math.hypot(dx,dy)||1;const evade=safePoint(g,u,{x:u.x+dx/l*110-sign(u)*35,y:u.y+dy/l*110});
   if(evade){u.dest=evade;abilities(arena,room,bot,heroes[0],heroes,false);return;}
  }
 }
 // At the shop, buy before advancing; don't wait indefinitely for unaffordable items.
 const inBase=u.team?u.x>=2990:u.x<=210;
 if(inBase&&(bot.items.length<2)&&g.time<(s.spawnWaitUntil??(s.spawnWaitUntil=g.time+2))){arena.shopBot(room,bot);u.dest=null;return;}
 if(!inBase)s.spawnWaitUntil=undefined;
 const enemy=g.units.filter(v=>v.alive&&v.team!==u.team&&!v.teemoStealth&&g.canHit(v)&&!v.fountain);
 const safe=enemy.filter(v=>canEngageTarget(g,u,v));
 const humans=heroes.filter(v=>v.netPeerId>0&&canEngageTarget(g,u,v));
 const supported=heroes.filter(v=>canEngageTarget(g,u,v)&&(friends.length>=heroes.length||v.hp/v.maxHp<.3)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||dist(u,a)-dist(u,b));
 // Fight real players first. Farming is only a fallback when no champion is safe to engage.
 const target=humans[0]||supported[0]||heroes.find(v=>canEngageTarget(g,u,v))||safe.filter(v=>v.kind==='minion').sort((a,b)=>dist(u,a)-dist(u,b))[0]||safe.filter(v=>['tower','inhibitor','nexus'].includes(v.kind)).sort((a,b)=>dist(u,a)-dist(u,b))[0];
 if(!target){const wave=g.units.filter(v=>v.alive&&v.team===u.team&&v.kind==='minion').sort((a,b)=>sign(u)*(b.x-a.x));const front=wave[0];walkTo(g,u,front?{x:front.x-sign(u)*70,y:preferredLane(u)}:{x:u.team?1800:1400,y:preferredLane(u)});return;}
 const d=dist(u,target),reach=u.range+u.radius+target.radius;
 u.target=target;u.smartAllowAttack=true;
 const stance=formationPoint(g,u,target,s,dangerAt);
 if(stance&&dist(u,stance)>12&&!u.attackWindup)walkTo(g,u,stance);
 else if(d>reach*.92&&!u.attackWindup){const len=d||1;walkTo(g,u,{x:target.x+(u.x-target.x)/len*reach*.85,y:target.y+(u.y-target.y)/len*reach*.85});}
 else u.dest=null;
 abilities(arena,room,bot,target,heroes,false);
 });
}
