// Small synthesised sounds (no files): roll thunk, rise shimmer, open whoosh, little dings.
let ac = null, master = null, on = true;
try { on = localStorage.getItem('xp.sound') !== '0'; } catch { /* storage blocked */ }

export function soundOn() { return on; }
export function setSound(v) {
  on = v;
  try { localStorage.setItem('xp.sound', v ? '1' : '0'); } catch { /* storage blocked */ }
  if (master) master.gain.value = v ? 0.5 : 0;
}
// Must be called from a user gesture the first time
export function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC(); master = ac.createGain(); master.gain.value = on ? 0.5 : 0; master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}

function env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(freq, type, t, a, d, peak, to) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + a + d);
  env(g, t, a, d, peak); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + d + 0.05);
}
function noise(t, dur, f0, f1, peak, q = 1) {
  const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = b;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain(); env(g, t, dur * 0.35, dur * 0.65, peak);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur);
}

export function sfx(name) {
  if (!ac || !on || ac.state !== 'running') return;
  const t = ac.currentTime + 0.01;
  switch (name) {
    case 'roll': noise(t, 0.28, 500, 180, 0.35, 0.8); tone(110, 'sine', t + 0.2, 0.005, 0.22, 0.5, 70); break;
    case 'land': tone(140, 'sine', t, 0.004, 0.18, 0.45, 80); noise(t, 0.08, 1200, 400, 0.12); break;
    case 'rise': [660, 880, 1320].forEach((f, i) => tone(f, 'sine', t + i * 0.07, 0.01, 0.5, 0.08)); break;
    case 'open': noise(t, 0.6, 300, 4000, 0.4, 0.6); tone(330, 'triangle', t + 0.05, 0.02, 0.5, 0.1, 990); break;
    case 'ding': tone(1568, 'sine', t, 0.005, 0.6, 0.07); tone(2093, 'sine', t + 0.06, 0.005, 0.5, 0.05); break;
    case 'tick': tone(2400, 'square', t, 0.002, 0.03, 0.02); break;
    case 'click': tone(900, 'triangle', t, 0.002, 0.08, 0.15, 500); tone(1760, 'sine', t + 0.05, 0.005, 0.4, 0.06); break;
    case 'meow': { const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(620, t); o.frequency.linearRampToValueAtTime(880, t + 0.12); o.frequency.linearRampToValueAtTime(520, t + 0.45);
      f.type = 'bandpass'; f.frequency.setValueAtTime(1200, t); f.frequency.linearRampToValueAtTime(1800, t + 0.15); f.frequency.linearRampToValueAtTime(900, t + 0.45); f.Q.value = 3;
      env(g, t, 0.05, 0.4, 0.12); o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5); break; }
    case 'chime': [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', t + i * 0.09, 0.01, 0.9, 0.06)); break;
    case 'print': tone(1800 + Math.random() * 600, 'square', t, 0.001, 0.02, 0.008); break;
    default: break;
  }
}

// A glassy chime for the menu: one note per row (pentatonic, so any order sounds good) plus a soft sparkle
const NOTES = [784, 880, 1047, 1175, 1319, 1568];
export function chime(i = 0) {
  if (!ac || !on) return;
  if (ac.state !== 'running') { ac.resume().then(() => { if (ac.state === 'running') chime(i); }).catch(() => {}); return; }
  const t = ac.currentTime + 0.005, f = NOTES[i % NOTES.length];
  const out = ac.createGain(); out.gain.value = 0.9; out.connect(master);
  const echo = ac.createDelay(); echo.delayTime.value = 0.13;
  const fb = ac.createGain(); fb.gain.value = 0.28;
  echo.connect(fb); fb.connect(echo); echo.connect(out);
  for (const [mul, peak, dec] of [[1, 0.16, 1.1], [2.01, 0.05, 0.6], [3.98, 0.025, 0.35], [0.5, 0.05, 0.8]]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * mul, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g); g.connect(out); g.connect(echo); o.start(t); o.stop(t + dec + 0.05);
  }
  noise(t, 0.25, 6000, 9000, 0.05, 2);
  setTimeout(() => { try { fb.disconnect(); echo.disconnect(); out.disconnect(); } catch { /* already gone */ } }, 2500);
}
