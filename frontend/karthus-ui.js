// Read-only presentation/input eligibility. All damage, resources and timers are server-owned.
export const karthusSpirit=(g,u)=>u?.hero?.id==='Karthus'&&!u.alive&&u.karthusSpiritUntil>g.time;
export function karthusSpellAvailable(g,u,index){return !!u?.alive||(Number.isInteger(index)&&index>=0&&index<4&&karthusSpirit(g,u));}
export function karthusSkillUI(g,u,i){
 if(u?.hero?.id!=='Karthus'||i>3)return null;
 const spirit=karthusSpirit(g,u),remaining=(u.karthusSpiritUntil||0)-g.time,channel=u.karthusRequiemUntil>g.time;
 return {cost:spirit||i===2?0:undefined,disabled:(spirit&&(i===2||i===3&&remaining<3-1e-8))||(channel&&i!==2),
   label:i===2?(spirit?'灵体常开':u.karthusDefile?'已开启':''):i===3&&spirit&&remaining<3?'不足3秒':''};
}
export function karthusResource(u){return u?.hero?.id==='Karthus'&&!u.alive&&u.karthusSpiritRemaining>0?{name:'死亡契约',value:u.karthusSpiritRemaining,max:u.karthusSpiritDuration||5}:null;}
export function karthusSlow(u,time){const until=u.karthusWallSlowUntil||0,start=u.karthusWallSlowStart||0;return until>time&&until>start&&!(u.yiRUntil>time)?(u.karthusWallSlow||0)*Math.max(0,Math.min(1,(until-time)/(until-start))):0;}
export function karthusModelState(u,time,state){
 if(u?.hero?.id!=='Karthus')return state;
 if(karthusSpirit({time},u))return u.karthusRequiemUntil>time?'p-r':u.animUntil>time&&['q','w'].includes(u.animation)?'p-'+u.animation:'p-idle';
 if(u.karthusRequiemUntil>time)return time<u.karthusRequiemUntil-2.65?'r':'r-channel';
 return state;
}

export function karthusSlowFactor(u,time,base,resistance){const slow=karthusSlow(u,time);return slow>0?Math.min(base,1-slow*resistance):base;}
