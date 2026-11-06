// Mapa Gusinja: the whole town on the cube. A ring hovers over a landmark, fills, and a light rises from it.
import { THREE, loadTown, TOWN_MM, FillRing, slab } from './common.js';
import { beam, Sparkles, glowSprite, clamp, easeOut, easeBack } from '../fx.js';

const MARKS = [
  { id: 'sahat', pos: [13.1, 20.0, -71.4] },
  { id: 'vezirova', pos: [-14.9, 23.4, -18.0] },
  { id: 'kula', pos: [-0.4, 18.5, -37.5] },
  { id: 'cekica', pos: [36.5, 18.7, 65.8] },
];

export function create(ctx) {
  const group = new THREE.Group();
  const S = 0.86 / TOWN_MM;
  const base = slab(0.88, 0.03, 0.88, new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: 0.9 }), 0x4a3b2c);
  group.add(base);
  const holder = new THREE.Group(); holder.position.y = 0.03; holder.scale.setScalar(S); group.add(holder);
  const ring = new FillRing(0.07, 0xffffff); group.add(ring.group);
  const pillar = beam(0x9cc4ff, 0.035, 0.55); group.add(pillar);
  const pin = glowSprite(0x9cc4ff, 0.16, 0); group.add(pin);
  const sparks = new Sparkles(30, 0xcfe0ff, 0.028); group.add(sparks.points);
  let ready = false, i = 0, t0 = 0;
  loadTown().then((town) => {
    const t = town.clone();
    holder.add(t);
    ctx.clipNew?.(t);
    ready = true;
  }).catch((e) => console.warn('town', e));
  const at = (m) => new THREE.Vector3(m.pos[0] * S, 0.03 + m.pos[1] * S, m.pos[2] * S);
  return {
    group, depth: 0.25, accent: 0x1a66f0,
    start(t) { t0 = t; i = 0; },
    update(t, dt) {
      const k = t - t0, m = MARKS[i % MARKS.length], p = at(m);
      // ring glides in, fills in 1.4 s (the app's own dwell), then the light rises
      const fill = clamp((k - 0.5) / 1.4);
      ring.group.position.set(p.x, p.y + 0.09 + Math.sin(t * 3) * 0.006, p.z);
      ring.group.scale.setScalar(k < 0.5 ? easeBack(k / 0.5) : 1 - 0.25 * clamp((k - 1.9) / 0.2));
      ring.set(fill);
      ring.group.visible = k < 2.1;
      const up = clamp((k - 1.9) / 0.5);
      pillar.position.set(p.x, p.y - 0.01, p.z);
      pillar.scale.set(1, Math.max(0.001, easeOut(up) * (1 - clamp((k - 3.2) / 0.5))), 1);
      pillar.material.opacity = 0.85;
      pin.position.set(p.x, p.y + 0.05 + easeOut(up) * 0.12, p.z);
      pin.material.opacity = easeOut(up) * (1 - clamp((k - 3.2) / 0.5));
      if (k > 1.9 && k - dt <= 1.9) { sparks.burst(p, 0.12, 0.4); ctx.sfx?.('ding'); }
      if (k > 3.8) { t0 = t; i++; }
      sparks.update(dt);
      group.visible = true;
      ring.group.children.forEach((c) => { c.visible = ready; });
    },
  };
}
