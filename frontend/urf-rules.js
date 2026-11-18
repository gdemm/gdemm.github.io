// Riot patch 11.3: URF grants 300 ability haste and applies it to summoner spells.
// Cooldown multiplier = 100 / (100 + ability haste) = 0.25.
export const DEFAULT_GOLD=99999;
export const URF_ABILITY_HASTE=300;
export const URF_COOLDOWN_MULTIPLIER=100/(100+URF_ABILITY_HASTE);
export const urfCooldown=base=>base*URF_COOLDOWN_MULTIPLIER;
