import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
// Draw-call reduction for the static map: ~390 lightmapped pieces, each with its own material
// only because the lightmap atlas offset differs. Bake that offset into uv1, then merge pieces
// that share diffuse + lightmap atlas + alpha settings, split into a coarse grid so frustum
// culling still drops off-screen chunks. Visual result is identical.
const GRID=4;
export function mergeStaticMap(root,skipMaterial){
 root.updateMatrixWorld(true);
 const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),rel=new THREE.Matrix4(),box=new THREE.Box3(),c=new THREE.Vector3(),uv=new THREE.Vector2();
 const cand=[];const all=new THREE.Box3();
 root.traverse(o=>{
  if(!o.isMesh||o.isSkinnedMesh||Array.isArray(o.material))return;const m=o.material,g=o.geometry;
  if(m===skipMaterial||!m.isMeshBasicMaterial||!m.map||!m.lightMap||!g.index||!g.attributes.uv||!g.attributes.uv1||g.morphAttributes?.position)return;
  box.setFromObject(o);all.union(box);cand.push(o);
 });
 if(cand.length<2)return {before:cand.length,after:cand.length};
 const size=all.getSize(new THREE.Vector3()),groups=new Map();
 for(const o of cand){
  const m=o.material;box.setFromObject(o).getCenter(c);
  const gx=Math.min(GRID-1,Math.max(0,Math.floor((c.x-all.min.x)/Math.max(1,size.x)*GRID))),gz=Math.min(GRID-1,Math.max(0,Math.floor((c.z-all.min.z)/Math.max(1,size.z)*GRID)));
  const key=[m.map.source.uuid,m.map.wrapS,m.map.wrapT,m.lightMap.source.uuid,m.lightMap.wrapS,m.lightMap.wrapT,m.lightMapIntensity,m.alphaTest,m.transparent,m.opacity,m.color.getHex(),m.side,m.vertexColors,m.depthWrite,m.customProgramCacheKey(),gx,gz].join('|');
  let list=groups.get(key);if(!list)groups.set(key,list=[]);list.push(o);
 }
 let after=0;const dispose=new Set();
 for(const list of groups.values()){
  if(list.length===1){after++;continue;}
  const geos=list.map(o=>{
   const src=o.geometry,g=new THREE.BufferGeometry();
   g.setIndex(src.index.clone());g.setAttribute('position',src.attributes.position.clone());g.setAttribute('uv',src.attributes.uv.clone());
   const u1=src.attributes.uv1.clone();const lm=o.material.lightMap;lm.updateMatrix();
   for(let i=0;i<u1.count;i++){uv.set(u1.getX(i),u1.getY(i)).applyMatrix3(lm.matrix);u1.setXY(i,uv.x,uv.y);}
   g.setAttribute('uv1',u1);rel.multiplyMatrices(inv,o.matrixWorld);g.applyMatrix4(rel);return g;
  });
  const merged=mergeGeometries(geos,false);if(!merged){after+=list.length;continue;}
  for(const g of geos)g.dispose();merged.computeBoundingSphere();merged.computeBoundingBox();
  const base=list[0].material,mat=base.clone();const lm=base.lightMap.clone();lm.offset.set(0,0);lm.repeat.set(1,1);lm.rotation=0;lm.center.set(0,0);lm.matrixAutoUpdate=true;lm.updateMatrix();mat.lightMap=lm;
  // clone() drops the brightness/onBeforeCompile hook identity; copy it over explicitly
  mat.onBeforeCompile=base.onBeforeCompile;mat.customProgramCacheKey=base.customProgramCacheKey;mat.userData={...base.userData};mat.needsUpdate=true;
  const mesh=new THREE.Mesh(merged,mat);mesh.name='mapChunk';mesh.frustumCulled=true;mesh.matrixAutoUpdate=false;root.add(mesh);after++;
  for(const o of list){o.parent?.remove(o);dispose.add(o.geometry);}
 }
 for(const g of dispose)g.dispose();
 root.updateMatrixWorld(true);
 return {before:cand.length,after};
}
