import {gameToNative} from './original-map.js';
const direction=(from,to)=>{const a=gameToNative(from.x,from.y),b=gameToNative(to.x,to.y);return Math.atan2(b.x-a.x,b.z-a.z);};
export class JhinVfx {
 constructor(vfx){this.vfx=vfx;this.traps=new Map();this.channels=new Map();this.wCasts=new Map();}
 reset(){for(const map of [this.traps,this.channels]){for(const record of map.values())if(record.instance)record.instance.stopped=true;map.clear();}this.wCasts.clear();}
 event(event,game){if(event.hero!=='Jhin')return false;const u=event.source;
  if(event.state==='w'&&event.phase==='cast'&&u){const from={...(event.from||u)},aim=event.aim||{x:from.x+Math.sin(u.facing||0),y:from.y+Math.cos(u.facing||0)};this.wCasts.set(u.id,{from,angle:direction(from,aim),time:event.time??game.time});return false;}
  if(event.state==='w'&&event.phase==='beam'&&u){const cast=this.wCasts.get(u.id),from=cast?.from||u,angle=cast?.angle??direction(u,{x:u.x+Math.sin(u.facing||0),y:u.y+Math.cos(u.facing||0)});this.vfx.emit('Jhin_Base_W_beam',Object.assign(this.vfx.host(from.x,from.y,angle),{height:8,seedParticles:true}),.75,2500);this.wCasts.delete(u.id);return true;}
  return event.state==='r'&&event.phase==='cast';
 }
 handlesEffect(effect){return effect.hero==='Teemo'&&effect.nativeName==='Teemo_Base_R_CollisionBox_Ring'||effect.hero==='Jhin'&&['Jhin_Base_W_beam','Jhin_Base_E_Trap_Idle','Jhin_Base_R_ViewCone'].includes(effect.nativeName);}
 update(game){const activeTraps=new Set(),activeChannels=new Set();
  for(const z of game.zones||[]){if(!['jhinTrap','teemoTrap'].includes(z.kind)||z.age>=z.duration)continue;activeTraps.add(z.id);let r=this.traps.get(z.id);if(!r){r={instance:this.vfx.emit(z.kind==='teemoTrap'?'Teemo_Base_R_CollisionBox_Ring':'Jhin_Base_E_Trap_Idle',Object.assign(this.vfx.host(z.x,z.y),{height:0,seedParticles:true,sampleBirth:true}),Math.max(.01,z.duration-z.age))};this.traps.set(z.id,r);}if(r.instance){r.instance.duration=r.instance.age+Math.max(.01,z.duration-z.age);r.instance.host.x=z.x;r.instance.host.y=z.y;}}
  for(const u of game.units||[]){const c=u.jhinChannel;if(!(u.hero?.id==='Jhin'||u.sylasBorrowedR?.id==='Jhin')||!u.alive||!c||c.until<=game.time)continue;activeChannels.add(u.id);let r=this.channels.get(u.id);if(r&&r.until!==c.until){r.instance.stopped=true;this.channels.delete(u.id);r=null;}if(!r){const angle=direction(u,{x:u.x+Math.sin(c.angle),y:u.y+Math.cos(c.angle)}),host=Object.assign(this.vfx.host(u.x,u.y,angle,u),{height:0,seedParticles:true,sampleBirth:true,preserveSignedScale:true});r={until:c.until,instance:this.vfx.emit('Jhin_Base_R_ViewCone',host,c.until-game.time)};this.channels.set(u.id,r);}}
  for(const [map,active]of [[this.traps,activeTraps],[this.channels,activeChannels]])for(const[id,r]of map)if(!active.has(id)){if(r.instance)r.instance.stopped=true;map.delete(id);}
  for(const[id,cast]of this.wCasts)if(game.time-cast.time>2)this.wCasts.delete(id);
 }
}
