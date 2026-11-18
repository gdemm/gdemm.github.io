const has=u=>u?.augments?.includes('ARAM_TankEngine');
export const tankEngineMultiplier=u=>1+.05*Math.max(0,u.augmentTankStacks||0);
function refresh(g,u,oldStacks){if(g.refreshAugmentStats){g.refreshAugmentStats(u);return;}const old=u.maxHp;u.maxHp*=tankEngineMultiplier(u)/(1+.05*oldStacks);if(u.alive)u.hp=Math.min(u.maxHp,u.hp+u.maxHp-old);u.augmentSize=(u.augmentSize||1)*tankEngineMultiplier(u)/(1+.05*oldStacks);}
export function tankEngineTakedown(g,u,v){if(!has(u)||!v?.hero&&v?.kind!=='hero')return false;const token=`${v.id??'hero'}:${g.time}`;if(u.tankEngineLastTakedown===token)return false;u.tankEngineLastTakedown=token;const old=u.augmentTankStacks||0;u.augmentTankStacks=old+1;refresh(g,u,old);return true;}
export function tankEngineDeath(g,u){if(!has(u))return;const old=u.augmentTankStacks||0;u.augmentTankStacks=Math.floor(old*35/100);refresh(g,u,old);}
