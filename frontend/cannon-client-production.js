import {CannonCamera} from './cannon-camera.js';
import {CannonTargetingView} from './cannon-targeting-view.js';
import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {clone} from './vendor/SkeletonUtils.js';
import {CannonVfx,CannonAudio} from './cannon-presentation.js';
import {CANNON_AUDIO} from './cannon-audio-data.js';
import {cannonPosition,CANNON_RULES} from './cannon-gameplay.js';
export function install(b){
 const assetBase=new URL('cannon/',document.baseURI);
 const url=p=>new URL(p.replace(/^assets\//,''),assetBase).href;
 for(const k in CANNON_AUDIO)CANNON_AUDIO[k]=CANNON_AUDIO[k].map(url);
 const overlay=document.createElement('canvas');overlay.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:21';document.body.append(overlay);const ctx=overlay.getContext('2d');
 const panel=document.createElement('div');panel.style.cssText='position:fixed;top:62px;right:12px;z-index:22;padding:10px;background:#091b26e8;border:1px solid #a28d55;color:#eeddab;font:12px sans-serif;max-width:300px';panel.innerHTML='<b>加农炮</b><div id="cannonRuleLine">射程1500 · 冷却10秒</div><div id="cannonHint">点击泉水旁加农炮，选择地图或小地图落点</div><button id="cannonLocate">定位加农炮</button><button id="cannonCancel">取消瞄准</button>';// Internal status nodes are detached; no instruction panel is displayed.
 const hint=panel.querySelector('#cannonHint');
 panel.querySelector('#cannonLocate').onclick=()=>b.focus(cannonPosition(b.game(),b.game().player.team));
 panel.querySelector('#cannonCancel').onclick=()=>b.online().action({type:'cannonCancel'});
 let pointer={x:0,y:0},models=[],loading=false,loaded=false,aimView=null,miniAim=null,fxPack=null,mergedEffects=null,loadError='',vfxView,audioView=new CannonAudio(b.audio),approach=null;
 const point=p=>{const [ux,uz]=b.map.direction,s=b.map.scale,o=b.map.origin;return{x:o[0]+(p.x*ux-p.y*uz)*s,z:o[2]+(p.x*uz+p.y*ux)*s};};
 async function load(){
  loading=true;const m=b.models;
  try{
   const cannon=await new GLTFLoader().loadAsync(url('assets/map/cannon.glb')+'?v=usable-cannon-2');
   for(const team of [0,1]){const kind='cannon';
    const source=cannon,root=clone(source.scene),mixer=new THREE.AnimationMixer(root);
    const clip=source.animations.find(a=>/open_loop|idle1/.test(a.name));if(clip){mixer.clipAction(clip).play();mixer.update(.1);}root.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(root),scale=kind==='cannon'?.85:1.4;root.scale.setScalar(scale);root.userData.baseY=kind==='cannon'?-box.min.y*scale:0;root.rotation.y=team?Math.PI:0;
    root.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(team)o.material.color.set('#ffb5bc');if(o.isSkinnedMesh)o.computeBoundingSphere();o.frustumCulled=true;}});
    m.world.add(root);models.push({root,mixer,team,kind});
   }
   loaded=true;aimView=new CannonTargetingView(m.world,point,p=>m.map.navigation.height(p.x,p.y));aimView.load(k=>url('assets/controls/cannon/'+k+'.png')).catch(e=>console.warn('瞄准贴图加载失败',e));
   loadFx().catch(e=>{console.warn('Cannon VFX deferred',e);});
  }catch(e){loadError='炮台模型加载失败，请刷新：'+e.message;hint.textContent=loadError;console.error(e);}
 }
 async function loadFx(){
  const m=b.models,manifest=await fetch(url('assets/vfx/cannon/manifest.json')).then(r=>{if(!r.ok)throw Error('炮台特效清单加载失败');return r.json();});
  const urls=new Set();
  for(const fx of Object.values(manifest.effects))for(const e of fx.emitters)for(const k of ['textureUrl','meshUrl','multUrl','erosionUrl','paletteUrl'])if(e[k]){e[k]=url(e[k]);urls.add(e[k]);}
  await Promise.all([...urls].map(async u=>{if(u.endsWith('.png')){const t=await new THREE.TextureLoader().loadAsync(u);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;m.vfx.textures.set(u,t);}else{const d=await fetch(u).then(r=>r.json()),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(d.position,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(d.uv,2));g.computeVertexNormals();m.vfx.meshes.set(u,g);}}));
  fxPack=manifest;vfxView=new CannonVfx(m.vfx);
 }
 function sendLaunch(p){b.controls.cancel();b.game().predictedMove=null;b.online().action({type:'cannonLaunch',x:p.x,y:p.y});}
 function hit(event){
  if(!b.playing()||b.blocked()||!(event.button===0||event.button===2||event.pointerType==='touch'))return;
  const g=b.game(),state=g.player.cannonState;
  if(state?.phase==='flight'){event.preventDefault();event.stopImmediatePropagation();return;}
  if(state?.phase==='aim'){
   event.preventDefault();event.stopImmediatePropagation();sendLaunch(event.currentTarget===b.mini?b.miniPoint(event):b.unproject(event.clientX,event.clientY));return;
  }
  if(event.currentTarget===b.mini||b.controls.pending||!loaded)return;
  for(const rec of models.filter(r=>r.kind!=='exit')){
   const p=cannonPosition(g,rec.team),screen=b.project(p.x,p.y,35);
   if(screen.depth<-1||screen.depth>1||Math.hypot(event.clientX-screen.x,event.clientY-screen.y)>45)continue;
   event.preventDefault();event.stopImmediatePropagation();b.controls.cancel();
   const command={type:'cannonEnter',team:rec.team};
   if(Math.hypot(g.player.x-p.x,g.player.y-p.y)>CANNON_RULES.useRange-10){g.move(p.x,p.y);approach={command,p,until:performance.now()+10000};hint.textContent='正在走向入口…';}else b.online().action(command);
   return;
  }
  approach=null;
 }
 b.canvas.addEventListener('pointerdown',hit,true);b.mini.addEventListener('pointerdown',hit,true);
 b.canvas.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};miniAim=null;});
 b.mini.addEventListener('pointermove',e=>{miniAim=b.miniPoint(e);});
 addEventListener('keydown',e=>{if(e.key==='Escape'&&b.game().player.cannonState?.phase==='aim'){e.preventDefault();e.stopImmediatePropagation();b.online().action({type:'cannonCancel'});}},true);
 const handle=b.online().handle.bind(b.online());b.online().handle=function(m){if(m.type==='error'&&b.game().player.cannonState)b.game().banner(m.message||'落点无效');return handle(m);};
 const cannonCamera=new CannonCamera(b);
 let addonFaultLogged=false;
 const original=b.models.render.bind(b.models);
 b.models.render=function(g,view,dt){
  try {
  const reach=CANNON_RULES.range+(g.player.augments?.includes('Overextender')?12000/b.map.scale:0);
  const cameraState=cannonCamera.update(g,b.playing(),reach);
  view={...view,cam:cameraState.camera.cam,cameraZoom:cameraState.camera.zoom};
  panel.querySelector('#cannonLocate').disabled=cameraState.phase==='flight';
  panel.querySelector('#cannonCancel').disabled=cameraState.phase==='flight';
  if(this.ready&&this.map?.ready&&!loading)load();
  if(fxPack&&this.vfx?.data?.effects!==mergedEffects&&this.vfx?.data?.effects){Object.assign(this.vfx.data.effects,fxPack.effects);mergedEffects=this.vfx.data.effects;}
  panel.hidden=!b.playing();overlay.hidden=!b.playing()||b.blocked();
  if(overlay.width!==innerWidth||overlay.height!==innerHeight){overlay.width=innerWidth;overlay.height=innerHeight;}
  ctx?.clearRect(0,0,overlay.width,overlay.height);
  if(loaded){
   for(const r of models){const p=cannonPosition(g,r.team);r.root.visible=!!p;if(!p)continue;const n=point(p);r.root.position.set(n.x,this.map.navigation.height(p.x,p.y)+(r.root.userData.baseY||0),n.z);const screen=b.project(p.x,p.y,70);
    if(screen.depth>=-1&&screen.depth<=1&&screen.x>-100&&screen.x<innerWidth+100&&screen.y>-100&&screen.y<innerHeight+100){r.mixer.update(Math.min(dt,.05));}
   }
   if(vfxView&&this.vfx.ready)vfxView.update(g);audioView.update(g);
  }
  if(approach){if(!g.player.alive||performance.now()>approach.until)approach=null;else if(Math.hypot(g.player.x-approach.p.x,g.player.y-approach.p.y)<=CANNON_RULES.useRange-10){b.online().action(approach.command);approach=null;}}
  panel.querySelector('#cannonRuleLine').textContent=g.player.augments?.includes('Overextender')?'过量延伸者：射程扩展 · 伤害/速度+50%':'射程1500 · 冷却10秒';
  const state=g.player.cannonState;
  const aimTarget=miniAim||b.unproject(pointer.x,pointer.y),aimRange=CANNON_RULES.range+(g.player.augments?.includes('Overextender')?12000/b.map.scale:0);const validAim=aimView?.update({active:state?.phase==='aim'&&!b.blocked(),source:g.player,target:aimTarget,range:aimRange,radius:CANNON_RULES.radius,scale:b.map.scale});
  if(state?.phase==='aim'){hint.textContent=validAim===false?'落点超出射程，请选择射程圈内位置':'选择原版符文圈落点：点击地面／小地图；Esc取消';}
  else if(state?.phase==='flight')hint.textContent='飞行中 · 视角已锁定跟随英雄';
  else if(loadError)hint.textContent=loadError;
  else if(!loaded)hint.textContent='正在单独加载加农炮模型…';
  else if(!approach&&loaded)hint.textContent='点击泉水旁加农炮，选择地图或小地图落点';
  }catch(error){if(!addonFaultLogged){console.warn('Cannon overlay recovered',error);addonFaultLogged=true;}}
  return original(g,view,dt);
 };

}
