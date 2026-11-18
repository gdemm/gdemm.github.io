// Visual-only projectile selection/replay. It never applies damage or changes
// authoritative projectile/unit arrays, cooldowns, speed, or collision.
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function unitAttackVfx(data,unit){return unit?.kind==='minion'&&unit.caster?data.units?.[unit.team?'RedCaster':'BlueCaster']:null;}
export function projectileEffect(data,p,phase=1){
 const state=p.effectState||'attack',hero=p.source?.hero?.id;
 const candidates=[phase===1?p.missileEffect:p.hitEffect,data.mapping?.[hero]?.[state]?.[phase],p.basic?data.mapping?.[hero]?.attack?.[phase]:null,unitAttackVfx(data,p.source)?.attack?.[phase]];
 return candidates.map(name=>data.heroEffectKeys?.[hero]?.[name?.toLowerCase()]||name).find(name=>name&&data.effects?.[name])||null;
}
export class ProjectileVisuals{
 constructor(){this.reset();}
 reset(){this.seen=new Set();this.replays=new Map();}
 remember(id){this.seen.add(id);if(this.seen.size>2048)this.seen.delete(this.seen.values().next().value);}
 collect(game,dt){
  const active=(game.projectiles||[]).filter(p=>p.life>0);
  for(const p of active){this.remember(p.id);this.replays.delete(p.id);}
  for(const event of game.combatEvents||[]){
   const p=event.missile;if(event.phase!=='launch'||!p?.basic||!p.source||this.seen.has(p.id))continue;
   this.remember(p.id);if(game.time-event.time>.5)continue;
   const from=finite(event.from)?event.from:Number.isFinite(p.fromX)&&Number.isFinite(p.fromY)?{x:p.fromX,y:p.fromY}:{x:event.x,y:event.y};
   const to=finite(p.visualEnd)?p.visualEnd:finite(p.target)?p.target:finite(p)?p:null;if(!finite(from)||!finite(to))continue;
   const distance=Math.hypot(to.x-from.x,to.y-from.y),speed=Math.hypot(p.vx||0,p.vy||0)||p.speed||530;if(distance<1)continue;
   const duration=Math.max(.09,Math.min(.35,distance/speed));
   this.replays.set(p.id,{...p,x:from.x,y:from.y,fromX:from.x,fromY:from.y,life:duration,age:0,distance:0,visualOnly:true,replayDuration:duration,replayTo:{x:to.x,y:to.y},hit:new Set()});
  }
  for(const[id,p]of this.replays){
   p.age+=Math.min(Math.max(dt,0),.05);const t=Math.min(1,p.age/p.replayDuration),to=p.replayTo;p.x=p.fromX+(to.x-p.fromX)*t;p.y=p.fromY+(to.y-p.fromY)*t;p.distance=Math.hypot(p.x-p.fromX,p.y-p.fromY);p.vx=(to.x-p.fromX)/p.replayDuration;p.vy=(to.y-p.fromY)/p.replayDuration;p.life=p.replayDuration-p.age;
   if(p.life<=0)this.replays.delete(id);
  }
  return active.concat([...this.replays.values()]);
 }
}
