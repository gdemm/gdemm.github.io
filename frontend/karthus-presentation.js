import {karthusSpirit} from './karthus-ui.js';
export const KARTHUS_MAPPING={attack:['Karthus_Base_AA_Cas','Karthus_Base_AA_Mis','Karthus_Base_AA_Tar'],q:['Karthus_Base_Q_Hand_Glow',null,null],w:['Karthus_Base_W_Hand_Glow',null,null],e:[],r:[]};
export function karthusEffectName(effect,game){if(effect.hero!=='Karthus'||effect.nativeTeam===undefined||effect.nativeTeam===game.player.team)return null;return {Karthus_Base_Q_Point:'Karthus_Base_Q_Point_red',Karthus_Base_Q_Ring:'Karthus_Base_Q_Ring_red'}[effect.nativeName]||null;}
export class KarthusPresentation{
 constructor(vfx,toNative){this.vfx=vfx;this.toNative=toNative;this.active=new Map();this.game=null;}
 reset(){for(const entry of this.active.values())entry.instance.stopped=true;this.active.clear();}
 update(game){
  if(this.game!==game){this.reset();this.game=game;}
  const wanted=new Set(),vfx=this.vfx;
  const add=(key,name,host,length)=>{wanted.add(key);const old=this.active.get(key);if(old?.name===name)return;if(old)old.instance.stopped=true;host.classicPersistent=true;const instance=vfx.emit(name,host,3600,length);if(instance)this.active.set(key,{name,instance});};
  const follow=(u,height=0)=>Object.assign(vfx.host(u.x,u.y,0,u),{height});
  for(const u of game.units||[]){
   if((u.classicRealmId||0)!==(game.player.classicRealmId||0))continue;
   const red=u.team!==game.player.team;
   if(u.hero?.id==='Karthus'&&(u.alive||karthusSpirit(game,u))&&u.karthusDefile)
    add(`${u.id}:e`,karthusSpirit(game,u)?'Karthus_Base_P_Defile'+(red?'_Red':''):'Karthus_Base_E_Defile'+(red?'_Red':''),follow(u));
   if(u.alive&&u.karthusWallMRUntil>game.time)add(`${u.id}:wall-debuff`,'Karthus_Base_W_Debuff_MR_Shred',follow(u,110));
   if((u.alive||karthusSpirit(game,u))&&u.karthusRequiemUntil>game.time){
    add(`${u.id}:r`,'Karthus_Base_R_Cas',follow(u));add(`${u.id}:r-hands`,'Karthus_Base_R_Cas_Hand_Glow',follow(u,100));
    for(const target of u.karthusRequiemTargets||[]){const v=game.units.find(v=>v.id===target.id&&v.alive&&(v.lifeSerial||0)===target.life);if(v&&(v.classicRealmId||0)===(u.classicRealmId||0))add(`${u.id}:r:${v.id}`,'Karthus_Base_R_Target',follow(v));}
   }
  }
  for(const z of game.zones||[]){
   if(z.kind!=='karthusWall'||game.time<z.activeAt||z.age>=z.duration||(z.classicRealmId||0)!==(game.player.classicRealmId||0))continue;
   const red=z.source?.team!==game.player.team,a=this.toNative(z.ax,z.ay),b=this.toNative(z.bx,z.by),length=Math.hypot(b.x-a.x,b.z-a.z),angle=Math.atan2(b.x-a.x,b.z-a.z);
   add(`wall:${z.id}`,'Karthus_Base_W_Wall'+(red?'_Red':''),Object.assign(vfx.host(z.ax,z.ay,angle),{height:0,sampleBirth:true,seedParticles:true,nativeMeshBeam:true}),length);
   for(const [end,x,y]of [['a',z.ax,z.ay],['b',z.bx,z.by]])add(`wall:${z.id}:${end}`,'Karthus_Base_W_Post'+(red?'_Red':''),Object.assign(vfx.host(x,y,angle),{height:0}));
  }
  for(const [key,entry]of this.active)if(!wanted.has(key)){entry.instance.stopped=true;this.active.delete(key);}
 }
}
