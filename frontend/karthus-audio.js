import {karthusSpirit} from './karthus-ui.js';
// Original authored E loop and passive/channel cues, stopped from authoritative state.
export class KarthusAudio {
 constructor(audio){this.audio=audio;this.game=null;this.active=new Map();}
 reset(){for(const key of this.active.keys())this.audio.stopChannel(key);this.active.clear();this.game=null;}
 update(game){
  if(this.game!==game){this.reset();this.game=game;}
  const wanted=new Set();
  for(const u of game.units||[]){
   if(u.hero?.id!=='Karthus'&&!(u.karthusRequiemUntil>game.time))continue;
   const spirit=karthusSpirit(game,u),distance=Math.hypot(u.x-game.player.x,u.y-game.player.y);
   if(distance>=800||(u.classicRealmId||0)!==(game.player.classicRealmId||0))continue;
   const states=[['e',(u.alive||spirit)&&u.karthusDefile,'KarthusDefile_OnBuffActivate','KarthusDefile_OnBuffDeactivate'],['p',spirit,'KarthusDeathDefiedBuff_OnBuffActivate','KarthusDeathDefiedBuff_OnBuffDeactivate'],['r',(u.alive||spirit)&&u.karthusRequiemUntil>game.time,'KarthusFallenOneCastSound_OnBuffActivate',null]];
   for(const [kind,on,start,end]of states){if(!on)continue;const key=`karthus:${u.id}:${kind}`;wanted.add(key);if(this.active.has(key)||!this.audio.enabled)continue;
    if(this.audio.play('Karthus','Play_sfx_Karthus_'+start,{volume:.16*(1-distance/800),channel:key,loop:'native'}))this.active.set(key,{unitId:u.id,end});
   }
  }
  for(const [key,item]of this.active)if(!wanted.has(key)){this.audio.stopChannel(key);this.active.delete(key);const u=game.units.find(u=>u.id===item.unitId);if(item.end&&u&&Math.hypot(u.x-game.player.x,u.y-game.player.y)<800)this.audio.play('Karthus','Play_sfx_Karthus_'+item.end,{volume:.12});}
 }
}
