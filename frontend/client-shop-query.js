import {SHOP_ITEMS,RECIPE_COMPONENTS} from './shop-catalog.js';
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
