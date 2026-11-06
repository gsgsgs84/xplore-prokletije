// Gusinjska kocka: a meadow maze with dry-stone walls; the marble rolls to a little kula, which lights up gold.
import { THREE, slab, shadowed } from './common.js';
import { canvasTex, rng, beam, Sparkles, glowSprite, clamp, easeOut, lerp } from '../fx.js';

const N = 5, CELL = 0.165, H = N * CELL / 2;
const cx = (i) => -H + CELL * (i + 0.5);
// walls on cell edges: [x0, z0, x1, z1] in cell-corner units (0..5)
const WALLS = [
  [1, 1, 1, 3], [1, 1, 3, 1], [2, 2, 4, 2], [4, 1, 4, 2], [2, 2, 2, 4], [3, 3, 3, 5], [1, 4, 2, 4], [4, 3, 5, 3], [3, 3, 4, 3], [0, 2, 1, 2],
];
// path through the cells (col, row), start bottom-left -> goal top-right
const PATH = [[0, 4], [0, 3], [1, 3], [1, 2], [1, 1], [2, 1], [3, 1], [3, 0], [4, 0]];

function meadowTex() {
  return canvasTex('meadow', 512, 512, (g, w) => {
    const R = rng(8);
    g.fillStyle = '#5f9a45'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `hsla(${95 + R() * 30},${40 + R() * 25}%,${28 + R() * 22}%,0.55)`; g.fillRect(R() * w, R() * w, 2 + R() * 3, 2 + R() * 5); }
    // the stone path
    const s = w / (N * CELL), px = (c) => (cx(c) + H) * s;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#cbbfa6'; g.lineWidth = CELL * s * 0.46;
    g.beginPath(); PATH.forEach(([c, r], i) => (i ? g.lineTo(px(c), px(r)) : g.moveTo(px(c), px(r)))); g.stroke();
    g.strokeStyle = 'rgba(80,70,55,0.35)'; g.lineWidth = 2;
    for (let i = 0; i < 160; i++) { const k = R() * (PATH.length - 1), a = Math.floor(k), f = k - a; const x = lerp(px(PATH[a][0]), px(PATH[a + 1][0]), f) + (R() - 0.5) * 30, y = lerp(px(PATH[a][1]), px(PATH[a + 1][1]), f) + (R() - 0.5) * 30; g.strokeRect(x, y, 10 + R() * 8, 7 + R() * 6); }
    for (let i = 0; i < 90; i++) { g.fillStyle = ['#f4e9a2', '#ffffff', '#c9a7e8', '#f2a0b3'][i % 4]; g.beginPath(); g.arc(R() * w, R() * w, 2.2, 0, 7); g.fill(); }
  });
}

