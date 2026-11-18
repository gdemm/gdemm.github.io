// Visual-only projections. Ghosts are never inserted into the authoritative unit list.
export class ClassicScene {
 constructor(owner,toNative){this.owner=owner;this.toNative=toNative;this.ghosts=new Map();this.realm=0;this.game=null;this.savedColors=null;}
 disposeGhost(record){record.mixer.stopAllAction();record.mixer.uncacheRoot(record.model);this.owner.world.remove(record.root);record.model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});const skins=new Set();record.model.traverse(o=>{if(o.isSkinnedMesh)skins.add(o.skeleton);});for(const skeleton of skins)skeleton.dispose();}
 reset(){for(const record of this.ghosts.values())this.disposeGhost(record);this.ghosts.clear();this.restoreRealm();this.game=null;}
 restoreRealm(){if(this.savedColors){if(this.savedColors.background)this.owner.scene.background?.copy(this.savedColors.background);if(this.savedColors.fog)this.owner.scene.fog?.color.copy(this.savedColors.fog);}this.savedColors=null;this.realm=0;}
 update(game,dt){
  if(this.game!==game){this.reset();this.game=game;}
  const owner=this.owner,wanted=new Set(),playerRealm=game.player?.classicRealmId||0;
  if(playerRealm!==this.realm){this.restoreRealm();if(playerRealm){this.savedColors={background:owner.scene.background?.clone(),fog:owner.scene.fog?.color.clone()};owner.scene.background?.set(0x071a19);owner.scene.fog?.color.set(0x11332d);this.realm=playerRealm;}}
  for(const u of game.units||[]){
   const sameRealm=(u.classicRealmId||0)===playerRealm;
   const record=owner.records.get(u.id);if(record&&!sameRealm)record.root.visible=false;
   if(!sameRealm||!u.alive||u.teemoStealth&&u.team!==game.player?.team)continue;
   const point=u.hero?.id==='Ekko'?u.classicEcho:u.hero?.id==='Yone'&&!u.classic?.soul?.returning?u.classic?.soul?.anchor:null;
   if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))continue;
   const key=u.id+':'+u.hero.id;wanted.add(key);let ghost=this.ghosts.get(key);
   if(!ghost){ghost=owner.create(u.hero.id,u.team);if(!ghost)continue;ghost.model.traverse(o=>{if(!o.isMesh)return;const tint=m=>{const copy=m.clone();copy.transparent=true;copy.opacity=.32;copy.depthWrite=false;copy.color.set(u.team===game.player?.team?0x58dfcf:0xf17090);return copy;};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);});this.ghosts.set(key,ghost);owner.world.add(ghost.root);owner.play(ghost,'idle',0);}
   const p=this.toNative(point.x,point.y);ghost.root.position.set(p.x,owner.map.navigation.height(point.x,point.y),p.z);ghost.model.scale.setScalar((owner.templates.get(u.hero.id)?.skinScale||1)*(u.augmentSize||1));ghost.model.position.y=0;ghost.root.rotation.y=record?.root.rotation.y||0;ghost.root.visible=true;ghost.mixer.update(Math.max(0,dt));
  }
  for(const[key,record]of this.ghosts)if(!wanted.has(key)){this.disposeGhost(record);this.ghosts.delete(key);}
 }
}
