import {isClassicEffect} from './classic-vfx-integral.js';
export function classicParticleLife(raw,name,maxLife=16){
 const value=Number(raw)||1;
 if(isClassicEffect(name)&&value<0)return Infinity;
 return Math.max(.035,Math.min(maxLife,value));
}
