// Only JSON parsing leaves the UI thread. Every message, including delta bases,
// is delivered in order; no state or combat events are dropped.
export function createSocketDecoder(deliver,env=globalThis){
 let worker=null,url=null,closed=false,next=0;const pending=new Map();
 const parse=raw=>{try{return JSON.parse(raw);}catch{return null;}};
 const fallback=()=>{worker?.terminate();worker=null;for(const raw of pending.values()){const value=parse(raw);if(value&&!closed)deliver(value);}pending.clear();};
 try{if(env.Worker&&env.Blob&&env.URL?.createObjectURL){url=env.URL.createObjectURL(new env.Blob([`onmessage=({data})=>{let value=null;try{value=JSON.parse(data.raw)}catch{}postMessage({id:data.id,value})}`],{type:'text/javascript'}));worker=new env.Worker(url);worker.onmessage=({data})=>{if(closed||!pending.has(data.id))return;pending.delete(data.id);if(data.value)deliver(data.value);};worker.onerror=()=>fallback();}}catch{fallback();}finally{if(url)env.URL.revokeObjectURL(url);}
 return {decode(raw){if(closed)return;if(!worker){const value=parse(raw);if(value)deliver(value);return;}const id=next++;pending.set(id,raw);try{worker.postMessage({id,raw});}catch{fallback();}},close(){closed=true;worker?.terminate();worker=null;pending.clear();}};
}
