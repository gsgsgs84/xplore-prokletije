// The original Xplore Prokletije logo, exactly as drawn: every shape comes straight from icons/logo.svg, in its own
// colours, unlit. It only moves: the emblem (the kula with its QR blocks and base) sways gently on its axis like a
// turning sign, and the letters ride a calm wave. At rest it is pixel-for-pixel the logo.
import * as THREE from '../../vendor/three/three.module.min.js';
import { parsePath, toShapes, LW, LH } from '../logo.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeBack = (t, s = 1.7) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };

export class LogoOriginal {
  constructor(svgText) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(12, 2.4, 10, 40000);
    this.group = new THREE.Group(); this.scene.add(this.group);
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const mats = new Map();
    const mat = (hex) => {
      if (!mats.has(hex)) {
        const side = new THREE.Color(hex).multiplyScalar(0.55);
        mats.set(hex, [new THREE.MeshBasicMaterial({ color: hex, toneMapped: false }), new THREE.MeshBasicMaterial({ color: side, toneMapped: false })]);
      }
      return mats.get(hex);
    };
    // the emblem turns about its own centre
    const emb = []; let ex0 = 1e9, ex1 = -1e9, ey0 = 1e9, ey1 = -1e9;
    for (const el of doc.querySelectorAll('path')) for (const s of toShapes(parsePath(el.getAttribute('d')))) {
      if (s.box[0] < 480) { emb.push({ s, fill: el.getAttribute('fill') }); ex0 = Math.min(ex0, s.box[0]); ex1 = Math.max(ex1, s.box[2]); ey0 = Math.min(ey0, s.box[1]); ey1 = Math.max(ey1, s.box[3]); }
    }
    const ecx = (ex0 + ex1) / 2 - LW / 2, ecy = LH / 2 - (ey0 + ey1) / 2;
    this.emblem = new THREE.Group(); this.emblem.position.set(ecx, ecy, 0); this.group.add(this.emblem);
    for (const { s, fill } of emb) {
      const geo = new THREE.ExtrudeGeometry(s.shape, { depth: 12, bevelEnabled: false, curveSegments: 1 });
      geo.translate(-ecx, -ecy, -6);
      this.emblem.add(new THREE.Mesh(geo, mat(fill)));
    }
    // letters, one mesh each, for the wave
    this.letters = [];
    for (const el of doc.querySelectorAll('path')) {
      const fill = el.getAttribute('fill');
      for (const s of toShapes(parsePath(el.getAttribute('d')))) {
        if (s.box[0] < 480) continue;
        const cx = (s.box[0] + s.box[2]) / 2 - LW / 2, cy = LH / 2 - (s.box[1] + s.box[3]) / 2;
        const geo = new THREE.ExtrudeGeometry(s.shape, { depth: 10, bevelEnabled: false, curveSegments: 1 });
        geo.translate(-cx, -cy, -5);
        const m = new THREE.Mesh(geo, mat(fill)); m.position.set(cx, cy, 0);
        this.group.add(m);
        this.letters.push({ m, x: cx, y: cy, order: 0 });
      }
    }
    this.letters.sort((a, b) => a.x - b.x || b.y - a.y).forEach((l, i) => { l.order = i; });
    this.reduced = false;
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    const tan = Math.tan((this.camera.fov * Math.PI) / 360);
    const d = Math.max((LW * 1.04) / 2 / tan / this.camera.aspect, (LH * 1.16) / 2 / tan);
    this.camera.position.set(0, 0, d); this.camera.lookAt(0, 0, 0);
    this.camera.near = d * 0.6; this.camera.far = d * 1.6;
    this.camera.updateProjectionMatrix();
  }

  update(t, intro = 1) {
    const k = clamp(intro), still = this.reduced;
    // emblem: appears with a small rise, then sways +-13 degrees and floats a little
    const e = easeBack(clamp(k / 0.5), 1.3);
    this.emblem.scale.setScalar(Math.max(0.001, 0.85 + 0.15 * e));
    this.emblem.traverse((o) => { if (o.material) o.visible = k > 0; });
    this.emblem.rotation.y = still ? 0 : Math.sin(t * 0.55) * 0.23 * clamp(k * 2 - 0.4) - (1 - easeOut(clamp(k / 0.6))) * 0.9;
    this.emblem.position.y = (this.emblem.userData.y0 ??= this.emblem.position.y) + (still ? 0 : Math.sin(t * 1.1) * 3);
    // letters: drop in one by one, then a calm travelling wave
    const A = still ? 0 : 5.5, w = 1.2, kx = (Math.PI * 2) / 600;
    for (const L of this.letters) {
      const drop = clamp((k - 0.3 - L.order * 0.03) / 0.4);
      const ph = t * w - L.x * kx;
      L.m.position.y = L.y + Math.sin(ph) * A + (1 - easeOut(drop)) * 120;
      L.m.rotation.z = -Math.cos(ph) * A * kx * 0.9;
      L.m.visible = drop > 0;
    }
  }
}
