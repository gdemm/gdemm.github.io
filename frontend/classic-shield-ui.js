export function magicShieldAmount(u,time){if(!u.alive)return 0;return Math.max(0,u.classicGalioShield||0)+(u.classicMagicShields||[]).reduce((sum,s)=>sum+(s.until>time?Math.max(0,s.remaining||0):0),0);}
export function visibleShieldAmount(u,time){return Math.max(0,u.shield||0)+magicShieldAmount(u,time);}
