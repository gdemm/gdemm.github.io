export function createServerDialog(nodes,onChoose){
 const dialog=document.createElement('dialog');dialog.id='serverSelectDialog';dialog.className='realm-dialog';dialog.setAttribute('aria-labelledby','serverSelectTitle');
 const title=document.createElement('h2');title.id='serverSelectTitle';title.textContent='选择服务器';
 const note=document.createElement('p');note.textContent='请选择服务器，点击确定进入对应大厅。';
 const choices=document.createElement('div');choices.className='realm-choices';const buttons=new Map();let selected=null;
 const select=id=>{selected=nodes.some(n=>n.id===id)?id:null;for(const node of nodes){const b=buttons.get(node.id);if(b){b.setAttribute('aria-pressed',String(node.id===selected));b.textContent=node.label;}}confirm.disabled=!selected;};
 for(const node of nodes){const button=document.createElement('button');button.type='button';button.textContent=node.label;button.onclick=()=>select(node.id);choices.append(button);buttons.set(node.id,button);}
 const actions=document.createElement('div');actions.className='realm-actions';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='取消';cancel.onclick=()=>dialog.close();const confirm=document.createElement('button');confirm.type='button';confirm.textContent='确定';confirm.disabled=true;confirm.onclick=()=>{if(selected&&!confirm.disabled)onChoose(selected);};actions.append(cancel,confirm);const heading=document.createElement('div');heading.className='realm-heading';const eyebrow=document.createElement('small');eyebrow.textContent='海克斯大乱斗 · 联机对战';heading.append(eyebrow,title,note);dialog.append(heading,choices,actions);document.body.append(dialog);
 const style=document.createElement('style');style.textContent=`
#serverSelectDialog{width:min(520px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:0;text-align:left;background:#091924;color:#e3eef3;border:1px solid #36515e;border-radius:8px;box-shadow:0 24px 80px #000a,inset 0 1px 0 #d2b87944;font-family:"Spiegel","LoL CN",sans-serif}
#serverSelectDialog::backdrop{background:#020a12cc;backdrop-filter:blur(6px)}
#serverSelectDialog .realm-heading{padding:26px 28px 20px;border-bottom:1px solid #27414d;background:linear-gradient(120deg,#102c38,#091924)}
#serverSelectDialog .realm-heading small{color:var(--gold,#d2b879);font-size:11px;letter-spacing:2px}
#serverSelectDialog h2{font-family:"LoL Title","Beaufort",serif;font-size:28px;font-weight:600;letter-spacing:2px;color:#f0e6cf;margin:12px 0 8px}
#serverSelectDialog p{margin:0;color:#9bb1bd;font-size:13px;line-height:1.7}
#serverSelectDialog .realm-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:0;padding:24px 28px}
#serverSelectDialog .realm-choices button{position:relative;min-width:0;min-height:108px;padding:24px 8px 36px;border:1px solid #304b58;border-radius:4px;background:linear-gradient(150deg,#112b38,#081722);color:#a5bbc5;font:20px "LoL Title","Beaufort",serif;letter-spacing:2px;transition:background .18s,border-color .18s}
#serverSelectDialog .realm-choices button:hover{border-color:#b8a06b;background:#173340;color:#f0e6cf}
#serverSelectDialog .realm-choices button[aria-pressed=true]{border-color:#d2b879;background:linear-gradient(145deg,#263b3e,#102330);color:#f0d99c;box-shadow:inset 0 0 0 1px #d2b87944}
#serverSelectDialog .realm-choices button[aria-pressed=true]::after{content:'已选择';position:absolute;bottom:15px;left:0;right:0;text-align:center;color:#d2b879;font:11px "LoL CN",sans-serif;letter-spacing:1px}
#serverSelectDialog .realm-actions{display:flex;justify-content:flex-end;gap:12px;padding:16px 28px;border-top:1px solid #27414d;background:#0b1e29}
#serverSelectDialog .realm-actions button{min-width:100px;height:40px;padding:0 20px;border-radius:4px;font:14px "LoL Title","LoL CN",sans-serif}
#serverSelectDialog .realm-actions button:first-child{border-color:#36515c;background:#102430;color:#a4b7c1}
#serverSelectDialog .realm-actions button:last-child{background:linear-gradient(100deg,#d6bd7c,#b49a5e);border-color:#d9bd72;color:#12222b;font-weight:600}
#serverSelectDialog button:focus-visible{outline:2px solid var(--cyan,#79dfeb);outline-offset:3px}
@media(max-width:500px){#serverSelectDialog .realm-heading{padding:22px 20px 16px}#serverSelectDialog .realm-choices{padding:20px;gap:10px}#serverSelectDialog h2{font-size:24px}#serverSelectDialog .realm-choices button{font-size:18px;min-height:96px}#serverSelectDialog .realm-actions{padding:14px 20px}}
`;document.head.append(style);

 return{dialog,buttons,cancel,confirm,setSelection:select,setDisabled(value){for(const b of buttons.values())b.disabled=value;confirm.disabled=value||!selected;}};
}
