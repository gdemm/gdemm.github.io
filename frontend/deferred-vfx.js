import {particleAssetsReady} from './classic-vfx-readiness.js';
export function deferCosmetic(vfx,name,definition,host,duration,beamLength){
 if(!definition.deferredNonCombat||definition.emitters.every(e=>particleAssetsReady(e,vfx)))return false;
 vfx.deferredEmits??=new Map();vfx.deferredRetry??=new Map();if((vfx.deferredRetry.get(name)||0)>performance.now())return true;
 const key=name+':'+(host.follow?.id??`${host.x}:${host.y}`);if(vfx.deferredEmits.has(key))return true;
 const game=vfx.game;vfx.deferredEmits.set(key,true);
 if(!vfx.deferredLoads.has(name)){const pending=vfx.loadEffectAssets([definition]);vfx.deferredLoads.set(name,pending);pending.then(()=>vfx.deferredLoads.delete(name),error=>{vfx.deferredLoads.delete(name);vfx.deferredRetry.set(name,performance.now()+5000);console.warn('非战斗特效加载失败',name,error);});}
 vfx.deferredLoads.get(name).then(()=>{vfx.deferredEmits.delete(key);if(vfx.game===game&&host.follow?.alive!==false)vfx.emit(name,host,duration,beamLength);},()=>vfx.deferredEmits.delete(key));
 return true;
}
