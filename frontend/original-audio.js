import {LudenAudio} from './luden-audio.js';
import {isDanceAction,withoutDance} from './dance-policy.js';
import {ClassicAudio,CLASSIC_AUDIO_HEROES} from './classic-audio.js';
import {KillConfirmation} from './kill-confirmation.js';
import {KillAnnouncer} from './kill-announcer.js';
import {EnvironmentAudio} from './environment-audio.js';
import {SHOP_AUDIO} from './shop-audio-data.js';
import {yasuoWindState} from './yasuo-presentation.js';
// Original Wwise recordings, decoded from hanyue's zh_CN and SFX archives.
export class OriginalAudio {
 constructor(){this.luden=new LudenAudio(this);this.classic=new ClassicAudio();this.killAnnouncer=new KillAnnouncer(this);this.killConfirmation=new KillConfirmation(this);this.announcerVoice=null;this.environment=new EnvironmentAudio();this.windReady=null;this.enabled=false;this.data=null;this.voice=null;this.fx=[];this.uiFx=[];this.itemFx=[];this.lastVoice=0;this.lastHeroVoice=-Infinity;this.heroCueTimes=new Map();this.uiTimes=new Map();this.serials=new Map();this.alive=new Map();this.game=null;this.firstBlood=false;this.result=null;this.combatId=0;this.load();}
 async load(){try{const r=await fetch('assets/audio/manifest.json');if(!r.ok)throw new Error('audio');const manifest=await r.json();this.environmentData=manifest.environment||{};this.itemData=manifest.items||{};this.data=manifest.heroes;this.uiData={...manifest.ui,...SHOP_AUDIO};this.signalData=manifest.signals||{};this.cueBindings=manifest.cueBindings||{};}catch{this.data=null;}}
 setEnabled(value){this.classic.setEnabled(value);if(value&&!this.enabled)this.environment.stop();this.enabled=value;if(!value)this.stop();}
 stop(){this.classic.stop();this.mfUltSounds?.clear();this.killAnnouncer.silence();if(this.announcerVoice){this.announcerVoice.pause();this.announcerVoice=null;}this.environment.stop();this.windReady=null;if(this.voice){this.voice.pause();this.voice=null;}for(const a of [...this.fx,...this.uiFx,...(this.itemFx||[])])a.pause();this.fx=[];this.uiFx=[];this.itemFx=[];}
 play(url,volume,voice=false,channel='fx'){
  if(!this.enabled||!url)return false;
  const a=new Audio(url);a.volume=Math.max(0,Math.min(1,volume));
  if(voice){const slot=channel==='announcer'?'announcerVoice':'voice';if(this[slot])this[slot].pause();this[slot]=a;a.onended=()=>{if(this[slot]===a)this[slot]=null;};}
  else{
   // Keep UI confirmations audible even when a teamfight fills the SFX pool.
   const pool=channel==='ui'?'uiFx':channel==='item'?'itemFx':'fx',limit=pool==='fx'?24:8;
   this[pool]??=[];
   this[pool]=this[pool].filter(x=>!x.ended);
   while(this[pool].length>=limit)this[pool].shift().pause();
   this[pool].push(a);
  }
  a.play().catch(()=>{});return true;
 }
 say(hero,state,priority=false){if(isDanceAction(state))return false;if(CLASSIC_AUDIO_HEROES.has(hero))return this.classic.say(hero,state,priority);if(hero==='Announcer'&&this.killAnnouncer.active&&!['victory','defeat'].includes(state))return false;const list=this.data?.[hero]?.vo?.[state];if(!list?.length||!this.enabled)return false;const now=performance.now(),announcer=hero==='Announcer',token=hero+':'+state;if(!announcer){if(now-(this.heroCueTimes.get(token)??-Infinity)<60000)return false;if(!priority&&(now-this.lastHeroVoice<20000||this.voice&&!this.voice.ended))return false;}else if(!priority&&(this.voice&&!this.voice.ended||now-this.lastVoice<4500))return false;this.lastVoice=now;if(!announcer){this.lastHeroVoice=now;this.heroCueTimes.set(token,now);}return this.play(list[Math.floor(Math.random()*list.length)].url,announcer?.64:.48,true,announcer?'announcer':'fx');}

