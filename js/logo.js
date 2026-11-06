// The Xplore Prokletije logo in 3D: built from the vector logo, its QR blocks fly in and snap together,
// the tower rises and the letters drop into place. Drawn in its own pass over the main scene, in screen pixels.
import * as THREE from '../vendor/three/three.module.min.js';
import { clamp, easeOut, easeBack, easeInOut, range, rng, lerp } from './fx.js';

const LW = 1152, LH = 472;
const INK = new THREE.Color('#1d1f22'), CREAM = new THREE.Color('#f4efe4'), BLUE = new THREE.Color('#1a66f0'), BLUE_N = new THREE.Color('#4f8dff');

function parsePath(d) {
  const polys = []; let cur = null;
  const re = /([MLZ])\s*([-\d.]+)?[ ,]?([-\d.]+)?/gi; let m;
  while ((m = re.exec(d))) {
    const c = m[1].toUpperCase();
    if (c === 'M') { cur = [[+m[2], +m[3]]]; polys.push(cur); }
    else if (c === 'L') cur.push([+m[2], +m[3]]);
  }
  return polys.filter((p) => p.length > 2);
}
const area = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] - p[i][0]) * (p[j][1] + p[i][1]); return a / 2; };
function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// even-odd: a ring inside an odd number of others is a hole of its closest parent
function toShapes(polys) {
  const items = polys.map((p) => ({ p, a: Math.abs(area(p)) })).sort((a, b) => b.a - a.a);
  for (let i = 0; i < items.length; i++) {
    const it = items[i]; it.parents = [];
    for (let j = 0; j < i; j++) if (inside(it.p[0], items[j].p)) it.parents.push(items[j]);
    it.depth = it.parents.length;
  }
  const solids = items.filter((it) => it.depth % 2 === 0);
  const shapes = [];
  for (const s of solids) {
    const v = (p) => p.map(([x, y]) => new THREE.Vector2(x - LW / 2, LH / 2 - y));
    const shape = new THREE.Shape(v(s.p));
    for (const h of items) if (h.depth === s.depth + 1 && h.parents[h.parents.length - 1] === s) shape.holes.push(new THREE.Path(v(h.p)));
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const [x, y] of s.p) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    shapes.push({ shape, box: [minX, minY, maxX, maxY], a: s.a });
  }
  return shapes;
}

