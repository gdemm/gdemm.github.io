// Authoritative flight presentation lifecycle. Actual launch range/damage
// validation remains the responsibility of the cannon gameplay controller.
export function beginCannonCue(g,u,{x,y,duration,enhanced=false}){
 if(!u?.alive||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(duration)||duration<=0||duration>30)return null;
 cancelCannonCue(g,u.id);
 g.cannonCueSerial=(g.cannonCueSerial||0)+1;
 const f={id:'cannon:'+g.cannonCueSerial,unitId:u.id,team:u.team,x,y,started:g.time,until:g.time+duration,enhanced:!!enhanced};
 (g.cannonFlights??=[]).push(f);return f;
}
export function cancelCannonCue(g,unitId){g.cannonFlights=(g.cannonFlights||[]).filter(f=>f.unitId!==unitId);}
export function updateCannonCues(g){
 const keep=[];g.cannonLandings=(g.cannonLandings||[]).filter(e=>g.time-e.at<1);
 for(const f of g.cannonFlights||[]){
  const u=g.units.find(u=>u.id===f.unitId);
  if(!u?.alive||g.winner!==null)continue;
  if(g.time<f.until){keep.push(f);continue;}
  g.cannonLandings.push({id:f.id,x:f.x,y:f.y,team:f.team,enhanced:f.enhanced,at:g.time});
 }
 g.cannonFlights=keep;
}
