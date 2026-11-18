import {classicVisualMarks} from '../dist/classic-snapshot-marks.js';
import {signalsFor} from '../dist/signals.js';
const OMIT = new Set([
  'navigation',
  'mapConfig',
  'random',
  'damageTakenTotal',
  'privateNotice',
]);

// Minions and structures do not execute the game engine in the browser. Keep
// only presentation/targeting state instead of serializing their authoritative
// AI, combat and augment bookkeeping on every frame.
const LIGHT_UNIT_FIELDS = new Set([
  'id','kind','team','x','y','worldY','hp','maxHp','alive','shield','slow','stun','hit',
  'animation','animationSerial','animUntil','facing','speed','period','radius','caster',
  'airborne','root','silence','charm','asheFrost','stage','order','label','model',
  'nativeTransform','destroyedAt','fountain',
]);

const PRIVATE_SPELL_FIELDS=new Set(['casts','timers','pendingDashes']);
const SERVER_ONLY_UNIT_FIELDS=new Set(['aiSkill','farmOnly','smartBot','smartAllowAttack','lastHit','lastHitTime','playerHitTime']);
function encodeUnit(value, refs) {
  // Filter BEFORE descending: the previous implementation encoded every minion
  // AI/bookkeeping tree and every bot item stack, only to delete it afterwards.
  const out={},stack=new Set([value]),hero=value.kind==='hero'||value.classicClone;
  for(const key of Object.keys(value)){
    if(OMIT.has(key)||SERVER_ONLY_UNIT_FIELDS.has(key)||(!hero&&!LIGHT_UNIT_FIELDS.has(key))||(hero&&value.netPeerId<0&&key==='itemStacksState'))continue;
    const encoded=encodeValue(value[key],refs,stack,1,false,key==='spellAugments'?PRIVATE_SPELL_FIELDS:null);
    if(encoded!==undefined)out[key]=encoded;
  }
  return hero?out:{...out,...encodeValue(classicVisualMarks(value),refs,new Set(),0,true)};
}
const wireRefs=new WeakMap();
function wireRef(value,kind){let ref=wireRefs.get(value);if(!ref||ref[kind]!==value.id){ref={[kind]:value.id};wireRefs.set(value,ref);}return ref;}

function encodeValue(value, refs, stack, depth = 0, root = false, skipKeys=null) {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return typeof value==='number'?(Number.isFinite(value)?Math.round(value*1000)/1000:0):value;
  }
  if (typeof value === 'function' || depth > 6) return undefined;
  if (!root && refs.units.has(value)) return wireRef(value,'$unit');
  if (!root && refs.projectiles.has(value)) return wireRef(value,'$projectile');
  if (!root && refs.zones.has(value)) return wireRef(value,'$zone');
  if (value?.id && refs.heroes.has(value)) return wireRef(value,'$hero');
  if (value instanceof Set) return { $set: [...value].map((item) => encodeValue(item, refs, stack, depth + 1)) };
  if (Array.isArray(value)) return value.map((item) => encodeValue(item, refs, stack, depth + 1));
  if (typeof value !== 'object' || stack.has(value)) return undefined;
  stack.add(value);
  const result = {};
  for (const key of Object.keys(value)) {
    const item=value[key];
    if (OMIT.has(key)||skipKeys?.has(key)) continue;
    const encoded = encodeValue(item, refs, stack, depth + 1);
    if (encoded !== undefined) result[key] = encoded;
  }
  stack.delete(value);
  return result;
}

export function gameSnapshot(game, local) {
  const refs = {
    units: new Map(game.units.map((unit) => [unit, unit.id])),
    projectiles: new Map(game.projectiles.map((projectile) => [projectile, projectile.id])),
    zones: new Map((game.zones ?? []).map((zone) => [zone, zone.id])),
    heroes: new Set(game.units.map((unit) => unit.hero).filter(Boolean)),
  };
  const encode = (value) => encodeValue(value, refs, new Set(), 0, true);
  return {
    signals: signalsFor(game,game.units.find(u=>u.id===local?.unitId)),
    time: game.time,
    score: [...game.score],
    wave: game.wave,
    nextWave: game.nextWave,
    winner: game.winner,
    ...playerAnnouncement(game,game.units.find(u=>u.id===local?.unitId)),
    units: game.units.map((unit) => encodeUnit(unit, refs)),
    projectiles: game.projectiles.map(encode),
    combatEvents: (game.combatEvents ?? []).filter(event=>event.time>=game.time-1).slice(-96).map(encode),
    zones: (game.zones ?? []).map(encode),
    cannonFlights: (game.cannonFlights ?? []).slice(-50).map(encode),
    cannonLandings: (game.cannonLandings ?? []).slice(-50).map(encode),
    crueltyComets: (game.crueltyComets ?? []).map(encode),
    augmentZones: (game.augmentZones ?? []).map(encode),
    effects: (game.effects ?? []).slice(-96).map(encode),
    floaters: playerFloaters(game,local?.unitId).map(encode),
    killEvents: (game.killEvents ?? []).slice(-24).map(encode),
    events: (game.events ?? []).slice(-8).map(encode),
    relics: (game.relics ?? []).map(encode),
    local,
  };
}

// Filter before applying the per-player cap, so somebody else's AOE spam
// cannot evict the local player's damage numbers. Numeric IDs survive deaths.
export function playerFloaters(game, unitId) {
  if(unitId==null)return [];
  return (game.floaters??[])
    .filter(f=>(f.sourceUnitId===unitId||f.targetUnitId===unitId)&&f.text!==0&&f.text!=='0')
    .slice(-48)
    .map(f=>({...f,incoming:f.targetUnitId===unitId&&f.sourceUnitId!==unitId}));
}

export function playerAnnouncement(game,unit){
 const notice=unit?.privateNotice;
 if(game.winner==null&&notice?.until>game.time)return{announce:notice.text,announceUntil:notice.until};
 return{announce:game.announce,announceUntil:game.announceUntil};
}
