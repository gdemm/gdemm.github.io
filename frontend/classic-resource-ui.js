import {karthusResource} from './karthus-ui.js';
export function classicResource(u){const karthus=karthusResource(u);if(karthus)return karthus;return u.classicEnergy?{name:'能量',value:Math.max(0,u.mp||0),max:Math.max(1,u.maxMp||200)}:null;}
export function classicCostLabel(u,cost){return u.noMana?'无消耗':(u.classicEnergy?'能量 ':'法力 ')+cost;}
