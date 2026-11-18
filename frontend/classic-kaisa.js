import {shieldUnit} from './combat-support.js';
import {state,scale,distance,value,passiveValue,effectValue,bonusAD,canCast,beginCast,cue,dash,damage,enemies,clamp} from './classic-common.js';
export function kaisaBonusAS(u){return (u.itemAttackSpeed||0)+(u.augmentAttackSpeed||0)+(u.attackSpeedGrowth||0)*Math.max(0,u.level-1)/100;}
export function updateKaisa(g,u){
 const s=state(u);s.evolved??={};
 s.evolutionEligible={
  q:u.damage-u.hero.damage-Math.max(0,u.level-3)*4+Math.max(0,u.level-1)*(u.hero.nativeADGrowth||0)>=effectValue(u,0,6,100),
  w:(u.ap||0)>=effectValue(u,1,2,100),
  e:kaisaBonusAS(u)*100>=effectValue(u,2,6,100)
 };
 if(s.evolution){const evolution=s.evolution;if(!u.alive||u.stun>0||u.silence>0||u.charm>0||!s.evolutionEligible[evolution.slot]||distance(u,evolution)>1)cancelKaisaEvolution(g,u);else if(g.time>=evolution.until){s.evolved[evolution.slot]=true;cancelKaisaEvolution(g,u);}}
 if(s.eChargeUntil&&s.eChargeUntil<=g.time){s.eChargeUntil=0;s.eBuffUntil=g.time+effectValue(u,2,2,4);u.classicDisarmedUntil=0;u.classicCastLockUntil=0;cue(g,u,'Kaisa_Base_E_End_weapon');}
 if(s.eStealthUntil<=g.time)u.teemoStealth=false;
}
export function kaisaPlasma(g,u,v,count=1,{ally=false}={}){
 if(!v.alive||!['hero','minion'].includes(v.kind))return;
 v.classicPlasma??={};let mark=v.classicPlasma[u.id];if(!mark||mark.until<=g.time)mark=v.classicPlasma[u.id]={stacks:0,until:0,source:u};
 mark.until=g.time+passiveValue(u,'PDuration',4);
 const max=passiveValue(u,'PMaxStacks',4);
 if(ally){mark.stacks=Math.min(max,mark.stacks+count);return;}
 for(let i=0;i<count&&v.alive;i++){
  mark.stacks++;
  if(mark.stacks>max){mark.stacks=0;damage(g,u,v,(v.maxHp-v.hp)*(passiveValue(u,'PExecuteRatio',.15)+(u.ap||0)*passiveValue(u,'PExecuteAPRatio',.0006)),'magic','passive');cue(g,u,'Kaisa_Base_P_Max_hit_tar',v);}
 }

}
export function kaisaAfterDamage(g,u,v,{basic,meta}){
 if(!basic||meta.classicProc||!v.alive)return;
 const mark=v.classicPlasma?.[u.id],stacks=mark?.until>g.time?mark.stacks:0,level=clamp((u.level-1)/17,0,1);
 damage(g,u,v,4+26*level+passiveValue(u,'PAPRatioBase',.12)*(u.ap||0)+stacks*(1+7*level+passiveValue(u,'PAPRatioPerStack',.03)*(u.ap||0)),'magic','passive');
 kaisaPlasma(g,u,v);u.skills[2]=Math.max(0,u.skills[2]-effectValue(u,2,4,.5));
}
export function castKaisa(g,i,aim,h){
 const u=g.player,s=state(u);updateKaisa(g,u);if(!canCast(g,u,i)||u.classicCastLockUntil>g.time)return false;
 const near=enemies(g,u).filter(v=>!v.teemoStealth&&distance(u,v)<=600*scale(g)+v.radius);
 if(i===0&&!near.length)return false;
 if(i===1&&(!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y)))return false;
 if(i===2&&s.eChargeUntil>g.time)return false;
 if(i===3){
  if(u.root>0||u.grounded>0||!Number.isFinite(aim?.x)||!Number.isFinite(aim?.y))return false;
  const marked=enemies(g,u).some(v=>v.kind==='hero'&&v.classicPlasma?.[u.id]?.stacks>0&&v.classicPlasma[u.id].until>g.time&&distance(u,v)<=value(u,3,'RRange')*scale(g)+v.radius&&distance(v,aim)<=525*scale(g));
  if(!marked||g.navigation&&!g.navigation.canWalk(aim.x,aim.y))return false;
 }
 beginCast(g,u,i,aim,h);
 if(i===0){
  const amount=value(u,0,'BaseDamage')+value(u,0,'BonusADRatio')*bonusAD(u)+value(u,0,'APRatio')*(u.ap||0),count=effectValue(u,0,s.evolved.q?7:2,s.evolved.q?12:6),hits=new Map();
  for(let n=0;n<count;n++)h.schedule(g,u,n*.04,()=>{
   const alive=near.filter(v=>v.alive);if(!alive.length)return;const target=alive[n%alive.length];
   h.missile(g,u,'KaisaQ','q',target,{target,range:25000,damage:0,missileEffect:'Kaisa_Base_Q_Flashbang_Mis',onHit:v=>{
    const repeats=hits.get(v.id)||0;hits.set(v.id,repeats+1);
    const bonus=v.kind==='minion'&&v.hp/v.maxHp<value(u,0,'MinionHPThreshold',.35)?value(u,0,'MinionDamageMultiplier',2):1;
    damage(g,u,v,amount*(repeats?value(u,0,'ExtraHitReduction',.25):1)*bonus,'physical','q');
   }});
  });
  cue(g,u,'Kaisa_Base_Q_cas');
 }
 if(i===1){
  cue(g,u,'Kaisa_Base_W_cas',u,.4);
  u.castUntil=g.time+.4;h.schedule(g,u,.4,()=>h.missile(g,u,'KaisaW','w',aim,{range:3000,damage:effectValue(u,1,1,30)+1.3*u.damage+.45*(u.ap||0),damageType:'magic',pierce:false,filter:v=>['hero','minion'].includes(v.kind),missileEffect:s.evolved.w?'Kaisa_Base_W_evolved_mis':'Kaisa_Base_W_mis',onHit:v=>{
   kaisaPlasma(g,u,v,effectValue(u,1,s.evolved.w?5:4,s.evolved.w?3:2));
   if(s.evolved.w&&v.kind==='hero')u.skills[1]*=1-effectValue(u,1,3,75)/100;
   cue(g,u,v.kind==='hero'?(s.evolved.w?'Kaisa_Base_W_Evolved_Tar_Champ':'Kaisa_Base_W_Tar_Champ'):'Kaisa_Base_W_tar',v);
   cue(g,u,'Kaisa_Base_W_vision_tar',v,4);
  }}));
 }
 if(i===2){const duration=Math.max(effectValue(u,2,8,.6),effectValue(u,2,3,1.2)-.4*kaisaBonusAS(u));s.eChargeUntil=g.time+duration;u.classicDisarmedUntil=s.eChargeUntil;u.classicCastLockUntil=s.eChargeUntil;
  if(s.evolved.e){s.eStealthUntil=g.time+effectValue(u,2,7,.5);u.teemoStealth=true;cue(g,u,'Kaisa_Base_E_stealth_activate');}
 }
 if(i===3){shieldUnit(g,u,u,value(u,3,'RBaseValue')+value(u,3,'RTotalADRatio')*u.damage+value(u,3,'RAPRatio')*(u.ap||0),value(u,3,'RShieldDuration',2),{state:'r',key:'kaisaR'});dash(g,u,aim,value(u,3,'RRange')+525,{throughWalls:true,speed:2400});cue(g,u,'Kaisa_Base_R_Dash_Start');}
 return true;
}
export function kaisaMove(g,u){return state(u).eChargeUntil>g.time?u.baseMoveSpeed*effectValue(u,2,1,.55)*Math.min(2,1+kaisaBonusAS(u)):0;}
export function kaisaAttackSpeed(g,u){return state(u).eBuffUntil>g.time?effectValue(u,2,5,.4):0;}

