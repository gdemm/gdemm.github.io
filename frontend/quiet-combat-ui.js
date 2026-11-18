import {AUGMENTS} from './augment-catalog.js';
const names=new Set([...AUGMENTS.map(a=>a.name),'重量级打击手','玻璃大炮','炼狱龙魂','连拨击锤','炼狱导管']);
export function isProgressNotice(text){return /^(?:等级提升|属性提升|属性增加)(?:\s|[·:：]|$)/.test(text||'')||/^(?:攻击力|法术强度|护甲|魔抗|攻击速度|移动速度|技能急速|暴击率)\s*[+＋:：·]/.test(text||'');}
export function isAugmentNotice(text){return typeof text==='string'&&(/^(?:海克斯(?:强化|符文|触发|效果|伤害)|获得(?:强化|海克斯)|选择了(?:强化|海克斯))/.test(text)||names.has(text.split(/\s*[·:：]\s*/)[0]));}
export const visibleCombatEvents=events=>(events||[]).filter(e=>!isAugmentNotice(e.text)&&!isProgressNotice(e.text));
export const visibleBanner=text=>isProgressNotice(text)||isAugmentNotice(text)?'':text;
