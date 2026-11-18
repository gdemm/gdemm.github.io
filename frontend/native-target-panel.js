import {TARGET_PANEL as N} from './target-panel-data.js';
import {targetPanelValues} from './target-panel-query.js';
const D=N.entries,el=(tag)=>document.createElement(tag);
export class NativeTargetPanel{
 constructor(){document.getElementById('targetInfo')?.remove();this.root=el('aside');this.root.id='nativeTargetPanel';this.root.hidden=true;this.root.setAttribute('aria-label','目标信息');Object.assign(this.root.style,{position:'fixed',left:'0px',top:'0px',width:'417px',height:'148px',zIndex:'8',transformOrigin:'0 0',pointerEvents:'none'});document.body.append(this.root);this.nodes={};this.game=null;this.built=false;}
 node(key,kind='img'){const d=D[key],n=el(kind),[x,y,w,h]=d.rect;Object.assign(n.style,{position:'absolute',left:x+'px',top:y+'px',width:w+'px',height:h+'px',zIndex:String(d.layer),boxSizing:'border-box'});n.dataset.nativeKey=key;
  if(kind==='img'){if(d.sprite)n.src=d.sprite;n.alt='';n.draggable=false;}
  else{const f=d.font;Object.assign(n.style,{display:'flex',alignItems:'center',justifyContent:d.align===1?'center':d.align===2?'flex-end':'flex-start',fontFamily:`"${f?.family||'LoL Title'}",sans-serif`,fontSize:(f?.size||12)+'px',color:f?.color||'#fff',lineHeight:'1',whiteSpace:'nowrap',textShadow:'1px 1px #000'});}
  this.root.append(n);this.nodes[key]=n;return n;
 }
 build(){if(this.built)return;this.built=true;
  for(const key of ['TargetBarFrame','TargetBarPortraitFrame','TargetHP_Backdrop','TargetPar_Backdrop','Target_CS_Icon','Target_KDA_Icon',...['AD','AP','Armor','MR','AS','AH','Crit','MS'].map(k=>'Target'+k+'_Icon'),...Array.from({length:7},(_,i)=>`TargetItem${i}_Backdrop`)])this.node(key);
  this.portrait=this.node('TargetPortrait');this.portrait.style.borderRadius='50%';this.hp=this.node('TargetHP_BarTextureRed');this.mp=this.node('TargetPar_BarTextureBlue');
  for(const key of ['TargetLevel','TargetHP_ValueText','TargetPar_ValueText','Target_CS_Text','Target_KDA_Text',...['AD','AP','Armor','MR','AS','AH','Crit','MS'].map(k=>'Target'+k+'_Text')])this.node(key,'span');
  this.items=Array.from({length:7},(_,i)=>{const icon=this.node(`TargetItem${i}_`);icon.style.zIndex='3';icon.style.padding='2px';const count=this.node(`TargetItem${i}_Count`,'span');count.style.zIndex='4';return{icon,count,id:null}});
 }
 clear(){this.root.hidden=true;this.root.removeAttribute('data-unit-id');}
 update(game,target,playing=true){this.game=game;const v=playing?targetPanelValues(game,target):null;if(!v){this.clear();return;}this.build();this.root.hidden=false;this.root.dataset.unitId=String(v.id);this.root.title=v.name;this.root.setAttribute('aria-label','目标信息：'+v.name);const touch=matchMedia('(pointer:coarse)').matches,scale=touch?Math.min(.46,(innerWidth-16)/417):Math.min(.78,(innerWidth-16)/417,Math.max(.35,(innerHeight-110)/148));this.root.style.transform=`scale(${scale})`;/* mobile: small and centred under the top bar so it never covers the minimap or skill buttons */this.root.style.left=touch?Math.round((innerWidth-417*scale)/2)+'px':'0px';this.root.style.top=touch?Math.round(Math.min(64,innerHeight*.14))+'px':'0px';
  const src=(node,url)=>{if(node.getAttribute('src')!==url){if(url)node.setAttribute('src',url);else node.removeAttribute('src');}node.hidden=!url;};src(this.portrait,v.portrait);
  const hp=D[v.ally?'TargetHP_BarTextureGreen':'TargetHP_BarTextureRed'];src(this.hp,hp.sprite);this.hp.style.clipPath=`inset(0 ${(1-v.hpRatio)*100}% 0 0)`;
  src(this.mp,v.resource?D['TargetPar_BarTexture'+v.resourceColor].sprite:null);this.mp.style.clipPath=`inset(0 ${(1-v.resourceRatio)*100}% 0 0)`;
  for(const[key,value]of Object.entries({TargetLevel:v.hero?v.level:'',TargetHP_ValueText:v.hp,TargetPar_ValueText:v.resource,Target_CS_Text:v.cs,Target_KDA_Text:v.kda,...Object.fromEntries(Object.entries(v.values).map(([k,value])=>['Target'+k+'_Text',value]))}))this.nodes[key].textContent=value;
  this.nodes.Target_CS_Icon.hidden=!v.hero;this.nodes.Target_KDA_Icon.hidden=!v.hero;
  for(let i=0;i<7;i++){const item=v.items[i],slot=this.items[i];src(slot.icon,item?.icon||null);slot.icon.title=item?.name||'';slot.count.textContent=item?.stack||'';}
 }
}
