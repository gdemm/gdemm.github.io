export const IDLE_AFTER_MS = 120_000;
export const IDLE_CHOICE_MS = 300_000;
const actions=new Set(['cannonEnter','cannonLaunch','cannonCancel','hexgate','move','attackMove','attack','stop','cast','buy','sell','undo','useItem','upgrade','augment','augmentReroll','mapPing','mastery','chat','enter','start','idleJoin','battleReady']);
export function notePlayerActivity(peer,message,now=Date.now()) {
 if(actions.has(message.type)){peer.lastInputAt=now;peer.idlePromptAt=0;}
}
