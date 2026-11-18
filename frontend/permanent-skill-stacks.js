// Installed ARAM_StackosaurusRex: StackModifier=1 (100% extra).
// Apply only at skill-stack acquisition, never to item/augment counters or
// during stat recomputation. Existing permanent stacks are not multiplied.
export function permanentSkillStackGain(unit,baseGain){
 return baseGain*(unit.augments?.includes('ARAM_StackosaurusRex')?2:1);
}
