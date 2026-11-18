import {SCOREBOARD} from './scoreboard-data.js';
import {itemById} from './item-rules.js?v=shop-missiles-1';
import {augmentById} from './augment-rules.js?v=hextech-aram-3';
import {SUMMONERS} from './summoner-spells.js';
const D=SCOREBOARD.entries,C=SCOREBOARD.controller,[OX,OY]=SCOREBOARD.origin;
const RARITY=['白银','黄金','棱彩'];
const node=(tag,cls='',text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const change=(n,text)=>{text=String(text);if(n.textContent!==text)n.textContent=text;};
const named=suffix=>Object.values(D).find(d=>d.name===suffix||d.name.endsWith('/'+suffix));
export const scoreboardGeometry=(rows,width=1600)=>{const count=Math.max(5,...[0,1].map(t=>rows.filter(r=>r.team===t).length));return{rows:count,width:1526,height:84+count*84+13,scale:Math.min(1,Math.max(.5,(width-24)/1526))};};
function place(n,entry,offsetY=0,local=false){
 const d=typeof entry==='string'?D[entry]:entry;if(!d?.rect)return n;
 const[x,y,w,h]=d.rect;Object.assign(n.style,{left:(x-(local?0:OX))+'px',top:(y-(local?0:OY)+offsetY)+'px',width:w+'px',height:h+'px',zIndex:String(d.Layer||1)});
 n.dataset.sourceRect=d.rect.join(',');n.dataset.sourceName=d.name||'';
 if(d.font)Object.assign(n.style,{fontFamily:`'${d.font.family}',sans-serif`,fontSize:d.font.size+'px',color:d.font.color});
 if(d.TextAlignmentHorizontal!==undefined)n.style.textAlign=['left','center','right'][d.TextAlignmentHorizontal]||'left';
 if(d.FlipX||d.FlipY)n.style.transform=`scale(${d.FlipX?-1:1},${d.FlipY?-1:1})`;
 return n;
}
function sprite(key,dy=0,cls=''){const d=typeof key==='string'?D[key]:key,n=place(node('img','native-sb-element native-sb-sprite '+cls),d,dy);n.src=d.sprite;n.alt='';n.draggable=false;return n;}
function text(key,value,dy=0,cls=''){return place(node('span','native-sb-element native-sb-text '+cls,value),key,dy);}
// Join only existing unit data; do not fabricate cooldowns, CS or private stats.
export function scoreboardDisplayRows(game,rows){
 const byId=new Map((game.units||[]).map(u=>[u.id,u]));return rows.map(r=>{const u=byId.get(r.unitId),self=u===game.player;return{...r,heroLabel:u?.hero?.name||r.hero,summoners:u?.summoners??r.summoners,respawn:u&&!u.alive?Math.ceil(u.respawn||0):0,ult:u?.skills?.[3],spellCooldowns:u?.skills?.slice(4,6),creepScore:r.creepScore??u?.creepScore??(self&&!Array.isArray(game.scoreboard)?game.creepScore??0:null)};});
}
export class NativeScoreboard{
 constructor(board,{onMute=()=>{},isMuted=()=>false}={}){
  Object.assign(this,{board,onMute,isMuted,rows:new Map(),lastShape:'',tooltipPinned:false});
  this.viewport=node('div','native-sb-viewport');this.sizer=node('div','native-sb-sizer');this.canvas=node('div','native-sb-canvas');this.canvas.setAttribute('aria-label','海克斯大乱斗计分板');
  this.background=node('div','native-sb-background');this.canvas.append(this.background);this.glows=[sprite(C.Team1AllyGlow),sprite(C.Team2EnemyGlow)];this.canvas.append(...this.glows);
  this.heading=node('div','native-sb-heading');this.summary=node('span','native-sb-sr');this.heading.append(this.summary);
  const metrics=C.TeamScoresDefinitions;this.heading.append(sprite(metrics.ChampionKills.TeamKillsIcon),sprite('{d163ee5c}'));
  this.teamKills=[text(metrics.ChampionKills.Team1KillText,0),text(metrics.ChampionKills.Team2KillText,0)];this.towerKills=[text(metrics.TowerKills.Team1TowerKillsText,0),text(metrics.TowerKills.Team2TowerKillsText,0)];
  this.heading.append(...this.teamKills,...this.towerKills,sprite(metrics.TowerKills.Team1TowerKillsIcon),sprite(metrics.TowerKills.Team2TowerKillsIcon));
  this.canvas.append(this.heading);this.teams=node('div','scoreboard-teams');this.teamNodes=[0,1].map(t=>{const n=node('section','scoreboard-team team-'+t);n.setAttribute('aria-label',t?'红方':'蓝方');this.teams.append(n);return n;});this.canvas.append(this.teams);
  this.sizer.append(this.canvas);this.viewport.append(this.sizer);this.board.append(this.viewport);
  this.close=node('button','native-sb-sr native-sb-close','关闭计分板');this.close.type='button';this.close.onclick=()=>this.onClose?.();this.board.append(this.close);
  this.info=node('aside','scoreboard-info');this.info.hidden=true;this.info.id='nativeScoreboardTooltip';this.info.setAttribute('role','tooltip');this.info.setAttribute('aria-live','polite');document.body.append(this.info);
  addEventListener('resize',()=>this.resize());
  document.addEventListener('pointerdown',e=>{if(!this.info.contains(e.target)&&!e.target?.closest?.('.native-sb-hit'))this.hideInfo();});
 }
 resize(){
  const w=globalThis.innerWidth||1600,g=scoreboardGeometry(this.displayRows||[],w);this.geometry=g;
  Object.assign(this.canvas.style,{width:g.width+'px',height:g.height+'px',transform:`scale(${g.scale})`});Object.assign(this.sizer.style,{width:(g.width*g.scale)+'px',height:(g.height*g.scale)+'px'});
  this.board.style.width=Math.min(g.width*g.scale,w-24)+'px';
 }
 hideInfo(){this.info.hidden=true;this.tooltipPinned=false;}
 showInfo(anchor,title,description,pinned=false){
  this.tooltipPinned=pinned;this.info.replaceChildren(node('strong','',title),node('p','',description||'暂无额外说明'));this.info.hidden=false;
  const r=anchor.getBoundingClientRect?.()||{left:30,top:80,bottom:120},w=globalThis.innerWidth||1600,h=globalThis.innerHeight||900;
  const width=Math.min(340,w-24);Object.assign(this.info.style,{width:width+'px',left:Math.max(12,Math.min(r.left,w-width-12))+'px',top:Math.max(12,Math.min(r.bottom+8,h-220))+'px'});
 }
 interactive(n,title,description,onClick){
  n.className+=' native-sb-hit';n.type='button';n.setAttribute('aria-label',title+(description?'：'+description:''));n.setAttribute('aria-describedby','nativeScoreboardTooltip');
  n.onmouseenter=()=>this.showInfo(n,title,description);n.onmouseleave=()=>{if(!this.tooltipPinned)this.hideInfo();};n.onfocus=()=>this.showInfo(n,title,description);n.onblur=()=>{if(!this.tooltipPinned)this.hideInfo();};n.onclick=()=>{if(onClick)onClick(n);else this.showInfo(n,title,description,true);};return n;
 }
 imageButton(entry,src,title,description,dy=0,cls='',onClick){
  const d=typeof entry==='string'?D[entry]:entry,n=place(node('button','native-sb-element native-sb-button '+cls),d,dy),img=node('img');img.src=src;img.alt='';img.draggable=false;n.append(img);this.interactive(n,title,description,onClick);return n;
 }
 update(game,rawRows){
  const rows=scoreboardDisplayRows(game,rawRows);this.displayRows=rows;this.resize();
  const shape=String(this.geometry.rows);if(shape!==this.lastShape){this.lastShape=shape;this.background.replaceChildren();
   if(this.geometry.rows===5){const bg=sprite('{802fe068}');bg.style.zIndex='0';this.background.append(bg);}
   else{for(const[type,top,height]of [['header',0,84],['row',84,this.geometry.rows*84],['footer',84+this.geometry.rows*84,13]]){const n=node('div','native-sb-frame-'+type);Object.assign(n.style,{position:'absolute',left:'0',top:top+'px',width:'1526px',height:height+'px',backgroundImage:`url(assets/scoreboard/${type}.png)`,backgroundRepeat:'repeat-y'});this.background.append(n);}}
  }
  this.glows.forEach((n,team)=>{const key=team?(game.player?.team===1?C.Team2AllyGlow:C.Team2EnemyGlow):(game.player?.team===0?C.Team1AllyGlow:C.Team1EnemyGlow);if(n.getAttribute?.('src')!==D[key].sprite)n.src=D[key].sprite;n.style.height=(419+(this.geometry.rows-5)*84)+'px';});
  for(const team of [0,1]){
   change(this.teamKills[team],game.score?.[team]??0);change(this.towerKills[team],(game.units||[]).filter(u=>u.kind==='tower'&&u.team!==team&&!u.alive).length);
  }
  change(this.summary,`${game.score?.[0]??0} — ${game.score?.[1]??0}`);
  const live=new Set();
  for(const team of [0,1]){
   const roster=rows.filter(r=>r.team===team),section=this.teamNodes[team];section.setAttribute('aria-label',`${team?'红方':'蓝方'}，${roster.length} 人`);
   for(let i=0;i<roster.length;i++){
    const r=roster[i],rowId=`${team}:${i}:${r.id}`,key=JSON.stringify([team,i,r.name,r.hero,r.items,r.itemStacks,r.augments,r.summoners,r.connected,r.inGame,game.player?.team,r.unitId===game.player?.id,this.isMuted(r.id)]);live.add(rowId);
    let record=this.rows.get(rowId);if(!record||record.key!==key){const next=this.playerRow(r,i,game);next.key=key;if(record)record.element.remove();section.append(next.element);this.rows.set(rowId,next);record=next;}
    const self=r.unitId===game.player?.id;record.element.className='scoreboard-row'+(self?' is-self':'')+(!r.alive?' is-dead':'');
    change(record.level,r.level||'—');change(record.kda,`${r.kills??0} / ${r.deaths??0} / ${r.assists??0}`);change(record.cs,r.creepScore??'—');change(record.timer,r.alive?'':r.respawn||'');record.dead.hidden=r.alive;record.self.hidden=!self||!r.alive;record.frame.src=D[r.alive?record.definition.Portrait.Frame:record.definition.Portrait.FrameWhileDead].sprite;
    record.ult.style.opacity=r.team!==game.player?.team?'.45':r.alive&&r.ult!==undefined&&r.ult<=0?'1':'.25';
    record.spells.forEach((spell,k)=>{const cd=r.spellCooldowns?.[spell.index];change(spell.cd,cd>0?Math.ceil(cd):'');spell.image.style.filter=cd>0?'grayscale(1) brightness(.5)':'';});
   }
  }
  for(const[id,r]of this.rows)if(!live.has(id)){r.element.remove();this.rows.delete(id);}
 }
 playerRow(r,index,game){
  const def=r.team?C.ChaosScoreLineUiData:C.OrderScoreLineUiData,dy=index*84,row=node('div','scoreboard-row'),self=r.unitId===game.player?.id;row.dataset.playerId=r.id;row.setAttribute('aria-label',r.name);
  const dead=sprite(def.DeadSlotHighlight,dy),highlight=sprite(def.SelfSlotHighlight,dy);row.append(dead,highlight);
  const portrait=this.imageButton(def.Portrait.PortraitIcon,`assets/${r.hero}.png`,r.name,`${r.heroLabel||r.hero}${!r.connected?' · 连接已断开':!r.inGame?' · 尚未入场':''}`,dy,'scoreboard-player');row.append(portrait);
  const frame=sprite(def.Portrait.Frame,dy),level=text(def.UnitLevel.LevelText,r.level||'—',dy),timer=text(def.Portrait.RespawnTimerText,'',dy,'native-sb-death-timer');row.append(frame,level,timer);
  const name=text(def.SummonerName.SummonerNameText,r.name,dy,'native-sb-name');name.title=r.name;row.append(name);
  const kda=text(def.Metrics['0'].Text,'',dy,'scoreboard-kda'),cs=text(def.Metrics['1'].Text,'—',dy);cs.title='补刀';row.append(kda,cs);
  row.append(sprite(def.UltCooldownGem.GemBackground,dy));const ult=sprite(r.team===game.player?.team?def.UltCooldownGem.AllyGem:def.UltCooldownGem.EnemyGem,dy);row.append(ult);
  const spells=[];for(let k=0;k<2;k++){
   const id=r.summoners?.[k],spell=SUMMONERS[id],d=D[def.SpellSlots[k?'SummonerSpell2':'SummonerSpell1'].ContentElement];if(!spell)continue;
   const button=this.imageButton(d,spell.icon,spell.name,spell.description,dy,'native-sb-spell'),cd=node('span','native-sb-cooldown');button.append(cd);row.append(button);spells.push({index:k,cd,image:button.children[0]});
  }
  // Six equipment slots and the original seventh (trinket) backdrop stay square.
  for(let i=0;i<7;i++){
   const slot=def.ItemSlots['Item'+i];row.append(sprite(slot.Backdrop,dy));if(i===6)continue;
   const id=r.items?.[i],item=itemById(id);if(!item)continue;
   const button=this.imageButton(slot.Icon,item.icon,item.name,item.description,dy,'scoreboard-icon equipment-icon');row.append(button);const count=r.itemStacks?.[id]||1;if(count>1)row.append(text(slot.StackText,count,dy,'native-sb-stack'));
  }
  const augmentDef=def.AugmentSlots.AugmentSlotData,region=D[D[def.AugmentSlots.AugmentLayout].Region].rect;
  for(let i=0;i<4;i++){
   const a=augmentById(r.augments?.[i]);if(!a)continue;
   const base=D[augmentDef.Icon],d={...base,rect:[region[0]+i%3*35,region[1]+Math.floor(i/3)*35,30,30]},back={...D[augmentDef.Backdrop],rect:[d.rect[0],d.rect[1],32,32]};row.append(sprite(back,dy));
   row.append(this.imageButton(d,a.icon,`${RARITY[a.rarity]} · ${a.name}`,a.description,dy,'scoreboard-icon augment rarity-'+a.rarity));if(a.rarity===2)row.append(sprite({...D[augmentDef['{0bbebf3d}']],rect:d.rect},dy));
  }
  const prefix=`SB_T${r.team+1}P0_`,mute=named(prefix+'OpenMuteModal_Button'+(this.isMuted(r.id)?'On':'Off')+'Default'),report=named(prefix+'OpenReportModal_ButtonOffDefault');
  if(report){const n=this.imageButton(report,report.sprite,'举报','当前网页对局尚未接入举报服务。',dy,'native-sb-social');n.setAttribute('aria-disabled','true');row.append(n);}
  if(mute&&!self){row.append(this.imageButton(mute,mute.sprite,this.isMuted(r.id)?'取消屏蔽聊天':'屏蔽聊天','只在本机屏蔽这名玩家的聊天消息。',dy,'native-sb-social',()=>{this.onMute(r.id);this.hideInfo();}));}
  return{element:row,definition:def,dead,self:highlight,frame,level,timer,kda,cs,ult,spells};
 }
}
