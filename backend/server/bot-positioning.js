import {brushRegionAt} from '../dist/brush-regions.js';
import {nearbyCandidates} from './native-nearby.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),side=u=>u.team?-1:1;
export function preferredLane(u){const lane=(Math.abs(u.netPeerId||u.id||1)-1)%7;return (lane-3)*48;}
export function formationPoint(g,u,target,state,dangerAt){
 const reach=u.range+u.radius+(target.radius||0),ranged=(u.nativeRange||0)>=400,ideal=reach*(ranged?.82:.78),base=u.team?0:Math.PI;
 const lane=preferredLane(u),preferred=base+lane/200,points=[];
 if(state.formationTarget===target.id&&state.formationPoint)points.push(state.formationPoint);
 // An arc on both flanks, not one shared point behind the target.
 for(const angle of [preferred,base-1.25,base-.85,base-.45,base,base+.45,base+.85,base+1.25])points.push({x:target.x+Math.cos(angle)*ideal,y:target.y+Math.sin(angle)*ideal});
 let best=null,bestScore=Infinity;
 for(const raw of points){if(raw.x<70||raw.x>3130||Math.abs(raw.y)>360)continue;if(typeof g.navigation?.canWalk==='function'&&!g.navigation.canWalk(raw.x,raw.y))continue;const p=g.navigation?g.navigation.snap(raw.x,raw.y):raw;
  const d=distance(p,target);if(d>reach*.96||d<reach*.42||dangerAt(g,u,p))continue;
  const travel=distance(u,p);let blocked=false;for(let i=1;i<=4;i++){const q={x:u.x+(p.x-u.x)*i/4,y:u.y+(p.y-u.y)*i/4};if(typeof g.navigation?.canWalk==='function'&&!g.navigation.canWalk(q.x,q.y)){blocked=true;break;}}if(blocked)continue;
  let crowd=0;for(const ally of nearbyCandidates(g,p,300))if(ally!==u&&ally.alive&&ally.team===u.team&&ally.kind==='hero'){const gap=distance(p,ally);if(gap<90)crowd+=(90-gap)*3;if(gap<=300&&ally.dest){const planned=distance(p,ally.dest);if(planned<90)crowd+=(90-planned)*1.5;}}
  const brush=ranged&&g.mapConfig&&brushRegionAt(p.x,p.y)?24:0;
  const stable=state.formationPoint&&distance(state.formationPoint,p)<8?25:0;
  const score=travel*.25+Math.abs((p.y-target.y)-lane)*.15+crowd-brush-stable;
  if(score<bestScore){best=p;bestScore=score;}
 }
 if(best){state.formationTarget=target.id;state.formationPoint={x:best.x,y:best.y};}
 return best;
}
