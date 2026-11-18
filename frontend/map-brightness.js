// Display-space map brightness; deliberately does not change HUD/champion rendering.
export function brightenMapMaterial(material){
 if(!material||material.userData.mapBrightness===1.45)return material;
 const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){compile?.call(this,shader,renderer);const marker='#include <premultiplied_alpha_fragment>';if(!shader.fragmentShader.includes(marker))throw new Error('Unsupported map brightness shader');shader.fragmentShader=shader.fragmentShader.replace(marker,'gl_FragColor.rgb *= 1.45;\n'+marker);};
 material.customProgramCacheKey=()=>key+'|map-brightness-1.45';material.userData.mapBrightness=1.45;material.needsUpdate=true;return material;
}
