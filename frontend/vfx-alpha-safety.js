import * as THREE from 'three';
export function isUnsupportedDistortion(e){
 // A solid-white placeholder is a refraction mask, not visible color artwork.
 return !!e.distortionDefinition?.normalMapTexture&&/(?:color[-_]?hold|common_white|\/white)\./i.test(e.texture||'');
}
export function configureAlphaSafety(material,e){
 const mesh=!!(e.meshUrl||e.skinnedMeshUrl||e.primitive?.__type?.includes('Mesh'));
 if(e.blendMode===3&&!mesh){
  // Flat particles need coverage and lifetime alpha; opaque writes expose the quad.
  material.transparent=true;material.depthWrite=false;material.blending=THREE.NormalBlending;
  material.alphaTest=Math.max(material.alphaTest||0,1/255);
 }
}
