// Hero identity is authoritative; an inherited structure.model must never win.
export function unitModelName(unit){if(unit.kind==='hero')return unit.hero?.id;if(unit.kind==='minion')return (unit.team?'Red':'Blue')+(unit.caster?'Caster':'Melee');return unit.model||(unit.kind==='tower'?'Turret':'Nexus');}
export function sameUnitIdentity(current,raw){const hero=raw.hero?.$hero??raw.hero?.id;return current.kind===raw.kind&&(raw.kind!=='hero'||current.hero?.id===hero)&&(raw.kind==='hero'||current.model===raw.model)&&current.team===raw.team;}

// A temporary visual override must never alter authoritative champion identity.
export function unitVisualModelName(unit,time){return unit.kind==='hero'&&unit.alive&&unit.polymorphUntil>time?'Poro':unitModelName(unit);}
