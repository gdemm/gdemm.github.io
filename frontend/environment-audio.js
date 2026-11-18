// Dedicated bed: combat/UI pools cannot evict or duplicate the map ambience.
export class EnvironmentAudio{
 constructor(create=url=>new Audio(url)){this.create=create;this.audio=null;this.game=null;}
 stop(){if(this.audio)this.audio.pause();this.audio=null;this.game=null;}
 update(game,enabled,clips){const clip=clips?.['map12-ambience'];if(!enabled||!clip||!game?.mapConfig||game.winner!=null){this.stop();return;}
  if(this.game!==game){this.stop();this.game=game;const a=this.create(clip.url);this.audio=a;a.loop=true;a.preload='auto';a.volume=.18;a.play().catch(()=>{/* Browser autoplay policy: retry only after a new enable/start, not every frame. */});}
 }
}
