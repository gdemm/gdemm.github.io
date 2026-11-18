export function animationStep(record,dt,{visible,local=false,minion=false,changed=false}){
 if(!visible){record.animationDebt=0;record.wasOnscreen=false;return null;}
 const enter=record.wasOnscreen===false;record.wasOnscreen=true;
 record.animationDebt=Math.min(.25,(record.animationDebt||0)+Math.max(0,dt));
 const interval=local?0:minion?1/20:1/30;
 if(!changed&&!enter&&record.animationDebt+1e-8<interval)return null;
 const step=record.animationDebt;record.animationDebt=0;return step;
}
export function cosmeticLimit(heroCount){return heroCount>=18?260:heroCount>=10?340:480;}
export function cosmeticEmitter(e,host){const primitive=e.primitive?.__type||'';return !host.signal&&!host.relic&&!host.seedParticles&&!host.follow?.native&&!host.follow?.basic&&!e.isSingleParticle&&!/Beam|Ray|Trail/.test(primitive);}
