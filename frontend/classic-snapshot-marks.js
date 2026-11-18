// Public presentation/targeting data for lightweight minions and structures.
// Never copy source actor objects or authoritative damage bookkeeping.
export function classicVisualMarks(encoded){
 const result={};
 for(const key of ['classicPlasma','classicEkkoMarks','classicTristanaBombs']){
  if(!encoded[key])continue;
  result[key]=Object.fromEntries(Object.entries(encoded[key]).map(([id,mark])=>[id,{stacks:mark.stacks,until:mark.until}]));
 }
 for(const key of ['classicIreliaMark','classicMoonlight','classicXinMarked'])if(encoded[key])result[key]={...encoded[key]};
 return result;
}
