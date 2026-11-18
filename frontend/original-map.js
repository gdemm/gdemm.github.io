import {brightenMapMaterial} from './map-brightness.js';
import {mergeStaticMap} from './map-merge.js';
import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {MAP_CONFIG} from './map-config.js';
export {MAP_CONFIG};
export const HEIGHT_UNIT=1.8;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function gameToNative(x,y){const [ux,uz]=MAP_CONFIG.direction,s=MAP_CONFIG.scale,o=MAP_CONFIG.origin;return {x:o[0]+(x*ux-y*uz)*s,z:o[2]+(x*uz+y*ux)*s};}
export function nativeToGame(x,z){const [ux,uz]=MAP_CONFIG.direction,s=MAP_CONFIG.scale,o=MAP_CONFIG.origin;let dx=x-o[0],dz=z-o[2];return {x:(dx*ux+dz*uz)/s,y:(-dx*uz+dz*ux)/s};}
export function createOriginalGrassMaterial(texture,definition){
 // Wall_of_Grass uses its own NO_BAKED_LIGHTING shader. The exporter left
 // an empty metallic PBR material, which is black in this unlit map scene.
 texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 const material=new THREE.MeshBasicMaterial({
  name:definition.name,map:texture,color:new THREE.Color().fromArray(definition.tint),
  opacity:definition.tint[3]??1,/* perf: the shipped ha-brush texture is 100% opaque (alpha=255 on every texel) and the tint is opaque, so alpha blending only forced this large wall into the sorted transparent pass and paid full-screen overdraw. Opaque keeps early-z and is pixel-identical. */transparent:false,side:THREE.DoubleSide,
  depthWrite:true,forceSinglePass:true,fog:definition.fog,toneMapped:false,
  // COLOR_0 on this special mesh contains grass-control data, including
  // black roots and alpha 1/255. It must not darken/fade the diffuse texture.
  vertexColors:false,
 });
 material.userData.originalSource=definition.source;return material;
}
export class OriginalNavigation {
 constructor(buffer){const n=MAP_CONFIG.navigation;Object.assign(this,n);this.count=n.columns*n.rows;this.heights=new Float32Array(buffer,0,this.count);this.flags=new Uint16Array(buffer,this.count*4,this.count);}
 index(x,z){const ix=Math.floor((x-this.minX)/this.cellSize),iz=Math.floor((z-this.minZ)/this.cellSize);return ix<0||iz<0||ix>=this.columns||iz>=this.rows?-1:iz*this.columns+ix;}
 canWalk(x,y){let p=gameToNative(x,y),i=this.index(p.x,p.z);return i>=0&&!(this.flags[i]&2);}
 height(x,y){let p=gameToNative(x,y),i=this.index(p.x,p.z);if(i<0)return -180;const h=this.heights[i];return Number.isFinite(h)&&h!==0?h:-180;}
 snap(x,y){if(this.canWalk(x,y))return {x,y};for(let radius=4;radius<=340;radius+=5){for(let a=0;a<16;a++){let xx=x+Math.cos(a*Math.PI/8)*radius,yy=y+Math.sin(a*Math.PI/8)*radius;if(xx>=5&&xx<=3195&&this.canWalk(xx,yy))return {x:xx,y:yy};}}return {x:clamp(x,5,3195),y:0};}
}
async function bufferFor(url){const r=await fetch(url);if(!r.ok)throw new Error('Map resource unavailable');const b=await r.arrayBuffer();const bytes=new Uint8Array(b);if(bytes[0]===31&&bytes[1]===139){return new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}return b;}
export class OriginalMap {
 constructor(onStatus){this.ready=false;this.onStatus=onStatus;this.camera=new THREE.PerspectiveCamera(40,1,5,90000);this.ray=new THREE.Raycaster();this.groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),180);this.decorations=[];this.relicSprites=[];this.time=0;this.w=1280;this.h=720;this.cameraZoom=1;}
 async load(parent){
  this.onStatus('正在载入嚎哭深渊地图…',false);
  const base=new URL('assets/map/',document.baseURI).href;
  const [json,nav,grassDefinition]=await Promise.all([fetch(base+'map12-fast.gltf').then(r=>{if(!r.ok)throw new Error('Map manifest unavailable');return r.json();}),bufferFor(base+'navigation.bin'),fetch(base+'grass-material.json?v=grass-1').then(r=>{if(!r.ok)throw new Error('Grass material unavailable');return r.json();})]);
  this.navigation=new OriginalNavigation(nav);globalThis.AramLoadProgress?.progress('map',5,100);let completed=0;const urls=[];
  try{
   await Promise.all(json.buffers.map(async def=>{const compressed=typeof DecompressionStream==='function';const b=await bufferFor(base+def.uri+(compressed?'.gz':''));const url=URL.createObjectURL(new Blob([b]));urls.push(url);def.uri=url;completed++;globalThis.AramLoadProgress?.progress('map',5+70*completed/Math.max(1,json.buffers.length),100);this.onStatus(`正在读取地图几何 ${completed} / ${json.buffers.length}`,false);}));
   const loader=new GLTFLoader();const gltf=await loader.parseAsync(JSON.stringify(json),base);
   // League's UV1 baked lightmaps are represented as emissive textures in lol2gltf.
   // Restore their original multiplication on the unlit diffuse map.
   const lights=await Promise.all(json.materials.map(async mat=>{if(!mat.emissiveTexture)return null;const target={};await gltf.parser.assignTexture(target,'lightMap',mat.emissiveTexture,THREE.NoColorSpace);return target.lightMap;}));
   const grassTexture=await new THREE.TextureLoader().loadAsync(base+grassDefinition.texture);
   const grassMaterial=createOriginalGrassMaterial(grassTexture,grassDefinition);
   gltf.scene.traverse(object=>{
    if(!object.isMesh)return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    const restored=materials.map(material=>{
     if(material.name===grassDefinition.name)return grassMaterial;
     const assoc=gltf.parser.associations.get(material);if(assoc?.materials!==undefined&&lights[assoc.materials]){material.lightMap=lights[assoc.materials];material.lightMapIntensity=2;material.needsUpdate=true;}/* perf: back-face culling like the original engine; DoubleSide rasterized every hidden back face (~+30% fps in tests, pixel-identical) */material.side=material.lightMap?THREE.FrontSide:THREE.DoubleSide;/* the camera looks at the ground at a steep angle: without anisotropic filtering the floor smears into mush */if(material.map)material.map.anisotropy=matchMedia('(pointer:coarse)').matches?2:8;return material;
    });
    restored.forEach(brightenMapMaterial);object.material=Array.isArray(object.material)?restored:restored[0];
    object.frustumCulled=true;
   });
   try{this.mergeStats=/[?&]nomerge/.test(location.search)?{skipped:true}:mergeStaticMap(gltf.scene,grassMaterial);}catch(e){this.mergeStats={error:String(e)};console.warn('map merge skipped',e);}globalThis.__mapMerge=this.mergeStats;
   this.terrain=gltf.scene;parent.add(gltf.scene);
   const glow=await new THREE.TextureLoader().loadAsync(base+'health-relic-glow.png');glow.colorSpace=THREE.SRGBColorSpace;
   for(const relic of MAP_CONFIG.relics){const p=gameToNative(relic.x,relic.y);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0x70ffd0,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));sprite.position.set(p.x,this.navigation.height(relic.x,relic.y)+60,p.z);sprite.scale.set(200,150,1);parent.add(sprite);this.relicSprites.push(sprite);}
   this.ready=true;globalThis.AramLoadProgress?.progress('map',1,1);
  }finally{for(const url of urls)URL.revokeObjectURL(url);}
 }
 setupDecorations(owner){
  for(const item of MAP_CONFIG.decorations){const record=owner.create(item.model);if(!record)continue;record.model.scale.setScalar(owner.templates.get(item.model).skinScale);record.model.position.y=0;record.root.matrixAutoUpdate=false;record.root.matrix.fromArray(item.transform.flat());record.decoration=item;record.shopkeeper=['Viking','Hermit'].includes(item.model);record.root.traverse(node=>{if(node.isMesh){node.material=Array.isArray(node.material)?node.material.map(m=>brightenMapMaterial(m.clone())):brightenMapMaterial(node.material.clone());}node.userData.decorationRecord=record;node.userData.shopkeeper=record.shopkeeper;});owner.world.add(record.root);owner.play(record,'idle',0);this.decorations.push(record);}
 }
 updateCamera({w,h,cam,zoom=1},overview=false){
  this.w=w;this.h=h;this.cameraZoom=zoom;
  const p=gameToNative(cam.x,cam.y),ground=this.navigation?this.navigation.height(cam.x,cam.y):-180;
  const height=(overview?5200:MAP_CONFIG.camera.height)/zoom;
  this.camera.aspect=w/h;this.camera.fov=MAP_CONFIG.camera.fov;
  this.camera.position.set(p.x,ground+height,-p.z+height/Math.tan(MAP_CONFIG.camera.pitch*Math.PI/180));
  this.camera.lookAt(p.x,ground,-p.z);
  this.camera.setViewOffset(w,h,0,h*.05,w,h);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);
 }
 project(x,y,height=0){const p=gameToNative(x,y),v=new THREE.Vector3(p.x,(this.navigation?.height(x,y)||-180)+height*HEIGHT_UNIT,-p.z).project(this.camera);return {x:(v.x+1)*this.w/2,y:(1-v.y)*this.h/2,depth:v.z};}
 unproject(x,y){this.ray.setFromCamera(new THREE.Vector2(x/this.w*2-1,1-y/this.h*2),this.camera);let point=new THREE.Vector3();this.groundPlane.constant=180;if(!this.ray.ray.intersectPlane(this.groundPlane,point))return {x:1600,y:0};let p=nativeToGame(point.x,-point.z);this.groundPlane.constant=-(this.navigation?.height(p.x,p.y)||-180);this.ray.ray.intersectPlane(this.groundPlane,point);return nativeToGame(point.x,-point.z);}
 gameScale(x,y){let a=this.project(x,y,0),b=this.project(x+1,y,0);return Math.hypot(a.x-b.x,a.y-b.y);}
 update(dt,game){this.time+=dt;for(const record of this.decorations)record.mixer.update(dt);this.relicSprites.forEach((sprite,i)=>{sprite.visible=!this.nativeHealthRelics&&(!game||game.time>=(game.relics[i]?.ready||0));sprite.material.opacity=.62+Math.sin(this.time*2+i)*.18;});}
}
