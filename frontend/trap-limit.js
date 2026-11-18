export const MAX_TRAPS_PER_UNIT=24;
export const isTrapZone=z=>['trap','jhinTrap','teemoTrap'].includes(z.kind);
export function addTrapZone(g,zone){g.zones??=[];if(isTrapZone(zone)){const sourceId=zone.source?.id,own=g.zones.filter(z=>isTrapZone(z)&&z.source?.id===sourceId&&z.age<z.duration);const remove=new Set(own.slice(0,Math.max(0,own.length-MAX_TRAPS_PER_UNIT+1)));for(const z of remove){z.duration=z.age;z.removedByTrapLimit=true;}g.zones=g.zones.filter(z=>!remove.has(z));}g.zones.push(zone);return zone;}
