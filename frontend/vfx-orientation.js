import * as THREE from 'three';
const nativeMissileFrame=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
// Particle mesh emitter space differs from character/map space. Apply the full
// emitter frame BEFORE the authored mesh rotation, not an RX=90 special case.
// E.g. Ashe's authored arrow tip is -Z, while a rocket's nose is authored +Y.
export function particleMeshOrientation(angle,rotation,missile=false){
 const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle+(missile?Math.PI:0));
 if(missile)q.multiply(nativeMissileFrame);
 return q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation,'YXZ')));
}
