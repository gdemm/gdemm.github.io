import {equipmentReadyAt,refillEquipmentCharges} from './item-cooldown.js';
import {expansionLabel} from './expansion-items.js';
import {modernBonuses,modernLabel} from './modern-items.js';
import {healUnit,shieldUnit} from './combat-support.js';
// Stateful passives for the historical shop catalogue. All timers use game time.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),native=g=>g.mapConfig?.scale||2;
export const STACK_ITEM_IDS=new Set(['2015','2031','3003','3004','3040','3042','3046','3068','3070','3071','3074','3078','3084','3087','3094','3095','3102','3119','3121','3124','3142','3193','3742','3814','4401','4629','4633','6657','6665','6677','8001','6672','6692']);
const ENERGY=['2015','3087','3094','3095'],TEAR=['3070','3003','3004','3119'],MANA=[...TEAR,'3040','3042','3121'];
export const stackInventory=(g,u)=>u.netPeerId?(u.inventoryItems||[]):u===g.player?(g.items||[]):(u.inventoryItems||[]);
export const stackState=u=>u.itemStacksState??={energy:0,momentum:0,ghosts:0,mana:0,manaCharges:4,manaNext:0,counts:{},timers:{},stoneTargets:{},shieldReady:{}};
let refreshStats=()=>{};export const setStackStatRefresher=fn=>{refreshStats=fn;};
const refresh=(g,u)=>refreshStats(g,u,stackInventory(g,u));
function replace(g,u,from,to){if(g.replaceItemForUnit){g.replaceItemForUnit(u,from,to);return;}const ids=stackInventory(g,u),i=ids.indexOf(from);if(i>=0)ids.splice(i,1,to);u.inventoryItems=[...ids];}
const enemies=(g,u,center=u,range=350)=>g.units.filter(v=>v.alive&&v.team!==u.team&&['hero','minion'].includes(v.kind)&&(!u.farmOnly||v.kind==='minion')&&g.canHit(v)&&distance(v,center)<=range/native(g)+v.radius);
const proc=(g,u,v,n,type='magic',periodic=false)=>{if(v.alive&&n>0)g.hurt(v,n,u,0,0,type,false,{itemProc:true,augmentProc:true,periodic,state:'item'});};
const baseAD=u=>(u.hero.damage||0)+Math.max(0,u.level-3)*4;
export function itemStackBonuses(g,u,ids){const s=stackState(u),c=s.counts,b={hp:0,mana:0,ad:0,ap:0,as:0,armor:0,mr:0,resistPercent:0,moveFlat:0,movePercent:0,range:0,critToOnHit:false,omnivamp:modernBonuses(g,u,ids).omnivamp};
 if(ids.includes('6657')){b.hp+=20*(c.roa||0);b.mana+=20*(c.roa||0);b.ap+=4*(c.roa||0);}
 if(ids.some(id=>TEAR.includes(id)))b.mana+=s.mana||0;
 if(ids.includes('3074'))b.ad+=.6*(c.ravenous||0);
 if(ids.includes('3078'))b.ad+=baseAD(u)*.06*(c.trinity||0);
 if(ids.includes('6677'))b.as+=.05*(c.rageknife||0);
 if(ids.includes('3124')){b.as+=.08*(c.rageblade||0);b.critToOnHit=true;}
 if(ids.includes('3046')){b.movePercent+=.07*(c.phantom||0);if(c.phantom>=4)b.as+=.3;}
 if(ids.includes('3193'))b.resistPercent+=.05*Math.min(5,Object.keys(s.stoneTargets||{}).length);
 if(ids.includes('4401')&&(c.force||0)>=8){b.mr+=70;b.movePercent+=.1;}
 if(ids.includes('6665')){b.armor+=2*(c.jaksho||0);b.mr+=2*(c.jaksho||0);if(c.jaksho>=8)b.resistPercent+=.2;}
 if(ids.includes('3742'))b.moveFlat+=40*(s.momentum||0)/100;
 if(ids.includes('3142')){if(g.time>(s.combatUntil||0))b.moveFlat+=40*(s.ghosts||0)/100;}
 if(ids.includes('4629'))b.movePercent+=Math.min(4,c.cosmic||0)*.025+((c.cosmic||0)>=4?.1:0);
 if(ids.includes('3094')&&s.energy>=100)b.range+=Math.min(150,(u.nativeRange||0)*.35);
 if(ids.includes('4633'))b.omnivamp+=.07;
 return b;
}
export function itemStackAwe(ids,totalMana,bonusMana){return{ad:ids.some(i=>['3004','3042'].includes(i))?totalMana*.025:0,ap:ids.some(i=>['3003','3040'].includes(i))?bonusMana*.025:0,hp:ids.some(i=>['3119','3121'].includes(i))?totalMana*.08:0};}
export function itemArmorMultiplier(v,time){return v.itemCleaver?.until>time?1-.05*v.itemCleaver.stacks:1;}
export function itemStackDamageMultiplier(g,u,v,type){if(!u?.hero)return 1;const ids=stackInventory(g,u),s=stackState(u);let m=1;if(ids.includes('4633')&&v.kind==='hero'&&(s.counts.rift||0)<3)m+=.03*(s.counts.rift||0);if(type!=='true'&&v.itemAnathema?.sourceId===u.id)m*=1-Math.min(.3,(v.itemAnathema.stacks||0)*.01);return m;}
export function blockItemSpell(g,u,v,spell){if(spell?.basic||!v?.hero||u?.team===v.team)return false;const ids=stackInventory(g,v),id=ids.find(id=>['3102','3814'].includes(id));if(!id)return false;const s=stackState(v);if(s.shieldReady[id]===false)return false;s.shieldReady[id]=false;s.timers[id]=equipmentReadyAt(g,v,40);return true;}
export function itemStackIncoming(g,u,source,type,immobilize=0,amount=0){if(!u?.hero||source?.team===u.team)return;const ids=stackInventory(g,u),s=stackState(u);s.burnUntil=g.time+3;if(ids.includes('3040')&&(u.hp-amount*100/(100+(type==='magic'?u.mr||0:u.armor||0)))/u.maxHp<.3&&g.time>=(s.timers.seraph||0)){s.timers.seraph=equipmentReadyAt(g,u,90);shieldUnit(g,u,u,250+u.maxMp*.2,3,{kind:'item'});}if(source?.kind==='hero'){s.combatUntil=g.time+5;s.combatStart??=g.time;for(const id of ['3102','3814'])if(ids.includes(id)&&s.shieldReady[id]===false)s.timers[id]=equipmentReadyAt(g,u,40);
 if(ids.includes('3193')){s.stoneTargets[source.id]=g.time+6;refresh(g,u);}
 if(ids.includes('4401')&&type==='magic'&&g.time>=(s.timers.force||0)){s.counts.force=Math.min(8,(s.counts.force||0)+1+(immobilize?2:0));s.timers.force=g.time+.3;s.timers.forceExpire=g.time+7;refresh(g,u);}}
}
export function itemStackAfterDamage(g,u,v,{basic,meta,damageType,rawDamage,dealt}){if(!u?.hero||u.team===v.team||dealt<=0||meta.itemProc||meta.itemPhantom)return;const ids=stackInventory(g,u),s=stackState(u),c=s.counts,ability=!basic&&/^[qwer]/.test(meta.state||'');s.burnUntil=g.time+3;if(v.kind==='hero'){s.combatUntil=g.time+5;s.combatStart??=g.time;if(ids.includes('4629')){s.cosmicStart??=g.time;s.timers.cosmic=g.time+5;}}
 if(damageType==='physical'&&v.kind==='hero'&&ids.includes('3071')){v.itemCleaver={stacks:Math.min(6,(v.itemCleaver?.until>g.time?v.itemCleaver.stacks:0)+1),until:g.time+6};u.itemMoveBonus=.03*v.itemCleaver.stacks;u.itemMoveUntil=g.time+2;}
 if(ids.some(i=>TEAR.includes(i))&&(ability||basic&&ids.some(i=>['3004','3119'].includes(i)))&&s.mana<360&&s.manaCharges>0&&meta.itemAttack!==false){const token=u.itemEffects?.castTokens?.[(meta.state||'')[0]];if(basic||!token||s.manaCast!==token){s.manaCast=token;s.manaCharges--;s.mana=Math.min(360,s.mana+(v.kind==='hero'?6:3));if(!s.manaNext)s.manaNext=equipmentReadyAt(g,u,8);if(s.mana===360)for(const[a,b]of[['3003','3040'],['3004','3042'],['3119','3121']])if(ids.includes(a))replace(g,u,a,b);refresh(g,u);}}
 if(ids.includes('6692')&&v.kind==='hero'&&(ability||basic&&meta.itemAttack!==false)&&g.time>=(s.timers.eclipse||0)){s.eclipse??={};const e=s.eclipse[v.id]??={hits:0,until:0,token:null},token=ability?u.itemEffects?.castTokens?.[(meta.state||'')[0]]:null;if(!token||token!==e.token){e.token=token;if(e.until<g.time)e.hits=0;e.hits++;e.until=g.time+1.5;if(e.hits>=2){e.hits=0;s.timers.eclipse=equipmentReadyAt(g,u,(u.nativeRange||500)>300?12:6);proc(g,u,v,v.maxHp*((u.nativeRange||500)>300?.03:.06),'physical');shieldUnit(g,u,u,(160+.35*Math.max(0,u.damage-u.hero.damage))*((u.nativeRange||500)>300?.5:1),2,{kind:'item'});u.itemMoveBonus=.15;u.itemMoveUntil=g.time+2;}}}
 if(ids.includes('4633')&&v.kind==='hero'&&c.rift>=3)proc(g,u,v,(rawDamage||dealt)*.09,'true');
 if(meta.immobilize)itemStackImmobilize(g,u,v);
 if(ids.includes('3074')&&(basic||ability)&&g.time>=(s.timers.cleave||0)){s.timers.cleave=g.time+.1;for(const other of enemies(g,u,v,350))if(other!==v)proc(g,u,other,u.damage*.4,'physical');}
 if(basic&&meta.itemAttack!==false){
  if(ids.includes('3070')&&v.kind==='minion')proc(g,u,v,5,'physical');
  for(const[id,key,max,duration]of[['3078','trinity',3,3],['3046','phantom',4,3],['3124','rageblade',4,3],['6677','rageknife',3,3]])if(ids.includes(id)&&(id!=='3078'||v.kind==='hero')){c[key]=Math.min(max,(c[key]||0)+1);s.timers[key]=g.time+duration;}
  if(ids.includes('3078')){u.itemMoveUntil=g.time+2;u.itemMoveBonus=Math.max(u.itemMoveBonus||0,.06);}
  if(ids.includes('6672')){c.kraken=((c.kraken||0)+1)%3;if(c.kraken===0){const same=s.krakenTarget===v.id&&s.krakenUntil>g.time;s.krakenRamp=same?Math.min(2,(s.krakenRamp||0)+1):0;s.krakenTarget=v.id;s.krakenUntil=g.time+6;proc(g,u,v,(50+30*Math.max(0,u.level-1)/17+.65*u.damage+.6*(u.ap||0))*(1+.5*s.krakenRamp),'physical');}}
  let repeats=1;if(ids.includes('3124')&&c.rageblade>=4){s.phantomHits=(s.phantomHits||0)+1;if(s.phantomHits%3===0)repeats=2;}
  for(let n=0;n<repeats;n++){if(ids.includes('3124'))proc(g,u,v,30+(u.itemConvertedCrit||0)*200);else if(ids.includes('6677'))proc(g,u,v,20);if(ids.includes('3042'))proc(g,u,v,u.maxMp*.025,'physical');}
  if(ids.some(id=>ENERGY.includes(id))){if(s.energy>=100){s.energy=0;if(ids.includes('2015'))proc(g,u,v,60);if(ids.includes('3094'))proc(g,u,v,60);if(ids.includes('3095')){proc(g,u,v,90+.25*(u.ap||0));u.itemMoveBonus=.45;u.itemMoveUntil=g.time+1.5;}if(ids.includes('3087')){const targets=[v,...enemies(g,u,v,500).filter(t=>t!==v)].slice(0,6);for(const t of targets)proc(g,u,t,t.kind==='hero'?100:150);}}else s.energy=Math.min(100,s.energy+6);}
  if(ids.includes('3742')&&s.momentum>0){const full=s.momentum>=100;proc(g,u,v,40*s.momentum/100+baseAD(u)*s.momentum/100,'magic');s.momentum=0;if(full&&(u.nativeRange||500)<300){v.slow=Math.max(v.slow||0,1);v.slowPercent=.5;}}
  if(repeats===2)phantomHit?.(g,u,v,{basic:true,meta:{...meta,itemPhantom:true},beforeHp:v.hp,dealt,damageType,rawDamage});
  refresh(g,u);
 }
}
export function itemStackKill(g,u,v){if(!u?.hero)return;const ids=stackInventory(g,u),s=stackState(u);if(ids.includes('3074')){s.counts.ravenous=Math.min(40,(s.counts.ravenous||0)+(v.kind==='hero'?2:1));refresh(g,u);}}
export function itemStackDeath(g,u){if(!u.itemStacksState)return;const s=stackState(u);s.counts.ravenous=Math.floor((s.counts.ravenous||0)*.4);for(const key of ['trinity','phantom','rageblade','rageknife','force','jaksho','cosmic','rift','sunfire'])s.counts[key]=0;s.stoneTargets={};s.combatStart=null;s.combatUntil=0;s.energy=0;s.momentum=0;s.ghosts=0;refresh(g,u);}
export function updateItemStacks(g,dt){for(const u of g.units){if(!u.hero)continue;const ids=stackInventory(g,u);if(!ids.length&&!u.itemStacksState)continue;const s=stackState(u),c=s.counts;let dirty=false;if(u.itemElixir&&u.itemElixir.until<=g.time){u.itemElixir=null;dirty=true;}if(u.itemSizeUntil&&u.itemSizeUntil<=g.time){u.itemSizeUntil=0;dirty=true;}for(const key of ['trinity','phantom','rageblade','rageknife'])if(c[key]&&g.time>(s.timers[key]||0)){c[key]=0;dirty=true;}
 for(const id of Object.keys(s.stoneTargets))if(s.stoneTargets[id]<g.time){delete s.stoneTargets[id];dirty=true;}
 if(c.force&&g.time>(s.timers.forceExpire||0)){c.force=0;dirty=true;}
 if(g.time>(s.combatUntil||0)){if(c.jaksho||c.rift){c.jaksho=c.rift=0;dirty=true;}s.combatStart=null;s.jakshoDrained=false;}else{const age=g.time-(s.combatStart??g.time);const n=Math.min(8,Math.floor(age));if(ids.includes('6665')&&n!==(c.jaksho||0)){c.jaksho=n;dirty=true;}if(ids.includes('4633'))c.rift=Math.min(3,Math.floor(age));if(c.jaksho>=8&&!s.jakshoDrained&&u.alive){s.jakshoDrained=true;let heal=0;for(const v of enemies(g,u,u,700)){const d=80+Math.max(0,u.maxHp-u.hero.hp)*.07;proc(g,u,v,d);heal+=d;}healUnit(g,u,u,heal,{kind:'item'});}}
 if(ids.includes('4629')){const n=g.time<(s.timers.cosmic||0)?Math.min(4,1+Math.floor((g.time-(s.cosmicStart??g.time))/1.5)):0;if(n!==(c.cosmic||0)){c.cosmic=n;dirty=true;}if(!n)s.cosmicStart=null;}
 if(ids.includes('6657')){s.roaStart??=g.time;const n=Math.min(10,Math.floor((g.time-s.roaStart)/60));if(n!==(c.roa||0)){c.roa=n;dirty=true;}if(n===10&&!s.roaLevel){s.roaLevel=true;u.level=Math.min(18,u.level+1);u.skillPoints=(u.skillPoints||0)+1;}}
 if(ids.some(i=>MANA.includes(i)))refillEquipmentCharges(g,u,s,{nextKey:'manaNext',countKey:'manaCharges',capacity:4,seconds:8});
 if(ids.includes('2031')&&u.alive&&(u.team===1?u.x>=(g.mapConfig?2990:2720):u.x<=(g.mapConfig?210:480)))s.potionCharges=2;
 for(const id of ['3102','3814'])if(ids.includes(id)&&s.shieldReady[id]===false&&g.time>=(s.timers[id]||0))s.shieldReady[id]=true;
 if(u.alive){const moved=s.lastX===undefined?0:Math.min(distance(u,{x:s.lastX,y:s.lastY})*native(g),200);if(ids.some(i=>ENERGY.includes(i))&&moved){const before=s.energy;s.energy=Math.min(100,s.energy+moved/24);dirty||=(before<100&&s.energy>=100);}if(ids.includes('3742')){const old=s.momentum;s.momentum=clamp(s.momentum+(moved?dt*25:-dt*30),0,100);dirty||=old!==s.momentum;}if(ids.includes('3142')){const old=s.ghosts;s.ghosts=g.time<(s.combatUntil||0)?0:Math.min(100,s.ghosts+moved/20);dirty||=old!==s.ghosts;}
 if(ids.includes('3068')&&g.time<(s.burnUntil||0)&&g.time>=(s.timers.sunfire||0)){s.timers.sunfire=g.time+1;let hit=false;for(const v of enemies(g,u,u,325)){proc(g,u,v,(15+.0175*Math.max(0,u.maxHp-u.hero.hp))*(1+.1*(c.sunfire||0))*(v.kind==='minion'?1.25:1),'magic',true);hit||=v.kind==='hero';}if(hit){c.sunfire=Math.min(6,(c.sunfire||0)+1);s.timers.sunfireExpire=g.time+5;}}}
 if(c.sunfire&&g.time>(s.timers.sunfireExpire||0))c.sunfire=0;s.lastX=u.x;s.lastY=u.y;
 if(s.anathemaTarget){const n=Math.min(30,Math.floor((g.time-s.anathemaStart)/2));s.anathemaStacks=n;const target=g.units.find(v=>v.id===s.anathemaTarget);u.itemAnathema={sourceId:target?.id,stacks:n};}
 if(dirty)refresh(g,u);
 }}
