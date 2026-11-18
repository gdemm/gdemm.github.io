// Observe authoritative ready timestamps; this renderer never applies healing.
export class HealthRelicVfx{
 constructor(fx){this.fx=fx;this.states=new Map();}
 reset(){this.states.clear();if(this.fx.owner.map)this.fx.owner.map.nativeHealthRelics=false;}
 update(game){const fx=this.fx,names=fx.data?.relics,core=names&&fx.data.effects[names.idle]?.emitters.find(e=>e.emitterName===names.coreEmitter);if(!game.mapConfig||!core||!fx.meshes.has(core.meshUrl)){for(const state of this.states.values())if(state.idle)state.idle.stopped=true;this.states.clear();if(fx.owner.map)fx.owner.map.nativeHealthRelics=false;return;}
  fx.owner.map.nativeHealthRelics=true;const live=new Set();
  for(const[index,r]of (game.relics||[]).entries()){const key=index+':'+r.x+':'+r.y;live.add(key);let state=this.states.get(key);if(!state){state={available:false,idle:null};this.states.set(key,state);}const available=game.time>=(r.ready||0);
   if(available&&!state.idle){const host={...fx.host(r.x,r.y),height:0,worldY:r.worldY,sampleBirth:true,seedParticles:true,relic:true};state.idle=fx.emit(names.idle,host,60);}
   if(available&&state.idle)state.idle.duration=state.idle.age+60;
   if(!available&&state.available){if(state.idle)state.idle.stopped=true;state.idle=null;fx.emit(names.pickup,{...fx.host(r.x,r.y),height:0,worldY:r.worldY,sampleBirth:true,seedParticles:true,relic:true},1.5);}
   state.available=available;
  }
  for(const[key,state]of this.states)if(!live.has(key)){if(state.idle)state.idle.stopped=true;this.states.delete(key);}
 }
}
