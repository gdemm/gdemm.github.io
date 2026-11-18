// Uses native Skin0 sound metadata, not guessed names derived from particle visuals.
export class ClassicParticleAudio {
 constructor(audio){this.audio=audio;this.game=null;this.seen=new WeakSet();this.channels=new Map();this.serial=0;}
 reset(){for(const channel of this.channels.values())this.audio.stopChannel(channel);this.channels.clear();this.seen=new WeakSet();this.game=null;}
 update(game,instances){
  const initial=this.game!==game;
  if(initial){this.reset();this.game=game;}
  const present=new Set(instances);
  for(const [instance,channel] of this.channels){if(!present.has(instance)||!this.audible(game,instance)){this.audio.stopChannel(channel);this.channels.delete(instance);}}
  for(const instance of instances){
   if(this.seen.has(instance))continue;this.seen.add(instance);
   // Join/reload must not play all historical passives/buffs, nor unmute replay them.
   if(initial||!this.audio.enabled||!this.audible(game,instance))continue;
   const prefix=instance.name?.split('_')[0]?.toLowerCase(),hero=[...this.audio.manifests.keys()].find(h=>h.toLowerCase()===prefix),meta=this.audio.manifests.get(hero)?.particleAudio?.[instance.name];if(!meta)continue;
   const at=instance.host.follow||instance.host,d=Math.hypot(at.x-game.player.x,at.y-game.player.y),volume=.18*(1-d/800);
   const duplicate=name=>this.audio.recentCombatSounds?.some(r=>r.name===name&&Math.abs(game.time-r.time)<.1&&Math.hypot(at.x-r.x,at.y-r.y)<2);
   const create=duplicate(meta.soundOnCreateDefault)?null:meta.soundOnCreateDefault,persistent=duplicate(meta.soundPersistentDefault)?null:meta.soundPersistentDefault;
   if(create&&create!==persistent)this.audio.play(hero,create,{volume});
   if(persistent){const channel=`particle:${++this.serial}`;if(this.audio.play(hero,persistent,{volume,channel,loop:'native'}))this.channels.set(instance,channel);}
  }
 }
 audible(game,instance){
  if(instance.stopped||instance.age>instance.duration)return false;
  const follow=instance.host?.follow,at=follow||instance.host;if(!at||!game.player)return false;
  if(follow?.alive===false||follow?.life<=0)return false;
  if(follow?.teemoStealth&&follow.team!==game.player.team)return false;
  if(follow?.classicRealmId!=null&&(follow.classicRealmId||0)!==(game.player.classicRealmId||0))return false;
  return Math.hypot(at.x-game.player.x,at.y-game.player.y)<800;
 }
}
