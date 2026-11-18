import {healUnit,shieldUnit,notifyAllyBuff} from './combat-support.js';
const nearby=(g,u,r)=>g.units.filter(v=>v.alive&&v.kind==='hero'&&v.team===u.team&&Math.hypot(v.x-u.x,v.y-u.y)<=r/(g.mapConfig?.scale||2)+(v.radius||0));
function selectSpeed(g,target){
 const buffs=target.sonataSpeedSources||{};
 for(const[id,b]of Object.entries(buffs))if(b.until<=g.time)delete buffs[id];
 target.sonataSpeed=Object.values(buffs).sort((a,b)=>b.amount-a.amount||b.until-a.until)[0]||null;
}
function speed(g,target,amount,until,source){
 const buffs=target.sonataSpeedSources??={};buffs[source.id]={amount,until};selectSpeed(g,target);
 if(target!==source)notifyAllyBuff(g,source,target);
}
export function updateSonata(g,u){
 if(u.alive&&u.augments?.includes('Sonata')){
  const s=u.sonata??={nextAt:g.time+10,nextMelody:'heal',serial:0,auraUntil:0,touched:{}};
  if(g.time>=s.nextAt){
   s.nextAt=g.time+10;s.melody=s.nextMelody;s.nextMelody=s.melody==='heal'?'speed':'heal';s.serial++;s.started=g.time;s.auraUntil=g.time+3;s.touched={};
   if(s.melody==='heal'){
    const targets=nearby(g,u,1000).filter(v=>v!==u&&v.hp<v.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id);
    for(const v of [u,targets[0]].filter(Boolean))healUnit(g,u,v,60+.6*(u.ap||0),{kind:'augment'});
   }else speed(g,u,.3+.0002*(u.ap||0),g.time+3,u);
  }
  if(s.auraUntil>g.time)for(const v of nearby(g,u,400)){
   if(s.touched[v.id])continue;s.touched[v.id]=true;
   if(s.melody==='heal')shieldUnit(g,u,v,80+.4*(u.ap||0),1.5,{kind:'augment',key:`sonata:${u.id}:${s.serial}`});
   else if(v!==u){speed(g,v,.2+.0002*(u.ap||0),g.time+3,u);const self=u.sonataSpeedSources[u.id];self.until=Math.min(s.started+7,self.until+1);}
  }
 }
 selectSpeed(g,u);
 if(u.alive&&u.sonataSpeed?.until>g.time)u.augmentMoveMultiplier*=1+u.sonataSpeed.amount;
}
export function sonataDeath(u){u.sonataSpeed=null;u.sonataSpeedSources={};if(u.sonata)u.sonata.auraUntil=0;}
