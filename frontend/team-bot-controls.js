// Actions belong to the team they modify; no separate camp selector is needed.
export function renderTeamBotControls(online,root){
 for(const id of ['onlineBotTeam','onlineBot','onlineRemoveBot'])document.getElementById(id)?.style.setProperty('display','none','important');
 const room=online.room,me=room?.players?.find(p=>p.id===online.id),canManage=!!me&&(room.continuous||room.matchmaking||room.hostId===online.id&&room.phase==='waiting');
 const blockedAdd=!canManage||room?.roomBotsBlocked||!online.botPolicy?.allowed||(room?.botCount||0)>=30||(room?.count||0)>=room?.maxPlayers;
 for(const [team,section]of [...root.querySelectorAll('.team-roster')].entries()){
  let controls=section.querySelector('.team-bot-actions');
  if(!controls){controls=document.createElement('div');controls.className='team-bot-actions';controls.style.cssText='display:flex;gap:8px;margin:8px 0 12px;padding-bottom:10px;border-bottom:1px solid #27414d';
   for(const [action,label]of [['addBot','添加玩家'],['removeBot','移除玩家']]){const button=document.createElement('button');button.type='button';button.dataset.botAction=action;button.textContent=label;button.setAttribute('aria-label',(team===0?'蓝方':'红方')+label);button.style.cssText='flex:1;min-height:36px;padding:6px 10px;border:1px solid #49616b;border-radius:4px;background:#102631;color:#dec992';button.onclick=()=>online.send({type:action,team});controls.append(button);}section.querySelector('h3')?.after(controls);
  }
  controls.querySelector('[data-bot-action="addBot"]').disabled=!!blockedAdd;
  controls.querySelector('[data-bot-action="removeBot"]').disabled=!canManage||!(room?.removableBotCounts?.[team]>0);
 }
}
