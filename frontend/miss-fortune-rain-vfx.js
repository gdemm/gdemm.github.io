// E's source roots contain textureless child-spawners. Drive their native
// bullet/ground-impact systems from the authoritative rain zone instead.
export class MissFortuneRainVfx {
 constructor(vfx){this.vfx=vfx;this.reset();}
 reset(){this.zones=new Map();this.bullets=[];}
 update(game){
  const fx=this.vfx,t=game.time;
  for(const b of this.bullets){b.anchor.visualHeight=Math.max(0,520*(1-(t-b.start)/.45));if(t-b.start>=.45)b.anchor.life=0;}
  this.bullets=this.bullets.filter(b=>b.anchor.life>0);
  const live=new Set();
  for(const z of game.zones||[]){if(z.kind!=='mfRain'||t<z.start||t>=z.until)continue;live.add(z.id);
   let last=this.zones.get(z.id);if(last===undefined)last=t-.1;
   if(t-last<.099)continue;this.zones.set(z.id,t);
   if(this.bullets.length>=48||fx.particles.length>400)continue;
   const n=Math.floor((t-z.start)*10),seed=Math.sin(z.id*73+n*37)*43758.5453,part=seed-Math.floor(seed),angle=n*2.399963+z.id,r=Math.sqrt(part)*z.r*.92;
   const x=z.x+Math.cos(angle)*r,y=z.y+Math.sin(angle)*r,anchor={x,y,visualHeight:520,life:1};
   fx.emit('MissFortune_Base_E_Child_Bullet_Dirt',{x,y,angle:0,follow:anchor,sampleBirth:true,seedParticles:true},.45);
   fx.emit('MissFortune_Base_E_Hit_Dirt',{x,y,angle:0,height:0,sampleBirth:true},1.1);
   this.bullets.push({anchor,start:t});
  }
  for(const id of this.zones.keys())if(!live.has(id))this.zones.delete(id);
 }
}