export function itemStackLabel(g,u,id){const expansion=expansionLabel(g,u,id);if(expansion)return expansion;const modern=modernLabel(g,u,id);if(modern)return modern;const s=u.itemStacksState,c=s?.counts||{};if(id==='3084')return String(Math.floor(u.heartsteelBonusHp||0));if(!s)return'';if(MANA.includes(id))return String(s.mana||0)+'/360';if(ENERGY.includes(id))return String(Math.floor(s.energy||0));if(id==='3742')return String(Math.floor(s.momentum||0));if(id==='3142')return String(Math.floor(s.ghosts||0));if(id==='2031')return String(s.potionCharges??2)+'/2';const keys={'3078':['trinity',3],'3046':['phantom',4],'3124':['rageblade',4],'6677':['rageknife',3],'3074':['ravenous',40],'4401':['force',8],'4629':['cosmic',4],'4633':['rift',3],'6657':['roa',10],'6665':['jaksho',8],'3068':['sunfire',6]};if(keys[id])return(c[keys[id][0]]||0)+'/'+keys[id][1];if(id==='6672')return (c.kraken||0)+'/3';if(id==='6692')return(s.eclipse?.[u.target?.id]?.hits||0)+'/2';if(id==='3071')return (u.target?.itemCleaver?.until>g.time?u.target.itemCleaver.stacks:0)+'/6';if(id==='3193')return Math.min(5,Object.keys(s.stoneTargets||{}).length)+'/5';if(id==='8001')return(s.anathemaStacks||0)+'/30';if(['3102','3814'].includes(id))return s.shieldReady[id]===false?'0/1':'1/1';return'';}
export function syncItemStackInventory(g,u,ids){const s=stackState(u),old=s.owned||[];for(const[id,key]of Object.entries({'3078':'trinity','3046':'phantom','3124':'rageblade','6677':'rageknife','3074':'ravenous','4401':'force','4629':'cosmic','4633':'rift','6657':'roa','6665':'jaksho','3068':'sunfire'}))if(!ids.includes(id))s.counts[key]=0;if(!ids.includes('6657')){delete s.roaStart;s.roaLevel=false;}else if(!old.includes('6657')){s.roaStart=g.time;s.counts.roa=0;s.roaLevel=false;}if(!ids.includes('3193'))s.stoneTargets={};if(!ids.includes('3742'))s.momentum=0;if(!ids.includes('3142'))s.ghosts=0;if(!ids.some(i=>ENERGY.includes(i)))s.energy=0;if(!ids.some(i=>MANA.includes(i))){s.mana=0;s.manaCharges=4;s.manaNext=0;}if(!ids.includes('8001')){s.anathemaTarget=null;u.itemAnathema=null;}s.owned=[...ids];}
let phantomHit=null;export const setPhantomHit=fn=>{phantomHit=fn;};

export function itemStackImmobilize(g,u,v){if(!u?.hero||!v?.alive||v.team===u.team||v.kind!=='hero')return;const ids=stackInventory(g,u),s=stackState(u);if(ids.includes('3121')&&g.time>=(s.timers.fimbul||0)){s.timers.fimbul=equipmentReadyAt(g,u,8);u.mp-=u.mp*.03;shieldUnit(g,u,u,100+u.level*5+u.maxMp*.045,3,{kind:'item'});}}
