import {EXPANSION_DESCRIPTIONS} from './expansion-item-descriptions.js';
import {STACK_ITEM_IDS} from './item-stacks.js';
import {ACTIVE_ITEMS} from './item-actives.js';
// Explicit runtime coverage: the historical tooltip is not a claim of support.
export const ITEM_SUPPORT={
 '3026':{implemented:['致命伤后4秒原地复活','50%基础生命值与全部法力','300秒共用冷却，出售重买不重置']},
 '1086':{implemented:['1.5%全能吸血']},'1120':{implemented:['普攻对小兵额外5物理伤害']},'3008':{implemented:['4%全能吸血','参与击杀每层0.6%，最多10层']},
 '2501':{implemented:['额外生命值转攻击力','损失生命值提高攻击力']},'2504':{implemented:['15秒未受魔法伤害获得15%最大生命魔法护盾']},'2502':{implemented:['对英雄战斗每4秒范围吸取','按有效伤害250%治疗']},
 '4403':{implemented:['全部基础属性','20技能急速','100%基础生命与法力回复','火力全开沿用本模式全局300技能急速，不重复附加']},
 '3031':{implemented:['暴击伤害','神话攻击力加成']},'3089':{implemented:['总法术强度提升40%']},'3135':{implemented:['40%法术穿透']},'3035':{implemented:['18%护甲穿透']},
 '3036':{implemented:['30%护甲穿透'],missing:['巨人杀手额外伤害']},'3033':{implemented:['30%护甲穿透'],missing:['重伤']},
 '3057':{implemented:['咒刃充能与额外伤害']},'3078':{implemented:['咒刃','神话属性加成'],},
 '3153':{implemented:['当前生命值攻击特效','三次命中虹吸','减速与加速']},
 '6655':{implemented:['回声伤害','附近目标溅射','加速','技能命中缩减回声冷却','神话法穿']},
 '6653':{implemented:['持续灼烧','额外生命值增伤','神话急速']},
 '3084':{implemented:['充能攻击','永久生命值','逐目标冷却','神话生命/体型加成']},
 '3157':{implemented:['主动凝滞2.5秒','主动独立冷却']},'2003':{implemented:['药水回复']}
};
export function itemSupport(item){if(EXPANSION_DESCRIPTIONS[item.id])return {status:'implemented',implemented:[EXPANSION_DESCRIPTIONS[item.id]],missing:[]};if(STACK_ITEM_IDS.has(item.id)||ACTIVE_ITEMS.has(item.id)){const base=ITEM_SUPPORT[item.id],implemented=[...(base?.implemented||['基础属性'])];if(STACK_ITEM_IDS.has(item.id))implemented.push('叠层／充能状态与对应属性、触发效果');if(ACTIVE_ITEMS.has(item.id))implemented.push('主动使用与冷却');return{status:'partial',implemented,missing:base?.missing||(['3157','2420','2003','2031'].includes(item.id)?[]:['其余未列出的独有被动以实际支持范围为准'])};}const original=ITEM_SUPPORT[item.id],row=original?{...original,implemented:[...(original.implemented||[])],missing:[...(original.missing||[])]}:null;if(row)return{...row,status:row.missing?.length?'partial':'implemented'};const desc=(item.description||'').replace(/\s/g,''),stats=(item.statText||'').replace(/\s/g,''),rest=stats&&desc.startsWith(stats)?desc.slice(stats.length):desc;const unsupportedStats=[...new Set((item.statText||'').match(/韧性|治疗和护盾强度|全能吸血/g)||[])];const special=!!rest.replace(/“[^”]*”/g,'')||!stats||unsupportedStats.length>0;return{status:special?'attributes':'stats-only',implemented:['基础属性'],missing:special?[...unsupportedStats,...(rest||!stats?['独有机制 / 触发特效']:[])]:[]};}
export function itemSupportText(item){const s=itemSupport(item);return(item.sourceVersion?'新增装备 '+item.sourceVersion+' · ':'13.24 神话目录 · ')+(s.status==='stats-only'?'基础属性已实现':`已实现：${s.implemented.join('、')}`)+(s.missing?.length?`\n未实现：${s.missing.join('、')}`:'')+(EXPANSION_DESCRIPTIONS[item.id]?'\n新增装备使用网页适配提示特效；回合型机制按说明调整。':'\n特效为安装包原素材的网页适配，不代表完整客户端着色器。');}
