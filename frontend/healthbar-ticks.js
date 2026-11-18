// At high HP many 100-point dividers land on the same physical pixel.
// Draw at most one per column; preserve a strong 1000-point divider if any
// of the collapsed ticks in that column is strong.
export function healthbarTicks(capacity,width){
 if(!Number.isFinite(capacity)||!Number.isFinite(width)||capacity<=100||width<=0)return [];
 const count=Math.ceil(capacity/100)-1;
 if(count<=width){return Array.from({length:count},(_,i)=>({x:(i+1)*100/capacity*width,strong:(i+1)%10===0}));}
 const result=[];
 for(let pixel=0;pixel<=Math.ceil(width);pixel++){
  const first=Math.max(1,Math.ceil((pixel-.5)*capacity/(width*100))),last=Math.min(count,Math.ceil((pixel+.5)*capacity/(width*100))-1);
  if(first<=last)result.push({x:pixel,strong:Math.ceil(first/10)*10<=last});
 }
 return result;
}
