// Troca a arte e o som desenhados pelos sprites, fontes, sons e música do DELTARUNE (capítulo 1),
// extraídos com ferramentas/extract.py para assets/.
'use strict';
(function(){
const META = window.META;
const IMG = {}, SND = {};
const D = Math.PI / 180;
const HPCOLOR = { kris: '#00ffff', susie: '#ff00ff', ralsei: '#00ff00' };
const SOFTCOLOR = { kris: '#80ffff', susie: '#ff80ff', ralsei: '#80ff80' };
const PRESSCOLOR = { kris: '#0000ff', susie: '#800080', ralsei: '#008000' };
const DMGCOLOR = { kris: '#80ffff', susie: '#cc99cc', ralsei: '#80ff80' };
const BCOLOR = '#332033', BOX_GREEN = '#00c000';
// obj_jokerbg_triangle_real: merge_color(navy, grey) em BGR
const DKBLUE = '#06067a', DKBLUE2 = '#202060', DKBLUE3 = '#1a1a4d';

/* ------------------------------ assets ------------------------------ */
// Tela de carregamento: o jogo fica parado até todas as imagens, sons e a música chegarem.
// Os sons vão para a memória (blob), então tocar não baixa nada de novo.
const MUSIC = 'assets/snd/mus_joker.ogg';
let musicSrc = MUSIC;
function loadingScreen(){
  const wrap = document.getElementById('wrap'); wrap.style.position = 'relative';
  const el = document.createElement('div');
  el.id = 'loading'; el.setAttribute('role', 'progressbar'); el.setAttribute('aria-valuemin', '0'); el.setAttribute('aria-valuemax', '100');
  el.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#000;color:#fff;font-family:var(--font);font-size:12px;letter-spacing:.08em;z-index:2';
  el.innerHTML = '<div id="loadtxt"></div><div style="width:60%;max-width:320px;height:12px;border:2px solid #fff;padding:2px"><div id="loadbar" style="height:100%;width:0;background:#ff0000"></div></div><div id="loadpct" style="color:#8a80a0">0%</div>';
  wrap.appendChild(el);
  el.querySelector('#loadtxt').textContent = LANG === 'pt' ? 'CARREGANDO' : 'LOADING';
  return k => {
    const pct = Math.floor(k*100);
    el.querySelector('#loadbar').style.width = pct + '%';
    el.querySelector('#loadpct').textContent = pct + '%';
    el.setAttribute('aria-valuenow', String(pct));
  };
}
function load(){
  const show = loadingScreen();
  const _update = window.update; window.update = () => {};
  const names = Object.keys(META.sprites).concat(Object.keys(META.fonts));
  const sounds = Object.entries(META.sounds);
  const total = names.length + sounds.length + 1;
  let done = 0; const tick = () => show(++done/total);
  const blob = src => fetch(src).then(r => r.ok ? r.blob() : Promise.reject()).then(b => URL.createObjectURL(b)).catch(() => src);
  const jobs = names.map(n => new Promise(res => {
    const im = new Image(); im.onload = im.onerror = () => { tick(); res(); }; im.src = 'assets/spr/' + n + '.png'; IMG[n] = im;
  })).concat(sounds.map(([n, f]) => blob('assets/snd/' + f).then(src => { SND[n] = { src, pool: [] }; tick(); })),
    blob(MUSIC).then(src => { musicSrc = src; tick(); }));
  return Promise.all(jobs).then(() => {
    for(const k in pressed) pressed[k] = false;
    window.update = _update;
    const el = document.getElementById('loading'); if(el) el.remove();
    document.getElementById('cv').focus();
  });
}

/* ------------------------- desenho estilo GM ------------------------ */
const tint = new Map();
const ok = im => im && im.complete && im.naturalWidth > 0;
function frameCanvas(name, f, color, flat){
  const s = META.sprites[name], k = name + f + color + flat;
  let c = tint.get(k); if(c) return c;
  c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
  const x = c.getContext('2d');
  x.drawImage(IMG[name], f*s.w, 0, s.w, s.h, 0, 0, s.w, s.h);
  x.globalCompositeOperation = flat ? 'source-in' : 'multiply'; x.fillStyle = color; x.fillRect(0, 0, s.w, s.h);
  if(!flat){ x.globalCompositeOperation = 'destination-in'; x.drawImage(IMG[name], f*s.w, 0, s.w, s.h, 0, 0, s.w, s.h); }
  tint.set(k, c); return c;
}
// draw_sprite_ext: ângulo em graus, anti-horário
function spr(name, frame, x, y, xs = 1, ys = 1, ang = 0, alpha = 1, color = null, flat = false){
  const s = META.sprites[name]; if(!s || alpha <= 0 || !ok(IMG[name])) return;
  const f = ((Math.floor(frame) % s.n) + s.n) % s.n;
  ctx.save(); ctx.globalAlpha *= Math.min(1, alpha); ctx.translate(x, y); if(ang) ctx.rotate(-ang*D); ctx.scale(xs, ys);
  if(color && color !== '#ffffff') ctx.drawImage(frameCanvas(name, f, color, flat), -s.ox, -s.oy);
  else ctx.drawImage(IMG[name], f*s.w, 0, s.w, s.h, -s.ox, -s.oy, s.w, s.h);
  ctx.restore();
}
function rect(x, y, w, h, color, alpha = 1){ ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; }
function strokeR(x, y, w, h, color, lw){ ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.strokeRect(x + lw/2, y + lw/2, w - lw, h - lw); }
const fontTints = {};
function fontImg(font, color){
  if(color === '#ffffff' || color === '#fff') return IMG[font];
  const k = font + color; if(fontTints[k]) return fontTints[k];
  const im = IMG[font], c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return (fontTints[k] = c);
}
const clean = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
function gText(str, x, y, color = '#ffffff', font = 'fnt_mainbig', scale = 1, mono = 0){
  const g = META.fonts[font].glyphs;
  if(!ok(IMG[font])) return x + gWidth(str, font, scale);
  const im = fontImg(font, color);
  let cx = x;
  for(const ch of clean(String(str))){
    const gl = g[ch.charCodeAt(0)] || g[63];
    if(gl[2] > 0) ctx.drawImage(im, gl[0], gl[1], gl[2], gl[3], cx + gl[5]*scale, y, gl[2]*scale, gl[3]*scale);
    cx += mono || gl[4]*scale;
  }
  return cx;
}
function gWidth(str, font = 'fnt_mainbig', scale = 1){ const g = META.fonts[font].glyphs; let w = 0; for(const ch of clean(String(str))) w += (g[ch.charCodeAt(0)] || g[63])[4]*scale; return w; }
const _gw = {};
function glyphWidth(name, f){
  const k = name + f; if(_gw[k] !== undefined) return _gw[k];
  if(!ok(IMG[name])) return META.sprites[name].w;
  const s = META.sprites[name], c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
  const x = c.getContext('2d'); x.drawImage(IMG[name], f*s.w, 0, s.w, s.h, 0, 0, s.w, s.h);
  let w = 0; try { const d = x.getImageData(0, 0, s.w, s.h).data; for(let i = 0; i < s.w; i++) for(let j = 0; j < s.h; j++) if(d[(j*s.w + i)*4 + 3]){ w = i + 1; break; } } catch(e){ w = s.w; }
  return (_gw[k] = w + 2);
}
function numSmall(str, x, y, color, right){
  const map = '0123456789-+', gw = 8;
  let cx = right ? x - str.length*gw : x;
  for(const ch of str){ const f = map.indexOf(ch); if(f >= 0) spr('spr_numbersfontsmall', f, cx, y, 1, 1, 0, 1, color === '#ffffff' ? null : color); cx += gw; }
}
function boxShape(cx, cy, w, h, ang, alpha){
  if(w < 1 || h < 1) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); if(ang) ctx.rotate(ang);
  const bw = Math.max(1, 4*Math.min(w/150, h/150, 1));
  ctx.fillStyle = '#000'; ctx.fillRect(-w/2, -h/2, w, h);
  ctx.fillStyle = BOX_GREEN;
  ctx.fillRect(-w/2, -h/2, w, bw); ctx.fillRect(-w/2, h/2 - bw, w, bw); ctx.fillRect(-w/2, -h/2, bw, h); ctx.fillRect(w/2 - bw, -h/2, bw, h);
  ctx.restore();
}

/* -------------------------------- som -------------------------------- */
let vol = VOL * 1.15, music = null, musicOn = true;
window.__setVol = v => { vol = v * 1.15; if(music) music.volume = musicOn ? Math.min(1, .6*vol) : 0; };
function snd(name, v = 1){
  const s = SND[name]; if(!s) return;
  let a = s.pool.find(e => e.paused || e.ended);
  if(!a){ if(s.pool.length > 6){ a = s.pool[0]; a.pause(); } else { a = new Audio(s.src); s.pool.push(a); } }
  a.volume = Math.min(1, v*vol); try { a.currentTime = 0; } catch(e){}
  a.play().catch(() => {});
}
const SMAP = {
  break1: 'snd_break1', break2: 'snd_break2',
  move: 'snd_menumove', select: 'snd_select', back: 'snd_menumove', text: 'snd_text', jtext: 'snd_txtjok',
  hurt: 'snd_hurt1', graze: 'snd_graze', slash: 'snd_laz_c', damage: 'snd_damage', heal: 'snd_power', tp: 'snd_boost',
  bomb: 'snd_bomb', bell: 'snd_bell', spare: 'snd_spare', win: 'snd_won', laugh: 'snd_joker_laugh0', down: null,
  pirouette: 'snd_pirouette', hypnosis: 'snd_hypnosis', awkward: 'snd_awkward', bird: 'snd_birdtweet', laser: 'snd_scytheburst',
  crit: 'snd_criticalswing', item: 'snd_item', buster: 'snd_rudebuster_swing', spin: null, scythe: null, tick: null, shoot: null, appear: null,
  neochaos: 'snd_joker_neochaos', byebye: 'snd_joker_byebye', anything: 'snd_joker_anything',
  foley1: 'snd_badexplosion', foley2: 'snd_carhonk', foley3: 'snd_toilet', weird: 'snd_weirdeffect', pendant: 'snd_shadowpendant', applause: 'snd_applause',
};
let lastText = 0;
Snd.hook = (name, arg) => {
  if(name === 'voice'){
    const l = String(arg || '');
    // vozes do obj_joker_Step_0: só estas falas tocam som
    const V = { 'CHAOS, CHAOS,\n\nCATCH ME\nIF YOU CAN!': 'chaos', 'HEARTS,\nDIAMONDS,\nI CAN DO\nANYTHING!': 'anything',
      'A CHAOS,\nCHAOS!': 'chaos', 'PLEASE, IT\'S\nJUST A\nSIMPLE\nCHAOS.': 'chaos', 'I CAN DO\nANYTHING!!': 'anything' };
    if(V[l]) { snd('snd_joker_' + V[l]); return true; }
    if(/\n/.test(l)) return true;
    if(/CHAOS/.test(l)) snd('snd_joker_chaos');
    else if(/ANYTHING/.test(l)) snd('snd_joker_anything');
    else if(/DEVILSKNIFE/.test(l)) snd('snd_joker_metamorphosis');
    else if(/SEE YOU|BYE/.test(l)) snd('snd_joker_byebye');
    else if(/UEE|HEE|HA/.test(l)) snd(pick(['snd_joker_laugh0', 'snd_joker_laugh1', 'snd_joker_ha0', 'snd_joker_ha1']));
    else if(/!!/.test(l)) snd('snd_joker_oh');
    return true;
  }
  if(name === 'text' || name === 'jtext'){ if(G.t - lastText < 2) return true; lastText = G.t; }
  if(name in SMAP){ if(SMAP[name]) snd(SMAP[name], name === 'graze' ? .6 : 1); return true; }
  return true;
};
Snd.startMusic = function(){ if(music) return; music = new Audio(musicSrc); music.loop = true; music.volume = musicOn ? Math.min(1, .6*vol) : 0; music.play().catch(() => {}); };
Snd.stopMusic = function(){ if(music){ music.pause(); music = null; } };
Snd.toggleMusic = function(){ musicOn = !musicOn; if(music) music.volume = musicOn ? Math.min(1, .6*vol) : 0; };
Snd.tick = function(){};
Snd.init = function(){};

/* ------------------------------ texto -------------------------------- */
// text(str, x, y, cor, tamanho, alinhamento) do jogo base, agora com as fontes do jogo
window.text = function(str, x, y, col = '#fff', size = 16, align = 'left'){
  const font = size >= 14 ? 'fnt_mainbig' : size >= 10 ? 'fnt_main' : 'fnt_small';
  const sc = size >= 24 ? 2 : 1;
  col = col === '#fff' ? '#ffffff' : col;
  let w = 0;
  if(align !== 'left') w = gWidth(str, font, sc);
  gText(str, align === 'center' ? x - w/2 : align === 'right' ? x - w : x, y - 2, col, font, sc);
};

/* ----------------------------- fundo ---------------------------------- */
// obj_jokerbg_triangle_real: tira do carrossel em perspectiva + leque de triângulos girando
const BG = { rot: 0, bgx: 0, alpha: 0, rotspeed: 0 };
let bgTinted = null;
function tintedBG(){
  if(bgTinted) return bgTinted;
  const s = META.sprites.spr_carouselbg; const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
  const x = c.getContext('2d'); x.drawImage(IMG.spr_carouselbg, 0, 0);
  x.globalCompositeOperation = 'multiply'; x.fillStyle = DKBLUE3; x.fillRect(0, 0, s.w, s.h);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(IMG.spr_carouselbg, 0, 0);
  return (bgTinted = c);
}
function triPts(i, rot, radius){
  const n = 8;
  let x1 = Math.cos((rot + 360/n*i)*D)*radius, y1 = -Math.sin((rot + 360/n*i)*D)*radius/2;
  let x2 = Math.cos((rot + 360/n*(i+1))*D)*radius, y2 = -Math.sin((rot + 360/n*(i+1))*D)*radius/2;
  if(y1 <= 0) y1 *= .6; if(y2 <= 0) y2 *= .6;
  return [x1, y1, x2, y2];
}
function tri(ax, ay, bx, by, cx, cy){ ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill(); }
window.drawBG = function(){
  rect(0, 0, W, H, '#000');
  const J = G.jevil, on = G.scene !== 'title' || true;
  BG.alpha = Math.min(1, BG.alpha + .02);
  BG.rotspeed = J ? 1 + (1.5 - (J.hp/J.max)*1.5) : 1;
  BG.bgx += 1; if(BG.bgx >= 640) BG.bgx -= 640;
  BG.rot += 2.5 * BG.rotspeed;
  const img = tintedBG(), a = BG.alpha;
  ctx.save(); ctx.globalAlpha = a;
  let curl = BG.bgx, curx = 0, cs = 1;
  const strip = (h, y) => { ctx.drawImage(img, curl, 0, 5, h, curx, y, 5*cs, h); };
  for(let i = 0; i < 16; i++){ strip(300, -i); cs = Math.floor(1 + .5*i); curl += 5; if(curl >= 640) curl -= 640; curx += 5*cs - 5; }
  for(let i = 16; i > 0; i--){ strip(380, -i); cs = Math.ceil(Math.max(1, 1 + .5*i)); curl += 5; if(curl >= 640) curl -= 640; curx += 5*cs - 5; }
  const xc = 320, yc = 240, R = 360;
  let black = 0;
  const col = () => { ctx.fillStyle = black ? DKBLUE2 : DKBLUE; black = 1 - black; };
  for(let i = 0; i < 8; i++){ const [x1, y1, x2, y2] = triPts(i, BG.rot, R); col(); tri(xc, yc, xc + x1, yc + y1, xc + x2, yc + y2); }
  black = 0;
  for(let i = 0; i < 8; i++){ const [x1, y1, x2, y2] = triPts(i, BG.rot, R); col(); if((y1 > 0 || y2 > 0) && x2 > x1 - 48) tri(xc, yc - 80, xc + x1/6, yc + y1/6, xc + x2/6, yc + y2/6); }
  black = 0;
  for(let i = 8; i >= 0; i--){ const [x1, y1, x2, y2] = triPts(i, BG.rot, R); col(); if(y1 > 0 || y2 > 0) tri(xc, yc - 80, xc + x1/4, yc + y1 - 380, xc + x2/4, yc + y2 - 380); }
  black = 0;
  for(let i = 0; i < 8; i++){ const [x1, y1, x2, y2] = triPts(i, BG.rot, R); col(); tri(xc, yc - 320, xc + x1, yc + y1 - 320, xc + x2, yc + y2 - 320); }
  ctx.restore();
};

/* ------------------------------ Jevil ---------------------------------- */
// obj_joker_body_Draw_0
// obj_joker_body condition 5: estica, achata, vira a foice girando e sobe sumindo
function metamorphosis(offx, offy){
  let m = JB.m;
  if(!m || m.turn !== G.turnId) m = JB.m = { turn: G.turnId, timer: 0, xs: 2, ys: 2, sp: 'spr_joker_teleport', y: 0, vs: 0, a: 1, spin: 0 };
  m.timer++;
  const t = m.timer;
  if(t === 1) snd('snd_joker_metamorphosis');
  if(t >= 1 && t <= 3){ m.xs *= 1.3; m.ys *= .7; }
  if(t >= 5 && t <= 15){ m.xs *= .7; m.ys *= 1.3; }
  if(t >= 15 && t <= 30){ m.spin++; m.xs = Math.min(2, Math.sin(m.spin/3)*2); m.sp = 'spr_joker_scythebody'; m.ys = Math.max(2, m.ys*.7); }
  if(t >= 30 && t < 41){ m.spin++; m.xs = Math.sin(m.spin/3)*2; m.vs -= 3; m.y += m.vs; m.a -= .1; }
  if(t < 41 && m.a > 0) spr(m.sp, 0, offx, offy + m.y, m.xs, m.ys, 0, m.a);
}
const JB = { heroA: 1, prevSize: 2, fs: 0, dancesiner: 0, sx: [0,0,0,0,0,0,0], sy: [0,0,0,0,0,0,0], sf: [1,1,1,1,1,1,1], siner: 0, size: 2, hidden: false, spin: 0 };
window.drawJevil = function(){
  const J = G.jevil, A = G.atk; if(!J) return;
  const f = J.hp / J.max;
  const speed = 1 + (1 - f) * .5;
  JB.fs += speed;
  let fly = Math.sin(JB.fs/8)*3*(speed*2 - 1), flyx = f <= .8 ? Math.cos(JB.fs/8)*3*(speed*2 - 1) : 0;
  const offx = J.x + 20, offy = J.y + 18;
  const tired = G.tired || (G.jturnNow === 17 && G.scene !== 'menu');
  let lv = tired ? 2 : f <= .4 ? 3 : f <= .8 ? 1 : 0;
  // some nos ataques de teleporte/bombas (encolhe na horizontal), volta quando turntimer <= 10
  const hide = G.scene === 'bullets' && A && A.def.hide;
  const knife = (J.form === 'knife' && G.scene === 'bullets' && A) || (G.scene === 'etalk' && [3, 13, 18].includes(G.jturnNow));
  // condition 2: Jevil encolhe e o grupo some (alpha -.25); condition 3: os dois voltam
  if(hide && A.timer > 10){ JB.size = Math.max(0, JB.size - .5); JB.heroA = Math.max(0, JB.heroA - .25); }
  else if(knife && (!A || A.timer > 10)) JB.size = 0;
  else { JB.size = Math.min(2, JB.size + .5); JB.heroA = Math.min(1, JB.heroA + .25); }
  if(!knife && JB.size !== JB.prevSize && (JB.prevSize === 2 || JB.prevSize === 0)) snd('snd_spearappear');
  JB.prevSize = JB.size;
  if(knife && (!A || A.timer > 10)){ metamorphosis(offx, offy); return; }
  if(G.scene === 'win' && G.winType === 'violence'){ spr('spr_joker_main', 0, offx, offy + fly, 2, 2, 0, Math.max(0, 1 - (G.t % 60)/60)); }
  if(hide || JB.size < 2){ if(JB.size > 0) spr('spr_joker_main', 0, offx, offy + fly, JB.size, 2); return; }
  if(J.form === 'center'){ spr('spr_joker_main', 0, 320, 100 + fly, 2, 2); return; }
  // levou dano: cabeça balança na corrente
  if(J.swing > 0){
    const md = Math.min(150, J.swing);
    JB.siner += Math.max(.8, Math.min(2, .8 + md/50));
    const sinx = Math.sin(JB.siner/4)*md, siny = -Math.abs(Math.sin(JB.siner/4))*md*.7;
    let ji = 0; if(sinx > md/2 && md > 15) ji = 1; if(sinx < -md/2 && md > 15) ji = 2; if(md < 4) ji = 3;
    const maxchain = 10;
    for(let i = 0; i < maxchain - 1; i++) spr('spr_jokerchain', ji, offx + sinx*(i/maxchain) - 2, offy + 6 + (siny - 32)*(i/maxchain) + fly, 2, 2);
    spr('spr_jokerbody', 0, offx - 42, offy + fly - 2, 2, 2);
    spr('spr_jokerhead', ji, offx + sinx - 2, offy + siny + fly - 14, 2, 2);
    J.swing -= 1; if(J.swing <= 0) J.swing = 0;
    return;
  }
  if(lv === 0) spr('spr_joker_main', 0, offx + flyx, offy + fly, 2, 2);
  else if(lv === 1) spr('spr_joker_dance', JB.fs/3, offx + flyx, offy + fly, 2, 2);
  else if(lv === 2) spr('spr_joker_tired', 0, offx + flyx, offy + fly, 2, 2);
  else {
    JB.dancesiner++;
    for(let i = 0; i < 7; i++){
      if(i >= 1){ JB.sx[i] += Math.sin(i + JB.fs/5)*8*JB.sf[i]; JB.sy[i] += Math.cos(i + JB.fs/5)*4*JB.sf[i]; }
      const da = Math.sin(i + JB.dancesiner/9);
      if(da < 0 && i >= 1){ JB.sx[i] = 60 - Math.random()*120; JB.sy[i] = 60 - Math.random()*120; JB.sf[i] = 1.5 - Math.random()*3; }
      spr('spr_joker_dance', JB.dancesiner/2 + i/4, offx + JB.sx[i], offy + JB.sy[i], 2, 2, 0, i === 0 ? 1 : da);
    }
  }
  // flash quando é o alvo no menu
  if(G.scene === 'menu' && G.menu && G.menu.sub && G.menu.sub.kind === 'enemy') spr('spr_joker_main', 0, offx + flyx, offy + fly, 2, 2, 0, -Math.cos(G.t/5)*.4 + .6, '#ffffff', true);
};

/* ------------------------------ grupo ---------------------------------- */
const HERO = {
  // scr_encountersetup(25): heromakex/heromakey do Jevil
  kris:   { pre: 'spr_krisb_',  x: 80,  y: 100, spell: 'act' },
  susie:  { pre: 'spr_susieb_', x: 90,  y: 150, spell: 'spell' },
  ralsei: { pre: 'spr_ralseib_', x: 100, y: 210, spell: 'spell' },
};
const READY = { FIGHT: 'attackready', ACT: 'actready', ITEM: 'itemready', SPELL: 'spellready', HELP: 'actready', SPARE: 'actready' };
window.drawParty = function(){
  G.party.forEach((p, i) => {
    const h = HERO[p.id];
    if(!p._placed){ p.x = h.x; p.y = h.y; p._placed = true; }
    p.anim = (p.anim || 0) + 1;
    let name = h.pre + 'idle', fr = p.anim/6, x = p.x;
    if(p.down) { name = h.pre + 'defeat'; fr = 0; }
    else if(p.flash > 0){ p.flash--; name = h.pre + 'hurt'; fr = 0; x += (p.flash % 2 ? 2 : -2); }
    else if(p.spin > 0){ p.spin--; name = 'spr_krisb_pirouette'; fr = (24 - p.spin)/3; }
    else if(p.slash > 0){ name = h.pre + 'attack'; fr = Math.max(0, (16 - p.slash))/2; p.slash--; }
    else if(p.defend && G.scene !== 'menu'){ name = h.pre + 'defend'; p.dt = Math.min(5, (p.dt || 0) + .5); fr = p.dt; }
    else if(p.act && G.scene !== 'bullets' && G.scene !== 'etalk'){
      const t = p.act.type === 'SPELL' ? (p.id === 'kris' ? 'actready' : 'spellready') : READY[p.act.type];
      if(p.act.type === 'DEFEND'){ name = h.pre + 'defend'; p.dt = Math.min(5, (p.dt || 0) + .5); fr = p.dt; }
      else if(t) { name = h.pre + t; fr = p.anim/4; }
    } else p.dt = 0;
    if(!META.sprites[name]) name = h.pre + 'idle';
    const bu = p.id === 'susie' && busterAnim();
    if(bu){ spr('spr_susie_rudebuster', bu.t/2, x, p.y, 2, 2); return; }
    if(JB.heroA <= 0) return;
    spr(name, fr, x, p.y, 2, 2, 0, JB.heroA);
    // obj_heroparent Draw: spr_chartarget (x2) sobre quem é alvo enquanto o Jevil fala (mnfight == 1)
    if(G.scene === 'etalk' && G.targeted && G.targeted.includes(i)) spr('spr_chartarget', Math.floor(G.t/10), x, p.y, 2, 2);
    if(G.scene === 'menu' && G.menu && G.menu.sub && G.menu.sub.kind === 'party' && G.menu.sel === i) spr(name, fr, x, p.y, 2, 2, 0, -Math.cos(G.t/5)*.4 + .6, '#ffffff', true);
  });
};

/* ------------------------- interface inferior -------------------------- */
const HEAD = { kris: 'spr_headkris', susie: 'spr_headsusie', ralsei: 'spr_headralsei' };
const BNAME = { kris: 'spr_bnamekris', susie: 'spr_bnamesusie', ralsei: 'spr_bnameralsei' };
const FACE = { FIGHT: 1, ACT: 6, SPELL: 6, HELP: 6, ITEM: 4, SPARE: 5, DEFEND: 3 };
let sSiner = 0;
window.drawHUD = function(){
  const top = 480 - 155;
  rect(0, top - 4, W, 160, '#000');
  rect(0, top - 3, W, 2, BCOLOR);
  rect(0, top + 34, W, 3, BCOLOR);
  const M = G.menu, gc = G.scene === 'menu' && M ? M.cur : -1;
  sSiner += 2;
  G.party.forEach((p, c) => {
    const xc = c*213, col = HPCOLOR[p.id];
    if(p.mmy === undefined) p.mmy = 0;
    if(gc === c){ if(p.mmy > -32) p.mmy -= p.mmy > -8 ? 8 : p.mmy > -16 ? 6 : p.mmy > -24 ? 4 : 2; if(p.mmy < -32) p.mmy = -32; }
    else p.mmy = p.mmy < -14 ? p.mmy + 15 : 0;
    const mmy = p.mmy;
    if(gc === c){
      rect(xc, top - 3 + mmy, 213, -mmy + 3, col);
      rect(xc + 2, top - 1 + mmy, 209, -mmy + 1, '#000');
      rect(xc, top + 40 + mmy, 213, 4, col);
      for(let i = 0; i < 12; i++){
        const a = Math.sin((sSiner + i*31.4159)/60); if(a <= 0) continue;
        ctx.globalAlpha = a; ctx.fillStyle = col;
        ctx.fillRect(xc - 1, top - 3 + mmy*.75, 2, 36 - mmy*.75); ctx.fillRect(xc + 210, top - 3 + mmy*.75, 2, 36 - mmy*.75);
        ctx.globalAlpha = 1;
      }
      const btns = ['spr_btfight', p.id === 'kris' ? 'spr_btact' : 'spr_bttech', 'spr_btitem', 'spr_btspare', 'spr_btdefend'];
      btns.forEach((bn, j) => spr(bn, !M.sub && j === M.btn ? 1 : 0, xc + 15 + j*35, 485 - 155, 1, 1));
    } else {
      const sel = G.scene === 'menu' && M && M.sub && M.sub.kind === 'party';
      rect(xc, top - 3 + mmy, 213, 2, sel ? col : BCOLOR);
      rect(xc + 2, top - 1 + mmy, 209, 34, '#000');
    }
    const by = top + 8 + mmy;
    const face = p.down ? 0 : p.act ? FACE[p.act.type] || 0 : 0;
    spr(HEAD[p.id], face, 13 + xc, by, 1, 1);
    spr(BNAME[p.id], 0, 51 + xc, by + 3, 1, 1);
    spr('spr_hpname', 0, 109 + xc, by + 11, 1, 1);
    const hpc = p.hp <= 0 ? '#ff0000' : p.hp/p.max <= .25 ? '#ffff00' : '#ffffff';
    numSmall(String(Math.max(p.hp, -999)), 160 + xc, by - 2, hpc, true);
    spr('spr_hpslash', 0, 159 + xc, by - 4, 1, 1);
    numSmall(String(p.max), 205 + xc, by - 2, hpc, true);
    rect(128 + xc, by + 11, 76, 9, '#800000');
    if(p.hp > 0) rect(128 + xc, by + 11, Math.ceil(p.hp/p.max*75) + 1, 9, col);
  });
};
let tsiner = 0;
window.drawTP = function(){
  const x = 38, y = 40, h = 196, w = 25;
  G.tpShow = G.tpShow + (G.tp - G.tpShow) * .25;
  spr('spr_tensionbar', 1, x, y, 1, 1);
  const cur = G.tp/CFG.tpMax, app = G.tpShow/CFG.tpMax, maxed = G.tp >= CFG.tpMax;
  const fill = (fr, c) => { if(fr > 0) rect(x + 3, y + h - Math.round(fr*h), w - 4, Math.round(fr*h) - 1, c); };
  const orange = maxed ? '#ffd020' : '#ffa040';
  if(app < cur - .002){ fill(cur, '#ff0000'); fill(app, orange); } else if(app > cur + .002){ fill(app, '#ffffff'); fill(cur, orange); } else fill(cur, orange);
  const M = G.menu; tsiner++;
  if(G.scene === 'menu' && M && M.sub && (M.sub.kind === 'magic' || M.sub.kind === 'act')){
    const list = M.sub.kind === 'act' ? ACTS : SPELLS[G.party[M.cur].id], it = list[M.sel];
    if(it && it.tp && it.tp <= G.tp){ const t1 = y + h - cur*h; rect(x + 3, t1, w - 4, it.tp/CFG.tpMax*h, '#ffffff', Math.abs(Math.sin(tsiner/8)*.5) + .2); }
  }
  if(G.tpShow > 20 && G.tpShow < CFG.tpMax) spr('spr_tensionmarker', 0, x + 3, y + h - cur*h, 1, 1);
  spr('spr_tensionbar', 0, x, y, 1, 1);
  spr('spr_tplogo', 0, x - 30, y + 30, 1, 1);
  if(!maxed){ gText(String(Math.floor(app*100)), x - 30, y + 70); gText('%', x - 25, y + 95); }
  else { gText('M', x - 28, y + 70, '#ffff00'); gText('A', x - 24, y + 90, '#ffff00'); gText('X', x - 20, y + 110, '#ffff00'); }
};
const typed = (str, x = 30, y = 376) => wrap(str, 33).forEach((ln, i) => gText(ln, x, y + i*32, '#ffffff', 'fnt_mainbig', 1, 16));
window.drawMsg = function(){ const m = G.msg; if(!m) return; typed(m.lines[m.i].slice(0, m.n)); };
// scr_iteminfo (lang_en.json)
const ITEM_INFO = { 'Dark Candy': 'Heals#40HP', 'ChocDiamond': 'Healing#varies', 'ReviveMint': 'Heal#Downed#Ally', 'Top Cake': 'Heals#team#160HP', 'Spincake': 'Heals#team#80HP', 'Darkburger': 'Heals#70HP', 'HeartsDonut': 'Healing#varies', 'Favwich': 'Heals#ALL HP' };
window.drawMenuText = function(){
  const M = G.menu; if(!M) return;
  const P = G.party[M.cur];
  if(!M.sub){ typed(G.flavor.slice(0, G.flavorN)); return; }
  const s = M.sub;
  const heart = (x, y) => spr('spr_heart', 0, x, y, 1, 1, 0, 1, '#ff0000');
  if(s.kind === 'enemy'){
    gText('Jevil', 80, 375, G.tired ? '#00b2ff' : '#ffffff');
    heart(55, 385);
    if(G.tired) gText('(Tired)', 80 + gWidth('Jevil') + 20, 375, '#00b2ff');
    gText('HP', 424, 364, '#ffffff', 'fnt_main');
    rect(420, 380, 81, 16, '#800000'); rect(420, 380, Math.ceil(G.jevil.hp/G.jevil.max*80) + 1, 16, '#00ff00');
    gText(Math.ceil(G.jevil.hp/G.jevil.max*100) + '%', 424, 381, '#ffffff', 'fnt_main');
    gText('MERCY', 524, 364, '#ffffff', 'fnt_main');
    rect(520, 380, 81, 16, '#ff5020'); gText('0%', 524, 381, '#800000', 'fnt_main');
    return;
  }
  if(s.kind === 'party'){
    G.party.forEach((q, i) => {
      gText(q.name[0] + q.name.slice(1).toLowerCase(), 80, 375 + i*30);
      rect(400, 380 + i*30, 101, 16, '#800000');
      if(q.hp > 0) rect(400, 380 + i*30, Math.ceil(q.hp/q.max*100) + 1, 16, HPCOLOR[q.id]);
    });
    // item de equipe: todos ficam selecionados
    if(s.all) G.party.forEach((q, i) => heart(55, 385 + i*30)); else heart(55, 385 + M.sel*30);
    return;
  }
  const list = s.kind === 'act' ? ACTS.map(a => ({ label: a.name, desc: a.desc, tp: a.tp, off: !actUsable(a), helpers: a.helpers }))
    : s.kind === 'item' ? G.items.map(n => ({ label: n, desc: ITEM_INFO[n] }))
    : SPELLS[P.id].map(sp => ({ label: sp.name, desc: sp.desc, tp: sp.tp, off: sp.tp > G.tp }));
  // 2 colunas x 3 linhas; a lista rola de linha em linha e mostra setas
  const row = Math.floor(M.sel/2), rows = Math.ceil(list.length/2);
  M.top = Math.max(0, Math.min(M.top || 0, row, rows - 3)); if(row > M.top + 2) M.top = row - 2;
  list.forEach((o, i) => {
    const r = Math.floor(i/2) - M.top; if(r < 0 || r > 2) return;
    let x = 30 + (i % 2)*230; const y = 375 + r*30;
    // obj_battlecontroller Draw: spr_headsusie em x, spr_headralsei em x+30, tamanho normal; o texto anda 36 (65 com os dois).
    // Os dois ícones usam a cor da Susie (cinza se ela não puder agir), como no jogo.
    if(o.helpers){
      const sus = G.party.find(q => q.id === 'susie'), sc = sus.hp <= 0 ? '#808080' : null;
      const ids = o.helpers.map(hh => G.party[hh].id);
      if(ids.includes('susie') && ids.includes('ralsei')){ spr('spr_headsusie', 0, x, y, 1, 1, 0, 1, sc); spr('spr_headralsei', 0, x + 30, y, 1, 1, 0, 1, sc); x += 65; }
      else { spr(ids[0] === 'susie' ? 'spr_headsusie' : 'spr_headralsei', 0, x, y, 1, 1, 0, 1, sc); x += 36; }
    }
    gText(o.label, x, y, o.off ? '#808080' : '#ffffff');
  });
  heart(M.sel % 2 ? 240 : 10, 385 + (row - M.top)*30);
  const bob = Math.sin(G.t/6)*2;
  ctx.fillStyle = '#ffffff';
  if(M.top > 0){ ctx.beginPath(); ctx.moveTo(470, 372 - bob); ctx.lineTo(478, 380 - bob); ctx.lineTo(462, 380 - bob); ctx.fill(); }
  if(M.top + 3 < rows){ ctx.beginPath(); ctx.moveTo(470, 452 + bob); ctx.lineTo(478, 444 + bob); ctx.lineTo(462, 444 + bob); ctx.fill(); }
  const o = list[M.sel];
  if(o && o.desc){
    tr(o.desc).split('#').forEach((ln, k) => gText(ln, 500, 375 + k*30, '#808080'));
  }
  if(o && o.tp) gText(Math.floor(o.tp/CFG.tpMax*100) + '% TP', 500, 440, '#ffa040');
};

/* ------------------------------ FIGHT ---------------------------------- */
const mixW = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.round(c + (255 - c)*Math.max(0, Math.min(1, k))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join(''); };
const BOLTCOL = { kris: '#80ffff', susie: '#ff80ff', ralsei: '#80ff80' };
window.drawQTE = function(){
  const Q = G.qte, X = 2, Y = 365;
  for(let i = 0; i < 3; i++){
    const p = G.party[i];
    if(i > 0) rect(X, Y + 38*i, 301, 3, '#000080');
    if(!Q.who.includes(i)) continue;
    const col = Q.press[p.id] > 0 ? mixW(PRESSCOLOR[p.id], Q.press[p.id]/5) : PRESSCOLOR[p.id];
    strokeR(X + 78, Y + 38*i, 123, 37, col, 1);
    strokeR(X + 79, Y + 38*i + 1, 121, 35, col, 1);
    spr('spr_pressfront', i, X, Y + 38*i, 1, 1);
    spr('spr_pressfront_b', 0, X, Y + 38*i, 1, 1);
    spr('spr_pressspot', i, X + 80, Y + 38*i, 1, 1);
  }
  const row = w => Y + 38*w;
  Q.trail = Q.trail.filter(t => { t.a -= .04; if(t.a <= 0) return false; spr('spr_attackspot', 0, X + 80 + t.d*8, row(t.who), 1, 1, 0, t.a); return true; });
  for(const b of Q.bolts){
    if(!b.alive) continue;
    const c = b.frame - Q.bx;
    spr('spr_attackspot', 0, X + 80 + c*8, row(b.who), 1, 1, 0, c < 0 ? 1 + c/3 : 1);
  }
  Q.bursts = Q.bursts.filter(u => {
    u.t++; const sc = 1 + u.t*(u.crit ? .2 : .1), a = 1 - u.t/12; if(a <= 0) return false;
    const id = G.party[u.who].id;
    spr('spr_attackspot', 0, X + 80 + u.d*8 - 5*(sc - 1), row(u.who) - 19*(sc - 1), sc, sc, 0, a, u.crit ? '#ffff00' : BOLTCOL[id]);
    return true;
  });
  if(Q.fade > 0) rect(X - 1, Y - 1, 641, 301, '#000', Math.min(1, Q.fade));
};

/* ------------------------- caixa, coração, balas ------------------------- */
window.drawBox = function(){
  const X = G.box; if(!X || X.gone) return;
  const e = X.open;
  // cavalos de trás do carrossel: depth 21, ficam atrás da caixa (só aparecem fora dela)
  for(const b of G.bullets) if(b.kind === 'horse' && isBackHorse(b)) drawB(b);
  boxShape(BOX.cx, BOX.cy, BOX.w*e, BOX.h*e, Math.PI*(1 - e), X.alpha);
};
const gmAng = b => -b.ang / D;
const horseSign = b => Math.sin(b.siner/20) - Math.sin((b.siner - 1)/20);
const isBackHorse = b => horseSign(b) > 0;
const PELLET = ['spr_clubsball_a', 'spr_clubsball_b', 'spr_clubsball_c'];
function drawB(b){
  const fa = b.fadeIn ? Math.min(1, b.t/b.fadeIn) : 1, a = b.alpha*fa;
  switch(b.kind){
    case 'spade': spr('spr_spadebullet', 0, b.x, b.y, b.s <= 5 ? .4 : 1, b.s <= 5 ? .4 : 1, gmAng(b), a, b.gray ? '#c0c0c0' : null); break;
    case 'ldiamond': { const sc = b.s <= 7 ? .7 : 1; spr('spr_diamondbullet', 0, b.x, b.y, sc, sc, gmAng(b), a); break; }
    case 'heart': spr('spr_heartbullet', 0, b.x, b.y, 1, 1, 0, a); break;
    case 'club': spr('spr_clubsbullet', 0, b.x, b.y, 1, 1, gmAng(b), a); break;
    case 'pellet': spr(PELLET[b.pi], 0, b.x + b.ox, b.y + b.oy, 1, 1, b.pang, a); break;
    case 'vdiamond': { const al = Math.min(1, b.t/10); if(al < 1) spr('spr_diamondbullet_vert', 0, b.x, b.y, 3 - al*2, 3 - al*2, 0, al*b.alpha); spr('spr_diamondbullet_vert', 0, b.x, b.y, 2 - al, 2 - al, 0, al*b.alpha); break; }
    case 'darkclub': spr('spr_clubsbullet_dark', 0, b.x, b.y, 1, 1, b.gdir || 0, b.alpha); break;
    case 'bomb': spr('spr_bomb_' + b.btype, b.vy === 0 ? Math.floor(b.t/2) : 0, b.x, b.y, 2, 2); break;
    case 'horse': {
      const xs = Math.max(-2, Math.min(2, horseSign(b)*50));
      spr('spr_carousel', 0, b.x, b.y, xs, 2, 0, a, isBackHorse(b) ? '#808080' : null);
      break;
    }
    case 'knife': spr('spr_joker_scythebody', 0, b.x, b.y, 1, 1, -b.rot/D, a); break;
    // foice do type 76: spr_joker_scythebody com image_blend 255 (vermelho)
    case 'bigknife': spr('spr_joker_scythebody', 0, b.x, b.y, 2, 2, -b.rot/D, a, '#ff0000'); break;
    case 'scythe': spr('spr_joker_scythebody', 0, b.x, b.y, 2, 2, -b.rot/D, 1); break;
    case 'laser': spr('spr_tallpx', 0, b.x, 0, b.xs, 1, 0, b.harm ? 1 : Math.max(0, b.xs/16)); break;
    case 'giant': spr('spr_joker_scythebody', 0, b.x + rand(-3, 3), b.y + rand(-3, 3), 16, 16, 160, 1); break;
    case 'tele': {
      // obj_joker_teleport: gira para dentro (frame 0), abre a boca ao atirar (frame 1),
      // gira para fora esticando na vertical; versão _r quando está na metade esquerda
      const s = b.sc || 0, out = b.t > 23 ? Math.min(5, b.t - 23) : 0;
      if(!b._snd){ b._snd = 1; snd('snd_swing'); }
      if(b.t >= 13 && b._snd === 1){ b._snd = 2; snd('snd_joker_oh'); }
      if(b.t > 23 && b._snd === 2){ b._snd = 3; snd('snd_swing'); }
      spr(b.x < 320 ? 'spr_joker_teleport_r' : 'spr_joker_teleport', b.t >= 13 ? 1 : 0, b.x, b.y, s*2, 2 + .2*out, 0, 1);
      break;
    }
    default: if(b.draw) b.draw(b);
  }
}
window.drawBullets = function(){ for(const b of G.bullets) if(!(b.kind === 'horse' && isBackHorse(b))) drawB(b); };
const _drawField = window.drawField;
window.drawField = function(){
  const X = G.box, S = G.soul; if(!X) return;
  if(G.dark > 0) rect(0, 0, W, H, '#000', G.dark);
  drawBullets();
  if(!(X.closing && X.open < .5)){
    const sx = S.enter < 1 ? lerp(S.sx, S.x, S.enter) : S.x, sy = S.enter < 1 ? lerp(S.sy, S.y, S.enter) : S.y;
    const blink = S.iframe > 0 && Math.floor(S.iframe/2) % 2 === 0;
    spr('spr_heart', 0, Math.round(sx - 8), Math.round(sy - 8), 1, 1, 0, blink ? .5 : 1, '#ff0000');
    if(S.graze > 0){ spr('spr_grazeappear', 0, sx, sy, 1, 1, 0, S.graze/6); spr('spr_grazeappear', 3, sx, sy, 1, 1, 0, S.graze/6 - .2); }
  }
  if(G.white > 0) rect(0, 0, W, H, '#ffffff', Math.min(1, G.white));
};

/* ------------------------- balão e números ----------------------------- */
window.drawBubble = function(){
  const b = G.bubble; if(!b) return;
  const lines = wrap(b.lines[b.i], 15), shown = b.n;
  const stringmax = Math.max(...lines.map(l => l.length));
  const bw = stringmax*9 + 10, bh = lines.length*20 + 5;
  const x = G.jevil.x - 20 - bw, y = G.jevil.y + 30;
  const wx = x + 5, wy = y + 3 - bh/2;
  rect(wx - 10, wy - 5, bw + 10, bh, '#ffffff'); rect(wx - 5, wy - 10, bw, bh + 10, '#ffffff');
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(wx + bw - 2, wy + bh/2 - 8); ctx.lineTo(wx + bw + 14, wy + bh/2); ctx.lineTo(wx + bw - 2, wy + bh/2 + 8); ctx.fill();
  let n = shown;
  lines.forEach((ln, i) => { const part = ln.slice(0, Math.max(0, n)); n -= ln.length + 1; [...part].forEach((ch, j) => gText(ch, wx + j*9, wy + i*20, '#000000', 'fnt_dotumche')); });
};
const NUMS = '0123456789';
// obj_rudebuster_anim (Susie, 28 passos) -> obj_rudebuster_bolt no passo 10
const angDiff = (a, b) => ((a - b + 540) % 360) - 180;
function busterFX(f){
  const P = f.who, J = G.jevil, tx = J.x + 40, ty = J.y + 40;
  if(f.t === 10){
    snd('snd_rudebuster_swing');
    const x = P.x + 40, y = P.y + 30;
    f.bolt = { x, y, dir: Math.atan2(-(ty - y), tx - x)/D - 20, sp: 24, a: 0, age: 0, live: true };
    f.trail = []; f.burst = [];
  }
  const b = f.bolt;
  if(b && b.live){
    b.a = Math.min(1, b.a + .25);
    if(b.age >= 1){
      const want = Math.atan2(-(ty - b.y), tx - b.x)/D;
      b.dir += angDiff(want, b.dir)/4;
      if(Math.hypot(tx - b.x, ty - b.y) <= 40){
        b.live = false; f.boom = 0;
        f.onHit(f); snd('snd_rudebuster_hit'); if(f.chosen) snd('snd_scytheburst');
        for(let i = 0; i < 8; i++) f.burst.push({ x: tx, y: ty, ang: 45 + i*90, sp: 25, xs: 2, a: 1, fr: 0, k: i < 4 ? .75 : .8 });
      }
    }
    if(b.live){
      f.trail.push({ x: b.x, y: b.y, ang: b.dir, ys: 1.8, a: b.a - .2 });
      b.x += Math.cos(b.dir*D)*b.sp; b.y -= Math.sin(b.dir*D)*b.sp; b.sp += 1.5; b.age++;
    }
  }
  if(f.trail) f.trail = f.trail.filter(t => {
    t.ys -= .1; t.a -= .04; if(b && !b.live){ t.a -= .07; t.ys *= .9; }
    if(t.ys <= .1 || t.a <= 0) return false;
    spr('spr_rudebuster_beam', 4, t.x, t.y, 2, t.ys, t.ang, t.a); return true;
  });
  if(b && b.live) spr('spr_rudebuster_beam', b.age, b.x, b.y, 2, 2, b.dir, b.a);
  if(f.burst){
    if(f.boom !== undefined) f.boom++;
    f.burst = f.burst.filter(q => {
      if(f.boom >= 2){ q.sp *= q.k; q.xs *= .8; }
      q.x += Math.cos(q.ang*D)*q.sp; q.y -= Math.sin(q.ang*D)*q.sp; q.fr += .5; q.a -= .04;
      if(q.a <= 0) return false;
      spr('spr_rudebuster_beam', q.fr, q.x, q.y, q.xs, 2, q.ang, q.a); return true;
    });
  }
  return f.t < 28 || (b && b.live) || (f.trail && f.trail.length) || (f.burst && f.burst.length);
}
const busterAnim = () => G.fx.find(f => f.kind === 'buster' && f.t < 28);
window.drawFX = function(){
  G.fx = G.fx.filter(f => {
    f.t++;
    if(f.kind === 'boom'){ ctx.globalAlpha = Math.max(0, Math.min(1, 1.5 - f.t/10)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, 23 + f.t*2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; return f.t < 15; }
    if(f.kind === 'hypno'){
      // obj_hypnofx: 4 anéis (spr_hypnoring) de tamanho 1+0.5i girando em raio 2+12i; aparecem em 12 passos, somem do 24 ao 38
      if(f.t === 1){ const s0 = Math.random()*400; f.r = [0, 1, 2, 3].map(i => ({ size: 1 + .5*i, rad: 2 + i*12, a: 0, sin: s0 })); }
      if(f.t >= 2) f.r.forEach((r, i) => {
        r.sin += (i + 2)*r.a;
        if(f.t < 12 && r.a < 1) r.a += .2;
        if(f.t >= 24) r.a -= .1;
        spr('spr_hypnoring', 0, f.x + Math.sin(r.sin/12)*r.rad, f.y + Math.cos(r.sin/12)*r.rad, r.size, r.size, 0, r.a);
      });
      return f.t < 38;
    }
    if(f.kind === 'bird'){ const x = -20 + f.t*12; ctx.fillStyle = '#fff'; ctx.fillRect(x, 90 + Math.sin(f.t*.5)*6, 8, 4); return x < W + 20; }
    if(f.kind === 'buster') return busterFX(f);
    return false;
  });
  // obj_dmgwriter
  G.nums = G.nums.filter(n => {
    if(!n.init){ Object.assign(n, { init: true, ys: n.y, vy: 0, hs: 0, bo: 0, st: .2, sg: true, kill: 0, kt: 0, ka: false, dl: 0 }); }
    n.t++; if(n.t < 0) return true;
    if(n.t === 1){ n.vy = -5 - Math.random()*2; n.hs = 10; n.v0 = n.vy; }
    n.x += n.hs; n.y += n.vy; if(n.hs > 0) n.hs--;
    if(n.bo < 2) n.vy += 1;
    if(n.y > n.ys && n.bo < 2 && !n.ka){ n.y = n.ys; n.vy = n.v0/2; n.bo++; }
    if(n.bo >= 2 && !n.ka){ n.vy = 0; n.y = n.ys; }
    if(n.sg) n.st += .4; if(n.st >= 1.2){ n.st = 1; n.sg = false; }
    if(++n.kt > 35) n.ka = true;
    if(n.ka){ n.kill += .08; n.y -= 4; }
    const xs = 2 - n.st, ys = n.st + n.kill, col = n.col === '#fff' ? null : n.col, alpha = 1 - n.kill;
    const msg = { MISS: 0, DOWN: 1, MAX: 2, UP: 3 }[n.txt];
    if(msg !== undefined) spr('spr_battlemsg', msg, n.x + 30, n.y, xs, ys, 0, alpha, col);
    else {
      const str = String(n.txt), ws = [...str].map(ch => glyphWidth('spr_numbersfontbig', Math.max(0, NUMS.indexOf(ch))));
      let cx = n.x + 30 - ws.reduce((a, b) => a + b, 0)*xs;
      [...str].forEach((ch, i) => { const f = NUMS.indexOf(ch); if(f >= 0) spr('spr_numbersfontbig', f, cx, n.y, xs, ys, 0, alpha, col); cx += ws[i]*xs; });
    }
    return n.kill <= 1;
  });
};

/* ---------------------------- game over -------------------------------- */
window.drawHeartBreak = function(){
  const Lo = G.lose, t = G.loseT;
  if(t < 30){ ctx.drawImage(Lo.shot, 0, 0); return; }
  rect(0, 0, W, H, '#000000');
  if(t < 50) spr('spr_heart', 0, Lo.x, Lo.y, 1, 1, 0, 1, '#ff0000');
  else if(t < 90) spr('spr_heartbreak', 0, Lo.x - 2, Lo.y, 1, 1, 0, 1, '#ff0000');
  else for(const q of Lo.shards) spr('spr_heartshards', q.f, q.x, q.y, 1, 1, 0, 1, '#ff0000');
};

/* ------------------------------ título --------------------------------- */
const _drawTitle = window.drawTitle;
window.drawTitle = function(){
  _drawTitle();
};
SPR.jevil = (() => { const s = META.sprites.spr_joker_main, c = document.createElement('canvas'); c.width = s.w*2; c.height = s.h*2; return c; })();

/* ------------------------------ início --------------------------------- */
window.__LOCAL_READY = load().then(() => {
  // sprite grande do Jevil no título
  const s = META.sprites.spr_joker_main, g = SPR.jevil.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(IMG.spr_joker_main, 0, 0, s.w, s.h, 0, 0, s.w*2, s.h*2);
  const hs = META.sprites.spr_heart, hc = document.createElement('canvas'); hc.width = 16; hc.height = 16;
  hc.getContext('2d').drawImage(frameCanvas('spr_heart', 0, '#ff0000', false), 0, 0); SPR.soul = hc;
});
})();

