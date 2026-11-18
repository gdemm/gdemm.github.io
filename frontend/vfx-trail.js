import * as THREE from 'three';
// Ribbon vertices follow sampled emitter positions, never a camera-facing texture card.
export class ParticleRibbon{
 constructor(cameraFacing=true){this.cameraFacing=cameraFacing;this.points=[];this.geometry=new THREE.BufferGeometry();this.capacity=80;this.positions=new Float32Array(this.capacity*6*3);this.uv=new Float32Array(this.capacity*6*2);this.colors=new Float32Array(this.capacity*6*4);this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));this.geometry.setAttribute('uv',new THREE.BufferAttribute(this.uv,2).setUsage(THREE.DynamicDrawUsage));this.geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,4).setUsage(THREE.DynamicDrawUsage));this.geometry.setDrawRange(0,0);}
 update(position,time,life,width,emitting,colorAt,camera){
  const last=this.points.at(-1);if(emitting&&(!last||position.distanceTo(last.p)>1.5)){this.points.push({p:position.clone(),time});if(this.points.length>this.capacity)this.points.shift();}
  this.points=this.points.filter(p=>time-p.time<=life);let count=0,length=0;const cameraPosition=new THREE.Vector3();camera?.getWorldPosition(cameraPosition);cameraPosition.z*=-1;
  const sides=this.points.map((p,i)=>{const before=this.points[Math.max(0,i-1)].p,after=this.points[Math.min(this.points.length-1,i+1)].p,tangent=after.clone().sub(before).normalize();let side=this.cameraFacing&&camera?tangent.clone().cross(cameraPosition.clone().sub(p.p).normalize()):new THREE.Vector3(-tangent.z,0,tangent.x);if(side.lengthSq()<1e-8)side.set(1,0,0);side.normalize().multiplyScalar(width*.5);return side;});
  for(let i=1;i<this.points.length;i++){const a=this.points[i-1],b=this.points[i],u0=length/Math.max(60,width*5);length+=a.p.distanceTo(b.p);const u1=length/Math.max(60,width*5);const ca=colorAt(Math.min(1,(time-a.time)/life)),cb=colorAt(Math.min(1,(time-b.time)/life));
   for(const [p,side,sign,u,v,c]of [[a.p,sides[i-1],-1,u0,0,ca],[a.p,sides[i-1],1,u0,1,ca],[b.p,sides[i],1,u1,1,cb],[a.p,sides[i-1],-1,u0,0,ca],[b.p,sides[i],1,u1,1,cb],[b.p,sides[i],-1,u1,0,cb]]){const q=p.clone().addScaledVector(side,sign);this.positions.set(q.toArray(),count*3);this.uv.set([u,v],count*2);this.colors.set(c,count*4);count++;}}
  for(const attr of Object.values(this.geometry.attributes))attr.needsUpdate=true;this.geometry.setDrawRange(0,count);return this.points.length;
 }
}
