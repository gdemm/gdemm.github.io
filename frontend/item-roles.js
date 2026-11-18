import {ITEM_ROLE_DATA} from './item-role-data.js';
export const ITEM_ROLES=['fighter','marksman','assassin','tank','mage','support'];
export function itemMatchesRole(item,role){if(!ITEM_ROLES.includes(role))return true;
 // Shared utility items remain available in every class; upgraded boots and
 // all components use their explicit native role list, not an attribute guess.
 if(item.id==='1001'||item.tier==='consumable')return true;
 return ITEM_ROLE_DATA.items[item.id]?.roles.includes(role)??false;
}
