import {predictClientWalk} from './client-movement-prediction.js';
// Browser state container: snapshots, UI queries and local presentation notices only.
// Deliberately no step/hurt/shoot/cast simulation, AI, item procs or world spawning.
import {HEROES,LOBBY_UNITS} from './client-catalog.js';
import {SHOP_ITEMS,quotePurchase,inShopRange} from './client-shop-query.js';
import {canInteract} from './classic-realms.js';
export {HEROES};
export const ITEMS=SHOP_ITEMS;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class Game {
 constructor(hero=HEROES[0]){
  this.time=0;this.units=[];this.projectiles=[];this.combatEvents=[];this.zones=[];
  this.effects=[];this.floaters=[];this.events=[];this.killEvents=[];this.signals=[];
  this.relics=[];this.augmentZones=[];this.crueltyComets=[];this.cannonFlights=[];this.cannonLandings=[];
  this.score=[0,0];this.wave=0;this.nextWave=0;this.winner=null;this.gold=0;
  this.items=[];this.itemStacks={};this.shopHistory=[];this.kills=0;this.deaths=0;this.assists=0;
  this.announce='';this.announceUntil=0;this.hasAuthoritativeSnapshot=false;
  this.player={...structuredClone(LOBBY_UNITS[hero.id]||LOBBY_UNITS[HEROES[0].id]),id:0,hero,player:true,slot:0,inventoryItems:[],augments:[],augmentOffers:[],summoners:['flash','heal'],dest:null,target:null,order:'stop',autoAttack:false};
  this.units=[this.player];
 }
 useOriginalMap(config,navigation){this.mapConfig=config;this.navigation=navigation;}
 walk(unit,target,dt,forced=false){return predictClientWalk(this,unit,target,dt,forced);}
 canHit(u){
  if(!u||u.classicUntargetableUntil>this.time||u.yiUntargetableUntil>this.time||u.fountain||u.itemStasisUntil>this.time)return false;
  if(this.mapConfig&&u.stage!==undefined)return u.alive&&!this.units.some(v=>v.alive&&v.team===u.team&&v.stage!==undefined&&v.stage<u.stage);
  return u.alive&&(!(u.kind==='nexus')||!this.units.some(t=>t.team===u.team&&t.kind==='tower'&&t.alive))&&(!(u.kind==='tower'&&u.order===0)||!this.units.some(t=>t.team===u.team&&t.kind==='tower'&&t.order===1&&t.alive));
 }
 enemies(u){return this.units.filter(v=>v.team!==u.team&&this.canHit(v)&&canInteract(u,v));}
 nearest(u,max=Infinity,filter=()=>true){let target=null,best=max;for(const v of this.units){if(v.team===u.team||v.teemoStealth||!this.canHit(v)||!canInteract(u,v)||!filter(v))continue;const d=distance(u,v);if(d<best){best=d;target=v;}}return target;}
 event(text){this.events.push({text,time:this.time});if(this.events.length>6)this.events.shift();}
 banner(text){this.announce=text;this.announceUntil=this.time+3.5;}
 notice(text,unit=this.player){if(unit===this.player)this.banner(text);}
 quoteItem(id){return quotePurchase(this,id);}
 canShop(){return this.winner===null&&inShopRange(this);}
}
