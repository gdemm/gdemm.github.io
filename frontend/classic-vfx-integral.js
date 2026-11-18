// Deterministic integral of the renderer's piecewise-linear lifetime curve.
// Curve times are normalized particle age; convert their integral to seconds.
export function integrateParticleRate(value,age,life,curve,fallback=0){
 const zero=Array.isArray(fallback)?fallback.map(()=>0):0;
 if(!value||!(age>0)||!(life>0))return zero;
 if(life===Infinity){const rate=curve(value,0,fallback);return Array.isArray(rate)?rate.map(v=>v*age):Number(rate)*age;}
 const end=Math.min(age/life,1),times=value.dynamics?.times||[];
 const knots=[0,...new Set(times.filter(t=>Number.isFinite(t)&&t>0&&t<end)),end].sort((a,b)=>a-b);
 let result=zero;
 for(let i=1;i<knots.length;i++){
  const a=knots[i-1],b=knots[i],va=curve(value,a,fallback),vb=curve(value,b,fallback),weight=(b-a)*life/2;
  result=Array.isArray(result)?result.map((v,k)=>v+((va[k]||0)+(vb[k]||0))*weight):result+(Number(va)+Number(vb))*weight;
 }
 return result;
}
export const isClassicEffect=name=>/^(Kaisa|Mordekaiser|LeeSin|Yone|Vayne|Tristana|Galio|Ekko|Riven|Irelia|Akali|Diana|Zed|XinZhao|JarvanIV|Aatrox|MonkeyKing)_/i.test(name);
