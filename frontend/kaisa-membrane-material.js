import * as THREE from 'three';
// Material-local equations transcribed from native ScrollingUVs PS116.
// Scene LUT/fog and separate native bloom target are not reproduced here.
export const kaisaMaterialTime={value:0};
const time=kaisaMaterialTime;
export function updateKaisaMaterialTime(value){time.value=value;}
export function evaluateMembrane(base,blend,mask,p){
 const sat=x=>Math.max(0,Math.min(1,x)),a=p.BaseMat_Tint,b=p.BlendMat_Tint,t=p.TintColor,m=mask*p.MaskStrength[0];
 const coverage=sat(a[3]*base+b[3]*blend)*m*t[3];
 return {rgb:[0,1,2].map(i=>(a[i]*base+b[i]*blend)*m*t[i]),alpha:sat(sat(coverage*base*a[0]*blend*b[0])-p.Alpha_Control[0])};
}
export function createKaisaMembraneMaterial(source,p){
 if(source.name!=='Kaisa_Membrane_Mat'||!source.map)return null;
 const map=source.map.clone();map.colorSpace=THREE.NoColorSpace;map.needsUpdate=true;
 const material=new THREE.MeshBasicMaterial({name:source.name,map,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const uniforms={membraneTime:time,membraneBaseTint:{value:new THREE.Vector4(...p.BaseMat_Tint)},membraneBlendTint:{value:new THREE.Vector4(...p.BlendMat_Tint)},membraneTint:{value:new THREE.Vector4(...p.TintColor)},membraneBaseUV:{value:new THREE.Vector4(...p.Base_Tile.slice(0,2),...p.ScrollSpeedBase.slice(0,2))},membraneBlendUV:{value:new THREE.Vector4(...p.Blend_Tile.slice(0,2),...p.ScrollSpeedBlend.slice(0,2))},membraneMask:{value:p.MaskStrength[0]},membraneAlphaControl:{value:p.Alpha_Control[0]}};
 material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.fragmentShader='uniform float membraneTime,membraneMask,membraneAlphaControl;uniform vec4 membraneBaseTint,membraneBlendTint,membraneTint,membraneBaseUV,membraneBlendUV;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 float layerBase=texture2D(map,vMapUv*membraneBaseUV.xy+membraneTime*membraneBaseUV.zw).r;
 float layerBlend=texture2D(map,vMapUv*membraneBlendUV.xy+membraneTime*membraneBlendUV.zw).g;
 float layerMask=texture2D(map,vMapUv).b*membraneMask;
 float coverage=clamp(membraneBaseTint.a*layerBase+membraneBlendTint.a*layerBlend,0.0,1.0)*layerMask*membraneTint.a;
 float alpha=clamp(clamp(coverage*layerBase*membraneBaseTint.r*layerBlend*membraneBlendTint.r,0.0,1.0)-membraneAlphaControl,0.0,1.0);
 if(alpha<=0.0)discard;
 vec3 color=(membraneBaseTint.rgb*layerBase+membraneBlendTint.rgb*layerBlend)*layerMask*membraneTint.rgb;
 diffuseColor=vec4(color*diffuse,alpha*opacity);
 #endif`);};
 material.customProgramCacheKey=()=> 'kaisa-native-membrane-ps116';material.userData.kaisaMembrane=true;return material;
}
