// Manifest publication and six-way asset loading are not atomic. Never render an
// authored mesh as the fallback quad, or omit a mask while it is still loading.
export function particleAssetsReady(e,{textures,meshes,animatedMeshes}){
 for(const key of ['textureUrl','multUrl','erosionUrl','paletteUrl','nativePaletteUrl','distortionNormalUrl'])if(e[key]&&!textures.has(e[key]))return false;
 if(e.meshUrl&&!meshes.has(e.meshUrl))return false;
 if(e.skinnedMeshUrl&&!animatedMeshes.has(e.skinnedMeshUrl))return false;
 return true;
}
