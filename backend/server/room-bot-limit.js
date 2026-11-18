export const ROOM_HUMAN_BOT_LIMIT=50;
export const onlineHumans=room=>[...room.players.values()].filter(r=>!r.bot&&r.peer.connected).length;
export const roomBlocksBots=room=>onlineHumans(room)>ROOM_HUMAN_BOT_LIMIT;
export function clearRoomBots(room,selected=room.bots||[]){
 const bots=selected;if(!bots.length)return false;
 const removed=new Set(bots.map(b=>b.unit).filter(Boolean)),ids=new Set([...removed].map(u=>u.id));
 for(const u of removed){u.alive=false;u.hp=0;u.dest=null;u.target=null;u.attackWindup=null;u.dash=null;u.forcedMove=null;u.respawn=Infinity;}
 const selectedBots=new Set(bots);room.bots=(room.bots||[]).filter(bot=>!selectedBots.has(bot));
 const g=room.game;if(!g)return true;
 g.units=g.units.filter(u=>!removed.has(u));
 const referencesBot=x=>removed.has(x?.source)||removed.has(x?.u)||removed.has(x?.target)||removed.has(x?.follow)||removed.has(x?.itemOwner)||ids.has(x?.sourceId)||ids.has(x?.targetId);
 for(const key of ['projectiles','zones','effects','combatEvents','combatTimers','augmentJobs','expansionZones','expansionBombs'])if(Array.isArray(g[key]))g[key]=g[key].filter(x=>!referencesBot(x));
 for(const u of g.units){
  if(removed.has(u.target))u.target=null;
  if(removed.has(u.attackWindup?.target)){u.attackWindup=null;u.cd=0;}
  if(removed.has(u.forcedMove?.holder))u.forcedMove=null;
  if(removed.has(u.charmSource)){u.charmSource=null;u.charm=0;}
  if(ids.has(u.fearSourceId)){u.fearSourceId=null;u.fearUntil=0;}
  if(removed.has(u.lastHit))u.lastHit=null;
  if(referencesBot(u.dash)||removed.has(u.dash?.trackTarget))u.dash=null;
  for(const key of ['dariusBleeds','elderBurns','expansionOrbs','heartsteelCharge'])if(u[key])for(const [id,value] of Object.entries(u[key]))if(ids.has(Number(id))||referencesBot(value))delete u[key][id];
  for(const key of ['knightAlly','zekeAlly'])if(ids.has(u[key]))u[key]=null;
  if(u.expansionDots)u.expansionDots=u.expansionDots.filter(d=>!ids.has(d.sourceId));
  if(u.itemBurns)u.itemBurns=u.itemBurns.filter(d=>!removed.has(d.source));if(u.fiveDots)u.fiveDots=u.fiveDots.filter(d=>!removed.has(d.source));
  if(u.expansionItems?.promise&&ids.has(u.expansionItems.promise))u.expansionItems.promise=null;
 }
 if(removed.has(g.player)){const record=[...room.players.values(),...(room.bots||[])].find(r=>r.unit&&r.unit.alive);if(record){g.player=record.unit;g.items=record.items;}}
 return true;
}
