// Equipment cooldowns are a separate clock from champion ability haste.
// Apex Inventor's installed Kiwi RootSpell grants 100 item haste.
// Only actual cooldowns use this clock, not effect durations or tick cadence.
export const APEX_INVENTOR_ITEM_HASTE=100;
export function equipmentHaste(unit){
 const base=Number.isFinite(unit?.itemHaste)?Math.max(0,unit.itemHaste):0;
 return base+(unit?.augments?.includes('ARAM_ApexInventor')?APEX_INVENTOR_ITEM_HASTE:0);
}
export function equipmentCooldown(unit,seconds){
 if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Equipment cooldown must be finite and non-negative');
 return seconds/(1+equipmentHaste(unit)/100);
}
export function equipmentReadyAt(game,unit,seconds){
 const duration=equipmentCooldown(unit,seconds),now=game.time;
 if(!Number.isFinite(now)||now<0)throw new RangeError('Equipment clock must be finite and non-negative');
 if(seconds===0)return now;
 // A positive cooldown must advance at least one representable clock step.
 return Math.max(now+duration,now+Number.EPSILON*Math.max(1,now));
}
// Charge refill is bounded by capacity, never by elapsed time or tiny intervals.
export function refillEquipmentCharges(game,unit,state,{nextKey,countKey,capacity,seconds}){
 if(!Number.isInteger(capacity)||capacity<1||!Number.isFinite(seconds)||seconds<=0)throw new RangeError('Invalid equipment recharge');
 state[countKey]=Math.min(capacity,Math.max(0,Number.isFinite(state[countKey])?state[countKey]:0));
 if(!Number.isFinite(state[nextKey])||state[nextKey]<=0)state[nextKey]=equipmentReadyAt(game,unit,seconds);
 for(let i=0;i<capacity&&state[countKey]<capacity&&game.time>=state[nextKey];i++){
  state[countKey]++;
  state[nextKey]=equipmentReadyAt({time:state[nextKey]},unit,seconds);
 }
 // When full, unused historical charges are discarded rather than looping.
 if(state[countKey]===capacity&&state[nextKey]<=game.time)state[nextKey]=equipmentReadyAt(game,unit,seconds);
}
