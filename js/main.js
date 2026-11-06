// Xplore Prokletije – the launcher. A 3D copy of the printed AR cube floats over the Prokletije skyline; each roll of
// the cube brings the next app's little scene up on its top face. Tap the cube (or Otvori) to dive into the app.
import * as THREE from '../vendor/three/three.module.min.js';
import { RoomEnvironment } from '../vendor/three/addons/environments/RoomEnvironment.js';
import { APPS, EXTRA, UI, LANGS, detectLang, appUrl } from './apps.js';
import { Sky } from './sky.js';
import { Cube } from './cube.js';
import { Logo3D } from './logo.js';
import { clamp, lerp, easeOut, easeInOut, easeBack, range, LightRing, Sparkles } from './fx.js';
import * as sound from './sound.js';
import { startScan, stopScan } from './scan.js';
import * as muzej from './scenes/muzej.js';
import * as mapa from './scenes/mapa.js';
import * as kocka from './scenes/kocka.js';
import * as slagalica from './scenes/slagalica.js';
import * as staze from './scenes/staze.js';
import * as mace from './scenes/mace.js';

const VERSION = '1.0.0';
const MAKERS = { muzej, mapa, kocka, slagalica, staze, mace };
const $ = (s, r = document) => r.querySelector(s);
const Q = new URLSearchParams(location.search);
const DEBUG = Q.has('debug');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || Q.get('motion') === '0';

let lang = detectLang();
const t = (k) => (UI[lang] && UI[lang][k]) ?? UI.en[k] ?? k;
const tx = (o) => (o && (o[lang] || o.me || o.en)) || '';
const hooks = { goTo: () => {}, dive: () => {} };

// ---------- WebGL or the plain list ----------
function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const canvas = $('#gl');
let renderer = null;
if (!Q.has('no3d') && webglOK()) {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { console.warn(e); renderer = null; }
}

// ---------- texts ----------
function applyTexts() {
  document.documentElement.lang = t('htmlLang');
  document.title = 'Xplore Prokletije';
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of document.querySelectorAll('[data-ta]')) el.setAttribute('aria-label', t(el.dataset.ta));
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  buildList();
  setSheet(0, true);
  const sb = $('#soundBtn'); sb.setAttribute('aria-pressed', String(sound.soundOn())); sb.setAttribute('aria-label', t('sound'));
}
function setLang(l) {
  lang = l;
  try { localStorage.setItem('xp.lang', l); } catch { /* storage blocked */ }
  applyTexts();
}

function buildList() {
  const ul = $('#listItems'); ul.innerHTML = '';
  const item = (a, i) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = appUrl(a, lang); link.className = 'litem'; link.style.setProperty('--c', a.color);
    link.innerHTML = '<span class="chip"></span><span class="ltxt"><b></b><small></small></span><span class="go" aria-hidden="true">↗</span>';
    link.querySelector('b').textContent = tx(a.name);
    link.querySelector('small').textContent = tx(a.play);
    if (a.soon) { const s = document.createElement('em'); s.className = 'badge'; s.textContent = t('test'); link.querySelector('b').append(' ', s); }
    if (i != null) link.addEventListener('click', (e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault(); closeList(); hooks.goTo(i, () => hooks.dive()); });
    li.append(link); return li;
  };
  APPS.forEach((a, i) => ul.append(item(a, renderer ? i : null)));
  const sep = document.createElement('li'); sep.className = 'sep'; ul.append(sep);
  EXTRA.forEach((a) => ul.append(item(a, null)));
  $('#partners').textContent = t('partners').join(' · ');
}