export class Logo3D {
  constructor(svgText) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 10, 20000);
    this.group = new THREE.Group(); this.scene.add(this.group);
    this.inkMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.38, metalness: 0.15 });
    this.blueMat = new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.3, metalness: 0.2, emissive: BLUE, emissiveIntensity: 0.12 });
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(-300, 500, 900); this.scene.add(dl);
    this.shine = new THREE.PointLight(0xffffff, 0, 900, 0); this.scene.add(this.shine);
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const R = rng(9);
    this.pieces = [];
    for (const el of doc.querySelectorAll('path')) {
      const fill = (el.getAttribute('fill') || '').toLowerCase(), cls = el.getAttribute('class') || '';
      const blue = fill === '#1a66f0' || cls.includes('lb');
      for (const s of toShapes(parsePath(el.getAttribute('d')))) {
        const g = new THREE.ExtrudeGeometry(s.shape, { depth: blue ? 16 : 12, bevelEnabled: false, curveSegments: 1 });
        const cx = (s.box[0] + s.box[2]) / 2 - LW / 2, cy = LH / 2 - (s.box[1] + s.box[3]) / 2;
        g.translate(-cx, -cy, 0);
        const mesh = new THREE.Mesh(g, blue ? this.blueMat : this.inkMat);
        const emblem = s.box[2] < 480;
        const kind = emblem ? (blue ? (s.box[3] > 380 && (s.box[2] - s.box[0]) > 120 ? 'base' : 'block') : 'tower') : 'letter';
        const a = R() * Math.PI * 2, dist = 500 + R() * 500;
        const p = {
          mesh, kind, home: new THREE.Vector3(cx, cy, 0), x: s.box[0],
          from: new THREE.Vector3(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist * 0.7, 300 + R() * 900),
          rot: new THREE.Euler((R() - 0.5) * 6, (R() - 0.5) * 6, (R() - 0.5) * 4), delay: 0, dur: 0.6,
        };
        this.group.add(mesh); this.pieces.push(p);
      }
    }
    // timing
    const blocks = this.pieces.filter((p) => p.kind === 'block').sort((a, b) => a.home.y - b.home.y);
    blocks.forEach((p, i) => { p.delay = 0.05 + i * (0.42 / blocks.length); p.dur = 0.62; });
    for (const p of this.pieces.filter((q) => q.kind === 'base')) { p.delay = 0.3; p.dur = 0.55; p.from.set(p.home.x, p.home.y - 160, 0); p.rot.set(0, 0, 0); }
    for (const p of this.pieces.filter((q) => q.kind === 'tower')) { p.delay = 0.42; p.dur = 0.55; p.from.set(p.home.x, p.home.y - 60, 0); p.rot.set(0, 0, 0); }
    const letters = this.pieces.filter((p) => p.kind === 'letter').sort((a, b) => a.x - b.x);
    letters.forEach((p, i) => { p.delay = 0.62 + i * 0.035; p.dur = 0.5; p.from.set(p.home.x, p.home.y + 140, 60); p.rot.set(-1.2, 0, 0); });
    this.t = 0; this.done = false; this.night = 0;
    this.pos = new THREE.Vector2(); this.width = 300;
    this.target = { x: 0, y: 0, w: 300 }; this.center = { x: 0, y: 0, w: 300 };
    this.move = 0;           // 0 = at the intro position, 1 = in the header slot
    this.glint = -1;
  }

  resize(W, H) {
    this.W = W; this.H = H;
    this.camera.aspect = W / H;
    const dist = H / 2 / Math.tan(15 * Math.PI / 180);
    this.camera.position.set(W / 2, -H / 2, dist); this.camera.lookAt(W / 2, -H / 2, 0);
    this.camera.near = dist * 0.2; this.camera.far = dist * 3;
    this.camera.updateProjectionMatrix();
  }

  setNight(n) {
    this.night = n;
    const k = Math.min(1, Math.max(0, (n - 0.55) / 0.3));
    this.inkMat.color.copy(INK).lerp(CREAM, k * k * (3 - 2 * k));
    this.blueMat.color.copy(BLUE).lerp(BLUE_N, k * 0.7); this.blueMat.emissive.copy(this.blueMat.color); this.blueMat.emissiveIntensity = 0.12 + n * 0.3;
  }

  skip() { this.t = Math.max(this.t, 2); }

  // t: seconds since the intro started
  update(dt, introT, tilt = { x: 0, y: 0 }) {
    this.t = introT;
    for (const p of this.pieces) {
      const k = range(introT, p.delay, p.delay + p.dur);
      const e = p.kind === 'block' ? easeBack(k, 1.4) : p.kind === 'letter' ? easeBack(k, 2.2) : easeOut(k);
      p.mesh.position.lerpVectors(p.from, p.home, e);
      p.mesh.rotation.set(p.rot.x * (1 - easeOut(k)), p.rot.y * (1 - easeOut(k)), p.rot.z * (1 - easeOut(k)));
      p.mesh.visible = k > 0;
      const sc = p.kind === 'tower' || p.kind === 'base' ? 1 : lerp(p.kind === 'block' ? 1.8 : 1, 1, easeOut(k));
      p.mesh.scale.set(sc, p.kind === 'tower' ? Math.max(0.001, easeOut(k)) : sc, sc);
    }
    // position: intro centre -> header slot
    const m = easeInOut(this.move);
    const x = lerp(this.center.x, this.target.x, m), y = lerp(this.center.y, this.target.y, m), w = lerp(this.center.w, this.target.w, m);
    const s = w / LW;
    this.group.position.set(x, -y, 0);
    this.group.scale.setScalar(s);
    this.group.rotation.set(tilt.y * 0.12, tilt.x * 0.18 + Math.sin(introT * 0.6) * 0.03 * m, 0);
    // a glint runs across: after the letters land, then every so often
    if (this.glint < 0 && introT > 1.25) this.glint = 0;
    if (this.glint >= 0) {
      this.glint += dt;
      const g = clamp(this.glint / 0.9);
      this.shine.position.set(x + (g * 1.4 - 0.7) * w, -y + w * 0.05, w * 0.16);
      this.shine.intensity = Math.sin(g * Math.PI) * 2.6 * (1 + this.night * 0.5);
      this.shine.distance = w * 0.55;
      if (this.glint > 9) this.glint = 0;
    }
  }
}
