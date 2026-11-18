import * as THREE from 'three';
// Native particle modes are not Three.js's numeric Blending constants.
// Zero/omitted is additive ONE+ONE; mode 2 is subtractive multiplication.
export function particleBlend(mode=0){
 const base={transparent:true,depthWrite:false,depthTest:true,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor};
 if(mode===1)Object.assign(base,{blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneMinusSrcAlphaFactor});
 if(mode===2)Object.assign(base,{blendSrc:THREE.ZeroFactor,blendDst:THREE.OneMinusSrcColorFactor,blendEquationAlpha:THREE.AddEquation,blendSrcAlpha:THREE.ZeroFactor,blendDstAlpha:THREE.OneFactor});
 if(mode===3)Object.assign(base,{transparent:false,depthWrite:true,blending:THREE.NoBlending});
 if(mode===4)base.blendSrc=THREE.SrcAlphaFactor;
 if(mode===5)base.blendDst=THREE.OneMinusSrcAlphaFactor;
 if(mode===6)base.blendEquation=THREE.MinEquation;
 if(mode===7)base.blendEquation=THREE.MaxEquation;
 if(mode===8)Object.assign(base,{blendSrc:THREE.OneMinusDstAlphaFactor,blendDst:THREE.DstAlphaFactor});
 return base;
}
export function configureParticleMaterial(material,e,textures){
 const mult=textures.get(e.multUrl),erosion=textures.get(e.erosionUrl),palette=textures.get(e.paletteUrl);
 const initialScale=e.textureMult?.uvScaleMult?.constantValue||[1,1],uniforms={nativeMult:{value:mult||null},nativeMultOffset:{value:new THREE.Vector2()},nativeMultScale:{value:new THREE.Vector2(initialScale[0]??1,initialScale[1]??1)},nativeErosion:{value:erosion||null},nativeErosionDrive:{value:0},nativePalette:{value:palette||null},nativeAge:{value:0},nativeFade:{value:1}};
 material.depthTest=!((e.miscRenderFlags||0)&1);material.alphaTest=(e.alphaRef||0)/255;
 material.toneMapped=false;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader='uniform sampler2D nativeMult; uniform vec2 nativeMultOffset; uniform vec2 nativeMultScale; uniform sampler2D nativeErosion; uniform float nativeErosionDrive; uniform sampler2D nativePalette; uniform float nativeAge; uniform float nativeFade;\n'+shader.fragmentShader;
  let code='';
  if(mult)code+='\n diffuseColor *= texture2D(nativeMult,vMapUv*nativeMultScale+nativeMultOffset);';
  if(palette)code+='\n diffuseColor *= texture2D(nativePalette,vec2(nativeAge,0.5));';
  if(erosion)code+='\n float erosionValue=texture2D(nativeErosion,vMapUv).r; diffuseColor.a *= smoothstep(nativeErosionDrive-0.15,nativeErosionDrive+0.15,erosionValue);';
  // ONE-based blending has no source-alpha factor: apply lifetime opacity to RGB.
  if([0,2,5,6,7].includes(e.blendMode||0))code+='\n diffuseColor.rgb *= diffuseColor.a;';
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n#ifdef USE_MAP'+code+'\n#endif');
 };
 material.customProgramCacheKey=()=>['native-vfx',e.blendMode||0,!!mult,!!erosion,!!palette].join(':');
 material.userData.nativeUniforms=uniforms;
}
