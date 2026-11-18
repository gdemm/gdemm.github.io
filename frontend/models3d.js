import {karthusSpirit,karthusModelState} from './karthus-ui.js';
import {StaticTowerAssets,STATIC_TOWER_NAMES,TOWER_PICK_LAYER} from './static-tower-assets.js';
import {TowerInstances} from './tower-instances.js';
import {isDanceAction,withoutDance} from './dance-policy.js';
import {ensureKaisaMatcap,createKaisaPistolMaterial} from './kaisa-pistol-material.js';
import {KAISA_PISTOL_PARAMS} from './kaisa-pistol-params.js';
import {createKaisaMembraneMaterial,updateKaisaMaterialTime} from './kaisa-membrane-material.js';
import {KAISA_MEMBRANE_PARAMS} from './kaisa-membrane-params.js';
import {classicModelState} from './classic-model-state.js';
import {ClassicScene} from './classic-scene.js';
import {CLASSIC_MODEL_SETTINGS} from './classic-model-settings.js';
import {animationStep} from './render-budget.js';
import {unitModelName,unitVisualModelName} from './model-identity.js';
import {itemStasis} from './item-effects.js';
import {championLift} from './extra-champions.js';
import {NativeTargeting} from './native-targeting.js?v=move-click-1';
import {OriginalVfx} from './original-vfx.js?v=shop-missiles-1';
import {OriginalMap,MAP_CONFIG,gameToNative,HEIGHT_UNIT} from './original-map.js?v=grass-1';
import * as THREE from 'three';
/* perf: three.js renders every transparent DoubleSide material in two passes (back, then front) and flips material.side with needsUpdate=true each time, bumping material.version twice per object per frame. That forced a full program lookup (getParameters + cache key) for ~800 draws a frame - the top JS hotspot - and doubled those draw calls. Our transparent double-sided things are flat quads/ribbons, so default every material to single pass. A material can opt back in with forceSinglePass=false explicitly after construction is NOT supported; set userData.twoPass=true instead. */
if(!Object.getOwnPropertyDescriptor(THREE.Material.prototype,'forceSinglePass'))Object.defineProperty(THREE.Material.prototype,'forceSinglePass',{configurable:true,get(){return !this.userData?.twoPass;},set(){}});
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { clone as cloneSkeleton } from './vendor/SkeletonUtils.js';

const MODEL_NAMES = ["Kaisa", "Mordekaiser", "LeeSin", "Yone", "Vayne", "Tristana", "Galio", "Ekko", "Riven", "Irelia", "Akali", "Diana", "Zed", "XinZhao", "JarvanIV", "Aatrox", "MonkeyKing"].concat(['Mordekaiser','Yone','Ekko','Jax','Teemo','MasterYi','Chogath','Sylas','Jhin','Tryndamere','MissFortune','BaronNashor','Malphite','RiftHerald','Ryze','DrMundo','ElderDragon','Yasuo','Sett','Ashe','Lux','Ahri','Ezreal','Garen','Jinx','Leona','Darius','Morgana','Veigar','BlueMelee','RedMelee','BlueCaster','RedCaster','Turret','Nexus','RedTurret','RedNexus','Inhibitor','RedInhibitor','BridgeStatue','Chain','Poro','LargePoro','Viking','Hermit']);
MODEL_NAMES.push('JarvanIVStandard','Karthus');
const WORLD_MODELS = ['BlueMelee','RedMelee','BlueCaster','RedCaster','Turret','Nexus','RedTurret','RedNexus','Inhibitor','RedInhibitor','BridgeStatue','Chain','Poro','LargePoro','Viking','Hermit'];
export const modelVisualScale=name=>name==='BaronNashor'?2:name==='ElderDragon'?5:1;
const HEIGHTS = {Karthus:110,Mordekaiser:135,Yone:115,Ekko:105,Jax:115,Teemo:75,MasterYi:113,Chogath:125,Sylas:118,Jhin:115,Tryndamere:120,MissFortune:108,BaronNashor:180,Malphite:125,RiftHerald:175,Ryze:106,DrMundo:125,ElderDragon:180,Yasuo:110,Sett:125,Ashe:101,Lux:103,Ahri:105,Ezreal:99,Garen:116,Jinx:108,Leona:112,Darius:116,Morgana:112,Veigar:84,BlueMelee:43,RedMelee:43,BlueCaster:44,RedCaster:44,Turret:174,Nexus:144};
const HIDDEN = /^(?:Stage\d|State[123]|Rubble|Broken\d|Destroyed|Tail_Large|wings_mid_open|wings_open|flower)$|rubble|destroyed/i;

