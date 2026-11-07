// Live 3D thumbnails for the menu, built from each app's own models and data:
//   muzej     the museum's scanned džezva and fenjer (baked from Gusinjska kulturna baština)
//   mapa      the town model of Mapa Gusinja, with its hold-to-choose ring
//   kocka     the meadow maze of Gusinjska kocka with its photo-scanned Kula Rašića
//   slagalica the 64 jigsaw pieces of Slagalica Gusinje
//   staze     the Copernicus relief and real trails of Planinarske staze u 3D
import * as THREE from '../../vendor/three/three.module.min.js';
import { slab, stoneMat, shadowed } from '../scenes/common.js';
import { LightRing, Sparkles, textTex, glowSprite, beam, canvasTex, clamp, easeOut, easeBack } from '../fx.js';
import { loadModel } from './gkm.js';
import * as mapa from '../scenes/mapa.js';
import * as kocka from '../scenes/kocka.js';
import * as slagalica from '../scenes/slagalica.js';
import * as staze from '../scenes/staze.js';

const MODELS = 'assets/models/';

function museum(ctx) {
  const group = new THREE.Group();
  const lime = stoneMat('lime', [222, 214, 198], ctx.env);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.26, 0.46), lime); ped.position.y = 0.15;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.56), lime); foot.position.y = 0.02;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.035, 0.52), stoneMat('dark', [62, 58, 55], ctx.env)); cap.position.y = 0.2975;
  group.add(shadowed(ped), shadowed(foot), shadowed(cap));
  const plateMat = new THREE.MeshStandardMaterial({ map: textTex('pl', 'DŽEZVA', { w: 512, h: 128 }), metalness: 0.85, roughness: 0.3, envMap: ctx.env, envMapIntensity: 1.3 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.065, 0.01), plateMat);
  plate.position.set(0, 0.17, 0.235); plate.rotation.x = -0.1; group.add(plate);
  const stage = new THREE.Group(); stage.position.y = 0.315; group.add(stage);
  const spot = beam(0xfff0d0, 0.15, 0.62); spot.position.y = 0.315; spot.material.opacity = 0.22; group.add(spot);
  const ring = new LightRing(0xffe6b0, 0.2); ring.mesh.position.y = 0.318; group.add(ring.mesh);
  const sparks = new Sparkles(30, 0xffe9b8, 0.028); group.add(sparks.points);
  const items = [];
  const add = (id, name, h) => loadModel(MODELS, id, { normal: true }).then((m) => {
    const mat = new THREE.MeshStandardMaterial({ map: m.map, normalMap: m.normalMap || null, metalness: 0.7, roughness: 0.4, envMap: ctx.env, envMapIntensity: 1.3 });
    const mesh = new THREE.Mesh(m.geometry, mat);
    const s = h / m.size[1]; mesh.scale.setScalar(s); mesh.visible = false;
    stage.add(mesh); items.push({ mesh, name, s });
    items.sort((a, b) => (a.name === 'DŽEZVA' ? -1 : 1));
  });
  add('dzezva', 'DŽEZVA', 0.27).catch(() => {}); add('fenjer', 'FENJER', 0.34).catch(() => {});
  let cur = -1, t0 = 0;
  const show = (i, t) => {
    cur = i; t0 = t;
    items.forEach((e, j) => { e.mesh.visible = j === i; });
    plateMat.map = textTex('pl', items[i].name, { w: 512, h: 128 }); plateMat.needsUpdate = true;
    ring.fire(); sparks.burst(new THREE.Vector3(0, 0.33, 0), 0.2, 0.45);
  };
  return {
    group, target: 0.2, fit: 0.7,
    update(t, dt) {
      if (cur < 0 && items.length) show(0, t);
      if (cur >= 0) {
        const e = items[cur], k = t - t0;
        const rise = easeBack(clamp(k / 0.8), 1.5);
        e.mesh.scale.setScalar(e.s * (0.55 + 0.45 * rise));
        e.mesh.position.y = (1 - rise) * -0.06;
        e.mesh.rotation.y = t * 0.55;
        if (k > 6.2) e.mesh.scale.setScalar(e.s * (1 - easeOut(clamp((k - 6.2) / 0.3))));
        if (k > 6.5 && items.length > 1) show((cur + 1) % items.length, t);
      }
      ring.update(dt); sparks.update(dt);
    },
  };
}

