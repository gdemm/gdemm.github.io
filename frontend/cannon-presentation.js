import {CANNON_AUDIO} from './cannon-audio-data.js';
const eventName=(enhanced,landing)=>enhanced
 ?'Play_sfx_Kiwi_Augment_Overextender_'+(landing?'Explosion':'Circle')
 :'Play_sfx_Feeneypult_Targeting_'+(landing?'hitlocation':'distant2d');
export function cannonCircleName(flight,viewerTeam){
 return 'BW_Feeneypult'+(flight.team===viewerTeam?'Green':'Red')+'Circle'+(flight.enhanced?'_Overextender':'');
}
export function validCannonFlight(f,t){return !!f&&typeof f.id==='string'&&Number.isFinite(f.x)&&Number.isFinite(f.y)&&Number.isFinite(f.until)&&f.until>t&&(f.team===0||f.team===1);}
function stop(instance,vfx){if(!instance)return;instance.stopped=true;for(const p of vfx.particles||[])if(p.instance===instance)p.age=p.life;}
export class CannonVfx{
 constructor(vfx){this.vfx=vfx;this.active=new Map();this.seen=new Set();this.game=null;}
 reset(){for(const i of this.active.values())stop(i,this.vfx);this.active.clear();this.seen.clear();}
 update(g){
  if(this.game!==g){this.reset();this.game=g;}
  const alive=new Set();
  for(const f of g.cannonFlights||[]){
   if(!validCannonFlight(f,g.time))continue;
   alive.add(f.id);let i=this.active.get(f.id);
   if(!i){const host=this.vfx.host(f.x,f.y);host.height=0;host.seedParticles=true;i=this.vfx.emit(cannonCircleName(f,g.player?.team),host,f.until-g.time);if(i)this.active.set(f.id,i);}
   if(i){i.duration=i.age+f.until-g.time;i.host.x=f.x;i.host.y=f.y;}
  }
  for(const [id,i]of this.active)if(!alive.has(id)){stop(i,this.vfx);this.active.delete(id);}
  for(const e of g.cannonLandings||[]){
   if(this.seen.has(e.id)||!Number.isFinite(e.at)||g.time-e.at>1||e.at>g.time)continue;
   this.seen.add(e.id);const host=this.vfx.host(e.x,e.y);host.height=0;host.seedParticles=true;
   this.vfx.emit(e.enhanced?'Bilgewater_Barrel_Explosion_Overextender':'BW_Feeneypult_Land',host,2);
  }
  if(this.seen.size>128)this.seen=new Set([...this.seen].slice(-64));
 }
}
export class CannonAudio{
 constructor(audio){this.audio=audio;this.active=new Map();this.seen=new Set();this.game=null;}
 reset(){for(const a of this.active.values())a.pause();this.active.clear();this.seen.clear();}
 update(g){
  if(this.game!==g){this.reset();this.game=g;}
  if(!this.audio.enabled){for(const a of this.active.values())a.pause();this.active.clear();return;}
  const near=e=>Math.hypot(e.x-(g.player?.x||0),e.y-(g.player?.y||0))<=800;
  const live=new Set();
  for(const f of g.cannonFlights||[]){
   if(!validCannonFlight(f,g.time)||!near(f))continue;
   live.add(f.id);
   if(!this.active.has(f.id)){
    const list=CANNON_AUDIO[eventName(f.enhanced,false)],url=list?.[Math.floor(Math.random()*list.length)];
    if(this.audio.play(url,.3)){const a=this.audio.fx.at(-1);if(a){a.loop=true;this.active.set(f.id,a);}}
   }
  }
  for(const [id,a]of this.active)if(!live.has(id)){a.pause();this.active.delete(id);}
  for(const e of g.cannonLandings||[]){
   if(this.seen.has(e.id)||!Number.isFinite(e.at)||e.at>g.time)continue;this.seen.add(e.id);
   if(g.time-e.at>1||!near(e))continue;
   const list=CANNON_AUDIO[eventName(e.enhanced,true)];this.audio.play(list?.[Math.floor(Math.random()*list.length)],.4);
  }
  if(this.seen.size>128)this.seen=new Set([...this.seen].slice(-64));
 }
}
