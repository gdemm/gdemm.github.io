import {ANNOUNCEMENTS as A} from './announcement-data.js';
const D=A.entries,L=A.labels,node=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n;};
const format=(s,e)=>s.replaceAll('@srctr name@',e.killer?.name||'').replaceAll('@desttr name@',e.victim.name);
export function announcementFor(e,local){
 let key='kill',group=e.killer?.team===local.team?'{a2306bf8}':'{ecf78c11}',style='{abb9fecc}',priority=69;
 if(e.execution){key=e.source?.hero?'execution':e.source?.name==='防御塔'?'towerKill':'minionKill';priority=68;}
 else if(e.firstBlood){key='OnFirstBlood';style='{d7e84185}';priority=92;}
 else if(e.multi>=2){const n=Math.min(e.multi,5);key='OnChampion'+['','','Double','Triple','Quadra','Penta'][n]+'KillAnnouncement';priority=[0,0,76,80,85,97][n];const allied=e.killer.team===local.team;group=[null,null,allied?'{725cd3eb}':'{90c20576}',allied?'{3d9b025d}':'{10943d68}',allied?'{a4df3401}':'{734d7a44}',allied?'{f3c504af}':'{2d5401c2}'][n];if(n===5)style='{c22feeab}';}
 else if(e.shutdown){key='OnChampionShutdownAnnouncement';priority=77;}
 else if(e.streak>=3){key='OnKillingSpreeSet'+Math.min(6,e.streak-2);priority=70;}
 else if(e.killer?.id===local.id)key='youKill';
 return{event:e,key,group,style,priority,text:format(L[key],e)};
}
export class NativeAnnouncements{
 constructor(){this.root=node('div','native-announcements');this.root.setAttribute('aria-live','polite');this.root.setAttribute('aria-atomic','true');this.root.hidden=true;(document.getElementById('game')||document.body).append(this.root);this.queue=[];this.lastId=0;}
 element(key,dx=0){const d=D[key];if(!d)return null;if(d.Elements){const n=node('div','native-ann-group');for(const k of d.Elements){const el=this.element(k,dx);if(el)n.append(el);}return n;}if(!d.sprite)return null;const n=node('img','native-ann-sprite');n.src=d.sprite;n.alt='';n.draggable=false;this.place(n,d,dx);return n;}
 place(n,d,dx=0){if(!d?.rect)return;const[x,y,w,h]=d.rect;Object.assign(n.style,{position:'absolute',left:x+dx+'px',top:y+'px',width:w+'px',height:h+'px',zIndex:String(d.Layer||0)});n.dataset.sourceRect=d.rect.join(',');}
 portrait(key,p,team,dx=0){if(!p?.hero)return;const def=A.icons[key],d=D[def.MainContentElement],n=node('img','native-ann-portrait');n.src=`assets/${p.hero}.png`;n.alt=p.name;this.place(n,d,dx);this.root.append(n);for(const k of [def.BorderRingElement,p.team===team?def.AlliedElementGroup:def.EnemyElementGroup]){const el=this.element(k,dx);if(el)this.root.append(el);}}
 show(a,g){this.active=a;this.started=g.time;this.root.replaceChildren();this.root.hidden=false;this.root.dataset.kind=a.key;this.root.dataset.eventId=String(a.event.id);const art=this.element(a.group);if(art)this.root.append(art);
  const style=A.styles[a.style],d=D[style.TextField],t=node('span','native-ann-title');t.textContent=a.text;const size=d.font?.fontSize||24;Object.assign(t.style,{top:d.rect[1]+'px',fontSize:size+'px',height:d.rect[3]+'px',backgroundImage:`url(${A.fillTexture})`});t.dataset.sourceFont=d.font?.name||'';this.root.append(t);
  // Native two-icon style expands the 20px design-time text box to measured text width.
  const width=Math.min(1000,t.offsetWidth||a.text.length*size),dx=Math.max(0,(width-20)/2);
  if(style.SourceIcon)this.portrait(style.SourceIcon,a.event.killer||a.event.victim,g.player.team);
  else{this.portrait(style.LeftIcon,a.event.killer||a.event.source,g.player.team,-dx);this.portrait(style.RightIcon,a.event.victim,g.player.team,dx);}
 }
 update(g,playing){
  if(this.game!==g){this.game=g;this.lastId=0;this.queue=[];this.active=null;this.root.hidden=true;}
  if(!playing){this.root.hidden=true;return;}
  this.root.style.transform=`translateX(-50%) scale(${Math.min(1,Math.max(.45,(globalThis.innerWidth||1600)/1600))})`;
  for(const e of g.killEvents||[]){if(e.id<=this.lastId)continue;this.lastId=e.id;if(g.time-e.time>6)continue;const a=announcementFor(e,g.player);
   // A higher multi-kill supersedes the same killer's queued lower multi-kill.
   this.queue=this.queue.filter(x=>!(x.event.killer?.id===e.killer?.id&&x.event.multi<e.multi&&!x.event.firstBlood));this.queue.push(a);
  }
  this.queue=this.queue.filter(a=>g.time-a.event.time<8).slice(-6);
  const age=g.time-(this.started||0),duration=this.active?.key==='OnChampionPentaKillAnnouncement'?4:2.8;
  if(this.active&&age>=duration){this.active=null;this.root.hidden=true;}
  if(this.active&&age>1.2&&this.queue.some(a=>a.priority>this.active.priority)){this.active=null;}
  if(!this.active&&this.queue.length){this.queue.sort((a,b)=>b.priority-a.priority||a.event.id-b.event.id);this.show(this.queue.shift(),g);}
  if(this.active){const t=g.time-this.started;this.root.style.opacity=String(Math.min(1,t/.25,(duration-t)/.25));}
 }
}
