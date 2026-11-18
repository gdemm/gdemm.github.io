export function trapVisibleTo(zone,team){
 return zone.kind!=='teemoTrap'||(team===0||team===1)&&(zone.team??zone.source?.team)===team;
}
// Scope already-encoded snapshots before connection delta baselines are built.
// Enemy clients never receive mushroom placement coordinates.
export function teamTrapView(snapshot,team){
 const teams=new Map((snapshot.units||[]).map(u=>[u.id,u.team]));
 const ownerTeam=o=>o.ownerTeam??o.team??teams.get(o.source?.$unit??o.sourceUnitId??o.ownerUnitId);
 const zones=(snapshot.zones||[]).filter(z=>z.kind!=='teemoTrap'||ownerTeam(z)===team&&(team===0||team===1));
 const effects=(snapshot.effects||[]).filter(e=>e.nativeName!=='Teemo_Base_R_CollisionBox_Ring'||ownerTeam(e)===team&&(team===0||team===1));
 const combatEvents=(snapshot.combatEvents||[]).filter(e=>!(e.hero==='Teemo'&&e.state==='r'&&e.phase==='cast')||ownerTeam(e)===team&&(team===0||team===1));
 return {...snapshot,zones,effects,combatEvents};
}