function normalizeMaterial(material) {const pistol=createKaisaPistolMaterial(material,KAISA_PISTOL_PARAMS);if(pistol)return pistol;const native=createKaisaMembraneMaterial(material,KAISA_MEMBRANE_PARAMS);if(native)return native;
  return new THREE.MeshBasicMaterial({
    name: material.name, map: material.map,
    color: 0xffffff, side: THREE.DoubleSide,
    alphaTest: .18, depthWrite: true, transparent: false,
  });
}

export function attachedModelOverlay(record,material,submeshes){
 const root=new THREE.Group(),model=cloneSkeleton(record.model);root.add(model);const originals=[],copies=[];record.model.traverse(o=>originals.push(o));model.traverse(o=>{copies.push(o);if(o.isMesh){if(record.instancedTower)o.layers.set(0);o.material=material;o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false;}});
 return{root,dispose(){const skeletons=new Set();model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const sk of skeletons)sk.dispose();},update(scale=[1,1,1]){root.position.copy(record.root.position);root.quaternion.copy(record.root.quaternion);root.scale.copy(record.root.scale).multiply(new THREE.Vector3(...scale.map(v=>Math.max(0,Math.min(4,v)))));root.visible=record.root.visible;for(let i=0;i<copies.length;i++){copies[i].position.copy(originals[i].position);copies[i].quaternion.copy(originals[i].quaternion);copies[i].scale.copy(originals[i].scale);copies[i].visible=originals[i].visible&&(!originals[i].isMesh||!submeshes?.length||submeshes.some(n=>n.toLowerCase()===originals[i].material?.name?.toLowerCase()));if(originals[i].morphTargetInfluences)copies[i].morphTargetInfluences=[...originals[i].morphTargetInfluences];}root.updateMatrixWorld(true);}};
}
export class OriginalModelRenderer {
  constructor(previewCanvas, onStatus) {
    this.staticTowers=new StaticTowerAssets(normalizeMaterial);
    this.templates = new Map(); this.records = new Map(); this.ready = false;
    this.error = null; this.onStatus = onStatus; this.previewCanvas = previewCanvas;
    this.previewName = 'Ashe'; this.previewRecord = null; this.previewTime = 0;
    this.lastGame = null; this.size = {w:0,h:0,dpr:0};
    this.classicScene=new ClassicScene(this,gameToNative);this.modelLoads=new Map();this.modelQueue=[];this.activeModelLoads=0;
  }

