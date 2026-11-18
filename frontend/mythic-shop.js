import {ShopImageLoader,deferShopImage} from './shop-image-loader.js';
import {itemMatchesRole} from './item-roles.js';
import {itemSupportText} from './item-support.js';
import {SHOP_ITEMS} from './shop-catalog.js?v=shop-icons-heartsteel-1';
import {itemById} from './client-shop-query.js';
import {NATIVE_SHOP} from './native-shop-data.js';
import {RECOMMENDED} from './shop-recommendations.js?v=shop-icons-heartsteel-1';
export {RECOMMENDED};
import {autoBuild} from './auto-build.js';
import {BUILD_SOURCE} from './shop-recommendations.js?v=shop-icons-heartsteel-1';
export const recommendedForHero=hero=>RECOMMENDED[hero]||RECOMMENDED.Ashe;
const D=NATIVE_SHOP.entries,H=NATIVE_SHOP.hud,O=NATIVE_SHOP.origin;
const GROUPS=[['starter','初始装备'],['basic','基础装备'],['epic','史诗装备'],['legendary','传说装备'],['mythic','神话装备'],['boots','鞋子'],['consumable','消耗品']];
const TIER=Object.fromEntries(GROUPS);
const ROLE_DEFS=[['all','所有物品','ShowAll'],['popular','推荐物品','Popular'],['fighter','战士','Attack'],['marksman','射手','Marksman'],['assassin','刺客','Assassin'],['mage','法师','Magical'],['tank','坦克','Defense'],['support','辅助','Utility']];
const STATS={PhysicalDmg:['Damage','攻击力'],CritStrike:['CriticalStrike','暴击几率'],AttackSpeed:['AttackSpeed','攻击速度'],OnHit:['OnHit','攻击特效'],ArmorPenetration:['ArmorPenetration','护甲穿透'],AbilityPower:['SpellDamage','法术强度'],AbilityHaste:['CooldownReduction','技能急速'],MagicPenetration:['MagicPenetration','法术穿透'],Health:['Health','生命值'],Armor:['Armor','护甲'],MagicResist:['SpellBlock','魔法抗性'],Vamp:['LifeSteal','生命偷取'],Mana:['Mana','法力值'],Movespeed:['Boots','移动速度']};
const el=(tag,cls='',text)=>{const e=document.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const rect=id=>D[id]?.rect;
const at=(e,r,origin=O)=>{Object.assign(e.style,{position:'absolute',left:(r[0]-origin[0])+'px',top:(r[1]-origin[1])+'px',width:r[2]+'px',height:r[3]+'px'});return e;};
const layer=(cls,r=[...O,...NATIVE_SHOP.size],origin=O)=>at(el('div',cls),r,origin);
function sprite(id,origin=O,cls=''){const d=D[id];if(!d?.sprite||!d.rect)return null;const e=at(el('img','ns-sprite '+cls),d.rect,origin);deferShopImage(e,d.sprite);e.alt='';e.draggable=false;e.dataset.source=id;return e;}
function textAt(id,value,origin=O,cls=''){const d=D[id],e=at(el('span','ns-text '+cls,value),d.rect,origin);e.dataset.source=id;const f=d.font;if(f)Object.assign(e.style,{fontFamily:'"'+f.family+'"',fontSize:f.size+'px',color:f.color});e.style.textAlign=d.TextAlignmentHorizontal===1?'center':d.TextAlignmentHorizontal===2?'right':'left';return e;}
function add(parent,...children){for(const c of children)if(c)parent.append(c);return parent;}
function button(id,label,action,origin=O,dx=0,dy=0){
 const def=D[id],r=rect(def.HitRegionElement),b=at(el('button','ns-button'),[r[0]+dx,r[1]+dy,r[2],r[3]],origin);
 b.type='button';b.setAttribute('aria-label',label);b.dataset.source=id;b.title=label;b._selected=false;
 let hover=false,down=false,last='';
 b.paint=()=>{const state=b.disabled?'Inactive':b._selected?(hover?(down?'SelectedClicked':'SelectedHover'):'Selected'):(hover?(down?'Clicked':'Hover'):'Default');const key=state+label;if(key===last)return;last=key;b.replaceChildren();const s=def[state+'StateElements']||def.DefaultStateElements;for(const ref of s?.DisplayElementList||[])add(b,sprite(ref,r));if(s?.TextElement)add(b,textAt(s.TextElement,label,r));b.classList.toggle('is-selected',b._selected);};
 b.setSelected=v=>{b._selected=v;b.paint();};b.setDisabled=v=>{b.disabled=v;b.paint();};
 b.onmouseenter=()=>{hover=true;b.paint();};b.onmouseleave=()=>{hover=false;down=false;b.paint();};b.onpointerdown=()=>{down=true;b.paint();};b.onpointerup=()=>{down=false;b.paint();};b.onclick=action;b.paint();return b;
}
export class MythicShop{
 constructor(getGame,onChange,onSound=()=>{}){Object.assign(this,{getGame,onChange,onSound,dialog:document.getElementById('shopDialog'),tab:'recommended',role:'all',stats:new Set(),query:'',affordable:false,selected:'6655',selectedSlot:null,hero:null,invert:false,pins:{}});this.build();}
 build(){
  this.dialog.className='native-shop';this.dialog.setAttribute('aria-label','物品商店');this.dialog.replaceChildren();this.images=new ShopImageLoader(this.dialog);
  this.stage=el('div','ns-stage');this.dialog.append(this.stage);
  const bg=layer('ns-background');this.stage.append(bg);
  for(const [id,d]of Object.entries(D).filter(([,d])=>d.name.startsWith('ItemShop/Backdrop/')&&d.sprite).sort((a,b)=>(a[1].Layer||0)-(b[1].Layer||0)))add(bg,sprite(id));
  this.tabs=[];
  ['推荐','所有物品','配装方案'].forEach((title,i)=>{const tab=['recommended','all','sets'][i],b=button(H.TabButtonDefinition,title,()=>{this.tab=tab;this.hideTooltip();this.renderList();},O,215*i);b.dataset.tab=tab;b.setAttribute('role','tab');this.tabs.push(b);this.stage.append(b);});
  add(this.stage,button(H.CloseButtonDefinition,'关闭商店',()=>this.dialog.close()));
  for(const id of ['{07f50632}','{77746d75}','{e058635d}','{efbf1ac8}'])add(this.stage,sprite(id));
  this.search=at(el('input','ns-search'),rect(H.SearchInputEdit));this.search.type='search';this.search.placeholder='点击此处搜索';this.search.setAttribute('aria-label','搜索物品');
  this.search.oninput=()=>{this.query=this.search.value;this.renderSearch();};this.search.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.query='';this.search.value='';this.renderSearch();}if(e.key==='Enter'&&this.searchItem){this.choose(this.searchItem);this.query='';this.search.value='';this.renderSearch();}};this.stage.append(this.search);
  this.filters=layer('ns-filters');this.stage.append(this.filters);this.roleButtons=[];
  for(const[id,label,prefix]of ROLE_DEFS){const b=button(H[prefix+'ItemsFilterButtonDefinition'],label,()=>{this.role=id;this.renderList();});b.dataset.role=id;this.roleButtons.push(b);this.filters.append(b);}
  this.statButtons=[];
  for(const [id,d]of Object.entries(D)){
   const key=d.name.split('/').pop().replace(/Btn$/,'');if(!d.name.includes('/statfilters/')||d.type!=='UiElementGroupButtonData'||!STATS[key])continue;
   const[tag,label]=STATS[key],b=button(id,label,()=>{this.stats.has(tag)?this.stats.delete(tag):this.stats.add(tag);this.renderList();});b.dataset.stat=tag;this.statButtons.push(b);this.filters.append(b);
  }
  add(this.filters,button('{e3cccc4b}','清除属性筛选',()=>{this.stats.clear();this.role='all';this.affordable=false;this.affordableInput.checked=false;this.renderList();}),button(H.InvertGroupDisplayOrderButtonDefinition,'颠倒装备分组顺序',()=>{this.invert=!this.invert;this.renderList();}));
  const affordable=at(el('label','ns-affordable'),[714,305,159,26]);this.affordableInput=el('input');this.affordableInput.type='checkbox';this.affordableInput.onchange=()=>{this.affordable=this.affordableInput.checked;this.renderList();};affordable.append(this.affordableInput,el('span','','可购买物品'));this.filters.append(affordable);
  this.results=layer('ns-results');this.stage.append(this.results);
  this.details=layer('ns-details');this.stage.append(this.details);
  this.buyButton=button(H.PurchaseButtonDefinition,'购买',()=>this.buy());this.buyButton.classList.add('ns-buy');
  this.sellButton=button(H.SellButtonDefinition,'出售',()=>this.sell(this.selectedSlot));
  this.undoButton=button(H.UndoButtonDefinition,'撤销',()=>{if(this.getGame().undoPurchase()){this.selectedSlot=null;this.message('已撤销上一次交易');this.refresh();this.onChange();}});
  add(this.stage,this.buyButton,this.sellButton,this.undoButton,sprite(H.PlayerGoldIcon));
  this.gold=textAt(H.PlayerGoldText,'0');this.gold.id='shopGold';this.stage.append(this.gold);
  this.reason=at(el('span','ns-reason'),[658,904,244,28]);this.reason.setAttribute('aria-live','polite');this.stage.append(this.reason);
  this.docks=layer('ns-docks');this.stage.append(this.docks);this.buildDocks();
  this.live=at(el('span','ns-live'),[287,936,616,16]);this.live.setAttribute('aria-live','polite');this.stage.append(this.live);
  this.searchPane=layer('ns-search-pane');this.searchPane.hidden=true;this.stage.append(this.searchPane);
  this.tooltip=el('div','ns-tooltip');this.tooltip.hidden=true;this.tooltip.setAttribute('role','tooltip');this.stage.append(this.tooltip);
  this.dialog.addEventListener('close',()=>{this.getGame().shopHistory=[];this.hideTooltip();});
  this.resize=()=>{this.scale=Math.min(1.1,(innerWidth-24)/NATIVE_SHOP.size[0],(innerHeight-32)/NATIVE_SHOP.size[1]);this.dialog.style.width=NATIVE_SHOP.size[0]*this.scale+'px';this.dialog.style.height=NATIVE_SHOP.size[1]*this.scale+'px';this.stage.style.transform='scale('+this.scale+')';};
  addEventListener('resize',this.resize);this.resize();
 }
 open(){const hero=this.getGame().player.hero.id;if(this.hero!==hero){this.hero=hero;this.tab='recommended';this.role='all';this.query='';this.stats.clear();this.search.value='';this.selected=recommendedForHero(hero).mythic[0];}this.selectedSlot=null;this.live.textContent='';this.refresh();this.resize();this.dialog.showModal();this.images.flush();}
 message(value){this.live.textContent=value;}
 choose(id,fromInventory=false){this.onSound?.('shop-select');this.selected=id;if(!fromInventory)this.selectedSlot=null;this.renderDetails();this.renderInventory();this.updateSelection();}
 updateSelection(){this.stage.querySelectorAll('[data-item]').forEach(b=>b.classList.toggle('is-selected',b.dataset.item===this.selected));}
 buy(){this.syncPurchase();if(this.pendingSale||this.pendingPurchase){this.message('请等待交易确认');return false;}const g=this.getGame(),q=g.quoteItem(this.selected);if(!q.ok){this.message(q.reason);return false;}const id=this.selected;this.pendingPurchase={game:g,id,count:this.itemQuantity(g,id),at:performance.now(),name:q.item.name,cost:q.cost,sound:q.discount?'shop-buy-upgrade':['basic','epic','starter','boots','consumable'].includes(q.item.tier)?'shop-buy-components':'shop-buy-basic'};if(!g.buy(id)){this.pendingPurchase=null;this.message('购买未发送，请检查连接');return false;}this.selectedSlot=null;this.message('正在确认购买 '+q.item.name);this.syncPurchase();this.refresh();this.onChange();return true;}
 syncPurchase(){const p=this.pendingPurchase;if(!p)return false;const g=this.getGame();if(g!==p.game){this.pendingPurchase=null;return true;}if(this.itemQuantity(g,p.id)>p.count){this.pendingPurchase=null;this.message('已购买 '+p.name+' · '+p.cost+' 金币');this.onSound?.(p.sound);return true;}if(performance.now()-p.at>5000){this.pendingPurchase=null;this.message('购买尚未确认，请检查连接及金币');return true;}return false;}

 selectInventory(index){const g=this.getGame(),item=itemById(g.items[index]);if(!Number.isInteger(index)||!item)return false;this.selectedSlot=index;this.choose(item.id,true);this.pins.inventory=true;this.dockPanels.inventory.setOpen(true);if(!g.canShop())this.message('仅出生点或阵亡时可出售装备');return true;}
 itemQuantity(g,id){return g.items.filter(x=>x===id).length*(id==='2003'?(g.itemStacks[id]||1):1);}
 sell(index=this.selectedSlot){const g=this.getGame();if(this.pendingSale){this.message('正在等待服务器确认出售');return false;}if(!Number.isInteger(index)||!g.items[index]){this.message('请先选择自己装备栏中的物品');return false;}if(!g.canShop()){this.message('仅出生点或阵亡时可出售装备');return false;}const id=g.items[index],item=itemById(id);this.pendingSale={game:g,id,count:this.itemQuantity(g,id),at:performance.now(),name:item.name};if(!g.sellItem(index)){this.pendingSale=null;this.message('出售未发送，请检查连接和出售条件');return false;}this.message('正在确认出售 '+item.name);this.syncSale();this.renderInventory();this.onChange();return true;}
 syncSale(){const p=this.pendingSale;if(!p)return false;const g=this.getGame();if(g!==p.game){this.pendingSale=null;return true;}if(this.itemQuantity(g,p.id)<p.count){this.pendingSale=null;this.selectedSlot=null;this.message('已出售 '+p.name);return true;}if(performance.now()-p.at>5000){this.pendingSale=null;this.message('出售尚未确认，请检查连接及是否仍在出生点');return true;}return false;}
 matches(item){if(item.transformedOnly)return false;if(this.role==='popular'&&!Object.values(recommendedForHero(this.hero)).flat().includes(item.id))return false;
  if(!itemMatchesRole(item,this.role))return false;
  if([...this.stats].some(tag=>!item.tags.includes(tag)))return false;

  return !this.affordable||this.getGame().quoteItem(item.id).ok;
 }
 bindItem(b,item){b.type='button';b.dataset.item=item.id;b.setAttribute('aria-label',item.name+'，'+item.price+'金币');b.onclick=()=>this.choose(item.id);b.ondblclick=()=>{this.selected=item.id;this.buy();};b.oncontextmenu=e=>{e.preventDefault();this.selected=item.id;this.buy();};b.onmouseenter=()=>this.showTooltip(item,b);b.onmouseleave=()=>this.hideTooltip();b.onfocus=()=>this.showTooltip(item,b);b.onblur=()=>this.hideTooltip();return b;}
 itemIcon(item,definition=H.AllItemsIconDefinition){
  const d=D[definition],r=rect(d.HitRegion),b=at(el('button','ns-item'),[0,0,r[2],r[3]],[0,0]);this.bindItem(b,item);
  for(const ref of [d.SelectedIcon,d.HoverIcon])add(b,sprite(ref,r,ref===d.SelectedIcon?'ns-selected-only':'ns-hover-only'));
  const im=at(el('img','ns-item-image'),rect(d.ItemIcon),r);deferShopImage(im,item.icon);im.alt='';im.draggable=false;
  add(b,im,sprite(item.tier==='mythic'?d.MythicFrameIcon:d.FrameIcon,r),sprite(d.HoverFrameIcon,r,'ns-hover-only'));
  if(d.NameText)add(b,textAt(d.NameText,item.name,r));
  if(d.CostText){const q=this.getGame().quoteItem(item.id),p=textAt(q.ok?d.CostText:d.CostTextUnpurchaseable||d.CostText,String(q.cost),r,'ns-price');b.append(p);}
  if(this.getGame().items.includes(item.id))add(b,sprite(d.PurchasedOverlay,r));
  b.classList.toggle('is-selected',item.id===this.selected);return b;
 }
 placeIcon(parent,item,slot,definition=H.AllItemsIconDefinition,origin=O){
  const d=D[definition],r=rect(d.HitRegion),ir=rect(d.ItemIcon),b=this.itemIcon(item,definition),scale=slot[2]/ir[2];
  at(b,[slot[0]-(ir[0]-r[0])*scale,slot[1]-(ir[1]-r[1])*scale,r[2],r[3]],origin);b.style.transformOrigin='0 0';b.style.transform='scale('+scale+')';parent.append(b);return b;
 }
 recommendation(item,index){const d=D[H.RecItemCardDefinition],r=rect(d.HitRegion),b=at(el('button','ns-rec-card'),[r[0]+204*index,r[1],r[2],r[3]]);this.bindItem(b,item);
  add(b,sprite(d.CardDefault,r),sprite(item.tier==='mythic'?d.CardSelectedMythic:d.CardSelectedNonMythic,r,'ns-selected-only'),sprite(item.tier==='mythic'?d.CardHoverMythic:d.CardHoverNonMythic,r,'ns-hover-only'));
  const im=at(el('img','ns-item-image'),rect(d.ItemIcon),r);deferShopImage(im,item.icon);im.alt='';im.draggable=false;
  add(b,im,sprite(item.tier==='mythic'?d.MythicFrameIcon:d.FrameIcon,r),textAt(d.NameText,item.name,r),textAt(d.CostText,String(this.getGame().quoteItem(item.id).cost),r),textAt(d.BriefText,item.summary||TIER[item.tier],r,'ns-brief'),sprite(d.AdviceEmptyIconDefault,r),textAt(d.AdviceEmptyText,'普遍适用',r));b.classList.toggle('is-selected',item.id===this.selected);return b;
 }
 renderList(){this.hideTooltip();if(this.query){this.query='';this.search.value='';}this.searchPane.hidden=true;this.results.replaceChildren();for(const b of this.tabs){b.setSelected(b.dataset.tab===this.tab);b.setAttribute('aria-selected',String(b._selected));}
  this.filters.hidden=this.tab!=='all';for(const b of this.roleButtons)b.setSelected(b.dataset.role===this.role);for(const b of this.statButtons)b.setSelected(this.stats.has(b.dataset.stat));
  const rec=recommendedForHero(this.hero||this.getGame().player.hero.id);
  if(this.tab==='recommended'){
   add(this.results,textAt('{0beda263}','推荐物品'));rec.mythic.map(itemById).filter(Boolean).forEach((item,i)=>this.results.append(this.recommendation(item,i)));
   const ab=at(el('button','ns-autobuild'+(autoBuild.enabled?' is-on':'')),[730,306,170,32]);Object.assign(ab.style,{zIndex:4,boxSizing:'border-box',border:'1px solid #c8aa6e',borderRadius:'3px',background:autoBuild.enabled?'linear-gradient(#785a28,#3c2c14)':'linear-gradient(#1e2328,#0a1418)',color:autoBuild.enabled?'#fff3c8':'#f0e6d2',font:'15px "LoL CN",sans-serif',cursor:'pointer',boxShadow:autoBuild.enabled?'0 0 8px #c8aa6e88':'none'});ab.type='button';ab.textContent=autoBuild.enabled?'一键出装：已开启':'一键出装';ab.title='按推荐顺序有钱自动购买（来源：'+BUILD_SOURCE+'）';ab.onclick=()=>{const on=autoBuild.toggle();this.message(on?'已开启一键出装，回泉水或阵亡时自动按顺序购买':'已关闭一键出装');this.renderList();};this.results.append(ab);
   add(this.results,textAt('{14ac4280}','出装顺序 · '+BUILD_SOURCE));
   const items=[...(rec.plan||[]),'2003'].map(itemById).filter(Boolean);
   items.forEach((item,i)=>{const r=rect(H.RecItemCommonlyBuiltSlotDefinition[i]);this.placeIcon(this.results,item,[r[0]+6,r[1]+6,40,40],H.CommonlyBuiltIconDefinition);});return;
  }
  if(this.tab==='sets'){add(this.results,textAt('{0beda263}','当前英雄 · 默认配装方案'));this.renderGroups([['出装顺序（'+BUILD_SOURCE+'）',(rec.plan||[]).map(itemById)],['消耗品',['2003'].map(itemById)]],true);return;}
  const items=SHOP_ITEMS.filter(i=>this.matches(i)).sort((a,b)=>a.price-b.price);
  let groups=GROUPS.map(([tier,label])=>[label,items.filter(i=>i.tier===tier)]);if(this.invert)groups.reverse();this.renderGroups(groups);
 }
 renderGroups(groups,sets=false){
  const pane=layer('ns-list-scroll',sets?[287,346,631,539]:[337,346,581,541]);this.results.append(pane);
  for(const[label,items]of groups){if(!items.length)continue;const section=el('section','ns-group'),heading=el('h3','',label);section.append(heading);const grid=el('div','ns-grid');for(const item of items.filter(Boolean))grid.append(this.itemIcon(item));section.append(grid);pane.append(section);}
  if(!pane.children.length)pane.append(el('p','ns-empty','没有符合条件的物品'));
 }
 renderSearch(){
  this.hideTooltip();const pane=this.searchPane;pane.replaceChildren();pane.hidden=!this.query.trim();if(pane.hidden)return;
  const shade=at(el('div','ns-search-shade'),[274,290,1065,598]);shade.onclick=()=>{this.query='';this.search.value='';pane.hidden=true;};pane.append(shade);
  add(pane,sprite('{60e30844}'),textAt('{2e29d007}','搜索结果'));
  const r=rect(H.ItemShopSearchViewItemRegionDefinition),list=layer('ns-search-list',r);pane.append(list);
  const q=this.query.trim().toLowerCase(),items=SHOP_ITEMS.filter(item=>(item.id+' '+item.name+' '+item.description+' '+item.colloq).toLowerCase().includes(q));
  const preview=layer('ns-search-preview');pane.append(preview);
  const show=item=>{this.searchItem=item.id;preview.replaceChildren();const d=H.SearchItemDescriptionDefinition,im=at(el('img','ns-item-image'),rect(d.ItemIconDefinition));deferShopImage(im,item.icon);im.alt='';add(preview,im,textAt(d.TitleTextDefinition,item.name),sprite(d.GoldIconDefinition),textAt(d.CostTextDefinition,String(item.price)));const body=at(el('div','ns-search-description'),[515,376,386,386]);body.textContent=item.description;preview.append(body);};
  for(const item of items){const b=this.itemIcon(item,H.SearchIconDefinition);b.onmouseenter=()=>show(item);b.onfocus=()=>show(item);b.onclick=()=>{this.choose(item.id);this.query='';this.search.value='';pane.hidden=true;};list.append(b);}
  if(items.length)show(items[0]);else{this.searchItem=null;list.append(el('p','ns-empty','没有找到物品'));}
 }

 buildDocks(){
  this.dockPanels={};
  for(const[name,def]of [['consumables',H.ConsumablesPanelDefinition],['boots',H.BootsPanelDefinition],['inventory',H.InventoryPanelDefinition]]){
   const closed=rect(def.Closed),opened=rect(def.Opened),p=layer('ns-dock',closed);p.dataset.dock=name;p.tabIndex=0;p.setAttribute('aria-label',name==='inventory'?'装备栏':name==='boots'?'鞋子快捷栏':'消耗品快捷栏');
   const a=sprite(def.Closed,closed,'ns-dock-closed'),b=sprite(def.Opened,closed,'ns-dock-opened');add(p,a,b);
   const content=layer('ns-dock-content',closed,closed);p.append(content);
   const pin=button(def.PinButton,'固定快捷栏',()=>{this.pins[name]=!this.pins[name];pin.setSelected(this.pins[name]);setOpen(this.pins[name]);},closed);p.append(pin);
   const setOpen=on=>{p.classList.toggle('is-expanded',on);p.style.left=((on?opened[0]:closed[0])-O[0])+'px';p.style.width=(on?opened[2]:closed[2])+'px';const shift=on?closed[0]-opened[0]:0;for(const child of [a,b,content,pin])if(child)child.style.translate=shift+'px 0';};
   p.onmouseenter=()=>setOpen(true);p.onmouseleave=()=>setOpen(!!this.pins[name]);p.onfocusin=()=>setOpen(true);p.onfocusout=e=>{if(!p.contains(e.relatedTarget))setOpen(!!this.pins[name]);};
   this.docks.append(p);this.dockPanels[name]={p,content,def,origin:closed,setOpen};
  }
 }
 renderQuickDocks(){const consumables=SHOP_ITEMS.filter(i=>i.tier==='consumable'),boots=SHOP_ITEMS.filter(i=>i.tier==='boots').sort((a,b)=>a.price-b.price);
  for(const[name,items]of [['consumables',consumables],['boots',boots]]){const p=this.dockPanels[name];p.content.replaceChildren();items.slice(0,p.def.Slots.length).forEach((item,i)=>{const slot=rect(p.def.Slots[i]),b=this.placeIcon(p.content,item,slot,H.QuickBuyIconDefinition,p.origin);if(slot[0]<p.origin[0])b.classList.add('ns-dock-extra');});}
 }
 renderInventory(){this.syncPurchase();this.syncSale();const g=this.getGame(),p=this.dockPanels.inventory;p.content.replaceChildren();
  for(let i=0;i<6;i++){const item=itemById(g.items[i]),slot=rect(p.def.Slots[i]);if(item){const b=this.placeIcon(p.content,item,slot,H.InventoryIconDefinition,p.origin);b.onclick=()=>this.selectInventory(i);b.ondblclick=null;b.oncontextmenu=e=>{e.preventDefault();this.selectedSlot=i;this.sell(i);};b.classList.toggle('is-selected',this.selectedSlot===i);if(item.id==='2003')b.append(el('small','ns-stack',String(g.itemStacks[item.id]||1)));}else{const b=at(el('span','ns-inventory-empty'),slot,p.origin);b.setAttribute('aria-label','空装备栏 '+(i+1));p.content.append(b);}}
  this.updateSaleButton();
  this.undoButton.setDisabled(!g.canShop()||!g.shopHistory.length);
 }
 updateSaleButton(){const g=this.getGame();this.sellButton.setDisabled(!!this.pendingSale||!g.canShop()||!Number.isInteger(this.selectedSlot)||!g.items[this.selectedSlot]);this.sellButton.title=this.pendingSale?'等待服务器确认出售':!g.canShop()?'仅出生点或阵亡时可出售装备':this.selectedSlot!==null?'出售：'+(itemById(g.items[this.selectedSlot])?.sellPrice||0)+' 金币':'先选择装备栏中的物品';}
 renderDetails(){const item=itemById(this.selected);if(!item)return;this.details.replaceChildren();
  add(this.details,textAt('{a53832ce}','可合成为'));
  const upgrades=item.into.map(itemById).filter(Boolean);upgrades.slice(0,upgrades.length>7?6:7).forEach((v,i)=>this.placeIcon(this.details,v,rect(H.BuildsIntoSlotDefinition[i]),H.BuildsIntoIconDefinition));
  if(upgrades.length>7){
   const more=button(H.BuildsIntoOverflowButton,'+'+(upgrades.length-6),()=>{menu.hidden=!menu.hidden;this.hideTooltip();});
   more.setAttribute('aria-label','更多合成装备');const menu=layer('ns-upgrade-menu',[1023,278,313,Math.min(480,(upgrades.length-6)*60+42)]);menu.hidden=true;
   const back=at(el('div','ns-upgrade-back'),[0,0,313,Math.min(480,(upgrades.length-6)*60+42)],[0,0]);back.style.borderImageSource='url('+D[H.BuildsIntoDroplistBackdropDefinition].sprite+')';menu.append(back);
   const list=at(el('div','ns-upgrade-list'),[14,18,285,Math.min(438,(upgrades.length-6)*60)],[0,0]);
   for(const v of upgrades.slice(6)){const row=el('button','ns-upgrade-row');this.bindItem(row,v);const im=el('img');deferShopImage(im,v.icon);im.alt='';row.append(im,el('span','',v.name));list.append(row);}menu.append(list);this.details.append(more,menu);
  }
  if(!upgrades.length)add(this.details,at(el('span','ns-no-upgrades','—'),[946,246,350,24]));
  this.renderTree(item);
  const def=H.ItemDescriptionDefinition;const im=at(el('img','ns-item-image'),rect(def.ItemIconDefinition));deferShopImage(im,item.icon);im.alt='';
  add(this.details,im,sprite(def.GoldIconDefinition),textAt(def.TitleTextDefinition,item.name),textAt(def.CostTextDefinition,String(item.price)));
  const body=at(el('div','ns-description'),[941,753,377,177]);body.append(el('p','ns-description-text',item.description));
  const note=el('p','ns-runtime-note',itemSupportText(item));body.append(note);this.details.append(body);this.updateBudget();
 }
 renderTree(item){
  const area=layer('ns-tree',rect(H.BuildTreeDisplayRegionDefinition));this.details.append(area);const r=rect(H.BuildTreeDisplayRegionDefinition),width=r[2];
  const build=(it,path=[])=>{if(path.includes(it.id)||path.length>5)return{item:it,children:[],weight:1};const children=it.from.map(itemById).filter(Boolean).map(c=>build(c,[...path,it.id]));return{item:it,children,weight:Math.max(1,children.reduce((s,c)=>s+c.weight,0))};},root=build(item);
  let maxDepth=0;const depth=(n,d=0)=>{maxDepth=Math.max(maxDepth,d);n.children.forEach(c=>depth(c,d+1));};depth(root);
  const step=Math.min(101,(r[3]-83)/Math.max(1,maxDepth)),nodes=[],lines=[];
  const layout=(n,left,span,d=0)=>{const x=left+span/2,y=16+d*step;nodes.push({item:n.item,x,y});let p=left;
   for(const c of n.children){const cw=span*c.weight/n.weight,cx=p+cw/2,cy=y+step;lines.push({x,y:y+68,cx,cy});layout(c,p,cw,d+1);p+=cw;}};
  layout(root,0,width);
  for(const l of lines){const mid=l.y+(l.cy-l.y)/2;for(const rr of [[l.x-1,l.y,2,Math.max(2,mid-l.y)],[Math.min(l.x,l.cx),mid,Math.max(2,Math.abs(l.cx-l.x)),2],[l.cx-1,mid,2,Math.max(2,l.cy-mid)]]){const line=sprite(H.VerticalBuildTreeConnector,[0,0]);at(line,rr,[0,0]);area.append(line);}}
  const iconSize=Math.min(40,(width/root.weight)-15);for(const n of nodes)this.placeIcon(area,n.item,[n.x-iconSize/2,n.y,iconSize,iconSize],H.BuildTreeIconDefinition,[0,0]);
 }
 showTooltip(item,b){const box=this.tooltip;box.replaceChildren();const title=el('strong','',item.name),cost=el('span','ns-tooltip-cost',item.price+' 金币'),body=el('p','',item.description);box.append(title,cost,body);box.hidden=false;
  const br=b.getBoundingClientRect(),sr=this.stage.getBoundingClientRect(),x=(br.right-sr.left)/this.scale+14,y=(br.top-sr.top)/this.scale;
  box.style.left=Math.min(NATIVE_SHOP.size[0]-352,Math.max(0,x))+'px';box.style.top=Math.min(NATIVE_SHOP.size[1]-box.offsetHeight-8,Math.max(0,y))+'px';
 }
 hideTooltip(){if(this.tooltip)this.tooltip.hidden=true;}
 updateBudget(){this.syncPurchase();if(this.syncSale())this.renderInventory();this.updateSaleButton();const g=this.getGame(),q=g.quoteItem(this.selected);this.gold.textContent=String(Math.floor(g.gold));this.buyButton.setDisabled(!!this.pendingPurchase||!!this.pendingSale||!q.ok);this.buyButton.title=q.ok?'购买 · '+q.cost+' 金币':q.reason;this.reason.textContent=q.reason||(q.discount?'合成需 '+q.cost+' 金币':'');this.undoButton.setDisabled(!g.canShop()||!g.shopHistory.length);}
 refresh(){this.renderList();this.renderDetails();this.renderQuickDocks();this.renderInventory();this.updateSelection();}
}
