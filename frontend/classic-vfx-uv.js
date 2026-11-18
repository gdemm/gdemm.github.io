import {integrateParticleRate,isClassicEffect} from './classic-vfx-integral.js';
// Compose authored particle UV transforms after the renderer's atlas animation.
export function applyClassicUV(p,curve,sampleBirth=curve){
 if(!isClassicEffect(p.instance.name))return;
 const e=p.e,t=p.age/p.life,div=e.texDiv||[1,1],texture=p.texture;
 // Replace legacy birth terms while retaining the independently selected atlas frame.
 const scroll=curve(e.birthUvScrollRate,t,[0,0]),offset=curve(e.birthUVOffset,0,[0,0]);
 p.classicBirthScroll??=sampleBirth(e.birthUvScrollRate,0,[0,0]);p.classicBirthOffset??=sampleBirth(e.birthUVOffset,0,[0,0]);
 p.classicBirthUvRotationRate??=Number(sampleBirth(e.birthUvRotateRate,0,0));
 const emitterScroll=e.emitterUvScrollRate||[0,0];
 for(const [axis,i]of [['x',0],['y',1]]){
  const fractional=div[i]>0&&div[i]<1;
  const atlas=fractional?0:texture.offset[axis]-(offset[i]??0)-(scroll[i]??0)*p.age;
  if(fractional)texture.repeat[axis]=1/div[i];
  texture.offset[axis]=atlas+(p.classicBirthOffset[i]??0)+(p.classicBirthScroll[i]??0)*p.age+(emitterScroll[i]??0)*(p.instance.age||0);
 }
 const scale=curve(e.uvScale,t,[1,1]);texture.repeat.x*=scale[0]??1;texture.repeat.y*=scale[1]??1;
 const center=e.uvTransformCenter||[0,0];texture.center.set(center[0],center[1]);
 texture.rotation=(Number(curve(e.uvRotation,t,0))+p.classicBirthUvRotationRate*p.age)*Math.PI/180;
 const integrated=integrateParticleRate(e.particleUVScrollRate,p.age,p.life,curve,[0,0]);
 texture.offset.x+=integrated[0];texture.offset.y+=integrated[1];
 texture.rotation+=integrateParticleRate(e.particleUVRotateRate,p.age,p.life,curve,0)*Math.PI/180;
 texture.updateMatrix();
 if(e.TextureFlipU||e.TextureFlipV){
  const x=e.TextureFlipU?-1:1,y=e.TextureFlipV?-1:1;
  p.classicFlipMatrix??=texture.matrix.clone().set(x,0,(1-x)/2,0,y,(1-y)/2,0,0,1);
  texture.matrix.multiply(p.classicFlipMatrix);
  // Three otherwise rebuilds the matrix and silently removes the composed flip.
  texture.matrixAutoUpdate=false;
 }
}
