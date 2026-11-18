import {CLASSIC_NATIVE} from './classic-data.js';
const roster=[
 ['Kaisa','虚空之女','卡莎','射手',['艾卡西亚暴雨','虚空索敌','极限超载','猎手本能']],
 ['Mordekaiser','铁铠冥魂','莫德凯撒','战士',['破灭之锤','不坏之身','断魂一扼','轮回绝境']],
 ['LeeSin','盲僧','李青','战士',['天音波／回音击','金钟罩／铁布衫','天雷破／摧筋断骨','猛龙摆尾']],
 ['Yone','封魔剑魂','永恩','战士',['错玉切','凛神斩','破障之锋','封尘绝念斩']],
 ['Vayne','暗夜猎手','薇恩','射手',['闪避突袭','圣银弩箭','恶魔审判','终极时刻']],
 ['Tristana','麦林炮手','崔丝塔娜','射手',['急速射击','火箭跳跃','爆炸火花','毁灭射击']],
 ['Galio','正义巨像','加里奥','坦克',['战争罡风','杜朗护盾','正义冲拳','英雄登场']],
 ['Ekko','时间刺客','艾克','刺客',['时间卷曲器','时光交错','相位俯冲','时空断裂']],
 ['Riven','放逐之刃','锐雯','战士',['折翼之舞','震魂怒吼','勇往直前','放逐之锋']],
 ['Irelia','刀锋舞者','艾瑞莉娅','战士',['利刃冲击','距破之舞','比翼双刃','先锋之刃']],
 ['Akali','离群之刺','阿卡丽','刺客',['我流奥义！寒影','我流奥义！霞阵','我流奥义！隼舞','我流秘奥义！表里杀缭乱']],
 ['Diana','皎月女神','黛安娜','战士',['新月打击','苍白之瀑','月神冲刺','月之降临']],
 ['Zed','影流之主','劫','刺客',['影奥义！诸刃','影奥义！分身','影奥义！鬼斩','禁奥义！瞬狱影杀阵']],
 ['XinZhao','德邦总管','赵信','战士',['三重爪击','风斩电刺','无畏冲锋','新月护卫']],
 ['JarvanIV','德玛西亚皇子','嘉文四世','战士',['巨龙撞击','黄金圣盾','德邦军旗','天崩地裂']],
 ['Aatrox','暗裔剑魔','亚托克斯','战士',['暗裔利刃','恶火束链','暗影冲决','大灭']],
 ['MonkeyKing','齐天大圣','孙悟空','战士',['粉碎打击','真假猴王','腾云突击','大闹天宫']],
];
export const CLASSIC_HEROES=roster.map(([id,name,title,role,skills])=>{
 const c=CLASSIC_NATIVE[id].character;
 return {id,name,title,role,nativeADGrowth:c.damagePerLevelModifiable?.baseValue||0,color:role==='射手'?'#cfaa72':role==='刺客'?'#a77dd6':'#c5917e',hp:c.baseHPModifiable.baseValue+2*(c.hpPerLevelModifiable?.baseValue||0),damage:c.baseDamageModifiable.baseValue+2*(c.damagePerLevelModifiable?.baseValue||0),range:c.attackRangeModifiable.baseValue/2,speed:c.baseMoveSpeedModifiable.baseValue/2,description:`${name} · 原生资源与服务端技能重建`,skills:skills.map(s=>[s,'',0,0,'Location'])};
});
export const CLASSIC_IDS=new Set(CLASSIC_HEROES.map(h=>h.id));
