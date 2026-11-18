import * as THREE from 'three';
import {MOVE_INDICATOR,MOVE_INDICATOR_DURATION} from './move-indicator-data.js';
const number=(x,f=0)=>Number.parseFloat(x) || f;
const vector=(x,f=[0,0,0])=>typeof x==='string'?x.trim().split(/\s+/).map(Number):typeof x==='number'?[x,x,x]:f;
const radians=v=>v*Math.PI/180;
export {MOVE_INDICATOR_DURATION};
export class MoveIndicator{
 constructor(assets){this.root=new THREE.Group();this.parts=[];this.assets=assets;
  for(const[name,d]of Object.entries(MOVE_INDICATOR.groups)){
   const shadow=name.startsWith('cursor_shadow'),circle=name==='circle',geometry=shadow?assets.shadowGeometry.clone():circle?assets.ringGeometry:assets.geometry;
   const texture=(shadow?assets.black:circle?assets.line:assets.texture).clone();texture.wrapS=THREE.RepeatWrapping;texture.wrapT=(!shadow&&!circle)?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;texture.needsUpdate=true;
   const material=new THREE.MeshBasicMaterial({map:texture,color:circle?0x66ec20:0xffffff,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:circle?THREE.AdditiveBlending:THREE.NormalBlending,toneMapped:false});
   const object=new THREE.Mesh(geometry,material);object.frustumCulled=false;object.renderOrder=shadow?2000:2001;this.root.add(object);
   this.parts.push({name,d,shadow,circle,object,texture,base:shadow?assets.shadowGeometry.attributes.position.array:null,life:number(d['p-life'],.4)});
  }this.update(0);
 }
 update(age){age=Math.max(0,age);this.root.visible=age<MOVE_INDICATOR_DURATION;
  for(const p of this.parts){const {d,object,texture,life}=p,t=Math.min(1,age/life);object.visible=age<life;
   if(!object.visible)continue;
   const initial=vector(d['e-uvoffset'],[0,0]),rate=vector(d['p-uvscroll-rgb'],[0,0]);
   // SCB UVs were converted from top-origin V to bottom-origin V: scroll V changes sign too.
   texture.offset.set(initial[0]+rate[0]*age,-initial[1]-rate[1]*age-(!p.shadow&&!p.circle?1:0));
   if(p.shadow){
    const baseScale=vector(d['p-scale'],[1,1,1]),end=vector(d['p-xscale2'],[1,.7,0,0]).slice(1),scale=new THREE.Vector3(...baseScale.map((v,i)=>v*(1+(end[i]-1)*t)));
    const birth=vector(d['p-quadrot']),spin=vector(d['p-rotvel']),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...birth.map((v,i)=>radians(v+spin[i]*age)),'YXZ'));
    const parent=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),radians(number(d['e-rotation1']))),offset=vector(d['p-offset']),post=vector(d['p-postoffset']),velocity=vector(d['p-vel']),drag=vector(d['p-drag']),translation=new THREE.Vector3(...offset.map((v,i)=>v+post[i]+(drag[i]?velocity[i]*(1-Math.exp(-drag[i]*age))/drag[i]:velocity[i]*age)));
    const positions=object.geometry.attributes.position,point=new THREE.Vector3();for(let i=0;i<positions.count;i++){point.fromArray(p.base,i*3).multiply(scale).applyQuaternion(q).add(translation).applyQuaternion(parent);positions.setXYZ(i,point.x,.5,point.z);}positions.needsUpdate=true;object.material.opacity=.32*(1-t);
   }else{object.scale.set(...vector(d['p-scale'],[1,1,1]));const rotation=vector(d['p-quadrot']),spin=vector(d['p-rotvel']);object.quaternion.setFromEuler(new THREE.Euler(...rotation.map((v,i)=>radians(v+spin[i]*age)),'YXZ'));object.position.set(0,p.circle?1:2,0);object.material.opacity=1;}
  }
 }
 dispose(){for(const p of this.parts){p.object.material.dispose();p.texture.dispose();if(p.shadow)p.object.geometry.dispose();}this.root.removeFromParent();}
}
