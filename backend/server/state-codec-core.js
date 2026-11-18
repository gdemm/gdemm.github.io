import {stateDelta} from '../dist/state-delta.js';
export class StateCodec {
 constructor(){this.channels=new Map();this.encoder=new TextEncoder();}
 process(job){
  if(job.kind==='delete'){this.channels.delete(job.key);return null;}
  if(job.kind==='reset'){const c=this.channels.get(job.key);if(c)c.previous=null;return null;}
  const began=performance.now();let c=this.channels.get(job.key);if(!c)this.channels.set(job.key,c={previous:null,sequence:0,lastFull:0,roomVersion:0});
  const{message,delta,roomDelta,roomVersion,now}=job;let wire=message;
  if(message.type==='state'&&delta){const terminal=message.room?.phase==='ended'&&message.game?.winner!=null,seq=++c.sequence;
   const full=terminal||!c.previous||now-c.lastFull>5000||c.previous.room.id!==message.room.id||message.game.time<c.previous.game.time;
   wire=full?{...message,seq}:{type:'stateDelta',seq,base:seq-1,...(roomDelta&&c.roomVersion===roomVersion?{}:{room:message.room}),patch:stateDelta(c.previous.game,message.game)};
   c.previous=message;c.roomVersion=roomVersion;if(full)c.lastFull=now;
  }
  return{key:job.key,id:job.id,data:this.encoder.encode(JSON.stringify(wire)),codecMs:performance.now()-began};
 }
}
