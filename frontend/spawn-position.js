// Each team supports ten combatants. Slot IDs must never push late joiners
// beyond the fountain's augment-selection boundary after repeated turnover.
export function mappedSpawnPosition(team,slot){
 const index=Math.max(0,Math.floor(Number(slot)||0))%10;
 return{x:team?3160-index*14:40+index*14,y:(index-2)*28};
}
export function freeTeamSlot(units,team){
 const occupied=new Set(units.filter(u=>u.kind==='hero'&&u.team===team).map(u=>u.slot));
 let slot=0;while(occupied.has(slot))slot++;return slot;
}
