import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

const DAY_MS=86_400_000;
const SHANGHAI_OFFSET_MS=8*3_600_000;
const MAX_SAMPLE_GAP_MS=2_000;
export const shanghaiDay=at=>new Date(at+SHANGHAI_OFFSET_MS).toISOString().slice(0,10);
const digest=(game,identity)=>createHash('sha256').update(game+'\0'+identity).digest('hex');

// A "play" is connected human time inside a playing match, not a lobby socket.
// No IP, nickname, raw session token or chat content is written to disk.
export class PlaytimeMetrics {
 constructor({game,file,activePlayers,now=Date.now,autoStart=true}){
  this.game=game;this.file=file;this.activePlayers=activePlayers;this.now=now;
  this.active=new Map();this.days={};this.dirty=false;this.timer=null;
  try{const saved=JSON.parse(readFileSync(file,'utf8'));if(saved.schema===1&&saved.game===game&&saved.days&&typeof saved.days==='object')this.days=saved.days;else throw Error('incompatible playtime file');}
  catch(error){if(error.code!=='ENOENT')console.error('Playtime metrics load:',error.message);}
  if(autoStart){this.timer=setInterval(()=>{try{this.sample();this.flush()}catch(error){console.error('Playtime metrics:',error.message)}},1000);this.timer.unref?.();}
 }
 visit(identity,at=this.now()){
  if(typeof identity!=='string'||!identity)return;
  const hash=digest(this.game,identity),day=this.day(shanghaiDay(at));
  if(!day.visitors.includes(hash)){day.visitors.push(hash);this.dirty=true;}
 }
 day(key){return this.days[key]??= {visitors:[],players:{}};}
 addPlay(hash,from,to){
  while(from<to){
   const nextMidnight=(Math.floor((from+SHANGHAI_OFFSET_MS)/DAY_MS)+1)*DAY_MS-SHANGHAI_OFFSET_MS;
   const end=Math.min(to,nextMidnight),day=this.day(shanghaiDay(from));
   day.players[hash]=(day.players[hash]??0)+(end-from);
   this.dirty=true;from=end;
  }
 }
 sample(at=this.now()){
  const seen=new Set();
  for(const entry of this.activePlayers()){
   if(!entry||typeof entry.identity!=='string'||!entry.identity)continue;
   const hash=digest(this.game,entry.identity),key=hash+'|'+String(entry.roomId)+'|'+String(entry.round);
   if(seen.has(key))continue;seen.add(key);
   this.visit(entry.identity,at);
   const previous=this.active.get(key);
   if(previous){const ms=Math.max(0,Math.min(at-previous,MAX_SAMPLE_GAP_MS));if(ms)this.addPlay(hash,at-ms,at);}
   else {const day=this.day(shanghaiDay(at));if(day.players[hash]===undefined){day.players[hash]=0;this.dirty=true;}}
   this.active.set(key,at);
  }
  for(const key of this.active.keys())if(!seen.has(key))this.active.delete(key);
 }
 flush(){
  if(!this.dirty)return;
  const keep=Object.keys(this.days).sort().slice(-30),days=Object.fromEntries(keep.map(key=>[key,this.days[key]]));
  mkdirSync(dirname(this.file),{recursive:true,mode:0o700});
  const temp=this.file+'.tmp-'+process.pid;
  writeFileSync(temp,JSON.stringify({schema:1,game:this.game,timezone:'Asia/Shanghai',days}),{mode:0o600});
  renameSync(temp,this.file);this.days=days;this.dirty=false;
 }
 close(){if(this.timer)clearInterval(this.timer);this.sample();this.flush();}
 summary(key=shanghaiDay(this.now())){
  const day=this.days[key]??{visitors:[],players:{}},seconds=Object.values(day.players).map(ms=>ms/1000);
  return {date:key,game:this.game,visitors:day.visitors.length,enteredMatch:seconds.length,playedAtLeast1Min:seconds.filter(s=>s>=60).length,playedAtLeast5Min:seconds.filter(s=>s>=300).length,under1MinOrLobby:day.visitors.length-seconds.filter(s=>s>=60).length,totalPlayerSeconds:seconds.reduce((a,b)=>a+b,0)};
 }
}
