import {paintMinimapButton} from './native-minimap-controls.js';
export function installCameraLock(container,{getLocked,setLocked}){
 const button=document.createElement('button');button.id='cameraLock';button.type='button';const paint=paintMinimapButton(button,'camera',getLocked);
 const sync=()=>{const locked=getLocked();button.setAttribute('aria-pressed',String(locked));button.setAttribute('aria-label',locked?'解锁视角（Y）':'锁定视角（Y）');button.title=locked?'点击解锁，自由拖拽视角（Y）':'点击锁定，持续跟随英雄（Y）';paint();};
 button.onclick=()=>{setLocked(!getLocked());sync();};container?.append(button);sync();return{button,sync};
}
