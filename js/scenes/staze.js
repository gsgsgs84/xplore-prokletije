// Planinarske staze u 3D: the real relief around Gusinje (Copernicus DEM) with trails drawing themselves in light.
import { THREE, shadowed } from './common.js';
import { glowSprite, clamp, easeInOut, rng } from '../fx.js';

const W = 0.86;

export function create(ctx) {
  const group = new THREE.Group();
  // seen from the north, like the skyline behind: Gusinje's valley in front, the high peaks at the back
  const relief = new THREE.Group(); relief.rotation.y = Math.PI; group.add(relief);
  let api = null;
  const sparkHead = glowSprite(0xffffff, 0.16, 0); relief.add(sparkHead);
  const state = { t0: 0, ready: false, trails: [] };
  fetch('data/teren.json').then((r) => r.json()).then((T) => {
    const raw = Uint8Array.from(atob(T.h), (c) => c.charCodeAt(0));
    const nx = T.nx, nz = T.nz, D = W * (T.z[1] - T.z[0]) / (T.x[1] - T.x[0]);
    const H = 0.26, BASE = 0.05;
    const hAt = (i, j) => raw[Math.min(nz - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))] / 255;
    const sample = (x, z) => {                       // x, z in model units of the trails data
      const fi = (x - T.x[0]) / (T.x[1] - T.x[0]) * (nx - 1), fj = (z - T.z[0]) / (T.z[1] - T.z[0]) * (nz - 1);
      const i = Math.floor(fi), j = Math.floor(fj), a = fi - i, b = fj - j;
      return (hAt(i, j) * (1 - a) + hAt(i + 1, j) * a) * (1 - b) + (hAt(i, j + 1) * (1 - a) + hAt(i + 1, j + 1) * a) * b;
    };
    const g = new THREE.PlaneGeometry(W, D, nx - 1, nz - 1); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const snowy = ctx.snowy?.() ?? false;
    const c = new THREE.Color(), lo = new THREE.Color('#5d8f47'), mid = new THREE.Color('#33603a'), rock = new THREE.Color('#9a8b78'), snow = new THREE.Color('#f4f6fa');
    const R = rng(3);
    for (let v = 0; v < pos.count; v++) {
      const i = v % nx, j = Math.floor(v / nx), h = hAt(i, j);
      pos.setY(v, BASE + h * H);
      if (h < 0.18) c.copy(lo).lerp(mid, h / 0.18);
      else if (h < 0.5) c.copy(mid).lerp(rock, (h - 0.18) / 0.32);
      else c.copy(rock);
      const sl = snowy ? 0.78 : 0.9;
      if (h > sl) c.lerp(snow, clamp((h - sl) / 0.1));
      c.multiplyScalar(0.92 + R() * 0.12);
      col.set([c.r, c.g, c.b], v * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    const land = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
    // the block's sides (earth layers)
    const side = new THREE.MeshStandardMaterial({ color: 0x6a4e34, roughness: 0.95 });
    const sides = new THREE.Group();
    const edge = (pts) => {
      const p = [], idx = [];
      pts.forEach(([x, y, z], k) => { p.push(x, 0, z, x, y, z); if (k) idx.push((k - 1) * 2, k * 2, (k - 1) * 2 + 1, (k - 1) * 2 + 1, k * 2, k * 2 + 1); });
      const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); eg.setIndex(idx); eg.computeVertexNormals();
      return new THREE.Mesh(eg, side.clone());
    };
    const gx = (i) => -W / 2 + W * i / (nx - 1), gz = (j) => -D / 2 + D * j / (nz - 1), gy = (i, j) => BASE + hAt(i, j) * H;
    const front = [], back = [], left = [], right = [];
    for (let i = 0; i < nx; i++) { front.push([gx(i), gy(i, nz - 1), D / 2]); back.push([gx(nx - 1 - i), gy(nx - 1 - i, 0), -D / 2]); }
    for (let j = 0; j < nz; j++) { right.push([W / 2, gy(nx - 1, nz - 1 - j), gz(nz - 1 - j)]); left.push([-W / 2, gy(0, j), gz(j)]); }
    for (const e of [front, back, left, right]) { const m = edge(e); m.material.side = THREE.DoubleSide; sides.add(m); }
    relief.add(shadowed(land), shadowed(sides));
    // trails
    const toLocal = (x, z) => new THREE.Vector3((x - (T.x[0] + T.x[1]) / 2) / (T.x[1] - T.x[0]) * W, 0, (z - (T.z[0] + T.z[1]) / 2) / (T.z[1] - T.z[0]) * D);
    state.trails = T.trails.map((tr) => {
      const pts = [];
      for (let k = 0; k < tr.xz.length; k += 2) { const p = toLocal(tr.xz[k], tr.xz[k + 1]); p.y = BASE + sample(tr.xz[k], tr.xz[k + 1]) * H + 0.011; pts.push(p); }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      const segs = Math.max(40, pts.length * 3);
      const tube = new THREE.TubeGeometry(curve, segs, 0.0085, 6, false);
      const mesh = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: new THREE.Color(tr.color).multiplyScalar(1.25), toneMapped: false }));
      mesh.geometry.setDrawRange(0, 0);
      relief.add(mesh);
      return { mesh, curve, count: tube.index.count, color: new THREE.Color(tr.color) };
    });
    // Gusinje: a small glowing pin
    const gus = T.places.find((p) => p.id === 'gusinje');
    if (gus) {
      const p = toLocal(gus.xz[0], gus.xz[1]); p.y = BASE + sample(gus.xz[0], gus.xz[1]) * H;
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe6a0, toneMapped: false }));
      pin.position.copy(p).add(new THREE.Vector3(0, 0.03, 0));
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.03, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      stick.position.copy(p).add(new THREE.Vector3(0, 0.015, 0));
      const halo = glowSprite(0xffd27a, 0.14, 0.8); halo.position.copy(pin.position);
      relief.add(pin, stick, halo); state.pin = halo;
    }
    // two little clouds drifting over the peaks
    state.clouds = [0, 1].map((k) => { const s = glowSprite(0xffffff, 0.3, 0.35); s.position.set(-0.3 + k * 0.4, BASE + H + 0.08 + k * 0.03, -0.1 + k * 0.15); relief.add(s); return s; });
    ctx.clipNew?.(group);
    state.ready = true;
  }).catch((e) => console.warn('teren', e));
  api = {
    group, depth: 0.34, accent: 0x1f8a8f,
    start(t) { state.t0 = t; },
    update(t, dt) {
      if (!state.ready) return;
      const k = t - state.t0, per = 1.7, n = state.trails.length, end = n * per + 2.2;
      let head = null;
      state.trails.forEach((tr, i) => {
        const f = easeInOut(clamp((k - 0.4 - i * per) / per));
        const fade = 1 - clamp((k - end + 0.6) / 0.6);
        tr.mesh.geometry.setDrawRange(0, Math.floor(f * tr.count / 3) * 3);
        tr.mesh.material.transparent = fade < 1; tr.mesh.material.opacity = fade;
        if (f > 0 && f < 1) head = { p: tr.curve.getPointAt(f), c: tr.color };
      });
      if (head) { sparkHead.position.copy(head.p); sparkHead.material.color.copy(head.c).lerp(new THREE.Color(1, 1, 1), 0.5); sparkHead.material.opacity = 1; }
      else sparkHead.material.opacity = Math.max(0, sparkHead.material.opacity - dt * 3);
      if (state.pin) state.pin.material.opacity = 0.55 + 0.35 * Math.sin(t * 3);
      state.clouds.forEach((s, i) => { s.position.x = -0.42 + ((t * 0.03 + i * 0.45) % 0.84); s.material.opacity = 0.3 * Math.sin(((t * 0.03 + i * 0.45) % 0.84) / 0.84 * Math.PI); });
      if (k > end) state.t0 = t;
    },
  };
  return api;
}
