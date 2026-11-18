// Wait for all native fragments before spawning a destruction effect. Never fake art.
export class DeferredModelGate {
 constructor({has,load,onError=()=>{},now=()=>performance.now()}){Object.assign(this,{has,load,onError,now});this.generation=0;this.pending=new Map();this.retryAt=new Map();}
 reset(){this.generation++;this.pending.clear();this.retryAt.clear();}
 run(key,names,spawn,valid=()=>true){
  if(!valid())return false;
  if(names.every(this.has)){spawn();return true;}
  if(this.pending.has(key)||(this.retryAt.get(key)||0)>this.now())return false;
  const generation=this.generation;
  const job=Promise.resolve().then(()=>this.load(names)).then(()=>{if(generation===this.generation&&valid()&&names.every(this.has))spawn();}).catch(error=>{if(generation===this.generation){this.retryAt.set(key,this.now()+1000);this.onError(error);}}).finally(()=>{if(this.pending.get(key)===job)this.pending.delete(key);});
  this.pending.set(key,job);return false;
 }
}
