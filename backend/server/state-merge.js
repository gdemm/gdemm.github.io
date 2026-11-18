export const replaceableState=m=>m?.type==='state'&&m.game?.winner==null&&m.room?.phase!=='ended';
function sameBattle(a,b){return a.room?.id===b.room?.id&&(a.room?.round??0)===(b.room?.round??0)&&a.game?.local?.unitId===b.game?.local?.unitId&&a.game?.time<=b.game?.time;}
// Only pending, UNENCODED snapshots may be coalesced. Never drop an encoded delta.
export function mergePendingState(old,latest){
 if(!sameBattle(old,latest))return latest;
 const game={...latest.game};const units=new Set((game.units||[]).map(u=>u.id));
 for(const key of ['effects','combatEvents','killEvents','floaters']){
  const combined=new Map();let anonymous=0;
  for(const event of [...old.game[key]||[],...latest.game[key]||[]]){
   if(event?.source?.$unit!=null&&!units.has(event.source.$unit))continue;
   if(typeof event?.time==='number'&&event.time<game.time-5)continue;
   combined.set(event?.id??'anonymous:'+anonymous++,event);
  }
  const rows=[...combined.values()];rows.sort((a,b)=>Number.isFinite(a?.id)&&Number.isFinite(b?.id)?a.id-b.id:0);game[key]=rows.slice(-256);
 }
 return{...latest,game};
}
