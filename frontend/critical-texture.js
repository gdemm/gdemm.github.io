import * as THREE from 'three';
// Preserve normal image content negotiation/CORS, but prioritize required controls.
export function loadCriticalTexture(url){return new Promise((resolve,reject)=>{
 const image=new Image();image.crossOrigin='anonymous';image.decoding='async';image.fetchPriority='high';
 image.onload=()=>{const texture=new THREE.Texture(image);texture.needsUpdate=true;resolve(texture);};
 image.onerror=()=>reject(new Error('必要指示器贴图加载失败：'+url));image.src=url;
});}
