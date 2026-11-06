// Gdje su mace?: a corner of a Gusinje room. A white kitten peeks out from behind the sehara, a grey one strolls past,
// and the cat-head reticle catches the white one.
import { THREE, woodTex, shadowed } from './common.js';
import { makeCat, HEAD_PATH } from './cat.js';
import { canvasTex, Sparkles, clamp, easeOut, easeBack, rng } from '../fx.js';

function kilimTex() {
  return canvasTex('kilim', 512, 320, (g, w, h) => {
    g.fillStyle = '#8e1f22'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1f2a44'; g.fillRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#b8322c'; g.fillRect(30, 30, w - 60, h - 60);
    const R = rng(2);
    for (let i = 0; i < 5; i++) {
      const cx = 80 + i * 88, cy = h / 2, s = 46;
      g.fillStyle = ['#e9c46a', '#f4efe2', '#1f2a44'][i % 3];
      g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.7, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s * 0.7, cy); g.closePath(); g.fill();
      g.fillStyle = '#8e1f22'; g.beginPath(); g.moveTo(cx, cy - s * 0.45); g.lineTo(cx + s * 0.3, cy); g.lineTo(cx, cy + s * 0.45); g.lineTo(cx - s * 0.3, cy); g.closePath(); g.fill();
    }
    g.fillStyle = '#f4efe2';
    for (let x = 34; x < w - 30; x += 18) { g.beginPath(); g.moveTo(x, 34); g.lineTo(x + 9, 46); g.lineTo(x + 18, 34); g.fill(); g.beginPath(); g.moveTo(x, h - 34); g.lineTo(x + 9, h - 46); g.lineTo(x + 18, h - 34); g.fill(); }
    g.globalAlpha = 0.12; for (let i = 0; i < 4000; i++) { g.fillStyle = R() < 0.5 ? '#000' : '#fff'; g.fillRect(R() * w, R() * h, 2, 1); }
  });
}

function seharaTex() {
  return canvasTex('sehara', 512, 256, (g, w, h) => {
    g.fillStyle = '#6b3a1e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d8a54a'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#2f6b4f';
    for (const cx of [w * 0.25, w * 0.75]) {
      g.beginPath(); g.ellipse(cx, h / 2, 70, 52, 0, 0, 7); g.fill();
      g.fillStyle = '#c8402e'; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(a) * 30, h / 2 + Math.sin(a) * 22, 11, 0, 7); g.fill(); }
      g.fillStyle = '#e9c46a'; g.beginPath(); g.arc(cx, h / 2, 12, 0, 7); g.fill(); g.fillStyle = '#2f6b4f';
    }
  });
}

function reticleShape() {
  // HEAD_PATH (100 x 100 box, y down) as a THREE.Shape, centred
  const s = new THREE.Shape(), tok = HEAD_PATH.match(/[MLQZ]|-?[\d.]+/g); let i = 0;
  const P = () => [(+tok[i++] - 50) / 50, (50 - +tok[i++]) / 50];
  while (i < tok.length) {
    const c = tok[i++];
    if (c === 'M') s.moveTo(...P()); else if (c === 'L') s.lineTo(...P());
    else if (c === 'Q') { const [a, b] = P(); const [x, y] = P(); s.quadraticCurveTo(a, b, x, y); }
  }
  return s;
}

