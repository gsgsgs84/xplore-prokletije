// Small shared helpers: easing, canvas textures, glow sprites, sparkle bursts, rings of light.
import * as THREE from '../vendor/three/three.module.min.js';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeBack = (t, s = 1.7) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
export const range = (t, a, b) => clamp((t - a) / (b - a));

// Seeded random, so scenes look the same every time
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const cache = new Map();
function canvasTex(key, w, h, draw, opts = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

// Soft round glow (white; tint it with the material colour)
export function glowTex() {
  return canvasTex('glow', 128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,0.55)');
    r.addColorStop(0.45, 'rgba(255,255,255,0.14)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}

// Small hard dot for particles
export function dotTex() {
  return canvasTex('dot', 64, 64, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}

// Soft cloud / mist band (tiles horizontally)
export function mistTex() {
  return canvasTex('mist', 512, 128, (g, w, h) => {
    const R = rng(11);
    for (let i = 0; i < 70; i++) {
      const x = R() * w, y = h * (0.35 + R() * 0.35), r = 20 + R() * 46;
      for (const dx of [-w, 0, w]) {
        const gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x + dx - r, y - r, r * 2, r * 2);
      }
    }
  }, { repeat: true });
}

// Stone / grass / wood noise texture
export function noiseTex(key, base, vary, opts = {}) {
  const size = opts.size || 256;
  return canvasTex('n:' + key, size, size, (g, w) => {
    const R = rng(opts.seed || 3);
    const img = g.createImageData(w, w);
    for (let i = 0; i < w * w; i++) {
      const n = (R() - 0.5) * vary, sp = opts.specks && R() < opts.specks ? -vary : 0;
      img.data[i * 4] = base[0] + n + sp; img.data[i * 4 + 1] = base[1] + n + sp; img.data[i * 4 + 2] = base[2] + n + sp; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.globalAlpha = 0.5; g.drawImage(g.canvas, 1, 0); g.drawImage(g.canvas, 0, 1); g.globalAlpha = 1;
    if (opts.draw) opts.draw(g, w, R);
  }, { repeat: true });
}

export { canvasTex };

// Additive glow sprite
export function glowSprite(color, size, opacity = 1) {
  const m = new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  const s = new THREE.Sprite(m); s.scale.setScalar(size); return s;
}

// A burst of sparkles that rise and fade (reused; call burst() to fire again)
export class Sparkles {
  constructor(n = 40, color = 0xfff1c4, size = 0.045) {
    this.n = n;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.life = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({ map: dotTex(), color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false;
    this.t = 9; this.R = rng(5);
  }
  burst(center = new THREE.Vector3(), spread = 0.25, up = 0.6) {
    const R = this.R;
    for (let i = 0; i < this.n; i++) {
      const a = R() * Math.PI * 2, r = R() * spread;
      this.pos.set([center.x + Math.cos(a) * r * 0.4, center.y + R() * 0.05, center.z + Math.sin(a) * r * 0.4], i * 3);
      this.vel.set([Math.cos(a) * r * 1.6, up * (0.4 + R()), Math.sin(a) * r * 1.6], i * 3);
      this.life[i] = 0.6 + R() * 0.7;
    }
    this.t = 0; this.points.geometry.attributes.position.needsUpdate = true;
  }
  update(dt) {
    if (this.t > 2) { this.mat.opacity = 0; return; }
    this.t += dt;
    for (let i = 0; i < this.n; i++) {
      this.vel[i * 3 + 1] -= dt * 0.9;
      for (let k = 0; k < 3; k++) this.pos[i * 3 + k] += this.vel[i * 3 + k] * dt;
    }
    this.mat.opacity = clamp(1 - this.t / 1.4);
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

// Flat ring of light that expands and fades (reveal effect)
export class LightRing {
  constructor(color = 0xfff0c8, r = 0.5) {
    this.mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.RingGeometry(r * 0.92, r, 64), this.mat);
    this.mesh.rotation.x = -Math.PI / 2; this.t = 9;
  }
  fire() { this.t = 0; }
  update(dt) {
    this.t += dt;
    const k = clamp(this.t / 0.9);
    this.mesh.scale.setScalar(0.4 + easeOut(k) * 0.9);
    this.mat.opacity = this.t > 0.9 ? 0 : (1 - k) * 0.9;
  }
}

// Vertical beam of light (additive, fades upwards)
export function beam(color, r, h) {
  const tex = canvasTex('beam', 8, 128, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, 0, hh);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0.9)');
    g.fillStyle = gr; g.fillRect(0, 0, w, hh);
  });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 20, 1, true),
    new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.geometry.translate(0, h / 2, 0);
  return m;
}

// Apply clipping planes to every material under a group (the "rise out of the cube" effect)
export function setClip(obj, planes) {
  obj.traverse((o) => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) { m.clippingPlanes = planes; m.clipShadows = true; m.needsUpdate = true; }
  });
}

// Text on a canvas texture (for engraved plates etc.)
export function textTex(key, text, opts = {}) {
  const w = opts.w || 512, h = opts.h || 128;
  return canvasTex('t:' + key + text, w, h, (g) => {
    g.fillStyle = opts.bg || '#b8863b'; g.fillRect(0, 0, w, h);
    if (opts.bevel !== false) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
    g.font = opts.font || `600 ${Math.round(h * 0.42)}px Marcellus, Georgia, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,240,210,0.5)'; g.fillText(text, w / 2, h / 2 + 2);
    g.fillStyle = opts.ink || '#3b2610'; g.fillText(text, w / 2, h / 2);
  });
}
