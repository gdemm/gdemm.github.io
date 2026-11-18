import {grantedModeHaste} from './bot-haste.js';
import {classicCritStats,classicArmorBonus} from './classic-champions.js';
import {jaxPostStats} from './jax.js';
import {applyAPAugmentStats} from './augment-ap-stats.js';
import {fiveStats} from './five-champions.js';
import {tankEngineMultiplier} from './tank-engine.js';
import {jhinStats} from './jhin.js';
import {expansionItemStats,setExpansionItemHooks} from './expansion-items.js';
import {modernPostStats,setModernStatRefresher} from './modern-items.js';
import {malphiteArmorMultiplier} from './malphite-herald.js';
import {boundStatBonuses} from './augment-bound-effects.js';
import {supportStatBonuses} from './combat-support.js';
import {corePostStats,coreSizeStats} from './augment-core.js';
import {activeItemBonuses} from './item-actives.js';
import {itemStackBonuses,itemStackAwe,syncItemStackInventory,setStackStatRefresher} from './item-stacks.js';
import {augmentValue} from './augment-rules.js';
import {itemStatBonuses} from './item-effects.js';
import {SHOP_ITEMS,RECIPE_COMPONENTS} from './shop-catalog.js?v=shop-icons-heartsteel-1';
import {URF_ABILITY_HASTE} from './urf-rules.js?v=shop-missiles-1';
import {augmentStatBonuses,hasAugment} from './augment-rules.js?v=hextech-aram-3';
export {SHOP_ITEMS};
export const ITEM_BY_ID=new Map(SHOP_ITEMS.map(item=>[item.id,item]));
const aliases={sword:'1038',crystal:'3116',armor:'2051',boots:'3158'};
export const itemById=id=>ITEM_BY_ID.get(aliases[id]||String(id));
export const inShopRange=game=>!game.player.alive||(game.player.team===1?game.player.x>=(game.mapConfig?2990:2720):game.player.x<=(game.mapConfig?210:480));
export function quotePurchase(game,id){const item=itemById(id);if(!item)return {ok:false,reason:'物品不存在'};let used=new Set();
 function consume(part){let index=game.items.findIndex((x,i)=>(x===part||part==='2420'&&x==='2421')&&!used.has(i));if(index>=0){used.add(index);return itemById(part)?.price||RECIPE_COMPONENTS[part]?.price||0;}const info=itemById(part)||RECIPE_COMPONENTS[part];return (info?.from||[]).reduce((sum,child)=>sum+consume(child),0);}
 const discount=item.from.reduce((sum,part)=>sum+consume(part),0),cost=Math.max(0,item.price-discount),remaining=game.items.filter((_,i)=>!used.has(i));let reason='';
 if(item.transformedOnly)reason='该装备只能由已有装备转化获得';else if(game.winner!==null)reason='对局已经结束';else if(!inShopRange(game))reason='仅出生点或阵亡时可购买';
 else if(item.tier==='consumable'&&item.id!=='2003')reason='该消耗品的特殊效果尚未实现';
 const stack=item.id==='2003'&&remaining.includes(item.id);
 if(!reason&&stack&&(game.itemStacks[item.id]||1)>=5)reason='最多携带五瓶生命药水';
 if(!reason&&remaining.length+(stack?0:1)>6)reason='装备栏已满';
 if(!reason&&game.gold<cost)reason=`还需要 ${Math.ceil(cost-game.gold)} 金币`;
 return {ok:!reason,reason,item,cost,discount,consumed:[...used],remaining,stack};
}
export function inventoryStats(ids){let total={};for(const id of ids){const item=itemById(id);if(!item||item.tier==='consumable')continue;for(const [key,value] of Object.entries(item.stats))total[key]=(total[key]||0)+value;}return total;}
export function applyInventoryStats(game){const p=game.player,b=inventoryStats(game.items),a=augmentStatBonuses(p),before=p.maxHp;const support=supportStatBonuses(p),bound=boundStatBonuses(p);a.ad+=support.ad;a.ap+=support.ap;a.crit+=support.crit;const oldMp=p.maxMp;const level=p.level-3,m=itemStatBonuses(game.items);syncItemStackInventory(game,p,game.items);const t=itemStackBonuses(game,p,game.items),active=activeItemBonuses(game,p);t.hp+=active.hp;t.ad+=active.ad;t.ap+=active.ap;p.inventoryItems=[...game.items];p.itemHealthMultiplier=m.hpMultiplier;p.augmentHealthMultiplier=a.hpMultiplier;p.critDamageMultiplier=1.75+m.critDamage;p.percentArmorPen=m.armorPenPercent;p.percentMagicPen=m.magicPenPercent;
 p.maxMp=p.noMana?0:p.classicEnergy?(200+(p.classicEnergyBonus||0)):(600+(b.FlatMPPoolMod||0)+t.mana)*(p.hero.id==='Ryze'?1.1:1);const awe=itemStackAwe(game.items,p.maxMp,Math.max(0,p.maxMp-600));if(hasAugment(p,'ARAM_MindtoMatter'))a.hp+=Math.max(0,p.maxMp-oldMp)*.5;p.maxHp=(p.hero.hp+level*70+(b.FlatHPPoolMod||0)+(p.heartsteelBonusHp||0)+a.hp+t.hp+awe.hp)*a.hpMultiplier*m.hpMultiplier+(p.classicRealmStats?.hp||0);p.hp=p.alive?Math.max(1,Math.min(p.maxHp,p.hp+p.maxHp-before)):0;p.mp=Math.max(0,Math.min(p.maxMp,p.mp+p.maxMp-oldMp));
 p.tryndStatAdjustment=0;p.damage=(p.hero.damage+(p.classicBonusAD||0)+level*4+(b.FlatPhysicalDamageMod||0)+a.ad+m.ad+t.ad+awe.ad)*a.adMultiplier*(p.classicADMultiplier||1)+(p.classicRealmStats?.ad||0);p.ap=((b.FlatMagicDamageMod||0)+a.ap+t.ap+awe.ap)*a.apMultiplier*m.apMultiplier+(p.classicRealmStats?.ap||0);p.power=1+p.ap/150;p.armor=30+((b.FlatArmorMod||0)+t.armor)*(1+t.resistPercent);p.mr=30+((b.FlatSpellBlockMod||0)+t.mr)*(1+t.resistPercent);p.armor+=(a.resists||0)+support.armor+bound.armor;p.mr+=(a.resists||0)+support.mr+bound.mr;corePostStats(game,p);p.armor*=malphiteArmorMultiplier(p);p.armor=Math.max(0,p.armor+(p.classicRealmStats?.armor||0)+classicArmorBonus(p));p.mr=Math.max(0,p.mr+(p.classicRealmStats?.mr||0));
 p.modeHasteGrant=grantedModeHaste(p);p.abilityHaste=p.modeHasteGrant+(p.surgeHaste||0)+(b.AbilityHaste||0)+a.abilityHaste+m.haste;p.augmentEurekaHaste=hasAugment(p,'ARAM_Eureka')?p.ap*augmentValue('ARAM_Eureka','APToHasteConversion'):0;p.abilityHaste+=p.augmentEurekaHaste;p.haste=100/(100+p.abilityHaste);p.crit=Math.min(1,(b.FlatCritChanceMod||0)+a.crit);classicCritStats(game,p,(b.FlatCritChanceMod||0)+a.crit);p.itemConvertedCrit=t.critToOnHit?Math.min(1,p.crit*(p.hero.id==='Yasuo'?2.5:1)):0;if(t.critToOnHit)p.crit=0;p.lifesteal=b.PercentLifeStealMod||0;p.magicPen=(b.MagicPenetration||0)+m.magicPen;p.lethality=b.Lethality||0;p.augmentUltimateHaste=a.ultimateHaste;p.augmentSnowballHaste=a.snowballHaste;p.augmentPercentPen=a.percentPen;p.augmentOmnivamp=a.omnivamp+t.omnivamp;p.augmentHealShieldPower=a.healShield+(b.HealShieldPower||0);p.augmentRangeBonus=a.range;p.itemRangeBonus=t.range;
 p.augmentHasteMoveNative=hasAugment(p,'ARAM_WithHaste')?p.abilityHaste*augmentValue('ARAM_WithHaste','AbilityHasteToMSConversion'):0;p.augmentMoveStatMultiplier=1+(b.PercentMovementSpeedMod||0)+a.movePercent;p.itemAttackSpeed=(b.PercentAttackSpeedMod||0)+a.attackSpeed+t.as;p.period=(p.baseAttackSpeed?1/p.baseAttackSpeed:.85)/(1+p.itemAttackSpeed);p.speed=((p.baseMoveSpeed||p.hero.speed)+((b.FlatMovementSpeedMod||0)+m.moveFlat+t.moveFlat+(a.moveFlat||0)+p.augmentHasteMoveNative)/(game.mapConfig?.scale||2))*(1+(b.PercentMovementSpeedMod||0)+a.movePercent+t.movePercent);p.augmentSize=(hasAugment(p,'ARAM_Goliath')?1.5:1)*(hasAugment(p,'ARAM_GiantSlayer')?.75:1)*tankEngineMultiplier(p)*m.sizeMultiplier*active.size;coreSizeStats(game,p);
 p.itemRegen=(b.FlatHPRegenMod||0)+2*((b.PercentBaseHPRegenMod||0)+m.hpRegenPercent);p.itemManaRegen=(b.FlatMPRegenMod||0)+9*((b.PercentBaseMPRegenMod||0)+m.manaRegenPercent);
 jaxPostStats(game,p);modernPostStats(game,p,game.items);expansionItemStats(game,p,game.items);fiveStats(game,p);applyAPAugmentStats(p,{critConverted:t.critToOnHit});jhinStats(p);return b;
}
export function snapshotEquipment(game){return {items:[...game.items],itemStacks:{...game.itemStacks},gold:game.gold,hp:game.player.hp,mp:game.player.mp,time:game.time};}

setStackStatRefresher((g,u,ids)=>applyInventoryStats({...g,player:u,items:[...ids]}));

setModernStatRefresher((g,u,ids)=>applyInventoryStats({...g,player:u,items:[...ids]}));

setExpansionItemHooks({refresh:(g,u,ids)=>applyInventoryStats({...g,player:u,items:[...ids]}),awardGold:(g,u,n)=>g.creditUnitGold(u,n)});