export function create(ctx) {
  const group = new THREE.Group();
  const grass = new THREE.MeshStandardMaterial({ map: meadowTex(), roughness: 0.95 });
  group.add(slab(0.88, 0.05, 0.88, grass, 0x5b4630));
  const top = 0.05;
  // dry-stone walls: instanced stones
  const R = rng(17), stones = [];
  for (const [x0, z0, x1, z1] of WALLS) {
    const len = Math.hypot(x1 - x0, z1 - z0) * CELL, n = Math.round(len / 0.034);
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < n + layer; i++) {
      const f = (i + (layer ? 0 : 0.5)) / (n + layer);
      stones.push({ x: -H + lerp(x0, x1, f) * CELL, z: -H + lerp(z0, z1, f) * CELL, y: top + 0.016 + layer * 0.026, r: Math.atan2(z1 - z0, x1 - x0) + (R() - 0.5) * 0.3, s: 0.8 + R() * 0.4, c: 0.55 + R() * 0.3 });
    }
  }
  const inst = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.019, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, flatShading: true }), stones.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  stones.forEach((s, i) => {
    q.setFromEuler(new THREE.Euler(R() * 0.5, -s.r, R() * 0.5));
    m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(s.s * 1.15, s.s * 0.8, s.s));
    inst.setMatrixAt(i, m4); inst.setColorAt(i, col.setRGB(s.c, s.c * 0.97, s.c * 0.92));
  });
  inst.castShadow = inst.receiveShadow = true;
  group.add(inst);
  // pines
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.85, flatShading: true });
  for (const [x, z, h] of [[-0.36, -0.36, 0.16], [0.37, 0.36, 0.13], [-0.36, 0.25, 0.11]]) {
    const p = new THREE.Group();
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(h * (0.38 - k * 0.08), h * 0.5, 7), pineMat); c.position.y = top + h * (0.3 + k * 0.25); p.add(c); }
    p.position.set(x, 0, z); group.add(shadowed(p));
  }
  // the kula at the goal
  const goal = new THREE.Vector3(cx(4), top, cx(0) - 0.035);
  const kula = new THREE.Group();
  const wallM = new THREE.MeshStandardMaterial({ color: 0xece4d4, roughness: 0.8, emissive: 0xffc35a, emissiveIntensity: 0 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.1), wallM); body.position.y = 0.065;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.07, 4), new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.7 })); roof.position.y = 0.165; roof.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.026, 0.04), new THREE.MeshBasicMaterial({ color: 0x2a1c12 })); door.position.set(0, 0.02, 0.0505);
  const winM = new THREE.MeshBasicMaterial({ color: 0x2a1c12 });
  for (const [x, y] of [[-0.025, 0.09], [0.025, 0.09], [0, 0.09]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.018), winM); w.position.set(x, y, 0.0505); kula.add(w); }
  kula.add(body, roof, door); kula.position.copy(goal); group.add(shadowed(kula));
  const doorBeam = beam(0xfff2c0, 0.035, 0.42); doorBeam.position.set(goal.x, top, goal.z + 0.085); group.add(doorBeam);
  const gold = glowSprite(0xffcf6a, 0.5, 0); gold.position.set(goal.x, top + 0.1, goal.z); group.add(gold);
  const sparks = new Sparkles(40, 0xffe39a, 0.028); group.add(sparks.points);
  // the marble
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.032, 28, 20), new THREE.MeshPhysicalMaterial({ color: 0xf6f3ee, roughness: 0.12, clearcoat: 1, envMap: ctx.env, envMapIntensity: 1.2 }));
  ball.castShadow = true; group.add(ball);
  const pts = PATH.slice(0, -1).map(([c, r]) => new THREE.Vector3(cx(c), top + 0.032, cx(r)));
  pts.push(new THREE.Vector3(goal.x - 0.07, top + 0.032, cx(0) + 0.05), new THREE.Vector3(goal.x, top + 0.032, goal.z + 0.088));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.3), L = curve.getLength();
  let t0 = 0, arrived = false;
  const prev = new THREE.Vector3();
  return {
    group, depth: 0.28, accent: 0x2f9e5c,
    start(t) { t0 = t; arrived = false; },
    update(t, dt) {
      const k = t - t0, dur = 3.6;
      const u = easeOut(clamp(k / dur)) * 0.92 + clamp(k / dur) * 0.08;
      prev.copy(ball.position);
      curve.getPointAt(Math.min(1, u), ball.position);
      const d = prev.distanceTo(ball.position);
      if (d > 0 && d < 0.1) { const dir = ball.position.clone().sub(prev).normalize(); const axis = new THREE.Vector3(dir.z, 0, -dir.x); ball.rotateOnWorldAxis(axis, d / 0.032); }
      ball.scale.setScalar(clamp(k / 0.25) * (1 - clamp((k - dur - 2) / 0.3)));
      if (!arrived && k >= dur) { arrived = true; sparks.burst(new THREE.Vector3(goal.x, top + 0.12, goal.z), 0.18, 0.6); ctx.sfx?.('ding'); }
      const glow = arrived ? clamp((k - dur) / 0.3) * (1 - clamp((k - dur - 2) / 0.4)) : 0;
      wallM.emissiveIntensity = glow * 0.9; gold.material.opacity = glow * 0.85;
      doorBeam.material.opacity = (1 - glow) * (0.55 + 0.2 * Math.sin(t * 4));
      sparks.update(dt);
      if (k > dur + 2.6) { t0 = t; arrived = false; }
    },
  };
}
