import * as THREE from 'three';
// Child keys are resolved by the asset builder against native Skin0 resources.
export function childParticlePosition(host){
 const p=host.classicParentParticle;if(!p)return null;
 const pos=p.object.position,ground=p.base?.ground??0;
 return {x:pos.x,y:pos.y,z:pos.z,ground,baseHeight:pos.y-ground,angle:host.angle||0};
}
export function spawnClassicChildren(p,vfx,onDeath=false){
 const set=p.e.childParticleSetDefinition,names=p.e.childEffectNames;
 if(!set||!names?.length||!!set.childEmitOnDeath!==onDeath||vfx.classicResetting)return;
 const key=onDeath?'classicDeathChildrenStarted':'classicBirthChildrenStarted';if(p[key])return;p[key]=true;
 const ancestors=[...(p.instance.host.classicChildAncestors||[]),p.instance.name];
 for(const name of names){
  if(ancestors.includes(name)){vfx.classicChildCycleCount=(vfx.classicChildCycleCount||0)+1;continue;}
  const definition=vfx.data?.effects[name];if(!definition)continue;
  const duration=onDeath?Math.max(.01,...definition.emitters.map(e=>(e.timeBeforeFirstEmission||0)+(e.lifetime||1))):Math.max(.01,p.life-p.age);
  const host=Object.assign(vfx.host(0,0,p.instance.host.angle||0),{classicParentParticle:p,classicChildAncestors:ancestors,sampleBirth:true,seedParticles:true,height:0});
  const child=vfx.emit(name,host,duration);if(child&&!onDeath)(p.classicChildren??=[]).push(child);
 }
}
export function removeClassicChildren(p,vfx){
 for(const child of p.classicChildren||[])child.stopped=true;
 if(p.age>=p.life&&!vfx.classicResetting)spawnClassicChildren(p,vfx,true);
}

export function orientClassicChild(p){
 const parent=p.instance.host.classicParentParticle;if(!parent)return;
 // Child emitters inherit the parent particle frame, not its often-zero sprite size.
 p.classicChildBirthFrame??={position:parent.object.position.clone(),quaternion:parent.object.quaternion.clone()};
 const basis=p.bound?parent.object:p.classicChildBirthFrame;
 const undoYaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-(p.instance.host.angle||0));
 const frame=basis.quaternion.clone().multiply(undoYaw);
 p.object.position.sub(basis.position).applyQuaternion(frame).add(basis.position);
 p.object.quaternion.premultiply(frame);
}

// Some native emitters intentionally have no artwork: they only move child systems.
const spawnerTexture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
spawnerTexture.needsUpdate=true;
export function classicParticleTexture(e,textures){return textures.get(e.textureUrl)||(e.childEffectNames?.length?spawnerTexture:null);}
export function hideLogicalSpawner(material,e,textures){if(!textures.has(e.textureUrl)&&e.childEffectNames?.length){material.visible=false;material.colorWrite=false;material.depthWrite=false;}}
