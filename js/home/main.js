// Xplore Prokletije – home. One WebGL canvas over the page draws three things into their HTML boxes:
// the scanned mountain header, the living logo, and a live 3D thumbnail in every menu row.
import * as THREE from '../../vendor/three/three.module.min.js';
import { RoomEnvironment } from '../../vendor/three/addons/environments/RoomEnvironment.js';
import { APPS, UI, LANGS, detectLang, appUrl } from '../apps.js';
import { ORDER, TAGS, HOME } from './texts.js';
import { MountainScan } from './scan.js';
import { LogoOriginal } from './logo3d.js';
import * as sound from '../sound.js';

const $ = (s, r = document) => r.querySelector(s);
const Q = new URLSearchParams(location.search);
const DEBUG = Q.has('debug');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || Q.get('motion') === '0';
const T_FIX = Q.get('t') != null ? parseFloat(Q.get('t')) : null;           // freeze the header loop at this second (tests)
let lang = detectLang();
const app = (id) => APPS.find((a) => a.id === id);
const rows = [...document.querySelectorAll('.row')];

// ---------- texts ----------
function applyTexts() {
  document.documentElement.lang = UI[lang].htmlLang;
  for (const el of document.querySelectorAll('[data-h]')) el.textContent = HOME[lang][el.dataset.h];
  $('#partners').textContent = UI[lang].partners.join(' · ');
  rows.forEach((r) => {
    const a = app(r.dataset.app);
    $('b', r).textContent = a.name[lang]; $('small', r).textContent = TAGS[a.id][lang];
    r.href = appUrl(a, lang);
    r.setAttribute('aria-label', `${a.name[lang]}: ${TAGS[a.id][lang]}`);
  });
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
}
for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => {
  lang = b.dataset.lang;
  try { localStorage.setItem('xp.lang', lang); } catch { /* storage blocked */ }
  applyTexts();
});
rows.forEach((r, i) => { r.style.setProperty('--i', i); r.style.setProperty('--d', (0.55 + i * 0.09).toFixed(2)); r.style.setProperty('--c', app(r.dataset.app).color); });
$('.soon').style.setProperty('--d', '1.05'); $('.credits').style.setProperty('--d', '1.15');
applyTexts();

// ---------- opening an app: sound, glow, then go ----------
let thumbs = [];
let opening = false;
rows.forEach((r, i) => {
  let chimed = 0;
  r.addEventListener('pointerdown', () => { sound.unlock(); sound.chime(i); chimed = performance.now(); r.classList.add('press'); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) r.addEventListener(ev, () => r.classList.remove('press'));
  r.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && thumbs[i]) thumbs[i].hoverTo = 1; });
  r.addEventListener('pointerleave', () => { if (thumbs[i]) thumbs[i].hoverTo = 0; });
  r.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    e.preventDefault();
    if (opening) return;
    opening = true;
    if (performance.now() - chimed > 400) { sound.unlock(); sound.chime(i); }
    r.classList.add('glow');
    thumbs[i]?.burst();
    if (navigator.vibrate) navigator.vibrate(12);
    const rc = r.getBoundingClientRect(), veil = $('#veil');
    veil.style.setProperty('--x', `${rc.left + rc.width * 0.3}px`); veil.style.setProperty('--y', `${rc.top + rc.height / 2}px`);
    veil.style.setProperty('--c', app(r.dataset.app).color);
    setTimeout(() => veil.classList.add('on'), reduced ? 80 : 620);
    setTimeout(() => { location.href = r.href; }, reduced ? 250 : 980);
  });
});
addEventListener('pageshow', () => {
  opening = false; $('#veil').classList.remove('on');
  rows.forEach((r) => r.classList.remove('glow', 'press'));
});

// ---------- WebGL ----------
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
if (Q.has('no3d') || !webglOK()) {
  document.body.classList.add('no3d', 'ready');
  rows.forEach((r) => $('.thumb', r).style.setProperty('--img', `url(assets/thumbs/${r.dataset.app}.png)`));
} else {
  start().catch((e) => {
    console.error(e);
    document.body.classList.remove('live'); document.body.classList.add('no3d', 'ready');
  });
}

