import {karthusSkillUI} from './karthus-ui.js';
// Presentation only: the server remains authoritative for costs, cooldowns and casts.
export function classicSkillUI(g,u,index){
 const karthus=karthusSkillUI(g,u,index);if(karthus)return karthus;
 const time=g.time||0,s=u.classic||{},id=u.hero?.id;
 const blocked=!u.alive||u.stun>0||u.silence>0||u.charm>0||u.castUntil>time||u.classicCastLockUntil>time||u.classicTaunt?.until>time||!!u.forcedMove||!!u.dash;
 if(id==='JarvanIV'&&index===3&&s.wallUntil>time)return{recast:true,disabled:blocked,label:'解除地形',cost:0};
 if(id==='Riven'){
  if(index===0&&s.qCasts>0&&s.qUntil>time)return{recast:true,disabled:blocked||u.root>0||u.grounded>0,label:'折翼之舞 '+(s.qCasts+1),cost:0};
  if(index===3&&s.rUntil>time&&!s.rFired)return{recast:true,disabled:(!u.alive||u.stun>0||u.silence>0||u.charm>0||u.castUntil>time||u.classicCastLockUntil>time||u.classicTaunt?.until>time||!!u.forcedMove)||time<s.rReadyAt,label:'疾风斩',cost:0};
 }
 if(id==='Irelia'){
  if(index===1&&s.w)return{recast:true,disabled:!u.alive,label:'释放距破之舞',cost:0};
  if(index===2&&s.blade?.until>time)return{recast:true,disabled:(!u.alive||u.stun>0||u.silence>0||u.charm>0||u.castUntil>time||u.classicCastLockUntil>time||u.classicTaunt?.until>time||!!u.forcedMove)||time<s.blade.readyAt,label:'第二把刀锋',cost:0};
 }
 if(id==='Aatrox'&&index===0&&s.qStep>0&&s.qUntil>time)return{recast:true,disabled:blocked||time<s.qReadyAt,label:'暗裔利刃 '+(s.qStep+1),cost:0};
 if(id==='LeeSin'&&index<3){const until=[s.qUntil,s.wUntil,s.eUntil][index];if(until>time){let invalid=false;if(index===0){const v=g.units?.find(v=>v.id===s.qTarget),range=1300/(g.mapConfig?.scale||2);invalid=!v?.alive||v.teemoStealth||(v?.classicRealmId||0)!==(u.classicRealmId||0)||Math.hypot((v?.x||0)-u.x,(v?.y||0)-u.y)>range+(u.radius||0)+(v?.radius||0)||u.root>0||u.grounded>0;}return{recast:true,disabled:blocked||u.mp<30||!!invalid,label:['回音击','铁布衫','摧筋断骨'][index],cost:30};}}
 if(id==='Galio'&&index===1&&s.w)return{recast:true,disabled:!u.alive||u.stun>0||u.silence>0||u.charm>0,label:'释放嘲讽',cost:0};
 if(id==='Akali'){
  if(index===2&&s.eMark?.until>time)return{recast:true,disabled:blocked||u.root>0||u.grounded>0||(!s.eMark.point&&!s.eMark.target?.alive),label:s.eMark.point?'回到烟幕':'追击标记',cost:0};
  if(index===3&&s.rUntil>time)return{recast:true,disabled:blocked||u.root>0||u.grounded>0||time<s.rReadyAt,label:'二段突进',cost:0};
 }
 if(id==='MonkeyKing'&&index===3){if(s.spin?.until>time)return{recast:true,disabled:blocked||time<s.spin.cancelAt,label:'结束旋风',cost:0};if(s.rSecondUntil>time)return{recast:true,disabled:blocked||time<s.rReadyAt,label:'再次旋风',cost:0};}
 if(id==='Zed'&&(index===1||index===3)){const r=s.zedRecasts?.[index===1?'w':'r'];if(r?.until>time)return{recast:true,disabled:blocked||time<r.readyAt||!r.inRange||u.root>0||u.grounded>0,label:index===1?'影分身换位':'返回大招影子',cost:0};}
 if(id==='Mordekaiser'&&index===1){
  const shield=(u.supportState?.shieldParts||[]).find(p=>p.key==='mordeW'&&p.remaining>0&&p.until>time);
  if(shield&&s.wUntil>time)return{recast:true,disabled:blocked||time<s.wReadyAt,label:'转化治疗',cost:0};
 }
 if(id==='Yone'){
  if(index===2&&s.soul)return{recast:true,disabled:blocked||s.soul.returning||time<s.soul.readyAt||u.root>0||u.grounded>0,label:'返回本体',cost:0};
  if(index===0)return{label:s.qStacks>=2&&s.qUntil>time?'旋风就绪':String(s.qUntil>time?s.qStacks||0:0)+'/2'};
 }
 if(id==='Ekko'&&index===3&&!u.classicEcho)return{disabled:true,label:'等待时间残影'};
 return null;
}
