import {itemTenacity} from './item-actives.js';
export const polymorphed=(g,u)=>!!u?.alive&&u.polymorphUntil>g.time;
export function feyAfterDamage(g,{source,target,hitDamage,meta={}}){
 if(!source?.augments?.includes('ARAM_FeyMagic')||!target?.alive||target.kind!=='hero'||target.team===source.team||hitDamage<=0||meta.itemProc||meta.augmentProc||meta.state?.[0]!=='r'||target.unstoppableUntil>g.time)return;
 const timers=target.feyCooldowns??={};if((timers[source.id]??-Infinity)>g.time)return;timers[source.id]=g.time+15;
 target.polymorphUntil=Math.max(target.polymorphUntil||0,g.time+2*itemTenacity(g,target));target.attackWindup=null;
 if(target.mfChannel||target.jhinChannel||target.yiMeditateUntil>g.time){target.mfChannel=null;target.jhinChannel=null;target.yiMeditateUntil=0;target.castUntil=g.time;target.animUntil=g.time;}
}
export const polymorphSlow=(g,u)=>polymorphed(g,u)&&!(u.yiRUntil>g.time)?60/(g.mapConfig?.scale||2):0;
