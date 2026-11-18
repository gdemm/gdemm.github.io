import {FLOATING_TEXT} from './floating-text-data.js?v=native-floating-text-1';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const DAMAGE_NAME={physical:'PhysicalDamage',magic:'MagicalDamage',true:'TrueDamage'};
export function formatName(f){return (f.incoming?'Enemy':'')+(DAMAGE_NAME[f.damageType]||'PhysicalDamage')+(f.critical?'Critical':'');}
export function floatingStyle(f){return FLOATING_TEXT.types[formatName(f)];}
export function floatingMotion(f,style,viewportHeight=900){
 const age=f.age||0,side=f.side||1,seed=((f.id||1)*2654435761>>>0)/4294967295,ui=clamp(viewportHeight/900,.75,1.1);
 const between=(a=0,b=a)=>a+(b-a)*seed,vx=between(style.minXVelocity,style.maxXVelocity)*side,vy=between(style.minYVelocity,style.maxYVelocity),forceX=(style.continualForceX||0)*side,forceY=style.continualForceY||0;
 const randomX=between(style.randomStartOffsetMinX,style.randomStartOffsetMaxX),randomY=between(style.randomStartOffsetMinY,style.randomStartOffsetMaxY);
 const x=((style.startOffsetX||0)*side+randomX+vx*age+.5*forceX*age*age)*ui,y=-((style.startOffsetY||0)+randomY+vy*age-.5*forceY*age*age)*ui;
 const fadeAt=style.decayDelay||0,alpha=age<=fadeAt?1:clamp(1-(age-fadeAt)/Math.max(.001,style.decay||.45),0,1),remaining=(style.decayDelay||0)+(style.decay||.45)-age,shrink=remaining<(style.shrinkTime||0)?(style.shrinkScale??1)+(1-(style.shrinkScale??1))*clamp(remaining/Math.max(.001,style.shrinkTime),0,1):1;
 return {x,y,alpha,scale:(style.scale||1)*shrink*ui};
}
export class NativeFloatingText{
 constructor(){this.images={};if(typeof Image!=='undefined')for(const name of ['criticon','criticonmagic','criticontrue']){const im=new Image();im.src=`assets/floating-text/${name}.png`;this.images[name]=im;}}
 draw(ctx,floaters,project,viewportHeight=900){
  for(const f of floaters.slice(-FLOATING_TEXT.maxItems)){
   const style=floatingStyle(f);if(!style)continue;const p=project(f.x,f.y,f.z||35),m=floatingMotion(f,style,viewportHeight),font=style.font,size=font.size*m.scale;
   ctx.save();ctx.globalAlpha=m.alpha;ctx.translate(p.x+m.x,p.y+m.y);ctx.font=`bold ${size}px "${font.family}"`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.shadowColor=font.outlineColor;ctx.shadowOffsetX=font.shadow[0]*m.scale;ctx.shadowOffsetY=font.shadow[1]*m.scale;ctx.shadowBlur=0;ctx.lineWidth=Math.max(2,font.outlineSize*2*m.scale);ctx.strokeStyle=font.outlineColor;ctx.fillStyle=font.color;
   const value=String(f.text),width=ctx.measureText(value).width,icon=style.icons?.[0];if(icon){const name=icon.url.split('/').pop().replace('.png',''),im=this.images[name],s=icon.mDisplaySize[0]*m.scale,ix=-width/2-s/2+(icon.mOffset?.[0]||0)*m.scale,iy=(icon.mOffset?.[1]||0)*m.scale;if(im?.complete&&im.naturalWidth)ctx.drawImage(im,ix-s/2,iy-s/2,s,s);}
   ctx.strokeText(value,0,0);ctx.fillText(value,0,0);ctx.restore();
  }
 }
}
