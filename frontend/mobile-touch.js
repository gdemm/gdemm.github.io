// Mobile touch layer: joystick, attack, QWER drag-aim, D/F, shop, stop, level-up, quality.
// Only runs on touch devices. Talks to game.js through the small bridge it passes in.
export const isTouch=()=>matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;

// Auto downgrades live only for this session (sessionStorage) and never go below 'mid'; a manual pick is kept in localStorage.
// Old builds persisted auto downgrades to 'low', which left landscape blurry forever: drop those once.
try{if(!localStorage.getItem('aram_quality_locked'))localStorage.removeItem('aram_quality');}catch{}
export function qualityLevel(){
 const q=(localStorage.getItem('aram_quality_locked')&&localStorage.getItem('aram_quality'))||sessionStorage.getItem('aram_quality_auto');
 if(q==='low'||q==='mid'||q==='high')return q;
 return isTouch()?'mid':'high';
}
// touch: high=2x, mid=1.5x, low=1x device pixels (never below 1x: below that everything smears)
export function qualityDpr(dev){if(!isTouch())return Math.min(dev,1.25);const q=qualityLevel();return Math.min(dev,q==='low'?.85:q==='mid'?1.15:1.6);}

const CSS=`
#mt{position:fixed;inset:0;pointer-events:none;z-index:60;font-family:system-ui,sans-serif;-webkit-user-select:none;user-select:none;touch-action:none}
#mt.off{display:none}
#mt .b{position:absolute;pointer-events:auto;border-radius:50%;display:grid;place-items:center;color:#f0e6d2;font-weight:800;
 background:radial-gradient(circle at 40% 35%,rgba(40,70,90,.85),rgba(8,20,30,.85));border:2px solid #c8aa6e;box-shadow:0 2px 8px #0008;touch-action:none}
#mt .b.on{filter:brightness(1.5)}
#mt .ic{background-size:cover;background-position:center;overflow:hidden}
#mt .ic>.rad{position:absolute;inset:0;border-radius:50%;pointer-events:none;background:conic-gradient(rgba(0,0,0,.68) calc(var(--p,0)*1turn),transparent 0);display:none}
#mt .ic>.cdt{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font:800 18px system-ui;text-shadow:0 1px 3px #000,0 0 2px #000;pointer-events:none}
#mt .sm.ic>.cdt{font-size:14px}
#mt .ic>.kl{position:absolute;right:2px;bottom:0;font:800 10px system-ui;color:#f0e6d2;text-shadow:0 1px 2px #000;pointer-events:none}
#mt .ic.cd{filter:grayscale(.7)}#mt .ic.cd.on{filter:grayscale(.7) brightness(1.4)}
#mt .ic.flash{animation:mtReady .35s ease-out}@keyframes mtReady{0%{box-shadow:0 0 0 0 #fff,0 2px 8px #0008}100%{box-shadow:0 0 0 10px #fff0,0 2px 8px #0008}}
/* ---- lobby / champion select on phones in landscape (fullscreen) ---- */
body.mt-lobby #nativeGameHeader,body.mt-lobby #minimap,body.mt-lobby #classicEvolution,body.mt-lobby .native-minimap-controls,body.mt-lobby .native-ping-log{display:none!important}
@media (max-height:540px) and (orientation:landscape){
body.mt-lobby #lobby{inset:0!important;justify-content:center;padding:calc(8px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) calc(2px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left));background:radial-gradient(ellipse at 50% -10%,#1a3c52e6,#030c15f5 72%);backdrop-filter:blur(6px)}
body.mt-lobby .lobby-panel{width:100%!important;max-width:none!important;max-height:calc(100dvh - 30px)!important;border:1px solid #c8aa6e55;border-radius:10px;background:linear-gradient(180deg,#0d2333f5,#06121cf5);box-shadow:0 0 0 1px #000a,0 12px 40px #000d,inset 0 1px 0 #f0e6d21a}
body.mt-lobby .lobby-top{padding:7px 16px!important;font-size:11px!important;letter-spacing:3px;background:linear-gradient(90deg,#c8aa6e1f,transparent 60%);border-bottom:1px solid #c8aa6e33!important}
body.mt-lobby .lobby-mode-bar,body.mt-lobby .lobby-bottom{display:none!important}
body.mt-lobby .lobby-flow-heading{padding:8px 16px 6px!important;min-height:0!important}
body.mt-lobby #lobbyStepTitle{font-size:21px!important;line-height:1.15!important;margin:0!important;color:#f0e6d2;text-shadow:0 0 18px #c8aa6e55}
body.mt-lobby #lobbyStepNote{font-size:11px!important;margin:3px 0 0!important;color:#8fa6b4}
body.mt-lobby .disclaimer{font-size:9px!important;line-height:1.3;margin:4px 0 0!important;opacity:.55;white-space:nowrap}body.mt-lobby .disclaimer br{display:none}
body.mt-lobby .online-actions{padding:8px 16px!important;gap:8px!important;background:linear-gradient(#06121c00,#06121cf5 30%)!important;border-top:1px solid #c8aa6e33}
body.mt-lobby .online-actions button{min-height:34px;height:34px!important;padding:0 14px!important;font-size:13px!important;border-radius:4px}
body.mt-lobby .lobby-panel input,body.mt-lobby .lobby-panel select{min-height:32px;font-size:14px!important}
body.mt-lobby .lobby-panel label,body.mt-lobby .lobby-panel .online-row{font-size:13px}
body.mt-lobby .lobby-top>span:last-child{visibility:hidden}
#matchScoreboard.match-scoreboard{position:fixed!important;inset:0!important;z-index:9000!important;background:rgba(6,10,18,.94)!important;padding:max(8px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) 8px max(10px,env(safe-area-inset-left))!important;overflow:auto!important;border-radius:0!important}
body.mt-lobby #mtFsx,#mtFsx:not(.ingame){display:none!important}
/* champion select: art card left, hero grid right */
body.mt-lobby #lobby[data-online-stage="room"] .lobby-flow-heading{display:none!important}
body.mt-lobby #lobby[data-online-stage="room"] .select-body{margin-top:10px!important}
body.mt-lobby #lobby[data-online-stage="room"] .hero-select{margin-top:10px!important}
body.mt-lobby #lobby[data-online-stage="room"] .lobby-panel{display:grid!important;grid-template-columns:minmax(0,44%) minmax(0,1fr);grid-template-areas:"top top" "head head" "art grid" "load grid" "room room" "act act";column-gap:12px;align-content:start}
body.mt-lobby #lobby[data-online-stage="room"] .lobby-top{grid-area:top}
body.mt-lobby #lobby[data-online-stage="room"] .lobby-flow-heading{grid-area:head}
body.mt-lobby #lobby[data-online-stage="room"] .select-body{grid-area:art;height:128px!important;margin:0 0 0 16px;border:1px solid #c8aa6e44;border-radius:8px}
body.mt-lobby #lobby[data-online-stage="room"] .selected-copy{width:100%!important;padding:12px 14px!important}
body.mt-lobby #lobby[data-online-stage="room"] #selectedName{font-size:26px!important;line-height:1.1!important;letter-spacing:3px!important;margin:0 0 4px!important;white-space:nowrap}
body.mt-lobby #lobby[data-online-stage="room"] #selectedTitle{font-size:12px!important}
body.mt-lobby #lobby[data-online-stage="room"] .hero-art{width:62%!important;right:0;left:auto}
body.mt-lobby #lobby[data-online-stage="room"] #artName{display:none}
body.mt-lobby #lobby[data-online-stage="room"] #random{bottom:8px!important;left:14px!important;right:auto!important;top:auto!important;font-size:11px}
body.mt-lobby #lobby[data-online-stage="room"] .hero-select{grid-area:grid;align-self:stretch;max-height:178px;overflow:auto;padding:0 16px 4px 0!important;margin:10px 0 0!important;gap:6px!important;grid-template-columns:repeat(auto-fill,minmax(64px,1fr))!important;align-content:start}
body.mt-lobby #lobby[data-online-stage="room"] .hero-card{height:64px!important;border-radius:6px;border-color:#2e4652}
body.mt-lobby #lobby[data-online-stage="room"] .hero-card.active{border-color:#e8c35a;box-shadow:0 0 0 1px #e8c35a,0 0 12px #e8c35a88}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout{grid-area:load;padding:8px 0 4px 16px!important;gap:8px;flex-wrap:wrap}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout>span{display:none}
body.mt-lobby #lobby[data-online-stage="room"] .online-lobby{grid-area:room;padding:6px 16px!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-actions{grid-area:act;position:sticky;bottom:0;z-index:3}
}
body.mt-touch #hud{display:none!important}
#mt .me,#mt .inv{display:none!important}
body.mt-touch.native-game-header-active:not(.mt-lobby)::after{content:'';position:fixed;top:0;right:0;width:calc(35px + env(safe-area-inset-right));height:30px;background:linear-gradient(#0a1f21,#09201f);border-bottom:1px solid #10373a;z-index:7;pointer-events:none}
body.mt-touch #nativeGameHeader #fps{left:336px!important}body.mt-touch #nativeGameHeader #latency{left:408px!important;justify-content:flex-start!important}
body.mt-touch #nativeGameHeader{pointer-events:auto!important;transform:scale(.84)!important;right:calc(34px + env(safe-area-inset-right))!important}
#mt .me{position:absolute;left:calc(8px + env(safe-area-inset-left));top:calc(44px + env(safe-area-inset-top));display:flex;align-items:center;gap:6px;pointer-events:none}
#mt .me img{width:44px;height:44px;border-radius:50%;border:2px solid #c8aa6e;box-shadow:0 2px 6px #0008;object-fit:cover;background:#06121a}
#mt .me .lv{position:absolute;left:30px;top:30px;min-width:18px;height:18px;border-radius:9px;background:#06121a;border:1px solid #c8aa6e;color:#f0e6d2;font:800 11px/16px system-ui;text-align:center}
#mt .me .bars{width:132px;display:grid;gap:3px}#mt .me .bar{position:relative;height:11px;background:#000a;border:1px solid #0009;border-radius:2px;overflow:hidden}
#mt .me .bar>i{position:absolute;inset:0 auto 0 0;width:100%}#mt .me .hp>i{background:linear-gradient(#5fd35a,#2f8f2a)}#mt .me .mp>i{background:linear-gradient(#4aa3ff,#1f5fc2)}
#mt .me .bar>b{position:relative;display:block;font:700 9px/11px system-ui;color:#fff;text-align:center;text-shadow:0 1px 1px #000}
#mt .inv{position:absolute;left:calc(8px + env(safe-area-inset-left));top:calc(96px + env(safe-area-inset-top));display:flex;gap:3px;pointer-events:auto}
#mt .inv>div{position:relative;width:26px;height:26px;border:1px solid #785a28;border-radius:3px;background:#06121acc center/cover no-repeat;touch-action:none}
#mt .inv>div>span{position:absolute;inset:0;display:grid;place-items:center;background:#000a;color:#fff;font:800 11px system-ui;text-shadow:0 1px 2px #000}
#mt .inv>div.act{border-color:#e8c35a}#mt .inv>div.on{filter:brightness(1.4)}
#mt .atk{width:84px;height:84px;right:calc(28px + env(safe-area-inset-right));bottom:calc(26px + env(safe-area-inset-bottom));font-size:15px}
#mt .sk{width:58px;height:58px;font-size:20px}
#mt .sm{width:44px;height:44px;font-size:14px;border-width:1px}
#mt .up{position:absolute;pointer-events:auto;width:26px;height:26px;border-radius:50%;background:#e8c35a;color:#222;font:900 18px/26px system-ui;text-align:center;display:none;touch-action:none}
#mt .joy{position:absolute;left:calc(30px + env(safe-area-inset-left));bottom:calc(30px + env(safe-area-inset-bottom));width:140px;height:140px;border-radius:50%;
 background:rgba(10,25,35,.35);border:2px solid rgba(200,170,110,.5);pointer-events:auto;touch-action:none}
#mt .knob{position:absolute;left:45px;top:45px;width:50px;height:50px;border-radius:50%;background:rgba(200,170,110,.75);pointer-events:none}
#mt .aim{position:fixed;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#ff5a5a;box-shadow:0 0 0 3px #ff5a5a55;display:none;pointer-events:none}
#mt .cx{position:absolute;pointer-events:none;color:#fff;font:700 13px system-ui;text-shadow:0 1px 2px #000;display:none}
#mtPortrait{position:fixed;inset:0;z-index:99999;background:#07131e;color:#d2b879;display:none;place-items:center;align-content:center;gap:18px;font:700 22px system-ui;letter-spacing:2px;text-align:center}#mtPortrait button{font:700 18px system-ui;padding:12px 26px;border-radius:10px;border:1px solid #d2b879;background:#14324a;color:#f0e2b6}#mtPortrait button.alt{background:transparent;color:#9fb3c2;border-color:#4a6577;font-size:15px}
@media (orientation:portrait){#mtPortrait.need{display:grid}}
#mt .shop{position:absolute;pointer-events:auto;left:calc(8px + env(safe-area-inset-left));top:calc(118px + env(safe-area-inset-top));height:24px;min-width:68px;padding:0 7px 0 3px;box-sizing:border-box;display:flex;align-items:center;gap:5px;
 background:linear-gradient(#10232d,#06121a);box-shadow:inset 0 0 0 1px #c89b3c55;border:1px solid #785a28;border-radius:3px;color:#f0e6d2;font:700 12px 'LoL CN',system-ui,sans-serif;text-shadow:0 1px 2px #000;touch-action:none}
#mt .shop i{width:13px;height:13px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#e8b84a 45%,#8a5a12);box-shadow:0 0 0 1px #5b3c0c,0 0 4px #c89b3c99}#mt .shop.on{filter:brightness(1.4)}
#mtFsx{position:fixed;z-index:10001;top:2px;right:calc(5px + env(safe-area-inset-right));width:26px;height:26px;box-sizing:border-box;display:none;align-items:center;justify-content:center;border:1.5px solid #c8aa6e;border-radius:50%;background:radial-gradient(circle at 50% 35%,#1d3a4c,#06121a);box-shadow:0 0 0 2px #000a,0 2px 8px #000c;touch-action:none;cursor:pointer}#mtFsx:active{transform:scale(.92);border-color:#f0e6d2}

body.mt-touch .match-chat{top:calc(118px + env(safe-area-inset-top))!important;bottom:auto!important;left:calc(86px + env(safe-area-inset-left))!important;width:min(300px,38vw)!important}
body.mt-touch .match-chat-heading>span{display:none!important}body.mt-touch .chat-open{font-size:0!important;width:30px!important;height:24px!important;min-width:0!important;padding:0!important;background:linear-gradient(#10232d,#06121a) !important;border:1px solid #785a28!important;border-radius:3px!important;display:grid!important;place-items:center!important}body.mt-touch .chat-open::after{content:'';width:18px;height:18px;background:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23f0e6d2%22%20stroke-width%3D%222%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M4%205h16v11H10l-5%204v-4H4z%22/%3E%3Cpath%20d%3D%22M8%2010.5h.01M12%2010.5h.01M16%2010.5h.01%22%20stroke-linecap%3D%22round%22%20stroke-width%3D%222.6%22/%3E%3C/svg%3E") center/contain no-repeat}
.mt-menu-btn{min-width:120px}
body.mt-touch .native-shop .ns-tooltip{display:none!important}
body.mt-touch .purchase-hint:not([hidden]){display:grid!important;justify-items:center;gap:6px;width:fit-content!important;max-width:calc(100vw - 260px);top:calc(66px + env(safe-area-inset-top))!important;padding:7px 12px!important;font-size:12px!important;border-radius:4px!important}body.mt-touch .purchase-hint>p{display:none}body.mt-touch .purchase-hint>strong{white-space:nowrap;flex-basis:100%;text-align:center}body.mt-touch .purchase-hint>div{gap:8px!important}body.mt-touch .purchase-hint button{padding:3px 10px!important;line-height:18px;font-size:12px!important;white-space:nowrap}
/* ---- portrait: header spans the top, the minimap cluster sits under it ---- */
body.mt-port #nativeGameHeader{left:0!important;right:auto!important;transform-origin:0 0!important;transform:scale(var(--mt-hs,.84))!important}
body.mt-port.mt-touch .chat-open{translate:64px calc(var(--mt-top,0px) + 2px)}
body.mt-port #minimap,body.mt-port #qhItems,body.mt-port #mt .shop{translate:0 var(--mt-top,0px)}
body.mt-port.mt-touch .purchase-hint:not([hidden]){left:calc(8px + env(safe-area-inset-left))!important;right:calc(8px + env(safe-area-inset-right))!important;transform:none!important;max-width:none!important;top:calc(var(--mt-top,0px) + 154px + env(safe-area-inset-top))!important;flex-wrap:wrap;justify-content:center}
body.mt-port #mt .atk{width:80px;height:80px}
html,body{overscroll-behavior:none;touch-action:none}
body.mt-touch #minimap{top:env(safe-area-inset-top)!important;left:env(safe-area-inset-left)!important;right:auto!important;bottom:auto!important;width:112px!important;height:112px!important}
/* 选英雄界面按手机横/竖屏压缩到一屏 */
body.mt-lobby #lobby[data-online-stage="room"] .team-roster{padding:6px 10px!important}
body.mt-lobby #lobby[data-online-stage="room"] .team-roster h3{margin:0 0 2px!important;font-size:11px!important}
body.mt-lobby #lobby[data-online-stage="room"] .team-bot-actions{margin:4px 0 4px!important;padding-bottom:4px!important;gap:6px!important}
body.mt-lobby #lobby[data-online-stage="room"] .team-bot-actions button{min-height:26px!important;padding:2px 8px!important;font-size:12px!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-player{padding:2px 0!important;font-size:11px!important;line-height:1.3!important}
body.mt-lobby #lobby[data-online-stage="room"] .team-empty{padding:2px 0!important;font-size:11px!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-room-meta{display:none!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-roster{gap:8px!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-actions{padding:6px 16px!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-actions button{min-height:30px!important;height:30px!important}
@media (max-height:540px) and (orientation:landscape){
body.mt-lobby .lobby-panel{max-height:calc(100dvh - 22px)!important}
body.mt-lobby #lobby[data-online-stage="room"] .lobby-top{padding:4px 16px!important}
body.mt-lobby #lobby[data-online-stage="room"] .select-body{height:min(128px,27vh)!important;margin-top:8px!important}
body.mt-lobby #lobby[data-online-stage="room"] .hero-select{margin-top:8px!important;max-height:min(178px,40vh)!important;grid-template-columns:repeat(auto-fill,minmax(58px,1fr))!important}
body.mt-lobby #lobby[data-online-stage="room"] .hero-card{height:min(64px,13vh)!important}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout{padding:6px 0 2px 16px!important}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout select{height:30px!important;min-height:30px!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-lobby{padding:4px 16px!important}
}
@media (orientation:portrait){
body.mt-lobby #lobby{padding-top:calc(6px + env(safe-area-inset-top))!important}
body.mt-lobby .lobby-panel{max-height:calc(100dvh - 34px)!important}
body.mt-lobby #lobby[data-online-stage="room"] .lobby-flow-heading{padding:6px 14px 4px!important}
body.mt-lobby #lobby[data-online-stage="room"] #lobbyResourceStatus{display:none!important}
body.mt-lobby #lobby[data-online-stage="room"] #lobbyStepTitle{font-size:18px!important}
body.mt-lobby #lobby[data-online-stage="room"] .select-body{height:min(150px,18vh)!important;margin:6px 14px 0!important}
body.mt-lobby #lobby[data-online-stage="room"] #selectedName{font-size:26px!important;margin:0 0 4px!important}
body.mt-lobby #lobby[data-online-stage="room"] .selected-copy{padding:12px 14px!important}
body.mt-lobby #lobby[data-online-stage="room"] .hero-select{padding:8px 14px 4px!important;gap:6px!important;grid-template-columns:repeat(4,minmax(0,1fr))!important}
body.mt-lobby #lobby[data-online-stage="room"] .hero-select button{height:min(76px,9vh)!important}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout{padding:4px 14px 6px!important;gap:10px!important;flex-wrap:nowrap!important}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout>span{display:none!important}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout select{height:32px!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-lobby{padding:6px 14px!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-roster{grid-template-columns:1fr 1fr!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-actions{padding:6px 14px!important;flex-wrap:wrap!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-actions button{flex:1 1 auto!important;padding:0 10px!important}
body.mt-lobby #lobby[data-online-stage="room"] #onlineStart{flex:1 1 100%!important;order:-1}
}
/* 选英雄界面：参照原版客户端的海克斯金配色 */
body.mt-lobby #lobby[data-online-stage="room"]{background:#010a13!important}
body.mt-lobby #lobby[data-online-stage="room"]::before{content:'';position:absolute;inset:0;background:var(--hs-splash,none) center 20%/cover no-repeat;opacity:.32;filter:saturate(1.1);pointer-events:none}
body.mt-lobby #lobby[data-online-stage="room"]::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,#010a1300 0,#010a13cc 70%,#010a13 100%);pointer-events:none}
body.mt-lobby #lobby[data-online-stage="room"]>*{position:relative;z-index:1}
body.mt-lobby #lobby[data-online-stage="room"] .lobby-panel{background:linear-gradient(180deg,#010a13d9,#0a1428e6)!important;border:1px solid #785a28!important;border-radius:2px!important;box-shadow:0 0 0 1px #010a13,0 0 24px #000a,inset 0 0 0 1px #c8aa6e22!important}
body.mt-lobby #lobby[data-online-stage="room"] .lobby-top{background:linear-gradient(90deg,#c8aa6e00,#c8aa6e26 50%,#c8aa6e00)!important;border-bottom:1px solid #785a2899!important;justify-content:center!important;font-family:"LoL CN",serif;color:#f0e6d2!important;letter-spacing:6px!important;text-shadow:0 0 10px #c8aa6e66}
body.mt-lobby #lobby[data-online-stage="room"] .lobby-top>span:first-child::after{content:' · 选择你的英雄';color:#c8aa6e}
body.mt-lobby #lobby[data-online-stage="room"] .lobby-top>span:last-child{display:none}
body.mt-lobby #lobby[data-online-stage="room"] #lobbyStepTitle{font-family:"LoL CN",serif;color:#f0e6d2!important;letter-spacing:2px}
body.mt-lobby #lobby[data-online-stage="room"] .select-body{border:1px solid #785a28!important;border-radius:2px!important;box-shadow:inset 0 0 0 1px #010a13,inset 0 0 30px #000c;background:#010a13}
body.mt-lobby #lobby[data-online-stage="room"] .hero-art{opacity:.85!important}
body.mt-lobby #lobby[data-online-stage="room"] .art-shade{background:linear-gradient(90deg,#010a13 0,#010a13cc 25%,#010a1300 70%)!important}
body.mt-lobby #lobby[data-online-stage="room"] #selectedName{font-family:"LoL CN",serif;background:linear-gradient(180deg,#f0e6d2 30%,#c8aa6e 100%);-webkit-background-clip:text;background-clip:text;color:transparent!important;text-shadow:none!important;filter:drop-shadow(0 2px 2px #000c)}
body.mt-lobby #lobby[data-online-stage="room"] #selectedTitle{color:#a09b8c!important;letter-spacing:2px}
body.mt-lobby #lobby[data-online-stage="room"] #selectedTitle span{border:1px solid #785a28!important;color:#c8aa6e!important;background:#1e2328cc!important;border-radius:0!important}
body.mt-lobby #lobby[data-online-stage="room"] #random{color:#cdbe91!important;background:#1e2328cc!important;border:1px solid #785a28!important;border-radius:0!important;padding:3px 8px!important}
body.mt-lobby #lobby[data-online-stage="room"] .hero-select button.hero-card{position:relative;height:auto!important;aspect-ratio:auto;display:flex!important;flex-direction:column;align-items:center;gap:3px;padding:0 0 2px!important;background:none!important;border:0!important;box-shadow:none!important;overflow:visible!important;border-radius:0!important}
body.mt-lobby #lobby[data-online-stage="room"] .hero-card img{display:none!important}
body.mt-lobby #lobby[data-online-stage="room"] .hero-card::before{content:'';display:block;width:min(52px,100%);aspect-ratio:1;background:var(--hs-icon) center/112% no-repeat #010a13;border:1px solid #463714;box-shadow:inset 0 0 0 1px #010a13;transition:transform .12s,border-color .12s,filter .12s;filter:saturate(.9) brightness(.9)}
body.mt-lobby #lobby[data-online-stage="room"] .hero-card span{position:static!important;background:none!important;padding:0!important;font-size:11px!important;color:#a09b8c!important;text-shadow:none!important;white-space:nowrap;line-height:1.2}
body.mt-lobby #lobby[data-online-stage="room"] .hero-card:active::before{transform:scale(.94)}
body.mt-lobby #lobby[data-online-stage="room"] .hero-card.active::before{border:2px solid #c8aa6e;box-shadow:0 0 0 1px #785a28,0 0 12px #c8aa6eaa,inset 0 0 0 1px #010a13;filter:none}
body.mt-lobby #lobby[data-online-stage="room"] .hero-card.active span{color:#f0e6d2!important}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout label{display:flex;align-items:center;gap:5px;color:#785a28;font-weight:700}
body.mt-lobby #lobby[data-online-stage="room"] .hs-spell{width:30px;height:30px;border:1px solid #c8aa6e;box-shadow:0 0 0 1px #010a13,0 0 6px #c8aa6e55;object-fit:cover;background:#010a13}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout select{background:#1e2328!important;border:1px solid #785a28!important;border-radius:0!important;color:#cdbe91!important;height:30px!important;min-height:30px!important;padding:0 6px!important;font-size:13px!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-lobby{background:none!important;border-top:1px solid #785a2866!important}
body.mt-lobby #lobby[data-online-stage="room"] .team-roster{background:linear-gradient(90deg,#0ac8b91a,#010a1300 60%)!important;border:0!important;border-left:2px solid #0ac8b9!important;border-radius:0!important}
body.mt-lobby #lobby[data-online-stage="room"] .team-roster.red{background:linear-gradient(90deg,#be1e371f,#010a1300 60%)!important;border-left-color:#be1e37!important}
body.mt-lobby #lobby[data-online-stage="room"] .team-roster h3{color:#0ac8b9!important;letter-spacing:2px}
body.mt-lobby #lobby[data-online-stage="room"] .team-roster.red h3{color:#e0465f!important}
body.mt-lobby #lobby[data-online-stage="room"] .team-bot-actions{border-bottom-color:#785a2855!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-player-name{color:#f0e6d2}
body.mt-lobby #lobby[data-online-stage="room"] .online-player-detail{color:#a09b8c!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-actions{background:linear-gradient(#010a1300,#010a13f2 35%)!important;border-top:1px solid #785a2899!important}
body.mt-lobby #lobby[data-online-stage="room"] .online-actions button,body.mt-lobby #lobby[data-online-stage="room"] .team-bot-actions button{background:#1e2328!important;border:1px solid #785a28!important;border-radius:0!important;color:#cdbe91!important;letter-spacing:1px}
body.mt-lobby #lobby[data-online-stage="room"] .online-actions button:disabled,body.mt-lobby #lobby[data-online-stage="room"] .team-bot-actions button:disabled{color:#5b5a56!important;border-color:#3c3c41!important}
body.mt-lobby #lobby[data-online-stage="room"] #onlineLeave{border-color:transparent!important;background:none!important;color:#a09b8c!important}
body.mt-lobby #lobby[data-online-stage="room"] #onlineStart{background:linear-gradient(180deg,#1e2328,#0a1428)!important;border:2px solid #c8aa6e!important;color:#f0e6d2!important;font-family:"LoL CN",serif;font-size:15px!important;letter-spacing:4px;box-shadow:0 0 0 1px #785a28,0 0 14px #c8aa6e66,inset 0 0 12px #0ac8b933!important;text-shadow:0 0 8px #c8aa6e}
body.mt-lobby #lobby[data-online-stage="room"] #onlineStart:disabled{border-color:#5b5a56!important;color:#5b5a56!important;box-shadow:none!important;text-shadow:none}
body.mt-lobby #lobby[data-online-stage="room"] .lobby-bottom{display:none!important}
body.mt-lobby #lobby[data-online-stage="room"]~.disclaimer,body.mt-lobby #lobby[data-online-stage="room"] .disclaimer{color:#5b5a56}
@media (orientation:portrait){body.mt-lobby #lobby[data-online-stage="room"] .online-player{flex-direction:column!important;gap:0!important}body.mt-lobby #lobby[data-online-stage="room"] .online-player-detail{white-space:normal!important}}
@media (max-height:540px) and (orientation:landscape){
body.mt-lobby #lobby[data-online-stage="room"] .lobby-panel{grid-template-columns:minmax(0,36%) minmax(0,1fr)!important}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout{gap:6px!important;flex-wrap:nowrap!important}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout select{width:84px!important;font-size:12px!important}
body.mt-lobby #lobby[data-online-stage="room"] #selectedName{font-size:22px!important}
body.mt-lobby #lobby[data-online-stage="room"] .lobby-panel{column-gap:18px!important}
body.mt-lobby #lobby[data-online-stage="room"] .hero-select{grid-template-columns:repeat(4,minmax(0,1fr))!important;align-self:center!important;align-content:center!important;justify-items:center;row-gap:6px!important;column-gap:4px!important;max-height:none!important;overflow:visible!important;margin:8px 16px 0 0!important;padding:8px 6px!important;border:1px solid #463714;background:linear-gradient(180deg,#010a1366,#0a142899);box-shadow:inset 0 0 0 1px #010a13}
body.mt-lobby #lobby[data-online-stage="room"] .hero-card::before{width:54px!important;flex:none}
body.mt-lobby #lobby[data-online-stage="room"] .hero-select button.hero-card{width:100%!important}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout{justify-content:space-between}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout select{flex:1;width:auto!important;min-width:0}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout label{flex:1;min-width:0}
body.mt-lobby #lobby[data-online-stage="room"] .select-body{height:auto!important;min-height:110px;align-self:stretch}
body.mt-lobby #lobby[data-online-stage="room"] .summoner-loadout{align-self:end;padding-bottom:0!important}
body.mt-lobby #lobby[data-online-stage="room"] .hero-select{grid-template-columns:repeat(4,72px)!important;justify-content:center!important;column-gap:10px!important;row-gap:4px!important}
}
/* 大厅/创建页：同款海克斯金风格 */
body.mt-lobby #lobby:not([data-online-stage="room"]){background:#010a13!important}
body.mt-lobby #lobby:not([data-online-stage="room"])::before{content:'';position:absolute;inset:0;background:var(--hs-splash,none) center 20%/cover no-repeat;opacity:.3;pointer-events:none}
body.mt-lobby #lobby:not([data-online-stage="room"])::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,#010a1300 0,#010a13cc 70%,#010a13 100%);pointer-events:none}
body.mt-lobby #lobby:not([data-online-stage="room"])>*{position:relative;z-index:1}
body.mt-lobby #lobby:not([data-online-stage="room"]) .lobby-panel{background:linear-gradient(180deg,#010a13e0,#0a1428ee)!important;border:1px solid #785a28!important;border-radius:2px!important;box-shadow:0 0 0 1px #010a13,0 0 24px #000a,inset 0 0 0 1px #c8aa6e22!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .lobby-top{background:linear-gradient(90deg,#c8aa6e00,#c8aa6e26 50%,#c8aa6e00)!important;border-bottom:1px solid #785a2899!important;justify-content:center!important;font-family:"LoL CN",serif;color:#f0e6d2!important;letter-spacing:6px!important;text-shadow:0 0 10px #c8aa6e66}
body.mt-lobby #lobby:not([data-online-stage="room"]) .lobby-top>span:first-child::after{content:' · 召唤师大厅';color:#c8aa6e}
body.mt-lobby #lobby:not([data-online-stage="room"]) .lobby-top>span:last-child,body.mt-lobby #lobby:not([data-online-stage="room"]) #lobbyResourceStatus{display:none!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .lobby-flow-heading{border-bottom:1px solid #785a2866!important;text-align:center}
body.mt-lobby #lobby:not([data-online-stage="room"]) #lobbyStepTitle{font-family:"LoL CN",serif;letter-spacing:4px;background:linear-gradient(180deg,#f0e6d2 30%,#c8aa6e);-webkit-background-clip:text;background-clip:text;color:transparent!important;filter:drop-shadow(0 2px 2px #000c)}
body.mt-lobby #lobby:not([data-online-stage="room"]) #lobbyStepNote{color:#a09b8c!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-lobby{background:none!important;border-top:0!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-step-label{color:#c8aa6e!important;letter-spacing:2px!important;font-weight:700}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-step-label::before{content:'◆ ';color:#785a28;font-size:.8em}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-row input,body.mt-lobby #lobby:not([data-online-stage="room"]) .online-row select,body.mt-lobby #lobby:not([data-online-stage="room"]) .online-cap{background:#1e2328!important;border:1px solid #785a28!important;border-radius:0!important;color:#f0e6d2!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-cap{color:#a09b8c!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-cap select{border:0!important;color:#c8aa6e!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-cap input[type=checkbox]{accent-color:#c8aa6e}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-row input:focus{outline:1px solid #c8aa6e!important;border-color:#c8aa6e!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-row button{background:#1e2328!important;border:1px solid #785a28!important;border-radius:0!important;color:#cdbe91!important;letter-spacing:1px}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-row button.accent:not(:disabled){background:linear-gradient(180deg,#1e2328,#0a1428)!important;border:2px solid #c8aa6e!important;color:#f0e6d2!important;font-family:"LoL CN",serif;letter-spacing:3px;box-shadow:0 0 0 1px #785a28,0 0 12px #c8aa6e55,inset 0 0 10px #0ac8b926!important;text-shadow:0 0 6px #c8aa6e}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-row button:disabled{color:#5b5a56!important;border-color:#3c3c41!important;opacity:1!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-room-list{flex-direction:column;align-items:stretch!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) #onlineRooms{box-sizing:border-box;width:100%;border:1px solid #463714;background:#010a1399;min-height:64px}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-room-empty{color:#5b5a56!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-room-card{background:linear-gradient(90deg,#1e2328,#010a13)!important;border:1px solid #785a28!important;border-radius:0!important;color:#cdbe91!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-room-meta{color:#a09b8c!important;border-top:1px solid #785a2844;padding-top:6px}
body.mt-lobby #lobby:not([data-online-stage="room"]) .lobby-bottom{background:none!important;border-top:1px solid #785a2866!important;color:#5b5a56!important}
@media (orientation:portrait){
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-room-step{flex-wrap:wrap!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-room-step #onlineRoomName{flex:1 1 100%!important;width:100%!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-room-step #onlineCreate{flex:1 1 100%!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-room-list{flex-wrap:nowrap!important;flex-direction:column!important}
body.mt-lobby #lobby:not([data-online-stage="room"]) .online-room-list #onlineRooms{flex:1 1 100%!important;width:100%!important;box-sizing:border-box;margin:0!important}
}
`;

