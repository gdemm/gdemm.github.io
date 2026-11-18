import {loadCriticalTexture} from './critical-texture.js';
import * as THREE from 'three';
import {kaisaMaterialTime} from './kaisa-membrane-material.js';
let matcapPromise,matcap;
export function ensureKaisaMatcap(url){return matcapPromise??=loadCriticalTexture(url).then(t=>{t.colorSpace=THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;matcap=t;return t;});}
// PS435 material-local math with native Main_Texture/MatCap_Mask both constant white.
export function evaluatePistol(base,blend,mask,cap,p){
 const sat=x=>Math.max(0,Math.min(1,x)),a=p.BaseMat_Tint,b=p.BlendMat_Tint,t=p.TintColor,main=p.MainTex_TintColor;
 const layer=[0,1,2].map(i=>(a[i]*base+b[i]*blend)*mask*p.MaskStrength[0]*t[i]);
 const rgb=layer.map((v,i)=>main[i]+v+Math.pow(Math.max(0,cap[i]*p.MatCap_TintColor[i]),p.MatCap_Control[1])*p.MatCap_Control[0]);
 const alpha=sat(sat(sat(main[0]*layer[0]*sat(main[3]+1)+1)*main[3])-p.Alpha_Control[0]);return {rgb,alpha};
}
export function createKaisaPistolMaterial(source,p,texture=matcap){
 if(source.name!=='Kaisa_Pistols_Mat'||!source.map||!texture)return null;
 const map=source.map.clone();map.colorSpace=THREE.NoColorSpace;map.needsUpdate=true;
 const m=new THREE.MeshBasicMaterial({name:source.name,map,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 const uniforms={pistolTime:kaisaMaterialTime,pistolMatcap:{value:texture}};
 for(const[name,key]of [['BaseTint','BaseMat_Tint'],['BlendTint','BlendMat_Tint'],['Tint','TintColor'],['MainTint','MainTex_TintColor'],['CapTint','MatCap_TintColor'],['CapControl','MatCap_Control']])uniforms['pistol'+name]={value:new THREE.Vector4(...p[key])};
 uniforms.pistolBaseUV={value:new THREE.Vector4(...p.Base_Tile.slice(0,2),...p.ScrollSpeedBase.slice(0,2))};uniforms.pistolBlendUV={value:new THREE.Vector4(...p.Blend_Tile.slice(0,2),...p.ScrollSpeedBlend.slice(0,2))};uniforms.pistolMask={value:p.MaskStrength[0]};uniforms.pistolAlphaControl={value:p.Alpha_Control[0]};
 m.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 pistolWorldNormal;varying vec3 pistolWorldPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )','#if 1').replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\npistolWorldNormal=inverseTransformDirection(transformedNormal,viewMatrix);').replace('#include <project_vertex>','#include <project_vertex>\npistolWorldPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader='varying vec3 pistolWorldNormal;varying vec3 pistolWorldPosition;uniform sampler2D pistolMatcap;uniform float pistolTime,pistolMask,pistolAlphaControl;uniform vec4 pistolBaseTint,pistolBlendTint,pistolTint,pistolMainTint,pistolCapTint,pistolCapControl,pistolBaseUV,pistolBlendUV;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   float base=texture2D(map,vMapUv*pistolBaseUV.xy+pistolTime*pistolBaseUV.zw).r;
   float blend=texture2D(map,vMapUv*pistolBlendUV.xy+pistolTime*pistolBlendUV.zw).g;
   float mask=texture2D(map,vMapUv).b*pistolMask;
   vec3 layer=(base*pistolBaseTint.rgb+blend*pistolBlendTint.rgb)*mask*pistolTint.rgb;
   float alpha=clamp(clamp(clamp(pistolMainTint.r*layer.r*clamp(pistolMainTint.a+1.0,0.0,1.0)+1.0,0.0,1.0)*pistolMainTint.a,0.0,1.0)-pistolAlphaControl,0.0,1.0);
   if(alpha<=0.0)discard;
   vec3 reflected=reflect(normalize(cameraPosition-pistolWorldPosition),normalize(pistolWorldNormal));
   vec2 capUV=reflected.xy/(2.0*max(length(reflected),0.00001))+0.5;
   vec3 cap=pow(max(texture2D(pistolMatcap,capUV).rgb*pistolCapTint.rgb,vec3(0.0)),vec3(pistolCapControl.y))*pistolCapControl.x;
   diffuseColor=vec4((pistolMainTint.rgb+layer+cap)*diffuse,alpha*opacity);
   #endif`);
 };m.customProgramCacheKey=()=> 'kaisa-native-pistol-ps435';m.userData.kaisaPistol=true;return m;
}
