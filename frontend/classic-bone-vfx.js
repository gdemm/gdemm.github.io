import * as THREE from 'three';
export function applyClassicBoneFrame(p,vfx){
 const host=p.instance.host;if(!host.classicBoneFrame||!host.bone||p.attached)return;
 const record=vfx.owner.records.get(host.follow?.id),bone=record?.socketBones?.get(host.bone.toLowerCase());if(!bone)return;
 const matrix=new THREE.Matrix4().copy(vfx.owner.world.matrixWorld).invert().multiply(bone.matrixWorld);
 const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();matrix.decompose(position,rotation,scale);
 const undoYaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-(host.angle||0));
 p.object.position.sub(position).applyQuaternion(undoYaw).multiply(scale).applyQuaternion(rotation).add(position);
 p.object.quaternion.premultiply(rotation.clone().multiply(undoYaw));p.object.scale.multiply(scale);
}
