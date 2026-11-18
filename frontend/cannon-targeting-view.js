import * as THREE from 'three';
export class CannonTargetingView{
 constructor(world,toNative,height){this.world=world;this.toNative=toNative;this.height=height;this.parts=[];}
 async load(url){
  const keys=['aoe','circularrangeindicatorul'];
  const textures=await Promise.all(keys.map(k=>new THREE.TextureLoader().loadAsync(url(k))));
  this.textures=Object.fromEntries(keys.map((k,i)=>[k,textures[i]]));
  const make=key=>{const map=this.textures[key];map.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending}));mesh.visible=false;mesh.renderOrder=2001;this.world.add(mesh);this.parts.push(mesh);return mesh;};
  this.area=make('aoe');this.range=Array.from({length:4},()=>make('circularrangeindicatorul'));this.ready=true;
 }
 place(mesh,p,w,h,rotation=0){const n=this.toNative(p);mesh.position.set(n.x,this.height(p)+15,n.z);mesh.rotation.set(Math.PI/2,rotation,0,'YXZ');mesh.scale.set(w,h,1);mesh.visible=true;}
 update({active,source,target,range,radius,scale}){
  for(const p of this.parts)p.visible=false;
  if(!active||!this.ready)return;
  const valid=Math.hypot(target.x-source.x,target.y-source.y)<=range;
  this.place(this.area,target,radius*2*scale,radius*2*scale);
  this.area.material.opacity=valid?1:.35;
  const from=this.toNative(source),r=range*scale;
  for(let i=0;i<4;i++){const p=this.range[i],a=i*Math.PI/2;p.position.set(from.x+(Math.cos(a)-Math.sin(a))*r/2,this.height(source)+12,from.z+(-Math.sin(a)-Math.cos(a))*r/2);p.quaternion.setFromEuler(new THREE.Euler(Math.PI/2,a,0,'YXZ'));p.scale.set(r,r,1);p.visible=true;p.material.opacity=.45;}
  return valid;
 }
}
