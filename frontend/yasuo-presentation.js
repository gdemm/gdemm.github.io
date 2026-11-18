// Native Q GatheringStormDuration, not the shared Q cooldown or a channel lock.
export const YASUO_WIND_DURATION=6;
export function yasuoWindState(unit,time){const remaining=unit?.hero?.id==='Yasuo'&&unit.alive&&unit.yasuoStacks>=2?Math.max(0,(unit.yasuoStackUntil||0)-time):0;return {ready:remaining>0,remaining,fraction:Math.min(1,remaining/YASUO_WIND_DURATION)};}
export class YasuoVfx{
 constructor(fx){this.fx=fx;this.ready=new Map();this.dashes=new Map();}
 reset(){this.ready.clear();this.dashes.clear();}
 update(game){const live=new Set();for(const u of game.units||[]){if(u.hero?.id!=='Yasuo')continue;live.add(u.id);let r=this.ready.get(u.id);const wind=yasuoWindState(u,game.time);if(wind.ready){if(!r){r=this.fx.emit('Yasuo_Base_Q_wind_ready_buff',{...this.fx.host(u.x,u.y,0,u),height:0,sampleBirth:true,seedParticles:true},wind.remaining);if(r)this.ready.set(u.id,r);}if(r){r.host.follow=u;r.duration=r.age+wind.remaining;}}else if(r){r.stopped=true;this.ready.delete(u.id);}
  const dash=this.dashes.get(u.id);if(dash){if(!u.alive||u.dash?.kind!=='yasuoE'||u.dash.start!==dash.start||game.time>=dash.end){dash.fx.stopped=true;this.dashes.delete(u.id);}else dash.fx.host.follow=u;}
 }for(const[id,r]of this.ready)if(!live.has(id)){r.stopped=true;this.ready.delete(id);}for(const[id,r]of this.dashes)if(!live.has(id)){r.fx.stopped=true;this.dashes.delete(id);}}
 cast(event,game,angle){const u=event.source,d=event.dash||u?.dash;if(!u?.alive||d?.kind!=='yasuoE'||u.dash?.start!==d.start||game.time>=d.start+d.duration)return;const old=this.dashes.get(u.id);if(old)old.fx.stopped=true;
  // Seed at the authoritative cast origin (not the already-advanced snapshot
  // position). Later births follow the dashing unit; unbound ghosts fade in place.
  const r=this.fx.emit('Yasuo_Base_E_Dash',{...this.fx.host(d.from.x,d.from.y,angle),height:0,sampleBirth:true,seedParticles:true},Math.max(.01,d.start+d.duration-game.time));if(r)this.dashes.set(u.id,{fx:r,start:d.start,end:d.start+d.duration});
 }
}
