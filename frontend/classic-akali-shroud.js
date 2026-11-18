// Last point on a swept missile segment that lies in the actual smoke annulus.
// The shroud's empty center must never become an anchor by a broad outer-circle test.
export function lastShroudIntersection(from,to,shroud){
 const dx=to.x-from.x,dy=to.y-from.y,ox=from.x-shroud.x,oy=from.y-shroud.y,a=dx*dx+dy*dy;
 const outer=Math.max(0,shroud.r),inner=Math.max(0,Math.min(outer,shroud.inner||0)),eps=1e-8;
 const at=t=>({x:from.x+t*dx,y:from.y+t*dy,t});
 const contains=t=>{const x=ox+t*dx,y=oy+t*dy,d=x*x+y*y;return d<=outer*outer+eps&&d>=inner*inner-eps;};
 if(a<eps)return contains(0)?at(0):null;
 const cuts=[0,1],b=2*(ox*dx+oy*dy);
 for(const radius of [inner,outer]){const c=ox*ox+oy*oy-radius*radius,disc=b*b-4*a*c;if(disc< -eps)continue;const root=Math.sqrt(Math.max(0,disc));for(const t of [(-b-root)/(2*a),(-b+root)/(2*a)])if(t>=0&&t<=1)cuts.push(t);}
 cuts.sort((a,b)=>b-a);
 for(const t of cuts)if(contains(t))return at(t);
 return null;
}