export function startKaisaEvolution(g,u,index){
 if(u.hero?.id!=='Kaisa'||![0,1,2].includes(index))return false;updateKaisa(g,u);const s=state(u),slot='qwe'[index];
 if(!u.alive||g.winner!==null||u.stun>0||u.silence>0||u.charm>0||u.root>0||u.dash||u.forcedMove||u.castUntil>g.time||u.classicCastLockUntil>g.time||s.evolution||s.evolved[slot]||!s.evolutionEligible[slot])return false;
 s.evolution={slot,x:u.x,y:u.y,until:g.time+2};u.dest=null;u.target=null;u.attackWindup=null;u.classicRootUntil=s.evolution.until;u.classicCastLockUntil=s.evolution.until;u.classicDisarmedUntil=s.evolution.until;return true;
}
export function cancelKaisaEvolution(g,u){const s=state(u);if(!s.evolution)return;s.evolution=null;u.classicRootUntil=0;u.classicCastLockUntil=0;u.classicDisarmedUntil=0;}

export function kaisaAttackSpell(g,u,target,critical=false){
 const active=u.classic?.eBuffUntil>g.time,mark=target.classicPlasma?.[u.id];
 const plasma=mark?.until>g.time&&mark.stacks>=passiveValue(u,'PMaxStacks',4);
 if(plasma)return active?'KaisaEPAttack':'KaisaPAttack';
 if(active)return critical?'KaisaECritAttack':'KaisaEAttack';
 return critical?'KaisaCritAttack':'KaisaBasicAttack';
}