// O jogo desenha uma vez por passo (30 fps). Sem isso, telas de 60/144 Hz
// avançam as animações que andam no draw 2 a 5 vezes mais rápido.
{
  const _draw = window.draw; let lastT = -1;
  window.draw = function(){ if(G.t === lastT) return; lastT = G.t; _draw(); };
}

// obj_grazebox: spr_grazemask 50x50 (colisão precisa), centrada em obj_heart + 10 = centro do coração + 2.
// Linhas da máscara: [x0, x1] de cada uma das 50 linhas.
const GRAZE_ROWS = [[8,41],[7,42],[6,43],[5,44],[4,45],[3,46],[2,47],[1,48]].concat(Array(23).fill([0,49]),
  [[1,48],[2,47],[3,46],[4,45],[5,44],[6,43],[7,42],[8,41],[9,40],[10,39],[11,38],[12,37],[13,36],[14,35],[15,34],[16,33],[17,32],[18,31],[19,30]]);
window.grazeRect = function(b, px, py){
  const c = Math.abs(Math.cos(b.ang)), sn = Math.abs(Math.sin(b.ang));
  const ex = b.hw*c + b.hh*sn, ey = b.hw*sn + b.hh*c, gx = px + 2 - 25, gy = py + 2 - 25;
  if(b.x + ex < gx || b.x - ex > gx + 50 || b.y + ey < gy || b.y - ey > gy + 50) return false;
  const cs = Math.cos(-b.ang), si = Math.sin(-b.ang);
  for(let r = 0; r < 50; r++){
    const wy = gy + r + .5; if(wy < b.y - ey || wy > b.y + ey) continue;
    const [x0, x1] = GRAZE_ROWS[r];
    for(let mx = x0; mx <= x1; mx++){
      const dx = gx + mx + .5 - b.x, dy = wy - b.y;
      if(Math.abs(dx*cs - dy*si) <= b.hw && Math.abs(dx*si + dy*cs) <= b.hh) return true;
    }
  }
  return false;
};
