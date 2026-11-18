import {brushRegionAt} from './brush-regions.js';
import {healUnit} from './combat-support.js';
export function updateBrushAugments(game,unit){
 const region=unit.alive&&game.mapConfig?brushRegionAt(unit.x,unit.y):0;
 if(!unit.alive||!unit.augments?.includes('BrushPower'))unit.brushPowerUntil=0;
 else if(region)unit.brushPowerUntil=game.time+2;
 if(!unit.alive){unit.natureLastRegion=0;return;}
 if(!unit.augments?.includes('NatureIsHealing')){unit.natureLastRegion=0;return;}
 const entered=region&&region!==unit.natureLastRegion;unit.natureLastRegion=region;
 if(!entered)return;
 const timers=unit.natureBrushCooldowns??={};
 if((timers[region]??-Infinity)>game.time)return;
 timers[region]=game.time+20;
 const level=Math.max(1,Math.min(18,unit.level||1));
 const amount=40+260*(level-1)/17+.15*Math.max(0,unit.maxHp-unit.hp);
 const healed=healUnit(game,unit,unit,amount,{kind:'augment'});
 unit.natureHealingTotal=(unit.natureHealingTotal||0)+healed;
 if(healed>0)game.fx('ring',unit.x,unit.y,'#80ddb0',35,.6);
}
export function brushDamageMultiplier(game,source){
 return source?.alive&&source.augments?.includes('BrushPower')&&source.brushPowerUntil>game.time?1.2:1;
}
