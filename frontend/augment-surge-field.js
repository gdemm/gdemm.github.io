export function inSurgeField(g,u){const f=u.surgeField;return !!f&&u.alive&&f.until>g.time&&Math.hypot(u.x-f.x,u.y-f.y)<=300/(g.mapConfig?.scale||2);}
export function surgeOnCast(g,u,index){
 if(index!==3||!u.augments?.includes('SurgeField'))return;
 u.surgeField={x:u.x,y:u.y,until:g.time+6,relocations:0,leaving:false};
}
export function updateSurgeField(g,u){
 const f=u.surgeField;
 if(f&&u.alive&&f.until>g.time&&!f.leaving&&!inSurgeField(g,u)){
  if(f.relocations===0){f.x=u.x;f.y=u.y;f.relocations=1;}
  else {f.leaving=true;f.until=Math.min(f.until,g.time+.5);}
 }
 const active=inSurgeField(g,u),haste=active?50:0;
 if((u.surgeHaste||0)!==haste){u.surgeHaste=haste;g.refreshAugmentStats?.(u);}
 if(active)u.augmentMoveMultiplier*=1.4;
 if(f&&(!u.alive||f.until<=g.time))u.surgeField=null;
}
export function surgeAfterDamage(g,{source:u,v,dealt,meta={}}){
 if(!u?.augments?.includes('SurgeField')||!inSurgeField(g,u)||u.farmOnly||meta.augmentProc||meta.itemProc||dealt<=0||v.team===u.team||!['hero','minion'].includes(v.kind))return;
 const amount=Math.max(0,Math.min(dealt,dealt+v.hp))*.2;
 const target=v.alive&&g.canHit(v)?v:g.nearest(u,900/(g.mapConfig?.scale||2),t=>['hero','minion'].includes(t.kind));
 if(!target||amount<=0)return;
 g.shoot(u,Math.atan2(target.y-u.y,target.x-u.x),{surgeMissile:true,target,damage:amount,damageType:'magic',augmentProc:true,basic:false,speed:800,life:3,r:5,color:'#b594ff'});
}