async function start() {
  const canvas = $('#gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  const isPhone = matchMedia('(pointer: coarse)').matches;
  let maxDpr = Math.min(window.devicePixelRatio || 1, 2);
  const tl = new THREE.TextureLoader();
  const [photo, mask, data, svg] = await Promise.all([
    tl.loadAsync('assets/scan-photo.jpg'), tl.loadAsync('assets/scan-mask.png'),
    fetch('data/scan.json').then((r) => r.json()), fetch('icons/logo.svg').then((r) => r.text()),
  ]);
  const scan = new MountainScan({ photo, mask, data, paper: '#f5f3ee' });
  const logo = new LogoOriginal(svg); logo.reduced = reduced;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    W = window.innerWidth; H = window.innerHeight; dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  };
  resize();
  addEventListener('resize', resize);
  new ResizeObserver(resize).observe(document.documentElement);

  const hero = $('#hero'), logoBox = $('#logo');
  const boxes = rows.map((r) => $('.thumb .gl', r));
  const draw = (rc, scene, camera) => {
    if (rc.bottom < 0 || rc.top > H || rc.width < 2 || rc.height < 2) return false;
    const x = rc.left, y = H - rc.bottom;
    renderer.setViewport(x, y, rc.width, rc.height); renderer.setScissor(x, y, rc.width, rc.height);
    renderer.clearDepth();
    renderer.render(scene, camera);
    return true;
  };

  document.body.classList.add('live');
  const t0 = performance.now();
  let last = t0, T = 0, introStart = 0.1;
  let lastHeroSize = '', lastLogoSize = '';
  // thumbnails come after the first frames, so the header and logo appear at once
  setTimeout(async () => {
    const { Thumb } = await import('./thumbs.js');
    thumbs = ORDER.map((id, i) => {
      const th = new Thumb(id, i, env, app(id).color);
      th.hoverTo = 0; th.bornAt = null;
      return th;
    });
  }, reduced ? 0 : 250);

  let fpsT = 0, fpsN = 0, fpsAcc = 0, slow = 0;
  const dbg = DEBUG ? $('#dbg') : null; if (dbg) dbg.hidden = false;
  let fixT = null;                                   // tests and preview videos: drive every animation from one clock
  if (DEBUG) window.__home = { scan, logo, get thumbs() { return thumbs; }, renderer, THREE, fix: (x) => { fixT = x; } };

  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    let tt = (now - t0) / 1000;
    if (fixT != null) { dt = fixT - (frame.prev ?? fixT); frame.prev = fixT; tt = fixT + 10; T = 0; }
    // header
    const hr = hero.getBoundingClientRect();
    const hs = `${hr.width}x${hr.height}x${dpr}`;
    if (hs !== lastHeroSize) { scan.setSize(hr.width, hr.height, dpr, [0.0, 0.42]); lastHeroSize = hs; }
    scan.update(fixT != null ? fixT : T_FIX != null ? T_FIX : reduced ? 0.5 : tt);
    // logo
    const lr = logoBox.getBoundingClientRect();
    const ls = `${lr.width}x${lr.height}`;
    if (ls !== lastLogoSize) { logo.resize(lr.width, lr.height); lastLogoSize = ls; }
    const intro = reduced ? 1 : (tt - introStart) / 1.5;
    logo.update(tt, intro);
    if (intro > 0.35 && !document.body.classList.contains('ready')) document.body.classList.add('ready');
    // draw
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H); renderer.clear(true, true, true);
    renderer.setScissorTest(true);
    draw(hr, scan.scene, scan.camera);
    draw(lr, logo.scene, logo.camera);
    thumbs.forEach((th, i) => {
      const rc = boxes[i].getBoundingClientRect();
      if (th.bornAt == null) th.bornAt = tt;
      const appearAt = reduced ? 0 : Math.max(0, 0.55 + i * 0.09 - (th.bornAt - introStart)) ;
      th.appear = reduced ? 1 : Math.min(1, Math.max(0, (tt - th.bornAt - appearAt + 0.1) / 0.7));
      th.hover += ((th.hoverTo || 0) - th.hover) * Math.min(1, dt * 6);
      if (rc.bottom < 0 || rc.top > H) return;
      th.update(reduced ? 1.5 : tt, reduced ? 0 : dt, rc.width / rc.height);
      draw(rc, th.scene, th.camera);
    });
    // keep it smooth on slow phones: lower the resolution step by step
    if (T > 3) {
      fpsAcc += dt; fpsN++;
      if (T - fpsT > 2) {
        const fps = fpsN / fpsAcc; fpsT = T; fpsAcc = 0; fpsN = 0;
        if (dbg) dbg.textContent = `${fps.toFixed(0)} fps · dpr ${dpr.toFixed(2)} · ${renderer.info.render.calls} calls`;
        if (fps < 40 && isPhone !== null) { if (++slow >= 2 && maxDpr > 1.01) { slow = 0; maxDpr = Math.max(1, maxDpr - 0.35); resize(); } } else slow = 0;
      }
    }
  }
  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else { last = performance.now(); renderer.setAnimationLoop(frame); }
  });
}

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
void LANGS;
