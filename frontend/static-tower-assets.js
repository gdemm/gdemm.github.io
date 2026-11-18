import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
export const STATIC_TOWER_NAMES=new Set(['Turret','RedTurret']);
export const TOWER_PICK_LAYER=31;
export class StaticTowerAssets {
 constructor(normalizeMaterial){this.normalizeMaterial=normalizeMaterial;this.templates=new Map();this.loading=null;}
 async load(){
  if(this.loading)return this.loading;
  this.loading=(async()=>{
   const compressed=typeof DecompressionStream==='function',url='assets/models/tower-kit-r20261001-1.glb'+(compressed?'.gz':'');const response=await fetch(url);if(!response.ok)throw Error('防御塔共享模型加载失败');let buffer=await response.arrayBuffer();const bytes=new Uint8Array(buffer);if(bytes[0]===31&&bytes[1]===139)buffer=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
   const gltf=await new GLTFLoader().parseAsync(buffer,''),meta=gltf.scene.userData.towerKit;const blue=gltf.scene.getObjectByName('TowerBodyBlue'),red=gltf.scene.getObjectByName('TowerBodyRed');if(meta?.version!==1||!blue?.isMesh||!red?.isMesh||blue.isSkinnedMesh||red.isSkinnedMesh)throw Error('防御塔共享模型资料无效');
   // The GLB references the same accessors for both native team materials.
   this.geometry=blue.geometry;this.geometry.computeBoundingBox();this.geometry.computeBoundingSphere();
   for(const[name,source]of [['Turret',blue],['RedTurret',red]]){
    const data=meta.variants[name];if(!data||!Array.isArray(data.sockets))throw Error('防御塔挂点资料无效');
    const texture=source.material.map;if(!texture)throw Error('防御塔阵营贴图缺失');const settings=data.map;
    for(const key of ['flipY','colorSpace','wrapS','wrapT','magFilter','minFilter','rotation'])texture[key]=settings[key];texture.offset.fromArray(settings.offset);texture.repeat.fromArray(settings.repeat);texture.center.fromArray(settings.center);texture.needsUpdate=true;
    const material=this.normalizeMaterial(source.material),scene=new THREE.Group();scene.name=data.sceneName;
    const body=new THREE.Mesh(this.geometry,material);body.name='TowerBodyStatic';body.userData.staticTowerBody=true;body.frustumCulled=false;scene.add(body);
    for(const socket of data.sockets){const node=new THREE.Object3D();node.name=socket.name;node.matrix.fromArray(socket.matrix);node.matrixAutoUpdate=false;scene.add(node);}
    this.templates.set(name,{scene,clips:[],scale:data.scale,skinScale:data.skinScale,nativeHeight:data.nativeHeight,nativeYMax:data.nativeYMax,boundRadius:data.boundRadius,baseY:data.baseY,staticTower:true,geometry:this.geometry,material});
   }
   return this;
  })().catch(error=>{this.loading=null;throw error;});return this.loading;
 }
 async template(name){await this.load();const template=this.templates.get(name);if(!template)throw Error('未知防御塔类型');return template;}
}
