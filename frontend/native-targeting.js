import {karthusSpellAvailable} from './karthus-ui.js';
import {loadCriticalTexture} from './critical-texture.js';
import {canCastWithAugments} from './augment-rules.js';
import {SETT_E} from './melee-e.js';
import {SETT_W} from './sett-w.js';
import {windwallSpec} from './yasuo-rules.js';
import {MoveIndicator,MOVE_INDICATOR_DURATION} from './move-indicator.js?v=move-click-1';
import {summonerId,SUMMONERS} from './summoner-spells.js';
import {spell,spellRange,unitsPerNative,targeting} from './native-combat.js';
import * as THREE from 'three';
import {gameToNative,MAP_CONFIG} from './original-map.js';
// Original installed spell textures; these profiles reflect the current local simulation.
export function aimProfile(player,pending){
 if(player.hero.id==='Karthus'&&pending?.index===1){const k=player.nativeUnitsMultiplier||.5;return{shape:'wall',range:1000*k,width:(700+100*(player.spellRanks?.[1]||1))*k,thickness:50*k};}
 if(!pending||!canCastWithAugments(player,pending.index))return null;if(player.hero.id==='Sylas'&&pending.kind==='skill'&&pending.index===0){const k=player.nativeUnitsMultiplier||.5;return{shape:'line',range:spellRange(player,0)*k,width:90*k};}
 const k=player.nativeUnitsMultiplier||.5;if(player.hero.id==='DrMundo'&&pending.kind==='skill'&&pending.index===1)return{shape:'range',range:325*k};if(player.hero.id==='ElderDragon'&&pending.kind==='skill'&&pending.index===0)return{shape:'cone',range:750*k,angle:53};if(player.hero.id==='Darius'&&pending.kind==='skill'&&pending.index===0)return{shape:'range',range:425*k};if(player.hero.id==='Darius'&&pending.kind==='skill'&&pending.index===2)return{shape:'cone',range:535*k,width:500*k};if(player.hero.id==='Yasuo'&&pending.kind==='skill'&&pending.index===1){const w=windwallSpec(player);return{shape:'wall',range:400*k,offset:w.previewOffset*k,width:w.previewWidth*k,thickness:w.thickness*k};}if(player.hero.id==='Yasuo'&&pending.index===0)return{shape:'line',range:spellRange(player,0)*k,width:80*k};if(player.hero.id==='Sett'&&pending.index===1)return{shape:'cone',range:SETT_W.range*k,width:SETT_W.farHalfWidth*2*k,texture:SETT_W.texture,centerWidth:SETT_W.centerHalfWidth*2*k};if(player.hero.id==='Sett'&&pending.index===2)return{shape:'self-texture',range:SETT_E.range*k,texture:SETT_E.texture};
 if(player.hero.id==='Jhin'&&pending.index===3)return {shape:'cone',range:3500*k,width:4041*k};
 if(player.hero.id==='MissFortune'&&pending.index===3)return {shape:'cone',range:1400*k,width:1600*k};
 if(pending.kind==='attackMove')return {shape:'range',range:player.range+(player.radius||0)};
 if(pending.index>=4){const id=summonerId(player,pending.index),d=SUMMONERS[id],scale=player.nativeUnitsMultiplier||.5;return id==='mark'?{shape:'line',range:d.range*scale,width:50*scale}:{shape:'range',range:d.range*scale};}
 const source=spell(player,pending.index)?.data;
 if(source){const scale=player.nativeUnitsMultiplier||.5,range=spellRange(player,pending.index)*scale,definitions=source.mClientData?.mTargeterDefinitions||[],lines=definitions.filter(d=>d.__type==='TargeterDefinitionLine'),aoe=definitions.find(d=>d.__type==='TargeterDefinitionAoe');
  if(targeting(player,pending.index).startsWith('Self'))return{shape:'range',range};
  if(targeting(player,pending.index)==='Unit')return {shape:'range',range};
  if(aoe)return {shape:'area',range,radius:(source.castRadius?.[1]||100)*scale,texture:aoe.textureRadiusOverrideName?.split('/').pop()?.replace('.tex','')};
  if(lines.length){const line=lines[0],width=(line.lineWidth?.mPerLevelValues?.[0]||source.mLineWidth||80)*scale;return {shape:'line',range,width,global:!!line.useGlobalLineIndicator,minimap:!!line.useGlobalLineIndicator||definitions.some(d=>d.__type==='TargeterDefinitionMinimap'),angles:lines.map(d=>d.endLocator?.angleOffsetRadian||0),textureBase:line.textureBaseOverrideName?.split('/').pop()?.replace('.tex','')||(line.useGlobalLineIndicator?'locallinemissilebase':undefined),textureTarget:line.textureTargetOverrideName?.split('/').pop()?.replace('.tex','')||(line.useGlobalLineIndicator?'globallinemissiletarget':undefined)};}
  return {shape:'area',range,radius:(player.hero.id==='Ezreal'?35:source.castRadius?.[1]||100)*scale};
 }
 // Synthetic test fixtures only.
 const type=player.hero.skills[pending.index]?.[4];if(type==='fan')return {shape:'cone',range:650,width:590};if(type==='zone')return {shape:'area',range:430,radius:135};return {shape:'line',range:760,width:22};
}
export function globalPreviewLength(profile,player,aim,map){
 const dx=aim.x-player.x,dy=aim.y-player.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
 if(!map.unproject)return Math.min(profile.range,Math.max(profile.width*4,1600*(player.nativeUnitsMultiplier||.5)));
 const points=[[0,0],[map.w,0],[map.w,map.h],[0,map.h]].map(([x,y])=>map.unproject(x,y));const reach=Math.max(...points.map(p=>(p.x-player.x)*ux+(p.y-player.y)*uy));return Math.min(profile.range,Math.max(profile.width*4,reach+profile.width*2));
}
export function drawGlobalMinimapAim(ctx,game,pending,aim,point){const profile=aimProfile(game.player,pending);if(!game.player.alive||!profile?.global||!profile.minimap)return false;const p=game.player,dx=aim.x-p.x,dy=aim.y-p.y,d=Math.hypot(dx,dy);if(d<.001)return false;const a=point(p.x,p.y),b=point(p.x+dx/d*profile.range,p.y+dy/d*profile.range);ctx.save();ctx.beginPath();ctx.rect(0,0,224,224);ctx.clip();const w=point(p.x-dy/d*profile.width,p.y+dx/d*profile.width),band=Math.max(6,Math.hypot(w.x-a.x,w.y-a.y));ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=band;ctx.strokeStyle='rgba(0,217,223,.38)';ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle='#5ff4ff';ctx.stroke();ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fillStyle='#5ff4ff';ctx.fill();ctx.restore();return true;}
export class NativeTargeting {
 constructor(owner){this.owner=owner;this.ready=false;this.parts=[];this.seen=new WeakSet();this.markers=[];}
 load(){if(!this.loading)this.loading=this.loadRequired().catch(error=>{this.loading=null;throw error;});return this.loading;}
 async loadRequired(){this.textures={};
  const getJson=url=>fetch(url,{priority:'high'}).then(r=>{if(!r.ok)throw Error('必要指示器资料加载失败：'+url);return r.json();});
  const image=async(n,url)=>{const t=await loadCriticalTexture(url);t.colorSpace=THREE.SRGBColorSpace;this.textures[n]=t;};
  const overrides=getJson('assets/controls/overrides.json').then(rows=>Promise.all(Object.values(rows).map(url=>image(url.split('/').pop().replace('.png',''),url))));
  const geometries=Promise.all(['movement_indicator4','cursor_moveto','shockwavetrail'].map(name=>getJson('assets/controls/'+name+'.mesh.json').then(m=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(m.position,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(m.uv,2));if(name==='movement_indicator4')g.computeVertexNormals();return g;})));
  await Promise.all([overrides,geometries.then(rows=>{[this.markerGeometry,this.shadowGeometry,this.ringGeometry]=rows;}),...['locallinemissilebase','locallinemissiletarget','globallinemissilebase','globallinemissiletarget','conicrangeindicator','circularrangeindicatorul','aoe','color-movetogreen','movement_indicator','line03','black'].map(n=>image(n,'assets/controls/'+n+'.png'))]);
  this.ready=true;globalThis.AramLoadProgress?.progress('targeting',1,1);
 }

 plane(texture){const material=new THREE.MeshBasicMaterial({map:this.textures[texture]||(texture==='aoe_brand'?this.textures.aoe:null),color:0xffffff,transparent:true,opacity:1,depthWrite:false,depthTest:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});const p=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);p.renderOrder=2000;this.owner.world.add(p);this.parts.push(p);return p;}
 clear(){for(const p of this.parts){this.owner.world.remove(p);p.geometry.dispose();if(p.material.map?.userData.nativePreviewClone)p.material.map.dispose();p.material.dispose();}this.parts=[];}
 place(p,x,y,width,length,angle=0){const n=gameToNative(x,y);p.position.set(n.x,this.owner.map.navigation.height(x,y)+12,n.z);p.quaternion.setFromEuler(new THREE.Euler(Math.PI/2,angle,0,'YXZ'));p.scale.set(width*MAP_CONFIG.scale,length*MAP_CONFIG.scale,1);}
 ring(p,range,start){const n=gameToNative(p.x,p.y),r=range*MAP_CONFIG.scale;for(let k=0;k<4;k++){const part=this.parts[start+k],a=k*Math.PI/2;part.position.set(n.x+(Math.cos(a)-Math.sin(a))*r/2,this.owner.map.navigation.height(p.x,p.y)+12,n.z+(-Math.sin(a)-Math.cos(a))*r/2);part.quaternion.setFromEuler(new THREE.Euler(Math.PI/2,a,0,'YXZ'));part.scale.set(r,r,1);}}
 update(game,pending,aim,dt){if(!this.ready)return;
 const mark=game.player.hero.id==='Sett'?(game.player.settWCast?.until>game.time?{index:1,cast:game.player.settWCast}:game.player.settECast?.until>game.time?{index:2,cast:game.player.settECast}:null):null;if(mark){pending={kind:'skill',index:mark.index};aim={x:game.player.x+mark.cast.dir.x,y:game.player.y+mark.cast.dir.y};}
 const profile=karthusSpellAvailable(game,game.player,pending?.index)?aimProfile(game.player,pending):null,key=profile?JSON.stringify(profile):'';
 // Small fixed pool is rebuilt only when spell type changes, never every frame.
 if(key!==this.key){this.clear();this.key=key;if(profile){if(profile.shape==='line'){for(const a of profile.angles||[0]){const base=this.plane(profile.textureBase||'locallinemissilebase');if(profile.global){base.material.map=base.material.map.clone();base.material.map.userData.nativePreviewClone=true;base.material.map.wrapT=THREE.ClampToEdgeWrapping;}this.plane(profile.textureTarget||'locallinemissiletarget');}}else if(profile.shape==='cone')this.plane(profile.texture||'conicrangeindicator');else if(profile.shape==='self-texture')this.plane(profile.texture);else if(profile.shape==='area')this.plane(profile.texture||'aoe');else if(profile.shape==='wall'){for(let k=0;k<4;k++)this.plane('line03');}else for(let k=0;k<4;k++)this.plane('circularrangeindicatorul');
  this.ringStart=this.parts.length;if(profile.shape!=='range'&&profile.range>0&&!profile.global)for(let k=0;k<4;k++){const q=this.plane('circularrangeindicatorul');q.material.opacity=.55;}}}
 if(profile){let p=game.player,dx=aim.x-p.x,dy=aim.y-p.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;let a=gameToNative(p.x,p.y),b=gameToNative(aim.x,aim.y),angle=Math.atan2(b.x-a.x,b.z-a.z);
 if(profile.shape==='line'){const tip=Math.max(10,profile.width*1.8),len=profile.global?globalPreviewLength(profile,p,aim,this.owner.map):profile.range,drawWidth=profile.width*(profile.global?1:2);for(const [i,offset]of (profile.angles||[0]).entries()){const a=Math.atan2(uy,ux)+offset,x=Math.cos(a),y=Math.sin(a);this.place(this.parts[i*2],p.x+x*(len-tip)/2,p.y+y*(len-tip)/2,drawWidth,len-tip,angle-offset);this.place(this.parts[i*2+1],p.x+x*(len-tip/2),p.y+y*(len-tip/2),drawWidth,tip,angle-offset);if(profile.global)this.parts[i*2].material.map.repeat.set(1,1);}}
 else if(profile.shape==='self-texture')this.place(this.parts[0],p.x,p.y,profile.range*2,profile.range*2,angle);
 else if(profile.shape==='cone')this.place(this.parts[0],p.x+ux*profile.range/2,p.y+uy*profile.range/2,profile.width,profile.range,angle);
 else if(profile.shape==='wall'){const offset=profile.offset??Math.min(profile.range,d),x=p.x+ux*offset,y=p.y+uy*offset,edge=2/(game.mapConfig?.scale||MAP_CONFIG.scale);for(let i=0;i<2;i++){const side=i?1:-1;this.place(this.parts[i],x+ux*profile.thickness*.5*side,y+uy*profile.thickness*.5*side,profile.width,edge,angle);this.place(this.parts[i+2],x-uy*profile.width*.5*side,y+ux*profile.width*.5*side,edge,profile.thickness,angle);}}
 else if(profile.shape==='area'){const r=Math.min(profile.range,d);this.place(this.parts[0],p.x+ux*r,p.y+uy*r,profile.radius*2,profile.radius*2);}
 if(this.parts.length>=this.ringStart+4&&profile.shape!=='range')this.ring(p,profile.range,this.ringStart);
 else if(profile.shape==='range'){const n=gameToNative(p.x,p.y),r=profile.range*MAP_CONFIG.scale;for(let k=0;k<4;k++){const part=this.parts[k],a=k*Math.PI/2;part.position.set(n.x+(Math.cos(a)-Math.sin(a))*r/2,this.owner.map.navigation.height(p.x,p.y)+12,n.z+(-Math.sin(a)-Math.cos(a))*r/2);part.quaternion.setFromEuler(new THREE.Euler(Math.PI/2,a,0,'YXZ'));part.scale.set(r,r,1);}}}
 for(const e of game.effects){if(e.type!=='move'||this.seen.has(e))continue;this.seen.add(e);const animation=new MoveIndicator({geometry:this.markerGeometry,shadowGeometry:this.shadowGeometry,ringGeometry:this.ringGeometry,texture:this.textures['movement_indicator'],line:this.textures.line03,black:this.textures.black}),m=animation.root;const n=gameToNative(e.x,e.y);m.position.set(n.x,this.owner.map.navigation.height(e.x,e.y)+3,n.z);this.owner.world.add(m);this.markers.push({object:m,e,animation});}
 this.markers=this.markers.filter(m=>{const age=Math.max(0,(m.e.max??MOVE_INDICATOR_DURATION)-m.e.life);if(m.e.life<=0||age>=MOVE_INDICATOR_DURATION||!game.effects.includes(m.e)){m.animation.dispose();return false;}m.animation.update(age);return true;});
 while(this.markers.length>16)this.markers.shift().animation.dispose();
 }
}
