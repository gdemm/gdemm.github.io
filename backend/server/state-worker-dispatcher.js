import {Worker} from 'node:worker_threads';
import {StateCodec} from './state-codec-core.js';
import {replaceableState,mergePendingState} from './state-merge.js';
export class StateWorkerDispatcher {
 constructor({useWorker=true,coalesceStates=true,maxControls=64}={}){Object.assign(this,{useWorker,coalesceStates,maxControls});this.channels=new Map();this.jobs=[];this.nextChannel=1;this.nextJob=1;this.roomVersions=new WeakMap();this.nextRoomVersion=1;this.pendingFlush=false;this.closed=false;this.metrics={jobs:0,states:0,sentStates:0,sentControls:0,encoded:0,coalesced:0,sent:0,sendFailures:0,cloneMs:0,codecMs:0,maxPending:0,maxWaitingStates:0,maxEncodeWaitMs:0,maxWriteMs:0,maxReadyWaitMs:0,maxAgeAtEncodeMs:0,flushes:0,largestBatch:0,maxCloneMs:0};if(useWorker)this.start();else this.inline=new StateCodec();}
 start(){const w=this.worker=new Worker(new URL('./state-codec-worker.js',import.meta.url));w.unref();w.on('message',({results})=>{for(const r of results)this.result(r);});const failed=()=>{if(this.worker!==w)return;this.worker=null;for(const c of this.channels.values())c.fail();this.channels.clear();this.jobs=[];if(!this.closed)this.start();};w.on('error',failed);w.on('exit',code=>{if(code!==0)failed();});}
 register(deliver,fail,{awaitWrite=false,onDelivered=()=>{}}={}){const key=this.nextChannel++;this.channels.set(key,{deliver,fail,awaitWrite,onDelivered,queue:[],encoding:null,ready:null,writing:null,pumping:false,epoch:0});return key;}
 enqueue(key,message,{delta=false,roomDelta=false,meta=null}={}){const c=this.channels.get(key);if(!c||this.closed)return false;this.metrics.jobs++;if(message.type==='state')this.metrics.states++;
  if(this.coalesceStates&&replaceableState(message)){
   const keep=[];for(const old of c.queue){if(old.kind==='send'&&replaceableState(old.message)){if(old.meta?.team===meta?.team&&old.meta?.realmId===meta?.realmId)message=mergePendingState(old.message,message);this.metrics.coalesced++;}else keep.push(old);}c.queue=keep;
  }
  if(c.queue.filter(j=>j.kind==='send'&&!replaceableState(j.message)).length>=this.maxControls){c.fail();this.unregister(key);return false;}
  let roomVersion=0;if(message.type==='state'&&message.room){roomVersion=this.roomVersions.get(message.room);if(!roomVersion)this.roomVersions.set(message.room,roomVersion=this.nextRoomVersion++);}
  c.queue.push({kind:'send',key,id:this.nextJob++,message,delta,roomDelta,roomVersion,meta,epoch:c.epoch,enqueuedAt:performance.now()});
  this.metrics.maxPending=Math.max(this.metrics.maxPending,c.queue.length+(c.encoding?1:0)+(c.ready?1:0)+(c.writing?1:0));this.metrics.maxWaitingStates=Math.max(this.metrics.maxWaitingStates,c.queue.filter(j=>replaceableState(j.message)).length);this.pump(key,c);return true;
 }
 pump(key,c){
  if(c.pumping||this.closed||this.channels.get(key)!==c)return;c.pumping=true;
  try{
   if(!c.writing&&c.ready){const packet=c.ready;c.ready=null;this.write(key,c,packet);}
   if(this.channels.get(key)!==c||c.encoding||c.ready)return;
   while(c.queue.length){const job=c.queue.shift();if(job.kind!=='send'){this.queue(job);continue;}c.encoding=job;job.startedAt=performance.now();this.metrics.maxAgeAtEncodeMs=Math.max(this.metrics.maxAgeAtEncodeMs,job.startedAt-job.enqueuedAt);this.metrics.encoded++;const{meta,epoch,enqueuedAt,startedAt,...wire}=job;this.queue({...wire,now:Date.now()});return;}
  }finally{c.pumping=false;}
 }
 result(r){const c=this.channels.get(r.key),job=c?.encoding;if(!c||!job||job.id!==r.id)return;c.encoding=null;this.metrics.codecMs+=r.codecMs;this.metrics.maxEncodeWaitMs=Math.max(this.metrics.maxEncodeWaitMs,performance.now()-job.startedAt-r.codecMs);c.ready={result:r,job,readyAt:performance.now()};this.pump(r.key,c);}
 write(key,c,{result,job,readyAt}){
  this.metrics.maxReadyWaitMs=Math.max(this.metrics.maxReadyWaitMs,performance.now()-readyAt);
  const started=performance.now();let finished=false;c.writing=job;
  const done=error=>{if(finished)return;finished=true;if(this.channels.get(key)!==c)return;this.metrics.maxWriteMs=Math.max(this.metrics.maxWriteMs,performance.now()-started);if(error){this.metrics.sendFailures++;c.fail();this.unregister(key);return;}this.metrics.sent++;this.metrics[job.message.type==='state'?'sentStates':'sentControls']++;if(job.epoch===c.epoch)c.onDelivered(job.message,job.meta);c.writing=null;this.pump(key,c);};
  try{c.deliver(result.data,done);if(!c.awaitWrite)done();}catch(e){done(e);}
 }
 reset(key){const c=this.channels.get(key);if(!c)return;c.epoch++;c.queue=c.queue.filter(j=>j.kind!=='reset'&&!replaceableState(j.message));c.queue.push({kind:'reset',key});this.pump(key,c);}
 unregister(key){if(!this.channels.delete(key))return;this.queue({kind:'delete',key});}
 queue(job){if(this.closed)return;this.jobs.push(job);if(!this.pendingFlush){this.pendingFlush=true;setImmediate(()=>this.flush());}}
 flush(){this.pendingFlush=false;if(!this.jobs.length||this.closed)return;const jobs=this.jobs;this.jobs=[];this.metrics.flushes++;this.metrics.largestBatch=Math.max(this.metrics.largestBatch,jobs.length);const t=performance.now();try{if(this.useWorker){if(!this.worker)throw Error('worker absent');this.worker.postMessage({jobs});}else for(const job of jobs){const result=this.inline.process(job);if(result)this.result(result);}}catch{for(const c of this.channels.values())c.fail();this.channels.clear();}const elapsed=performance.now()-t;this.metrics.cloneMs+=elapsed;this.metrics.maxCloneMs=Math.max(this.metrics.maxCloneMs,elapsed);}
 stats(){return{...this.metrics,channels:this.channels.size,active:[...this.channels.values()].filter(c=>c.encoding||c.ready||c.writing).length,encoding:[...this.channels.values()].filter(c=>c.encoding).length,ready:[...this.channels.values()].filter(c=>c.ready).length,writing:[...this.channels.values()].filter(c=>c.writing).length,waitingStates:[...this.channels.values()].reduce((n,c)=>n+c.queue.filter(j=>replaceableState(j.message)).length,0),queuedControls:[...this.channels.values()].reduce((n,c)=>n+c.queue.filter(j=>j.kind==='send'&&!replaceableState(j.message)).length,0)};}
 async close(){this.closed=true;this.jobs=[];this.channels.clear();const w=this.worker;this.worker=null;if(w)await w.terminate();}
}
