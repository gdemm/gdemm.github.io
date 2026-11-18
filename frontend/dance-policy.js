// Emote names only: do not match gameplay names such as DefiantDance/TapDancer.
export const isDanceAction=name=>typeof name==='string'&&/(?:^|[_ -])dance(?:\d+[a-z]?)?(?:$|[_ -])/i.test(name);
export function withoutDance(manifest){
 for(const name of Object.keys(manifest.effects||{}))if(isDanceAction(name))delete manifest.effects[name];
 for(const name of Object.keys(manifest.events||{}))if(isDanceAction(name))delete manifest.events[name];
 return manifest;
}
