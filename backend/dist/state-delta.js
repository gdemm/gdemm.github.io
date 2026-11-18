const rowDiffCache=new WeakMap();
function rowDiff(prev,row){let byPrevious=rowDiffCache.get(row);if(!byPrevious)rowDiffCache.set(row,byPrevious=new WeakMap());let diff=byPrevious.get(prev);if(diff)return diff;const fields={},remove=Object.keys(prev).filter(k=>!(k in row));for(const[f,value]of Object.entries(row))if(!equal(prev[f],value))fields[f]=value;diff={fields,remove};byPrevious.set(prev,diff);return diff;}
const entities=new Set(['units','projectiles','zones','combatEvents']);

// This runs for every connected player on every network frame. JSON.stringify
// used to allocate thousands of temporary strings while comparing entity
// fields, which amplified event-loop stalls in larger rooms.
const equal=(a,b)=>{
 if(a===b)return true;
 if(a==null||b==null||typeof a!=='object'||typeof b!=='object')return false;
 if(Array.isArray(a)){if(!Array.isArray(b)||a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!equal(a[i],b[i]))return false;return true;}
 if(Array.isArray(b))return false;
 const ak=Object.keys(a),bk=Object.keys(b);if(ak.length!==bk.length)return false;
 for(const k of ak)if(!Object.prototype.hasOwnProperty.call(b,k)||!equal(a[k],b[k]))return false;
 return true;
};
export function stateDelta(before,after){const set={},records={};for(const[k,v]of Object.entries(after)){if(entities.has(k)){const old=new Map((before[k]||[]).map(x=>[x.id,x])),changes=[];for(const row of v){const prev=old.get(row.id);if(!prev){changes.push({id:row.id,set:row,remove:[]});continue;}const {fields,remove}=rowDiff(prev,row);if(Object.keys(fields).length||remove.length)changes.push({id:row.id,set:fields,remove});}if(changes.length||!equal((before[k]||[]).map(x=>x.id),v.map(x=>x.id)))records[k]={ids:v.map(x=>x.id),changes};}else if(!equal(before[k],v))set[k]=v;}return{set,records};}
export function applyStateDelta(before,patch){const next={...before,...patch.set};for(const[k,p]of Object.entries(patch.records||{})){const rows=new Map((before[k]||[]).map(x=>[x.id,x]));for(const c of p.changes){const r={...rows.get(c.id),...c.set};for(const f of c.remove)delete r[f];rows.set(c.id,r);}next[k]=p.ids.map(id=>rows.get(id));}return next;}
