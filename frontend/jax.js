import {COMBAT_DATA} from './combat-data.js';
import {augmentOnCast,canCastWithAugments,combatCooldownMultiplier} from './augment-rules.js';
const k=g=>1/(g.mapConfig?.scale||2),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const data=i=>COMBAT_DATA.Jax.spells[COMBAT_DATA.Jax.abilityNames[i]].data;
export const jaxValue=(u,i,name,fallback)=>data(i).DataValues?.find(v=>v.name===name)?.values?.[u.spellRanks?.[i]||1]??fallback;
const fx=(g,u,name,target=u,duration=.5)=>g.fx('native',target.x,target.y,'#b78aec',40,duration,{hero:'Jax',nativeName:name,nativeDuration:duration,follow:target});
export function jaxAttackSpeed(u,time){return u.hero?.id==='Jax'&&(u.jaxStacks||0)>0?(u.jaxStacks||0)*(.05+.015*Math.floor((Math.min(18,u.level)-1)/3)):0;}
export function jaxDodge(g,v,source,basic){if(v.hero?.id!=='Jax'||!basic||v.jaxEUntil<=g.time||!v.jaxEUntil||!['hero','minion'].includes(source?.kind))return false;v.jaxDodges=Math.min(5,(v.jaxDodges||0)+1);fx(g,v,'Jax_base_E_buf');return true;}
export function jaxPostStats(g,u){if(u.jaxRUntil>g.time){u.armor+=u.jaxRArmor||0;u.mr+=(u.jaxRArmor||0)*.6;}}
export function jaxOnAttack(g,u,v){
 if(u.hero?.id!=='Jax')return;
 u.jaxStacks=Math.min(8,(u.jaxStacks||0)+1);u.jaxStackDecay=g.time+2.5;
 if(v.alive&&u.jaxWUntil>g.time){u.jaxWUntil=0;g.hurt(v,jaxValue(u,1,'Damage',50)+.6*(u.ap||0),u,0,0,'magic',false,{state:'w'});fx(g,u,'Jax_base_W_tar',v);}
 if(!v.alive||(u.spellRanks?.[3]||0)<=0)return;
 if((u.jaxRHitUntil||0)<g.time)u.jaxRHits=0;u.jaxRHitUntil=g.time+2.5;u.jaxRHits=(u.jaxRHits||0)+1;
 if(u.jaxRHits>=(u.jaxRUntil>g.time?2:3)){u.jaxRHits=0;g.hurt(v,(jaxValue(u,3,'PassiveBaseDamage',75)+.6*(u.ap||0))*(v.kind==='hero'||v.kind==='minion'?1:.5),u,0,0,'magic',false,{state:'r'});fx(g,u,'Jax_base_R_tar',v);}
}
function finishE(g,u,h){
 u.jaxEUntil=0;
 for(const v of g.enemies(u))if(['hero','minion'].includes(v.kind)&&distance(u,v)<=300*k(g)+v.radius){h.hit(g,{source:u,effectState:'e',damageType:'magic',stun:1,aoe:true},v,(jaxValue(u,2,'BaseDamage',40)+.7*(u.ap||0)+v.maxHp*.04)*(1+.2*Math.min(5,u.jaxDodges||0)));fx(g,u,'Jax_base_E_tar',v);}
}
export function castJax(g,i,aim,h){
 const u=g.player,recast=i===2&&u.jaxEUntil>g.time;
 if(!u.alive||g.winner!==null||u.stun>0||u.silence>0||u.charm>0||u.castUntil>g.time||u.skills[i]>0&&!recast||!canCastWithAugments(u,i))return false;
 if(recast){if(g.time<u.jaxERecastAt)return false;finishE(g,u,h);return true;}
 if(i===0&&(!aim?.alive||aim===u||!['hero','minion'].includes(aim.kind)||distance(u,aim)>700*k(g)+aim.radius||u.root>0||u.grounded>0))return false;
 const rank=u.spellRanks?.[i]||1,cost=data(i).mana?.[rank-1]||0;if(u.mp<cost)return false;u.mp-=cost;u.skills[i]=data(i).Cooldown.values[rank]*combatCooldownMultiplier(u,i);h.cancelAttack(u);u.animation='qwer'[i];u.animationSerial++;u.animUntil=g.time+.3;
 h.combatEvent(g,u,'qwer'[i],'cast',{aim:aim||u,from:{x:u.x,y:u.y}});augmentOnCast(g,u,i,aim||u,{x:u.x,y:u.y});g.shopHistory=[];
 if(i===0){const from={x:u.x,y:u.y},to={x:aim.x,y:aim.y};u.dest=null;u.dash={kind:'jaxQ',from,to,trackTarget:aim,start:g.time,duration:Math.max(.1,Math.min(.4,distance(u,aim)/(1600*k(g)))),done:()=>{if(aim.alive&&aim.team!==u.team){h.hit(g,{source:u,effectState:'q',damageType:'physical'},aim,jaxValue(u,0,'Damage',65)+Math.max(0,u.damage-u.hero.damage-Math.max(0,u.level-3)*4));if(u.jaxWUntil>g.time){u.jaxWUntil=0;h.hit(g,{source:u,effectState:'w',damageType:'magic'},aim,jaxValue(u,1,'Damage',50)+.6*(u.ap||0));}}}};fx(g,u,'Jax_Base_Q_cas');}
 if(i===1){u.jaxWUntil=g.time+10;u.cd=0;fx(g,u,'Jax_base_W_buf',u,10);}
 if(i===2){u.jaxEUntil=g.time+2;u.jaxERecastAt=g.time+1;u.jaxDodges=0;fx(g,u,'Jax_base_E_cas',u,2);}
 if(i===3){let heroes=0;for(const v of g.enemies(u))if(['hero','minion'].includes(v.kind)&&distance(u,v)<=375*k(g)+v.radius){if(v.kind==='hero')heroes++;h.hit(g,{source:u,effectState:'r',damageType:'magic',aoe:true},v,jaxValue(u,3,'SwingDamageBase',100)+(u.ap||0));}u.jaxRUntil=g.time+8;u.jaxRArmor=heroes?jaxValue(u,3,'BaseResists',45)+.4*Math.max(0,u.damage-u.hero.damage-Math.max(0,u.level-3)*4)+(heroes-1)*(jaxValue(u,3,'ResistsPerExtraTarget',20)+.1*Math.max(0,u.damage-u.hero.damage-Math.max(0,u.level-3)*4)):0;g.refreshAugmentStats?.(u);fx(g,u,'Jax_Base_R_AOE');fx(g,u,'Jax_Base_R_buff_halo',u,8);}
 return true;
}
export function updateJax(g,u,dt,h){
 if(u.hero?.id!=='Jax')return;
 if(!u.alive){u.jaxStacks=u.jaxRHits=u.jaxWUntil=u.jaxEUntil=u.jaxRUntil=0;return;}
 if(u.jaxEUntil&&u.jaxEUntil<=g.time)finishE(g,u,h);
 if(u.jaxRArmor&&u.jaxRUntil<=g.time){u.jaxRArmor=0;g.refreshAugmentStats?.(u);}
 if(u.jaxStacks&&g.time>=u.jaxStackDecay){const lost=Math.min(u.jaxStacks,1+Math.floor((g.time-u.jaxStackDecay)/.35));u.jaxStacks-=lost;u.jaxStackDecay+=lost*.35;}
}

export function jaxAreaReduction(g,u,damage,basic,meta){return u.hero?.id==='Jax'&&u.jaxEUntil>g.time&&!basic&&meta.aoe?damage*.75:damage;}
