// Camera indicator only: a white rectangular viewport, not champion vision.
export function minimapViewport(points,size=224){
 if(points.length!==4||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.max(0,Math.min(size,Math.min(...xs))),top=Math.max(0,Math.min(size,Math.min(...ys))),right=Math.max(0,Math.min(size,Math.max(...xs))),bottom=Math.max(0,Math.min(size,Math.max(...ys)));
 return right>left&&bottom>top?{x:left,y:top,width:right-left,height:bottom-top}:null;
}
export function drawMinimapViewport(ctx,points,size=224){const r=minimapViewport(points,size);if(!r)return;ctx.save();ctx.beginPath();ctx.rect(0,0,size,size);ctx.clip();ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.strokeRect(r.x,r.y,r.width,r.height);ctx.restore();}
