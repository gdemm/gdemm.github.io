import {itemById} from './client-shop-query.js';
import {garenArmorMultiplier} from './melee-e.js';
import {tryndCrit} from './tryndamere.js';
import {classicResource} from './classic-resource-ui.js';
import {championResource} from './extra-champions.js';
const finite=v=>typeof v==='number'&&Number.isFinite(v),round=v=>finite(v)?String(Math.round(v)):'—';
export function targetPanelValues(game,target){
 if(!target)return null;const u=(game.units||[]).find(u=>u.id===target.id);if(!u||!u.alive||u.teemoStealth&&u.team!==game.player.team||(u.classicRealmId||0)!==(game.player.classicRealmId||0))return null;
 const self=u.id===game.player.id,row=game.scoreboard?.find(r=>r.unitId===u.id),hero=u.hero?.id,resource=hero?(classicResource(u)||championResource(u)):null;
 const values={AD:round(u.damage+(u.dariusBonusAD||0)+(u.mundoBonusAD||0)),AP:round(u.ap),Armor:round(u.armor*(hero?garenArmorMultiplier(u,game.time):1)),MR:round(u.mr),AS:finite(u.period)&&u.period>0?(1/u.period).toFixed(2):'—',AH:finite(u.haste)&&u.haste>0?round((1/u.haste-1)*100):round(u.abilityHaste),Crit:finite(u.crit)?round(Math.min(1,hero?tryndCrit(u)*(hero==='Yasuo'?2.5:1):u.crit)*100)+'%':'—',MS:round(u.speed*(game.mapConfig?.scale||2))};
 const score=row||(self?{kills:game.kills,deaths:game.deaths,assists:game.assists}:null),items=row?.items||(self?game.items:[]),stacks=row?.itemStacks||(self?game.itemStacks:{});
 return {id:u.id,name:u.playerName||u.hero?.title||u.label||({minion:'小兵',tower:'防御塔',nexus:'水晶枢纽',inhibitor:'召唤水晶'}[u.kind]||''),hero,portrait:hero?`assets/${hero}.png`:['tower','nexus','inhibitor'].includes(u.kind)?`assets/ui/minimap-${u.kind}.png`:null,ally:u.team===game.player.team,level:round(u.level),hp:`${Math.ceil(u.hp)} / ${Math.round(u.maxHp)}`,hpRatio:Math.max(0,Math.min(1,u.hp/u.maxHp||0)),resource:resource?`${Math.floor(resource.value)} / ${Math.round(resource.max)}`:u.noMana||!u.maxMp?'':`${Math.floor(u.mp)} / ${Math.round(u.maxMp)}`,resourceRatio:resource?Math.max(0,Math.min(1,resource.value/resource.max||0)):Math.max(0,Math.min(1,u.mp/u.maxMp||0)),resourceColor:u.classicEnergy?'Yellow':'Blue',values,kda:hero?(score?[round(score.kills),round(score.deaths),round(score.assists)].join('/'):'—'):'',cs:hero?round(finite(u.creepScore)?u.creepScore:self?(game.creepScore??0):undefined):'',items:Array.from({length:7},(_,i)=>{const item=itemById(items?.[i]);return item?{id:item.id,icon:item.icon,name:item.name,stack:stacks?.[item.id]>1?String(stacks[item.id]):''}:null})};
}
