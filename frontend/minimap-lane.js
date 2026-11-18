// Static presentation mask traced against installed Map12 512x512 minimap art.
// Not gameplay fog of war: it never filters units, signals or click coordinates.
export const MINIMAP_LANE_OUTLINE=[[0,412],[350,77],[350,0],[512,0],[512,129],[445,193],[402,193],[179,418],[179,459],[126,512],[0,512]];
export function drawLaneMinimap(ctx,image,size=224){
 ctx.save();ctx.fillStyle='#000000';ctx.fillRect(0,0,size,size);
 if(image?.complete&&image.naturalWidth){ctx.beginPath();for(let i=0;i<MINIMAP_LANE_OUTLINE.length;i++){const[x,y]=MINIMAP_LANE_OUTLINE[i];if(i)ctx.lineTo(x/512*size,y/512*size);else ctx.moveTo(x/512*size,y/512*size);}ctx.closePath();ctx.clip();ctx.drawImage(image,0,0,size,size);}
 ctx.restore();
}
