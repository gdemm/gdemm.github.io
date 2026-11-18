// Click stays a click until the pointer crosses the drag threshold.
export class CameraDrag {
 constructor({pan,manual,click,threshold=6}){Object.assign(this,{pan,manual,click,threshold});this.pointer=null;this.active=false;}
 begin(e,allowed){
  if(!allowed||this.pointer!==null||e.button!==0||e.pointerType==='touch'||e.shiftKey||e.ctrlKey||e.altKey||e.metaKey)return false;
  this.pointer=e.pointerId;this.start=this.last={x:e.clientX,y:e.clientY};this.active=false;return true;
 }
 move(e){
  if(e.pointerId!==this.pointer)return false;
  const next={x:e.clientX,y:e.clientY};
  if(!this.active&&Math.hypot(next.x-this.start.x,next.y-this.start.y)<this.threshold)return true;
  this.active=true;this.manual();this.pan(this.last,next);this.last=next;e.preventDefault?.();return true;
 }
 end(e,cancel=false){
  if(e.pointerId!==this.pointer)return false;
  const dragged=this.active;this.pointer=null;this.active=false;
  if(dragged)this.manual();else if(!cancel)this.click(e);
  return true;
 }
}
