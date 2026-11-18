// Zealot's installed Kiwi base values. {497ae878} is the Cherry (Arena)
// override, not Kiwi. Called only after all AP producers.
export function applyAPAugmentStats(unit,{critConverted=false}={}){
 if(!unit.augments?.includes('ARAM_Zealot'))return;
 const ap=Math.max(0,Number.isFinite(unit.ap)?unit.ap:0);
 const critical=.25+ap*.0005,attackSpeed=.35+ap*.0005;
 unit.itemAttackSpeed+=attackSpeed;
 if(critConverted)unit.itemConvertedCrit=Math.min(1,(unit.itemConvertedCrit||0)+critical*(unit.hero?.id==='Yasuo'?2.5:1));
 else unit.crit=Math.min(1,(unit.crit||0)+critical);
 unit.period=(unit.baseAttackSpeed?1/unit.baseAttackSpeed:.85)/(1+unit.itemAttackSpeed);
}
