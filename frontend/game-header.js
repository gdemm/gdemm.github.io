import {GAME_HEADER as N} from './game-header-data.js';
const D=N.entries;
export class NativeGameHeader{
 constructor(){document.getElementById('localStatus')?.remove();document.getElementById('score')?.remove();const local=document.querySelector('body>header');local?.classList.add('local-game-toolbar');document.body.classList.add('native-game-header-active');this.root=document.createElement('aside');this.root.id='nativeGameHeader';this.root.setAttribute('aria-label','对局信息');document.body.append(this.root);this.elements={};
  for(const[id,d]of Object.entries(D).sort((a,b)=>(a[1].Layer||0)-(b[1].Layer||0))){if(!d.rect||(!d.sprite&&d.type!=='UiElementTextData'))continue;const e=document.createElement(d.sprite?'img':'span');e.className=d.sprite?'ngh-sprite':'ngh-text';const [x,y,w,h]=d.rect;Object.assign(e.style,{position:'absolute',left:(x-1125)+'px',top:(y+1)+'px',width:w+'px',height:h+'px'});e.dataset.source=id;if(d.sprite){e.src=d.sprite;e.alt='';e.draggable=false;}else{if(d.font)Object.assign(e.style,{fontFamily:'"'+d.font.family+'"',fontSize:d.font.size+'px',color:d.font.color});e.style.justifyContent=d.TextAlignmentHorizontal===2?'flex-end':'flex-start';}this.root.append(e);this.elements[id]=e;}
  const e=this.elements;e['{fd163546}'].id='blueScore';e['{17f360c5}'].id='redScore';e['{fc41c4b6}'].id='timer';e['{22996d52}'].id='topKda';e['{fe02ed86}'].id='creepScore';e['{0cc028c8}'].id='fps';e['{3b573c3a}'].id='latency';e['{3b573c3a}'].textContent='— ms';e['{3b573c3a}'].title='等待服务器延迟采样';this.frames=0;this.fps=0;this.start=null;this.metricsVisible=true;this.update({kills:0,deaths:0,assists:0,creepScore:0,score:[0,0],time:0});
  const resize=()=>this.root.style.transform=innerWidth<500?'scale('+Math.max(.65,(innerWidth-8)/475)+')':'none';addEventListener('resize',resize);resize();
 }
 update(g){const e=this.elements;e['{22996d52}'].textContent=g.kills+' / '+g.deaths+' / '+g.assists;e['{fe02ed86}'].textContent=String(g.creepScore||0);e['{fd163546}'].textContent=String(g.score[0]);e['{17f360c5}'].textContent=String(g.score[1]);e['{fc41c4b6}'].textContent=Math.floor(g.time/60).toString().padStart(2,'0')+':'+Math.floor(g.time%60).toString().padStart(2,'0');e['{0cc028c8}'].textContent=this.fps?'FPS: '+this.fps:'FPS: —';}
 frame(now){if(this.start===null){this.start=now;this.frames=0;return;}this.frames++;if(now-this.start>=750){this.fps=Math.round(this.frames*1000/(now-this.start));this.frames=0;this.start=now;}}
 updateConnection(online,now=Date.now()){
  const e=this.elements['{3b573c3a}'],fresh=online?.connected&&Number.isFinite(online.ping)&&online.ping>=0&&online.lastPongAt>0&&now-online.lastPongAt<10000;
  e.textContent=fresh?Math.round(online.ping)+' ms':'— ms';
  e.title=fresh?'与服务器的往返延迟':online?.connected?'等待服务器延迟采样':'未连接服务器';
 }
 toggleMetrics(){this.metricsVisible=!this.metricsVisible;for(const id of ['{0cc028c8}','{3b573c3a}'])this.elements[id].hidden=!this.metricsVisible;}
}
