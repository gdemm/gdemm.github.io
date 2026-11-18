export function inAugmentSpawn(game,u=game.player){return u.team===1?u.x>=(game.mapConfig?2990:2720):u.x<=(game.mapConfig?210:480);}
export function canSelectAugment(game,u=game.player){return !!u&&u.alive!==false&&game.winner==null&&u.augmentSpawnWindow!==false&&inAugmentSpawn(game,u);}
export function updateAugmentWindow(game,u){if(!u.alive||!inAugmentSpawn(game,u))u.augmentSpawnWindow=false;}
