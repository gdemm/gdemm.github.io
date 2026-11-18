// Overall battle-entry progress. Every advance comes from completed resource work.
var AramLoadProgress = (() => {
  const weights = {models: 30, map: 30, vfx: 35, targeting: 5};
  let fractions = {models: 0, map: 0, vfx: 0, targeting: 0};
  let percent = 0, phase = '正在准备战斗资源', active = false;
  function paint() {
    const box = document.getElementById('resourceStatus');
    if (!box) return;
    const bar = box.querySelector('[role="progressbar"]');
    if (bar) {
      bar.setAttribute('aria-valuenow', String(percent));
      bar.querySelector('span').style.width = percent + '%';
    }
    const value = box.querySelector('.aram-load-value');
    if (value) value.textContent = percent + '%';
    const label = box.querySelector('.aram-load-phase');
    if (label) label.textContent = phase;
  }
  function progress(part, done, total, text) {
    if (!active || !Object.hasOwn(weights, part)) return;
    fractions[part] = Math.max(fractions[part], Math.min(1, done / Math.max(1, total)));
    const measured = Object.keys(weights).reduce((sum, key) => sum + weights[key] * fractions[key], 0);
    percent = Math.max(percent, Math.min(99, Math.floor(measured)));
    if (text) phase = text;
    paint();
  }
  function show(error) {
    let box = document.getElementById('resourceStatus');
    if (!active && !error) {
      fractions = {models: 0, map: 0, vfx: 0, targeting: 0};
      percent = 0;
      phase = '正在准备战斗资源';
      active = true;
    }
    if (!box) {
      box = document.createElement('div');
      box.id = 'resourceStatus';
      Object.assign(box.style, {position:'fixed', inset:'0', zIndex:'10000', background:'#07131e', color:'#e8d39b', display:'grid', placeContent:'center', textAlign:'center', padding:'24px', font:'16px sans-serif'});
      document.body.append(box);
    }
    box.replaceChildren();
    const panel = document.createElement('div');
    Object.assign(panel.style, {width:'min(460px, 88vw)', display:'grid', gap:'14px'});
    const title = document.createElement('strong');
    title.textContent = error ? '战斗资源加载失败' : '正在加入战斗';
    title.style.fontSize = '23px';
    panel.append(title);
    const tip = document.createElement('p');
    tip.className = 'aram-load-skill-tip';
    tip.textContent = '请勿使用Ctrl+W升级技能，手动点吧';
    Object.assign(tip.style, {margin:'0', color:'#d3c08e', fontSize:'14px', lineHeight:'1.5'});
    panel.append(tip);
    if (error) {
      const detail = document.createElement('p');
      detail.textContent = error.message || String(error);
      panel.append(detail);
      const retry = document.createElement('button');
      retry.textContent = '重新加载资源';
      retry.onclick = () => location.reload();
      panel.append(retry);
    } else {
      const value = document.createElement('strong');
      value.className = 'aram-load-value';
      value.style.fontSize = '34px';
      panel.append(value);
      const bar = document.createElement('div');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-label', '加入战斗加载进度');
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
      Object.assign(bar.style, {height:'16px', border:'1px solid #bc9d59', borderRadius:'10px', overflow:'hidden', background:'#0d2632'});
      const fill = document.createElement('span');
      Object.assign(fill.style, {display:'block', width:'0%', height:'100%', background:'linear-gradient(90deg,#9f7a34,#f1d47e)', transition:'width 100ms linear'});
      bar.append(fill);
      panel.append(bar);
      const label = document.createElement('p');
      label.className = 'aram-load-phase';
      Object.assign(label.style, {margin:'0', color:'#a9bec8', fontSize:'14px'});
      panel.append(label);
    }
    box.append(panel);
    paint();
  }
  function label(text, error) {
    if (!active || error || !document.getElementById('resourceStatus')) return;
    phase = text;
    paint();
  }
  function complete() { if (active) { percent = 100; phase = '加载完成'; paint(); active = false; } }
  function close() { active = false; }
  return {show, progress, label, complete, close};
})();

globalThis.AramLoadProgress=AramLoadProgress;