  initialize() {
    if(this.renderer||this.error)return;
    try {
      /* perf: the battle scene always covers the viewport with an opaque sky colour, so an alpha:true canvas only forces the phone compositor to blend the whole WebGL surface with the page underneath every frame. Keep the canvas opaque. */
      this.renderer = new THREE.WebGLRenderer({alpha:false,antialias:!(typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches),stencil:true,powerPreference:'high-performance'});globalThis.__r3=this.renderer;
      this.renderer.localClippingEnabled=true;this.renderer.setClearColor(0x24394f,1); this.renderer.outputColorSpace=THREE.SRGBColorSpace;
      this.scene = new THREE.Scene();this.scene.background=new THREE.Color(0x24394f);this.scene.fog=new THREE.Fog(0x24394f,9000,30000);this.world=new THREE.Group();this.world.scale.z=-1;this.scene.add(this.world);this.towerInstances=new TowerInstances(this.world);this.map=new OriginalMap(this.onStatus);this.vfx=new OriginalVfx(this,this.onStatus);this.targeting=new NativeTargeting(this); this.camera = new THREE.Camera();
      this.camera.matrixAutoUpdate = false; this.camera.matrixWorld.identity();
      this.camera.matrixWorldInverse.identity();
      this.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();this.ready=false;this.onStatus('3D 显示暂不可用，请刷新页面。',true);});
    } catch(error) { this.error=error; this.onStatus('当前设备不支持 WebGL，无法加载 3D 场景。',true); }
  }

  async loadTemplate(name) {
    if(STATIC_TOWER_NAMES.has(name)){const template=await this.staticTowers.template(name);this.templates.set(name,{...template,skinScale:(this.skinSettings[name]?.scale??1)*modelVisualScale(name)});return;}
    const loader=new GLTFLoader();
    const materialReady=name==='Kaisa'?ensureKaisaMatcap('assets/materials/classic-17/Kaisa/pistol-matcap.png'):null;
    materialReady?.catch(()=>{}); // Await below preserves errors; attach early to avoid an unhandled rejection.
        let buffer;
        if(typeof DecompressionStream==='function') {
          const response=await fetch(`assets/models/${name}.glb.gz${CLASSIC_MODEL_SETTINGS[name]?"?v=r20260930-classic17-live-1":""}`);
          if(!response.ok)throw new Error(`Model unavailable: ${name}`);
          const packed=await response.arrayBuffer();const bytes=new Uint8Array(packed);
          buffer=bytes[0]===0x1f&&bytes[1]===0x8b?await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():packed;
        } else {
          const response=await fetch(`assets/models/${name}.glb${CLASSIC_MODEL_SETTINGS[name]?"?v=r20260930-classic17-live-1":""}`);
          if(!response.ok)throw new Error(`Model unavailable: ${name}`);
          buffer=await response.arrayBuffer();
        }
        if(materialReady)await materialReady;const gltf=await loader.parseAsync(buffer,'');gltf.animations=gltf.animations.filter(clip=>!isDanceAction(clip.name));
        gltf.scene.traverse(object=>{
          if(!object.isMesh)return;
          if(Array.isArray(object.material))object.material=object.material.map(normalizeMaterial);
          else {
            object.visible=!HIDDEN.test(object.material.name)&&!(this.skinSettings[name]?.hidden||[]).includes(object.material.name);
            object.material=normalizeMaterial(object.material);
          }
          
          object.frustumCulled=false;
        });
        const boundMixer=new THREE.AnimationMixer(gltf.scene);
        const idleClip=gltf.animations.find(clip=>clip.name==='idle');
        if(idleClip)boundMixer.clipAction(idleClip).play();
        boundMixer.update(.3);gltf.scene.updateMatrixWorld(true);
        let box=new THREE.Box3();
        gltf.scene.traverse(object=>{
          if(object.isMesh&&object.visible){
            if(object.isSkinnedMesh){object.computeBoundingBox();box.union(object.boundingBox.clone().applyMatrix4(object.matrixWorld));}
            else{object.geometry.computeBoundingBox();box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));}
          }
        });
        boundMixer.stopAllAction();
        const building=['Turret','Nexus','RedTurret','RedNexus','Inhibitor','RedInhibitor'].includes(name);
        const nativeHeight=Math.max(1,building?box.max.y:box.max.y-box.min.y);
        const scale=(HEIGHTS[name]||100)/nativeHeight;
        this.templates.set(name,{scene:gltf.scene,clips:gltf.animations,scale,boundRadius:Math.max(box.min.length(),box.max.length())*2,nativeHeight,nativeYMax:box.max.y,skinScale:(this.skinSettings[name]?.scale??1)*modelVisualScale(name),baseY:building?0:-box.min.y*scale});

  }

  queueModelLoad(name){
    return new Promise((resolve,reject)=>{this.modelQueue.push({name,resolve,reject});this.pumpModelLoads();});
  }

  pumpModelLoads(){
    const limit=globalThis.__ARAM_MOBILE_SAFE__?1:3;
    while(this.activeModelLoads<limit&&this.modelQueue.length){
      const job=this.modelQueue.shift();this.activeModelLoads++;
      this.loadTemplate(job.name).then(job.resolve,job.reject).finally(()=>{this.activeModelLoads--;this.pumpModelLoads();});
    }
  }

  async ensureModels(names) {
    if(!this.skinSettings){this.skinLoading??=fetch('assets/models/scales.json').then(r=>{if(!r.ok)throw new Error('Skin settings unavailable');return r.json();});this.skinSettings={...await this.skinLoading,...CLASSIC_MODEL_SETTINGS,Karthus:{scale:.95,hidden:[]}};}
    const queue=[...new Set(names)].filter(name=>MODEL_NAMES.includes(name));let completed=0,total=queue.length;
    const worker=async()=>{while(queue.length){const name=queue.shift();if(!this.templates.has(name)){if(!this.modelLoads.has(name)){const task=this.queueModelLoad(name);this.modelLoads.set(name,task);task.catch(()=>{if(this.modelLoads.get(name)===task)this.modelLoads.delete(name);});}await this.modelLoads.get(name);}completed++;globalThis.AramLoadProgress?.progress('models',completed,total);this.onStatus(`正在载入本局模型 ${completed} / ${total}`,false);}};
    await Promise.all([worker(),worker(),worker()]);globalThis.AramLoadProgress?.progress('models',1,1);
  }

  async load(heroNames=MODEL_NAMES) {
    this.initialize();if(this.error)return false;
    try {
      if(!this.battleLoading)this.battleLoading=(async()=>{
        const targetingReady=this.targeting.load();
        this.vfxLoading=this.vfx.load(heroNames).catch(error=>{console.warn('技能特效加载失败',error);globalThis.AramLoadProgress?.progress('vfx',1,1,'部分技能特效加载失败');});
        await Promise.all([this.ensureModels([...heroNames,...WORLD_MODELS]),this.map.load(this.world),targetingReady,this.vfxLoading]);
        this.map.setupDecorations(this);this.ready=true;
      })();
      await this.battleLoading;
      await Promise.all([this.ensureModels([...heroNames]),this.vfx.ensureHeroes(heroNames)]);
      this.onStatus('本局地图与英雄已就绪',false);return true;
    }catch(error){this.error=error;console.error('Battle loading failed',error);this.onStatus('地图或模型加载失败：'+(error.message||error),true);return false;}
  }


  create(name, team=0,{instancedTower=false}={}) {
    const template=this.templates.get(name); if(!template)return null;
    const model=cloneSkeleton(template.scene),root=new THREE.Group();
    model.scale.setScalar(template.scale);model.position.y=template.baseY;
    root.add(model);
    // Team tint is used only for the shared building asset; champions keep original colors.
    if(team&&['Turret','Nexus'].includes(name))model.traverse(object=>{
      if(object.isMesh){object.material=object.material.clone();object.material.color.setRGB(1,.62,.76);}
    });
    instancedTower=!!(instancedTower&&template.staticTower);const towerMesh=instancedTower?model.getObjectByName('TowerBodyStatic'):null;if(towerMesh)towerMesh.layers.set(TOWER_PICK_LAYER);
    const mixer=new THREE.AnimationMixer(model),actions=new Map();
    for(const clip of template.clips)actions.set(clip.name,mixer.clipAction(clip));
    return {root,model,mixer,actions,instancedTower,towerMesh,current:null,state:'',serial:-1,dead:false,lastX:null,lastY:null,angle:team?-Math.PI/2:Math.PI/2,name,team};
  }

  createAttachedEffect(unit,material,submeshes){const record=this.records.get(unit?.id);return record?attachedModelOverlay(record,material,submeshes):null;}

  play(record,state,serial,period=.85,spinRate=1) {
    let actual=isDanceAction(state)?'idle':state;
    if(!record.actions.has(actual))actual=state==='r'?'q':state==='idle'?'attack':state==='death'?'idle':'attack';
    if(!record.actions.has(actual))actual=record.actions.has('idle')?'idle':record.actions.keys().next().value;
    if(!actual)return;
    if(record.state===actual&&record.serial===serial)return;
    const action=record.actions.get(actual),loop=['idle','run','runfast','r-idle','r-run','e-run'].includes(actual)||(record.name==='Vayne'&&actual==='r')||(record.name==='Garen'&&actual==='e')||(record.name==='MonkeyKing'&&actual==='r')||(record.name==='MissFortune'&&actual==='r')||(record.name==='Karthus'&&['p-idle','r-channel'].includes(actual));
    if(record.current!==action){if(record.current)record.current.fadeOut(.12);action.reset().fadeIn(.12).play();}
    else if(!loop)action.reset().play();
    action.enabled=true;action.paused=false;action.clampWhenFinished=!loop;
    action.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);
    action.setEffectiveWeight(1);
    let duration=action.getClip().duration;
    const attackLike=state==='attack'||record.name==='XinZhao'&&['q','q2','q3'].includes(state)||record.name==='MonkeyKing'&&state==='crit'||record.name==='Vayne'&&state==='q-attack'||record.name==='Sett'&&['attack2','q','q2'].includes(state);action.setEffectiveTimeScale(record.name==='Garen'&&actual==='e'?spinRate:loop||actual==='death'||!attackLike?1:duration/Math.max(.15,period*(record.name==='Sett'&&['attack2','q2'].includes(state)?.35:1)));
    record.current=action;record.state=actual;record.serial=serial;
  }

  /* perf: the preview canvas is hidden for the whole battle. Creating its second WebGL context up front costs a context, VRAM and driver state on phones for a canvas that is never drawn. Build it only when the lobby actually shows a preview. */
  ensurePreview() {
    if(this.previewRenderer)return true;
    try {
      this.previewRenderer = new THREE.WebGLRenderer({canvas:this.previewCanvas,alpha:true,antialias:true});
      this.previewRenderer.localClippingEnabled=true;this.previewRenderer.setClearColor(0,0); this.previewRenderer.outputColorSpace=THREE.SRGBColorSpace;
      this.previewScene = new THREE.Scene();
      this.previewCamera = new THREE.OrthographicCamera(-90,90,130,-20,1,1000);
      this.previewCamera.position.set(160,95,270); this.previewCamera.lookAt(0,58,0);
      return true;
    } catch { return false; }
  }

  selectPreview(name) {
    this.previewName=name;
    if(!this.templates.has(name)||!this.ensurePreview())return;
    if(this.previewRecord){this.previewScene.remove(this.previewRecord.root);this.previewRecord.mixer.stopAllAction();}
    const record=this.create(name);
    record.root.rotation.y=-.25;
    this.previewRecord=record;this.previewScene.add(record.root);this.play(record,'idle',0);
  }

  // Particles are frustumCulled=false (shader billboards); skip drawing the ones whose emitter is off-screen.
  cullParticles(){
    const out=[],f=this.viewFrustum,sph=this._pSphere??=new THREE.Sphere(),v=this._pScale??=new THREE.Vector3();if(!f)return out;
    for(const p of this.vfx.particles){const o=p.object;if(!o||!o.visible||p.attached||p.animated||p.ribbon||o.isLine)continue;const g=o.geometry;if(!o.isSprite&&!(g?.attributes?.position?.count<=8))continue;
      const e=o.matrixWorld.elements;v.setFromMatrixScale(o.matrixWorld);sph.center.set(e[12],e[13],e[14]);sph.radius=Math.max(400,v.x,v.y,v.z)*1.5;
      if(!f.intersectsSphere(sph)){o.visible=false;out.push(o);}}
    return out;
  }
  renderPreview(dt,visible) {
    if(!visible||!this.previewRecord||!this.ensurePreview())return;
    const w=Math.max(1,this.previewCanvas.clientWidth),h=Math.max(1,this.previewCanvas.clientHeight);
    const dpr=Math.min(window.devicePixelRatio||1,1.7);
    if(this.previewCanvas.width!==Math.round(w*dpr)||this.previewCanvas.height!==Math.round(h*dpr)){
      this.previewRenderer.setPixelRatio(dpr);this.previewRenderer.setSize(w,h,false);
      const aspect=w/h;this.previewCamera.left=-78*aspect;this.previewCamera.right=78*aspect;
      this.previewCamera.updateProjectionMatrix();
    }
    this.previewTime+=dt;this.previewRecord.mixer.update(dt);
    this.previewRecord.root.rotation.y=-.3+Math.sin(this.previewTime*.3)*.22;
    this.previewRenderer.render(this.previewScene,this.previewCamera);
  }

  socketPosition(unit,name){
    if(!name)return null;const record=this.records.get(unit.id);if(!record)return null;
    const key=name.toLowerCase();record.socketBones??=new Map();
    if(!record.socketBones.has(key)){let found=null;record.root.traverse(o=>{if(!found&&o.name.toLowerCase()===key)found=o;});record.socketBones.set(key,found);}
    const bone=record.socketBones.get(key);if(!bone)return null;
    if(this.resolvingVfxSockets){
      if(record.socketFrame!==this.renderFrame){record.root.updateWorldMatrix(true,true);record.socketFrame=this.renderFrame;record.socketPositions=new Map();}
      if(record.socketPositions.has(key))return record.socketPositions.get(key);
    }else record.root.updateWorldMatrix(true,true);
    const e=bone.matrixWorld.elements,result={x:e[12],y:e[13],z:-e[14]};
    if(this.resolvingVfxSockets)record.socketPositions.set(key,result);
    return result;
  }

  labelHeight(unit){const key=unitModelName(unit);const t=this.templates.get(key);return (t?(t.nativeYMax*t.skinScale)/HEIGHT_UNIT+14:100)+championLift(unit,this.lastGame?.time||0)/HEIGHT_UNIT;}
  hitShop(x,y){
    if(!this.ready||!this.map?.decorations?.length)return null;
    const roots=this.map.decorations.filter(record=>record.shopkeeper&&record.root.visible!==false).map(record=>record.root);if(!roots.length)return null;
    this.scene.updateMatrixWorld(true);this.map.ray.setFromCamera(new THREE.Vector2(x/this.map.w*2-1,1-y/this.map.h*2),this.camera);
    const hit=this.map.ray.intersectObjects(roots,true)[0];if(!hit)return null;let node=hit.object;while(node&&!node.userData?.decorationRecord)node=node.parent;return node?.userData?.decorationRecord||null;
  }

  hitTest(game,x,y,includeAll=false,accept=null){
    if(!this.ready)return null;
    const candidates=(includeAll?game.units.filter(u=>u.alive):game.enemies(game.player)).filter(u=>!accept||accept(u));
    // GLTF idle-pose boxes are invalid after skin animation: refresh BOTH broad-phase bounds.
    this.scene.updateMatrixWorld(true);this.map.ray.setFromCamera(new THREE.Vector2(x/this.map.w*2-1,1-y/this.map.h*2),this.camera);
    const roots=[];for(const u of candidates){const r=this.records.get(u.id);if(!r?.root.visible)continue;const f=this.map.project(u.x,u.y),h=this.map.project(u.x,u.y,this.labelHeight(u));if(Math.abs(x-f.x)>Math.max(50,Math.abs(f.y-h.y))||y<Math.min(h.y,f.y)-30||y>Math.max(h.y,f.y)+30)continue;r.root.traverse(o=>{if(o.isSkinnedMesh&&o.visible){o.computeBoundingBox();o.boundingSphere??=new THREE.Sphere();o.boundingBox.getBoundingSphere(o.boundingSphere);}});roots.push(r.root);}
    const layerMask=this.map.ray.layers.mask;let hits;try{this.map.ray.layers.enable(TOWER_PICK_LAYER);hits=this.map.ray.intersectObjects(roots,true);}finally{this.map.ray.layers.mask=layerMask;}
    for(const hit of hits){let visible=true;for(let o=hit.object;o;o=o.parent)if(!o.visible)visible=false;if(!visible)continue;const u=candidates.find(v=>v.id===hit.object.userData.unitId);if(u)return u;}
    // Forgiving projected body/healthbar hit areas keep thin minion weapons and transparent
    // texture holes from turning an intended attack into a ground move.
    let best=null,score=Infinity;for(const u of candidates){const foot=this.map.project(u.x,u.y),head=this.map.project(u.x,u.y,this.labelHeight(u)),height=foot.y-head.y;if(foot.depth>1||foot.depth< -1)continue;const radius=Math.max(u.kind==='minion'?12:18,Math.min(40,Math.abs(height)*.28));const cy=Math.max(head.y+7,Math.min(foot.y,y));const dist=Math.hypot((x-foot.x)/radius,(y-cy)/12);const bar=Math.abs(x-head.x)<(u.kind==='hero'||u.classicClone?65:40)&&Math.abs(y-head.y)<10;if((dist<=1||bar)&&dist<score){best=u;score=dist;}}return best;
  }

  render(game,{w,h,dpr,zoom,cam,cameraZoom=1,overview=false},dt) {updateKaisaMaterialTime(game.time);
    if(!this.ready)return null;
    this.renderFrame=(this.renderFrame||0)+1;
    if(this.lastGame!==game){
      for(const record of this.records.values()){this.world.remove(record.root);record.mixer.stopAllAction();}
      this.records.clear();this.towerInstances.clear();this.lastGame=game;
    }
    /* perf: dynamic resolution on touch devices. Phones were GPU fill-bound at full DPR. Track a smoothed frame interval; every 1.5s step render scale down 10% when slower than ~26fps, back up when faster than ~40fps. Floor 60% of the quality-level DPR (never under 0.75). */
    if(this.coarse??=(typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches)){const now=performance.now(),d=now-(this.lastRenderAt||now);this.lastRenderAt=now;if(d>0&&d<250)this.ftEma=this.ftEma?this.ftEma*.9+d*.1:d;this.dynScale??=1;if(this.ftEma&&now-(this.dynAt||0)>1500){this.dynAt=now;if(this.ftEma>40)this.dynScale=Math.max(.6,this.dynScale-.1);else if(this.ftEma<28)this.dynScale=Math.min(1,this.dynScale+.1);}/* never below 1 device-independent pixel: under 1x the whole scene smears (the landscape blur) */dpr=Math.max(Math.min(dpr,1),Math.round(dpr*this.dynScale*20)/20);}
    if(this.size.w!==w||this.size.h!==h||this.size.dpr!==dpr){
      this.renderer.setPixelRatio(dpr);this.renderer.setSize(w,h,false);this.size={w,h,dpr};
    }
    this.map.updateCamera({w,h,cam,zoom:cameraZoom},overview);this.camera=this.map.camera;this.map.update(dt,game);
    this.world.updateWorldMatrix(true,false);this.camera.updateMatrixWorld();
    this.viewFrustum??=new THREE.Frustum();this.frustumMatrix??=new THREE.Matrix4();this.cullSphere??=new THREE.Sphere();
    this.viewFrustum.setFromProjectionMatrix(this.frustumMatrix.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse));
    if(!this.warmed&&this.records.size>0&&this.renderFrame>2){this.warmed=true;try{this.renderer.compile(this.world,this.camera);}catch{}}
    const retained=new Set();
    for(const unit of game.units){
      if(!unit.alive&&(unit.kind==='minion'||unit.kind==='tower'))continue;
      const name=unitVisualModelName(unit,game.time);
      let record=this.records.get(unit.id);
      if(!record&&unit.kind==='hero'&&unit!==game.player&&Math.hypot(unit.x-cam.x,unit.y-cam.y)>900)continue;
      if(record&&(record.name!==name||record.team!==unit.team)){record.mixer.stopAllAction();record.mixer.uncacheRoot?.(record.model);this.world.remove(record.root);this.records.delete(unit.id);record=null;}
      if(!record){record=this.create(name,unit.team,{instancedTower:unit.kind==='tower'});if(!record){if(!this.modelLoads.has(name))this.ensureModels([name]).catch(error=>console.warn('中途加入英雄加载失败',name,error));continue;}this.records.set(unit.id,record);this.world.add(record.root);record.root.traverse(o=>{o.userData.unitId=unit.id;});if(unit.kind==='hero')this.vfx.ensureHeroes([unit.hero.id]).catch(error=>console.warn('中途加入英雄特效加载失败',unit.hero.id,error));}
      retained.add(unit.id);
      const point=gameToNative(unit.x,unit.y);record.root.position.set(point.x,(unit.worldY!==undefined?unit.worldY:this.map.navigation.height(unit.x,unit.y))+championLift(unit,game.time)+(unit.cannonLift||0)*1.8,point.z);
      const building=unit.kind!=='hero'&&unit.kind!=='minion'&&!unit.classicClone;
      record.model.scale.setScalar(this.templates.get(name).skinScale*(unit.augmentSize||1));record.model.position.y=0;record.root.scale.setScalar(1);
      if(building){if(unit.nativeTransform){const matrix=new THREE.Matrix4().fromArray(unit.nativeTransform.flat());matrix.decompose(new THREE.Vector3(),record.root.quaternion,new THREE.Vector3());}}
      
      const changed=record.lastX!==null&&Math.hypot(unit.x-record.lastX,unit.y-record.lastY)>.15;
      const networkMinion=unit.kind==='minion'&&Number.isFinite(unit.netSampleTime);
      const walking=networkMinion?Math.hypot(unit.netVelocityX||0,unit.netVelocityY||0)>.1&&game.netSilence<.2:changed;
      if(walking&&unit.alive){const dx=networkMinion?unit.netVelocityX:unit.x-record.lastX,dy=networkMinion?unit.netVelocityY:unit.y-record.lastY,[ux,uz]=MAP_CONFIG.direction;record.angle=Math.atan2(dx*ux-dy*uz,dx*uz+dy*ux);}
      if(unit.animUntil>game.time&&Number.isFinite(unit.facing)){const dx=Math.sin(unit.facing),dy=Math.cos(unit.facing),[ux,uz]=MAP_CONFIG.direction;record.angle=Math.atan2(dx*ux-dy*uz,dx*uz+dy*ux);}
      if(unit.kind==='hero'||unit.kind==='minion'||unit.classicClone){
        let diff=record.angle-record.root.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));
        record.root.rotation.y+=diff*Math.min(1,dt*18);
      }
      const moving=dt===0?!!record.moving:walking;record.moving=moving;
      let state=unit.alive?(unit.hero?.id==='Garen'&&unit.spin>0?'e':unit.animUntil>game.time?unit.animation:(moving?'run':'idle')):'death';
      if(unit.hero?.id==='Jhin'){if(unit.jhinChannel)state=unit.animUntil>game.time&&unit.animation==='rshot'?'rshot':'r';else if(unit.jhinReloadUntil>game.time)state='reload';}
      if(unit.hero?.id==='MissFortune'&&unit.mfChannel)state=game.time-unit.mfChannel.start<.2?'rstart':'r';
      if(unit.hero?.id==='MissFortune'&&state==='run'&&unit.mfMoveSpeed>0)state='runfast';
      state=classicModelState(record,unit,game.time,state);
      const serial=['idle','run','runfast','r-idle','r-run'].includes(state)?0:(unit.animationSerial||0);
      state=karthusModelState(unit,game.time,state);
      if(!unit.alive&&!record.dead){record.diedAt=game.time;record.dead=true;}
      if(unit.alive)record.dead=false;
      const template=this.templates.get(name);this.cullSphere.center.copy(record.root.position);this.cullSphere.radius=(template.boundRadius||template.nativeHeight*2||200)*Math.max(.01,record.model.scale.x);this.cullSphere.applyMatrix4(this.world.matrixWorld);
      const onscreen=unit===game.player||this.viewFrustum.intersectsSphere(this.cullSphere);
      record.root.visible=!(unit.hero?.id==='Zed'&&unit.classicUntargetableUntil>game.time)&&!(unit.teemoStealth&&unit.team!==game.player.team)&&onscreen&&(unit.alive||karthusSpirit(game,unit)||(unit.kind==='hero'&&game.time-record.diedAt<2.5));
      if(unit.kind==='tower'&&!unit.alive)record.root.visible=false;
      const step=record.instancedTower?null:animationStep(record,itemStasis(game,unit)?0:dt,{visible:record.root.visible,local:unit===game.player,minion:unit.kind==='minion',changed:record.state!==state||record.serial!==serial});
      if(step!==null){if(!itemStasis(game,unit))this.play(record,state,serial,unit.period,unit.garenSpinAnimationRate||1);record.mixer.update(step);}
      record.lastX=unit.x;record.lastY=unit.y;
    }
    for(const [id,record] of this.records){if(!retained.has(id)){record.mixer.stopAllAction();this.world.remove(record.root);this.records.delete(id);}}
    this.classicScene.update(game,dt);this.resolvingVfxSockets=true;try{this.vfx.update(game,dt);}finally{this.resolvingVfxSockets=false;}this.targeting.update(game,this.controlState?.pending,this.controlState?.aim||game.player,dt);this.towerInstances.update(this.records,this.templates);const culled=this.cullParticles();try{this.vfx.distortion.render(this.renderer,this.scene,this.camera,this.vfx.particles);}finally{for(const o of culled)o.visible=true;}
    return this.renderer.domElement;
  }
}
