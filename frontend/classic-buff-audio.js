// Original spell-buff loops not attached to a particle in the native Skin0 data.
export const CLASSIC_BUFF_AUDIO={
 Irelia:[{key:'p',until:'stackUntil',count:'stacks',minimum:4,start:'IreliaP_Max_OnBuffActivate'}],
 Akali:[{key:'p',until:'pEmpoweredUntil',start:'AkaliPweapon_active'}],
 Riven:[{key:'r',until:'rUntil',start:'RivenFengShuiEngine_OnBuffActivate',end:'RivenFengShuiEngine_OnBuffDeactivate'}],
 Vayne:[{key:'r',until:'rUntil',start:'VayneInquisition_OnBuffActivate',end:'VayneInquisition_OnBuffDeactivate'}],
 Tristana:[{key:'q',until:'qUntil',start:'TristanaQ_OnBuffActivate'}],
 MonkeyKing:[{key:'q',until:'qUntil',start:'MonkeyKingDoubleAttack_OnBuffActivate',end:'MonkeyKingDoubleAttack_OnBuffDeactivate'}],
 XinZhao:[{key:'q',until:'qUntil',count:'qHits',start:'XinZhaoQ_OnBuffActivate'},{key:'r',until:'rUntil',start:'XinZhaoRRangedImmunity_OnBuffActivate',end:'XinZhaoRRangedImmunity_OnBuffDeactivate'}],
};
export class ClassicBuffAudio{
 constructor(audio){this.audio=audio;this.game=null;this.active=new Map();}
 reset(){for(const key of this.active.keys())this.audio.stopChannel(key);this.active.clear();this.game=null;}
 update(game){
  const initial=this.game!==game;if(initial){this.reset();this.game=game;}
  const wanted=new Set();
  for(const u of game.units||[]){const hero=u.hero?.id;for(const rule of CLASSIC_BUFF_AUDIO[hero]||[]){
   const key=`buff:${u.id}:${rule.key}`,s=u.classic||{};
   if(!u.alive||!(s[rule.until]>game.time)||(rule.count&&!(s[rule.count]>=(rule.minimum||1))))continue;
   const d=Math.hypot(u.x-game.player.x,u.y-game.player.y);
   if(d>=800||u.teemoStealth&&u.team!==game.player.team||(u.classicRealmId||0)!==(game.player.classicRealmId||0))continue;
   wanted.add(key);if(this.active.has(key))continue;
   const record={hero,rule,unit:u,played:false};this.active.set(key,record);
   if(initial||!this.audio.enabled)continue;
   record.played=this.audio.play(hero,`Play_sfx_${hero}_${rule.start}`,{channel:key,volume:.15*(1-d/800),loop:'native'});
  }}
  for(const [key,r] of this.active){if(wanted.has(key))continue;this.audio.stopChannel(key);this.active.delete(key);
   const u=game.units.find(u=>u.id===r.unit.id),d=u?Math.hypot(u.x-game.player.x,u.y-game.player.y):Infinity;
   if(r.played&&u?.alive&&d<800&&!u.teemoStealth&&r.rule.end&&(u.classicRealmId||0)===(game.player.classicRealmId||0))this.audio.play(r.hero,`Play_sfx_${r.hero}_${r.rule.end}`,{volume:.15*(1-d/800)});
  }
 }
}
