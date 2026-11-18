import {equipmentReadyAt} from './item-cooldown.js';
import {setExpansionItemHooks,expansionAfterDamage} from './expansion-items.js';
import {healUnit} from './combat-support.js';
import {ACTIVE_ITEMS,applyActiveItem,updateItemActives,itemActiveAfterDamage} from './item-actives.js';
import {itemStackAfterDamage,setPhantomHit} from './item-stacks.js';
import {SHOP_ITEMS} from './shop-catalog.js';
const BY_ID=new Map(SHOP_ITEMS.map(i=>[i.id,i]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const itemInventory=(g,u)=>u?.netPeerId?(u.inventoryItems||[]):u===g.player?(g.items||[]):(u?.inventoryItems||[]);
export const ownsItem=(g,u,id)=>itemInventory(g,u).includes(id);
export const itemStasis=(g,u)=>(u?.itemStasisUntil||0)>g.time;
export function itemStatBonuses(ids){const legendary=ids.filter(id=>BY_ID.get(id)?.tier==='legendary').length,has=id=>ids.includes(id),out={hpRegenPercent:0,manaRegenPercent:0,ad:0,haste:0,moveFlat:0,magicPen:0,armorPenPercent:0,magicPenPercent:0,critDamage:0,apMultiplier:has('3089')?1.4:1,hpMultiplier:1,sizeMultiplier:1};
 for(const id of ids){const text=BY_ID.get(id)?.statText||'';for(const[label,key]of [['基础生命回复','hpRegenPercent'],['基础法力回复','manaRegenPercent']]){const m=text.match(new RegExp('([0-9.]+)%\\s*'+label));if(m)out[key]+=Number(m[1])/100;}for(const[label,key]of [['护甲穿透','armorPenPercent'],['法术穿透','magicPenPercent'],['暴击伤害','critDamage']]){const m=text.match(new RegExp('([0-9.]+)%\\s*'+label));if(m)out[key]=Math.max(out[key],Number(m[1])/100);}}
 if(has('3031'))out.ad+=5*legendary;if(has('3078')){out.ad+=3*legendary;out.haste+=3*legendary;out.moveFlat+=3*legendary;}if(has('6655'))out.magicPen+=5*legendary;if(has('6653'))out.haste+=5*legendary;if(has('3084')){out.hpMultiplier+=.01*legendary;out.sizeMultiplier+=.06*legendary;}return out;
}
const FX={
 '3084':{proc:'ItemFX_3084_proc',ready:'ItemFX_3084_ready'},'3078':{ready:'ItemFX_3078_ready'},'3057':{ready:'ItemFX_3057_ready'},
 '6655':{hit:'ItemFX_6655_hit',speed:'ItemFX_6655_speed'},'6653':{burn:'ItemFX_6653_burn'},'3153':{hit:'ItemFX_3153_hit'},'3157':{active:'ItemFX_3157_active'}
};
export function itemCue(g,u,id,phase,target=u,duration=.8,extra={}){const nativeName=FX[id]?.[phase];if(!nativeName)return;g.fx('native',target.x,target.y,u.hero?.color||'#e7c481',40,duration,{nativeName,nativeDuration:duration,follow:target,itemId:id,itemPhase:phase,itemOwner:u,...extra});}
function state(u){return u.itemEffects??={cooldowns:{},castTokens:{},refunds:{}};}
const baseAD=u=>(u.hero.damage+Math.max(0,u.level-3)*4)*(1+.06*(u.itemStacksState?.counts?.trinity||0));
const ranged=u=>(u.nativeRange??u.hero.range)>300;
export function onItemSpellCast(g,u,key,token){if(!u.hero||!/^q|^w|^e|^r/.test(key))return;const s=state(u);s.castTokens[key[0]]=token;
 if((ownsItem(g,u,'3057')||ownsItem(g,u,'3078'))&&g.time>=(s.cooldowns.spellblade||0)){s.bladeUntil=g.time+10;const id=ownsItem(g,u,'3078')?'3078':'3057';itemCue(g,u,id,'ready',u,10,{itemState:'spellblade',nativeBone:'R_hand',replaceKey:`spellblade:${u.id}`});}
}
export function itemDamageMultiplier(g,u,v,type){if(type!=='magic'||v.kind!=='hero'||!ownsItem(g,u,'6653'))return 1;const base=(v.hero?.hp||v.maxHp)+Math.max(0,(v.level||3)-3)*70;return 1+.12*clamp((v.maxHp-base)/1250,0,1);}
function procDamage(g,u,v,n,type,lifeSteal=false,periodic=false){if(!v.alive||!g.canHit(v)||n<=0)return;const before=v.hp;g.hurt(v,n,u,0,0,type,false,{itemProc:true,augmentProc:true,periodic,state:'item'});if(lifeSteal&&u.alive&&u.lifesteal)healUnit(g,u,u,Math.max(0,Math.min(before,before-v.hp))*u.lifesteal,{kind:'lifesteal'});}
export function afterItemDamage(g,u,v,{basic,meta,beforeHp,dealt,damageType,rawDamage}){itemActiveAfterDamage(g,u,v,{basic,meta,beforeHp,dealt,damageType,rawDamage});if(!u?.hero||u.team===v.team||meta.itemProc||dealt<=0)return;const s=state(u),items=itemInventory(g,u);if(!items.length)return;
 if(basic&&meta.itemAttack!==false){
  if(items.includes('3153')&&['hero','minion'].includes(v.kind)){let amount=Math.max(15,beforeHp*(ranged(u)?.09:.12));if(v.kind!=='hero')amount=Math.min(60,amount);procDamage(g,u,v,amount,'physical',true);if(v.kind==='hero'&&v.alive&&g.time>=(s.cooldowns['3153']||0)){s.borkHits??={};const stack=s.borkHits[v.id]??={hits:0,until:0};if(stack.until<g.time)stack.hits=0;stack.hits++;stack.until=g.time+6;if(stack.hits>=3){stack.hits=0;s.cooldowns['3153']=equipmentReadyAt(g,u,30);procDamage(g,u,v,40+7*clamp(u.level-9,0,9),'magic');v.slow=Math.max(v.slow||0,2);v.slowPercent=.25;u.itemMoveBonus=Math.max(u.itemMoveBonus||0,.25);u.itemMoveUntil=g.time+2;itemCue(g,u,'3153','hit',v,.8);}}}
  if(s.bladeUntil>g.time&&g.time>=(s.cooldowns.spellblade||0)&&(items.includes('3078')||items.includes('3057'))){const id=items.includes('3078')?'3078':'3057';s.bladeUntil=0;s.cooldowns.spellblade=equipmentReadyAt(g,u,1.5);procDamage(g,u,v,baseAD(u)*(id==='3078'?2:1),'physical',true);itemCue(g,u,id,'proc',v,.6);}
 }
 itemStackAfterDamage(g,u,v,{basic,meta,beforeHp,dealt,damageType,rawDamage});
 const ability=!basic&&!meta.augmentProc&&/^[qwer]/.test(meta.state||'');if(!ability)return;
 if(items.includes('6655')){
  const token=s.castTokens[(meta.state||'')[0]]||0,refundKey=String(token);if(v.kind==='hero'){const used=s.refunds[refundKey]||0;if(used<3){const reduction=Math.min(.5,3-used);s.cooldowns['6655']=Math.max(g.time,(s.cooldowns['6655']||0)-reduction);s.refunds[refundKey]=used+reduction;}const keys=Object.keys(s.refunds);if(keys.length>12)delete s.refunds[keys[0]];}
  if(g.time>=(s.cooldowns['6655']||0)){s.cooldowns['6655']=equipmentReadyAt(g,u,10);const targets=[v,...g.units.filter(t=>t!==v&&t.alive&&t.team!==u.team&&['hero','minion'].includes(t.kind)&&g.canHit(t)&&Math.hypot(t.x-v.x,t.y-v.y)<=600/(g.mapConfig?.scale||2)).sort((a,b)=>Math.hypot(a.x-v.x,a.y-v.y)-Math.hypot(b.x-v.x,b.y-v.y)).slice(0,3)];for(const target of targets){procDamage(g,u,target,100+.1*(u.ap||0),'magic');itemCue(g,u,'6655','hit',target,.9);}u.itemMoveBonus=.15;u.itemMoveUntil=g.time+2;itemCue(g,u,'6655','speed',u,2);}
 }
 if(items.includes('6653')&&v.alive){v.itemBurns??=[];let dot=v.itemBurns.find(d=>d.source===u);if(!dot){dot={source:u,next:g.time+.5,until:g.time+4};v.itemBurns.push(dot);}else dot.until=g.time+4;dot.damage=(50+.06*(u.ap||0)+.04*v.maxHp)/8;itemCue(g,u,'6653','burn',v,4,{replaceKey:`liandry:${u.id}:${v.id}`,itemState:'burn'});}
}
export function updateItemEffects(g,dt=0){updateItemActives(g,dt);for(const u of g.units){if(!u.alive){u.itemBurns=[];continue;}if(u.itemBurns?.length){for(const dot of u.itemBurns){let guard=0;while(dot.next<=g.time+1e-8&&dot.next<=dot.until+1e-8&&u.alive&&guard++<8){procDamage(g,dot.source,u,dot.damage,'magic',false,true);dot.next+=.5;}}u.itemBurns=u.itemBurns.filter(d=>d.next<=d.until+1e-8&&u.alive);}if(u.itemMoveUntil<=g.time)u.itemMoveBonus=0;}}
export const activeItemIds=ACTIVE_ITEMS;
export function useActiveItem(g,index,aim){const id=g.items[index],ok=applyActiveItem(g,index,aim);if(ok&&['3157','2420'].includes(id))itemCue(g,g.player,'3157','active',g.player,2.5,{itemState:'stasis'});return ok;}
export function clearItemLife(u){u.itemBurns=[];u.itemStasisUntil=0;u.heartsteelCharge={};if(u.itemEffects){u.itemEffects.bladeUntil=0;u.itemEffects.borkHits={};}}

