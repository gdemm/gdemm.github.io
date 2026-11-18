import * as THREE from 'three';
export function placeClassicTether(p,vfx,scale){
 const anchor=p.instance.host.classicTetherAnchor;if(!p.beam||!anchor)return false;
 const def=p.e.primitive?.mBeam||{},sourceOffset=def.mLocalSpaceSourceOffset||[0,0,0],targetOffset=def.mLocalSpaceTargetOffset||[0,0,0];
 const start=vfx.position({...p.instance.host,height:sourceOffset[1]||0}),end=vfx.position({follow:anchor,height:targetOffset[1]||0});
 const a=new THREE.Vector3(start.x,start.y,start.z),b=new THREE.Vector3(end.x,end.y,end.z),direction=b.clone().sub(a),length=direction.length();
 p.tetherLength=length;if(length<.001){p.object.visible=false;return true;}p.object.visible=true;direction.divideScalar(length);
 const midpoint=a.clone().add(b).multiplyScalar(.5),view=vfx.owner.camera.position.clone().sub(midpoint),right=new THREE.Vector3().crossVectors(direction,view);
 if(right.lengthSq()<1e-8)right.crossVectors(direction,Math.abs(direction.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0));right.normalize();
 const normal=new THREE.Vector3().crossVectors(right,direction).normalize();p.object.position.copy(midpoint);p.object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,direction,normal));p.object.scale.set(Math.abs(scale[0]),length,1);return true;
}
export function applyTetherUV(p,curve){
 if(!p.instance.host.classicTetherAnchor||!p.beam)return;
 const tile=curve(p.e.primitive?.mBeam?.mBirthTilingSize,0,[0,0,0]);if(tile[1]>0&&p.tetherLength>0){p.texture.repeat.y*=p.tetherLength/tile[1];p.texture.updateMatrix();if(p.classicFlipMatrix)p.texture.matrix.multiply(p.classicFlipMatrix);}
}
