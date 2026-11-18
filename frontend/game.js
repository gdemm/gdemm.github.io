import './fetch-retry.js';
import {drawMinimapViewport} from './minimap-viewport.js';
import {drawLaneMinimap} from './minimap-lane.js';
import {installNativeMinimapControls} from './native-minimap-controls.js';
import {NativeTargetPanel} from './native-target-panel.js';
import {visibleBanner} from './quiet-combat-ui.js';
import {karthusResource} from './karthus-ui.js';
import {DeferredShop} from './deferred-shop.js';
import {startResilientRender} from './resilient-render-loop.js';
import {KaisaEvolutionUI} from './kaisa-evolution-ui.js';
import {installMobileTouch,qualityDpr,isTouch} from './mobile-touch.js';
import {install as installCannon} from './cannon-client-production.js';
import './classic-load-progress.js';
import {drawAutocastAugments} from './augment-autocast-visuals.js';
import {installCloseGuard} from './close-guard.js';
import {installCameraLock} from './camera-lock.js';
import {CameraDrag} from './camera-drag.js';
import {drawFountainBeams} from './fountain-defense.js';
import {drawElderEffects} from './elder-dragon.js';
import {PurchaseHint} from './purchase-hint.js';import {QuickHud} from './quick-hud.js';
import {autoBuild} from './auto-build.js';
import {unitColor,TeamIconCache} from './team-colors.js';
import {SignalInput,NativeSignals} from './signal-ui.js';
import {NativeAnnouncements} from './native-announcements.js';
import {activeItemIds} from './item-effects.js';
import {drawGlobalMinimapAim} from './native-targeting.js';
import {championResource as baseChampionResource} from './extra-champions.js';
const championResource=u=>karthusResource(u)||baseChampionResource(u);
import {drawMinimapPortrait} from './minimap-portraits.js?v=minimap-portrait-1';
import {MatchSocial,isTextInput} from './match-social.js?v=social-1';
import {NativeGameHeader} from './game-header.js?v=game-header-1';
import {NativePlayerHud,ITEM_HOTKEYS} from './player-hud.js?v=online-audio-1';
import {AramOnline,applyOnlineSnapshot,bindOnlineCommands,interpolateOnline} from './online-client.js?v=social-1';
document.documentElement.dataset.build='room-flow-6';
import {summonerId,summonerDescription,SUMMONERS} from './summoner-spells.js?v=hextech-aram-3';
import {LeagueControls} from './controls.js';
import {MythicShop} from './mythic-shop.js?v=shop-missiles-1';
import {itemById} from './client-shop-query.js';
import {NativeHealthbars} from './healthbars.js';
import {OriginalAudio} from './original-audio.js?v=online-audio-1';
import {NativeFloatingText} from './floating-text.js?v=native-floating-text-skillup-1';
import {AugmentSelection} from './augment-selection.js?v=augment-clean-1';
import {MAP_CONFIG,gameToNative,nativeToGame} from './original-map.js?v=grass-1';
import {OriginalModelRenderer} from './models3d.js?v=grass-1';
import {Game,HEROES,ITEMS,clamp,distance} from './client-state.js';
const $=id=>document.getElementById(id),canvas=$('arena'),ctx=canvas.getContext('2d'),mini=$('minimap'),mc=mini.getContext('2d');
const MATCH_HEROES=HEROES.filter(hero=>!['ElderDragon','RiftHerald','BaronNashor'].includes(hero.id));
let selected=MATCH_HEROES[Math.floor(Math.random()*MATCH_HEROES.length)],game=new Game(selected),playing=false,onlinePlaying=false,paused=false,last=performance.now(),visualTime=0,zoom=.7,cam={x:1600,y:0},manualCam=false,mouse={x:1700,y:0},screenMouse={x:0,y:0},W=innerWidth,H=innerHeight,dpr=qualityDpr(devicePixelRatio||1),audio=null,sound=true,resultShown=false,keys=new Set(),uiTime=0,cameraZoom=1,selectedUnit=null,spaceWasManual=null,miniDragPointer=null,hoveredUnit=null,hoverAt=0;
let online=null;let social=null;let pendingOnlineSnapshot=null;
const nativeHeader=new NativeGameHeader();const targetPanel=new NativeTargetPanel();const nativeAnnouncements=new NativeAnnouncements();
const originalAudio=new OriginalAudio();const floatingText=new NativeFloatingText();const healthbars=new NativeHealthbars();
const augmentUI=new AugmentSelection($('augmentDialog'),$('augmentHud'),{getGame:()=>game,isOnline:()=>onlinePlaying,onOpen:()=>{if(!onlinePlaying)paused=true;originalAudio.stop();},onClose:()=>{if(!onlinePlaying)paused=false;last=performance.now();originalAudio.setEnabled(sound);},onSound:key=>originalAudio.ui(key)});
const nativeHud=new NativePlayerHud($('hud'),{getGame:()=>game,onCast:i=>cast(i),onEquipment:i=>equipmentClick(i),onNotice:t=>game.banner(t),onUpgrade:()=>originalAudio.ui('skill-upgrade')});installMobileTouch({game:()=>game,get controls(){return controls;},on:()=>playing&&!paused&&!document.querySelector('dialog[open]'),unproject:(x,y)=>unproject(x,y),setMouse:p=>{mouse=p;},shop:()=>shop(),upgrade:i=>nativeHud.upgrade(i),canUpgrade:i=>nativeHud.canUpgrade(i),skillPoints:()=>game?.player?.skillPoints||0,cooldown:i=>game?.player?.skills?.[i]||0,canHit:u=>{try{return game.canHit(u);}catch{return true;}},applyQuality:()=>{dpr=qualityDpr(devicePixelRatio||1);try{resize();}catch{dispatchEvent(new Event('resize'));}}});
fetch('assets/ui/texts-zh.json').then(r=>r.json()).then(data=>{for(const el of document.querySelectorAll('[data-native-text]')){const label=data.labels[el.dataset.nativeText];if(label)el.textContent=label.text;}}).catch(()=>{});
const images={};function heroPortrait(name){return images[name]??(images[name]=Object.assign(new Image(),{src:`assets/${name}.png`}));}
const miniIcons={};for(const name of ['tower','nexus','inhibitor','healthpack']){let im=new Image();im.src=`assets/ui/minimap-${name}.png`;miniIcons[name]=im;}
const colors=['#74d9ed','#e888a6'];const teamIcons=new TeamIconCache();
let entryVersion=0,entryLoading=false;
let originals;originals=new OriginalModelRenderer($('modelPreview'),(message,error)=>{
 $('modelStatus').textContent=message;$('modelStatus').classList.toggle('error',!!error);
 const state=$('lobbyResourceStatus');if(state)state.textContent=error?'资源加载失败':entryLoading?message:'进入战斗时加载地图与英雄';
 const progress=document.querySelector('#resourceStatus .aram-load-phase');if(progress&&!error)progress.textContent=message;globalThis.AramLoadProgress?.label(message,error);
});
$('start').disabled=false;$('modelPreview').hidden=true;
$('modelStatus').textContent='选英雄页仅显示立绘，进入战斗后加载 3D 场景';
if($('lobbyResourceStatus'))$('lobbyResourceStatus').textContent='进入战斗时加载地图与英雄';
async function prepareBattle(heroIds,options={}){if(!images['2dlevelminimap']){const im=new Image();im.src='assets/2dlevelminimap.png';images['2dlevelminimap']=im;}entryLoading=true;$('start').disabled=true;online?.render();showLoadFailure(null);const audioReady=originalAudio.classic.prepare(heroIds);const ok=await originals.load(heroIds,options);await audioReady;entryLoading=false;$('start').disabled=false;online?.render();if(!ok)showLoadFailure(originals.error);return ok;}

