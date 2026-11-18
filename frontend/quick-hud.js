// Touch HUD extras (Wild Rift style): two pre-selected items beside the shop button, and a kill/assist feed below.
import {itemById} from './client-shop-query.js';
import {buildPlan,autoBuild} from './auto-build.js';
const css=`
#qhItems{position:fixed;z-index:31;left:calc(42px + env(safe-area-inset-left));top:calc(115px + env(safe-area-inset-top));display:none;gap:4px;pointer-events:auto}
body.mt-touch.qh-on #qhItems{display:flex}
#qhItems button{position:relative;width:30px;height:30px;padding:0;border:1px solid #785a28;border-radius:3px;background:#06121a;box-shadow:0 1px 4px #000a;touch-action:none;overflow:hidden}
#qhItems button img{width:100%;height:100%;display:block;filter:grayscale(.75) brightness(.6)}
#qhItems button.ok{border-color:#e8c35a;box-shadow:0 0 0 1px #e8c35a88,0 0 8px #e8c35a77}
#qhItems button.ok img{filter:none}
#qhItems button:active{transform:scale(.92)}
body.mt-touch.qh-on #mt .shop{top:calc(115px + env(safe-area-inset-top));width:30px;height:30px;min-width:0;padding:2px 0 1px;flex-direction:column;align-items:center;justify-content:space-between;gap:0;border:1px solid #785a28;border-radius:3px;box-shadow:0 1px 4px #000a}
body.mt-touch.qh-on #mt .shop i{width:13px;height:13px;flex:none}
body.mt-touch.qh-on #mt .shop span{font-size:8px;line-height:9px;letter-spacing:-.3px;max-width:30px;overflow:hidden;white-space:nowrap}
#qhFeed{position:fixed;z-index:30;left:calc(8px + env(safe-area-inset-left));top:calc(150px + env(safe-area-inset-top));display:none;flex-direction:column;gap:3px;pointer-events:none}
body.mt-touch.qh-on #qhFeed{display:flex}
#qhFeed .r{align-self:flex-start;display:flex;align-items:center;gap:3px;height:26px;padding:1px 3px;border-radius:3px;transition:opacity .5s}
#qhFeed .r.a{background:linear-gradient(90deg,#1b4a78e6,#1b4a7866)}#qhFeed .r.e{background:linear-gradient(90deg,#7a1f22e6,#7a1f2266)}
#qhFeed .r.out{opacity:0}
#qhFeed img{width:24px;height:24px;border-radius:2px;object-fit:cover;background:#06121a;border:1px solid #0008}
#qhFeed .x{width:20px;text-align:center;color:#f0e6d2;font:700 13px/1 system-ui;text-shadow:0 1px 2px #000}
#qhFeed .as{display:flex;gap:1px}#qhFeed .as img{width:13px;height:13px;border-radius:50%}
body.mt-touch .chat-open{position:fixed!important;left:calc(118px + env(safe-area-inset-left))!important;top:calc(36px + env(safe-area-inset-top))!important;bottom:auto!important;right:auto!important}
`;
const portrait=p=>p?.hero?'assets/'+p.hero+'.png.webp':'';
export class QuickHud{
 constructor({notice=()=>{}}={}){this.notice=notice;const st=document.createElement('style');st.textContent=css;document.head.append(st);
  this.items=document.createElement('div');this.items.id='qhItems';this.btns=[0,1].map(()=>{const b=document.createElement('button');b.type='button';const im=document.createElement('img');im.alt='';b.append(im);b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.buy(b.dataset.id);});this.items.append(b);return b;});
  this.feed=document.createElement('div');this.feed.id='qhFeed';document.body.append(this.items,this.feed);this.seen=new Set();this.game=null;this.last=0;}
 targets(g){const plan=buildPlan(g.player?.hero?.id)||[],owned=[...(g.items||[])],out=[];for(const id of plan){const i=owned.indexOf(id);if(i>=0){owned.splice(i,1);continue;}if(itemById(id))out.push(id);if(out.length===2)break;}return out;}
 part(g,target){for(const id of autoBuild.missing(target,[...(g.items||[])])){if(!itemById(id))continue;if(g.quoteItem(id).ok)return id;}return null;}
 buy(target){const g=this.game;if(!g||!target)return;if(!g.canShop?.()){this.notice('回到泉水或阵亡时才能购买');return;}const id=this.part(g,target);if(!id){this.notice('金币不足');return;}g.buy(id);this.last=0;}
 update(g,playing){const on=!!(playing&&g?.player);document.body.classList.toggle('qh-on',on);if(!on)return;
  if(this.game!==g){this.game=g;this.seen=new Set((g.killEvents||[]).map(e=>e.id));this.feed.textContent='';}
  const now=performance.now();if(now-this.last>300){this.last=now;const ts=this.targets(g),shop=!!g.canShop?.();
   this.btns.forEach((b,i)=>{const id=ts[i];b.style.display=id?'block':'none';if(!id)return;if(b.dataset.id!==id){b.dataset.id=id;const it=itemById(id);b.firstChild.src=it.icon;b.setAttribute('aria-label','购买 '+it.name);}b.classList.toggle('ok',shop&&!!this.part(g,id));});}
  for(const e of g.killEvents||[]){if(this.seen.has(e.id))continue;this.seen.add(e.id);this.add(e,g.player.team);}}
 add(e,team){const r=document.createElement('div');const vt=e.victim?.team;r.className='r '+(vt===team?'e':'a');
  const img=p=>{const i=document.createElement('img');i.alt='';const s=portrait(p);if(s){i.onerror=()=>{i.onerror=null;i.src=s.replace('.webp','');};i.src=s;}return i;};
  const k=e.killer?img(e.killer):(()=>{const i=document.createElement('span');i.className='x';i.textContent='⚔';return i;})();
  const as=document.createElement('span');as.className='as';for(const a of(e.assists||[]).slice(0,4))as.append(img(a));
  const x=document.createElement('span');x.className='x';x.textContent='✕';r.append(k,as,x,img(e.victim));
  this.feed.prepend(r);while(this.feed.children.length>3)this.feed.lastChild.remove();
  setTimeout(()=>r.classList.add('out'),6000);setTimeout(()=>r.remove(),6600);}
}
