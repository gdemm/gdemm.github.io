import * as THREE from 'three';
// Screen-space refraction: capture the scene without refractors before sampling it.
// This preserves native normal-map detail; it is not a colored placeholder quad.
export class ClassicDistortion {
 constructor(){this.target=null;this.size=new THREE.Vector2();this.uniforms={classicSceneColor:{value:null},classicViewport:{value:this.size}};}
 configure(material,e,textures){
  const normal=textures.get(e.distortionNormalUrl);if(!normal||!e.distortionDefinition)return false;
  normal.colorSpace=THREE.NoColorSpace;
  const prior=material.onBeforeCompile,cache=material.customProgramCacheKey;
  material.transparent=true;material.depthWrite=false;material.blending=THREE.NormalBlending;material.toneMapped=false;
  material.onBeforeCompile=shader=>{
   prior(shader);Object.assign(shader.uniforms,this.uniforms,{classicDistortionNormal:{value:normal},classicDistortionStrength:{value:Number(e.distortionDefinition.distortion)||0}});
   shader.fragmentShader='uniform sampler2D classicSceneColor; uniform sampler2D classicDistortionNormal; uniform vec2 classicViewport; uniform float classicDistortionStrength;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`#ifdef USE_MAP
    vec4 refractionNormal = texture2D(classicDistortionNormal,vMapUv);
    vec2 refractionOffset = (refractionNormal.rg * 2.0 - 1.0) * classicDistortionStrength;
    vec2 screenUv = gl_FragCoord.xy / classicViewport;
    outgoingLight = texture2D(classicSceneColor,clamp(screenUv + refractionOffset,vec2(0.0),vec2(1.0))).rgb;
    diffuseColor.a *= refractionNormal.a;
    #endif
    #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>cache.call(material)+':classic-refraction';material.userData.classicDistortion=true;return true;
 }
 render(renderer,scene,camera,particles){
  const objects=[...new Set(particles.filter(p=>p.material.userData.classicDistortion&&p.object.visible).map(p=>p.object))];
  if(objects.length){
   renderer.getDrawingBufferSize(this.size);
   if(!this.target){this.target=new THREE.WebGLRenderTarget(this.size.x,this.size.y,{depthBuffer:true,stencilBuffer:true});this.target.texture.generateMipmaps=false;this.uniforms.classicSceneColor.value=this.target.texture;}
   else if(this.target.width!==this.size.x||this.target.height!==this.size.y)this.target.setSize(this.size.x,this.size.y);
   const previous=renderer.getRenderTarget();
   try{for(const o of objects)o.visible=false;renderer.setRenderTarget(this.target);renderer.render(scene,camera);}
   finally{renderer.setRenderTarget(previous);for(const o of objects)o.visible=true;}
  }
  renderer.render(scene,camera);
 }
 dispose(){this.target?.dispose();this.target=null;this.uniforms.classicSceneColor.value=null;}
}
