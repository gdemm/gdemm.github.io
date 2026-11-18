import {shieldUnit} from './combat-support.js';
const KEY='augment-channel-shield';
function channel(g,u){
 if(u.yiMeditateUntil>g.time)return {id:'yi:'+u.yiMeditateStart,start:u.yiMeditateStart,end:u.yiMeditateUntil};
 for(const key of ['mfChannel','jhinChannel']){const c=u[key];if(c?.until>g.time)return{id:key+':'+c.until,start:c.start??g.time,end:c.until};}
 return null;
}
function portions(u){return (u.supportState?.shieldParts||[]).filter(p=>p.key?.startsWith(KEY+':')&&p.remaining>0);}
export function updateChannelShield(g,u,dt){
 if(!u.alive||!u.augments?.includes('DontChangeTheChannel'))return;
 const active=channel(g,u),s=u.channelShieldState??={id:null,nextAt:0,endAt:0,decayRate:0};
 if(active&&active.id!==s.id){s.id=active.id;s.nextAt=Math.max(active.start,g.time-dt)+1;s.endAt=active.end;s.decayRate=0;}
 const naturalEnd=!active&&s.id&&g.time>=s.endAt;
 if(active||naturalEnd){
  let steps=0;
  while(s.nextAt<=Math.min(g.time,s.endAt)+1e-8&&steps++<20){
   const baseHP=u.hero.hp+Math.max(0,u.level-3)*70;
   const amount=50+150*(Math.max(1,Math.min(18,u.level))-1)/17+.5*u.damage+.25*(u.ap||0)+.1*Math.max(0,u.maxHp-baseHP);
   s.lastShield=shieldUnit(g,u,u,amount,2,{kind:'augment',key:`${KEY}:${g.counter++}`});
   s.nextAt+=1;
  }
 }
 if(active){for(const p of portions(u))p.until=g.time+2;u.shieldTime=Math.max(u.shieldTime||0,2.001);return;}
 s.id=null;
 const parts=portions(u),total=parts.reduce((n,p)=>n+p.remaining,0);
 if(!total){s.decayRate=0;return;}
 s.decayRate||=2*(s.lastShield||total);
 const remainingDuration=total/s.decayRate+Math.max(0,dt)+.1;
 for(const p of parts)p.until=g.time+remainingDuration;
 u.shieldTime=Math.max(u.shieldTime||0,remainingDuration);
 let loss=Math.min(total,s.decayRate*Math.max(0,dt));u.shield=Math.max(0,u.shield-loss);
 for(const p of parts){const n=Math.min(loss,p.remaining);p.remaining-=n;loss-=n;if(loss<=0)break;}
}

export function channelShieldDeath(u){u.channelShieldState=null;}
