// Sizes are in the minimap's native 224×224 canvas coordinates.
export const MINIMAP_PORTRAIT_RADIUS=Object.freeze({self:12,other:10});
export function drawMinimapPortrait(ctx,image,point,isLocal,teamColor){
 const radius=isLocal?MINIMAP_PORTRAIT_RADIUS.self:MINIMAP_PORTRAIT_RADIUS.other;
 ctx.save();
 // Dark backing and a thicker team outline keep the larger portrait legible
 // against both the snow and other nearby markers.
 ctx.beginPath();ctx.arc(point.x,point.y,radius+1.2,0,Math.PI*2);ctx.fillStyle='#04111b';ctx.fill();
 if(image?.complete&&image.naturalWidth){
  ctx.save();ctx.beginPath();ctx.arc(point.x,point.y,radius,0,Math.PI*2);ctx.clip();
  ctx.drawImage(image,point.x-radius,point.y-radius,radius*2,radius*2);ctx.restore();
 }else{ctx.beginPath();ctx.arc(point.x,point.y,radius,0,Math.PI*2);ctx.fillStyle=teamColor;ctx.fill();}
 ctx.beginPath();ctx.arc(point.x,point.y,radius,0,Math.PI*2);ctx.strokeStyle=isLocal?'#eaffaf':teamColor;ctx.lineWidth=isLocal?2:1.8;ctx.stroke();ctx.restore();
}
