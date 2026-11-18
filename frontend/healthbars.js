import {magicShieldAmount,visibleShieldAmount} from './classic-shield-ui.js';
import {healthbarTicks} from './healthbar-ticks.js';
import {unitRelation,unitColor} from './team-colors.js';
import {championResource as legacyChampionResource} from './extra-champions.js';
import {classicResource} from './classic-resource-ui.js';
const championResource=u=>classicResource(u)||legacyChampionResource(u);
export function healthbarName(u){const nickname=typeof u.playerName==='string'?u.playerName.trim():'';return Number.isInteger(u.netPeerId)&&u.netPeerId>0&&nickname?nickname:(u.hero?.title||u.hero?.name||'');}
// Slot geometry measured from the atlas sprites (frame-self 137x33, frame-neutral 137x29), so fills sit inside the frame.
const SELF_SLOT={frameY:0,frameH:33,x:26,w:107,hpY:7,hpH:12,mpY:21,mpH:5,levelY:14};
const NEUTRAL_SLOT={frameY:2,frameH:29,x:26,w:107,hpY:7,hpH:13,mpY:21,mpH:5,levelY:16};
// LoL draws the 137px bar at 1080p screen height; keep that share of screen height, with a floor so phones stay legible.
export function healthbarScale(ctx,small=false){const c=ctx.canvas,h=Math.min(c?.clientHeight||c?.height||1080,c?.clientWidth||c?.width||1920);return Math.max(small?.5:.55,Math.min(1,h/1080*1.25));}
// Original floating-health-bar sprites from spotlighthealthbaratlas.tex.
export class NativeHealthbars {
 constructor(){this.images={};this.history=new WeakMap();for(const name of ['frame-neutral','frame-self','fill-self','fill-enemy','fill-ally','fill-mana','fill-shield','stun']){const im=new Image();im.src=`assets/healthbars/${name}.png`;this.images[name]=im;}}
 image(ctx,name,x,y,w,h){const im=this.images[name];if(im?.complete&&im.naturalWidth){ctx.drawImage(im,x,y,w,h);return true;}return false;}
 draw(ctx,u,anchor,time,small=false,viewer=null){const relation=unitRelation(u,viewer),self=relation==='self';const s=healthbarScale(ctx,small),w=137*s,h=33*s,x=Math.round(anchor.x-w/2),y=Math.round(anchor.y-h),slot=self?SELF_SLOT:NEUTRAL_SLOT,innerX=x+slot.x*s,innerY=y+slot.hpY*s,innerW=slot.w*s,hpH=slot.hpH*s,mpY=y+slot.mpY*s,mpH=slot.mpH*s;
  let old=this.history.get(u);if(!old){old={hp:u.hp,trail:u.hp,changed:time};this.history.set(u,old);}if(u.hp<old.hp){old.trail=Math.max(old.trail,old.hp);old.changed=time;}if(u.hp>old.hp)old.trail=u.hp;old.hp=u.hp;if(time-old.changed>.25)old.trail=Math.max(u.hp,old.trail-u.maxHp*.025);const magicAmount=magicShieldAmount(u,time),capacity=Math.max(u.maxHp,u.hp+visibleShieldAmount(u,time));const hp=Math.max(0,Math.min(1,u.hp/capacity)),shield=Math.max(0,Math.min(1-hp,(u.shield||0)/capacity));
  ctx.save();ctx.imageSmoothingEnabled=true;if(!this.image(ctx,self?'frame-self':'frame-neutral',x,y+slot.frameY*s,w,slot.frameH*s)){ctx.fillStyle='#03090a';ctx.fillRect(innerX,innerY,innerW,mpY+mpH-innerY);}
  if(old.trail>u.hp){ctx.fillStyle='#b8653c';ctx.fillRect(innerX,innerY,innerW*Math.min(1,old.trail/capacity),hpH);}
  const fill='fill-'+relation;if(!this.image(ctx,fill,innerX,innerY,innerW*hp,hpH)){ctx.fillStyle=unitColor(u,viewer);ctx.fillRect(innerX,innerY,innerW*hp,hpH);}
  if(shield){ctx.fillStyle='#ffffff';ctx.fillRect(innerX+innerW*hp,innerY,innerW*shield,hpH);}const magic=Math.max(0,Math.min(1-hp-shield,magicAmount/capacity));if(magic){ctx.fillStyle='#ffffff';ctx.fillRect(innerX+innerW*(hp+shield),innerY,innerW*magic,hpH);}
  // Every thin division denotes 100 maximum HP; thicker lines denote 1000.
  for(const tick of healthbarTicks(capacity,innerW)){ctx.fillStyle=tick.strong?'#041013ef':'#092218bd';ctx.fillRect(Math.round(innerX+tick.x),innerY,tick.strong?2:1,tick.strong?hpH:hpH*.58);}
  const resource=championResource(u);if(resource||u.maxMp>0)this.image(ctx,'fill-mana',innerX,mpY,innerW*Math.max(0,Math.min(1,resource?resource.value/resource.max:u.mp/u.maxMp)),mpH);
  ctx.font=`${Math.max(7,Math.round(12*s))}px Spiegel, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f1eddb';ctx.shadowColor='#000';ctx.shadowBlur=2;ctx.fillText(String(u.level),x+13*s,y+slot.levelY*s);
  const nameSize=Math.max(9,Math.round(13*s));drawHealthbarName(ctx,healthbarName(u),anchor.x,y+slot.frameY*s-3,self,nameSize);
  if(u.stun>0){const ny=y+slot.frameY*s-3-nameSize;this.image(ctx,'stun',anchor.x-7,ny-16,14,14);ctx.font='10px "LoL CN"';ctx.fillStyle='#d5baf5';ctx.fillText('眩晕',anchor.x+21,ny-9);}
  ctx.restore();return {x,y,width:w,height:h};
 }
}

// UI.wad.client ux/fonts: HealthBar(Self)Title -> SpiegelBold -> zh_cn FZDHTK.TTF.
// Existing LoL Title assets match all 21,993 original glyph outlines and metrics.
export function drawHealthbarName(ctx,name,x,y,self=true,size=12){
 ctx.save();ctx.font=`${size}px "LoL Title", sans-serif`;ctx.textAlign='center';ctx.textBaseline='alphabetic';
 ctx.shadowColor='#000000';ctx.shadowBlur=0;ctx.shadowOffsetX=2;ctx.shadowOffsetY=2;
 ctx.fillStyle=self?'#ffffff':'#b9b9b9';ctx.fillText(name,x,y);ctx.restore();
}
