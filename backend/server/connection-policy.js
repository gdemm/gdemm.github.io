export const PONG_TIMEOUT_MS=45_000;
export function messageBudget(now=Date.now()){
 let at=now,all=240,actions=80;
 return (type,time=Date.now())=>{
  const dt=Math.max(0,time-at)/1000;at=time;
  all=Math.min(240,all+dt*120)-1;actions=Math.min(80,actions+dt*40);
  if(all<0)return 'flood';
  if(['stateAck','stateResync','ping','hello'].includes(type))return 'allow';
  if(actions<1)return 'throttle';
  actions--;return 'allow';
 };
}
