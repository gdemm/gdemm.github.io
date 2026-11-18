import {inAugmentSpawn} from './augment-window.js';
import {healUnit} from './combat-support.js';
export const BOT_FOUNTAIN_HEAL_FRACTION=.15;
export function isFountainBot(unit){
 // Server-controlled room bots have negative peer IDs. A disconnected human
 // retains a positive peer ID and must never be mistaken for a bot.
 return Number.isInteger(unit.netPeerId)?unit.netPeerId<0:unit.netPeerId==null&&unit.player===false;
}
export function healFountainBot(game,unit,dt){
 return 0; // ARAM rule: no fountain recovery for anyone (user, 2026-11-18).
 if(!unit.alive||unit.kind!=='hero'||!isFountainBot(unit)||!inAugmentSpawn(game,unit)||!Number.isFinite(dt)||dt<=0)return 0;
 return healUnit(game,unit,unit,unit.maxHp*BOT_FOUNTAIN_HEAL_FRACTION*dt,{regen:true,raw:true,noEvents:true,kind:'fountain'});
}
