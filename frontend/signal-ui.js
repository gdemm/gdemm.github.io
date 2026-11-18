import {SIGNAL_DATA as D} from './signal-data.js';
import {PINGS,signalsFor} from './signals.js';
export const SIGNAL_MARKER_SCALE=3;
export const PING_WHEEL_MULTIPLIER=1.5;
export function pingWheelLayout(screen,vision=false,w=globalThis.innerWidth||1600,h=globalThis.innerHeight||900){
 const size=293,scale=Math.min(1.12*(vision?1:PING_WHEEL_MULTIPLIER),Math.max(1,w-24)/size,Math.max(1,h-24)/size),r=size*scale/2;
 return {size,scale,x:Math.max(r,Math.min(w-r,screen.x)),y:Math.max(r,Math.min(h-r,screen.y)),deadzone:vision?30:30*scale/1.12};
}
export const MASTERY_HEAD_GAP=180;
export const PING_DIRECTIONS=['retreat','push','omw','allin','assist','needvision','missing','vision'];
const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function pingDirection(dx,dy,vision=false,deadzone=30){if(Math.hypot(dx,dy)<deadzone)return vision?'vision':'basic';if(vision)return dx>=0?'needvision':'clearvision';return PING_DIRECTIONS[(Math.round((Math.atan2(dy,dx)+Math.PI/2)/(Math.PI/4))+8)%8];}
export class SignalInput{
 constructor({getGame,cancelCombat=()=>{},onWheel=()=>{},notice=()=>{}}){Object.assign(this,{getGame,cancelCombat,onWheel,notice});this.active=null;this.armed=false;}
 begin(screen,point,{vision=false,defaultType='basic',trigger='pointer',key=null,target=null,pointerId=null}={}){this.cancelCombat();this.armed=false;this.active={screen:{...screen},point:{...point},vision,defaultType,trigger,key,targetId:target?.id,pointerId,type:vision?'vision':defaultType};this.onWheel(this.active);}
 move(screen){if(!this.active)return false;this.active.type=pingDirection(screen.x-this.active.screen.x,screen.y-this.active.screen.y,this.active.vision,pingWheelLayout(this.active.screen,this.active.vision).deadzone);if(this.active.type==='basic')this.active.type=this.active.defaultType;this.onWheel(this.active);return true;}
 cancel(){const was=!!this.active||this.armed;this.active=null;this.armed=false;this.onWheel(null);return was;}
 commit(){const a=this.active;if(!a)return false;this.cancel();const sent=this.getGame().ping(a.type,a.point,a.targetId);if(!sent)this.notice('信号发送过快，请稍候');return true;}
 keyDown(e,screen,point,target){const key=e.key.toLowerCase();if(e.isComposing)return false;if(e.ctrlKey&&(e.code==='Digit6'||e.code==='Numpad6'||key==='6')){e.preventDefault();if(!e.repeat&&!this.getGame().mastery())this.notice('成就徽章冷却中，或当前无法亮标');return true;}if(key==='escape'&&(this.active||this.armed)){e.preventDefault();this.cancel();return true;}if(!e.ctrlKey&&!e.altKey&&!e.metaKey&&(key==='g'||key==='v')){e.preventDefault();if(!e.repeat)this.begin(screen,point,{vision:key==='v'&&!!e.shiftKey,defaultType:key==='v'?'caution':'basic',trigger:'key',key,target});return true;}return false;}
 keyUp(e){if(this.active?.trigger==='key'&&e.key.toLowerCase()===this.active.key){e.preventDefault();this.commit();return true;}return false;}
 pointerDown(e,screen,point,target){if(this.active){e.preventDefault();if(e.button===2)this.cancel();else this.commit();return true;}if(e.button===0&&e.ctrlKey){e.preventDefault();this.getGame().ping('caution',point,target?.id);return true;}if(e.button===0&&(e.altKey||this.armed)){e.preventDefault();this.begin(screen,point,{target,pointerId:e.pointerId});return true;}return false;}
 pointerUp(e){if(this.active?.trigger==='pointer'&&(this.active.pointerId===null||this.active.pointerId===e.pointerId)){e.preventDefault();return this.commit();}return false;}
}
export class NativeSignals{
 constructor({getGame,getModels,getAudio,isMuted=()=>false}){Object.assign(this,{getGame,getModels,getAudio,isMuted});this.lastId=0;this.instances=new Map();this.images=new Map();this.currentWheel='';this.wheel=el('div','native-ping-wheel');this.wheel.hidden=true;this.wheel.setAttribute('aria-label','信号轮盘');this.wheel.setAttribute('role','status');this.log=el('div','native-ping-log');this.log.setAttribute('aria-live','polite');document.body.append(this.wheel,this.log);this.lines=[];}
 sprite(key){const d=D.entries[key];if(!d?.sprite)return null;const n=el('img','native-ping-piece');n.src=d.sprite;n.alt='';n.draggable=false;const[x,y,w,h]=d.rect;Object.assign(n.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px',zIndex:String(d.Layer||1)});n.dataset.sourceRect=d.rect.join(',');return n;}
 showWheel(a){if(!a){this.wheel.hidden=true;return;}const mode=a.vision?'lolpingradialalt':'lolpingradial',c=D.controllers[mode],types=a.vision?['needvision','clearvision','vision']:[...PING_DIRECTIONS,a.defaultType||'basic'],renderKey=mode+':'+(a.defaultType||'basic');
  if(this.currentWheel!==renderKey){this.currentWheel=renderKey;this.wheel.replaceChildren();this.buttons=[];
   if(!a.vision){
    // Native compact wheel separates the eight glyphs from the hover wedges.
    // This preserves readable ? / ! icons instead of shrinking baked glyphs.
    const bg=this.sprite('{4f419e5f}');if(bg)this.wheel.append(bg);
    for(const [index,b] of c.MinimapRadialButtons.entries()){const hover=this.sprite(index===8&&a.defaultType==='caution'?'{1797f4cd}':b.DefaultIcon);if(hover)this.wheel.append(hover);this.buttons.push({normal:null,hover});}
    for(const [index,key] of ['{d5749b5b}','{3cb0dee6}','{4a7bd5d1}','{23c10b94}','{0aa4656f}','{b0cf53fa}','{c9541bd5}','{9d822a98}'].entries()){const icon=this.sprite(key);if(icon){icon.dataset.pingType=PING_DIRECTIONS[index];icon.alt=index===0?'警告 / 撤退':index===6?'问号 / 敌人消失':PINGS[PING_DIRECTIONS[index]].label;this.wheel.append(icon);}}
    for(const [text,left,top,color] of [['警告',125,87,'#ff2345'],['问号',53,163,'#fabe0a']]){const caption=el('span','native-ping-caption',text);Object.assign(caption.style,{left:left+'px',top:top+'px',color});this.wheel.append(caption);}
   }else{
    const bg=this.sprite('{edeb1398}');if(bg)this.wheel.append(bg);
    c.MinimapRadialButtons.forEach((b,index)=>{const hover=index<2?this.sprite(b.DefaultIcon):null;if(hover)this.wheel.append(hover);this.buttons.push({normal:null,hover});});
    for(const [type,key,label,left,width,color]of [['clearvision','{fb10b299}','视野已清除',24,80,'#21bcff'],['vision',null,'敌方视野',106,80,'#ff2345'],['needvision','{0085babc}','需要视野',191,80,'#02d696']]){
     const icon=key?this.sprite(key):el('img','native-ping-piece');if(!key){icon.src=D.pingIcons.SR_Pings_EnemyVision;Object.assign(icon.style,{left:'130px',top:'126px',width:'32px',height:'32px',zIndex:'3'});}icon.alt=label;icon.dataset.pingType=type;this.wheel.append(icon);const caption=el('span','native-ping-caption',label);Object.assign(caption.style,{left:left+'px',top:'163px',width:width+'px',height:'24px',color});this.wheel.append(caption);
    }
   }
   this.label=el('span','native-ping-label');this.wheel.append(this.label);
  }
  this.wheel.hidden=false;const {size,scale,x,y}=pingWheelLayout(a.screen,a.vision);this.wheel.style.width=size+'px';this.wheel.style.height=size+'px';this.wheel.style.left=x+'px';this.wheel.style.top=y+'px';this.wheel.style.transform=`translate(-50%,-50%) scale(${scale})`;
  const i=types.indexOf(a.type);for(let n=0;n<this.buttons.length;n++){const b=this.buttons[n];if(b.normal)b.normal.hidden=n===i;if(b.hover)b.hover.hidden=n!==i;}const source=D.entries[c.PingCategories[i]?.CategoryText];this.label.textContent=(a.type==='caution'?'警告':a.type==='retreat'?'警告 / 撤退':source?.label||PINGS[a.type].label).replace(/<[^>]*>/g,'');this.label.style.color=source?.font?.color||'#f7f8fa';this.label.style.fontSize='12px';Object.assign(this.label.style,a.vision?{left:'0px',top:'266px',width:'293px',height:'20px'}:{left:'104px',top:'125px',width:'85px',height:'43px'});this.wheel.setAttribute('aria-label',a.vision?'视野信号：左侧视野已清除，中央敌方视野，右侧需要视野':'八方向信号轮盘');this.wheel.dataset.type=a.type;
 }

 image(url){let im=this.images.get(url);if(!im){im=new Image();im.src=url;this.images.set(url,im);}return im;}
 update(g,playing){if(this.game!==g){this.game=g;this.lastId=0;this.lines=[];this.logSignature='';for(const i of this.instances.values())i.stopped=true;this.instances.clear();this.log.replaceChildren();}this.log.hidden=!playing;if(!playing){this.showWheel(null);return;}
  if(this.masteryButton){const cd=Math.max(0,(g.player.masteryReadyAt||0)-g.time);this.masteryButton.disabled=!g.player.alive||cd>0;this.masteryButton.title=cd>0?`成就徽章 · ${Math.ceil(cd)}秒后可用`:'Ctrl + 6 · 10级英雄成就徽章';}const view=this.getModels(),fx=view?.vfx;for(const e of signalsFor(g,g.player)){if(e.id<=this.lastId)continue;this.lastId=e.id;if(this.isMuted(e.peerId))continue;const age=g.time-e.time;if(age>.8)continue;
   const source=g.units.find(u=>u.id===e.sourceId),target=g.units.find(u=>u.id===e.targetId),mastery=e.kind==='mastery',def=mastery?null:PINGS[e.type];if(fx?.ready){const follow=mastery?source:target||null,host=fx.host(e.x,e.y,0,follow);host.signal=true;host.height=mastery?(view.labelHeight?.(source)||100)*1.8+MASTERY_HEAD_GAP:target?(view.labelHeight?.(target)||80)*.9:0;if(mastery){host.cameraFacing=true;host.renderScale=D.masteryRenderScale;}else host.renderScale=SIGNAL_MARKER_SCALE;const instance=fx.emit(mastery?D.masteryEffect:def.fx,host,Math.max(.1,e.until-g.time));if(instance){instance.signalSource=mastery?source:null;instance.signalUntil=e.until;this.instances.set(e.id,instance);}}
   this.getAudio()?.signal(mastery?'mastery':def.sound);if(!mastery){this.lines.push({id:e.id,until:g.time+5,text:`${e.name}：${def.label}`,icon:D.pingIcons[def.fx]});this.lines=this.lines.slice(-4);}
  }
  for(const[id,i]of this.instances){if(g.time>=i.signalUntil||i.signalSource&&!i.signalSource.alive)i.stopped=true;if(i.stopped)this.instances.delete(id);}
  this.lines=this.lines.filter(x=>x.until>g.time);const signature=this.lines.map(x=>x.id).join(',');if(this.logSignature!==signature){this.logSignature=signature;this.log.replaceChildren(...this.lines.map(x=>{const n=el('div','native-ping-line'),im=el('img','');im.src=x.icon;im.alt='';n.append(im,el('span','',x.text));return n;}));}
 }
 drawMinimap(ctx,g,point){for(const e of signalsFor(g,g.player)){if(e.kind!=='ping'||this.isMuted(e.peerId))continue;const target=g.units.find(u=>u.id===e.targetId),p=point(target?.x??e.x,target?.y??e.y),age=g.time-e.time,im=this.image(D.pingIcons[PINGS[e.type].fx]);ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=Math.min(1,(e.until-g.time)*2);const size=(20+Math.sin(age*10)*2)*SIGNAL_MARKER_SCALE;if(im.complete&&im.naturalWidth){const ratio=(im.naturalHeight||im.naturalWidth)/im.naturalWidth,w=ratio>1?size/ratio:size,h=ratio>1?size:size*ratio;ctx.drawImage(im,p.x-w/2,p.y-h/2,w,h);}ctx.restore();}}
}
