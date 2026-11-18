import * as THREE from 'three';
import {integrateParticleRate,isClassicEffect} from './classic-vfx-integral.js';
export function configureClassicMultUV(material,e,textures,name){
 if(!isClassicEffect(name)||!textures.get(e.multUrl))return;
 const rotation={value:0},center={value:new THREE.Vector2(...(e.textureMult?.uvTransformCenterMult||[0,0]))};
 const flip={value:new THREE.Vector2(e.textureMult?.TextureMultFilpU?-1:1,e.textureMult?.TextureMultFilpV?-1:1)},emitterScroll={value:new THREE.Vector2()};
 const offset={value:new THREE.Vector2()};
 material.userData.classicMultUV={rotation,center,flip,emitterScroll,offset};const before=material.onBeforeCompile,cache=material.customProgramCacheKey;
 material.onBeforeCompile=shader=>{before(shader);Object.assign(shader.uniforms,{classicMultRotation:rotation,classicMultCenter:center,classicMultFlip:flip,classicMultEmitterScroll:emitterScroll,classicMultOffset:offset});
  shader.vertexShader='varying vec2 classicRawUv;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nclassicRawUv = uv;');
  shader.fragmentShader='varying vec2 classicRawUv; uniform float classicMultRotation; uniform vec2 classicMultCenter; uniform vec2 classicMultFlip; uniform vec2 classicMultEmitterScroll; uniform vec2 classicMultOffset;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('vMapUv*nativeMultScale+nativeMultOffset','(mat2(cos(classicMultRotation),-sin(classicMultRotation),sin(classicMultRotation),cos(classicMultRotation))*(classicRawUv*classicMultFlip+(vec2(1.0)-classicMultFlip)*0.5-classicMultCenter))*nativeMultScale+classicMultCenter+classicMultOffset+classicMultEmitterScroll');
 };
 material.customProgramCacheKey=()=>cache.call(material)+':classic-independent-mult-uv';
}
export function updateClassicMultUV(p,curve,sampleBirth){
 const uniforms=p.material.userData.classicMultUV;if(!uniforms)return;
 const m=p.e.textureMult||{};p.classicMultBirthRate??=Number(sampleBirth(m.birthUvRotateRateMult,0,0));
 const rotation=Number(curve(m.UvRotationMult,p.age/p.life,0))+p.classicMultBirthRate*p.age+integrateParticleRate(m.ParticleIntegratedUvRotateMult,p.age,p.life,curve,0);
 uniforms.rotation.value=rotation*Math.PI/180;
 p.classicMultBirthScroll??=sampleBirth(m.birthUvScrollRateMult,0,[0,0]);
 p.classicMultBirthOffset??=sampleBirth(m.birthUVOffsetMult,0,[0,0]);
 const integrated=integrateParticleRate(m.ParticleIntegratedUvScrollMult,p.age,p.life,curve,[0,0]);
 uniforms.offset.value.set((p.classicMultBirthOffset[0]||0)+(p.classicMultBirthScroll[0]||0)*p.age+integrated[0],(p.classicMultBirthOffset[1]||0)+(p.classicMultBirthScroll[1]||0)*p.age+integrated[1]);
 const rate=m.emitterUvScrollRateMult||[0,0],emitterAge=p.instance?.age||0;uniforms.emitterScroll.value.set((rate[0]||0)*emitterAge,(rate[1]||0)*emitterAge);
}
