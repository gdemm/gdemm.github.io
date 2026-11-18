import {COMBAT_DATA} from './combat-data.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const spell=name=>COMBAT_DATA.Yasuo.spells[name]?.data||{};
const rank=u=>clamp(u.spellRanks?.[1]||1,1,5);
const value=(s,name,level=1,fallback=0)=>s.DataValues?.find(v=>v.name===name)?.values?.[level]??fallback;
export function yasuoBonusAttackSpeed(u){return Math.max(0,(u.itemAttackSpeed||0)+(u.augmentAttackSpeed||0)+(u.attackSpeedGrowth||0)*.01*Math.max(0,(u.level||1)-1));}
// The installed Q1 wrapper owns the 4s cooldown and explicitly carries
// Trait_NotBenefitFromHaste. Q2/Q3 are replacements, not independent charges.
// The attack-speed slope/floor are a gameplay reconstruction; the client BIN
// provides the base/tag, not its server-side f1 calculation.
export function yasuoQCooldown(u){const base=value(spell('YasuoQ1Wrapper'),'Cooldown',u.spellRanks?.[0]||1,4);return Math.max(base/3,base*(1-.58*yasuoBonusAttackSpeed(u)));}
export function yasuoQCastTime(u){return Math.max(.133,(spell('YasuoQ1').mCastTime||.35)*(1-.58*yasuoBonusAttackSpeed(u)));}
export function windwallSpec(u){
 const s=spell('YasuoW'),m=spell('YasuoWMovingWallMis').mMissileSpec?.movementComponent||{},targeter=s.mClientData?.mTargeterDefinitions?.find(t=>t.__type==='TargeterDefinitionWall'),r=rank(u);
 return{width:value(s,'Width',r,320),thickness:value(s,'Thickness',r,100),duration:value(s,'WallLife',r,4),travelRange:value(s,'TravelRange',r,450),previewOffset:targeter?.centerLocator?.distanceOffset??300,previewWidth:targeter?.length?.mPerLevelValues?.[r]??420,height:m.mOffsetInitialTargetHeight??100,initialSpeed:m.mInitialSpeed??850,minSpeed:m.mMinSpeed??10,acceleration:m.mAcceleration??-1200,nativeEffect:'Yasuo_Base_W_windwall'+r};
}
export function windwallTravel(w,age){
 const t=Math.max(0,age),a=w.acceleration,v=w.initialSpeed,min=w.minSpeed;
 if(a<0){const stop=Math.max(0,(min-v)/a),first=Math.min(t,stop);return Math.min(w.travelRange,Math.max(0,v*first+.5*a*first*first+min*Math.max(0,t-stop)));}
 return Math.min(w.travelRange,Math.max(0,v*t+.5*a*t*t));
}
export function updateWindwallZone(w){
 if(!w.origin||!w.motion)return;w.previousX=w.x;w.previousY=w.y;const d=windwallTravel(w.motion,w.age);w.x=w.origin.x+w.dir.x*d;w.y=w.origin.y+w.dir.y*d;
}
// Swept projectile vs oriented rectangle, including the wall's own motion.
// Returns the first contact, not a centre-line guess that misses end caps.
export function windwallContact(w,p,old){
 const ax=old.x-(w.previousX??w.x),ay=old.y-(w.previousY??w.y),bx=p.x-w.x,by=p.y-w.y,dx=w.dir.x,dy=w.dir.y;
 const a=[ax*dx+ay*dy,-ax*dy+ay*dx],b=[bx*dx+by*dy,-bx*dy+by*dx],half=[w.thickness*.5+(p.r||0),w.width*.5+(p.r||0)];let lo=0,hi=1;
 for(let i=0;i<2;i++){const step=b[i]-a[i];if(Math.abs(step)<1e-9){if(Math.abs(a[i])>half[i])return null;continue;}let t0=(-half[i]-a[i])/step,t1=(half[i]-a[i])/step;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return null;}
 return{x:old.x+(p.x-old.x)*lo,y:old.y+(p.y-old.y)*lo,t:lo};
}

// R is a one-press action. The server selects from its live airborne heroes;
// a cursor position or a second click is not required.
export const YASUO_R_RANGE=1400;
export function selectYasuoRTarget(game,caster,preferred=null){
 const range=YASUO_R_RANGE/(game.mapConfig?.scale||2),distance=u=>Math.hypot(u.x-caster.x,u.y-caster.y);
 const valid=u=>u?.kind==='hero'&&u.alive&&u.team!==caster.team&&u.airborne>0&&!(u.unstoppableUntil>game.time)&&game.canHit(u)&&distance(u)<=range+(u.radius||0);
 const explicit=preferred?.id!==undefined?game.units.find(u=>u.id===preferred.id):null;if(valid(explicit))return explicit;
 const ownQ=u=>u.airborneSourceId===caster.id&&u.airborneAbility==='q';
 return game.units.filter(valid).sort((a,b)=>Number(ownQ(b))-Number(ownQ(a))||distance(a)-distance(b)||a.id-b.id)[0]||null;
}
