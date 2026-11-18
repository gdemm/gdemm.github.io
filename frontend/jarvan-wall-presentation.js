export class JarvanWallPresentation{
 constructor(vfx,toNative){this.vfx=vfx;this.toNative=toNative;this.active=new Map();}
 reset(){for(const e of this.active.values())e.stopped=true;this.active.clear();}
 update(g){const wanted=new Set();for(const z of g.zones||[]){if(z.kind!=='jarvanWall'||z.age>=z.duration)continue;
  for(let i=0;i<12;i++){const key=z.id+':'+i;wanted.add(key);const angle=i*Math.PI/6,point={x:z.x+Math.cos(angle)*z.r,y:z.y+Math.sin(angle)*z.r},a=this.toNative(z.x,z.y),b=this.toNative(point.x,point.y);let e=this.active.get(key);
   if(!e||e.stopped){e=this.vfx.emit('JarvanIV_Base_R_Wall_rock_01',Object.assign(this.vfx.host(point.x,point.y,Math.atan2(b.x-a.x,b.z-a.z),point),{height:0,sampleBirth:true,seedParticles:true,classicPersistent:true}),1);if(e)this.active.set(key,e);}
   if(e){e.host.follow=point;e.duration=e.age+1;}
  }
 }
 for(const[key,e]of this.active)if(!wanted.has(key)){e.stopped=true;this.active.delete(key);}
 }
}
