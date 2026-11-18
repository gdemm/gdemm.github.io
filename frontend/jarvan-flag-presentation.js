import {ClassicScene} from './classic-scene.js';
export class JarvanFlagPresentation extends ClassicScene{
 update(g,dt){if(this.game!==g){this.reset();this.game=g;}const owner=this.owner,visible=new Set(),realm=g.player?.classicRealmId||0;
  for(const z of g.zones||[]){if(z.kind!=='jarvanFlag'||z.age>=z.duration||(z.classicRealmId||0)!==realm)continue;visible.add(z.id);let r=this.ghosts.get(z.id);
   if(!r){r=owner.create('JarvanIVStandard',z.source?.team||0);if(!r){if(!owner.modelLoads.has('JarvanIVStandard'))owner.ensureModels(['JarvanIVStandard']).catch(e=>console.warn('Flag model unavailable',e));continue;}
    r.model.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});this.ghosts.set(z.id,r);owner.world.add(r.root);owner.play(r,'idle',0);
   }
   const point=this.toNative(z.x,z.y);r.root.position.set(point.x,owner.map.navigation.height(z.x,z.y),point.z);r.model.scale.setScalar(owner.templates.get('JarvanIVStandard')?.skinScale||1);r.model.position.y=0;r.mixer.update(Math.max(0,dt));
  }
  for(const[id,r]of this.ghosts)if(!visible.has(id)){
   if(r.removeAt===undefined){owner.play(r,'death',1);r.removeAt=g.time+(r.current?.getClip().duration||.4);}
   r.mixer.update(Math.max(0,dt));if(g.time>=r.removeAt){this.disposeGhost(r);this.ghosts.delete(id);}
  }
 }
}
