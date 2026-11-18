// Snapshot visual identity at windup. Never changes damage, period, cooldown or
// the gameplay spell record used for projectile movement/collision.
export function qAttackPresentation(game,unit){
 const s=unit.classic||{},now=game.time;
 if(!(s.qUntil>now))return null;
 if(unit.hero?.id==='XinZhao'&&s.qHits>0){const n=Math.max(1,Math.min(3,4-Math.floor(s.qHits)));return{spell:`XinZhaoQThrust${n}`,animation:n===1?'q':`q${n}`};}
 if(unit.hero?.id==='MonkeyKing')return{spell:'MonkeyKingQAttack',animation:'crit'};
 if(unit.hero?.id==='Vayne')return{spell:s.rUntil>now?'VayneTumbleUltAttack':'VayneTumbleAttack',animation:'q-attack',missile:s.rUntil>now?'Vayne_R_mis':'Vayne_BA_mis'};
 return null;
}
