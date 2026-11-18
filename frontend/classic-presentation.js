const EKKO_MARKS={hero:[null,'Ekko_Base_P_Stack1','Ekko_Base_P_Stack2'],minion:[null,'Ekko_Base_P_Stack1_Minion','Ekko_Base_P_Stack2_Minion']};
// Native timelines for the priority release. No simulation or bot decisions live here.
export const PRIORITY_HEROES=new Set(['Mordekaiser','Yone','Ekko']);
export class ClassicPresentation {
 constructor(vfx,toNative){this.vfx=vfx;this.toNative=toNative;this.active=new Map();}
 reset(){for(const record of this.active.values())record.stopped=true;this.active.clear();}
 host(point,aim=point,follow=null){const a=this.toNative(point.x,point.y),b=this.toNative(aim.x,aim.y);return Object.assign(this.vfx.host(point.x,point.y,Math.atan2(b.x-a.x,b.z-a.z),follow),{height:0,sampleBirth:true,seedParticles:true});}
 emit(name,point,aim,follow,duration=.8){return this.vfx.emit(name,this.host(point,aim,follow),duration);}
 event(event,game){
  if(!PRIORITY_HEROES.has(event.hero))return false;
  const u=event.source;if(!u)return true;
  const from=event.from||u,aim=event.aim||u,key=event.state;
  if(event.phase==='cast'){
   if(event.hero==='Mordekaiser'){
    if(key==='q'){this.emit('Mordekaiser_Base_Q_Mace',from,aim,u,1);this.emit('Mordekaiser_Base_Q_Mace_Charge',from,aim,u,.5);}
    if(key==='e'){this.emit('Mordekaiser_Base_E_Cast_Ground',from,aim,null,1);this.emit('Mordekaiser_Base_E_aoe',from,aim,null,1.4);}
    if(key==='r')this.emit('Mordekaiser_Base_R_Cast_Beam',from,aim,u,.5);
   }else if(event.hero==='Yone'){
    if(key==='q')this.emit(event.animation==='q3'?'Yone_Base_Q3_Slash':'Yone_Base_Q1_Slash',from,aim,u,.7);
    if(key==='w'){this.emit('Yone_Base_W_Cas',from,aim,u,.6);this.emit('Yone_Base_W_Tell',from,aim,null,.5);}
    if(key==='e')this.emit('Yone_Base_E_Dash',from,aim,u,.5);
    if(key==='r'){this.emit('Yone_Base_R_Cas_Warning_Ally',from,aim,null,.75);this.emit('Yone_Base_R_Cas_Avatar',from,aim,u,.8);}
   }else if(event.hero==='Ekko'){
    if(key==='w'&&u.team===game.player?.team)this.emit('Ekko_Base_W_Branch_Timeline',from,aim,null,3);
    if(key==='r')this.emit('Ekko_Base_R_ChargeUp',from,aim,u,.5);
   }
  }else if(event.phase==='hit'&&event.target){
   const names={Mordekaiser:{q:'Mordekaiser_Base_Q_Hit',attack:'Mordekaiser_Base_BA_tar_R2L'},Yone:{q:event.animation==='q3'?'Yone_Base_Q3_Tar':'Yone_Base_Q1_Tar',w:'Yone_Base_W_Tar',r:'Yone_Base_R_Tar_Residual',attack:'Yone_base_BA_Tar_01'},Ekko:{q:'Ekko_Base_Q_Mis_Tar',attack:'Ekko_Base_BA_hit_tar'}};
   if(names[event.hero]?.[key])this.emit(names[event.hero][key],event.target,aim,event.target,.6);
  }
  return true;
 }
 update(game){
  const wanted=new Set();
  const keep=(key,name,point,follow=null,aim=point)=>{wanted.add(key);let record=this.active.get(key);if(!record||record.stopped){record=this.emit(name,point,aim,follow,1);if(record)this.active.set(key,record);}if(record){record.host.classicPersistent=true;record.host.follow=follow;record.host.x=point.x;record.host.y=point.y;record.duration=record.age+1;}};
  for(const u of game.units||[]){if(!u.alive)continue;const s=u.classic||{},h=u.hero?.id;
   if(h==='Mordekaiser'&&s.pStacks>=3&&s.pUntil>game.time)keep('morde-p:'+u.id,'Mordekaiser_Base_Passive_buf_AOE',u,u);
   if(h==='Mordekaiser'&&s.wUntil>game.time&&(u.supportState?.shieldParts||[]).some(p=>p.key==='mordeW'&&p.remaining>0&&p.until>game.time))keep('morde-w:'+u.id,'Mordekaiser_Base_W_Shields',u,u);
   if(h==='Yone'&&(u.supportState?.shieldParts||[]).some(p=>p.key==='yoneW'&&p.remaining>0&&p.until>game.time))keep('yone-w:'+u.id,'Yone_Base_W_Shield',u,u);
   if(h==='Ekko'&&(u.supportState?.shieldParts||[]).some(p=>p.key==='ekkoW'&&p.remaining>0&&p.until>game.time))keep('ekko-shield:'+u.id,'Ekko_Base_W_Shield',u,u);
   if(h==='Yone'&&s.soul&&!s.soul.returning)keep('yone-e:'+u.id,'Yone_Base_E_Demon_Avatar',u,u);
   if(h==='Yone'&&s.qStacks>=2&&s.qUntil>game.time)keep('yone-q3:'+u.id,'Yone_Base_Q3_Ready_Buf',u,u);
   for(const [source,mark]of Object.entries(u.classicEkkoMarks||{}))if(mark.until>game.time&&mark.stacks>0&&mark.stacks<3)keep('ekko-p:'+u.id+':'+source+':'+mark.stacks,EKKO_MARKS[u.kind==='minion'?'minion':'hero'][mark.stacks],u,u);
   if(h==='Ekko'&&s.speedUntil>game.time)keep('ekko-speed:'+u.id,'Ekko_Base_P_Speed_line',u,u);
   if(h==='Ekko'&&s.eUntil>game.time)keep('ekko-e:'+u.id,'Ekko_Base_E_Weapon_Glow',u,u);
  }
  for(const z of game.zones||[]){if(z.age>=z.duration)continue;
   if(z.kind==='mordeRealm')keep('realm:'+z.id,'Mordekaiser_Base_R_Arena',z);
   if(z.kind==='yoneSpirit')keep('soul:'+z.id,'Yone_Base_E_Timer',z);
   if(z.kind==='ekkoW'&&!z.triggered){const friendly=z.source?.team===game.player?.team;if(friendly||game.time>=z.revealAt)keep('ekko-w:'+z.id,friendly?'Ekko_Base_W_Indicator':'Ekko_Base_W_Cas_enemy',z);}
  }
  for(const[key,record]of this.active)if(!wanted.has(key)){record.stopped=true;this.active.delete(key);}
 }
}
