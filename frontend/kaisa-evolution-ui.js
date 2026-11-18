export class KaisaEvolutionUI{
 constructor(getGame,isPlaying){this.getGame=getGame;this.isPlaying=isPlaying;this.root=document.createElement('div');this.root.id='classicEvolution';this.root.setAttribute('aria-label','卡莎技能进化');this.root.style.cssText='position:fixed;left:18px;top:110px;z-index:30;display:flex;gap:6px';this.buttons=[];
  for(let i=0;i<3;i++){const b=document.createElement('button');b.type='button';b.style.cssText='padding:8px;background:#132432;color:#d9b6ef;border:1px solid #ae78cb;border-radius:4px';b.onclick=()=>this.getGame().evolveKaisa(i);this.root.append(b);this.buttons.push(b);}document.body.append(this.root);this.root.hidden=true;
 }
 update(){const g=this.getGame(),u=g.player,s=u?.classic||{};const relevant=this.isPlaying()&&u?.hero?.id==='Kaisa'&&!document.querySelector('dialog[open]');this.root.style.display=relevant?'flex':'none';this.root.hidden=!relevant;
  this.buttons.forEach((b,i)=>{const slot='qwe'[i],channel=s.evolution?.slot===slot;b.hidden=!!s.evolved?.[slot]||!s.evolutionEligible?.[slot];b.disabled=!u?.alive||!!s.evolution||u.stun>0||u.silence>0||u.root>0||u.castUntil>g.time||!!u.dash;b.textContent=channel?'进化中 '+Math.max(0,s.evolution.until-g.time).toFixed(1)+'秒':'进化 '+'QWE'[i];b.setAttribute('aria-label',b.textContent);});
 }
}