function resize(){W=innerWidth;H=innerHeight;dpr=qualityDpr(devicePixelRatio||1);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}addEventListener('resize',resize);resize();
function project(x,y,z=0){if(originals?.ready&&originals.map?.ready)return originals.map.project(x,y,z);return{x:W/2+(x-cam.x)*zoom,y:H*.48+(y-cam.y)*zoom*.78-(x-cam.x)*zoom*.29-z*zoom};}
function unproject(x,y){if(originals?.ready&&originals.map?.ready)return originals.map.unproject(x,y);let wx=(x-W/2)/zoom+cam.x;return{x:wx,y:((y-H*.48)/zoom+(wx-cam.x)*.29)/.78+cam.y};}
function groundTransform(){let p=project(0,0);ctx.transform(zoom,-zoom*.29,0,zoom*.78,p.x,p.y);}
function circle(x,y,r,color,stroke,width=1){ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function groundRing(x,y,r,color,width=2,alpha=1){if(originals?.ready&&originals.map?.ready){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,p=project(x+Math.cos(a)*r,y+Math.sin(a)*r,2);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();ctx.restore();return;}ctx.save();groundTransform();ctx.globalAlpha=alpha;circle(x,y,r,null,color,width/zoom);ctx.restore();}
function glow(x,y,r,color){let g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function terrain(){ctx.clearRect(0,0,W,H);if(!originals.ready){ctx.fillStyle='#07131e';ctx.fillRect(0,0,W,H);}}
function bar(u,p,width,yOffset){if(u.fountain||u.hero?.id==='Zed'&&u.classicUntargetableUntil>game.time)return;if(u.kind==='hero'||u.classicClone){const top=originals?.ready?project(u.x,u.y,originals.labelHeight(u)): {x:p.x,y:p.y-yOffset*zoom};healthbars.draw(ctx,u,{x:top.x,y:top.y+4},game.time,W<600,game.player);return;}let w=width*zoom,h=u.kind==='hero'?5:4;ctx.fillStyle='#010b12';ctx.fillRect(p.x-w/2-1,p.y-yOffset*zoom-1,w+2,h+2);ctx.fillStyle=unitColor(u,game.player);ctx.fillRect(p.x-w/2,p.y-yOffset*zoom,w*clamp(u.hp/u.maxHp,0,1),h);if(u.kind==='hero'){ctx.fillStyle='#092230';ctx.fillRect(p.x-w/2,p.y-yOffset*zoom+h+2,w,2);ctx.fillStyle='#77b7e6';ctx.fillRect(p.x-w/2,p.y-yOffset*zoom+h+2,w*u.mp/u.maxMp,2);}}
// Combat effects are rendered only by the native-particle adapter. No expanding fallback rings.
function effects(){drawAutocastAugments(ctx,game,project);drawFountainBeams(ctx,game,project);drawElderEffects(ctx,game,project);
for(let p of game.projectiles){if(p.firefox||p.augmentBoomerang||p.surgeMissile||p.lightEmUp)continue;if(originals.vfx?.hasHero(p.source.hero?.id))continue;let a=project(p.x,p.y,48),b=project(p.x-p.vx*.045,p.y-p.vy*.045,48);ctx.save();ctx.strokeStyle=p.color;ctx.lineWidth=p.r*.85*zoom;ctx.lineCap='round';ctx.shadowBlur=12;ctx.shadowColor=p.color;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();circle(a.x,a.y,p.r*.7*zoom,'#f2f9ff');ctx.restore();}
floatingText.draw(ctx,game.floaters,project,H);}
function drawControls(){if(!playing)return;
 if(performance.now()-hoverAt>60){hoveredUnit=picked(screenMouse.x,screenMouse.y);hoverAt=performance.now();}
 const blocked=hoveredUnit&&hoveredUnit.team!==game.player.team&&!game.canHit(hoveredUnit);
 const name=blocked?'singletargetenemycannoyattack':controls.pending?'singletarget':hoveredUnit?(hoveredUnit.team===game.player.team?'hoverfriendly':'hoverenemy'):'hand1';
 canvas.style.cursor=`url("assets/controls/${name}.png") ${name==='hand1'?10:22} ${name==='hand1'?6:22}, ${blocked?'not-allowed':hoveredUnit?'crosshair':'default'}`;
 canvas.dataset.hoverTarget=hoveredUnit?`${hoveredUnit.kind}:${hoveredUnit.id}`:'';

}
let minimapAiming=false;
const GLOBAL_MINIMAP_MISSILES=new Set(['EnchantedCrystalArrow','EzrealR','JinxR']);
function minimap(){
 drawLaneMinimap(mc,images['2dlevelminimap']);
 const lo=MAP_CONFIG.bounds.min,hi=MAP_CONFIG.bounds.max;
 const point=(x,y)=>{const p=gameToNative(x,y);return {x:(p.x-lo[0])/(hi[0]-lo[0])*224,y:224-(p.z-lo[1])/(hi[1]-lo[1])*224};};
 const heroes=[];
 for(let u of game.units){if(!u.alive)continue;let p=point(u.x,u.y);if(u.kind==='hero'){heroes.push(u);continue;}mc.fillStyle=unitColor(u,game.player);mc.strokeStyle='#08151a';mc.lineWidth=1;mc.beginPath();mc.arc(p.x,p.y,u.kind==='nexus'?5:u.kind==='tower'?3.4:u.kind==='inhibitor'?3:1,0,Math.PI*2);mc.fill();mc.stroke();if(miniIcons[u.kind]?.complete&&miniIcons[u.kind].naturalWidth){mc.drawImage(teamIcons.get(miniIcons[u.kind],unitColor(u,game.player)),p.x-5,p.y-5,10,10);}}
 for(let r of game.relics){if(game.time<r.ready)continue;let p=point(r.x,r.y),im=miniIcons.healthpack;if(im.complete&&im.naturalWidth)mc.drawImage(im,p.x-4,p.y-4,8,8);}
 if(originals.ready)drawMinimapViewport(mc,[[0,0],[W,0],[W,H],[0,H]].map(([x,y])=>{const q=unproject(x,y);return point(q.x,q.y);}));
 minimapAiming=drawGlobalMinimapAim(mc,game,controls?.pending||window.__mtAimPreview||null,mouse,point);
 // Global ultimates (Ashe/Ezreal/Jinx R) in flight show their round ability icon on the minimap, like the original.
 for(const m of game.projectiles){if(!m.native||!GLOBAL_MINIMAP_MISSILES.has(m.spellName))continue;const id=m.source?.hero?.id,b=point(m.x,m.y),col=m.source?unitColor(m.source,game.player):'#5ff4ff';let im=id&&images[id+'-3'];if(id&&!im){im=new Image();im.src=`assets/${id}-3.png`;images[id+'-3']=im;}mc.save();mc.beginPath();mc.arc(b.x,b.y,7,0,Math.PI*2);mc.closePath();if(im?.complete&&im.naturalWidth){mc.save();mc.clip();mc.drawImage(im,b.x-7,b.y-7,14,14);mc.restore();}else{mc.fillStyle='#10202a';mc.fill();}mc.lineWidth=1.6;mc.strokeStyle=col;mc.stroke();mc.restore();}
 // Heroes stay above minions/structures, with the local player drawn last.
 for(const u of heroes)if(u!==game.player)drawMinimapPortrait(mc,heroPortrait(u.hero.id),point(u.x,u.y),false,unitColor(u,game.player));
 if(game.player?.alive)drawMinimapPortrait(mc,heroPortrait(game.player.hero.id),point(game.player.x,game.player.y),true,unitColor(game.player,game.player));
 nativeSignals.drawMinimap(mc,game,point);
}
function beep(){}
function hud(){minimapChrome.update(playing);joinContinuous.hidden=!(onlinePlaying&&online?.spectating);cameraLock.sync();purchaseHint.update(game,playing);quickHud.update(game,playing);autoBuild.update(game,playing);social?.sync();let p=game.player;const resource=championResource(p);canvas.dataset.playerX=p.x.toFixed(2);canvas.dataset.playerY=p.y.toFixed(2);canvas.dataset.playerHp=String(p.hp);canvas.dataset.pending=controls?.pending?.kind||'';if(targetPanel.game!==game){selectedUnit=null;hoveredUnit=null;}targetPanel.update(game,hoveredUnit?.alive?hoveredUnit:selectedUnit,playing);if($('shopDialog').open)mythicShop.updateBudget();$('blueScore').textContent=game.score[0];$('redScore').textContent=game.score[1];$('timer').textContent=`${Math.floor(game.time/60).toString().padStart(2,'0')}:${Math.floor(game.time%60).toString().padStart(2,'0')}`;$('gold').textContent=Math.floor(game.gold);$('kda').textContent=`${game.kills} / ${game.deaths} / ${game.assists}`;$('level').textContent='等级 '+p.level;$('hpText').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('mpText').textContent=resource?resource.name+' '+Math.floor(resource.value)+' / '+Math.round(resource.max):p.noMana?'\u65e0\u84dd\u8017':`${Math.floor(p.mp)} / ${p.maxMp}`;$('hpFill').style.width=100*p.hp/p.maxHp+'%';$('mpFill').style.width=(resource?100*resource.value/resource.max:p.maxMp?100*p.mp/p.maxMp:0)+'%';document.querySelectorAll('.ability .cd').forEach((el,i)=>el.textContent=i>=4&&summonerId(p,i)==='mark'&&p.snowballMark?.until>game.time?'冲刺':p.skills[i]>0?Math.ceil(p.skills[i]):'');$('respawn').textContent=!p.alive?(p.hero.id==='Karthus'&&p.karthusSpiritUntil>game.time?`死亡契约 · ${Math.ceil(p.karthusSpiritUntil-game.time)} 秒内可施法`:`已阵亡 · ${Math.ceil(p.respawn)} 秒后重返战场`):'';$('announcement').textContent=playing&&game.time<game.announceUntil?visibleBanner(game.announce):'';nativeHud.update();nativeHeader.update(game);nativeHeader.updateConnection(onlinePlaying?online:null);nativeAnnouncements.update(game,playing);}
let captureMissile=false;
if(new URLSearchParams(location.search).get('debug')==='orientation'){const b=document.createElement('button');b.id='captureMissile';b.textContent='下一发弹道定格';Object.assign(b.style,{position:'fixed',top:'85px',right:'20px',zIndex:20});b.onclick=()=>{captureMissile=true;paused=false;b.textContent='等待弹道…';};document.body.append(b);}
function render(now){if(!playing){last=now;ctx.clearRect(0,0,W,H);ctx.fillStyle='#07131e';ctx.fillRect(0,0,W,H);if(originals.renderer)originals.renderer.domElement.hidden=true;return;}if(originals.renderer)originals.renderer.domElement.hidden=false;if(playing&&!originals.ready){showLoadFailure(originals.error||new Error('3D 场景不可用，请重新加载'));return;}nativeHeader.frame(now);let dt=Math.min((now-last)/1000,.05);last=now;if(!paused)visualTime+=dt;if(playing&&!paused){interpolateOnline(game,dt);controls.update();originalAudio.update(game);if(captureMissile&&game.projectiles.some(p=>p.native&&p.distance*MAP_CONFIG.scale>500)){captureMissile=false;paused=true;document.getElementById('captureMissile').textContent='弹道已定格';}}if(playing&&!paused&&manualCam&&miniDragPointer===null&&!cameraDrag.active&&originals.ready&&!social?.typing&&!social?.boardVisible&&!signalInput.active&&!signalInput.armed){const dx=screenMouse.x>W-18?1:screenMouse.x>0&&screenMouse.x<18?-1:0,dy=screenMouse.y>H-18?1:screenMouse.y>0&&screenMouse.y<18?-1:0;if(dx||dy){const a=unproject(W/2,H/2),b=unproject(W/2+dx*120,H/2+dy*120);cam.x=clamp(cam.x+(b.x-a.x)*dt*4,5,3195);cam.y=clamp(cam.y+(b.y-a.y)*dt*4,-1600,1600);}}let targetZoom=playing?(W<600?.65:.82):Math.min(.46,W/2300);zoom+=(targetZoom-zoom)*Math.min(1,dt*6);if(playing&&!manualCam&&miniDragPointer===null&&!cameraDrag.active){cam.x+=(clamp(game.player.x+(originals.ready?0:170),originals.ready?5:400,originals.ready?3195:2800)-cam.x)*Math.min(1,dt*5);cam.y+=(game.player.y*(originals.ready?1:.55)-cam.y)*Math.min(1,dt*5);}if(originals.ready){originals.map.updateCamera({w:W,h:H,cam,zoom:cameraZoom},!playing);originals.camera=originals.map.camera;}terrain();let sorted=game.units.filter(u=>(u.alive||u.kind==='tower')&&!(u.teemoStealth&&u.team!==game.player.team));if(originals.ready){
 for(let u of sorted){if(!u.alive)continue;let p=project(u.x,u.y);if(p.x<-160||p.x>W+160||p.y<-160||p.y>H+160)continue;if(u.shield>0)groundRing(u.x,u.y,45,'#c8fff3',2,.8);if(game.player.target===u)groundRing(u.x,u.y,u.radius+10,'#f4b0a7',2);ctx.save();ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(p.x,p.y+4,u.radius*zoom,9*zoom,0,0,Math.PI*2);ctx.fill();ctx.restore();}
 originals.controlState={pending:controls.pending||window.__mtAimPreview||null,aim:mouse};const scene=originals.render(game,{w:W,h:H,dpr,zoom,cam,cameraZoom,overview:!playing},playing&&!paused?dt:0);originalAudio.classic.particles.update(game,originals.vfx.instances);if(scene&&!scene.isConnected){Object.assign(scene.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});scene.id='original3DScene';canvas.before(scene);}
 for(let u of sorted){if(!u.alive)continue;let p=project(u.x,u.y),offset=originals.labelHeight(u);if(p.x<-180||p.x>W+180||p.y+offset*zoom<-180||p.y>H+180)continue;bar(u,p,u.kind==='hero'?74:u.kind==='minion'?35:96,offset);}
 }
 if(signalInput.active&&document.querySelector('dialog[open]'))signalInput.cancel();nativeSignals.update(game,playing&&!paused);nativeHud.animate(game.time);evolutionUI.update();originals.renderPreview(paused?0:dt,!playing);effects();drawControls();if(playing&&!game.player.alive){ctx.fillStyle='#06101955';ctx.fillRect(0,0,W,H);}if(playing&&!online?.spectating)augmentUI.sync();uiTime+=dt;if(uiTime>.1){minimap();hud();uiTime=0;}else if(minimapAiming||game.projectiles.some(m=>m.native&&GLOBAL_MINIMAP_MISSILES.has(m.spellName))||window.__mtAimPreview||controls?.pending?.kind==='skill'&&controls.pending.index===3)minimap();if(game.winner!==null&&!resultShown){resultShown=true;const won=game.winner===game.player.team;$('resultTitle').textContent=won?'胜利':'失败';$('resultBanner').src=`assets/ui/${won?'victory':'defeat'}.png`;$('resultStats').textContent=`${won?'敌方水晶已被摧毁。':'我方水晶已被摧毁。'} 本局 ${Math.floor(game.time/60)} 分 ${Math.floor(game.time%60)} 秒 · ${game.kills} 击杀 / ${game.deaths} 阵亡 / ${game.assists} 助攻`;$('resultDialog').showModal();}}

const renderLoop=startResilientRender({maxFps:isTouch()?60:0,render,
 recover(){last=performance.now();originals.lastGame=null;ctx.setTransform(dpr,0,0,dpr,0,0);},
 onError(error,attempt){globalThis.__ARAM_RENDER_ERRORS__??=[];globalThis.__ARAM_RENDER_ERRORS__.push({at:Date.now(),attempt,message:String(error?.stack||error)});if(globalThis.__ARAM_RENDER_ERRORS__.length>10)globalThis.__ARAM_RENDER_ERRORS__.shift();console.error('ARAM render recovery',attempt,error);},
 onFatal(error){paused=true;controls.cancel();originalAudio.stop();showLoadFailure(new Error('画面恢复失败，请点击重新加载资源。'+(error?.message||'')));}
});
document.getElementById('selectedDescription')?.remove();document.getElementById('selectedSkills')?.remove();
function heroSelectionVisible(){return $('lobby').dataset.onlineStage==='room';}
function hydrateHeroArt(){if(!heroSelectionVisible())return;for(const img of $('lobby').querySelectorAll('img[data-src]')){img.src=img.dataset.src;delete img.dataset.src;}}
function select(h){selected=h;$('selectedName').textContent=h.name;$('selectedTitle').innerHTML=`${h.title}<span>${h.role}</span>`;const art=$('selectedArt');art.dataset.src=`assets/${h.id}-loading.jpg`;if(heroSelectionVisible())art.src=art.dataset.src;else art.removeAttribute('src');art.alt=h.title+'原画';$('artName').textContent=h.id.toUpperCase();document.querySelectorAll('.hero-card').forEach(b=>{let active=b.dataset.hero===h.id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});hydrateHeroArt();online?.updateLoadout();}
new MutationObserver(hydrateHeroArt).observe($('lobby'),{attributes:true,attributeFilter:['data-online-stage']});
HEROES.forEach(h=>{let b=document.createElement('button');b.className='hero-card';b.dataset.hero=h.id;b.setAttribute('aria-label','选择'+h.name);b.innerHTML=`<img data-src="assets/${h.id}-loading.jpg" alt=""><span>${h.title}</span>`;b.onclick=()=>select(h);$('heroSelect').append(b);});select(selected);
function buildAbilities(){nativeHud.buildAbilities();}

function showLoadFailure(error){if(globalThis.AramLoadProgress){globalThis.AramLoadProgress.show(error);return;}let box=document.getElementById('resourceStatus');if(!box){box=document.createElement('div');box.id='resourceStatus';Object.assign(box.style,{position:'fixed',inset:'0',zIndex:'10000',background:'#07131ef5',color:'#e8d39b',display:'grid',placeContent:'center',textAlign:'center',padding:'40px',font:'18px sans-serif'});document.body.append(box);}box.replaceChildren();const msg=document.createElement('p');msg.textContent=error?' 3D 资源加载失败：'+(error.message||String(error)):'正在加载地图和英雄，请稍候。加载完成后自动进入对局。';box.append(msg);if(error){const retry=document.createElement('button');retry.textContent='重新加载资源';retry.onclick=()=>location.reload();box.append(retry);}}

async function startOnline(snapshot){pendingOnlineSnapshot=snapshot;if(entryLoading)return;const version=++entryVersion;if(!await prepareBattle([selected.id])||version!==entryVersion)return;snapshot=pendingOnlineSnapshot;pendingOnlineSnapshot=null;if(!snapshot||!online.room)return;document.querySelectorAll('dialog[open]').forEach(d=>d.close());augmentUI.reset();game=new Game(selected);if(originals.ready)game.useOriginalMap(MAP_CONFIG,originals.map.navigation);applyOnlineSnapshot(game,snapshot,HEROES);bindOnlineCommands(game,online);onlinePlaying=true;playing=true;globalThis.AramLoadProgress?.complete();document.getElementById('resourceStatus')?.remove();paused=false;controls.cancel();selectedUnit=null;miniDragPointer=null;spaceWasManual=null;manualCam=false;resultShown=false;cam={x:game.player.x,y:game.player.y};mouse={x:1500,y:0};$('lobby').classList.add('hidden');online.send({type:'battleReady',roomId:online.room?.id,round:online.room?.round});buildAbilities();renderEquipment();hud();originalAudio.setEnabled(sound);originalAudio.start(game);purchaseHint.begin(game,'online:'+online.room?.id+':'+game.player.id);}
function lobby(leaveOnline=true){minimapChrome.update(false);targetPanel.clear();selectedUnit=null;hoveredUnit=null;entryVersion++;pendingOnlineSnapshot=null;globalThis.AramLoadProgress?.close();document.getElementById('resourceStatus')?.remove();if(leaveOnline&&onlinePlaying)online.leave();originalAudio.stop();document.querySelectorAll('dialog[open]').forEach(d=>d.close());playing=false;onlinePlaying=false;paused=false;resultShown=false;augmentUI.reset();game=new Game(selected);if(originals.ready)game.useOriginalMap(MAP_CONFIG,originals.map.navigation);cam={x:1600,y:0};$('lobby').classList.remove('hidden');$('announcement').textContent='';$('respawn').textContent='';quickHud.update(game,false);nativeAnnouncements.update(game,false);signalInput.cancel();nativeSignals.update(game,false);}
$('start').onclick=null;$('start').hidden=true;$('random').onclick=()=>{const choices=MATCH_HEROES.filter(hero=>hero!==selected);select(choices[Math.floor(Math.random()*choices.length)]||MATCH_HEROES[0]);};$('again').onclick=lobby;$('backLobby').textContent='切换阵容';$('backLobby').onclick=()=>{if(onlinePlaying&&online?.room){if(!online.returnToSelection())$('pauseCopy').textContent='连接繁忙或正在返回选人，请稍后重试。';}else lobby();};
function performCast(i,aim){if(!playing||paused)return false;const from={x:game.player.x,y:game.player.y};if(game.cast(i,aim)){if(i<4&&!game.player.nativeCombat){originalAudio.cast(game.player.hero.id,'qwer'[i]);originals.vfx?.cast(game,game.player,'qwer'[i],aim,from);}return true;}return false;}
function cast(i){return controls.skill(i,mouse,true);}
function pause(){signalInput.cancel();controls.cancel();if(!playing||game.winner!==null)return;paused=true;originalAudio.stop();$('pauseTitle').textContent=onlinePlaying?'战场菜单':'战斗已暂停';$('pauseCopy').textContent=onlinePlaying?'对局仍在进行。切换阵容将重置装备和个人战绩。':'所有英雄、小兵与冷却时间均已暂停。';$('pauseDialog').showModal();}
function resume(){paused=false;$('pauseDialog').close();last=performance.now();originalAudio.setEnabled(sound);originalAudio.start(game);}
$('pause').onclick=pause;$('resume').onclick=resume;$('sound').onclick=()=>{sound=!sound;$('sound').textContent='声音：'+(sound?'开':'关');originalAudio.setEnabled(sound);};$('help').onclick=()=>{signalInput.cancel();paused=playing;if(playing)originalAudio.stop();$('helpDialog').showModal();};
for(let b of document.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();for(let d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{paused=!!document.querySelector('dialog[open]:not(#shopDialog)');last=performance.now();});$('pauseDialog').addEventListener('cancel',e=>{e.preventDefault();resume();});
const controls=new LeagueControls({getGame:()=>game,cast:(i,aim)=>performCast(i,aim),inspect:u=>{selectedUnit=u;},notice:text=>game.banner(text)});
const nativeSignals=new NativeSignals({getGame:()=>game,getModels:()=>originals,getAudio:()=>originalAudio,isMuted:id=>id!==null&&social?.mutedPeers.has(id)});
let signalCursor=null;
const signalInput=new SignalInput({getGame:()=>game,cancelCombat:()=>controls.cancel(),onWheel:a=>{nativeSignals.showWheel(a);pingButton.classList.toggle('armed',signalInput.armed);},notice:text=>game.banner(text)});
const signalButtons=document.createElement('div');signalButtons.className='native-signal-buttons';const pingButton=document.createElement('button');pingButton.textContent='信号';pingButton.title='G / V 完整信号轮盘 · Shift+V 视野信号';pingButton.onclick=()=>{if(!playing||paused)return;signalInput.armed=!signalInput.armed;controls.cancel();pingButton.classList.toggle('armed',signalInput.armed);};const masteryButton=document.createElement('button');masteryButton.title='Ctrl + 6 · 10级英雄成就徽章';const masteryIcon=document.createElement('img');masteryIcon.src='assets/signals/mastery10.png';masteryIcon.alt='10级英雄成就';masteryButton.append(masteryIcon,document.createTextNode('亮标'));masteryButton.onclick=()=>{if(playing&&!paused)game.mastery();};signalButtons.append(pingButton,masteryButton);document.querySelector('.local-game-toolbar nav')?.append(signalButtons);nativeSignals.masteryButton=masteryButton;
autoBuild.onBuy=()=>{originalAudio.ui?.('shop-buy-basic');setTimeout(()=>{renderEquipment();mythicShop.refresh?.();},120);};
const quickHud=new QuickHud({notice:t=>game?.banner?.(t)});const purchaseHint=new PurchaseHint({openShop:()=>shop(),autoBuild:()=>{autoBuild.set(true);},isBlocked:()=>!!document.querySelector('dialog[open]')});
const mythicShop=new DeferredShop(()=>new MythicShop(()=>game,()=>{renderEquipment();hud();},key=>originalAudio.ui(key)));
online=new AramOnline({getLoadout:()=>({hero:selected.id,summoners:[$('summonerD').value,$('summonerF').value]}),onEnter:snapshot=>startOnline(snapshot),onState:snapshot=>{if(pendingOnlineSnapshot)pendingOnlineSnapshot=snapshot;else if(onlinePlaying){const equipmentBefore=JSON.stringify([game.items,game.itemStacks]);applyOnlineSnapshot(game,snapshot,HEROES);mythicShop.syncPurchase();nativeHud.syncSpellRanks();if(!paused)originalAudio.update(game);if(equipmentBefore!==JSON.stringify([game.items,game.itemStacks])){renderEquipment();if($('shopDialog').open)mythicShop.refresh();}}},onLeave:()=>{if(onlinePlaying||pendingOnlineSnapshot)lobby(false);},onChat:message=>social?.receive(message)});
social=new MatchSocial({getGame:()=>game,getOnline:()=>online,isPlaying:()=>playing,isPaused:()=>paused,onFocus:()=>{signalInput.cancel();controls.cancel();if(spaceWasManual!==null){manualCam=spaceWasManual;spaceWasManual=null;}}});
queueMicrotask(()=>online.connect());
const evolutionUI=new KaisaEvolutionUI(()=>game,()=>playing);
nativeHud.upgrade=i=>onlinePlaying&&nativeHud.canUpgrade(i)&&online.action({type:'upgrade',index:i});
function shop(){if(!playing||game.winner!==null)return;signalInput.cancel();controls.cancel();mythicShop.open();}
function equipmentClick(i){if(paused||!playing)return;const item=itemById(game.items[i]);if(!item)return;if(activeItemIds.has(item.id)){if(game.useItem(i,{...mouse,targetId:selectedUnit?.id||game.player.target?.id}))renderEquipment();else if(item.id==='2003')game.banner(game.player.potionTime>0?'生命药水正在生效':'当前无法使用生命药水');else game.banner('当前无法使用该主动装备，或仍在冷却');}else{shop();mythicShop.selectInventory(i);}}
function renderEquipment(){nativeHud.renderEquipment();$('items').textContent=game.items.map(itemById).filter(Boolean).map(i=>i.name).join(' · ');}
$('shopBtn').onclick=shop;
function picked(x,y,forSkill=true){const accept=forSkill&&controls.pending?.kind==='target'?u=>controls.canTarget(u,controls.pending.index):null;return originals.ready?originals.hitTest(game,x,y,true,accept):game.units.find(u=>{if(!u.alive||accept&&!accept(u))return false;const p=project(u.x,u.y,u.kind==='hero'?48:0);return Math.hypot(x-p.x,y-p.y)<Math.max(20,u.radius*zoom);});}
const joinContinuous=document.createElement('button');joinContinuous.textContent='以所选英雄加入战斗';joinContinuous.hidden=true;joinContinuous.onclick=()=>online.send({type:'enter',...online.getLoadout()});document.querySelector('.local-game-toolbar nav')?.append(joinContinuous);
const cameraLock=installCameraLock(document.querySelector('.local-game-toolbar nav'),{
 getLocked:()=>!manualCam,
 setLocked:locked=>{if(cameraDrag.pointer!==null)cameraDrag.end({pointerId:cameraDrag.pointer},true);miniDragPointer=null;spaceWasManual=null;manualCam=!locked;if(locked)cam={x:game.player.x,y:game.player.y};}
});
const cameraDrag=new CameraDrag({
 manual:()=>{manualCam=true;spaceWasManual=null;},
 pan:(from,to)=>{const a=unproject(from.x,from.y),b=unproject(to.x,to.y);cam.x=clamp(cam.x+a.x-b.x,5,3195);cam.y=clamp(cam.y+a.y-b.y,-1600,1600);if(originals.ready)originals.map.updateCamera({w:W,h:H,cam,zoom:cameraZoom},false);},
 click:e=>{if(playing&&!paused&&!controls.pending&&!social?.typing&&!social?.boardVisible)controls.pointer(0,unproject(e.clientX,e.clientY),picked(e.clientX,e.clientY),false);}
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(cameraDrag.end(e,type!=='pointerup')&&canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
addEventListener('blur',()=>{if(cameraDrag.pointer!==null)cameraDrag.end({pointerId:cameraDrag.pointer},true);});
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointermove',e=>{cameraDrag.move(e);screenMouse={x:e.clientX,y:e.clientY};mouse=unproject(e.clientX,e.clientY);signalCursor={screen:{x:e.clientX,y:e.clientY},point:mouse,mini:false};});
canvas.addEventListener('pointerdown',e=>{if(!playing||paused||social?.typing||social?.boardVisible)return;screenMouse={x:e.clientX,y:e.clientY};mouse=unproject(e.clientX,e.clientY);if((e.button===0||e.pointerType==='touch')&&originals.hitShop(e.clientX,e.clientY)){signalInput.cancel();controls.cancel();shop();game.banner('物品商店');return;}if(signalInput.pointerDown(e,screenMouse,mouse,picked(e.clientX,e.clientY,false))){if(signalInput.active)canvas.setPointerCapture(e.pointerId);return;}const target=picked(e.clientX,e.clientY,controls.pointerButton(e.pointerType,e.button)===0);if(cameraDrag.begin(e,!controls.pending&&!target&&!signalInput.armed)){canvas.setPointerCapture(e.pointerId);return;}const action=controls.pointer(controls.pointerButton(e.pointerType,e.button),mouse,target,e.shiftKey);if(action==='move')originalAudio.say(game.player.hero.id,'move');if(action==='attack')originalAudio.say(game.player.hero.id,'attack');});
mini.addEventListener('contextmenu',e=>e.preventDefault());
function miniPoint(e){const r=mini.getBoundingClientRect(),lo=MAP_CONFIG.bounds.min,hi=MAP_CONFIG.bounds.max;return nativeToGame(lo[0]+(e.clientX-r.left)/r.width*(hi[0]-lo[0]),hi[1]-(e.clientY-r.top)/r.height*(hi[1]-lo[1]));}
function peekMini(e){const p=miniPoint(e);cam.x=clamp(p.x,5,3195);cam.y=clamp(p.y,-1600,1600);manualCam=true;spaceWasManual=null;}
mini.style.touchAction='none';
mini.addEventListener('pointerdown',e=>{if(!playing||paused||social?.typing||social?.boardVisible)return;if(signalInput.pointerDown(e,{x:e.clientX,y:e.clientY},miniPoint(e),null)){if(signalInput.active)mini.setPointerCapture(e.pointerId);return;}if(e.button===2){const p=miniPoint(e);controls.pointer(2,p,null,e.shiftKey);return;}if(e.button!==0&&e.pointerType!=='touch')return;if(miniDragPointer!==null)return;e.preventDefault();miniDragPointer=e.pointerId;mini.setPointerCapture(e.pointerId);peekMini(e);});
mini.addEventListener('pointermove',e=>{signalCursor={screen:{x:e.clientX,y:e.clientY},point:miniPoint(e),mini:true};if(miniDragPointer===e.pointerId)peekMini(e);});
function endMiniDrag(e){if(miniDragPointer!==e.pointerId)return;miniDragPointer=null;manualCam=true;spaceWasManual=null;if(mini.hasPointerCapture(e.pointerId))mini.releasePointerCapture(e.pointerId);}
for(const type of ['pointerup','pointercancel','lostpointercapture'])mini.addEventListener(type,endMiniDrag);

canvas.addEventListener('wheel',e=>{if(!playing||social?.typing||social?.boardVisible||signalInput.active)return;e.preventDefault();cameraZoom=clamp(cameraZoom*Math.exp(-e.deltaY*.001),.62,1.65);},{passive:false});
installCloseGuard(window);
addEventListener('keydown',e=>{if(social?.handleKeyDown(e)||isTextInput(e.target))return;if(playing&&!paused&&!document.querySelector('dialog[open]')){const c=signalCursor||{screen:{x:W/2,y:H/2},point:unproject(W/2,H/2),target:null};const signalPoint=c.mini?miniPoint({clientX:c.screen.x,clientY:c.screen.y}):unproject(c.screen.x,c.screen.y);if(signalInput.keyDown(e,c.screen,signalPoint,c.mini?null:picked(c.screen.x,c.screen.y,false)))return;}if(e.ctrlKey&&!e.repeat&&playing&&!paused&&!document.querySelector('dialog[open]')){if(e.key.toLowerCase()==='f'){e.preventDefault();nativeHeader.toggleMetrics();return;}const i='qwer'.indexOf(e.key.toLowerCase());if(i>=0){e.preventDefault();nativeHud.upgrade(i);return;}}if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const key=e.key.toLowerCase();if(document.querySelector('dialog[open]')){if($('shopDialog').open&&key==='p'&&!['INPUT','TEXTAREA'].includes(e.target?.tagName)){e.preventDefault();$('shopDialog').close();}return;}if(key==='escape'){e.preventDefault();if(controls.pending||controls.queued)controls.cancel();else pause();return;}if(!playing||paused)return;
 if(key===' '){e.preventDefault();if(spaceWasManual===null)spaceWasManual=manualCam;manualCam=false;return;}if(key==='f1'){e.preventDefault();cam={x:game.player.x,y:game.player.y};return;}if(key==='y'){manualCam=!manualCam;return;}if(key==='p'){e.preventDefault();shop();return;}if(key==='b'){controls.cancel();game.stop();game.banner('海克斯大乱斗无法回城');return;}if(key==='s'){controls.stop();return;}if(key==='h'){controls.stop(true);return;}if(key==='a'){e.preventDefault();controls.attackMove();return;}
 if(ITEM_HOTKEYS.includes(key)&&key.length===1){if(game.useItem(ITEM_HOTKEYS.indexOf(key),{...mouse,targetId:selectedUnit?.id||game.player.target?.id}))renderEquipment();return;}const index='qwerdf'.indexOf(key);if(index>=0&&key.length===1){e.preventDefault();mouse=unproject(screenMouse.x||W*.7,screenMouse.y||H*.45);controls.keyDown(index,mouse,e.shiftKey);}});
addEventListener('keyup',e=>{if(social?.handleKeyUp(e)||isTextInput(e.target))return;if(signalInput.active&&(!playing||paused||document.querySelector('dialog[open]'))){signalInput.cancel();return;}if(signalInput.keyUp(e))return;const i='qwerdf'.indexOf(e.key.toLowerCase());if(i>=0&&e.key.length===1&&playing&&!paused&&!document.querySelector('dialog[open]'))controls.keyUp(i,unproject(screenMouse.x,screenMouse.y),picked(screenMouse.x,screenMouse.y));if(e.key===' '&&spaceWasManual!==null){manualCam=spaceWasManual;spaceWasManual=null;}});
addEventListener('pointermove',e=>{signalInput.move({x:e.clientX,y:e.clientY});});addEventListener('pointerup',e=>{signalInput.pointerUp(e);});addEventListener('pointercancel',()=>signalInput.cancel());
$('quickCast').onchange=e=>{controls.quickCast=e.target.checked;};
// Losing browser focus does not pause an online match. The other blur handlers
// still release held inputs and pointer capture; the menu opens only by choice.
buildAbilities();renderEquipment();
// Optional WebMCP: same local actions and state as the visible UI.
const context=document.modelContext;
if(context?.registerTool){
 const lifecycle=new AbortController();
 const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'aram_match_status',title:'查看对局状态',description:'Read the current online ARAM match.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:async input=>{if(input&&Object.keys(input).length)throw new Error('No arguments expected');return {playing,paused,hero:game.player.hero.name,hp:game.player.hp,gold:Math.floor(game.gold),score:[...game.score],winner:game.winner};}});

 addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

for(const [id,otherId]of [['summonerD','summonerF'],['summonerF','summonerD']]){const select=document.getElementById(id);select.dataset.previous=select.value;select.onchange=()=>{const other=document.getElementById(otherId);if(select.value===other.value){other.value=select.dataset.previous;other.dataset.previous=other.value;}select.dataset.previous=select.value;online?.updateLoadout();};}

installCannon({game:()=>game,online:()=>online,models:originals,audio:originalAudio,controls,canvas,mini,map:MAP_CONFIG,
playing:()=>playing,blocked:()=>paused||!!social?.typing||!!document.querySelector('dialog[open]'),
project,unproject,camera:()=>({zoom:cameraZoom,manual:manualCam,cam:{...cam}}),setCamera:s=>{cameraZoom=s.zoom;manualCam=s.manual;cam={...s.cam};},focus:p=>{cam={x:p.x,y:p.y};manualCam=true;},miniPoint});
const minimapChrome=installNativeMinimapControls({cameraLock,joinContinuous});
document.getElementById('feed')?.remove();
globalThis.__ARAM_APP_READY__=true;

