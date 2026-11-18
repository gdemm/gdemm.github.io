/* Classic bootstrap: select a working asset origin before starting the same-origin game modules. */
(function(root){
 'use strict';
 function select(routes,{release,timeoutMs=7000,fetcher=root.fetch.bind(root),now=()=>root.performance.now(),setTimer=root.setTimeout.bind(root),clearTimer=root.clearTimeout.bind(root)}={}){
  const fallback=routes.find(route=>route.id==='cloudflare')||routes.find(route=>route.id==='direct');
  if(!fallback)throw new Error('Same-origin fallback is required');
  return new Promise(resolve=>{
   const controller=new AbortController();let settled=false,failures=0;
   const finish=result=>{if(settled)return;settled=true;clearTimer(timer);controller.abort();resolve(result);};
   const timer=setTimer(()=>finish({...fallback,ms:timeoutMs,fallback:true,reason:'timeout'}),timeoutMs);
   for(const route of routes){
    const start=now();
    Promise.resolve().then(()=>fetcher(new URL('cdn-version.json',route.base).href,{mode:'cors',credentials:['cloudflare','direct'].includes(route.id)?'same-origin':'omit',cache:'no-store',signal:controller.signal}))
     .then(response=>{if(!response.ok)throw new Error('Asset origin unavailable');return response.json();})
     .then(version=>{if(version.release!==release)throw new Error('Asset version mismatch');finish({...route,ms:Math.round(now()-start),fallback:false});})
     .catch(()=>{if(++failures===routes.length)finish({...fallback,ms:Math.round(now()-start),fallback:true,reason:'unavailable'});});
   }
  });
 }
 function loadClassic(url,{integrity}={}){
  return new Promise((resolve,reject)=>{
   let failure=null;root.__ARAM_APP_READY__=false;
   const capture=event=>{if(event.error)failure=event.error;};
   root.addEventListener('error',capture);
   const script=document.createElement('script');script.setAttribute('data-cfasync','false');if(integrity){script.integrity=integrity;script.crossOrigin='anonymous';}script.src=url;
   const cleanup=()=>root.removeEventListener('error',capture);
   script.onload=()=>{cleanup();if(root.__ARAM_APP_READY__)resolve();else reject(failure||new Error('启动脚本没有完成初始化。'));};
   script.onerror=()=>{cleanup();script.remove?.();const error=new Error('无法下载游戏启动脚本，请检查当前网络。');error.downloadFailed=true;reject(error);};
   document.body.append(script);
  });
 }
 async function boot(config,{importer=loadClassic}={}){
  const routes=config.routes.filter(route=>{try{const url=new URL(route.base);return url.protocol==='https:'&&(!url.port||url.port==='443');}catch{return false;}});
  const result=await select(routes,{release:config.release,timeoutMs:7000});
  // Keep real-time commands independent of whichever static origin wins.
  root.__ARAM_GAME_API_ORIGIN__=config.apiOrigin;
  const base=document.querySelector('base');base.href=result.base;
  document.documentElement.dataset.assetRoute=result.id;
  document.documentElement.dataset.assetBase=result.base;
  document.documentElement.dataset.assetProbeMs=String(result.ms);
  // A self-contained classic bundle avoids mobile module/import-map support.
  // Only bulk model/map/texture requests follow the measured asset base.
  const scriptBase=config.scriptBase||routes.find(route=>route.id==='cloudflare').base;
  document.documentElement.dataset.scriptBase=scriptBase;
  const moduleUrl=config.bundleUrl;
  if(!moduleUrl)throw new Error('缺少游戏启动包地址');
  try{
   const candidates=[...new Set([moduleUrl,...(config.bundleFallbackUrls||[])])];let loaded=false;
   for(let index=0;index<candidates.length;index++){
    const url=candidates[index];document.documentElement.dataset.bootstrapAttempt=String(index+1);
    try{await importer(url,{integrity:config.bundleIntegrity});document.documentElement.dataset.bootstrapUrl=url;loaded=true;break;}
    catch(error){if(!error.downloadFailed||index===candidates.length-1)throw error;console.warn('[ARAM bootstrap] download failed, trying backup',index+1);}
   }
   if(!loaded)throw new Error('启动脚本下载失败');
   document.documentElement.dataset.gameModule='ready';
  }catch(error){
   document.documentElement.dataset.gameModule='failed';
   const message=document.createElement('div');message.setAttribute('role','alert');
   const heading=document.createElement('strong');heading.textContent='游戏启动失败';
   const detail=document.createElement('p');detail.textContent=error?.message||'脚本未能加载，请检查网络连接。';
   Object.assign(message.style,{position:'fixed',inset:'0',zIndex:20000,background:'#07131e',color:'#e8d8a9',display:'grid',placeContent:'center',padding:'30px',overflowWrap:'anywhere'});
   const retry=document.createElement('button');retry.textContent='重新加载';retry.onclick=()=>root.location.reload();message.append(heading,detail,retry);document.body.append(message);
   console.error('[ARAM startup]',moduleUrl,error);
  }
  console.info('[ARAM assets]',result.id,result.ms+'ms',result.base);
  return result;
 }
 root.AramAssetRouter={select,boot,loadClassic};
 if(root.__ARAM_ASSET_ROUTES__)boot(root.__ARAM_ASSET_ROUTES__);
})(globalThis);
