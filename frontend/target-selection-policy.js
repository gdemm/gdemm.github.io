// Match the unit classes accepted by the authoritative spell implementations.
// null delegates unchanged legacy spells to their existing policy.
const MOBILE_ENEMY={Irelia:[0],XinZhao:[2],Vayne:[2],MonkeyKing:[2],Tristana:[2,3]};
const CHAMPION_ONLY={Mordekaiser:[3],Zed:[3],Akali:[3],JarvanIV:[3],LeeSin:[3]};
export function targetedUnitOverride(u,index,target){
 const hero=u.hero?.id;if(!target?.alive)return false;
 if((u.classicRealmId||0)!==(target.classicRealmId||0))return false;
 if(target.team!==u.team&&target.teemoStealth)return false;
 if(hero==='Jax'&&index===0)return target!==u&&target.id!==u.id&&['hero','minion'].includes(target.kind);
 if(hero==='Ryze'&&[1,2].includes(index)||hero==='Diana'&&index===2)return target.team!==u.team&&['hero','minion'].includes(target.kind);
 if(CHAMPION_ONLY[hero]?.includes(index))return target.team!==u.team&&target.kind==='hero'&&!target.classicClone;
 if(MOBILE_ENEMY[hero]?.includes(index)){
  const kinds=hero==='Tristana'&&index===2?['hero','minion','clone','tower','inhibitor','nexus']:['hero','minion','clone'];
  return target.team!==u.team&&kinds.includes(target.kind);
 }
 return null;
}
const BODY_RANGE={Irelia:[0],XinZhao:[2],Vayne:[2],MonkeyKing:[2],Tristana:[2,3],Diana:[2],Mordekaiser:[3],Zed:[3],Akali:[3],JarvanIV:[3],LeeSin:[3]};
export function targetedCastRange(g,u,index,target,nativeRange,scale){
 const hero=u.hero?.id==='Sylas'&&index===3&&u.sylasStolenHero?u.sylasStolenHero.id:u.hero?.id;
 if(hero==='XinZhao'&&index===2)nativeRange=target.classicXinMarked?.[u.id]>g.time?1100:650;
 if(hero==='Galio'&&index===3)return nativeRange*scale;
 return nativeRange*scale+(target.radius||0)+(BODY_RANGE[hero]?.includes(index)?u.radius||0:0);
}
export function targetPosition(g,u){return g.hasAuthoritativeSnapshot&&Number.isFinite(u.netX)&&Number.isFinite(u.netY)?{x:u.netX,y:u.netY}:{x:u.x,y:u.y};}
