import {CLASSIC_NATIVE} from './classic-data.js';
import {nativeSpell,value,passiveValue,effectValue,bonusAD,clamp} from './classic-common.js';
export function levelPart(part,level){
 if(part.__type==='ByCharLevelInterpolationCalculationPart')return (part.mStartValue||0)+((part.mEndValue||0)-(part.mStartValue||0))*clamp((level-1)/17,0,1);
 let total=part.mLevel1Value||0,growth=part.mInitialBonusPerLevel||0;
 for(let lv=2;lv<=level;lv++){for(const b of part.mBreakpoints||[])if(b.mLevel===lv){if(b.mBonusPerLevelAtAndAfter!==undefined)growth=b.mBonusPerLevelAtAndAfter;total+=b.mAdditionalBonusAtThisLevel||0;}total+=growth;}
 return total;
}
function stat(u,id=0,formula=0){
 const baseHP=u.hero.hp+Math.max(0,u.level-3)*70;
 const total={0:u.ap||0,2:u.damage||0,4:(u.itemAttackSpeed||0)+(u.augmentAttackSpeed||0)+(u.attackSpeedGrowth||0)*Math.max(0,u.level-1)/100,6:u.mr||0,8:u.crit||0,9:u.critDamageMultiplier||1.75,12:u.maxHp||0};
 if(!(id in total))throw new Error('Unsupported native stat '+id);
 if(formula===2){if(id===2)return bonusAD(u);if(id===6)return Math.max(0,(u.mr||0)-30);if(id===12)return Math.max(0,u.maxHp-baseHP);}
 return total[id];
}
export function calculation(u,i,name){
 const data=i<0?CLASSIC_NATIVE[u.hero.id].passive:nativeSpell(u,i),calculations=data.mSpellCalculations||{};
 const named=n=>i<0?passiveValue(u,n):value(u,i,n);
 const visit=(p,depth=0)=>{
  if(depth>30)throw new Error('Native calculation cycle');if(p==null)return 0;const recur=x=>visit(x,depth+1),type=p.__type;
  if(p.mSpellCalculationKey)return evalCalc(p.mSpellCalculationKey,depth+1);
  if(type==='CooldownMultiplierCalculationPart')return u.haste??100/(100+(u.abilityHaste||0));
  if(type==='{b22609db}')return named(p['{91d404a5}'])+named(p['{b2cd0eb0}'])*Math.max(0,(u.level||1)-1);
  if(type==='NumberCalculationPart')return p.mNumber||0;
  if(type==='NamedDataValueCalculationPart')return named(p.mDataValue);
  if(type==='EffectValueCalculationPart')return effectValue(u,i,p.mEffectIndex);
  if(type?.startsWith('ByCharLevel'))return levelPart(p,u.level||1);
  if(type==='StatByCoefficientCalculationPart')return stat(u,p.mStat,p.mStatFormula)*(p.mCoefficient||0);
  if(type==='StatByNamedDataValueCalculationPart')return stat(u,p.mStat,p.mStatFormula)*named(p.mDataValue);
  if(type==='StatBySubPartCalculationPart')return stat(u,p.mStat,p.mStatFormula)*recur(p.mSubpart);
  if(type==='SumOfSubPartsCalculationPart')return (p.mSubparts||[]).reduce((s,x)=>s+recur(x),0);
  if(type==='ProductOfSubPartsCalculationPart')return recur(p.mPart1)*recur(p.mPart2);
  if(type==='ClampSubPartsCalculationPart')return clamp((p.mSubparts||[]).reduce((s,x)=>s+recur(x),0),p.mFloor??-Infinity,p.mCeiling??Infinity);
  throw new Error('Unsupported native formula '+type);
 };
 const evalCalc=(key,depth=0)=>{if(depth>30)throw new Error('Native calculation cycle');const c=calculations[key];if(!c)throw new Error('Missing native calculation '+u.hero.id+':'+key);let n=c.mModifiedGameCalculation?evalCalc(c.mModifiedGameCalculation,depth+1):(c.mFormulaParts||[]).reduce((s,p)=>s+visit(p,depth+1),0);if(c.mMultiplier)n*=visit(c.mMultiplier,depth+1);return n;};
 return evalCalc(name);
}
