import {parentPort} from 'node:worker_threads';
import {StateCodec} from './state-codec-core.js';
const codec=new StateCodec();
parentPort.on('message',({jobs})=>{for(const job of jobs){const result=codec.process(job);if(result)parentPort.postMessage({results:[result]},[result.data.buffer]);}});
