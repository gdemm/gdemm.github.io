import * as THREE from 'three';
const up=new THREE.Vector3(0,1,0),cameraPosition=new THREE.Vector3();
// Requiem's native Faces_Beam layers are root-anchored rays, not arbitrary
// quads. Keep their length on world Y; yaw toward the camera without pitching
// them onto the ground. Ground spotlight/helix/other champions are untouched.
export function placeKarthusRequiemRay(p,owner,scale){
 if(!/^Karthus_Base_R_Target(?:_Green)?$/.test(p.instance.name)||
    !/^Faces_Beam(?:_Dark)?$/.test(p.e.emitterName)||
    p.e.primitive?.__type!=='VfxPrimitiveRay')return false;
 const length=Math.abs(scale[1]);let yaw=0;
 if(owner.camera){owner.camera.getWorldPosition(cameraPosition);owner.world.worldToLocal(cameraPosition);yaw=Math.atan2(cameraPosition.x-p.object.position.x,cameraPosition.z-p.object.position.z);}
 p.object.quaternion.setFromAxisAngle(up,yaw);
 p.object.position.y+=length/2;
 // Retain authored texture mirroring, but a zero source Z scale cannot erase a ray.
 p.object.scale.set(scale[0],length,1);
 return true;
}
