// Mobile networks / VPNs drop or silently stall big asset downloads. A drop throws "Failed to fetch";
// a stall never settles, which froze the battle loading bar at a percentage forever.
// For same-origin GETs: read the whole body here with an idle watchdog (no bytes for STALL_MS -> abort),
// and retry network errors, stalls and 5xx up to 5 times with backoff.
const nativeFetch=globalThis.fetch.bind(globalThis);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const STALL_MS=15000,TRIES=5;
async function attempt(input,init){
 const ctl=new AbortController();let timer;
 const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>ctl.abort(new Error('stalled')),STALL_MS);};
 arm();
 try{
  const r=await nativeFetch(input,{...init,signal:ctl.signal});
  if(!r.body||r.status>=500){clearTimeout(timer);return r;}
  const reader=r.body.getReader(),chunks=[];let size=0;
  for(;;){arm();const {done,value}=await reader.read();if(done)break;chunks.push(value);size+=value.length;}
  clearTimeout(timer);
  const buf=new Uint8Array(size);let o=0;for(const c of chunks){buf.set(c,o);o+=c.length;}
  return new Response(r.status===204||r.status===304?null:buf,{status:r.status,statusText:r.statusText,headers:r.headers});
 }finally{clearTimeout(timer);}
}
globalThis.fetch=async function(input,init){
 const url=typeof input==='string'?input:input instanceof URL?input.href:input?.url||'';
 const method=(init?.method||input?.method||'GET').toUpperCase();
 let same=false;try{same=new URL(url,location.href).origin===location.origin;}catch(e){}
 if(!same||method!=='GET'||init?.signal||(typeof Request!=='undefined'&&input instanceof Request))return nativeFetch(input,init);
 let last;
 for(let i=0;i<TRIES;i++){
  try{const r=await attempt(input,init);if(r.status<500||i===TRIES-1)return r;last=new Error('HTTP '+r.status);}
  catch(e){last=e;}
  await sleep(600*(i+1));
 }
 throw last;
};
