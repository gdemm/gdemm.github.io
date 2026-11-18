export const realmId=u=>u?.classicRealmId??u?.source?.classicRealmId??0;
export const canInteract=(a,b)=>!a||!b||realmId(a)===realmId(b);
export function constrainRealm(g,u,point){const id=realmId(u);if(!id)return point;const z=(g.zones||[]).find(z=>z.id===id&&z.kind==='mordeRealm'&&z.age<z.duration);if(!z)return point;const dx=point.x-z.x,dy=point.y-z.y,d=Math.hypot(dx,dy),r=z.r-(u.radius||0);return d<=r?point:{x:z.x+dx/d*r,y:z.y+dy/d*r};}
// Per-player projection must run after the team trap projection: two allies may
// currently inhabit different realms. Roster/KDA metadata is not removed.
export function recipientRealmView(snapshot,unit){
 const realm=realmId(unit),byId=new Map(snapshot.units.map(u=>[u.id,u.classicRealmId||0]));
 const inView=x=>{const source=x.source?.$unit??x.follow?.$unit??x.ownerUnitId;return (x.classicRealmId??(source===undefined?realm:byId.get(source)??0))===realm;};
 return {...snapshot,units:snapshot.units.filter(u=>(u.classicRealmId||0)===realm),projectiles:(snapshot.projectiles||[]).filter(inView),zones:(snapshot.zones||[]).filter(z=>z.kind==='mordeRealm'?z.id===realm:inView(z)),effects:(snapshot.effects||[]).filter(inView),combatEvents:(snapshot.combatEvents||[]).filter(inView)};
}
