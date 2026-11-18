import * as THREE from 'three';
// GPU bodies batch by native team material. Each unit keeps its own proxy record.
export class TowerInstances {
 constructor(world){this.world=world;this.groups=new Map();this.inverseWorld=new THREE.Matrix4();this.matrix=new THREE.Matrix4();this.color=new THREE.Color();}
 group(name,template,capacity){
  let group=this.groups.get(name);if(group&&group.capacity>=capacity)return group;
  const size=Math.max(8,group?group.capacity*2:8,capacity);if(group){this.world.remove(group.mesh);group.mesh.dispose();}
  const mesh=new THREE.InstancedMesh(template.geometry,template.material,size);mesh.name='TowerInstances-'+name;mesh.frustumCulled=false;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,new THREE.Color(1,1,1));mesh.raycast=()=>{};mesh.userData.towerBatch=true;this.world.add(mesh);
  group={mesh,capacity:size,unitIds:[]};this.groups.set(name,group);return group;
 }
 update(records,templates){
  const buckets=new Map();for(const[id,record]of records){if(!record.instancedTower||!record.root.visible)continue;const list=buckets.get(record.name)||[];list.push([id,record]);buckets.set(record.name,list);}
  this.world.updateWorldMatrix(true,false);this.inverseWorld.copy(this.world.matrixWorld).invert();
  for(const[name,list]of buckets){const group=this.group(name,templates.get(name),list.length);let matricesChanged=false,colorsChanged=false;group.unitIds=[];
   for(let slot=0;slot<list.length;slot++){
    const[id,record]=list[slot];record.towerMesh.updateWorldMatrix(true,false);this.matrix.multiplyMatrices(this.inverseWorld,record.towerMesh.matrixWorld);
    const a=group.mesh.instanceMatrix.array,offset=slot*16;for(let i=0;i<16;i++)if(a[offset+i]!==Math.fround(this.matrix.elements[i])){matricesChanged=true;break;}
    if(matricesChanged)group.mesh.setMatrixAt(slot,this.matrix);
    this.color.copy(record.towerMesh.material.color);const colors=group.mesh.instanceColor.array,j=slot*3;if(colors[j]!==Math.fround(this.color.r)||colors[j+1]!==Math.fround(this.color.g)||colors[j+2]!==Math.fround(this.color.b)){group.mesh.setColorAt(slot,this.color);colorsChanged=true;}
    group.unitIds.push(id);
   }
   group.mesh.count=list.length;group.mesh.visible=true;if(matricesChanged)group.mesh.instanceMatrix.needsUpdate=true;if(colorsChanged)group.mesh.instanceColor.needsUpdate=true;
  }
  for(const[name,group]of this.groups)if(!buckets.has(name)){group.mesh.count=0;group.mesh.visible=false;group.unitIds=[];}
 }
 clear(){for(const group of this.groups.values()){group.mesh.count=0;group.mesh.visible=false;group.unitIds=[];}}
 dispose(){for(const group of this.groups.values()){this.world.remove(group.mesh);group.mesh.dispose();}this.groups.clear();}
}
