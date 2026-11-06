// Shared bits for the six little scenes that stand on top of the cube.
// Scene space: the cube's top face is y = 0, the face spans x, z in [-0.5, 0.5]; scenes keep inside +-0.45.
import * as THREE from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/three/addons/libs/meshopt_decoder.module.js';
import { noiseTex, canvasTex, rng } from '../fx.js';

export { THREE };

export function shadowed(obj, cast = true, receive = true) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  return obj;
}

// A base block that the scene stands on (top at y = 0 + h)
export function slab(w, h, d, topMat, sideColor = 0x5a4632) {
  const side = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.9 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, topMat, side, side, side]);
  m.position.y = h / 2; m.receiveShadow = true; m.castShadow = true;
  return m;
}

export function stoneMat(key = 'lime', base = [214, 206, 192], env) {
  return new THREE.MeshStandardMaterial({ map: noiseTex(key, base, 26, { specks: 0.012 }), roughness: 0.86, envMap: env, envMapIntensity: 0.4 });
}

export function woodTex(key, base = [150, 104, 62], planks = 6) {
  return canvasTex('wood' + key, 512, 512, (g, w) => {
    const R = rng(13);
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, w);
    const ph = w / planks;
    for (let i = 0; i < planks; i++) {
      const k = 0.85 + R() * 0.3;
      g.fillStyle = `rgb(${base.map((c) => Math.round(c * k))})`; g.fillRect(0, i * ph, w, ph - 3);
      g.globalAlpha = 0.18; g.strokeStyle = '#3a2412';
      for (let j = 0; j < 9; j++) { g.beginPath(); const y = i * ph + R() * ph; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + R() * 8 - 4, w * 0.6, y + R() * 8 - 4, w, y + R() * 6 - 3); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = 'rgba(40,22,10,0.55)'; g.fillRect(0, (i + 1) * ph - 3, w, 3);
    }
  });
}

// The town model of Gusinje (from Mapa Gusinja / Slagalica Gusinje), loaded once and shared
let townPromise = null;
export function loadTown(url = 'data/town.glb') {
  if (!townPromise) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    townPromise = loader.loadAsync(url).then((g) => {
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, flatShading: true });
      g.scene.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = true; o.receiveShadow = true; } });
      return g.scene;
    });
  }
  return townPromise;
}

// Town model units are millimetres of the 276 mm jigsaw; this fits it on the face
export const TOWN_MM = 276;

// A flat ring that fills up like a progress indicator (Mapa Gusinja's hold-to-choose ring)
export class FillRing {
  constructor(r = 0.06, color = 0xffffff) {
    this.group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.RingGeometry(r * 0.78, r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    this.fillMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide });
    this.fill = new THREE.Mesh(new THREE.RingGeometry(r * 0.78, r, 64, 1, Math.PI / 2, Math.PI * 2), this.fillMat);
    for (const m of [base, this.fill]) { m.rotation.x = -Math.PI / 2; this.group.add(m); }
    this.set(0);
  }
  set(p) { this.fill.geometry.setDrawRange(0, Math.floor(Math.max(0, Math.min(1, p)) * 64) * 6); }
}
