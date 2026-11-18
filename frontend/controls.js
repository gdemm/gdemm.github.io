import {karthusSpellAvailable,karthusSpirit} from './karthus-ui.js';
import {targetedCastRange,targetPosition} from './target-selection-policy.js';
import {modifierRecastReady} from './augment-spell-modifiers.js';
import {canCastWithAugments} from './augment-rules.js';
import {validSkillTarget} from './extra-champions.js';
import {summonerId} from './summoner-spells.js';
import {targeting,spellRange,unitsPerNative} from './native-combat.js';
// Indicator quick-cast: hold the key to aim, release to cast; Shift retains normal cast.
export class LeagueControls {
 constructor({getGame,cast,inspect=()=>{},notice=()=>{},now=()=>performance.now()}){this.getGame=getGame;this.castNow=cast;this.inspect=inspect;this.notice=notice;this.now=now;this.pending=null;this.quickCast=false;this.queued=null;}
 pointerButton(pointerType,button){return pointerType==='touch'?(this.pending?0:2):button;}
 cancel(){this.pending=null;this.queued=null;}
 skill(index,aim,forceNormal=false){const g=this.getGame(),p=g.player;if(!karthusSpellAvailable(g,p,index))return false;if(!canCastWithAugments(p,index)){this.pending=null;this.queued=null;this.notice('返璞归真：终极技能已禁用');return false;}this.queued=null;if(modifierRecastReady(g,p,index)){this.pending=null;return this.castNow(index,p);}
  if(p.hero.id==='Yasuo'&&index===3){this.pending=null;return this.castNow(index,null);}
  const type=index<4?targeting(p,index):'';if(type.startsWith('Self')||(index>=4&&(summonerId(p,index)==='heal'||summonerId(p,index)==='mark'&&p.snowballMark?.until>g.time))||(p.hero.id==='Lux'&&index===2&&p.luxZone)){this.pending=null;return this.castNow(index,p);}
  if(type==='Unit'){this.pending={kind:'target',index};return true;}
  if(this.quickCast&&!forceNormal){this.pending=null;return this.castNow(index,aim);}this.pending={kind:'skill',index};return true;
 }
 keyDown(index,aim,normal=false){const result=this.skill(index,aim,normal);if(this.pending&&!normal&&!this.quickCast)this.pending.releaseIndex=index;return result;}
 keyUp(index,aim,target){if(!this.pending||this.pending.releaseIndex!==index)return false;return this.pointer(0,aim,target);}
 pointer(button,point,target,shift=false){const g=this.getGame();if(!g.player.alive&&!(button===0&&this.pending?.kind==='skill'&&karthusSpellAvailable(g,g.player,this.pending.index)))return false;
  if(button===2){this.cancel();if(shift){g.attackMove(point.x,point.y);return 'attackMove';}if(target&&target.team!==g.player.team){if(!g.canHit(target)){this.notice('该建筑仍受保护，请先摧毁前置防御塔');return 'blocked';}g.attackTarget(target);return 'attack';}g.move(point.x,point.y);return 'move';}
  if(button!==0)return;if(this.pending?.index!==undefined&&!canCastWithAugments(g.player,this.pending.index)){this.cancel();this.notice('返璞归真：终极技能已禁用');return false;}
  if(this.pending?.kind==='attackMove'){this.pending=null;g.attackMove(point.x,point.y);return 'attackMove';}
  if(this.pending?.kind==='skill'){const i=this.pending.index;this.pending=null;return this.castNow(i,point);}
  if(this.pending?.kind==='target'){
   const pending=this.pending,i=pending.index;
   if(!this.canTarget(target,i)){this.notice('请选择此技能可以作用的目标');return false;}
   if(this.inTargetRange(g,i,target)){
    if(!this.targetCastReady(g,i)){this.notice('技能尚未就绪，请稍后施放');return false;}
    const result=this.castNow(i,target);if(result)this.pending=null;return result;
   }
   this.pending=null;this.queued={index:i,target,targetId:target.id,game:g,casterId:g.player.id,casterLife:g.player.lifeSerial||0,targetLife:target.lifeSerial||0,lastMoveAt:-Infinity,lastCastAt:-Infinity};
   return this.trackTarget(g,this.queued,target,true);
  }
  this.inspect(target||null);return 'select';
 }
 attackMove(){this.queued=null;this.pending={kind:'attackMove'};}
 stop(hold=false){this.cancel();this.getGame().stop(hold);}
 canTarget(target,index=this.pending?.index){const g=this.getGame();return Number.isInteger(index)&&validSkillTarget(g.player,index,target)&&g.canHit(target);}
 inTargetRange(g,index,target){const a=targetPosition(g,g.player),b=targetPosition(g,target),range=targetedCastRange(g,g.player,index,target,spellRange(g.player,index),unitsPerNative(g));return Math.hypot(a.x-b.x,a.y-b.y)<=range;}
 targetCastReady(g,index){const p=g.player;return p.alive&&g.winner==null&&!(p.skills[index]>0||p.stun>0||p.silence>0||p.charm>0||p.castUntil>g.time||p.classicCastLockUntil>g.time||p.polymorphUntil>g.time||p.itemStasisUntil>g.time||p.dash||p.forcedMove)&&canCastWithAugments(p,index);}
 trackTarget(g,q,target,force=false){
  const at=this.now(),p=targetPosition(g,target),moved=!q.lastMove||Math.hypot(p.x-q.lastMove.x,p.y-q.lastMove.y)>2;
  if(!force&&(at-q.lastMoveAt<120||!moved&&at-q.lastMoveAt<750))return true;
  q.lastMoveAt=at;const sent=g.move(p.x,p.y);if(sent!==false)q.lastMove=p;return sent!==false;
 }
 update(){
  const q=this.queued;if(!q)return;const g=this.getGame(),p=g.player;
  if(g!==q.game||p.id!==q.casterId||(p.lifeSerial||0)!==q.casterLife){this.cancel();return;}
  const target=(g.units||[]).find(u=>u.id===q.targetId);
  if(!p.alive||!target||(target.lifeSerial||0)!==q.targetLife||!this.canTarget(target,q.index)||!canCastWithAugments(p,q.index)||g.winner!=null){this.cancel();if(p.alive)g.stop();return;}
  q.target=target;
  if(this.inTargetRange(g,q.index,target)){
   if(!this.targetCastReady(g,q.index)||this.now()-q.lastCastAt<120)return;
   q.lastCastAt=this.now();g.stop();if(this.castNow(q.index,target))this.queued=null;
  }else this.trackTarget(g,q,target);
 }
}
