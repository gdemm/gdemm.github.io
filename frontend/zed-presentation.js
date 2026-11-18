import {ClassicScene} from './classic-scene.js';
export class ZedPresentation{
 constructor(vfx,toNative){this.vfx=vfx;this.toNative=toNative;this.scene=new ClassicScene(vfx.owner,toNative);this.effects=new Map();}
 reset(){this.scene.reset();for(const e of this.effects.values())e.stopped=true;this.effects.clear();}
 host(p,aim=p,follow=null){const a=this.toNative(p.x,p.y),b=this.toNative(aim.x,aim.y);return Object.assign(this.vfx.host(p.x,p.y,Math.atan2(b.x-a.x,b.z-a.z),follow),{height:0,sampleBirth:true,seedParticles:true});}
 event(e,g){if(e.hero!=='Zed')return false;const u=e.source;if(!u)return true;
  if(e.phase==='attackStart'){const aim=e.target||u.target||{x:u.x+Math.sin(u.facing||0),y:u.y+Math.cos(u.facing||0)};this.vfx.emit(u.animation==='attack2'?'Zed_Base_BA_cas_2':'Zed_Base_BA_cas_1',this.host(u,aim,u),.35);}
  if(e.phase==='hit'&&e.state==='attack'&&e.target)this.vfx.emit('Zed_Base_BA_tar',this.host(e.target,e.target,e.target),.45);
  if(e.phase==='cast'){
   if(['q','e'].includes(e.state)){for(const p of [u,...(g.zones||[]).filter(z=>z.kind==='zedShadow'&&z.source===u&&z.age<z.duration&&z.readyAt<=g.time)]){this.vfx.emit(e.state==='q'?'Zed_Base_Q_Cas':'Zed_Base_E_cas',this.host(p,e.aim||p,p),.6);const ghost=this.scene.ghosts.get(p.id);if(ghost)this.vfx.owner.play(ghost,e.state,e.id);}}
   else if(['w2','r2'].includes(e.animation))this.vfx.emit('Zed_Base_CloneSwap',this.host(u,u,u),.6);
   else if(e.state==='r')this.vfx.emit('Zed_Base_R_cas',this.host(u,e.aim||u,u),.8);
  }
  if(e.phase==='hit'&&e.state==='e'&&e.target)this.vfx.emit('Zed_Base_E_tar',this.host(e.target,e.target,e.target),.5);
  return true;
 }
 update(g,dt){const visible=new Set(),effects=new Set(),owner=this.vfx.owner,realm=g.player?.classicRealmId||0;
  const keep=(key,name,point,follow)=>{effects.add(key);let e=this.effects.get(key);if(!e||e.stopped){e=this.vfx.emit(name,this.host(point,point,follow),1);if(e)this.effects.set(key,e);}if(e){e.host.follow=follow;e.host.classicPersistent=true;e.duration=e.age+1;}};
  const local=g.player;if(local?.alive&&local.hero?.id==='Zed')for(const [id,until]of Object.entries(local.classic?.passiveTargets||{})){const target=(g.units||[]).find(u=>String(u.id)===id&&u.alive);if(until>g.time&&target)keep('passive:'+id,'Zed_Base_P_Timer_Ring_10s',target,target);}
  for(const z of g.zones||[]){if(z.age>=z.duration||(z.classicRealmId||0)!==realm)continue;
   if(z.kind==='zedDeathMark'&&!z.detonated&&z.target?.alive){keep('mark:'+z.id,'Zed_Base_R_tar_TargetMarker',z.target,z.target);continue;}
   if(z.kind!=='zedShadow'||!z.source?.alive)continue;visible.add(z.id);let r=this.scene.ghosts.get(z.id);
   if(!r){r=owner.create('Zed',z.source.team);if(!r)continue;r.model.traverse(o=>{if(!o.isMesh)return;const tint=m=>{const n=m.clone();n.color.set(0x332e49);n.transparent=true;n.opacity=.8;n.depthWrite=false;return n;};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);});this.scene.ghosts.set(z.id,r);owner.world.add(r.root);owner.play(r,'idle',0);}
   const p=this.toNative(z.x,z.y);r.root.position.set(p.x,owner.map.navigation.height(z.x,z.y),p.z);r.model.position.y=0;r.model.scale.setScalar(owner.templates.get('Zed')?.skinScale||1);r.root.rotation.y=owner.records.get(z.source.id)?.root.rotation.y||0;r.mixer.update(Math.max(0,dt));
   if(r.state!=='idle'&&r.current?.time>=r.current?.getClip().duration)owner.play(r,'idle',0);
   keep('shadow:'+z.id,'Zed_Base_Clone_idle',z,z);
  }
  for(const[id,r]of this.scene.ghosts)if(!visible.has(id)){this.scene.disposeGhost(r);this.scene.ghosts.delete(id);}
  for(const[id,e]of this.effects)if(!effects.has(id)){e.stopped=true;this.effects.delete(id);}
 }
}
