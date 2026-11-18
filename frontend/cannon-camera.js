// Preserve the pre-boarding camera until the entire ride has finished.
export class CannonCamera{
 constructor(bridge){this.bridge=bridge;this.saved=null;this.phase=null;this.game=null;this.destination=null;}
 update(game,playing,range){
  const b=this.bridge,u=game.player,phase=playing&&u?.alive?u.cannonState?.phase:null;
  if(this.game&&this.game!==game)this.restore();
  this.game=game;
  if((phase==='aim'||phase==='flight')&&!this.saved)this.saved=b.camera();
  if(phase==='aim'&&this.phase!=='aim'){
   b.setCamera({zoom:range>1500?.27:.42,manual:true,cam:{x:Math.max(250,Math.min(2950,u.x+(u.team?-1:1)*Math.min(range*.4,1300))),y:0}});
  }else if(phase==='flight'){
   const flight=u.cannonState;this.destination=Number.isFinite(flight.x)&&Number.isFinite(flight.y)?{x:flight.x,y:flight.y}:null;
   // Force follow every frame, even when the user was in free-camera mode,
   // scrolls, clicks the minimap, or the aim -> flight snapshot was skipped.
   b.setCamera({zoom:this.saved.zoom,manual:false,cam:{x:u.x,y:u.y}});
  }else if(phase!=='aim')this.restore(this.phase==='flight'&&playing?(u.alive&&this.destination?this.destination:{x:u.x,y:u.y}):null);
  this.phase=phase||null;
  return {phase:this.phase,active:!!this.saved,camera:b.camera()};
 }
 restore(position=null){if(this.saved)this.bridge.setCamera({...this.saved,cam:position?{...position}:{...this.saved.cam}});this.saved=null;this.phase=null;this.destination=null;}
}
