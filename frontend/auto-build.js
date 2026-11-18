// One-click build: buys the hero's recommended plan in order, components first when the full item is unaffordable.
import {itemById} from './client-shop-query.js';
import {RECIPE_COMPONENTS} from './shop-catalog.js';
import {RECOMMENDED} from './shop-recommendations.js?v=shop-icons-heartsteel-1';
export const buildPlan=hero=>(RECOMMENDED[hero]||RECOMMENDED.Ashe).plan;
const KEY='hx-auto-build';
const info=id=>itemById(id)||RECIPE_COMPONENTS[id];
export class AutoBuild{
 constructor({getPlan,onBuy=()=>{}}){Object.assign(this,{getPlan,onBuy,enabled:localStorage.getItem(KEY)==='1',pending:null,last:0,listeners:new Set()});}
 set(v){this.enabled=!!v;localStorage.setItem(KEY,v?'1':'0');this.pending=null;for(const f of this.listeners)f(this.enabled);}
 toggle(){this.set(!this.enabled);return this.enabled;}
 // Parts of `target` still missing, top-down, mirroring quotePurchase's consume order.
 missing(target,owned){const out=[];const walk=id=>{const i=owned.indexOf(id);if(i>=0){owned.splice(i,1);return;}out.push(id);for(const c of info(id)?.from||[])walk(c);};walk(target);return out;}
 next(game){const plan=this.getPlan(game)||[];const owned=[...(game.items||[])].filter(x=>x!=='2003');
  for(const target of plan){const own=[...owned];const i=own.indexOf(target);if(i>=0){owned.splice(i,1);continue;}
   const parts=this.missing(target,own);for(const id of parts){if(!itemById(id))continue;const q=game.quoteItem(id);if(q.ok)return id;}
   return null;}
  return null;}
 update(game,playing){if(!this.enabled||!playing||!game?.player||game.winner!=null||!game.canShop?.())return;
  const now=performance.now(),n=(game.items||[]).length;
  if(this.pending){if(this.pending.game===game&&n===this.pending.count&&(game.gold>=this.pending.gold-1)&&now-this.pending.at<1500)return;this.pending=null;}
  if(now-this.last<250)return;this.last=now;
  const id=this.next(game);if(!id)return;const q=game.quoteItem(id);
  this.pending={game,count:n,gold:game.gold,at:now};
  if(game.buy(id))this.onBuy(q.item,q.cost);else this.pending=null;}
}
export const autoBuild=new AutoBuild({getPlan:g=>buildPlan(g.player?.hero?.id)});
