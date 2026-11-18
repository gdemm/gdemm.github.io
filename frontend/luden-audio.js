import {LUDEN_HIT_CLIPS} from './luden-audio-data.js';
export class LudenAudio{
 constructor(audio){this.audio=audio;this.game=null;this.cursor=0;this.lastByOwner=new Map();this.lastClip=-1;}
 reset(game){this.game=game;this.cursor=Math.max(0,...(game.effects||[]).filter(e=>e.itemId==='6655'&&e.itemPhase==='hit').map(e=>e.id));this.lastByOwner.clear();}
 update(game){
  if(this.game!==game){this.reset(game);return;}
  const previous=this.cursor;
  for(const e of game.effects||[]){
   if(e.itemId!=='6655'||e.itemPhase!=='hit'||!Number.isFinite(e.id)||e.id<=previous)continue;
   this.cursor=Math.max(this.cursor,e.id);
   const distance=Math.hypot(e.x-game.player.x,e.y-game.player.y);if(!this.audio.enabled||!Number.isFinite(distance)||distance>=800)continue;
   const owner=e.itemOwner?.id??e.itemOwner??'unknown';if(game.time-(this.lastByOwner.get(owner)??-Infinity)<.08)continue;
   this.lastByOwner.set(owner,game.time);
   // One original hit per owner/proc; collateral hits do not stack four loud copies.
   const choice=(this.lastClip+1+Math.floor(Math.random()*(LUDEN_HIT_CLIPS.length-1)))%LUDEN_HIT_CLIPS.length;this.lastClip=choice;
   this.audio.play(LUDEN_HIT_CLIPS[choice],(e.itemOwner===game.player?.25:.16)*Math.max(.15,1-distance/800),false,'item');
  }
 }
}
