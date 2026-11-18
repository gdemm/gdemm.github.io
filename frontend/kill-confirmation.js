export const KILL_CONFIRM_URL='../r20260930-kill-confirm-1/kill-confirm.mp3';
export class KillConfirmation{
 constructor(owner){this.owner=owner;this.game=null;this.lastId=0;}
 reset(game){this.game=game;this.lastId=Math.max(0,...(game.killEvents||[]).map(e=>e.id));}
 update(game){if(this.game!==game){this.reset(game);return;}let play=false;
  for(const e of game.killEvents||[]){if(e.id<=this.lastId)continue;this.lastId=e.id;
   if(this.owner.enabled&&game.winner==null&&!e.execution&&e.killer?.id===game.player?.id&&e.victim?.id!==game.player?.id&&game.time-e.time>=0&&game.time-e.time<=2)play=true;
  }
  // Simultaneous AOE kills share one stinger; each later kill gets its own.
  if(play)this.owner.play(KILL_CONFIRM_URL,.38,false,'fx');
 }
}
