// Image transfer follows the visible shop UI; item data and input handlers stay eager.
export function deferShopImage(image,url){image.dataset.shopSrc=url;image.decoding='async';return image;}
const overlaps=(a,b,margin=0)=>a.right>=b.left-margin&&a.left<=b.right+margin&&a.bottom>=b.top-margin&&a.top<=b.bottom+margin;
export function shopImageIsNear(image,root,{style=element=>getComputedStyle(element),rect=element=>element.getBoundingClientRect(),margin=80}={}){
 if(!root.open||!image.isConnected||!root.contains(image))return false;
 const bounds=rect(image);if(!(bounds.width>0&&bounds.height>0)||!overlaps(bounds,rect(root),margin))return false;
 for(let node=image;node;node=node.parentElement){
  const css=style(node);if(node.hidden||css.display==='none'||css.visibility==='hidden'||css.visibility==='collapse'||Number(css.opacity)===0)return false;
  if(node!==image&&node!==root&&/(auto|scroll|hidden|clip)/.test(css.overflowX+' '+css.overflowY)&&!overlaps(bounds,rect(node),margin))return false;
  if(node===root)return true;
 }
 return false;
}
export class ShopImageLoader {
 constructor(root){
  this.root=root;this.pending=new Set();this.frame=null;this.assigned=0;
  this.schedule=()=>{if(this.frame!==null)return;this.frame=requestAnimationFrame(()=>{this.frame=null;this.flush();});};
  this.observer=typeof IntersectionObserver==='function'?new IntersectionObserver(()=>this.schedule(),{root,rootMargin:'80px'}):null;
  const relevant=records=>records.some(r=>r.type==='attributes'?(r.attributeName!=='data-shop-src'||r.target.hasAttribute('data-shop-src')):[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches?.('img')||n.querySelector?.('img'))));
  this.mutations=new MutationObserver(records=>{if(relevant(records))this.schedule();});
  this.mutations.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','open','data-shop-src']});
  for(const name of ['scroll','pointerover','pointerdown','focusin'])root.addEventListener(name,this.schedule,{capture:true,passive:true});
  addEventListener('resize',this.schedule,{passive:true});this.schedule();
 }
 flush(){
  for(const image of this.pending)if(!image.isConnected||!this.root.contains(image)||!image.dataset.shopSrc){this.observer?.unobserve(image);this.pending.delete(image);}
  for(const image of this.root.querySelectorAll('img[data-shop-src]'))if(!this.pending.has(image)){this.pending.add(image);this.observer?.observe(image);}
  if(!this.root.open)return;
  const styles=new Map(),rects=new Map();const options={style:e=>{if(!styles.has(e))styles.set(e,getComputedStyle(e));return styles.get(e);},rect:e=>{if(!rects.has(e))rects.set(e,e.getBoundingClientRect());return rects.get(e);}};
  for(const image of this.pending)if(shopImageIsNear(image,this.root,options)){
   const url=image.dataset.shopSrc;delete image.dataset.shopSrc;this.observer?.unobserve(image);this.pending.delete(image);image.loading='eager';image.src=url;this.assigned++;
  }
 }
 dispose(){if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;this.observer?.disconnect();this.mutations.disconnect();this.pending.clear();for(const name of ['scroll','pointerover','pointerdown','focusin'])this.root.removeEventListener(name,this.schedule,true);removeEventListener('resize',this.schedule);}
}
