// Native UrfsChampionQuest milestone is 18 takedowns. Rewards are delivered
// through an explicit per-unit inventory owner, never the currently selected player.
export const URF_QUEST_TARGET=18;
export function questTakedown(game,unit,victim,eventId){
 if(!unit?.augments?.includes('ARAM_Quest_UrfsChampion')||victim?.kind!=='hero'||unit.team===victim.team)return;
 const q=unit.urfChampionQuest??={progress:0,complete:false,pending:false,lastEvent:null};
 if(q.complete||eventId===q.lastEvent)return;
 q.lastEvent=eventId;q.progress=Math.min(URF_QUEST_TARGET,q.progress+1);
 if(q.progress===URF_QUEST_TARGET){q.complete=true;q.pending=true;}
 deliverQuestReward(game,unit);
}
export function deliverQuestReward(game,unit){
 const q=unit.urfChampionQuest;if(!q?.pending)return false;
 let granted=false;
 if(game.grantQuestItemForUnit)granted=game.grantQuestItemForUnit(unit,'4403');
 else {
  const items=unit===game.player?game.items:unit.inventoryItems;
  if(items&&items.length<6&&!items.includes('4403')){items.push('4403');unit.inventoryItems=[...items];granted=true;}
 }
 if(!granted)return false;
 q.pending=false;game.refreshAugmentStats?.(unit);
 // Free rewards invalidate previous shop undo snapshots (which would erase them).
 if(unit===game.player)game.shopHistory=[];
 return true;
}
export function itemQuestStatus(unit,id){
 if(id!=='ARAM_Quest_UrfsChampion')return null;
 const q=unit.urfChampionQuest;
 return q?.complete
  ?{badge:q.pending?'待领':'完成',text:q.pending?'任务完成 · 金铲铲待领取（需空装备格且未持有同名装备）':'任务完成 · 金铲铲已领取'}
  :{badge:String(q?.progress||0),text:`参与击杀 ${q?.progress||0}/${URF_QUEST_TARGET}`};
}
