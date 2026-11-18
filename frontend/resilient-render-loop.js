// A transient render failure must not permanently stop input/minimap/model frames.
export function startResilientRender({render,recover,onError,onFatal,schedule=requestAnimationFrame,maxFps=0}){
 let consecutive=0,failed=false,lastAt=-1e9;const minGap=maxFps?1000/maxFps-2:0;
 function tick(now){
  try{
   if(failed)return;
   if(minGap&&now-lastAt<minGap)return;lastAt=now;
   render(now);consecutive=0;
  }catch(error){
   consecutive++;
   try{onError?.(error,consecutive);}catch{}
   if(consecutive===1){try{recover?.();}catch(recoveryError){try{onError?.(recoveryError,consecutive);}catch{}}}
   if(consecutive>=3){failed=true;try{onFatal?.(error);}catch{}}
  }finally{if(!failed)schedule(tick);}
 }
 schedule(tick);
 return {restart(){if(!failed)return;failed=false;consecutive=0;schedule(tick);}};
}