export function create(ctx) {
  const group = new THREE.Group();
  const floor = new THREE.MeshStandardMaterial({ map: woodTex('floor', [176, 128, 82], 7), roughness: 0.75 });
  const side = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.85 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.88), [side, side, floor, side, side, side]); base.position.y = 0.02;
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), new THREE.MeshStandardMaterial({ map: kilimTex(), roughness: 0.95 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0.02, 0.0415, 0.12);
  group.add(shadowed(base), shadowed(rug, false, true));
  // the sehara (dowry chest) at the back
  const chestM = new THREE.MeshStandardMaterial({ map: seharaTex(), roughness: 0.6 });
  const woodM = new THREE.MeshStandardMaterial({ color: 0x5c311a, roughness: 0.6 });
  const chest = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.15, 0.17), [woodM, woodM, woodM, woodM, chestM, woodM]); box.position.y = 0.075;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.19), woodM); lid.position.y = 0.168;
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8a54a, metalness: 1, roughness: 0.3, envMap: ctx.env });
  for (const x of [-0.17, 0.17]) for (const y of [0.012, 0.15]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.18), brass); c.position.set(x, y, 0); chest.add(c); }
  chest.add(box, lid); chest.position.set(-0.13, 0.04, -0.22); group.add(shadowed(chest));
  // a pot with a plant
  const pot = new THREE.Group();
  const potM = new THREE.MeshStandardMaterial({ color: 0xb4532e, roughness: 0.8 });
  const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.034, 0.07, 18), potM); p1.position.y = 0.035;
  const leafM = new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 0.7, side: THREE.DoubleSide, flatShading: true });
  for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.13, 4), leafM); const a = k / 7 * Math.PI * 2; l.position.set(Math.cos(a) * 0.02, 0.12, Math.sin(a) * 0.02); l.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); pot.add(l); }
  pot.add(p1); pot.position.set(0.3, 0.04, -0.27); group.add(shadowed(pot));
  // kittens (real size 0.27 m, here x1.5)
  const white = makeCat('white', 3), grey = makeCat('grey', 5);
  white.root.scale.multiplyScalar(1.45); grey.root.scale.multiplyScalar(1.3);
  white.pose = 'peek'; white.root.position.set(-0.13, 0.04, -0.33); white.root.rotation.y = 0.25;
  grey.pose = 'walk'; grey.speed = 1;
  group.add(white.root, grey.root);
  // the cat-head reticle
  const retShape = reticleShape();
  const ret = new THREE.Group();
  const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(retShape.getPoints(12)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false }));
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, side: THREE.DoubleSide });
  const fill = new THREE.Mesh(new THREE.ShapeGeometry(retShape, 8), fillMat);
  ret.add(fill, outline); ret.scale.setScalar(0.07); ret.renderOrder = 20; outline.renderOrder = 21; fill.renderOrder = 20;
  group.add(ret);
  const sparks = new Sparkles(30, 0xfff4f8, 0.028); group.add(sparks.points);
  let t0 = 0, caught = false;
  const camQ = new THREE.Quaternion();
  return {
    group, depth: 0.45, accent: 0xc2689a,
    start(t) { t0 = t; caught = false; },
    update(t, dt, camera) {
      const k = t - t0;
      // grey kitten strolls along the front, turns, comes back
      const lap = 7, u = (k % lap) / lap, dir = u < 0.5 ? 1 : -1, f = u < 0.5 ? u * 2 : 2 - u * 2;
      grey.root.position.set(-0.3 + f * 0.6, 0.042, 0.2);
      grey.root.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      grey.pose = Math.abs(f - 0.5) > 0.47 ? 'stand' : 'walk';
      grey.update(dt);
      // white kitten peeks; the reticle drifts onto her and fills
      const aim = clamp((k - 0.6) / 0.8), hold = clamp((k - 1.4) / 1.0);
      const target = white.center(new THREE.Vector3()); group.worldToLocal(target); target.y += 0.06;
      ret.position.set(target.x + (1 - easeOut(aim)) * 0.25, target.y + 0.04, target.z + 0.12);
      if (camera) { ret.quaternion.copy(group.getWorldQuaternion(camQ).invert().multiply(camera.quaternion)); }
      ret.visible = k > 0.5 && k < 3.4;
      fillMat.opacity = hold * 0.55;
      ret.scale.setScalar(0.07 * (1 + (caught ? easeBack(clamp((k - 2.4) / 0.3)) * 0.25 : 0)));
      if (!caught && k > 2.4) { caught = true; white.pose = 'happy'; sparks.burst(target, 0.12, 0.45); ctx.sfx?.('meow'); }
      if (k > 4.6) { white.pose = 'peek'; }
      if (k > 6.2) { t0 = t; caught = false; }
      white.update(dt);
      sparks.update(dt);
    },
  };
}