// ---------- sheet ----------
let current = Q.get('app') ? Math.max(0, APPS.findIndex((a) => a.id === Q.get('app'))) : 0;
function setSheet(dir, instant) {
  const a = APPS[current], sheet = $('#sheet');
  sheet.style.setProperty('--accent', a.color);
  $('.count', sheet).textContent = `${current + 1} ${t('of')} ${APPS.length}`;
  $('.play', sheet).textContent = tx(a.play);
  $('.name', sheet).textContent = tx(a.name);
  $('.desc', sheet).textContent = tx(a.desc);
  const open = $('#openBtn'); open.href = appUrl(a, lang);
  open.setAttribute('aria-label', `${t('open')}: ${tx(a.name)}`);
  document.querySelectorAll('.dots button').forEach((b, i) => { b.setAttribute('aria-current', i === current ? 'true' : 'false'); b.style.setProperty('--c', APPS[i].color); });
  if (!instant && !reduced && sheet.animate) {
    for (const el of [$('.name', sheet), $('.desc', sheet), $('.meta', sheet)]) {
      el.animate([{ opacity: 0, transform: `translateX(${dir * 26}px)` }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }
  prefetchLater();
}
let pfTimer = 0; const prefetched = new Set();
function prefetchLater() {
  clearTimeout(pfTimer);
  pfTimer = setTimeout(() => {
    const u = APPS[current].url; if (prefetched.has(u)) return; prefetched.add(u);
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = u; document.head.append(l);
  }, 1500);
}

// ---------- dots ----------
const dots = $('.dots');
APPS.forEach((a, i) => {
  const b = document.createElement('button'); b.type = 'button';
  b.addEventListener('click', () => hooks.goTo(i));
  dots.append(b);
});
function updateDotLabels() { dots.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-label', tx(APPS[i].name))); }

// ---------- list overlay ----------
const listEl = $('#list');
function openList() { listEl.hidden = false; requestAnimationFrame(() => listEl.classList.add('on')); $('#listClose').focus(); }
function closeList() { listEl.classList.remove('on'); setTimeout(() => { if (!listEl.classList.contains('on')) listEl.hidden = true; }, 280); }
$('#listBtn').addEventListener('click', openList);
$('#listClose').addEventListener('click', closeList);
listEl.addEventListener('click', (e) => { if (e.target === listEl) closeList(); });

for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => { setLang(b.dataset.lang); updateDotLabels(); });
$('#soundBtn').addEventListener('click', () => { sound.unlock(); sound.setSound(!sound.soundOn()); $('#soundBtn').setAttribute('aria-pressed', String(sound.soundOn())); });

applyTexts(); updateDotLabels();

if (!renderer) {
  document.body.classList.add('no3d', 'ready');
  $('#listClose').hidden = true;
  openList();
  $('#openBtn').addEventListener('click', () => {});
} else {
  await start3d();
}

// =====================================================================================================
// 3D
// =====================================================================================================
async function start3d() {
const isPhone = matchMedia('(pointer: coarse)').matches;
let maxDpr = Math.min(window.devicePixelRatio || 1, isPhone ? 2 : 2);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.autoClear = false;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = env; scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
const PITCH = 24 * Math.PI / 180, AIM = new THREE.Vector3(0, 0.26, 0);
const camBase = new THREE.Vector3();

const hoursQ = Q.get('t') != null ? parseFloat(Q.get('t')) : null;
const [skyData, cubeData, logoSvg] = await Promise.all([
  fetch('data/skyline.json').then((r) => r.json()),
  fetch('data/cube.json').then((r) => r.json()),
  fetch('icons/logo.svg').then((r) => r.text()),
]);
const sky = new Sky(scene, skyData, { hours: hoursQ, season: Q.get('season') });
const key = sky.key;
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 0.5, far: 12 });
key.shadow.bias = -0.0008; key.shadow.normalBias = 0.01;

const cube = new Cube(cubeData, env);
scene.add(cube.root);
cube.night = sky.night;

// logo pass
const logo = new Logo3D(logoSvg);
logo.setNight(sky.night);

function applyMood() {
  const n = sky.night;
  document.documentElement.dataset.mood = n > 0.5 ? 'night' : 'day';
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = '#' + sky.pal.top.getHexString();
}
applyMood();

// ---------- the six scenes ----------
const ctx = {
  env,
  night: () => sky.night,
  snowy: () => sky.snowy,
  sfx: (n) => sound.sfx(n),
};
const slots = APPS.map((a, i) => {
  const holder = new THREE.Group(), lift = new THREE.Group();
  holder.add(lift);
  const plane = new THREE.Plane();
  const slot = { app: a, i, holder, lift, plane, state: 'off', k: 0, owned: new Map() };
  const sctx = { ...ctx, clipNew: (obj) => clipTo(obj, slot) };
  slot.s = MAKERS[a.id].create(sctx);
  lift.add(slot.s.group);
  clipTo(slot.s.group, slot);
  holder.visible = false;
  return slot;
});
// every material under obj clips against this slot's plane (shared materials are copied per slot)
function clipTo(obj, slot) {
  obj.traverse((o) => {
    if (!o.material) return;
    const one = (m) => {
      if (m.userData.slot != null && m.userData.slot !== slot.i) {
        if (!slot.owned.has(m)) { const c = m.clone(); c.userData = { slot: slot.i }; slot.owned.set(m, c); }
        m = slot.owned.get(m);
      }
      if (m.userData.slot !== slot.i || m.clippingPlanes?.[0] !== slot.plane) {
        m.userData.slot = slot.i; m.clippingPlanes = [slot.plane]; m.clipShadows = true; m.needsUpdate = true;
      }
      return m;
    };
    o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
  });
}
const ring = new LightRing(0xb9ffd2, 0.48); scene.add(ring.mesh);
const burst = new Sparkles(50, 0xc8ffe0, 0.04); scene.add(burst.points);

// ---------- layout ----------
let W = 1, H = 1, dpr = 1, hfov = 0.5;
function layout() {
  W = window.innerWidth; H = window.innerHeight;
  dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
  const st = $('#stage').getBoundingClientRect();
  const sw = Math.max(120, st.width), sh = Math.max(160, st.height);
  camera.aspect = W / H;
  const tf = Math.tan(camera.fov * Math.PI / 360);
  const dH = H * 2.6 / (sh * 2 * tf), dW = W * 2.3 / (sw * 2 * tf * camera.aspect);
  const d = Math.max(dH, dW, 3.2);
  camBase.set(0, Math.sin(PITCH), Math.cos(PITCH)).multiplyScalar(d).add(AIM);
  camera.position.copy(camBase); camera.lookAt(AIM);
  camera.setViewOffset(W, H, W / 2 - (st.left + sw / 2), H / 2 - (st.top + sh / 2), W, H);
  camera.updateProjectionMatrix();
  hfov = 2 * Math.atan(tf * camera.aspect);
  sky.layout(camera, PITCH, hfov);
  logo.resize(W, H);
  const ls = $('#logoSlot').getBoundingClientRect();
  logo.target = { x: ls.left + ls.width / 2, y: ls.top + ls.height / 2, w: ls.width };
  logo.center = { x: W / 2, y: H * 0.3, w: Math.min(W * 0.84, 560) };
}
new ResizeObserver(() => layout()).observe(document.body);
addEventListener('orientationchange', () => setTimeout(layout, 200));
layout();

// ---------- state ----------
let k = current;                  // roll count (the anchor on top is k mod 4)
let roll = { from: k * Math.PI / 2, to: k * Math.PI / 2, t: 1, dir: 0 };
let introT = 0, introOn = true, uiShown = false, diveT = -1, diveApp = null;
let drag = null, dragAngle = 0, tiltX = 0, tiltY = 0, motionX = 0, motionY = 0;
let hinted = false;
let seen = false;
try { seen = sessionStorage.getItem('xp.intro') === '1'; } catch { /* storage blocked */ }
if (Q.get('intro') === '1') seen = false;
if (reduced || seen || Q.get('intro') === '0') introT = 2.35;
try { sessionStorage.setItem('xp.intro', '1'); } catch { /* storage blocked */ }
if (introT > 0) { logo.move = 1; for (const p of logo.pieces) p.delay = Math.min(p.delay, 0); }
cube.led = 0; cube.ledTarget = 0;

function showSlot(slot, kk, t0) {
  slot.k = kk; slot.state = 'rise'; slot.t = 0;
  cube.anchorFor(kk).add(slot.holder);
  slot.holder.visible = true;
  slot.lift.position.y = -slot.s.depth;
  slot.s.start?.(t0);
}

// roll the cube by dir (+1 = next app, -1 = previous)
function rollBy(dir, fromAngle) {
  if (introOn || diveT >= 0) return;
  const out = slots[current];
  if (out.state !== 'off') { out.state = 'sink'; out.t = 0; }
  current = (current + dir + APPS.length) % APPS.length;
  k += dir;
  roll = { from: fromAngle ?? cube.roll, to: k * Math.PI / 2, t: 0, dir };
  const inc = slots[current];
  if (inc.state !== 'off' && inc !== out) { inc.holder.visible = false; inc.state = 'off'; }
  inc.pending = true;
  setSheet(dir);
  sound.sfx('roll');
  hideHint();
}
function goTo(i, then) {
  if (i === current) { then?.(); return; }
  const n = APPS.length, fwd = (i - current + n) % n, dir = fwd <= n / 2 ? 1 : -1;
  const steps = dir > 0 ? fwd : n - fwd;
  // several steps: roll once, the scene on top is the chosen one
  const out = slots[current];
  if (out.state !== 'off') { out.state = 'sink'; out.t = 0; }
  current = i; k += dir;
  roll = { from: cube.roll, to: k * Math.PI / 2 + (steps > 1 ? 0 : 0), t: 0, dir };
  slots[current].pending = true;
  if (slots[current].state !== 'off') { slots[current].holder.visible = false; slots[current].state = 'off'; }
  setSheet(dir); sound.sfx('roll'); hideHint();
  if (then) setTimeout(then, reduced ? 250 : 900);
}
function hideHint() { if (!hinted) { hinted = true; $('#hint').classList.add('gone'); } }

// ---------- dive into the app ----------
function dive() {
  if (diveT >= 0 || introOn) return;
  diveApp = APPS[current]; diveT = 0;
  const d = $('#dive'); d.style.setProperty('--c', diveApp.color); d.classList.add('on');
  sound.sfx('open');
  if (navigator.vibrate) navigator.vibrate(12);
}
function finishDive() {
  location.href = appUrl(diveApp, lang);
}
addEventListener('pageshow', (e) => {
  if (diveT >= 0 || e.persisted) {
    diveT = -1; $('#dive').classList.remove('on');
    camera.position.copy(camBase); camera.fov = 30; layout();
  }
});

$('#openBtn').addEventListener('click', (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  e.preventDefault(); sound.unlock(); dive();
});
$('#prev').addEventListener('click', () => { sound.unlock(); rollBy(-1); });
$('#next').addEventListener('click', () => { sound.unlock(); rollBy(1); });
addEventListener('keydown', (e) => {
  if (!listEl.hidden || !$('#scan').hidden) { if (e.key === 'Escape') { closeList(); closeScan(); } return; }
  if (e.target.closest && e.target.closest('input,textarea,select')) return;
  if (introOn) { skipIntro(); return; }
  if (e.key === 'ArrowRight') { rollBy(1); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { rollBy(-1); e.preventDefault(); }
});

// ---------- scan the real cube ----------
const scanEl = $('#scan');
$('#scanBtn').addEventListener('click', () => {
  sound.unlock();
  startScan({
    el: scanEl, t, sfx: sound.sfx,
    apps: APPS.map((a) => ({ ...a, title: tx(a.name) })),
    onFace: () => {},
    onPick: (a) => { const i = APPS.findIndex((x) => x.id === a.id); closeScan(); goTo(i, () => dive()); },
  });
});
function closeScan() { if (!scanEl.hidden) stopScan(scanEl); }
$('#scanClose').addEventListener('click', closeScan);

// ---------- drag the cube ----------
const stage = $('#stage');
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
stage.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  sound.unlock();
  if (introOn) { skipIntro(); return; }
  drag = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, moved: 0, base: cube.roll, vx: 0, lx: e.clientX, lt: performance.now() };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
  drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
  drag.vx = (e.clientX - drag.lx) / Math.max(1, now - drag.lt); drag.lx = e.clientX; drag.lt = now;
  const ref = Math.max(160, stage.clientWidth * 0.55);
  let a = -dx / ref * (Math.PI / 2);
  const lim = Math.PI / 2 * 0.95;
  if (Math.abs(a) > lim * 0.6) a = Math.sign(a) * (lim * 0.6 + (Math.abs(a) - lim * 0.6) * 0.35);
  dragAngle = clamp(a, -lim, lim);
  tiltY = clamp(dy / 300, -1, 1);
  if (drag.moved > 6) hideHint();
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  tiltY = 0;
  const ref = Math.max(160, stage.clientWidth * 0.55);
  const frac = dragAngle / (Math.PI / 2), fling = -d.vx;
  const from = k * Math.PI / 2 + dragAngle;
  dragAngle = 0;
  if (d.moved < 8 && performance.now() - d.t < 450) {
    // a tap: on the cube or its scene -> open
    const r = stage.getBoundingClientRect();
    ndc.set(((e.clientX) / W) * 2 - 1, -((e.clientY) / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const targets = [cube.body, slots[current].holder];
    if (ray.intersectObjects(targets, true).length) dive();
    void r;
    return;
  }
  if (frac > 0.28 || fling > 0.45) rollBy(1, from);
  else if (frac < -0.28 || fling < -0.45) rollBy(-1, from);
  else roll = { from, to: k * Math.PI / 2, t: 0, dir: 0 };
  void ref;
};
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

// gyro parallax where the phone has a gyroscope (Android sends rates without asking)
addEventListener('devicemotion', (e) => {
  const r = e.rotationRate; if (!r || r.alpha == null) return;
  const dt = (e.interval || 16) / 1000 > 1 ? e.interval / 1000 / 1000 : (e.interval || 16) / 1000;
  motionX = clamp(motionX + (r.beta || 0) * dt * 0.02, -1, 1);
  motionY = clamp(motionY + (r.alpha || 0) * dt * 0.02, -1, 1);
});

// ---------- intro ----------
function skipIntro() {
  if (!introOn) return;
  introT = Math.max(introT, 2.45); logo.move = 1;
  for (const p of logo.pieces) p.delay = Math.min(p.delay, introT - p.dur - 0.01);
}
function showUI() {
  if (uiShown) return; uiShown = true;
  document.body.classList.add('ready');
  if (!reduced) $('#hint').classList.add('show');
}

// ---------- loop ----------
let last = performance.now(), T = 0, fpsAcc = 0, fpsN = 0, fpsT = 0, lowSince = 0;
const dbg = DEBUG ? $('#dbg') : null; if (dbg) dbg.hidden = false;
const tmpV = new THREE.Vector3();
function frame(now) {
  const dt = Math.min(DEBUG ? 0.3 : 0.05, (now - last) / 1000); last = now; T += dt;
  // intro timeline
  if (introOn) {
    introT += dt;
    logo.move = Math.max(logo.move, easeInOut(range(introT, 1.45, 2.25)));
    const pr = range(introT, 1.05, 2.45);
    cube.setPrint(pr < 1 ? pr : -1);
    if (pr > 0 && pr < 1 && Math.random() < 0.35) sound.sfx('print');
    if (introT >= 2.3) showUI();
    if (introT >= 2.45 && cube.ledTarget === 0) {
      cube.ledTarget = 1; ring.mesh.position.set(0, cube.root.position.y + 0.5, 0); ring.fire(); sound.sfx('chime');
      burst.burst(new THREE.Vector3(0, 0.55, 0), 0.6, 0.9);
    }
    if (introT >= 2.65) {
      introOn = false; cube.setPrint(-1);
      showSlot(slots[current], k, T); roll = { from: k * Math.PI / 2, to: k * Math.PI / 2, t: 1, dir: 0 };
      cube.roll = k * Math.PI / 2;
    }
  }
  // roll animation
  if (roll.t < 1) {
    roll.t = Math.min(1, roll.t + dt / (reduced ? 0.25 : 0.62));
    const e = roll.dir ? easeBack(roll.t, 1.15) : easeOut(roll.t);
    cube.roll = lerp(roll.from, roll.to, e);
    cube.hop = roll.dir && !reduced ? Math.sin(Math.min(1, roll.t * 1.1) * Math.PI) * 0.16 : 0;
    if (roll.t >= 1) {
      cube.hop = 0;
      if (roll.dir) { sound.sfx('land'); if (navigator.vibrate) navigator.vibrate(8); }
    }
    const inc = slots[current];
    if (inc.pending && roll.t > (reduced ? 0.6 : 0.78)) { inc.pending = false; showSlot(inc, k, T); sound.sfx('rise'); }
  } else if (!introOn) {
    cube.roll += (k * Math.PI / 2 + dragAngle - cube.roll) * clamp(dt * (drag ? 18 : 10));
  }
  // camera: slow drift + drag tilt + gyro
  tiltX += ((drag ? -dragAngle * 0.12 : 0) + motionX * 0.5 - tiltX) * clamp(dt * 4);
  motionX *= 1 - clamp(dt * 0.8); motionY *= 1 - clamp(dt * 0.8);
  const ox = Math.sin(T * 0.13) * 0.08 + tiltX * 0.35 + motionY * 0.25, oy = Math.sin(T * 0.11 + 1) * 0.04 + tiltY * 0.25;
  if (diveT < 0) {
    camera.position.copy(camBase).add(tmpV.set(ox, oy, 0));
    camera.lookAt(AIM);
  }
  // dive
  if (diveT >= 0) {
    diveT += dt;
    const dk = easeInOut(clamp(diveT / 0.75));
    const slot = slots[current];
    const top = slot.holder.getWorldPosition(tmpV).clone(); top.y += 0.18;
    camera.position.lerpVectors(camBase, top.clone().add(new THREE.Vector3(0, 0.25, 0.35)), dk * 0.92);
    camera.lookAt(AIM.clone().lerp(top, dk));
    camera.fov = 30 - dk * 8; camera.updateProjectionMatrix();
    if (diveT > (reduced ? 0.25 : 0.72) && diveT - dt <= (reduced ? 0.25 : 0.72)) finishDive();
  }
  // scenes
  for (const slot of slots) {
    if (slot.state === 'off') continue;
    slot.t += dt;
    if (slot.state === 'rise') {
      const r = clamp(slot.t / (reduced ? 0.2 : 0.75));
      slot.lift.position.y = -slot.s.depth * (1 - easeBack(r, 1.25));
      if (slot.t < dt * 1.5 && !reduced) {
        const p = new THREE.Vector3(0, 0.505 + cube.root.position.y, 0);      // where the face lands
        ring.mesh.position.copy(p); ring.fire();
        burst.burst(p, 0.45, 0.7);
      }
      if (r >= 1) slot.state = 'on';
    } else if (slot.state === 'sink') {
      const s = clamp(slot.t / (reduced ? 0.15 : 0.3));
      slot.lift.position.y = -slot.s.depth * easeOut(s) * 1.05;
      if (s >= 1) { slot.state = 'off'; slot.holder.visible = false; }
    }
    cube.facePlane(slot.holder, slot.plane);
    slot.s.update(T, dt, camera);
  }
  cube.night = sky.night;
  cube.update(T, dt);
  ring.update(dt); burst.update(dt);
  sky.update(T, dt, camera, dpr);
  // draw
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  logo.update(dt, introOn ? introT : 9 + T, { x: tiltX * 0.6 + ox * 0.5, y: oy });
  renderer.render(logo.scene, logo.camera);
  // performance guard: lower resolution, then shadows, if the phone can't keep up
  if (T > 4) {
    fpsAcc += dt; fpsN++;
    if (T - fpsT > 2) {
      const fps = fpsN / fpsAcc; fpsT = T; fpsAcc = 0; fpsN = 0;
      if (dbg) dbg.textContent = `${fps.toFixed(0)} fps · dpr ${dpr} · ${renderer.info.render.calls} calls · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris`;
      if (fps < 26) {
        if (++lowSince >= 2) {
          lowSince = 0;
          if (maxDpr > 1.01) { maxDpr = Math.max(1, maxDpr - 0.35); layout(); }
          else if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); }); }
        }
      } else lowSince = 0;
    }
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) renderer.setAnimationLoop(null);
  else { last = performance.now(); renderer.setAnimationLoop(frame); }
});
renderer.setAnimationLoop(frame);
document.body.classList.add('live');
// compile every scene's shaders in the background, so the first roll to each one doesn't stutter
if (renderer.compileAsync) {
  const park = new THREE.Group(); park.position.y = -500; scene.add(park);
  for (const s of slots) if (s.state === 'off') { park.add(s.holder); s.holder.visible = true; }
  renderer.compileAsync(scene, camera).catch(() => {}).finally(() => {
    for (const s of slots) if (s.holder.parent === park) { park.remove(s.holder); if (s.state === 'off') s.holder.visible = false; }
    scene.remove(park);
  });
}
if (DEBUG) window.__xp = { slots, cube, camera, sky, logo, scene, renderer, THREE, go: (i) => goTo(i), roll: (d) => rollBy(d), dive: () => dive(), time: (h) => { sky.setTime(new Date(), h); logo.setNight(sky.night); applyMood(); } };
// update the sky every few minutes (the light follows the real time of day)
setInterval(() => { if (hoursQ == null) { sky.setTime(new Date()); logo.setNight(sky.night); applyMood(); } }, 5 * 60 * 1000);
console.info('Xplore Prokletije launcher', VERSION);
hooks.goTo = goTo; hooks.dive = dive;
}

// service worker (offline, installable)
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
