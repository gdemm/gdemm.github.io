export function unpackVfx(buffer){
 if(buffer.byteLength<4)throw Error('Truncated VFX pack');const size=new DataView(buffer).getUint32(0,true),start=4+size;
 if(size>16*1024*1024||start>buffer.byteLength)throw Error('Invalid VFX pack header');
 const header=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,size)));if(header.version!==1||!header.files)throw Error('Unknown VFX pack');
 const files=new Map();for(const [name,range]of Object.entries(header.files)){const [offset,length]=range;if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<=0||start+offset+length>buffer.byteLength)throw Error('Invalid VFX asset range');files.set(name,new Uint8Array(buffer,start+offset,length));}return files;
}
export class VfxAssetPacks{
 constructor(){this.paths=new Map();this.pending=new Map();this.loaded=new Map();}
 register(manifest){for(const [asset,pack]of Object.entries(manifest.assetPacks||{}))this.paths.set(asset,pack);}
 async acquire(asset,fallback){
  const path=this.paths.get(asset);if(!path)return{url:fallback,release(){}};
  if(!this.pending.has(path)){const task=fetch(path).then(async r=>{if(!r.ok)throw Error('特效资源包下载失败：'+r.status);const files=unpackVfx(await r.arrayBuffer());this.loaded.set(path,files);return files;}).catch(e=>{this.pending.delete(path);throw e;});this.pending.set(path,task);}
  const files=await this.pending.get(path),bytes=files.get(asset);if(!bytes)throw Error('特效资源包缺少文件：'+asset);
  const type=asset.endsWith('.png')?'image/png':asset.endsWith('.glb')?'model/gltf-binary':'application/json';const url=URL.createObjectURL(new Blob([bytes],{type}));return{url,release(){URL.revokeObjectURL(url);}};
 }
 releaseConsumed(loadedUrls){for(const [path,files]of this.loaded)if([...files.keys()].every(key=>loadedUrls.has(key))){this.loaded.delete(path);this.pending.delete(path);}}
}
