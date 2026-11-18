// null means the existing enemy-targeting rule should handle this spell.
export function classicFriendlyTarget(u,index,target){
 const hero=u.hero?.id;
 if(!(hero==='LeeSin'&&index===1)&&!(hero==='Galio'&&index===3))return null;
 if(!target?.alive||target.team!==u.team||(target.classicRealmId||0)!==(u.classicRealmId||0))return false;
 return hero==='Galio'?target.id!==u.id&&(target.kind==='hero'&&!target.classicClone):['hero','minion','ward'].includes(target.kind)||!!target.classicClone;
}
