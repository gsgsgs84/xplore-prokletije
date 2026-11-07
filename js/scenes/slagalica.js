// Slagalica Gusinje: the town's 64 jigsaw pieces fly into the tray one by one; Čekića džamija's piece clicks in last.
import { THREE, loadTown, TOWN_MM, woodTex, shadowed } from './common.js';
import { Sparkles, clamp, easeOut, easeInOut, rng } from '../fx.js';

export function create(ctx) {
  const group = new THREE.Group();
  const S = 0.8 / TOWN_MM;
  const wood = new THREE.MeshStandardMaterial({ map: woodTex('tray', [168, 118, 70], 5), roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x5e3b20, roughness: 0.8 });
  const tray = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.025, 0.88), [dark, dark, wood, dark, dark, dark]); bed.position.y = 0.0125;
  tray.add(bed);
  for (const [x, z, w, d] of [[0, 0.43, 0.88, 0.02], [0, -0.43, 0.88, 0.02], [0.43, 0, 0.02, 0.88], [-0.43, 0, 0.02, 0.88]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), wood); r.position.set(x, 0.025, z); tray.add(r);
  }
  group.add(shadowed(tray));
  const holder = new THREE.Group(); holder.position.y = 0.025; holder.scale.setScalar(S); group.add(holder);
  const sparks = new Sparkles(44, 0xffe2b0, 0.03); group.add(sparks.points);
  let pieces = [], t0 = 0, landed = 0;
  const R = rng(4), fly = ctx.fly ?? 1;
  loadTown().then((town) => {
    const t = town.clone();
    holder.add(t);
    ctx.clipNew?.(t);
    pieces = t.children.map((node) => {
      const home = node.position.clone();
      node.scale.setScalar(0.962);                       // thin seams between pieces
      const a = R() * Math.PI * 2;
      return { node, home, name: node.name, from: new THREE.Vector3(home.x * 0.4 + Math.cos(a) * 160 * fly, (260 + R() * 160) * fly, home.z * 0.4 + Math.sin(a) * 160 * fly), spin: (R() - 0.5) * 5, order: 0 };
    });
    // order: outside ring inwards, the mosque's piece (F6) last
    pieces.sort((a, b) => Math.max(Math.abs(b.home.x), Math.abs(b.home.z)) - Math.max(Math.abs(a.home.x), Math.abs(a.home.z)) + (R() - 0.5) * 30);
    const last = pieces.findIndex((p) => p.name === 'F6');
    if (last >= 0) pieces.push(pieces.splice(last, 1)[0]);
    pieces.forEach((p, i) => { p.order = i; });
  }).catch((e) => console.warn('town', e));
  const STEP = 0.055, FLY = 0.42;
  return {
    group, depth: 0.12, accent: 0xd0643b,
    start(t) { t0 = t; landed = 0; },
    update(t, dt) {
      sparks.update(dt);
      if (!pieces.length) return;
      const k = t - t0, n = pieces.length;
      const allIn = (n - 1) * STEP + FLY, hold = allIn + 2.2, away = hold + 0.7;
      let count = 0;
      for (const p of pieces) {
        const s = p.order * STEP;
        let f = clamp((k - s) / FLY);
        if (k > hold) f = 1 - easeInOut(clamp((k - hold - (n - 1 - p.order) * 0.006) / 0.5));
        const e = easeOut(f);
        p.node.position.lerpVectors(p.from, p.home, e);
        p.node.position.y += Math.sin(e * Math.PI) * 40;
        p.node.rotation.y = p.spin * (1 - e);
        p.node.visible = f > 0.001;
        if (f >= 1) count++;
      }
      if (count > landed && k < hold) {
        landed = count;
        if (landed === n) {
          const p = pieces[n - 1];
          sparks.burst(new THREE.Vector3(p.home.x * S, 0.06, p.home.z * S), 0.2, 0.55);
          ctx.sfx?.('click');
        } else if (landed % 8 === 0) ctx.sfx?.('tick');
      }
      if (k > away) { t0 = t; landed = 0; }
    },
  };
}
