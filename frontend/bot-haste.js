// Classify by authoritative identity, never temporary game.player selection.
export const isBotUnit=u=>!!u&&(u.smartBot===true||u.bot===true||Number(u.netPeerId)<0);
export const grantedModeHaste=u=>isBotUnit(u)?0:300;
export function syncModeHaste(u){const grant=grantedModeHaste(u),old=u.modeHasteGrant??300;u.abilityHaste=Math.max(0,(u.abilityHaste??old)-old+grant);u.modeHasteGrant=grant;u.haste=100/(100+u.abilityHaste);}
