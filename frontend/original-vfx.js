import {placeKarthusRequiemRay} from './karthus-requiem-ray.js';
import {KarthusPresentation,KARTHUS_MAPPING,karthusEffectName} from './karthus-presentation.js';
import {isDanceAction,withoutDance} from './dance-policy.js';
import {deferCosmetic} from './deferred-vfx.js';
import {VfxAssetPacks} from './vfx-asset-packs.js';
import {particleAssetsReady} from './classic-vfx-readiness.js';
import {GalioPresentation} from './galio-presentation.js';
import {classicAttackHit} from './classic-attack-hit.js';
import {applyClassicBoneFrame} from './classic-bone-vfx.js';
import {classicParticleLife} from './classic-particle-life.js';
import {classicParticleTexture,hideLogicalSpawner} from './classic-child-vfx.js';
import {orientClassicChild} from './classic-child-vfx.js';
import {childParticlePosition,spawnClassicChildren,removeClassicChildren} from './classic-child-vfx.js';
import {KaisaPresentation} from './kaisa-presentation.js';
import {configureClassicMultUV,updateClassicMultUV} from './classic-mult-uv.js';
import {integrateParticleRate,isClassicEffect} from './classic-vfx-integral.js';
import {placeClassicTether,applyTetherUV} from './classic-tether.js';
import {AatroxPresentation} from './aatrox-presentation.js';
import {placeNativeMeshBeam,emitIreliaBeam} from './classic-mesh-beam.js';
import {ClassicDistortion} from './classic-distortion.js';
import {IreliaPresentation} from './irelia-presentation.js';
import {FighterBuffPresentation} from './fighter-buff-presentation.js';
import {JarvanFlagPresentation} from './jarvan-flag-presentation.js';
import {JarvanWallPresentation} from './jarvan-wall-presentation.js';
import {DianaPresentation} from './diana-presentation.js';
import {MarksmanPresentation,MARKSMAN_MAPPING} from './marksman-presentation.js';
import {AkaliPresentation} from './akali-presentation.js';
import {ZedPresentation} from './zed-presentation.js';
import {MonkeyPresentation} from './monkey-presentation.js';
const DEV_VFX_HEROES=new Set(['Karthus',"Kaisa", "Mordekaiser", "LeeSin", "Yone", "Vayne", "Tristana", "Galio", "Ekko", "Riven", "Irelia", "Akali", "Diana", "Zed", "XinZhao", "JarvanIV", "Aatrox", "MonkeyKing"]);
import {configureAlphaSafety,isUnsupportedDistortion} from './vfx-alpha-safety.js';
import {configureClassicStencil} from './classic-vfx-stencil.js';
import {applyClassicUV} from './classic-vfx-uv.js';
import {configureClassicPalette} from './classic-vfx-material.js';
import {ClassicPresentation,PRIORITY_HEROES} from './classic-presentation.js';
import {JhinVfx} from './jhin-vfx.js';
import {cosmeticLimit,cosmeticEmitter} from './render-budget.js';
import {MissFortuneRainVfx} from './miss-fortune-rain-vfx.js';
import {linkSettWMasks,isSettWScorch,dragDisplacement} from './sett-w-vfx.js';
import {YasuoVfx} from './yasuo-presentation.js';
import {HealthRelicVfx} from './relic-vfx.js';
import * as THREE from 'three';
import {ProjectileVisuals,projectileEffect,unitAttackVfx} from './projectile-visuals.js';
import {particleBlend,configureParticleMaterial} from './vfx-material.js?v=lux-fx-multi-mythic-2';
import {ParticleRibbon} from './vfx-trail.js';
import {particleMeshOrientation} from './vfx-orientation.js?v=arrow-facing-2';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {clone as cloneSkeleton} from './vendor/SkeletonUtils.js';
import {gameToNative,nativeToGame,MAP_CONFIG} from './original-map.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const vec=(v,f=[0,0,0])=>Array.isArray(v)?v.map((x,i)=>Number.isFinite(x)?x:f[i]||0):f.slice();
export function curve(value,t,fallback=1){
 if(value==null)return fallback;
 if(typeof value==='number'||Array.isArray(value))return value;
 const d=value.dynamics;
 if(d?.times?.length&&d?.values?.length){let i=0;while(i<d.times.length-1&&t>d.times[i+1])i++;let a=d.values[i],b=d.values[Math.min(i+1,d.values.length-1)],u=clamp((t-d.times[i])/Math.max(.00001,(d.times[i+1]??d.times[i])-d.times[i]),0,1);if(Array.isArray(a))return a.map((v,k)=>v+((b?.[k]??v)-v)*u);if(Number.isFinite(a))return a+((b??a)-a)*u;}
 return value.constantValue??fallback;
}
// Native birth probability tables are multipliers, not the literal 1-degree
// and 1-unit placeholders stored in constantValue (notably Yasuo's wind wall).
export function sampleBirth(value,t,fallback,rng=Math.random){
 const base=curve(value,t,fallback),tables=value?.dynamics?.probabilityTables||[];
 const multiplier=table=>{if(!table?.keyValues?.length)return 1;const values=table.keyValues,times=table.keyTimes||values.map((_,i)=>i/Math.max(1,values.length-1)),u=rng();let i=0;while(i<times.length-2&&u>times[i+1])i++;const a=values[i],b=values[Math.min(i+1,values.length-1)],mix=clamp((u-times[i])/Math.max(1e-9,(times[i+1]??times[i])-times[i]),0,1);return a+(b-a)*mix;};
 return Array.isArray(base)?base.map((v,i)=>v*multiplier(tables[i])):typeof base==='number'?base*multiplier(tables[0]):base;
}
const single=new THREE.PlaneGeometry(1,1);
const VFX_MANIFEST_PATH='assets/vfx/manifests/';
const VFX_ASSET_KEYS=['distortionNormalUrl','nativePaletteUrl','textureUrl','meshUrl','skinnedMeshUrl','multUrl','erosionUrl','paletteUrl'];
const TRAP_HEROES=new Set(['Jinx','Teemo','Jhin']);
/* perf: particle pooling. Every spawn used to build a fresh material, so three.js re-ran getParameters/program lookup for each one (a top JS hotspot), and the per-variant texture keeper was made before the material configurators changed the texture's filter/wrap, so its cache key never matched and the GL texture was deleted and re-uploaded whenever an effect's last particle died. Now: keep one texture per final cache key, and reuse up to 6 finished particles (material+texture+object) per emitter+effect, restoring the state captured right after configuration. */
function particlePoolList(owner,e,name,billboard){const root=owner.particlePool??=new WeakMap();let byName=root.get(e);if(!byName)root.set(e,byName=new Map());const k=name+(billboard?'|b':'|m');let l=byName.get(k);if(!l)byName.set(k,l=[]);return l;}
function texKey(t){return [t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.anisotropy,t.format,t.type,t.generateMipmaps,t.premultiplyAlpha,t.flipY,t.colorSpace].join();}
function keepParticleTexture(owner,base,map){if(!map||!map.isTexture)return;const keep=owner.textureKeepers??=new Map();let byBase=keep.get(map.source);if(!byBase)keep.set(map.source,byBase=new Map());const k=texKey(map);if(byBase.has(k))return;const kt=map.clone();kt.version=map.version;byBase.set(k,kt);try{owner.owner.renderer?.initTexture(kt);}catch{}}
function snapPooledParticle(material,object){const m=material.map;return {map:m,offset:m?.offset?.clone(),repeat:m?.repeat?.clone(),center:m?.center?.clone(),rotation:m?.rotation??0,matrixAutoUpdate:m?.matrixAutoUpdate,opacity:material.opacity,transparent:material.transparent,visible:material.visible,mrot:material.rotation??0,ovisible:object.visible,renderOrder:object.renderOrder};}
function restorePooledParticle(p){const s=p.snap,m=p.material,t=s.map;if(t){m.map=t;if(s.offset)t.offset.copy(s.offset);if(s.repeat)t.repeat.copy(s.repeat);if(s.center)t.center.copy(s.center);t.rotation=s.rotation;if(s.matrixAutoUpdate!==undefined)t.matrixAutoUpdate=s.matrixAutoUpdate;t.updateMatrix?.();}m.opacity=s.opacity;m.transparent=s.transparent;m.visible=s.visible;if('rotation' in m)m.rotation=s.mrot;m.color?.setRGB(1,1,1);const o=p.object;o.visible=s.ovisible;o.position.set(0,0,0);o.quaternion.identity();o.scale.set(1,1,1);}
export function animatedParticle(template,material){const root=cloneSkeleton(template.scene),mixer=new THREE.AnimationMixer(root);root.traverse(o=>{if(o.isMesh){o.material=material;o.frustumCulled=false;}});const clip=template.animations[0];if(clip){const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();}return{root,mixer,dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);const skeletons=new Set();root.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const sk of skeletons)sk.dispose();}};}
function cameraBasis(owner){owner.camera.updateWorldMatrix?.(true,false);owner.world.updateWorldMatrix?.(true,false);const inverse=owner.world.matrixWorld.clone().invert(),right=new THREE.Vector3().setFromMatrixColumn(owner.camera.matrixWorld,0).transformDirection(inverse),up=new THREE.Vector3().setFromMatrixColumn(owner.camera.matrixWorld,1).transformDirection(inverse),forward=new THREE.Vector3().crossVectors(right,up).normalize();return new THREE.Matrix4().makeBasis(right,up,forward);}
const RELIC_PARTICLE_CAP=40;
export class OriginalVfx {
 constructor(owner,onStatus){this.assetPacks=new VfxAssetPacks();this.deferredLoads=new Map();this.owner=owner;this.onStatus=onStatus;this.ready=false;this.textures=new Map();this.meshes=new Map();this.animatedMeshes=new Map();this.loadedUrls=new Set();this.loadedHeroes=new Set();this.heroLoads=new Map();this.instances=[];this.particles=[];this.projectiles=new Map();this.projectileVisuals=new ProjectileVisuals();this.hitId=0;this.game=null;this.castCount=0;this.combatId=0;this.traps=new Map();this.windwalls=new Map();this.spinEffects=new Map();this.karthus=new KarthusPresentation(this,gameToNative);this.healthRelics=new HealthRelicVfx(this);this.yasuo=new YasuoVfx(this);this.classic=new ClassicPresentation(this,gameToNative);this.monkey=new MonkeyPresentation(this,gameToNative);this.zed=new ZedPresentation(this,gameToNative);this.akali=new AkaliPresentation(this,gameToNative);this.marksmen=new MarksmanPresentation(this);this.diana=new DianaPresentation(this);this.jarvanWall=new JarvanWallPresentation(this,gameToNative);this.jarvanFlag=new JarvanFlagPresentation(this.owner,gameToNative);this.fighterBuffs=new FighterBuffPresentation(this);this.irelia=new IreliaPresentation(this);this.aatrox=new AatroxPresentation(this);this.kaisa=new KaisaPresentation(this);this.galio=new GalioPresentation(this);this.distortion=new ClassicDistortion();}
 async readManifest(name){if(name==='Karthus'){const r=await fetch('assets/vfx/karthus-20261002/Karthus/manifest.json');if(!r.ok)throw Error('Karthus VFX unavailable');return withoutDance(await r.json());}if(name==='common'){const r=await fetch('assets/vfx/common-pack-r20260930-1/common.json');if(!r.ok)throw new Error('公共特效清单加载失败');const part=withoutDance(await r.json());this.assetPacks.register(part);return part;}if(DEV_VFX_HEROES.has(name)){const r=await fetch('assets/vfx/packs-r20260930-2/'+name+'.json');if(!r.ok)throw new Error('Classic VFX unavailable: '+name);const part=withoutDance(await r.json());this.assetPacks.register(part);return part;}const base=new URL(VFX_MANIFEST_PATH,document.baseURI).href,r=await fetch(base+encodeURIComponent(name)+'.json');if(!r.ok)throw new Error(`技能特效清单不可用：${name}`);return withoutDance(await r.json());}
 async load(heroNames=[]){
  if(!this.initialLoad)this.initialLoad=(async()=>{
   this.onStatus('正在读取本局技能特效清单',false);
   this.data=await this.readManifest('common');for(const name of DEV_VFX_HEROES)this.data.mapping[name]={};Object.assign(this.data.mapping,MARKSMAN_MAPPING);this.data.mapping.Karthus=KARTHUS_MAPPING;
   const heroes=[...new Set(heroNames)].filter(name=>this.data.mapping[name]);
   const fragments=await Promise.all(heroes.map(name=>this.readManifest(name)));
   this.data.heroEffectKeys??={};for(let i=0;i<fragments.length;i++){const part=fragments[i];Object.assign(this.data.effects,part.effects);this.data.heroEffectKeys[heroes[i]]=part.effectKeys||{};}
   linkSettWMasks(this.data);
   await this.loadEffectAssets(Object.values(this.data.effects).filter(f=>!f.deferredNonCombat),heroes.some(name=>TRAP_HEROES.has(name)));
   for(const name of heroes)this.loadedHeroes.add(name);
   this.ready=true;
  })();
  await this.initialLoad;
  await this.ensureHeroes(heroNames);
 }
 async ensureHeroes(heroNames=[]){
  if(!this.ready)return;
  const pending=[...new Set(heroNames)].filter(name=>this.data.mapping[name]&&!this.loadedHeroes.has(name));
  this.heroLoadTail??=Promise.resolve();
  for(const name of pending)if(!this.heroLoads.has(name)){
   const task=this.heroLoadTail.then(async()=>{
    const part=await this.readManifest(name);
    Object.assign(this.data.effects,part.effects);this.data.heroEffectKeys??={};this.data.heroEffectKeys[name]=part.effectKeys||{};linkSettWMasks(this.data);
    await this.loadEffectAssets(Object.values(part.effects).filter(f=>!f.deferredNonCombat),TRAP_HEROES.has(name));
    this.loadedHeroes.add(name);
   });
   this.heroLoads.set(name,task);this.heroLoadTail=task.catch(()=>{});
  }
  await Promise.all(pending.map(name=>this.heroLoads.get(name)));
 }
 async loadTrapModel(){this.trapLoading??=new GLTFLoader().loadAsync('assets/vfx/jinxmine.glb').then(gltf=>{this.trapTemplate=gltf;});return this.trapLoading;}
 async loadEffectAssets(effects,trap=false){
  const urls=new Set();for(const fx of effects)for(const e of fx.emitters)for(const key of VFX_ASSET_KEYS)if(e[key])urls.add(e[key]);
  const queue=[...urls].filter(url=>!this.loadedUrls.has(url)),needTrap=trap&&!this.trapTemplate,total=queue.length+(needTrap?1:0);let count=0;
  if(!total){globalThis.AramLoadProgress?.progress('vfx',1,1);return;}
  const loader=new THREE.TextureLoader(),worker=async()=>{while(queue.length){const url=queue.shift(),resource=await this.assetPacks.acquire(url,url.includes("/classic-17/")?url+"?v=r20260930-classic17-live-1":url),requestUrl=resource.url;try{if(url.endsWith('.png')){const texture=await loader.loadAsync(requestUrl);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;this.textures.set(url,texture);}else if(url.endsWith('.glb')){this.animatedMeshes.set(url,await new GLTFLoader().loadAsync(requestUrl));}else{const result=await fetch(requestUrl);if(!result.ok)throw new Error('Native particle mesh unavailable');const data=await result.json(),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.position,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));if(data.color)g.setAttribute('color',new THREE.Float32BufferAttribute(data.color,4));g.computeVertexNormals();this.meshes.set(url,g);}this.loadedUrls.add(url);count++;globalThis.AramLoadProgress?.progress('vfx',count,total);if(count%5===0)this.onStatus(`正在载入本局技能特效 ${count} / ${total}`,false);}finally{resource.release();}}};
  await Promise.all([...Array.from({length:globalThis.__ARAM_MOBILE_SAFE__?2:6},worker),...(needTrap?[this.loadTrapModel().then(()=>{count++;globalThis.AramLoadProgress?.progress('vfx',count,total);})]:[])]);
  this.assetPacks.releaseConsumed(this.loadedUrls);globalThis.AramLoadProgress?.progress('vfx',1,1);
 }
 hasHero(name){return this.ready&&this.loadedHeroes.has(name);}
 reset(game){this.classicResetting=true;this.classic.reset();this.monkey.reset();this.zed.reset();this.akali.reset();this.marksmen.reset();this.diana.reset();this.jarvanWall.reset();this.jarvanFlag.reset();this.fighterBuffs.reset();this.irelia.reset();this.aatrox.reset();this.kaisa.reset();this.galio.reset();this.jhin?.reset();this.mfRain?.reset();this.yasuo.reset();this.healthRelics.reset();for(const p of this.traps.values()){this.owner.world.remove(p.root);p.mixer.stopAllAction();p.root.traverse(o=>{if(o.isMesh)o.material.dispose();});}this.traps.clear();this.windwalls.clear();this.spinEffects.clear();for(const p of this.particles)this.remove(p);this.particles=[];this.instances=[];this.projectiles.clear();this.projectileVisuals.reset();this.hitId=0;this.combatId=0;this.game=game;this.classicResetting=false;}
 host(x,y,angle=0,follow=null){return {x,y,angle,follow};}
 position(host){const childPosition=childParticlePosition(host);if(childPosition)return childPosition;const source=host.follow||host;const x=source.x,y=source.y,p=gameToNative(x,y),ground=Number.isFinite(host.worldY)?host.worldY:this.owner.map.navigation.height(x,y);let angle=host.angle;if(source.vx!==undefined){const [ux,uz]=MAP_CONFIG.direction;angle=Math.atan2(source.vx*ux-source.vy*uz,source.vx*uz+source.vy*ux);}const travelled=source.distance??(Number.isFinite(source.fromX)?Math.hypot(x-source.fromX,y-source.fromY):0),blend=host.socket?Math.max(0,1-travelled*MAP_CONFIG.scale/180):0;const bone=host.bone?this.owner.socketPosition?.(source,host.bone):null;if(bone)return{x:bone.x,y:bone.y,z:bone.z,baseHeight:bone.y-ground,ground,angle};return {x:p.x+(host.socket?.x||0)*blend,y:ground+(host.height??source.visualHeight??140)+(host.socket?.y||0)*blend,baseHeight:host.height??source.visualHeight??140,z:p.z+(host.socket?.z||0)*blend,ground,angle};}
 emit(name,host,duration=.8,beamLength=0){if(name==='ha_ap_turret_explosion')return;if(isDanceAction(name))return;if((/^(?:Mordekaiser|Yone|Ekko)_/i.test(name)||/^darius_base_/i.test(name)||name?.startsWith('Sett_Base_W_')||name?.startsWith('Sett_Base_E_')||name?.startsWith('ItemFX_')||name?.startsWith('SR_Pings_')||name==='Mastery_2_lv10')){host.sampleBirth=true;host.seedParticles=true;}const definition=this.data?.effects[name];if(!definition)return;if(deferCosmetic(this,name,definition,host,duration,beamLength))return;const instance={name,definition,host,duration,beamLength,age:0,stopped:false,emission:definition.emitters.map(()=>({time:0,once:false}))};this.instances.push(instance);return instance;}
 cast(game,unit,key,aim,from){if(!this.hasHero(unit.hero.id))return;if(this.game!==game)this.reset(game);const h=unit.hero.id,entry=this.data.mapping[h][key];if(!entry)return;const a=gameToNative(unit.x,unit.y),b=gameToNative(aim.x,aim.y),angle=Math.atan2(b.x-a.x,b.z-a.z);let host=this.host(unit.x,unit.y,angle,unit),duration=key==='w'?1.2:.8;
  if(h==='Garen'&&key==='e')duration=3;
  if(h==='Garen'&&key==='r'){host=this.host(aim.x,aim.y,angle);}
  if((key==='e'&&['Ashe','Lux','Jinx'].includes(h))){const d=Math.hypot(aim.x-from.x,aim.y-from.y)||1,r=Math.min(430,d);host=this.host(from.x+(aim.x-from.x)/d*r,clamp(from.y+(aim.y-from.y)/d*r,-210,210),angle);}
  if(entry[0])this.emit(entry[0],host,duration);
  if(h==='Lux'&&key==='r')this.emit('Lux_Base_R_mis_beam',this.host(from.x,from.y,angle),2.1,1300*MAP_CONFIG.scale);
  this.castCount++;
 }
 makeParticle(instance,e){if(!particleAssetsReady(e,this))return;if(e.disabled)return;if(isUnsupportedDistortion(e)&&!this.textures.has(e.distortionNormalUrl))return;
  const projectile=!!(instance.host.follow?.native||instance.host.follow?.basic||instance.host.seedParticles),essential=instance.host.relic&&/^healthIcon/.test(e.emitterName||'')||!instance.host.relic&&!instance.host.signal&&projectile&&(Number(curve(e.bindWeight,0,0))>.5||e.isSingleParticle);
  const cosmetic=cosmeticEmitter(e,instance.host);
  // health relics idle forever on the map: give them their own small pool so they never eat the skill-VFX budget
  const relicHost=!!instance.host.relic;if(relicHost&&!essential&&(this._relicInst?.get(instance)||0)>=RELIC_PARTICLE_CAP)return;
  if(this.particles.length-(relicHost?0:(this._relicN||0))>=(essential?520:cosmetic?(this.cosmeticBudget??480):480))return;
  if(cosmetic&&instance.host.follow?.hero&&this.owner.records?.get(instance.host.follow.id)?.root.visible===false)return;
  const isAttached=e.primitive?.__type==='VfxPrimitiveAttachedMesh';if(isAttached&&(!this.owner.createAttachedEffect||this.particles.filter(p=>p.attached).length>=24))return;
  const base=classicParticleTexture(e,this.textures);if(!base)return;if(e.primitive?.__type==='VfxPrimitiveMesh'&&!e.meshUrl&&!e.skinnedMeshUrl&&!e.childEffectNames?.length)return;
  const primitive=e.primitive?.__type||'VfxPrimitiveCameraQuad',beam=primitive==='VfxPrimitiveBeam',trail=primitive.includes('Trail'),ray=primitive==='VfxPrimitiveRay',ribbon=trail?new ParticleRibbon(primitive==='VfxPrimitiveCameraTrail'):null,geometry=ribbon?.geometry||(e.meshUrl?this.meshes.get(e.meshUrl):null);
  const texture=base.clone();if(e.uvScrollClamp)texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;if(e.skinnedMeshUrl)texture.flipY=false;/* perf: needsUpdate bumped the SHARED source version, re-uploading the image (and mipmaps) to the GPU on every particle spawn. Per-particle clones only need their own UV transform; the GPU texture is shared by source+params, so mark the clone ready without touching the source, and keep one never-disposed keeper per variant so the GL texture is not deleted/re-uploaded when particles die. */texture.version=1;
  const params={map:texture,color:0xffffff,opacity:1,...particleBlend(e.blendMode)};
  const animatedTemplate=!isAttached&&e.skinnedMeshUrl?this.animatedMeshes.get(e.skinnedMeshUrl):null;if(!isAttached&&e.skinnedMeshUrl&&!animatedTemplate)return;const billboard=!animatedTemplate&&!isAttached&&!geometry&&!beam&&!ray&&!e.isGroundLayer&&primitive!=='VfxPrimitiveArbitraryQuad';
  const poolable=!isAttached&&!animatedTemplate&&!ribbon,poolList=poolable?particlePoolList(this,e,instance.name,billboard):null,pooled=poolList?.pop()||null;
  const material=pooled?pooled.material:billboard?new THREE.SpriteMaterial(params):new THREE.MeshBasicMaterial({...params,vertexColors:trail||!!geometry?.getAttribute('color'),side:THREE.DoubleSide});
  const attached=isAttached?this.owner.createAttachedEffect(instance.host.follow,material,e.primitive?.mMesh?.mSubmeshesToDraw):null;if(isAttached&&!attached){material.dispose();texture.dispose();return;}if(attached){material.depthWrite=false;material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;}
  if(pooled)restorePooledParticle(pooled);const animated=animatedTemplate?animatedParticle(animatedTemplate,material):null;const object=pooled?pooled.object:animated?.root||attached?.root||(billboard?new THREE.Sprite(material):new THREE.Mesh(geometry||single,material));object.frustumCulled=false;object.renderOrder=/^(Mordekaiser|Yone|Ekko)_/i.test(instance.name)?(e.pass||0):Math.max(-100,Math.min(100,e.pass||0));
  if(!pooled){configureParticleMaterial(material,e,this.textures);configureAlphaSafety(material,e);configureClassicPalette(material,e,this.textures);configureClassicStencil(material,e,instance.name);this.distortion.configure(material,e,this.textures);configureClassicMultUV(material,e,this.textures,instance.name);hideLogicalSpawner(material,e,this.textures);keepParticleTexture(this,base,material.map);}
  const authored=!!instance.host.sampleBirth,born=(v,t,f)=>authored?sampleBirth(v,t,f):curve(v,t,f);
  const life=classicParticleLife(born(e.particleLifetime,0,1),instance.name,instance.host.relic&&/^healthIcon/.test(e.emitterName||'')?86400:16),host=this.position(instance.host),offset=vec(born(e.SpawnShape?.emitOffset,instance.age/Math.max(instance.duration,.001),[0,0,0])),emitter=vec(born(e.EmitterPosition,0,[0,0,0]));
  const random=authored?[]:e.birthVelocity?.dynamics?.probabilityTables||[];let velocity=vec(born(e.birthVelocity,0,[0,0,0]));velocity=velocity.map((v,i)=>{const table=random[i];if(!table?.keyValues?.length)return v;const min=Math.min(...table.keyValues),max=Math.max(...table.keyValues);return v*(min+Math.random()*(max-min));});
  const bound=!!attached||Number(curve(e.bindWeight,0,0))>.5;
  const p={object,animated,attached,material,texture:pooled?pooled.texture:texture,pool:poolList,snap:pooled?pooled.snap:(poolList?snapPooledParticle(material,object):null),instance,e,ribbon,clock:0,age:0,life,base:host,offset:offset.map((v,i)=>v+emitter[i]),velocity,scale:vec(born(e.birthScale0,0,[1,1,1]),[1,1,1]),rotation:vec(born(e.birthRotation0,0,[0,0,0])),spin:vec(born(e.birthRotationalVelocity0,0,[0,0,0])),birthColor:authored?vec(born(e.birthColor,0,[1,1,1,1]),[1,1,1,1]):null,bound,billboard,beam,geometry,missileBasis:instance.host.meshFrame==='world'?false:!ribbon&&!instance.beamLength&&(instance.host.meshFrame==='particle'||instance.host.follow?.native||instance.host.follow?.basic||/_mis(?:_|$)/i.test(instance.name)),seed:Math.random()};
  this.owner.world.add(object);this.particles.push(p);if(relicHost){this._relicN=(this._relicN||0)+1;this._relicInst?.set(instance,(this._relicInst.get(instance)||0)+1);}this.updateParticle(p,0);spawnClassicChildren(p,this);return p;
 }
 updateParticle(p,dt){
  p.clock+=dt;p.age+=dt;p.animated?.mixer.update(dt);if(p.ribbon){const host=this.position(p.instance.host),point=new THREE.Vector3(host.x,host.y,host.z),e=p.e,scale=vec(curve(e.birthScale0,0,[30,0,0]));const colorAt=t=>{const a=vec(curve(e.Color,t,[1,1,1,1]),[1,1,1,1]),b=p.birthColor||vec(curve(e.birthColor,.5,[1,1,1,1]),[1,1,1,1]);return [a[0]*b[0],a[1]*b[1],a[2]*b[2],(a[3]??1)*(b[3]??1)];};const points=p.ribbon.update(point,p.clock,p.life,Math.abs(scale[0]),!p.instance.stopped,colorAt,this.owner.camera);p.object.position.set(0,0,0);p.object.scale.set(1,1,1);p.material.color.setRGB(1,1,1);p.material.opacity=1;if(!p.instance.stopped||points)p.age=0;else p.age=p.life;return;}const t=clamp(p.age/p.life,0,1),e=p.e,host=p.bound?this.position(p.instance.host):p.base;
  const dynamic=vec(curve(e.scale0,t,[1,1,1]),[1,1,1]);let scale=p.scale.map((v,i)=>v*dynamic[i]);if(e.isUniformScale)scale=[scale[0],scale[0],scale[0]];if(p.instance.host.renderScale)scale=scale.map(v=>v*p.instance.host.renderScale);
  const color=vec(curve(e.Color,t,[1,1,1,1]),[1,1,1,1]),birth=p.birthColor||vec(curve(e.birthColor,0,[1,1,1,1]),[1,1,1,1]);p.material.color.setRGB(Math.max(0,color[0]*birth[0]),Math.max(0,color[1]*birth[1]),Math.max(0,color[2]*birth[2]));p.material.opacity=clamp((color[3]??1)*(birth[3]??1),0,1)*Math.min(1,(1-t)*10);
  const scorch=isSettWScorch(p),travel=scorch?dragDisplacement(p.velocity,vec(curve(e.birthDrag,0,[0,0,0])),p.age):p.velocity.map(v=>v*p.age),acc=vec(curve(e.worldAcceleration,t,[0,0,0])),offset=p.offset.map((v,i)=>v+travel[i]+acc[i]*p.age*p.age*.5),c=Math.cos(host.angle),s=Math.sin(host.angle);let px=host.x+offset[0]*c+offset[2]*s,pz=host.z-offset[0]*s+offset[2]*c,py=host.y+offset[1];if(e.isGroundLayer)py=Math.max(host.ground+2,py-(host.baseHeight??140));
  if(scorch&&e.isFollowingTerrain){const at=nativeToGame(px,pz);py=this.owner.map.navigation.height(at.x,at.y)+Math.max(2,offset[1]);}
  const facing=p.instance.host.cameraFacing&&this.owner.camera?(this.frameFacingBasis??=cameraBasis(this.owner)):null;if(facing){const local=new THREE.Vector3(offset[0],offset[1]-250,offset[2]).multiplyScalar(p.instance.host.renderScale||1).applyMatrix4(facing);px=host.x+local.x;py=host.y+local.y;pz=host.z+local.z;}if(p.attached)p.attached.update(scale);else{p.object.position.set(px,py,pz);
  // Ground quads already carry their 90-degree source rotation. Do not rotate twice.
  const rx=(p.rotation[0]+p.spin[0]*p.age)*Math.PI/180,ry=(p.rotation[1]+p.spin[1]*p.age)*Math.PI/180,rz=(p.rotation[2]+p.spin[2]*p.age)*Math.PI/180;
  if(p.billboard){p.material.rotation=rz;if(e.isDirectionOriented&&this.owner.camera){const a=new THREE.Vector3(host.x,host.y,-host.z).project(this.owner.camera),b=new THREE.Vector3(host.x+Math.sin(host.angle)*100,host.y,-host.z-Math.cos(host.angle)*100).project(this.owner.camera);p.material.rotation+=Math.atan2(b.y-a.y,(b.x-a.x)*(this.owner.map.w||1)/(this.owner.map.h||1))-Math.PI/2;}p.object.scale.set(clamp(Math.abs(scale[0]),.1,1800),clamp(Math.abs(scale[1]),.1,1800),1);}
  else if(e.isGroundLayer&&!p.geometry&&!p.beam){p.object.quaternion.setFromEuler(new THREE.Euler(Math.PI/2,host.angle+ry+rz,0,'YXZ'));p.object.scale.set(p.instance.host.preserveSignedScale?scale[0]:Math.abs(scale[0]),p.instance.host.preserveSignedScale?scale[1]:Math.abs(scale[1]),1);}
  else if(placeKarthusRequiemRay(p,this.owner,scale)){}
  else if(placeClassicTether(p,this,scale)){}
  else if(placeNativeMeshBeam(p,host,scale)){}
  else if(p.beam){const length=p.instance.beamLength||600,width=clamp(Math.abs(scale[0]),1,1200);p.object.position.set(host.x+Math.sin(host.angle)*length*.5,host.y,host.z+Math.cos(host.angle)*length*.5);p.object.quaternion.setFromEuler(new THREE.Euler(Math.PI/2,host.angle,0,'YXZ'));p.object.scale.set(width,length,1);}
  else{p.object.quaternion.copy(particleMeshOrientation(host.angle,[rx,ry,rz],!!p.missileBasis));if(facing)p.object.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(facing));p.object.scale.set(...scale.map(v=>clamp(v,-10000,10000)));}
  }
  let div=vec(e.texDiv,[1,1]),cols=Math.max(1,div[0]),rows=Math.max(1,div[1]),count=e.numFrames||cols*rows;let frame=((e.startFrame||0)+(e.isRandomStartFrame?Math.floor(p.seed*count):0)+Math.floor(p.age*Number(curve(e.birthFrameRate,0,e.frameRate||0))))%Math.max(1,count);const uv=vec(curve(e.birthUvScrollRate,t,[0,0]),[0,0]),off=vec(curve(e.birthUVOffset,0,[0,0]),[0,0]);p.texture.repeat.set(1/cols,1/rows);p.texture.offset.set((frame%cols)/cols+off[0]+uv[0]*p.age,1-1/rows-Math.floor(frame/cols)/rows+off[1]+uv[1]*p.age);
  applyClassicBoneFrame(p,this);orientClassicChild(p);applyClassicUV(p,curve,sampleBirth);updateClassicMultUV(p,curve,sampleBirth);applyTetherUV(p,curve);if(p.material.userData.nativeUniforms){const u=p.material.userData.nativeUniforms;u.nativeAge.value=t;u.nativeErosionDrive.value=Number(curve(e.alphaErosionDefinition?.erosionDriveCurve,t,0));const rate=vec(curve(e.textureMult?.birthUvScrollRateMult,t,[0,0]),[0,0]),integrated=vec(isClassicEffect(p.instance.name)?integrateParticleRate(e.textureMult?.ParticleIntegratedUvScrollMult,p.age,p.life,curve,[0,0]):curve(e.textureMult?.ParticleIntegratedUvScrollMult,t,[0,0]),[0,0]),birthOffset=vec(curve(e.textureMult?.birthUVOffsetMult,0,[0,0]),[0,0]),multScale=vec(curve(e.textureMult?.uvScaleMult,t,[1,1]),[1,1]);u.nativeMultScale.value.set(multScale[0],multScale[1]);u.nativeMultOffset.value.set(birthOffset[0]+rate[0]*p.age+integrated[0],birthOffset[1]+rate[1]*p.age+integrated[1]);}
 }
 remove(p){removeClassicChildren(p,this);this.owner.world.remove(p.object);p.attached?.dispose?.();p.animated?.dispose?.();/* perf: no material.dispose() here. Disposing the last particle using a shader program made three.js delete the GL program, so the next spawn of that effect recompiled it (stalls of tens of ms on phones). Dropped materials are GC'd via the renderer's WeakMap; programs stay cached. */if(p.pool&&p.pool.length<6&&!p.attached&&!p.animated){p.pool.push({material:p.material,texture:p.texture,object:p.object,snap:p.snap});if(p.ribbon)p.ribbon.geometry.dispose();return;}p.texture.dispose();if(p.ribbon)p.ribbon.geometry.dispose();}
 updateTrapModels(game,dt){if(!this.trapTemplate){if((game.zones||[]).some(z=>z.kind==='trap'))this.loadTrapModel().catch(error=>console.warn('陷阱模型加载失败',error));return;}const active=new Set();for(const zone of game.zones||[]){if(zone.kind!=='trap')continue;active.add(zone.id);let record=this.traps.get(zone.id);if(!record){const root=cloneSkeleton(this.trapTemplate.scene);root.scale.setScalar(1.100000023841858);root.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshBasicMaterial({map:o.material.map,color:0xffffff,alphaTest:.15,side:THREE.DoubleSide});o.frustumCulled=false;}});const mixer=new THREE.AnimationMixer(root),clip=this.trapTemplate.animations.find(a=>a.name==='idle');if(clip)mixer.clipAction(clip).play();record={root,mixer};this.traps.set(zone.id,record);this.owner.world.add(root);}const pos=gameToNative(zone.x,zone.y);record.root.position.set(pos.x,this.owner.map.navigation.height(zone.x,zone.y)+2,pos.z);record.mixer.update(dt);}for(const[id,r]of this.traps)if(!active.has(id)){r.mixer.stopAllAction();this.owner.world.remove(r.root);r.root.traverse(o=>{if(o.isMesh)o.material.dispose();});this.traps.delete(id);}}
 updateWindwallEffects(game){
  const active=new Set();for(const wall of game.zones||[]){if(wall.kind!=='windwall')continue;active.add(wall.id);let record=this.windwalls.get(wall.id);
   if(!record){const a=gameToNative(wall.x,wall.y),b=gameToNative(wall.x+wall.dir.x,wall.y+wall.dir.y),host=Object.assign(this.host(wall.x,wall.y,Math.atan2(b.x-a.x,b.z-a.z),wall),{height:wall.nativeHeight??100,meshFrame:'particle',sampleBirth:true,seedParticles:true});record=this.emit(wall.nativeEffect,host,Math.max(.01,wall.duration-wall.age));if(record)this.windwalls.set(wall.id,record);}
   if(record){record.host.follow=wall;record.duration=record.age+Math.max(0,wall.duration-wall.age);}
  }
  for(const[id,record]of this.windwalls)if(!active.has(id)){record.stopped=true;this.windwalls.delete(id);}
 }
 updateSpinEffects(game){
  const active=new Set();for(const zone of game.zones||[]){if(zone.kind!=='spin'||!zone.source.alive||zone.source.spin<=0)continue;active.add(zone.id);let instance=this.spinEffects.get(zone.id);if(!instance){instance=this.emit('Garen_Base_E_Spin',Object.assign(this.host(zone.source.x,zone.source.y,0,zone.source),{seedParticles:true}),Math.max(.01,zone.duration-zone.age));if(instance)this.spinEffects.set(zone.id,instance);}if(instance){instance.host.follow=zone.source;instance.duration=instance.age+Math.max(0,zone.duration-zone.age);}}
  for(const[id,i]of this.spinEffects)if(!active.has(id)){i.stopped=true;this.spinEffects.delete(id);}
 }
 update(game,dt){if(!this.ready)return;this._relicN=0;this._relicInst=new Map();for(const q of this.particles)if(q.instance?.host?.relic){this._relicN++;this._relicInst.set(q.instance,(this._relicInst.get(q.instance)||0)+1);}this.cosmeticBudget=cosmeticLimit((game.units||[]).filter(u=>u.hero&&u.alive).length);this.frameFacingBasis=null;if(this.game!==game)this.reset(game);this.healthRelics.update(game);this.yasuo.update(game);this.classic.update(game);this.monkey.update(game);this.zed.update(game,dt);this.akali.update(game);this.marksmen.update(game);this.diana.update(game);this.jarvanWall.update(game);this.jarvanFlag.update(game,dt);this.fighterBuffs.update(game);this.irelia.update(game);this.aatrox.update(game);this.kaisa.update(game);this.galio.update(game);this.mfRain??=new MissFortuneRainVfx(this);this.mfRain.update(game);this.jhin??=new JhinVfx(this);this.jhin.update(game);this.updateTrapModels(game,dt);this.updateWindwallEffects(game);this.updateSpinEffects(game);
  for(const event of game.combatEvents||[]){if(event.id<=this.combatId)continue;this.combatId=event.id;const h=event.hero,key=event.state,entry=this.data.mapping[h]?.[key],u=event.source;if(classicAttackHit(this,event)||this.akali.event(event,game)||this.zed.event(event,game)||this.monkey.event(event,game)||this.classic.event(event,game)||this.jhin.event(event,game))continue;
   if(h==='Summoner'){const names=this.data.summoners?.[key]||[];if(event.phase==='summonerBlink'){this.emit(names[0],Object.assign(this.host(event.from.x,event.from.y),{height:0}),.8);this.emit(names[1],Object.assign(this.host(event.to.x,event.to.y),{height:0}),.8);}else if(event.phase==='summonerHeal')this.emit(names[event.target===u?0:1]||names[0],Object.assign(this.host(event.x,event.y,0,event.target),{height:0}),1.5);continue;}
   if(event.phase==='cast'){
    if(h==='MissFortune'&&['w','e'].includes(key))continue;
    if(h==='MissFortune'&&key==='r'){const from=gameToNative(u.x,u.y),to=gameToNative(event.aim.x,event.aim.y),angle=Math.atan2(to.x-from.x,to.z-from.z);this.emit('MissFortune_Base_R_cas',this.host(u.x,u.y,angle,u),3);this.emit('MissFortune_Base_R_Indicator',Object.assign(this.host(u.x,u.y,angle,u),{height:0}),3);continue;}
    if((h==='Garen'&&key==='e')||(h==='Ashe'&&key==='e')||(h==='Jinx'&&['e','q'].includes(key))||(h==='Lux'&&key==='e'))continue;
    const from=gameToNative(u.x,u.y),to=gameToNative(event.aim?.x??u.x,event.aim?.y??u.y),angle=Math.atan2(to.x-from.x,to.z-from.z);
    if(h==='Yasuo'&&key==='e'){const a=gameToNative(event.from.x,event.from.y),b=gameToNative(event.dash?.to.x??event.aim.x,event.dash?.to.y??event.aim.y);this.yasuo.cast(event,game,Math.atan2(b.x-a.x,b.z-a.z));continue;}
    if(entry?.[0])this.emit(entry[0],this.host(h==='Garen'&&key==='r'?event.aim.x:u.x,h==='Garen'&&key==='r'?event.aim.y:u.y,angle,h==='Garen'&&key==='r'?null:u),h==='Garen'&&key==='e'?3:h==='Lux'&&key==='r'?2.3:h==='Lux'&&key==='q'?1.8:.8);
    if(h==='Sett'&&key==='e'&&entry?.[0])this.emit(entry[0],this.host(u.x,u.y,angle+Math.PI,u),.8);
    // Lux's beam system contains its own 0–0.8s warning layers and 1s-delayed
    // core. It must start at cast time, not when damage resolves at t=1s.
    if(h==='Lux'&&key==='r')this.emit('Lux_Base_R_mis_beam',this.host(event.from.x,event.from.y,angle),2.8,(event.length||1670)*MAP_CONFIG.scale);
   }else if(event.phase==='attackStart'&&entry?.[0])this.emit(entry[0],this.host(u.x,u.y,Math.atan2(Math.sin(u.facing)*MAP_CONFIG.direction[0]-Math.cos(u.facing)*MAP_CONFIG.direction[1],Math.sin(u.facing)*MAP_CONFIG.direction[1]+Math.cos(u.facing)*MAP_CONFIG.direction[0]),u),.35);
   else if(event.phase==='hit'&&u?.kind==='minion'&&u.caster){const d=unitAttackVfx(this.data,u),name=projectileEffect(this.data,{source:u,basic:true},2);if(name)this.emit(name,Object.assign(this.host(event.x,event.y),{height:d.height}),.45);}
   else if(event.phase==='beam'){/* Visual timeline already began with the cast event. */}
   else if(event.phase==='zoneStart'){if(event.zone.kind==='windwall'){continue;}let name=event.zone.kind==='lux'?'Lux_Base_E_tar_aoe_green':event.zone.kind==='trap'?'Jinx_Base_E_Mine_Ready_Green':event.zone.kind==='vision'?'Ashe_Base_E_tar_linger':null;if(name)this.emit(name,Object.assign(this.host(event.x,event.y),{height:0}),event.zone.duration);if(event.zone.kind==='trap')this.emit('Jinx_Base_E_Mine_Set',Object.assign(this.host(event.x,event.y),{height:0}),.7);}
   else if(event.phase==='zoneEnd'){const name=h==='Lux'?'Lux_Base_E_tar_nova':h==='Jinx'?'Jinx_Base_E_Mine_Explosion':'Ashe_Base_E_tar_explode';this.emit(name,Object.assign(this.host(event.x,event.y),{height:0}),.7);for(const i of this.instances)if(i.host.x===event.x&&i.host.y===event.y&&/aoe_green|Mine_Idle|Mine_Ready/.test(i.name))i.stopped=true;}
   else if(event.phase==='blink'&&entry?.[0])this.emit(entry[0],this.host(u.x,u.y),.8);
  }
  this.karthus.update(game);
  const active=new Set();for(const missile of this.projectileVisuals.collect(game,dt)){active.add(missile.id);const name=projectileEffect(this.data,missile),token=(missile.returning?'return:':'out:')+(name||'');if(this.projectiles.get(missile.id)===token)continue;for(const old of this.instances)if(old.host.follow===missile)old.stopped=true;this.projectiles.set(missile.id,token);if(name){const [ux,uz]=MAP_CONFIG.direction,angle=Math.atan2(missile.vx*ux-missile.vy*uz,missile.vx*uz+missile.vy*ux),unitFx=unitAttackVfx(this.data,missile.source);const host=this.host(missile.x,missile.y,angle,missile),socket=this.owner.socketPosition?.(missile.source,missile.startBone||unitFx?.startBone);if(unitFx)host.height=unitFx.height;if(name==='Yasuo_Base_Q_wind_mis'){host.meshFrame='world';host.sampleBirth=true;}if(socket){const origin=gameToNative(missile.source.x,missile.source.y),ground=this.owner.map.navigation.height(missile.source.x,missile.source.y);host.socket={x:socket.x-origin.x,y:socket.y-ground-(host.height??missile.visualHeight??140),z:socket.z-origin.z};}this.emit(name,host,missile.life);}}
  for(const id of this.projectiles.keys())if(!active.has(id)){for(const instance of this.instances)if(instance.host.follow?.id===id){instance.stopped=true;instance.host.follow.life=0;}this.projectiles.delete(id);}
  for(const effect of game.effects){if(effect.type!=='native'||effect.id<=this.hitId)continue;this.hitId=Math.max(this.hitId,effect.id);if(emitIreliaBeam(this,effect,gameToNative)||this.jhin.handlesEffect(effect))continue;const name=karthusEffectName(effect,game)||effect.nativeName||this.data.mapping[effect.hero]?.[effect.state||'attack']?.[2],duration=effect.nativeDuration||(/^Lux_Base_Q_tar$/i.test(name)?2.5:.65);if(name){const f=effect.facing,angle=f===undefined?0:Math.atan2(Math.sin(f)*MAP_CONFIG.direction[0]-Math.cos(f)*MAP_CONFIG.direction[1],Math.sin(f)*MAP_CONFIG.direction[1]+Math.cos(f)*MAP_CONFIG.direction[0]);const host=this.host(effect.x,effect.y,angle,effect.follow||null);if(effect.nativeGround)host.height=0;if(effect.nativeHeight!==undefined)host.height=effect.nativeHeight;if(effect.nativeBone)host.bone=effect.nativeBone;if(effect.itemState){host.itemState=effect.itemState;host.itemOwner=effect.itemOwner;host.heartsteelTarget=effect.heartsteelTarget;}if(effect.replaceKey)for(const old of this.instances)if(old.replaceKey===effect.replaceKey)old.stopped=true;const made=this.emit(name,host,duration);if(made&&effect.replaceKey)made.replaceKey=effect.replaceKey;}}
  for(const instance of this.instances){if(instance.host.follow?.hero?.id==='Jhin'&&instance.name==='Jhin_Base_R_ViewCone'&&!instance.host.follow.jhinChannel)instance.stopped=true;if(instance.host.follow&&['MissFortune_Base_R_cas','MissFortune_Base_R_Indicator'].includes(instance.name)&&!instance.host.follow.mfChannel)instance.stopped=true;const st=instance.host.itemState,owner=instance.host.itemOwner,follow=instance.host.follow;if(st&&((st!=='burn'&&!owner?.alive)||st==='spellblade'&&!(owner.itemEffects?.bladeUntil>game.time)||st==='stasis'&&!(owner.itemStasisUntil>game.time)||st==='heartsteel'&&!owner.heartsteelCharge?.[instance.host.heartsteelTarget]?.ready||st==='burn'&&!follow?.itemBurns?.some(d=>d.source===owner&&d.until>=game.time)))instance.stopped=true;instance.age+=dt;if(instance.host.follow?.life!==undefined&&instance.host.follow.life<=0)instance.stopped=true;if(instance.age>instance.duration)instance.stopped=true;
   if(instance.stopped)continue;
   instance.definition.emitters.forEach((e,i)=>{if(e.disabled)return;const state=instance.emission[i],delay=e.timeBeforeFirstEmission||0;if(instance.age<delay)return;const duration=e.lifetime,projectile=!!(instance.host.follow?.native||instance.host.follow?.basic||instance.host.seedParticles);if(duration&&(projectile?Math.max(0,instance.age-dt):instance.age)>duration)return;if(e.primitive?.__type?.includes('Trail')){if(!state.once)state.once=!!this.makeParticle(instance,e);}else if(e.isSingleParticle){if(!state.once){let made=false;for(let n=0;n<(e.legacyBurstCount||1);n++)made=!!this.makeParticle(instance,e)||made;state.once=made;}}else{const rate=clamp(Number(curve(e.rate,instance.age,8))||0,0,45)*(cosmeticEmitter(e,instance.host)?(this.cosmeticBudget??480)/480:1);if(projectile&&!state.started&&rate>0){state.started=!!this.makeParticle(instance,e);return;}state.time+=dt*rate;let births=Math.min(3,Math.floor(state.time));state.time-=births;while(births-->0)this.makeParticle(instance,e);}});
  }
  for(const p of this.particles){this.updateParticle(p,dt);if((p.life===Infinity||p.bound||p.instance.host.classicPersistent)&&p.instance.stopped)p.age=p.life;}
  this.particles=this.particles.filter(p=>{if(p.age>=p.life){this.remove(p);return false;}return true;});const liveInstances=new Set(this.particles.map(p=>p.instance));this.instances=this.instances.filter(i=>!i.stopped||liveInstances.has(i));
 }
}
