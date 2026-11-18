export function lightEmUpHit(g,{source:u,v,basic,hitDamage,meta={}}){
 if(!u?.alive||!u.augments?.includes('ARAM_LightemUp')||!basic||meta.itemAttack===false||meta.itemProc||meta.itemPhantom||meta.augmentProc||hitDamage<=0||v.team===u.team||!['hero','minion'].includes(v.kind))return;
 u.lightEmUpHits=((u.lightEmUpHits||0)+1)%4;if(u.lightEmUpHits||!v.alive||!g.canHit(v))return;
 const baseAD=u.hero.damage+Math.max(0,u.level-3)*4;
 const amount=11+69*(Math.max(1,Math.min(18,u.level))-1)/17+.35*Math.max(0,u.damage-baseAD)+.19*(u.ap||0);
 const aim=Math.atan2(v.y-u.y,v.x-u.x);
 for(let i=0;i<4;i++){const angle=aim+(i-1.5)*.2;
  g.shoot(u,angle,{lightEmUp:true,target:v,x:u.x+Math.cos(angle)*8,y:u.y+Math.sin(angle)*8,damage:amount,damageType:'magic',augmentProc:true,basic:false,speed:750,life:3,r:4,color:'#ffd872'});
 }
}
