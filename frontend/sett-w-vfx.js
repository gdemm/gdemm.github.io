// Native Sett W erosion textures already shipped in assets/vfx/sources.json.
// Old packaging kept alphaErosionDefinition but omitted its texture URL.
const masks={
 'assets/characters/sett/skins/base/particles/sett_base_vertical_erode_a.tex':'assets/vfx/e247a44ee7b31fc8.png',
 'assets/characters/sett/skins/base/particles/sett_base_vertical_mask_wispy_erode.tex':'assets/vfx/0fea5d8368382af5.png',
 'assets/characters/sett/skins/base/particles/sett_base_vertical_mask_leading_edge_flip.tex':'assets/vfx/a0c2eba6217f90c3.png',
};
export function linkSettWMasks(data){for(const name of ['Sett_Base_W_Min_AoE','Sett_Base_W_Max_AoE'])for(const e of data.effects?.[name]?.emitters||[]){const path=e.alphaErosionDefinition?.erosionMapName?.toLowerCase();if(path&&masks[path]&&!e.erosionUrl)e.erosionUrl=masks[path];}return data;}
export const isSettWScorch=p=>/^Sett_Base_W_(Min|Max)_AoE$/.test(p.instance.name)&&p.e.emitterName==='Scorch1';
// Closed-form viscous drag: deterministic under arbitrary rendering frame rate.
// In particular v=300, drag=15 moves at most 20 native units, not 600 in 2s.
export function dragDisplacement(velocity,drag,time){return velocity.map((v,i)=>{const d=Math.max(0,drag[i]||0);return d>1e-6?v*(-Math.expm1(-d*time))/d:v*time;});}
