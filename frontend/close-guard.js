// Best-effort only: browser-reserved shortcuts may never reach page JS.
// No beforeunload handler or confirmation dialog.
export function installCloseGuard(target){
 const key=e=>{if(e.ctrlKey&&String(e.key).toLowerCase()==='w')e.preventDefault();};
 target.addEventListener('keydown',key,{capture:true});
 return()=>target.removeEventListener('keydown',key,{capture:true});
}
