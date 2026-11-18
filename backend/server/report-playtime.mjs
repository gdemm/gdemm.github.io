import {readFileSync} from 'node:fs';
import {shanghaiDay} from './playtime-metrics.js';
const day=process.argv[2]||shanghaiDay(Date.now());
if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||process.argv.length<4){console.error('usage: node report-playtime.mjs YYYY-MM-DD metrics.json [...]');process.exit(2);}
const visitors=new Set(),players=new Map(),byFile=[];
for(const file of process.argv.slice(3)){
 let data;
 try{data=JSON.parse(readFileSync(file,'utf8'));}catch(error){if(error.code==='ENOENT')continue;throw error;}
 const entry=data.days?.[day];if(!entry)continue;
 for(const id of entry.visitors||[])visitors.add(id);
 for(const [id,ms] of Object.entries(entry.players||{}))players.set(id,(players.get(id)||0)+ms);
 byFile.push({file,visitors:(entry.visitors||[]).length,enteredMatch:Object.keys(entry.players||{}).length,totalPlayerMinutes:Math.round(Object.values(entry.players||{}).reduce((sum,ms)=>sum+ms,0)/60000*10)/10});
}
const times=[...players.values()].sort((a,b)=>a-b),total=times.reduce((a,b)=>a+b,0),median=times.length?(times[Math.floor((times.length-1)/2)]+times[Math.floor(times.length/2)])/2:0;
console.log(JSON.stringify({date:day,timezone:'Asia/Shanghai',uniqueVisitors:visitors.size,enteredMatch:times.length,playedAtLeast1Min:times.filter(ms=>ms>=60000).length,playedAtLeast5Min:times.filter(ms=>ms>=300000).length,lobbyOrUnder1Min:visitors.size-times.filter(ms=>ms>=60000).length,totalPlayerHours:Math.round(total/3600000*100)/100,medianPlayedMinutes:Math.round(median/60000*10)/10,byFile},null,2));
