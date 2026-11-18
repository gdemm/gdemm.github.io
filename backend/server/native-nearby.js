import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),enabled=process.env.ARAM_NATIVE_SPATIAL==='1';
const kernel=enabled?require('./native/radius.node'):null;
const contexts=new WeakMap(),buffers=new WeakMap();
export const nativeSpatialEnabled=()=>!!kernel;
export function withNativeDecision(g,fn){
 if(!kernel)return fn();
 let b=buffers.get(g);const count=g.units.length;if(!b||b.capacity<count){const capacity=Math.max(64,count*2);b={capacity,xy:new Float64Array(capacity*2),out:new Uint32Array(capacity)};buffers.set(g,b);}
 let maxTowerRange=0;for(let i=0;i<count;i++){const u=g.units[i];b.xy[i*2]=u.x;b.xy[i*2+1]=u.y;if(u.kind==='tower')maxTowerRange=Math.max(maxTowerRange,u.range||180);}
 const previous=contexts.get(g);contexts.set(g,{...b,units:g.units,count,maxTowerRange});try{return fn();}finally{if(previous)contexts.set(g,previous);else contexts.delete(g);}
}
// Broad phase ONLY: callers keep exact range, visibility, team and safety checks.
export function nearbyCandidates(g,point,r){const c=contexts.get(g);if(!c||g.units!==c.units||g.units.length!==c.count||!Number.isFinite(point?.x)||!Number.isFinite(point?.y)||!Number.isFinite(r)||r<0)return g.units;
 const count=kernel.radiusIndices(c.xy,c.count,point.x,point.y,r,c.out),out=new Array(count);for(let i=0;i<count;i++)out[i]=c.units[c.out[i]];return out;
}
export function nearbyTowers(g,point){const c=contexts.get(g);return c?nearbyCandidates(g,point,c.maxTowerRange+35):g.units;}
