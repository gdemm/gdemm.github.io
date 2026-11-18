import {randomInt} from 'node:crypto';

// Only heroes with both continuous-bot ability decisions and shop plans.
export const CONTINUOUS_BOT_HEROES=["Ashe", "Lux", "Ahri", "Ezreal", "Garen", "Jinx", "Yasuo", "Sett"];

export function chooseAddedBotHero(existing=[],pick=randomInt){
 const counts=new Map(CONTINUOUS_BOT_HEROES.map(id=>[id,existing.filter(hero=>hero===id).length]));
 const minimum=Math.min(...counts.values());
 const candidates=CONTINUOUS_BOT_HEROES.filter(id=>counts.get(id)===minimum);
 return candidates[pick(candidates.length)];
}

export function chooseContinuousBotHeroes(previous=[],pick=randomInt){
 const chosen=[];
 for(let i=0;i<Math.max(2,previous.length);i++){
  let candidates=CONTINUOUS_BOT_HEROES.filter(id=>id!==previous[i]&&!chosen.includes(id));
  if(!candidates.length)candidates=CONTINUOUS_BOT_HEROES.filter(id=>id!==previous[i]);
  if(!candidates.length)candidates=CONTINUOUS_BOT_HEROES;
  chosen.push(candidates[pick(candidates.length)]);
 }
 return chosen;
}
