export const RELATION_COLORS=Object.freeze({self:'#a5e67c',ally:'#65c9ed',enemy:'#ed565b'});
export function unitRelation(unit,viewer){if(viewer)return unit===viewer?'self':unit.team===viewer.team?'ally':'enemy';return unit.player?'self':unit.team===1?'enemy':'ally';}
export const unitColor=(unit,viewer)=>RELATION_COLORS[unitRelation(unit,viewer)];
// Native minimap symbol silhouettes need relative team tint; portraits retain their artwork.
export class TeamIconCache{
 constructor(createCanvas=()=>document.createElement('canvas')){this.createCanvas=createCanvas;this.cache=new WeakMap();}
 get(image,color){if(!image?.complete||!image.naturalWidth)return null;let colors=this.cache.get(image);if(!colors){colors=new Map();this.cache.set(image,colors);}if(colors.has(color))return colors.get(color);const canvas=this.createCanvas();canvas.width=image.naturalWidth;canvas.height=image.naturalHeight||image.naturalWidth;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';colors.set(color,canvas);return canvas;}
}