 signal(key){const clip=this.signalData?.[key];return clip?this.play(clip.url,key==='mastery'?.28:.34,false,'ui'):false;}
 ui(key){const clip=this.uiData?.[key],now=performance.now();if(!clip||now-(this.uiTimes.get(key)||-9999)<(key==='augment-hover'?180:60))return false;this.uiTimes.set(key,now);const volume=key==='augment-hover'?.16:key==='augment-refresh'?.22:key==='augment-appear'?.26:.36;return this.play(clip.url,volume,false,'ui');}
 cast(hero,key){if(isDanceAction(key))return false;const sfx=this.data?.[hero]?.sfx?.[key];if(sfx)this.play(sfx.url,.23);this.say(hero,key);}
 updateWind(game){const u=game.player,ready=yasuoWindState(u,game.time).ready,previous=this.windReady;if(previous&&(previous.game!==game||previous.unit!==u.id||!ready)){previous.audio?.pause();this.windReady=null;if(previous.game===game&&previous.unit===u.id&&u.alive)this.play(this.data?.Yasuo?.sfx?.['q-ready-end']?.url,.2);}if(ready&&!this.windReady&&this.enabled){const clip=this.data?.Yasuo?.sfx?.['q-ready'];if(clip&&this.play(clip.url,.25))this.windReady={game,unit:u.id,audio:this.fx.at(-1)};}}
 start(game){this.stop();this.luden.reset(game);this.classic.game=game;this.classic.reset(Math.max(0,...(game.combatEvents||[]).map(e=>e.id)));this.killConfirmation.reset(game);this.killAnnouncer.reset(game);this.game=game;this.serials.clear();this.alive.clear();this.firstBlood=(game.score?.[0]||0)+(game.score?.[1]||0)>0;this.result=null;this.lastVoice=0;this.combatId=0;this.cueTimes?.clear();this.say('Announcer','start',true);}
 update(game){this.luden.update(game);this.classic.update(game);this.killConfirmation.update(game);this.environment.update(game,this.enabled,this.environmentData);if(!this.data)return;if(this.game!==game){this.killAnnouncer.reset(game);this.game=game;this.serials.clear();this.alive.clear();this.firstBlood=(game.score?.[0]||0)+(game.score?.[1]||0)>0;this.result=null;this.combatId=0;this.cueTimes?.clear();}
  this.updateWind(game);
  for(const [id,audio] of this.mfUltSounds||[]){const u=game.units.find(u=>u.id===id);if(!u?.mfChannel){audio.pause();this.mfUltSounds.delete(id);}}
  for(const event of game.combatEvents||[]){if(event.id<=this.combatId)continue;this.combatId=event.id;const h=event.spellName==='SummonerSnowball'?'Summoner':event.hero,u=event.source,d=Math.hypot(event.x-game.player.x,event.y-game.player.y);if(d>800)continue;let key=null;if(event.state==='heartsteel'&&event.phase==='itemProc'){const clip=this.itemData?.['3084']?.proc;if(clip)this.play(clip.url,u===game.player?.85:.42,false,'item');continue;}
   const attackKey=event.state==='q'&&['Ashe','Garen'].includes(h)?'q-attack':event.state;
   if(h==='Summoner'){key=event.state+'-'+event.phase;}else if(event.phase==='cast'){key=event.state;if(u===game.player)this.say(h,event.state);}
   else if(event.phase==='attackStart')key=attackKey;
   else if(event.phase==='launch')key=(event.missile?.basic||u?.hero?.id==='Garen'?attackKey:event.state)+'-launch';
   else if(event.phase==='hit'&&h==='MissFortune'&&event.state==='e')key=null;
   else if(event.phase==='hit')key=(event.spellName?.includes('Attack')?attackKey:event.state)+'-hit';
   const exact=this.cueBindings?.[h]?.[event.spellName]?.[event.phase];if(exact)key=exact;else if(['zoneStart','zoneEnd','beam'].includes(event.phase))key=event.state+'-'+event.phase;
   const clip=key&&this.data[h]?.sfx?.[key];if(clip){const token=(u?.id??h)+':'+h+':'+key,at=Number.isFinite(event.time)?event.time:game.time;if((this.cueTimes?.get(token)??-99)>at-.06)continue;this.cueTimes??=new Map();this.cueTimes.set(token,at);const played=this.play(clip.url,(u===game.player ? .2 : .12)*Math.max(.2,1-d/800));if(played&&h==='MissFortune'&&key==='r'){this.mfUltSounds??=new Map();this.mfUltSounds.set(u.id,this.fx.at(-1));}if(h==='Summoner'&&event.phase==='summonerBlink')this.play(this.data.Summoner.sfx['flash-arrival']?.url,.18);}
  }
  for(const u of game.units){const before=this.alive.get(u.id);if(before===true&&!u.alive){if(u===game.player)this.say(u.hero.id,'death',true);if(u.kind==='tower')this.say('Announcer',u.team!==game.player.team?'tower_enemy':'tower_ally',true);if(u.kind==='inhibitor')this.say('Announcer',u.team!==game.player.team?'inhibitor_enemy':'inhibitor_ally',true);}if(before===false&&u.alive&&u===game.player)this.say(u.hero.id,'respawn');this.alive.set(u.id,u.alive);
   if(u.kind==='hero'&&!u.nativeCombat&&u.alive&&this.serials.get(u.id)!==u.animationSerial){this.serials.set(u.id,u.animationSerial);if(u.animation==='attack'&&u.animUntil>game.time){const d=Math.hypot(u.x-game.player.x,u.y-game.player.y),s=this.data[u.hero.id]?.sfx?.attack;if(s&&d<500)this.play(s.url,u.player?.15:.1*(1-d/500));}}
  }
  if(!this.firstBlood&&game.score[0]+game.score[1]>0){this.firstBlood=true;this.say('Announcer','firstblood',true);}
  this.killAnnouncer.update(game);
  if(game.winner!==null&&this.result===null){this.result=game.winner;this.say('Announcer',game.winner===game.player.team?'victory':'defeat',true);}
 }
}
