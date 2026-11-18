import {NativeScoreboard} from './native-scoreboard.js';
const el=(tag,cls='',text)=>{const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
export const isTextInput=target=>Boolean(target?.isContentEditable||target?.closest?.('input,textarea,select,[contenteditable="true"]'));
export function scoreboardRows(game){
  if(Array.isArray(game.scoreboard))return game.scoreboard;
  return(game.units||[]).filter(u=>u.kind==='hero').map(u=>({id:u.netPeerId??u.id,unitId:u.id,name:u.playerName||u.hero?.title||u.hero?.name,hero:u.hero?.id,team:u.team,connected:true,inGame:true,level:u.level,alive:u.alive,kills:u===game.player?game.kills:u.kills||0,deaths:u===game.player?game.deaths:u.deaths||0,assists:u===game.player?game.assists:u.assists||0,items:u===game.player?game.items:u.inventoryItems||[],itemStacks:u===game.player?game.itemStacks:{},augments:u.augments||[]}));
}
export class MatchSocial{
 constructor({getGame,getOnline,isPlaying,isPaused,onFocus=()=>{}}){
  Object.assign(this,{getGame,getOnline,isPlaying,isPaused,onFocus,typing:false,composing:false,boardVisible:false,boardPinned:false,tabHeld:false,messages:[],messageIds:new Set(),roomId:null,boardKey:''});
  this.mutedPeers=new Set();this.build();
  addEventListener('blur',()=>this.release());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.release();});
 }
 build(){
  this.chat=el('section','match-chat');this.chat.id='matchChat';this.chat.setAttribute('aria-label','对局聊天');this.chat.hidden=true;
  const top=el('div','match-chat-heading');this.openButton=el('button','chat-open','聊天 Enter');this.openButton.type='button';this.openButton.onclick=()=>this.openChat('team');top.append(this.openButton,el('span','','Shift + Enter 全体'));
  this.log=el('div','match-chat-log');this.log.setAttribute('role','log');this.log.setAttribute('aria-live','polite');this.log.setAttribute('aria-relevant','additions');
  this.form=el('form','match-chat-form');this.form.hidden=true;
  this.channel=el('select','chat-channel');this.channel.setAttribute('aria-label','聊天频道');for(const[value,label]of [['team','队伍'],['all','全体']]){const option=el('option','',label);option.value=value;this.channel.append(option);}
  this.input=el('input','chat-input');this.input.setAttribute('aria-label','聊天消息');this.input.placeholder='输入消息，Enter 发送，Esc 取消';this.input.maxLength=200;this.input.autocomplete='off';this.input.spellcheck=false;
  this.input.addEventListener('compositionstart',()=>{this.composing=true;});this.input.addEventListener('compositionend',()=>{this.composing=false;});
  const send=el('button','chat-send','发送');send.type='submit';this.form.append(this.channel,this.input,send);this.form.onsubmit=e=>{e.preventDefault();if(!this.composing)this.submit();};
  this.error=el('output','chat-error');this.error.setAttribute('aria-live','polite');this.chat.append(top,this.log,this.form,this.error);document.body.append(this.chat);
  this.toggle=el('button','scoreboard-toggle','战绩 Tab');this.toggle.type='button';this.toggle.title='按住 Tab 查看双方 KDA、装备与海克斯；点击可固定显示';this.toggle.setAttribute('aria-controls','matchScoreboard');this.toggle.hidden=true;this.toggle.onclick=()=>{this.boardPinned=!this.boardPinned;this.setBoard(this.boardPinned);};document.querySelector('.local-game-toolbar nav')?.append(this.toggle);
  this.board=el('section','match-scoreboard');this.board.id='matchScoreboard';this.board.hidden=true;this.board.setAttribute('role','dialog');this.board.setAttribute('aria-label','对局计分板');this.board.setAttribute('aria-modal','false');
  this.nativeBoard=new NativeScoreboard(this.board,{isMuted:id=>this.mutedPeers.has(id),onMute:id=>{if(this.mutedPeers.has(id))this.mutedPeers.delete(id);else this.mutedPeers.add(id);for(const row of this.log.children)row.hidden=this.mutedPeers.has(Number(row.dataset.peerId));this.renderBoard();}});
  this.nativeBoard.onClose=()=>{this.boardPinned=false;this.tabHeld=false;this.setBoard(false);};this.teams=this.nativeBoard.teams;this.info=this.nativeBoard.info;this.summary=this.nativeBoard.summary;document.body.append(this.board);
 }
 sync(){
  const online=this.getOnline(),id=online?.room?.id??null,playing=this.isPlaying();
  if(id!==this.roomId){this.roomId=id;this.mutedPeers.clear();this.messages=[];this.messageIds.clear();this.log.replaceChildren();this.error.textContent='';this.closeChat();this.boardKey='';}
  this.chat.hidden=!playing||!id;this.toggle.hidden=!playing;
  if(!playing){this.closeChat();this.boardPinned=false;this.tabHeld=false;this.setBoard(false);}
  if(this.typing&&!online?.connected)this.error.textContent='连接已中断，正在等待重连…';
  if(this.boardVisible)this.renderBoard();
 }
 receive(event){
  this.sync();if(event.roomId!==this.roomId)return;
  if(event.type==='chatError'){this.error.textContent=event.message||'发送失败';return;}
  if(event.type==='chatHistory'){this.messages=[];this.messageIds.clear();this.log.replaceChildren();for(const message of event.messages||[])this.addMessage(message);}
  else if(event.type==='chat')this.addMessage(event.message);
 }
 addMessage(message){
  if(!message||message.roomId!==this.roomId||this.messageIds.has(message.id))return;
  this.messageIds.add(message.id);this.messages.push(message);
  while(this.messages.length>80){const old=this.messages.shift();this.messageIds.delete(old.id);this.log.firstElementChild?.remove();}
  const atBottom=this.log.scrollHeight-this.log.scrollTop-this.log.clientHeight<36;
  const row=el('div','chat-line team-'+message.team);row.dataset.messageId=message.id;row.dataset.peerId=String(message.peerId);row.hidden=this.mutedPeers.has(message.peerId);
  const stamp=el('span','chat-time',Math.floor(message.time/60)+':'+String(Math.floor(message.time%60)).padStart(2,'0'));
  const author=el('strong','chat-author',`[${message.channel==='all'?'全体':'队伍'}] ${message.name}：`);
  row.append(stamp,author,el('span','chat-text',message.text));this.log.append(row);
  if(atBottom||message.peerId===this.getOnline()?.id)this.log.scrollTop=this.log.scrollHeight;
 }
 openChat(channel='team'){
  if(!this.isPlaying()||this.isPaused()||!this.getOnline()?.room||document.querySelector('dialog[open]'))return false;
  this.onFocus();this.typing=true;this.boardPinned=false;this.setBoard(false);this.chat.classList.add('is-typing');this.form.hidden=false;this.channel.value=channel;this.error.textContent='';this.input.focus();return true;
 }
 closeChat(){this.typing=false;this.composing=false;this.form.hidden=true;this.chat.classList.remove('is-typing');if(this.chat.contains(document.activeElement))document.activeElement.blur();}
 submit(){
  if(this.composing)return false;
  let text=this.input.value.trim(),channel=this.channel.value;
  if(!text){this.closeChat();return false;}
  if(/^\/all\s+/i.test(text)){channel='all';text=text.replace(/^\/all\s+/i,'');}
  const online=this.getOnline();
  if(!online?.connected||!online.send({type:'chat',channel,text})){this.error.textContent='尚未连接，消息未发送';return false;}
  // Success is echoed by the room server. Never forge a local chat message.
  this.input.value='';this.error.textContent='';this.closeChat();return true;
 }
 setBoard(visible){
  this.boardVisible=Boolean(visible&&this.isPlaying());this.board.hidden=!this.boardVisible;this.toggle.setAttribute('aria-expanded',String(this.boardVisible));
  if(this.boardVisible){this.onFocus();this.renderBoard();}else this.nativeBoard.hideInfo();
 }
 release(){this.tabHeld=false;this.boardPinned=false;this.setBoard(false);this.closeChat();}
 handleKeyDown(e){
  if(e.isComposing||this.composing||e.keyCode===229)return this.typing||isTextInput(e.target);
  if(this.typing){
   if(e.key==='Escape'){e.preventDefault();this.input.value='';this.closeChat();return true;}
   if(e.key==='Enter'&&!e.repeat){e.preventDefault();this.submit();return true;}
   return true;
  }
  if(isTextInput(e.target))return true;
  if(e.key==='Tab'&&this.boardPinned)return true;
  if(e.key==='Tab'&&this.isPlaying()&&!document.querySelector('dialog[open]')){e.preventDefault();this.tabHeld=true;this.setBoard(true);return true;}
  if(this.boardVisible){if(e.key==='Escape'){e.preventDefault();this.boardPinned=false;this.tabHeld=false;this.setBoard(false);}return true;}
  if(e.key==='Enter'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(this.openChat(e.shiftKey?'all':'team')){e.preventDefault();return true;}}
  return false;
 }
 handleKeyUp(e){
  if(e.key==='Tab'&&this.tabHeld){e.preventDefault();this.tabHeld=false;if(!this.boardPinned)this.setBoard(false);return true;}
  return this.typing||this.boardVisible||isTextInput(e.target);
 }
 renderBoard(){const game=this.getGame();this.nativeBoard.update(game,scoreboardRows(game));}
}