export function installMobileTouch(br){
 if(!isTouch()||globalThis.__mtInstalled)return;globalThis.__mtInstalled=true;try{if(localStorage.getItem('aram_debug'))globalThis.__mtBr=br;}catch{}globalThis.__mtDbg=()=>{const p=br.game()?.player;return p&&{x:Math.round(p.x),y:Math.round(p.y),hp:p.hp,cd:[0,1,2,3].map(i=>p.skills?.[i]||0)};};
 document.body.classList.add('mt-touch');const st=document.createElement('style');st.textContent=CSS;document.head.append(st);
 // 选英雄界面美化：背景原画、方形头像、召唤师技能图标
 (()=>{const lobby=document.getElementById('lobby'),art=document.getElementById('selectedArt');if(!lobby)return;
const ICON={flash:'assets/ui/flash.png',heal:'assets/ui/heal.png',mark:'assets/ui/mark.png'};
const sync=()=>{const s=art?.dataset.src||art?.getAttribute('src');if(s)lobby.style.setProperty('--hs-splash',`url("${s}")`);
 for(const b of document.querySelectorAll('#heroSelect .hero-card'))if(!b.style.getPropertyValue('--hs-icon'))b.style.setProperty('--hs-icon',`url("assets/${b.dataset.hero}.png")`);
 for(const id of['summonerD','summonerF']){const sel=document.getElementById(id);if(!sel)continue;let im=sel.parentElement.querySelector('.hs-spell');if(!im){im=document.createElement('img');im.className='hs-spell';im.alt='';sel.before(im);sel.addEventListener('change',sync);}const want=ICON[sel.value]||'';if(im.getAttribute('src')!==want)im.src=want;}};
sync();if(art)new MutationObserver(sync).observe(art,{attributes:true,attributeFilter:['src','data-src']});new MutationObserver(sync).observe(document.getElementById('heroSelect')||lobby,{childList:true});
setInterval(sync,1500);})();
 const vp=document.querySelector('meta[name=viewport]');if(vp)vp.content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
 const pw=document.createElement('div');pw.id='mtPortrait';pw.className='need';pw.innerHTML='<div>横屏游玩效果最好</div><button id="mtLand">全屏横屏</button><button id="mtStay" class="alt">直接竖屏玩</button><div style="font-size:13px;color:#7f97a8;letter-spacing:0">打不开横屏？先关掉手机的方向锁定</div>';document.body.append(pw);
  pw.querySelector('#mtLand').onclick=async()=>{try{const el=document.documentElement;if(!document.fullscreenElement&&el.requestFullscreen)await el.requestFullscreen({navigationUI:'hide'});}catch(e){}try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape');}catch(e){}setTimeout(()=>{if(innerWidth<innerHeight)pw.querySelector('div').textContent='浏览器不支持自动横屏，请关方向锁后转屏，或直接竖屏玩';},600);};
  pw.querySelector('#mtStay').onclick=()=>{pw.classList.remove('need');try{dispatchEvent(new Event('resize'));}catch(e){}};
 for(const t of['gesturestart','gesturechange'])document.addEventListener(t,e=>e.preventDefault());
 document.addEventListener('dblclick',e=>e.preventDefault());

 const root=document.createElement('div');root.id='mt';root.className='off';document.body.append(root);
 const el=(cls,txt,css)=>{const d=document.createElement('div');d.className=cls;if(txt)d.textContent=txt;Object.assign(d.style,css||{});root.append(d);return d;};
 const R=n=>`calc(${n}px + env(safe-area-inset-right))`,B=n=>`calc(${n}px + env(safe-area-inset-bottom))`;

 // ---- helpers ----
 const g=()=>br.game();
 const me=()=>g()?.player;
 const enemies=()=>{const p=me();if(!p)return[];return(g().units||[]).filter(u=>u&&u!==p&&u.alive!==false&&!u.dead&&u.team!==p.team&&u.hp!==0&&Number.isFinite(u.x));};
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function nearest(range=1e9,heroFirst=true){const p=me();if(!p)return null;let best=null,bd=1e18;
  for(const u of enemies()){let d=dist(u,p);if(d>range)continue;if(heroFirst&&u.kind==='hero')d-=400;if(br.canHit&&!br.canHit(u))continue;if(d<bd){bd=d;best=u;}}return best;}
 // Screen drag (px) -> world offset. Use the game's own unproject so camera tilt is respected.
 function worldFromDrag(dx,dy,scale){const cx=innerWidth/2,cy=innerHeight/2;const a=br.unproject(cx,cy),b=br.unproject(cx+dx*scale,cy+dy*scale);return{x:b.x-a.x,y:b.y-a.y};}

 // ---- joystick ----
 const joy=el('joy');const knob=document.createElement('div');knob.className='knob';joy.append(knob);
 let jid=null,jv={x:0,y:0},jt=0;
 function joyMove(e){const r=joy.getBoundingClientRect();let dx=e.clientX-(r.left+70),dy=e.clientY-(r.top+70);const m=Math.hypot(dx,dy),max=50;if(m>max){dx*=max/m;dy*=max/m;}
  knob.style.transform=`translate(${dx}px,${dy}px)`;jv={x:dx/max,y:dy/max};}
 joy.addEventListener('pointerdown',e=>{e.preventDefault();jid=e.pointerId;joy.setPointerCapture(jid);joyMove(e);tickJoy(true);});
 joy.addEventListener('pointermove',e=>{if(e.pointerId===jid)joyMove(e);});
 const joyEnd=e=>{if(e.pointerId!==jid)return;jid=null;jv={x:0,y:0};knob.style.transform='';if(br.on())br.controls.stop();};
 joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);addEventListener('pointerup',joyEnd,true);addEventListener('pointercancel',joyEnd,true);addEventListener('touchend',e=>{if(jid!==null&&![...e.touches].some(t=>{const r=joy.getBoundingClientRect();return t.clientX<r.right+80&&t.clientY>r.top-80;}))joyEnd({pointerId:jid});},true);
 function tickJoy(force){if(jid===null||!br.on())return;const now=performance.now();if(!force&&now-jt<110)return;jt=now;
  if(Math.hypot(jv.x,jv.y)<.15)return;const p=me();if(!p)return;const off=worldFromDrag(jv.x,jv.y,48);const L=Math.hypot(off.x,off.y)||1,ux=off.x/L,uy=off.y/L;
  // Walk the ray out from the hero and stop at the first wall: a far target inside a wall gets snapped
  // to some other walkable spot, which sent the hero sideways or backwards near walls and relics.
  const nav=g()?.navigation;let tx=p.x+ux*420,ty=p.y+uy*420;
  if(nav?.canWalk){const free=(ax,ay)=>{let d=0;for(let s=12;s<=420;s+=12){if(!nav.canWalk(p.x+ax*s,p.y+ay*s))break;d=s;}return d;};
   let bx=ux,by=uy,bd=free(ux,uy);
   // Only when blocked right ahead (tower base, wall corner; <60) slide along; a larger threshold steered the hero away from brush tucked against walls. Slide along the obstacle by trying directions
   // fanned out from the stick, nearest angle first, so the hero walks around instead of stopping.
   if(bd<60){for(const deg of[15,-15,30,-30,45,-45,60,-60,75,-75,90,-90]){const a=deg*Math.PI/180,c=Math.cos(a),sn=Math.sin(a),rx=ux*c-uy*sn,ry=ux*sn+uy*c,rd=free(rx,ry);if(rd>=150){bx=rx;by=ry;bd=rd;break;}if(rd>bd+24){bx=rx;by=ry;bd=rd;}}}
   const d=Math.max(bd,12);tx=p.x+bx*d;ty=p.y+by*d;}
  br.controls.pointer(2,{x:tx,y:ty},null);}

 // ---- attack ----
 const atk=el('b atk');atk.innerHTML='<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#f0e6d2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3.5H20.5V9.5L9 21 3 15Z" fill="#f0e6d233"/><path d="M5 13l6 6M4 20l3-3"/></svg>';atk.setAttribute('aria-label','攻击');
 let atkHeld=false,atkT=0;
 function doAttack(){if(!br.on())return;const t=nearest(1400);if(t)br.controls.pointer(2,{x:t.x,y:t.y},t);else{const p=me();if(p)br.controls.attackMove&&(br.controls.attackMove(),br.controls.pointer(0,{x:p.x,y:p.y},null));}}
 atk.addEventListener('pointerdown',e=>{e.preventDefault();atkHeld=true;atk.classList.add('on');doAttack();atkT=performance.now();});
 const atkUp=()=>{atkHeld=false;atk.classList.remove('on');};atk.addEventListener('pointerup',atkUp);atk.addEventListener('pointercancel',atkUp);
 // ---- last-hit minion / hit tower (like mobile MOBAs: small buttons beside attack) ----
 const pickMinion=()=>{const p=me();if(!p)return null;const ad=p.ad??p.attackDamage??p.damage??60;let best=null,bs=1e18;for(const u of enemies()){if(u.kind!=='minion')continue;const d=dist(u,p);if(d>1000)continue;if(br.canHit&&!br.canHit(u))continue;const sc=(u.hp<=ad*1.1?0:1e6)+u.hp+d*.2;if(sc<bs){bs=sc;best=u;}}return best;};
 const pickTower=()=>{const p=me();if(!p)return null;let best=null,bd=1e18;for(const u of enemies()){if(!/^(tower|inhibitor|nexus)$/.test(u.kind))continue;const d=dist(u,p);if(d>1400)continue;if(br.canHit&&!br.canHit(u))continue;if(d<bd){bd=d;best=u;}}return best;};
 function holdBtn(b,pick){let held=false,t=0;const go=()=>{if(!br.on())return;const u=pick();if(u)br.controls.pointer(2,{x:u.x,y:u.y},u);};
  b.addEventListener('pointerdown',e=>{e.preventDefault();held=true;b.classList.add('on');go();t=performance.now();});const up=()=>{held=false;b.classList.remove('on');};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);
  return ()=>{if(held&&performance.now()-t>350){t=performance.now();go();}};}
 const lhB=el('b sm lh',null,{right:R(114),bottom:B(2)});lhB.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f0e6d2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5" fill="#f0e6d233"/><path d="M5 21c1-4 4-6 7-6s6 2 7 6"/><path d="M9 3l1.5 2M15 3l-1.5 2"/></svg>';lhB.setAttribute('aria-label','补兵');
 const twB=el('b sm tw',null,{right:R(4),bottom:B(114)});twB.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f0e6d2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21V9h10v12M5 9h14M7 9V4h2v2h2V4h2v2h2V4h2v5M10 21v-4a2 2 0 0 1 4 0v4" fill="#f0e6d233"/></svg>';twB.setAttribute('aria-label','推塔');
 const lhTick=holdBtn(lhB,pickMinion),twTick=holdBtn(twB,pickTower);


 // ---- skills QWER (ring around attack), D F ----
 const aimDot=el('aim');
 const pos=[[118,20],[104,104],[22,122],[176,150]];// [right,bottom] offsets for Q W E R
 const keys=['Q','W','E','R'];const ups=[];const cds=[];const skBtns=[];
 keys.forEach((k,i)=>{const b=el('b sk',k,{right:R(pos[i][0]+28),bottom:B(pos[i][1]+26)});bindSkill(b,i,300);
  const u=el('up','+',{right:R(pos[i][0]+28-4),bottom:B(pos[i][1]+26+42)});u.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();br.upgrade(i);});ups.push(u);
  skBtns.push(b);});
 const dB=el('b sm','D',{right:R(250),bottom:B(30)}),fB=el('b sm','F',{right:R(250),bottom:B(84)});bindSkill(dB,4,0);bindSkill(fB,5,0);skBtns.push(dB,fB);
 // ---- portrait layout: same buttons, re-seated so nothing overlaps the joystick; landscape keeps the original ring ----
 const LAND={atk:[28,26],sk:pos.map(([r,b])=>[r+28,b+26]),d:[250,30],f:[250,84],lh:[114,2],tw:[4,114]};
 const PORT={atk:[16,22],sk:[[112,20],[104,104],[22,122],[172,176]],d:[30,196],f:[84,214],lh:[170,4],tw:[8,256]};
 const seat=(b,[r,bt])=>{b.style.right=R(r);b.style.bottom=B(bt);};
 function layout(){const port=innerHeight>innerWidth;document.body.classList.toggle('mt-port',port);const L=port?PORT:LAND;
  seat(atk,L.atk);skBtns.slice(0,4).forEach((b,i)=>{seat(b,L.sk[i]);seat(ups[i],[L.sk[i][0]-4,L.sk[i][1]+42]);});seat(dB,L.d);seat(fB,L.f);seat(lhB,L.lh);seat(twB,L.tw);
  const hw=document.getElementById('nativeGameHeader')?.offsetWidth||475;const hs=port?Math.min(1,(innerWidth-36)/hw):.84;document.documentElement.style.setProperty('--mt-hs',hs.toFixed(3));document.documentElement.style.setProperty('--mt-top',port?Math.round(51*hs)+'px':'0px');}
 layout();addEventListener('resize',layout);addEventListener('orientationchange',()=>setTimeout(layout,200));
 // Skill buttons wear the same icon as the skill (taken from the HUD's own icon) with a radial cooldown sweep and seconds.
 skBtns.forEach((b,i)=>{b.textContent='';b.classList.add('ic');const rad=document.createElement('i');rad.className='rad';const t=document.createElement('span');t.className='cdt';const kl=document.createElement('span');kl.className='kl';kl.textContent='QWERDF'[i];b.append(rad,t,kl);cds.push({b,rad,t,icon:'',max:0,shown:''});});
 function syncSkillButtons(){for(let i=0;i<6;i++){const c=cds[i];const im=document.querySelector('#abilities [data-skill="'+i+'"] img.nh-icon');const src=im?.src||'';
   if(src&&src!==c.icon){c.icon=src;c.b.style.backgroundImage='url("'+src+'")';}
   const cd=br.cooldown(i);if(cd>c.max+0.05||cd<=0.05&&c.max)c.max=cd>0.05?cd:0;
   const t=cd>0.05?(cd>=1?Math.ceil(cd)+'':cd.toFixed(1)):'';
   if(t!==c.shown){const was=c.shown;c.shown=t;c.t.textContent=t;c.b.classList.toggle('cd',!!t);c.rad.style.display=t?'block':'none';if(was&&!t){c.b.classList.remove('flash');void c.b.offsetWidth;c.b.classList.add('flash');}}
   if(t&&c.max>0)c.rad.style.setProperty('--p',Math.min(1,cd/c.max).toFixed(3));}}

 let previewTimer=0;
 function bindSkill(btn,i,aimScale){let id=null,sx=0,sy=0,drag=false;
  btn.addEventListener('pointerdown',e=>{e.preventDefault();if(!br.on())return;id=e.pointerId;btn.setPointerCapture(id);sx=e.clientX;sy=e.clientY;drag=false;btn.classList.add('on');clearTimeout(previewTimer);
   // Wild Rift style: pressing a skill shows its indicator at once, aimed at the auto target.
   const p=me();if(p&&aimScale){const t=nearest(1600),f=p.facing||{x:1,y:0},aim=t?{x:t.x,y:t.y}:{x:p.x+(f.x||1)*300,y:p.y+(f.y||0)*300};br.setMouse(aim);window.__mtAimPreview={kind:'skill',index:i};}});
  btn.addEventListener('pointermove',e=>{if(e.pointerId!==id||!aimScale)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.hypot(dx,dy)>18)drag=true;
   if(drag){const p=me();if(!p)return;const off=worldFromDrag(dx,dy,2.2);br.setMouse({x:p.x+off.x,y:p.y+off.y});window.__mtAimPreview={kind:'skill',index:i};aimDot.style.display='block';aimDot.style.left=(innerWidth/2+dx*2.2)+'px';aimDot.style.top=(innerHeight/2+dy*2.2)+'px';}});
  const end=e=>{if(e.pointerId!==id)return;id=null;const keep=window.__mtAimPreview&&e.type!=='pointercancel'&&!(drag&&Math.hypot(e.clientX-sx,e.clientY-sy)<14);if(!keep)window.__mtAimPreview=null;else previewTimer=setTimeout(()=>{window.__mtAimPreview=null;},220);btn.classList.remove('on');aimDot.style.display='none';
   if(e.type==='pointercancel')return;const dx=e.clientX-sx,dy=e.clientY-sy;
   if(drag&&Math.hypot(dx,dy)<14)return;// dragged back to centre = cancel
   castAt(i,drag?{dx,dy,scale:aimScale}:null);};
  btn.addEventListener('pointerup',end);btn.addEventListener('pointercancel',end);}

 function castAt(i,drag){const p=me();if(!p||!br.on())return;let aim,target=null;
  if(drag){const off=worldFromDrag(drag.dx,drag.dy,2.2);aim={x:p.x+off.x,y:p.y+off.y};let bd=500;for(const u of enemies()){const d=dist(u,aim);if(d<bd){bd=d;target=u;}}}
  else{target=nearest(1600);aim=target?{x:target.x,y:target.y}:{x:p.x,y:p.y};}
  br.setMouse(aim);
  const ok=br.controls.skill(i,aim,true);
  if(br.controls.pending)br.controls.pointer(0,aim,target);
  return ok;}

 // ---- shop (styled like the original gold/shop button), fullscreen exit; quality lives in the settings dialog ----
 const shopB=el('shop');const gi=document.createElement('i');const gt=document.createElement('span');gt.textContent='0';shopB.append(gi,gt);shopB.setAttribute('aria-label','装备商店');
 shopB.addEventListener('pointerdown',e=>{e.preventDefault();shopB.classList.add('on');br.shop();});const shopUp=()=>shopB.classList.remove('on');shopB.addEventListener('pointerup',shopUp);shopB.addEventListener('pointercancel',shopUp);
 // ---- portrait + HP/MP + 6 item slots (the bottom HUD is hidden on touch; this replaces it, mirroring its DOM) ----
 const mePanel=el('me');const meImg=document.createElement('img');meImg.alt='';const lv=document.createElement('span');lv.className='lv';const bars=document.createElement('div');bars.className='bars';
 const mkBar=c=>{const d=document.createElement('div');d.className='bar '+c;const f=document.createElement('i'),t=document.createElement('b');d.append(f,t);bars.append(d);return{d,f,t,w:'',s:''};};
 const hpB=mkBar('hp'),mpB=mkBar('mp');mePanel.append(meImg,lv,bars);
 const inv=el('inv');const invSlots=[];for(let i=0;i<6;i++){const d=document.createElement('div');const t=document.createElement('span');t.style.display='none';d.append(t);inv.append(d);
  d.addEventListener('pointerdown',e=>{e.preventDefault();d.classList.add('on');document.querySelectorAll('#equipmentSlots .equipment-slot')[i]?.click();});const off=()=>d.classList.remove('on');d.addEventListener('pointerup',off);d.addEventListener('pointercancel',off);
  invSlots.push({d,t,src:'',cd:''});}
 // Active items get their own buttons left of D/F, like the mobile game's item-active slot (icon, radial cooldown, seconds).
 const actBtns=[0,1].map(k=>{const b=el('b sm ic','',{right:R(304),bottom:B(30+k*54),display:'none'});const rad=document.createElement('i');rad.className='rad';const t=document.createElement('span');t.className='cdt';b.append(rad,t);
  const o={b,rad,t,slot:-1,src:'',max:0,shown:''};b.addEventListener('pointerdown',e=>{e.preventDefault();if(!br.on()||o.slot<0)return;b.classList.add('on');document.querySelectorAll('#equipmentSlots .equipment-slot')[o.slot]?.click();});
  const off=()=>b.classList.remove('on');b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);return o;});
 function syncActives(){const list=[];const seen=new Set();invSlots.forEach((s,i)=>{if(s.src&&s.d.classList.contains('act')&&!seen.has(s.src)){seen.add(s.src);list.push(i);}});
  actBtns.forEach((o,k)=>{const i=list[k]??-1;if(i!==o.slot){o.slot=i;o.max=0;o.b.style.display=i<0?'none':'grid';}if(i<0)return;const s=invSlots[i];if(s.src!==o.src){o.src=s.src;o.b.style.backgroundImage='url("'+s.src+'")';}
   const cd=parseFloat(s.cd)||0;if(cd>o.max)o.max=cd;if(!cd)o.max=0;const t=s.cd;
   if(t!==o.shown){const was=o.shown;o.shown=t;o.t.textContent=t;o.b.classList.toggle('cd',!!t);o.rad.style.display=t?'block':'none';if(was&&!t){o.b.classList.remove('flash');void o.b.offsetWidth;o.b.classList.add('flash');}}
   if(t&&o.max>0)o.rad.style.setProperty('--p',Math.min(1,cd/o.max).toFixed(3));});}
 const setBar=(b,frac,txt)=>{const w=(Math.max(0,Math.min(1,frac))*100).toFixed(1)+'%';if(w!==b.w){b.w=w;b.f.style.width=w;}if(txt!==b.s){b.s=txt;b.t.textContent=txt;}};
 function syncMePanel(p){const ps=document.getElementById('portrait')?.src||'';if(ps&&meImg.src!==ps)meImg.src=ps;const l=String(p.level??'');if(lv.textContent!==l)lv.textContent=l;
  setBar(hpB,p.maxHp?p.hp/p.maxHp:0,Math.max(0,Math.ceil(p.hp||0))+' / '+Math.round(p.maxHp||0));
  const mt=document.getElementById('mpText')?.textContent||'';mpB.d.style.display=mt?'':'none';if(mt){const m=mt.match(/([\d.]+)\s*\/\s*([\d.]+)/);setBar(mpB,m?+m[1]/+m[2]:1,mt);}
  const btns=document.querySelectorAll('#equipmentSlots .equipment-slot');invSlots.forEach((s,i)=>{const b=btns[i],src=b?.querySelector('img.nh-icon')?.src||'';if(src!==s.src){s.src=src;s.d.style.backgroundImage=src?'url("'+src+'")':'';s.d.classList.toggle('act',!!b&&/主动/.test(b.title||''));}
   const c=b?.querySelector('.nh-item-cd')?.textContent||'';if(c!==s.cd){s.cd=c;s.t.textContent=c;s.t.style.display=c?'grid':'none';}});}
 // Like the mobile game: tap the top score/KDA bar to open the scoreboard (both teams' items, KDA, augments); tap again or tap the board to close.
 let boardOn=false;const kb=(t)=>dispatchEvent(new KeyboardEvent(t,{key:'Tab',code:'Tab',bubbles:true,cancelable:true}));
 const toggleBoard=()=>{const t=document.querySelector('.scoreboard-toggle');if(t){t.click();return;}boardOn=!boardOn;kb(boardOn?'keydown':'keyup');};
 const hdrTap=e=>{if(!br.on()||!e.target.closest('#nativeGameHeader'))return;e.preventDefault();toggleBoard();};
 document.addEventListener('pointerdown',e=>{const b=document.getElementById('matchScoreboard');if(b&&!b.hidden&&e.target.closest('#matchScoreboard')&&!e.target.closest('button')){toggleBoard();return;}hdrTap(e);});
 const fsOn=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
 const exitFs=async()=>{try{screen.orientation?.unlock?.();}catch(e){}try{await (document.exitFullscreen||document.webkitExitFullscreen)?.call(document);}catch(e){}};
 const enterFs=async()=>{try{const d=document.documentElement;await (d.requestFullscreen||d.webkitRequestFullscreen)?.call(d,{navigationUI:'hide'});}catch(e){}try{await screen.orientation?.lock?.('landscape');}catch(e){}};
 const fsx=document.createElement('div');fsx.id='mtFsx';fsx.setAttribute('role','button');fsx.setAttribute('aria-label','退出游戏');fsx.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f0e6d2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v8"/><path d="M6.3 7.2a8 8 0 1 0 11.4 0"/></svg>';document.body.append(fsx);fsx.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(!fsx.classList.contains('ingame'))return;/* no confirm(): blocked/silent in some WebViews (APK). Tap twice within 2.5s instead. */if(!fsx.dataset.arm){fsx.dataset.arm='1';fsx.classList.add('arm');br.game?.()?.banner?.('再点一次退出本局');clearTimeout(fsx._t);fsx._t=setTimeout(()=>{delete fsx.dataset.arm;fsx.classList.remove('arm');},2500);return;}delete fsx.dataset.arm;fsx.classList.remove('arm');const b=document.getElementById('backLobby');if(b)b.click();});
 const qName={high:'高',mid:'中',low:'低'};let qBtn=null,fBtn=null;
 const syncMenu=()=>{if(qBtn)qBtn.textContent='画质：'+qName[qualityLevel()];if(fBtn)fBtn.textContent=fsOn()?'退出全屏':'全屏';fsx.style.display=lastVis?'flex':'none';fsx.classList.toggle('ingame',!!lastVis);};
 function addMenuButtons(){const box=document.getElementById('nativeMenuExtras');if(!box||qBtn)return;
  qBtn=document.createElement('button');qBtn.type='button';qBtn.className='mt-menu-btn';qBtn.onclick=()=>{const n={high:'mid',mid:'low',low:'high'}[qualityLevel()];localStorage.setItem('aram_quality',n);localStorage.setItem('aram_quality_locked','1');br.applyQuality?.();syncMenu();};
  fBtn=document.createElement('button');fBtn.type='button';fBtn.className='mt-menu-btn';fBtn.onclick=()=>{fsOn()?exitFs():enterFs();};
  const sBtn=document.createElement('button');sBtn.type='button';sBtn.className='mt-menu-btn';const sync=()=>{sBtn.textContent=document.getElementById('sound')?.textContent||'声音：开';};sBtn.onclick=()=>{document.getElementById('sound')?.click();sync();};sync();
  box.prepend(qBtn,fBtn,sBtn);syncMenu();}
 document.addEventListener('fullscreenchange',syncMenu);document.addEventListener('webkitfullscreenchange',syncMenu);

 // ---- per-frame upkeep (cheap: only touches DOM when values change) ----
 let lastVis=null,fpsN=0,fpsT=performance.now(),slow=0,visSince=0;const upShown=[0,0,0,0],cdShown=['','','',''];
 function frame(){requestAnimationFrame(frame);
  if((frame._n=(frame._n||0)+1)%10===0||frame._lobby===undefined){const lb=document.getElementById('lobby'),on=!!lb&&lb.offsetParent!==null;if(on!==frame._lobby){frame._lobby=on;document.body.classList.toggle('mt-lobby',on);}}
  const vis=!!br.on();if(vis!==lastVis){root.classList.toggle('off',!vis);lastVis=vis;syncMenu();visSince=performance.now();fpsN=0;fpsT=visSince;slow=0;}
  if(!vis)return;
  if(!qBtn)addMenuButtons();
  tickJoy(false);
  if(atkHeld&&performance.now()-atkT>350){atkT=performance.now();doAttack();}lhTick();twTick();
  const p=me();const gold=Math.floor(g()?.gold||0)+'';if(gold!==gt.textContent)gt.textContent=gold;if(p){const pts=br.skillPoints?.()??0;for(let i=0;i<4;i++){const s=pts>0&&br.canUpgrade(i)?1:0;if(s!==upShown[i]){upShown[i]=s;ups[i].style.display=s?'block':'none';}
   }syncSkillButtons();syncMePanel(p);syncActives();}
  {const bd=document.getElementById('matchScoreboard'),open=!!bd&&!bd.hidden;if(open!==root._board){root._board=open;root.style.visibility=open?'hidden':'';}}
  // auto downgrade: skip first 10s (shader/asset warmup), then 3 windows in a row (~9s) under 30fps -> one step down; manual choice locks it
  fpsN++;const now=performance.now();if(now-fpsT>=3000){layout();const fps=fpsN*1000/(now-fpsT);fpsN=0;fpsT=now;
   if(now-visSince>8000&&fps<30&&!localStorage.getItem('aram_quality_locked')){slow++;const q=qualityLevel();if(slow>=3&&q==='high'){sessionStorage.setItem('aram_quality_auto','mid');br.applyQuality?.();syncMenu();slow=0;}}else slow=0;}
 }
 requestAnimationFrame(frame);
}