const MAKERS = {
  muzej: (ctx) => museum(ctx),
  mapa: (ctx) => Object.assign(mapa.create(ctx), { target: 0.08, fit: 0.9 }),
  kocka: (ctx) => Object.assign(kocka.create({ ...ctx, building: loadModel(MODELS, 'kula-rasica') }), { target: 0.1 }),
  slagalica: (ctx) => Object.assign(slagalica.create({ ...ctx, fly: 0.42 }), { target: 0.06 }),
  staze: (ctx) => Object.assign(staze.create(ctx), { target: 0.14 }),
};

function shadowTex() {
  return canvasTex('thumbShadow', 128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(20,28,40,0.42)'); r.addColorStop(0.55, 'rgba(20,28,40,0.16)'); r.addColorStop(1, 'rgba(20,28,40,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}

export class Thumb {
  constructor(id, index, env, accent) {
    this.id = id; this.i = index;
    this.scene = new THREE.Scene();
    this.scene.environment = env; this.scene.environmentIntensity = 0.45;
    this.camera = new THREE.PerspectiveCamera(24, 1.3, 0.1, 30);
    const hemi = new THREE.HemisphereLight(0xeef4ff, 0x6a5a48, 1.25);
    const key = new THREE.DirectionalLight(0xfff1dc, 1.9); key.position.set(-1.4, 2.6, 2.2);
    const rim = new THREE.DirectionalLight(0xcfe2ff, 0.9); rim.position.set(1.6, 1.4, -2.2);
    this.scene.add(hemi, key, rim);
    this.root = new THREE.Group(); this.scene.add(this.root);
    const ctx = { env, night: () => 0, snowy: () => false, sfx: () => {}, clipNew: () => {} };
    this.s = MAKERS[id](ctx);
    this.root.add(this.s.group);
    this.s.start?.(0);
    const ss = 1.45 * (this.s.fit || 1);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(ss, ss * 0.8), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = -0.004; sh.renderOrder = -1; this.scene.add(sh); this.shadow = sh;
    this.halo = glowSprite(accent, 2.0, 0); this.halo.position.set(0, 0.25, -0.6); this.scene.add(this.halo);
    this.ring = new LightRing(accent, 0.62); this.ring.mesh.position.y = 0.01; this.scene.add(this.ring.mesh);
    this.sparks = new Sparkles(46, 0xffffff, 0.035); this.scene.add(this.sparks.points);
    this.burstT = 9; this.appear = 0; this.hover = 0;
    this.base = [0.5, -0.4, 0.35, -0.5, 0.25][index % 5];
  }

  burst() {
    this.burstT = 0; this.ring.fire();
    this.sparks.burst(new THREE.Vector3(0, 0.25, 0), 0.5, 0.9);
  }

  update(t, dt, aspect) {
    const S = this.s;
    S.update(t, dt, this.camera);
    this.burstT += dt;
    const b = this.burstT < 0.9 ? Math.sin(Math.min(1, this.burstT / 0.9) * Math.PI) : 0;
    const a = easeBack(clamp(this.appear), 1.6);
    this.root.scale.setScalar(Math.max(0.001, a * (1 + b * 0.12)));
    this.root.position.y = (1 - clamp(this.appear)) * -0.25 + b * 0.04;
    this.root.rotation.y = this.base + Math.sin(t * 0.32 + this.i * 1.3) * 0.5 + this.hover * 0.6 + (this.burstT < 1.2 ? easeOut(this.burstT / 1.2) * Math.PI * 2 : 0);
    this.shadow.material.opacity = clamp(this.appear) * (1 - b * 0.4);
    this.halo.material.opacity = b * 0.9 + this.hover * 0.25;
    this.ring.update(dt); this.sparks.update(dt);
    // camera: front, a little above, framing the diorama
    const fit = S.fit || 1.0, d = fit / Math.sin((this.camera.fov * Math.PI) / 360) / Math.min(1, aspect * 0.9);
    const el = 0.5;
    this.camera.aspect = aspect;
    this.camera.position.set(0, S.target + Math.sin(el) * d * 0.62, Math.cos(el) * d * 0.62);
    this.camera.lookAt(0, S.target, 0);
    this.camera.updateProjectionMatrix();
  }
}
