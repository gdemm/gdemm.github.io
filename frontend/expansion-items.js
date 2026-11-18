import {equipmentReadyAt} from './item-cooldown.js';
import {COMBAT_DATA} from './combat-data.js';
import {EXPANSION_ITEM_DATA as DATA} from './expansion-item-data.js';
import {healUnit,shieldUnit} from './combat-support.js';
export const EXPANSION_IDS=new Set(Object.keys(DATA));
export const EXPANSION_ACTIVES=new Set(['6698','2522','443064','447122','4016']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),lv=(u,a,b)=>a+(b-a)*clamp((u.level-1)/17,0,1),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),k=g=>1/(g.mapConfig?.scale||2);
const inv=(g,u)=>u.netPeerId?(u.inventoryItems||[]):u===g.player?(g.items||[]):(u.inventoryItems||[]),owns=(g,u,id)=>inv(g,u).includes(id);
export const expansionItemState=u=>u.expansionItems??={timers:{},targets:{},equipped:{},stacks:{}};
const val=(id,key,f=0)=>DATA[id]?.values?.[key]??f,baseAD=u=>u.hero.damage+Math.max(0,u.level-3)*4,baseHP=u=>u.hero.hp+Math.max(0,u.level-3)*70;
let refresh=()=>{},repeatHit=()=>{},awardGold=(g,u,n)=>{if(u===g.player)g.gold+=n;};
export function setExpansionItemHooks(h){refresh=h.refresh||refresh;repeatHit=h.repeatHit||repeatHit;awardGold=h.awardGold||awardGold;}
const allies=(g,u,r)=>g.units.filter(v=>v.hero&&v.alive&&v.team===u.team&&dist(u,v)<=r*k(g));
const foes=(g,u,r,at=u)=>g.units.filter(v=>v.alive&&v.team!==u.team&&['hero','minion'].includes(v.kind)&&(!u.farmOnly||v.kind==='minion')&&g.canHit(v)&&dist(at,v)<=r*k(g)+v.radius);
const heal=(g,u,n,source=u)=>healUnit(g,source,u,n,{kind:'item',expansionProc:true});
const cue=(g,u,id,at=u,r=100)=>g.fx('ring',at.x,at.y,id==='3118'?'#9e65c5':'#e9b967',r*k(g),.5,{itemId:id,sourceUnitId:u.id});
const damage=(g,u,v,n,type='magic')=>{if(n>0&&v.alive&&g.canHit(v))g.hurt(v,n,u,0,0,type,false,{itemProc:true,augmentProc:true,expansionProc:true,state:'item'});};
function lock(g,u,s,key,cd){if((s.timers[key]??-Infinity)>g.time)return false;s.timers[key]=equipmentReadyAt(g,u,cd);return true;}
// Fixed healing ticks are cadence, not ability cooldowns.
function cadence(g,s,key,seconds){if((s.timers[key]??-Infinity)>g.time)return false;s.timers[key]=g.time+seconds;return true;}
function targetState(s,id){return s.targets[id]??={};}
function dot(g,u,v,key,dps,duration,type='magic',add=false){v.expansionDots??=[];let d=v.expansionDots.find(d=>d.sourceId===u.id&&d.key===key);if(d){d.dps=add?d.dps+dps:Math.max(d.dps,dps);d.until=g.time+duration;}else v.expansionDots.push({sourceId:u.id,key,dps,until:g.time+duration,next:g.time+.5,type});}
function rollTalisman(g,u){const s=expansionItemState(u),rolls=s.talismanRolls||0,table=[['ad',35],['ap',20],['hp',2.67],['armor',20],['mr',18],['as',3000],['haste',50],['crit',4000],['mana',1.4],['move',12]];let budget=2933+210*rolls;const count=1+Math.floor(g.random()*6),pool=[...table],stats={};for(let i=0;i<count;i++){const [name,price]=pool.splice(Math.floor(g.random()*pool.length),1)[0];stats[name]=budget/count/price;}s.talismanStats=stats;}
export function expansionItemStats(g,u,ids){
 const foreign=g.units.some(v=>v.alive&&v.team===u.team&&((v.expansionItems?.promise===u.id&&owns(g,v,'4016'))||(v.expansionItems?.timers.pipes>g.time&&owns(g,v,'2524')&&dist(v,u)<=900*k(g))));if(!foreign&&!ids.some(id=>EXPANSION_IDS.has(id)||id==='2530'))return;
 const s=expansionItemState(u),has=id=>ids.includes(id);for(const id of ids)if(EXPANSION_IDS.has(id)&&s.equipped[id]===undefined)s.equipped[id]=g.time;
 s.baseAP=u.ap;s.baseHaste=u.abilityHaste;const originalHP=u.maxHp;
 if(has('447107')){if(u.ap>Math.max(0,u.damage-baseAD(u)))u.ap+=80;else u.damage+=48;u.augmentUltimateHaste=(u.augmentUltimateHaste||0)+40+Math.min(40,s.stacks.decapitator||0);}
 if(has('6697')&&s.timers.hubris>g.time)u.damage+=12+3*(s.stacks.hubris||0);
 if(has('3041')){u.ap+=5*(s.stacks.mejai||0);if(s.stacks.mejai>=10)u.speed*=1.1;}
 if(has('443060')){if(u.ap>Math.max(0,u.damage-baseAD(u)))u.ap+=110;else u.damage+=66;}
 if(has('443058'))u.armor*=1.2;if(has('443059'))u.mr*=1.2;
 if(has('3032')){u.crit=Math.min(1,u.crit+(s.stacks.yuntal||0)/100);if(s.timers.yuntalBuff>g.time)u.itemAttackSpeed+=.3;}
 if(has('3302')&&s.timers.terminus>g.time){u.armor+=(s.stacks.light||0)*lv(u,4,10);u.mr+=(s.stacks.light||0)*lv(u,4,10);u.percentArmorPen=Math.max(u.percentArmorPen||0,(s.stacks.dark||0)*.1);u.percentMagicPen=Math.max(u.percentMagicPen||0,(s.stacks.dark||0)*.1);}
 if(has('3118'))u.augmentUltimateHaste=(u.augmentUltimateHaste||0)+20;
 if(has('2512')){u.augmentUltimateHaste=(u.augmentUltimateHaste||0)+30;if(s.timers.arrows>g.time&&(s.stacks.arrows||0)>0)u.itemAttackSpeed+=.5;}
 if(has('2523')&&s.timers.scope>g.time)u.itemRangeBonus=(u.itemRangeBonus||0)+100;
 if(has('6699')&&s.timers.voltaic>g.time)u.lethality+=u.nativeRange>300?12:15;
 if(has('6621')){const regen=Math.max(0,(u.itemManaRegen||0)/9);u.ap+=regen*10;u.augmentHealShieldPower=(u.augmentHealShieldPower||0)+regen*.02;}
 if(has('2517')){u.abilityHaste+=Math.max(0,u.damage-baseAD(u))*.1;u.augmentOmnivamp+=.05+(s.timers.hunger>g.time?.15:0);}
 if(has('2526')||has('2530')){u.maxMp+=Math.min(360,s.stacks.mana||0);u.augmentHealShieldPower+=(u.maxMp-600)*.00005;}
 if(has('2525')&&s.timers.protoplasm>g.time){u.maxHp+=s.protoplasmHp||0;u.speed*=1.1;u.augmentSize*=1.15;}
 if(has('4011'))u.itemAttackSpeed+=Math.max(0,u.augmentHealShieldPower||0)*1.2;
 if(has('447114'))u.maxHp+=Math.max(0,u.itemAttackSpeed||0)*500;
 if(has('447122'))u.augmentSize*=1+.02*Math.min(50,s.stacks.accretion||0);
 if(has('2503')){const burning=g.units.filter(v=>v.kind==='hero'&&v.alive&&v.team!==u.team&&v.expansionDots?.some(d=>d.sourceId===u.id&&d.key==='torch'&&d.until>g.time)).length;u.ap*=1+.04*burning;}
 if(has('443064')){if(!s.talismanStats)rollTalisman(g,u);const b=s.talismanStats;u.damage+=b.ad||0;u.ap+=b.ap||0;u.maxHp+=b.hp||0;u.armor+=b.armor||0;u.mr+=b.mr||0;u.itemAttackSpeed+=b.as||0;u.crit=Math.min(1,u.crit+(b.crit||0));u.abilityHaste+=b.haste||0;u.maxMp+=b.mana||0;u.speed+=(b.move||0)*k(g);}
 let multiplier=1;if(has('443056'))multiplier*=Math.max(.1,.26+1+(s.stacks.crown||0));if(has('447106'))multiplier*=1+.04*(s.stacks.souls||0);
 u.maxHp*=multiplier;u.damage*=multiplier;u.ap*=multiplier;u.armor*=multiplier;u.mr*=multiplier;u.itemAttackSpeed=(1+u.itemAttackSpeed)*multiplier-1;u.abilityHaste*=multiplier;
 if(has('4016')&&s.promise){const ally=g.units.find(v=>v.id===s.promise&&v.team===u.team);if(ally)u.ap+=(ally.expansionItems?.baseAP??ally.ap??0)*.1;}
 for(const holder of g.units){const t=holder.expansionItems;if(!holder.alive||!t)continue;if(t.promise===u.id&&owns(g,holder,'4016'))u.abilityHaste+=(t.baseHaste??holder.abilityHaste??0)*.1;if(owns(g,holder,'2524')&&t.timers.pipes>g.time&&holder.team===u.team&&dist(holder,u)<=900*k(g))u.itemAttackSpeed+=holder.nativeRange>300?.2001:.3;}
 if(has('2524')&&s.timers.pipes>g.time)u.speed+=20*k(g);
 if(has('447106')){if((s.stacks.souls||0)>=4)u.speed*=1.1;}
 u.haste=100/(100+u.abilityHaste);u.hp=Math.max(u.alive?1:0,Math.min(u.maxHp,u.hp+(u.maxHp-originalHP)));u.period=1/Math.max(.2,(u.baseAttackSpeed||.7)*(1+u.itemAttackSpeed));u.power=1+u.ap/150;
}
export function expansionItemTenacity(g,u){const s=u?.expansionItems;return (owns(g,u,'2517')?.8:1)*(owns(g,u,'2525')&&s?.timers.protoplasm>g.time?.75:1);}
export function expansionItemDamage(g,u,v,n,basic,meta,type){
 if(!u?.hero)return n;const ids=inv(g,u);if(!ids.some(id=>EXPANSION_IDS.has(id)))return n;const s=expansionItemState(u),has=id=>ids.includes(id),t=targetState(s,v.id);
 if(has('447106')&&(s.stacks.souls||0)>=6&&u.hp<u.maxHp*.5)n*=1.06;if(has('447107')&&!basic&&!meta.itemProc&&meta.state?.[0]==='r')n*=1+.03*Math.min(40,s.stacks.decapitator||0);if(has('4015')&&v.hero)n*=1+.15*clamp((v.maxHp-u.maxHp)/3000,0,1);
 if(has('2522')&&s.timers.actualizer>g.time&&!basic&&!meta.itemProc)n*=1+.15+Math.max(0,u.maxMp-600)*.00005;
 if(basic&&meta.itemAttack!==false&&!meta.itemProc){
  if(has('2523'))n*=1+.1*clamp(dist(u,v)/k(g)/500,0,1);
  if(has('443060')&&meta.critical)n*=1+g.random()*Math.min(.5,u.crit||0);
  if(has('6610')&&v.hero&&lock(g,u,s,'sun:'+v.id,10)){n*=meta.critical?1:1.6;meta.critical=true;heal(g,u,(baseAD(u)*.9+(u.maxHp-u.hp)*.04)*(u.nativeRange>300?.5:1));cue(g,u,'6610',v);}
  if(has('2512')&&s.timers.arrows>g.time&&s.stacks.arrows>0){s.stacks.arrows--;if(meta.critical)damage(g,u,v,n*.15,'true');else{n*=Math.max(1,(u.critDamageMultiplier||1.75)*.8);meta.critical=true;}}
 }
 return n;
}
export function expansionIncoming(g,u,source,n,type,basic,meta){
 if(!(n>0))return n;if(u?.kind==='minion'&&!u.caster&&type!=='true'){const holder=g.units.find(v=>v.hero&&v.alive&&v.team===u.team&&owns(g,v,'3181')&&dist(u,v)<=1050*k(g));if(holder)n*=100/(100+lv(holder,30,90));}if(!u?.hero||!['443058','443059','2525'].some(id=>owns(g,u,id)))return n;const s=expansionItemState(u);
 if(owns(g,u,'443058')&&basic&&type!=='true'&&g.random()<Math.min(.5,.05+u.armor*.0002))return 0;
 if(owns(g,u,'443059')&&!basic&&type!=='true')n*=1-Math.min(.5,.05+u.mr*.0002);
 if(owns(g,u,'2525')&&u.hp-n<u.maxHp*.3&&lock(g,u,s,'lifeline',90)){s.protoplasmHp=lv(u,100,400)+1.75*(Math.max(0,u.armor-30)+Math.max(0,u.mr-30));s.timers.protoplasm=g.time+5;s.protoplasmHeal=lv(u,100,300)/5;u.maxHp+=s.protoplasmHp;u.hp+=s.protoplasmHp;s.protoplasmApplied=true;cue(g,u,'2525');}
 return n;
}
export function expansionCast(g,u,index){if(!u?.hero||index<0||index>3||!['2510','2512','2522','447107'].some(id=>owns(g,u,id)))return;const s=expansionItemState(u);if(index<3&&owns(g,u,'447107'))s.stacks.decapitator=Math.min(40,(s.stacks.decapitator||0)+(u.nativeRange>300?3:4));if(owns(g,u,'2510')&&g.time>=(s.timers.spellblade||0))s.timers.bladeReady=g.time+10;if(index===3&&owns(g,u,'2512')&&lock(g,u,s,'arrowsCooldown',45)){s.stacks.arrows=3;s.timers.arrows=g.time+8;}if(owns(g,u,'2522')&&s.timers.actualizer>g.time){const entry=COMBAT_DATA[u.hero.id],cost=entry?.spells?.[entry.abilityNames[index]]?.data?.mana?.[(u.spellRanks?.[index]||1)-1]||0;u.mp=Math.max(0,u.mp-cost);} }
export function expansionHealShield(g,u,target,options){if(!u?.hero||options.regen||options.expansionProc||options.kind==='item'||!owns(g,u,'447123')&&!owns(g,u,'2530'))return;const s=expansionItemState(u);if(target&&owns(g,u,'2530')){s.supported??={};s.supported[target.id]=g.time;}if(s&&owns(g,u,'447123'))s.timers.puppet=Math.max(g.time,(s.timers.puppet||0)-5);}
export function expansionHealingAmp(g,u,options){const soul=!options.regen&&u?.expansionItems?.stacks.souls>=6&&owns(g,u,'447106')&&u.hp<u.maxHp*.5?1.06:1;return soul*(!options.regen&&u?.expansionItems?.timers.actualizer>g.time&&owns(g,u,'2522')?1+.15+Math.max(0,u.maxMp-600)*.00005:1);}
export function expansionAfterDamage(g,u,v,{basic,meta,dealt,damageType}){
 if(!u?.hero||u.team===v.team||meta.itemProc||meta.expansionProc)return;const ids=inv(g,u);if(!ids.some(id=>EXPANSION_IDS.has(id)))return;const s=expansionItemState(u),has=id=>ids.includes(id),spell=!basic&&/^[qwer]/.test(meta.state||''),control=!!(meta.immobilize||v.stun>0||v.root>0||v.slow>0),onhit=basic&&meta.itemAttack!==false,t=targetState(s,v.id);t.lastHit=g.time;if(v.hero)s.lastCombat=g.time;
 if(control&&v.hero){if(has('2524')){s.timers.pipes=g.time+8;for(const ally of allies(g,u,900))refresh(g,ally,inv(g,ally));}if(has('447122')&&lock(g,u,s,'accretionCC:'+v.id,6))s.stacks.accretion=Math.min(50,(s.stacks.accretion||0)+5);if(has('447114')&&lock(g,u,s,'reverbCC:'+v.id,8))for(let i=0;i<3;i++)repeatHit(g,u,v);}
 if(!(dealt>0))return;
 if(has('2503')&&spell)dot(g,u,v,'torch',20+(u.ap||0)*.02,3);
 if(has('3118')&&meta.state?.[0]==='r'&&v.hero&&lock(g,u,s,'malignance:'+v.id,3)){g.expansionZones??=[];g.expansionZones.push({kind:'malignance',sourceId:u.id,x:v.x,y:v.y,until:g.time+3,next:g.time,r:250,dps:60+(u.ap||0)*.05});cue(g,u,'3118',v,250);}
 if(has('4646')&&v.hero){if((t.stormStart??-99)+2.5<g.time){t.stormStart=g.time;t.stormDamage=0;}t.stormDamage=(t.stormDamage||0)+dealt;if(t.stormDamage>=v.maxHp*.25&&lock(g,u,s,'storm',30)){g.expansionBombs??=[];g.expansionBombs.push({kind:'storm',sourceId:u.id,targetId:v.id,x:v.x,y:v.y,at:g.time+2,n:125+.1*(u.ap||0)});t.stormDamage=0;}}
 if(has('447113')&&spell){v.expansionOrbs??={};let b=v.expansionOrbs[u.id]??={n:0,until:0};b.n+=dealt*(control?.25:.2);b.until=g.time+3;if(b.n>=v.hp&&v.alive){const amount=b.n;delete v.expansionOrbs[u.id];damage(g,u,v,amount);cue(g,u,'447113',v);}}
 if(has('4017')&&spell&&lock(g,u,s,'hatchet:'+v.id,8))dot(g,u,v,'hatchet',v.hp*.07*(1+2*clamp((v.maxHp-u.maxHp)/3000,0,1))/4,4,'physical');
 if(has('2526')&&spell&&lock(g,u,s,'tear:'+String(meta.castToken??meta.state),6.5)){s.manaCharges??=5;if(s.manaCharges>0){s.manaCharges--;s.stacks.mana=Math.min(360,(s.stacks.mana||0)+(v.hero?8:4));s.manaRefill??=equipmentReadyAt(g,u,8);if(s.stacks.mana>=360){if(g.replaceItemForUnit)g.replaceItemForUnit(u,'2526','2530');else{const items=inv(g,u),i=items.indexOf('2526');if(i>=0)items[i]='2530';}}}}
 if(has('447101')&&(onhit||spell&&lock(g,u,s,'bank:'+String(meta.castToken??meta.state),2.5))&&g.random()<.12)s.bank=(s.bank||0)+30+Math.floor(g.random()*216);
 if((has('6699')||has('447108'))&&(onhit||spell)){s.energy=Math.min(100,(s.energy||0)+(spell?30:20));if(s.energy>=100){s.energy=0;if(has('6699')){damage(g,u,v,Math.min(v.hero?Infinity:200,v.hp*(u.nativeRange>300?.07:.09)),'physical');s.timers.voltaic=g.time+4;}if(has('447108')){s.stacks.runes=Math.min(100,(s.stacks.runes||0)+1);damage(g,u,v,s.stacks.runes*(lv(u,20,45)+.11*Math.max(0,u.damage-baseAD(u))+.08*(u.ap||0)+.003*Math.max(0,u.maxHp-baseHP(u))));cue(g,u,'447108',v);}}}
 if(!onhit)return;
 if(has('447107')&&!meta.expansionRepeat)s.stacks.decapitator=Math.min(40,(s.stacks.decapitator||0)+(u.nativeRange>300?1:2));
 if(has('6698'))for(const other of foes(g,u,350,v))if(other!==v)damage(g,u,other,u.damage*(u.nativeRange>300?.2:.4),'physical');
 if(has('3181')){if(s.timers.hull<g.time)s.stacks.hull=0;s.timers.hull=g.time+10;s.stacks.hull=((s.stacks.hull||0)+1)%5;if(s.stacks.hull===0&&(v.hero||['tower','nexus','inhibitor'].includes(v.kind))){const structure=!v.hero;damage(g,u,v,baseAD(u)*(structure?(u.nativeRange>300?2:3):(u.nativeRange>300?.7:1.2))+u.maxHp*(structure?.1:.05),'physical');}}
 if(has('3302')){damage(g,u,v,30);if(v.hero){if(s.timers.terminus<g.time){s.stacks.light=0;s.stacks.dark=0;}s.darkNext=!s.darkNext;const name=s.darkNext?'dark':'light';s.stacks[name]=Math.min(3,(s.stacks[name]||0)+1);s.timers.terminus=g.time+5;}}
 if(has('3032')){s.stacks.yuntal=Math.min(25,(s.stacks.yuntal||0)+(u.nativeRange>300?.2:.4));s.timers.yuntal=Math.max(g.time,(s.timers.yuntal||0)-(meta.critical?2:1));if(v.hero&&lock(g,u,s,'yuntal',30))s.timers.yuntalBuff=g.time+6;}
 if(has('2510')&&s.timers.bladeReady>g.time&&lock(g,u,s,'spellblade',1.5)){s.timers.bladeReady=0;damage(g,u,v,.75*baseAD(u)+.1*(u.ap||0));heal(g,u,.1*(u.ap||0)+.03*Math.max(0,u.maxHp-baseHP(u)));repeatHit(g,u,v);}
 if(has('443054'))damage(g,u,v,lv(u,u.nativeRange>300?10:20,u.nativeRange>300?20:40)+u.armor*(u.nativeRange>300?.2:.25),'true');
 if(has('443069')&&meta.critical){dot(g,u,v,'hamstring:'+g.counter++,dealt*.25/2,2,'physical');t.hamstring=(t.hamstringUntil>g.time?t.hamstring||0:0)+1;t.hamstringUntil=g.time+2;v.slow=Math.max(v.slow||0,2);v.slowPercent=Math.min(.35,t.hamstring*.07);}
 if(has('447114'))damage(g,u,v,10+.02*Math.max(0,u.maxHp-baseHP(u)));
 if(has('447122'))s.stacks.accretion=Math.min(50,(s.stacks.accretion||0)+1);
 if(has('4011')){const ally=allies(g,u,1000).filter(v=>v.hp<v.maxHp&&!v.modernItems?.guardianUntil).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(ally)heal(g,ally,lv(u,15,45)+.1*Math.max(0,u.damage-baseAD(u))+.1*(u.ap||0),u);}
 if(has('447123')&&v.hero){t.puppet=(t.puppetUntil>g.time?t.puppet||0:0)+1;t.puppetUntil=g.time+15;if(t.puppet>=4&&lock(g,u,s,'puppet',25)){t.puppet=0;const victim=g.units.filter(x=>x.hero&&x.alive&&x.team===v.team&&x!==v).sort((a,b)=>dist(v,a)-dist(v,b))[0];if(victim){v.expansionBerserk={targetId:victim.id,ownerId:u.id,until:g.time+2,next:g.time};v.dest=null;v.target=null;v.attackWindup=null;}else{v.fearUntil=g.time+2;v.fearSourceId=u.id;}cue(g,u,'447123',v);}}
 if(has('447106')&&(s.stacks.souls||0)>=1)dot(g,u,v,'infernalSoul',20,2);if(has('447106')&&(s.stacks.souls||0)>=5){v.slow=Math.max(v.slow||0,1);v.slowPercent=.2;}if(has('447106')&&(s.stacks.souls||0)>=7&&v.hero&&v.hp<v.maxHp*.2)damage(g,u,v,v.maxHp*10,'true');
}
export function expansionTakedown(g,u,v,isKill=false){if(!u?.hero||!['443056','2517','2523','3041','6697'].some(id=>owns(g,u,id)))return;const s=expansionItemState(u);if(owns(g,u,'3041'))s.stacks.mejai=Math.min(25,(s.stacks.mejai||0)+(isKill?4:2));if(owns(g,u,'6697')){if(isKill)s.stacks.hubris=(s.stacks.hubris||0)+1;if(isKill||(s.targets[v.id]?.lastHit??-99)+3>=g.time)s.timers.hubris=g.time+90;}if(owns(g,u,'443056'))s.stacks.crown=(s.stacks.crown||0)+.012;if(owns(g,u,'2517'))s.timers.hunger=g.time+8;if(owns(g,u,'2523')&&(s.targets[v.id]?.lastHit??-99)+3>=g.time)s.timers.scope=g.time+8;}
export function expansionDeath(g,u){const s=u?.expansionItems;if(!s)return;s.stacks.mejai=Math.max(0,(s.stacks.mejai||0)-10);s.stacks.decapitator=0;s.timers.hubris=0;if(owns(g,u,'443056'))s.stacks.crown=(s.stacks.crown||0)-.03;if(owns(g,u,'447101'))s.bank=Math.floor((s.bank||0)*.75);s.stacks.runes=0;s.stacks.accretion=0;s.stacks.arrows=0;s.stacks.light=0;s.stacks.dark=0;s.promise=s.promise||null;for(const key of ['actualizer','protoplasm','pipes','hunger','arrows','scope','yuntalBuff'])s.timers[key]=0;u.expansionBerserk=null;u.expansionOrbs={};u.expansionDots=[];}
export function expansionActive(g,u,id,aim={}){
 if(!EXPANSION_ACTIVES.has(id))return null;const s=expansionItemState(u);if(!owns(g,u,id)||!u.alive||u.stun>0||u.silence>0||u.itemStasisUntil>g.time||g.winner!==null)return false;
 if(id==='4016'){const ally=g.units.find(v=>v.id===Number(aim.targetId))||u.target;if(!ally?.hero||ally===u||ally.team!==u.team||!ally.alive||dist(u,ally)>1250*k(g))return false;if(!lock(g,u,s,id,15))return false;s.promise=ally.id;refresh(g,u,inv(g,u));refresh(g,ally,inv(g,ally));return true;}
 const cd=id==='443064'?60:val(id,'Cooldown',30);if(!lock(g,u,s,id,cd))return false;
 if(id==='6698'){for(const v of foes(g,u,450))damage(g,u,v,u.damage*.8,'physical');cue(g,u,id,u,450);}
 if(id==='2522')s.timers.actualizer=g.time+8;
 if(id==='443064'){s.talismanRolls=(s.talismanRolls||0)+1;rollTalisman(g,u);refresh(g,u,inv(g,u));}
 if(id==='447122'){g.expansionZones??=[];g.expansionZones.push({kind:'blackhole',sourceId:u.id,x:u.x,y:u.y,r:225*(u.augmentSize||1),until:g.time+Math.min(10,2+Math.max(0,u.maxHp-baseHP(u))*.001),next:g.time,dps:lv(u,30,100)+.05*u.maxHp});cue(g,u,id,u,225*(u.augmentSize||1));}
 return true;
}
export function expansionLabel(g,u,id){const s=u?.expansionItems;if(!s)return'';const keys={'447107':'decapitator','3041':'mejai','6697':'hubris','3032':'yuntal','3302':'dark','447108':'runes','447106':'souls','447122':'accretion','2526':'mana','2530':'mana'};if(keys[id])return String(Math.round(s.stacks[keys[id]]||0));if(id==='447101')return `${s.bank||0} 存款`;if(id==='443064')return `重铸 ${s.talismanRolls||0}`;if(id==='443056')return `${Math.round((.26+(s.stacks.crown||0))*100)}%`;return'';}
export function expansionControl(g,u,dt){const b=u.expansionBerserk;if(!b||b.until<=g.time){u.expansionBerserk=null;return false;}const victim=g.units.find(v=>v.id===b.targetId&&v.alive);if(!victim)return false;if(u.stun>0)return true;if(dist(u,victim)>u.range+victim.radius){const speed=u.speed;u.speed*=1.4;g.walk(u,victim,dt,true);u.speed=speed;}else if(g.time>=b.next){b.next=g.time+Math.max(.1,u.period/1.5);u.animation='attack';u.animationSerial++;u.animUntil=g.time+u.period;u.facing=Math.atan2(victim.x-u.x,victim.y-u.y);damage(g,g.units.find(x=>x.id===b.ownerId)||u,victim,u.damage,'physical');}return true;}
export function updateExpansionItems(g,dt){
 for(const u of g.units){
  if(u.expansionDots){for(const d of u.expansionDots){const source=g.units.find(x=>x.id===d.sourceId);if(source&&d.next<=g.time&&d.until>=g.time){damage(g,source,u,d.dps*.5,d.type);d.next=g.time+.5;}}u.expansionDots=u.expansionDots.filter(d=>u.alive&&d.until>g.time);}
  if(u.expansionOrbs)for(const [id,b]of Object.entries(u.expansionOrbs))if(b.until<=g.time||!u.alive){delete u.expansionOrbs[id];const source=g.units.find(x=>String(x.id)===id);if(source){damage(g,source,u,b.n);cue(g,source,'447113',u);}}
  if(!u.hero)continue;const ids=inv(g,u),s=u.expansionItems;if(!s&&!ids.some(id=>EXPANSION_IDS.has(id)))continue;const st=expansionItemState(u);
  for(const [id,t]of Object.entries(st.targets))if((t.lastHit??-99)+30<g.time&&(t.puppetUntil??0)<g.time)delete st.targets[id];
  if(!u.alive)continue;
  if(st.timers.actualizer>g.time)for(let i=0;i<3;i++)u.skills[i]=Math.max(0,u.skills[i]-dt*.3);
  if(st.timers.protoplasm>g.time)heal(g,u,(st.protoplasmHeal||0)*dt);
  if(ids.includes('2530')&&cadence(g,st,'diademHeal',1)){const combat=g.time-Math.max(st.lastCombat??-99,u.augmentLastDamaged??-99)<5||Object.entries(st.supported||{}).some(([id,t])=>t+3>=g.time&&g.units.some(v=>String(v.id)===id&&g.time-(v.augmentLastDamaged??-99)<5));if(combat){const target=allies(g,u,900).filter(v=>v.hp<v.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(target)heal(g,target,u.maxMp*.008,u);}}
  if(st.manaRefill&&g.time>=st.manaRefill){st.manaCharges=Math.min(5,(st.manaCharges||0)+1);st.manaRefill=equipmentReadyAt(g,u,8);}
  if(ids.includes('447106')){const souls=Math.min(7,Math.floor((g.time-(st.equipped['447106']??g.time))/120)+1);if(souls>(st.stacks.souls||0))st.stacks.souls=souls;if(souls>=2&&g.time-(u.augmentLastDamaged??-99)>8)heal(g,u,u.maxHp*.005*dt);if(souls>=3&&g.time-(u.augmentLastDamaged??-99)>8&&lock(g,u,st,'mountainSoul',15))shieldUnit(g,u,u,u.maxHp*.1,10,{kind:'item'});}
  if(ids.includes('447101')){st.bankNext??=g.time+60;if(st.bankNext<=g.time){awardGold(g,u,st.bank||0);st.bank=0;st.bankNext=g.time+60;}}
  if(ids.includes('447108')||ids.includes('6699')){if(st.lastX!==undefined)st.energy=Math.min(100,(st.energy||0)+Math.min(100,Math.hypot(u.x-st.lastX,u.y-st.lastY)/k(g))*.1);st.lastX=u.x;st.lastY=u.y;}
  if(g.time>=(st.nextRefresh||0)){st.nextRefresh=g.time+.25;refresh(g,u,ids);}
 }
 for(const b of g.expansionBombs||[]){if(b.at>g.time)continue;const source=g.units.find(u=>u.id===b.sourceId),v=g.units.find(u=>u.id===b.targetId);if(source){if(v?.alive)damage(g,source,v,b.n);else for(const other of foes(g,source,400,v||b))damage(g,source,other,b.n);cue(g,source,'4646',v||b,400);}}
 g.expansionBombs=(g.expansionBombs||[]).filter(b=>b.at>g.time);
 for(const z of g.expansionZones||[]){if(z.until<=g.time||z.next>g.time)continue;z.next=g.time+.5;const source=g.units.find(u=>u.id===z.sourceId);if(!source?.alive)continue;for(const v of foes(g,source,z.r,z)){if(z.kind==='blackhole'){v.slow=Math.max(v.slow||0,1);v.slowPercent=.3;const d=dist(v,z);if(d<z.r*k(g)/3&&!(v.unstoppableUntil>g.time)){const t=Math.min(1,75*k(g)/Math.max(1,d)),p={x:v.x+(z.x-v.x)*t,y:v.y+(z.y-v.y)*t},to=g.navigation?g.navigation.snap(p.x,p.y):p;v.x=to.x;v.y=to.y;}expansionItemState(source).stacks.accretion=Math.min(50,(expansionItemState(source).stacks.accretion||0)+1);}else{v.expansionMRUntil=g.time+1;v.expansionMRReduction=10;}damage(g,source,v,z.dps*.5);}cue(g,source,z.kind==='blackhole'?'447122':'3118',z,z.r);}
 g.expansionZones=(g.expansionZones||[]).filter(z=>z.until>g.time);
}
