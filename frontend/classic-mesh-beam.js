import * as THREE from 'three';
// Native beam meshes are Y-up, with their authored length along Z.
export function placeNativeMeshBeam(p,host,scale){
 if(!p.beam||!p.geometry||!p.instance.host.nativeMeshBeam)return false;
 const length=p.instance.beamLength;
 if(!Number.isFinite(length)||length<=0){p.object.visible=false;return true;}
 if(!p.geometry.boundingBox)p.geometry.computeBoundingBox();const bounds=p.geometry.boundingBox,span=bounds.max.z-bounds.min.z;
 if(!(span>0))return false;
 const center=new THREE.Vector3();bounds.getCenter(center);
 p.object.scale.set(scale[0],scale[1],length/span);
 p.object.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),host.angle);
 const offset=center.multiply(p.object.scale).applyQuaternion(p.object.quaternion);
 p.object.position.set(host.x+Math.sin(host.angle)*length/2-offset.x,host.y-offset.y,host.z+Math.cos(host.angle)*length/2-offset.z);
 return true;
}
export function emitIreliaBeam(vfx,e,toNative){
 if(e.nativeName!=='Irelia_Base_E_Beam'||!Number.isFinite(e.nativeBeamEnd?.x)||!Number.isFinite(e.nativeBeamEnd?.y))return false;
 const a=toNative(e.x,e.y),b=toNative(e.nativeBeamEnd.x,e.nativeBeamEnd.y),length=Math.hypot(b.x-a.x,b.z-a.z);
 if(length>0)vfx.emit(e.nativeName,Object.assign(vfx.host(e.x,e.y,Math.atan2(b.x-a.x,b.z-a.z)),{height:0,sampleBirth:true,seedParticles:true,nativeMeshBeam:true}),e.nativeDuration||.65,length);
 return true;
}
