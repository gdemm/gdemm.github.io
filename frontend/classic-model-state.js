// Apply authored combat forms without altering authoritative hero identity.
export function classicModelState(record,u,time,animation){
 const hero=u.hero?.id,s=u.classic||{};
 if(hero==='Kaisa'){const evolved=!!s.evolved?.q;if(record.classicKaisaQ!==evolved){record.classicKaisaQ=evolved;record.model.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.name==='Kaisa_Q1_Mat')o.visible=!evolved;if(m.name==='Kaisa_Q2_Mat')o.visible=evolved;}});}}

 if(u.alive&&hero==='Kaisa'&&s.eChargeUntil>time&&['run','runfast'].includes(animation)&&record.actions.has('e-run'))return 'e-run';
 if(u.alive&&['Riven','Vayne'].includes(hero)&&s.rUntil>time){
  const base=animation==='runfast'?'run':animation,key=hero==='Vayne'&&base==='idle'?'r':'r-'+base;
  if(record.actions.has(key))return key;
 }
 if(hero!=='Aatrox')return animation;
 const ultimate=!!u.alive&&u.classic?.rUntil>time;
 if(record.classicUltimate!==ultimate){record.classicUltimate=ultimate;record.model.traverse(o=>{if(!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.some(m=>m.name==='Wings'))o.visible=ultimate;if(materials.some(m=>m.name==='Banner'))o.visible=false;});}
 const key='r-'+animation;return ultimate&&record.actions.has(key)?key:animation;
}
