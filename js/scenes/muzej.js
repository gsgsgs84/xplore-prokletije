// Muzej na kocki: a limestone pedestal with a brass name plate; the exhibits take turns rising on it.
import { THREE, slab, stoneMat, shadowed } from './common.js';
import { LightRing, Sparkles, beam, textTex, clamp, easeBack, easeOut, glowSprite } from '../fx.js';

function dzezva(env) {
  const copper = new THREE.MeshStandardMaterial({ color: 0xc27a45, metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 1.4 });
  const pts = [[0, 0], [0.072, 0], [0.084, 0.012], [0.086, 0.05], [0.078, 0.095], [0.06, 0.13], [0.052, 0.15], [0.058, 0.168], [0.07, 0.18], [0.066, 0.184]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), copper); pot.material.side = THREE.DoubleSide;
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 16, 1, true), copper);
  spout.position.set(0, 0.176, 0.07); spout.rotation.x = 1.25;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x3b2414, roughness: 0.6 }));
  handle.position.set(0, 0.15, -0.14); handle.rotation.x = -1.05;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.084, 0.004, 8, 40), new THREE.MeshStandardMaterial({ color: 0xe0b060, metalness: 1, roughness: 0.25, envMap: env }));
  band.rotation.x = Math.PI / 2; band.position.y = 0.05;
  g.add(pot, spout, handle, band);
  return shadowed(g);
}

function fenjer(env) {
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89b4a, metalness: 1, roughness: 0.28, envMap: env, envMapIntensity: 1.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffc46a, emissiveIntensity: 1.4, roughness: 0.1, transparent: true, opacity: 0.75 });
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.025, 6), brass); base.position.y = 0.0125;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.13, 6, 1, true), glass); body.position.y = 0.09;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + Math.PI / 6, bar = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.135, 0.008), brass);
    bar.position.set(Math.cos(a) * 0.058, 0.09, Math.sin(a) * 0.058); g.add(bar);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.07, 6), brass); roof.position.y = 0.19;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 8, 24), brass); ring.position.y = 0.245;
  const flame = glowSprite(0xffb050, 0.32, 0.9); flame.position.y = 0.09;
  g.add(base, body, roof, ring, flame);
  g.userData.flame = flame;
  return shadowed(g);
}

export function create(ctx) {
  const group = new THREE.Group();
  const stone = stoneMat('lime', [214, 206, 192], ctx.env);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), stone); ped.position.y = 0.15;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.045, 0.58), stoneMat('dark', [70, 66, 62], ctx.env)); cap.position.y = 0.32;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.62), stone); foot.position.y = 0.02;
  group.add(shadowed(ped), shadowed(cap), shadowed(foot));
  // brass name plate on the front, facing the viewer
  const plateMat = new THREE.MeshStandardMaterial({ map: textTex('pl', 'DŽEZVA', { w: 512, h: 128 }), metalness: 0.85, roughness: 0.32, envMap: ctx.env, envMapIntensity: 1.2 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.075, 0.012), [plateMat, plateMat, plateMat, plateMat, plateMat, plateMat]);
  plate.position.set(0, 0.2, 0.256); plate.rotation.x = -0.12;
  group.add(plate);
  const exhibits = [{ obj: dzezva(ctx.env), name: 'DŽEZVA', s: 1.25 }, { obj: fenjer(ctx.env), name: 'FENJER', s: 1.2 }];
  const stage = new THREE.Group(); stage.position.y = 0.343; group.add(stage);
  for (const e of exhibits) { e.obj.scale.setScalar(e.s); e.obj.visible = false; stage.add(e.obj); }
  const ring = new LightRing(0xffe6b0, 0.22); ring.mesh.position.y = 0.346; group.add(ring.mesh);
  const sparks = new Sparkles(36, 0xffe9b8, 0.03); group.add(sparks.points);
  const spot = beam(0xfff0d0, 0.17, 0.7); spot.position.y = 0.343; spot.material.opacity = 0.18;
  group.add(spot);
  let cur = 0, t0 = 0;
  const show = (i, t) => {
    cur = i; t0 = t;
    exhibits.forEach((e, j) => { e.obj.visible = j === i; });
    plateMat.map = textTex('pl', exhibits[i].name, { w: 512, h: 128 }); plateMat.needsUpdate = true;
    ring.fire(); sparks.burst(new THREE.Vector3(0, 0.36, 0), 0.25, 0.5);
  };
  return {
    group, depth: 0.62, accent: 0xc8923e,
    start(t) { show(0, t); },
    update(t, dt) {
      const k = t - t0;
      const e = exhibits[cur];
      const rise = easeBack(clamp(k / 0.7), 1.6);
      e.obj.position.y = (1 - rise) * -0.25;
      e.obj.rotation.y = t * 0.6;
      e.obj.scale.setScalar(e.s * (0.6 + 0.4 * rise));
      if (k > 5.2) { const out = easeOut(clamp((k - 5.2) / 0.35)); e.obj.scale.setScalar(e.s * (1 - out)); }
      if (k > 5.55) show((cur + 1) % exhibits.length, t);
      if (e.obj.userData.flame) e.obj.userData.flame.material.opacity = 0.75 + Math.sin(t * 17) * 0.08 + Math.sin(t * 7.3) * 0.1;
      spot.material.opacity = 0.1 + (ctx.night() * 0.18);
      ring.update(dt); sparks.update(dt);
    },
  };
}
