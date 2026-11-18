export const SUMMONER_NAME_KEY='howling-abyss-online-name-v1';
export function initialSummonerName(storage,random=Math.random){
 try{const saved=storage?.getItem(SUMMONER_NAME_KEY);if(typeof saved==='string'&&saved.trim())return saved;}catch{}
 const name='召唤师'+(1000+Math.floor(random()*9000));
 try{storage?.setItem(SUMMONER_NAME_KEY,name);}catch{}
 return name;
}
