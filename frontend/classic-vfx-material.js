import * as THREE from 'three';
// Native base-texture palette differs from the legacy particle-age color palette.
export function configureClassicPalette(material,emitter,textures){
 configureClassicErosion(material,emitter,textures);
 const texture=textures.get(emitter.nativePaletteUrl);if(!texture)return;
 // Palette rows are discrete LUTs: mipmaps blend unrelated rows (including red).
 if(texture.generateMipmaps||texture.minFilter!==THREE.LinearFilter||texture.wrapT!==THREE.ClampToEdgeWrapping){texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.needsUpdate=true;}
 const count=Math.max(1,emitter.paletteDefinition?.paletteCount||1),selector=emitter.paletteDefinition?.paletteSelector?.constantValue?.[0]||0;
 const previous=material.onBeforeCompile,cache=material.customProgramCacheKey;
 material.onBeforeCompile=shader=>{previous(shader);shader.uniforms.classicPaletteMixer={value:classicPaletteMixer(emitter)};shader.uniforms.classicPalette={value:texture};shader.uniforms.classicPaletteRow={value:1-(Math.max(0,Math.min(count-1,selector))+.5)/count};shader.fragmentShader='uniform vec4 classicPaletteMixer; uniform sampler2D classicPalette; uniform float classicPaletteRow;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n#ifdef USE_MAP\n diffuseColor.rgb = diffuse * texture2D(classicPalette,vec2(dot(sampledDiffuseColor,classicPaletteMixer),classicPaletteRow)).rgb;\n#endif');};
 material.customProgramCacheKey=()=>cache.call(material)+':classic-palette:'+count+':'+selector;
}
export function classicErosionMixer(emitter){const value=emitter.alphaErosionDefinition?.erosionMapChannelMixer?.constantValue;return Array.isArray(value)&&value.length===4?new THREE.Vector4(...value):new THREE.Vector4(1,0,0,0);}

export function configureClassicErosion(material,emitter,textures){
 if(!textures.get(emitter.erosionUrl))return;
 const previous=material.onBeforeCompile,cache=material.customProgramCacheKey;
 material.onBeforeCompile=shader=>{previous(shader);shader.uniforms.classicErosionMixer={value:classicErosionMixer(emitter)};shader.fragmentShader='uniform vec4 classicErosionMixer;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('texture2D(nativeErosion,vMapUv).r','dot(texture2D(nativeErosion,vMapUv),classicErosionMixer)');};
 material.customProgramCacheKey=()=>cache.call(material)+':classic-erosion-mixer';
}

export function classicPaletteMixer(emitter){const value=emitter.paletteDefinition?.palleteSrcMixColor?.constantValue;return Array.isArray(value)&&value.length===4?new THREE.Vector4(...value):new THREE.Vector4(1,0,0,0);}
