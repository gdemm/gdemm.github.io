import {KILL_AUDIO} from './kill-audio-data.js';
export function killCue(e,player){if(!e.killer||e.execution||e.firstBlood)return null;const side=e.killer.id===player.id?'self':e.killer.team===player.team?'ally':'enemy';if(e.multi>=2){const n=Math.min(5,e.multi);return {key:side+'-'+['','','double','triple','quadra','penta'][n],priority:100+n*10};}if(!e.shutdown&&e.streak>=3)return{key:side+'-spree'+Math.min(8,e.streak),priority:50+Math.min(8,e.streak)};return null;}
export class KillAnnouncer{
 constructor(owner){this.owner=owner;this.game=null;this.lastId=0;this.queue=[];this.active=null;}
 reset(game){this.game=game;this.lastId=Math.max(0,...(game.killEvents||[]).map(e=>e.id));this.silence();}
 silence(){this.queue=[];this.active=null;}
 update(g){if(this.game!==g){this.reset(g);return;}
  for(const e of g.killEvents||[]){if(e.id<=this.lastId)continue;this.lastId=e.id;if(!this.owner.enabled||g.time-e.time>6)continue;const cue=killCue(e,g.player);if(!cue||!KILL_AUDIO[cue.key])continue;this.queue=this.queue.filter(x=>x.event.killer.id!==e.killer.id||x.priority>=cue.priority);this.queue.push({...cue,event:e});}
  if(!this.owner.enabled||g.winner!=null){this.silence();return;}
  this.queue=this.queue.filter(x=>g.time-x.event.time<12).sort((a,b)=>b.priority-a.priority||a.event.id-b.event.id).slice(0,8);
  if(this.active){const upgrade=this.queue.find(x=>x.event.killer.id===this.active.event.killer.id&&x.priority>this.active.priority);if(upgrade&&g.time-this.active.started>=.8){this.owner.announcerVoice?.pause();this.owner.announcerVoice=null;this.active=null;}else if(!this.owner.announcerVoice||this.owner.announcerVoice.ended||g.time>=this.active.until){this.owner.announcerVoice?.pause();this.owner.announcerVoice=null;this.active=null;}}
  if(this.active||this.owner.announcerVoice&&!this.owner.announcerVoice.ended||!this.queue.length)return;
  const next=this.queue.shift(),clip=KILL_AUDIO[next.key];if(this.owner.play(clip.url,.64,true,'announcer'))this.active={...next,started:g.time,until:g.time+clip.duration+.25};
 }
}
