import * as THREE from 'three';
// Independent stencil bits preserve the native arena and Aatrox W mask groups.
export function configureClassicStencil(material,emitter,effectName){
 const bit=effectName==='Mordekaiser_Base_R_Arena'&&emitter.StencilReferenceId==='{4baf2874}'?1:/^Aatrox_Base_W_Core(?:_Area)?$/.test(effectName)&&emitter.stencilRef===2?2:0;
 if(!bit)return;
 if(![1,2].includes(emitter.stencilMode))return;
 material.stencilWrite=true;material.stencilRef=bit;material.stencilFuncMask=bit;material.stencilWriteMask=emitter.stencilMode===1?bit:0;
 material.stencilFail=THREE.KeepStencilOp;material.stencilZFail=THREE.KeepStencilOp;
 if(emitter.stencilMode===1){material.colorWrite=false;material.depthWrite=false;material.stencilFunc=THREE.AlwaysStencilFunc;material.stencilZPass=THREE.ReplaceStencilOp;}
 else{material.stencilFunc=THREE.EqualStencilFunc;material.stencilZPass=THREE.KeepStencilOp;}
}
