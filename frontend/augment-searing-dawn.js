// Installed Kiwi: 40..200 level damage, 0.75s proc cooldown.
// Web adaptation: marks are owner-specific and last until consumption/death.
export function searingDawnHit(game,{source,target,basic=false,meta={},hitDamage=0}){
 if(!source?.hero||!target?.alive||source.team===target.team||!['hero','minion'].includes(target.kind)||hitDamage<=0||meta.augmentProc||meta.itemProc)return;
 const skill=!basic&&/^[qwer]/.test(meta.state||'');if(!basic&&!skill)return;
 const marks=target.searingDawnMarks??={};
 for(const[id,mark]of Object.entries(marks)){
  const owner=game.units.find(u=>u.id===Number(id));
  if(!owner?.hero||owner.team===target.team||!owner.augments?.includes('ARAM_SearingDawn')){delete marks[id];continue;}
  if(owner===source||owner.team!==source.team)continue;
  const timers=target.searingDawnCooldowns??={};
  if((timers[owner.id]??-Infinity)>game.time)continue;
  delete marks[id];timers[owner.id]=game.time+.75;
  if(!target.alive)break;
  const before=target.hp;
  game.hurt(target,mark.damage,owner,0,0,'magic',false,{state:'augment',augmentProc:true});
  owner.searingDawnDamage=(owner.searingDawnDamage||0)+Math.max(0,before-target.hp);
  game.fx('burst',target.x,target.y,'#ffc55f',30,.35);
 }
 if(skill&&target.alive&&source.augments?.includes('ARAM_SearingDawn'))marks[source.id]={damage:40+160*(Math.max(1,Math.min(18,source.level||1))-1)/17};
}
