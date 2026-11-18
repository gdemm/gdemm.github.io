import {KarthusAudio} from './karthus-audio.js';
import {isDanceAction,withoutDance} from './dance-policy.js';
import {ClassicBuffAudio} from './classic-buff-audio.js';
import {ClassicParticleAudio} from './classic-particle-audio.js';
export const CLASSIC_AUDIO_HEROES=new Set(['Karthus','Kaisa','Mordekaiser','LeeSin','Yone','Vayne','Tristana','Galio','Ekko','Riven','Irelia','Akali','Diana','Zed','XinZhao','JarvanIV','Aatrox','MonkeyKing']);
// Original native event audio, lazily loaded per hero. No historical event replay.
export class ClassicAudio {
 constructor({fetchManifest,createAudio,random=Math.random,maxSounds=32}={}){
  this.fetchManifest=fetchManifest|| (async hero=>{const r=await fetch(hero==='Karthus'?'assets/audio/karthus-20261002/Karthus/manifest.json':`assets/audio/classic-17/${hero}/manifest-r20260930-audio-passive-2.json`,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error(`Audio manifest ${r.status}`);return r.json();});
  this.createAudio=createAudio|| (url=>new Audio(url));this.random=random;this.maxSounds=maxSounds;
  this.manifests=new Map();this.pending=new Map();this.active=new Set();this.channels=new Map();this.generation=0;this.enabled=false;this.seen=0;this.game=null;this.loadErrors=new Map();this.retryAt=new Map();this.lifetimes=new Map();this.recentCombatSounds=[];this.voiceTimes=new Map();this.lastVoice=-Infinity;this.karthus=new KarthusAudio(this);this.particles=new ClassicParticleAudio(this);this.buffs=new ClassicBuffAudio(this);
 }
 async prepare(heroIds){
  return Promise.allSettled([...new Set(heroIds)].filter(h=>CLASSIC_AUDIO_HEROES.has(h)).map(hero=>this.ensure(hero).catch(error=>{this.loadErrors.set(hero,String(error));throw error;})));
 }
 async ensure(hero){
  if(this.manifests.has(hero))return this.manifests.get(hero);
  if(this.pending.has(hero))return this.pending.get(hero);
  const p=Promise.resolve().then(()=>this.fetchManifest(hero)).then(data=>{if(data.version!==1||data.hero!==hero||!data.events)throw Error('Invalid hero audio manifest');withoutDance(data);this.manifests.set(hero,data);return data;}).finally(()=>this.pending.delete(hero));
  this.pending.set(hero,p);return p;
 }
 setEnabled(value){this.enabled=!!value;if(!this.enabled)this.stop();}
 stop(){this.generation++;for(const a of this.active)a.pause();this.active.clear();this.channels.clear();this.lifetimes.clear();}
 reset(lastEventId=0){this.karthus.reset();this.buffs.reset();this.particles.reset();this.stop();this.seen=lastEventId;this.recentCombatSounds=[];this.voiceTimes.clear();this.lastVoice=-Infinity;}
 stopChannel(channel){this.lifetimes.delete(channel);const a=this.channels.get(channel);if(!a)return;this.channels.delete(channel);this.active.delete(a);a.pause();}
 clip(hero,event,switches={}){if(isDanceAction(event))return null;
  const manifest=this.manifests.get(hero),rows=manifest?.events[event]||[];
  switches={...manifest?.switchDefaults?.[rows[0]?.kind],...switches};
  const matches=rows.filter(r=>(r.switches||[]).every(group=>group.split(',').every(pair=>{const [key,value]=pair.trim().split('=');return String(switches[key])===value;})));
  if(!matches.length)return null;
  const specific=Math.max(...matches.map(r=>r.switches?.length||0));const choices=matches.filter(r=>(r.switches?.length||0)===specific);
  return choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))];
 }
 play(hero,event,{volume=.2,channel=null,switches={},loop=false}={}){
  if(!this.enabled)return false;
  const clip=this.clip(hero,event,switches);if(!clip)return false;
  if(channel)this.stopChannel(channel);
  while(this.active.size>=this.maxSounds){const old=this.active.values().next().value;old.pause();this.release(old);}
  const a=this.createAudio(clip.url);a.volume=Math.max(0,Math.min(1,volume));a.loop=loop==='native'?!!clip.nativeLoop:loop;
  this.active.add(a);if(channel)this.channels.set(channel,a);
  a.onended=()=>this.release(a);a.onerror=()=>this.release(a);
  try{Promise.resolve(a.play()).catch(()=>this.release(a));}catch{this.release(a);return false;}
  return true;
 }
 say(hero,state,priority=false,now=performance.now()){
  if(!this.enabled)return false;
  const event=this.manifests.get(hero)?.voices?.[state];if(!event)return false;
  const token=`${hero}:${state}`;
  if(now-(this.voiceTimes.get(token)??-Infinity)<60000)return false;
  if(!priority&&(now-this.lastVoice<20000||this.channels.has('hero-voice')))return false;
  // Skin0 model currently has helmet hidden; verified native Kaisa_helmet=off.
  const switches=hero==='Kaisa'?{'1671114642':'930712164'}:{};
  // Native Riven_ult switch: active name hashes to group; 2870082326 is bank default.
  if(hero==='Riven')switches['1140813797']=this.game?.player?.classic?.rUntil>this.game?.time?'1140813797':'2870082326';
  const played=this.play(hero,event,{volume:.48,channel:'hero-voice',switches});
  if(played){this.lastVoice=now;this.voiceTimes.set(token,now);}return played;
 }
 release(a){this.active.delete(a);for(const [key,current] of this.channels)if(current===a)this.channels.delete(key);}
 update(game){
  if(this.game!==game){this.game=game;this.reset(Math.max(0,...(game.combatEvents||[]).map(e=>e.id)));}
  const heroes=new Set((game.units||[]).filter(u=>u.hero&&CLASSIC_AUDIO_HEROES.has(u.hero.id)).map(u=>u.hero.id));
  for(const hero of heroes)if(!this.manifests.has(hero)&&!this.pending.has(hero)&&game.time>=(this.retryAt.get(hero)||0)){
   this.retryAt.set(hero,game.time+10);this.ensure(hero).then(()=>this.loadErrors.delete(hero)).catch(e=>this.loadErrors.set(hero,String(e)));
  }
  for(const e of game.combatEvents||[])this.event(e,{listener:game.player});this.buffs.update(game);this.karthus.update(game);
  for(const [channel,life] of this.lifetimes){const u=game.units.find(u=>u.id===life.id);if(!u?.alive||!(life.until.split('.').reduce((value,key)=>value?.[key],u.classic)>game.time)||Math.hypot(u.x-game.player.x,u.y-game.player.y)>=800)this.stopChannel(channel);}

 }
 event(event,{listener,switches={}}={}){
  if(!Number.isFinite(event.id)||event.id<=this.seen)return false;this.seen=event.id;
  if(!this.enabled||!listener)return false;
  const d=Math.hypot(event.x-listener.x,event.y-listener.y);if(!Number.isFinite(d)||d>=800)return false;
  const manifest=this.manifests.get(event.hero);if(!manifest)return false;
  // Recast animations require an explicit map; never play a first-cast cue for them.
  const animation=event.animation||event.state;
  const spell=event.presentationSpellName||event.spellName||(event.phase==='cast'&&animation===event.state?manifest.casts?.[event.state]:null);
  const authored=typeof event.audioCue==='string'?`Play_sfx_${event.hero}_${event.audioCue}`:null;
  let name=(authored&&manifest.events[authored]?authored:null)||manifest.bindings[spell]?.[event.phase]||(event.presentationSpellName&&event.phase==='attackStart'?manifest.bindings[spell]?.cast:null),channel=null,until=null;
  const route=event.phase==='cast'&&manifest.castRoutes?.[`${event.state}/${animation}`];
  if(route){const suffix=typeof route==='string'?route:route.event||(event.source?.id===listener.id?route.self:route.other);if(suffix)name=`Play_sfx_${event.hero}_${suffix}`;until=route.until;}
  if(event.phase==='hit'&&!name){
   // A named projectile must not use a state-only recast fallback for another missile.
   const hit=manifest.hitSpells?.[event.spellName]||(!event.spellName&&manifest.hitRoutes?.[event.state]);
   const suffix=typeof hit==='string'?hit:(event.target?.kind==='hero'?hit?.hero:hit?.other);
   if(suffix)name=`Play_sfx_${event.hero}_${suffix}`;
  }
  if(until&&event.source?.id!=null)channel=`${event.source.id}:${until}`;
  if(!name)return false;
  // Verified native E evolution branch; non-evolved uses the bank's declared default.
  if(event.hero==='Kaisa'&&event.source?.classic?.evolved?.e)switches={...switches,'905980143':'2989840802'};
  const played=this.play(event.hero,name,{volume:.2*(1-d/800),switches,channel});
  if(played){const time=Number.isFinite(event.time)?event.time:this.game?.time||0;this.recentCombatSounds=this.recentCombatSounds.filter(r=>time-r.time<.1);this.recentCombatSounds.push({name,time,x:event.x,y:event.y});}
  if(played&&channel)this.lifetimes.set(channel,{id:event.source.id,until});
  return played;
 }
}
