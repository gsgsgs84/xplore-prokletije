// The AR cube as printed: black body with rounded edges, translucent green faces with the real ArUco marker cells
// (same layout and ids as every cube app), lit from inside like the LED cube.
import * as THREE from '../vendor/three/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, glowSprite, glowTex, clamp, easeOut, smooth } from './fx.js';

export const YAW = -30 * Math.PI / 180;
const GREEN = new THREE.Color('#39e07a');

function faceTexture(face, markers, edge, cell) {
  const W = 512, win = 32.25, s = W / (2 * win);
  return canvasTex('face' + face, W, W, (g) => {
    // translucent green with faint print layers
    const gr = g.createRadialGradient(W / 2, W / 2, W * 0.05, W / 2, W / 2, W * 0.75);
    gr.addColorStop(0, '#7dffae'); gr.addColorStop(1, '#22b85c');
    g.fillStyle = gr; g.fillRect(0, 0, W, W);
    g.globalAlpha = 0.06; g.fillStyle = '#003314';
    for (let y = 0; y < W; y += 3) g.fillRect(0, y, W, 1);
    g.globalAlpha = 1;
    g.fillStyle = '#0b0d0c';
    for (const m of markers) {
      if (m.face !== face) continue;
      const u0 = m.c[0] - 4 * cell, v0 = m.c[1] + 4 * cell;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        if (m.cells[r * 8 + c] !== '1') continue;
        const u = u0 + c * cell, v = v0 - r * cell;
        g.fillRect(Math.floor((u + win) * s), Math.floor((win - v) * s), Math.ceil(cell * s) + 1, Math.ceil(cell * s) + 1);
      }
    }
  });
}

function emissiveTexture(face, markers, cell) {
  const W = 256, win = 32.25, s = W / (2 * win);
  return canvasTex('emi' + face, W, W, (g) => {
    const gr = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W * 0.7);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#7a7a7a');
    g.fillStyle = gr; g.fillRect(0, 0, W, W);
    g.fillStyle = '#000';
    for (const m of markers) {
      if (m.face !== face) continue;
      const u0 = m.c[0] - 4 * cell, v0 = m.c[1] + 4 * cell;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        if (m.cells[r * 8 + c] !== '1') continue;
        g.fillRect(Math.floor((u0 + c * cell + win) * s), Math.floor((win - v0 + r * cell) * s), Math.ceil(cell * s) + 1, Math.ceil(cell * s) + 1);
      }
    }
  }, { linear: true });
}

export class Cube {
  constructor(data, env) {
    this.root = new THREE.Group(); this.root.name = 'cube';
    this.yaw = new THREE.Group(); this.yaw.rotation.y = YAW; this.root.add(this.yaw);
    this.spin = new THREE.Group(); this.yaw.add(this.spin);
    this.clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);          // the "printing" cut
    const body = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 4, 2.5 / 70),
      new THREE.MeshPhysicalMaterial({ color: 0x121315, roughness: 0.46, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4, envMap: env, envMapIntensity: 0.9, clippingPlanes: [this.clip] }));
    body.castShadow = true;
    this.spin.add(body); this.body = body;
    this.faceMats = [];
    const size = 64.5 / 70;
    data.faces.forEach((f, i) => {
      const mat = new THREE.MeshPhysicalMaterial({
        map: faceTexture(i, data.markers, data.edge, data.cell), emissiveMap: emissiveTexture(i, data.markers, data.cell),
        emissive: GREEN, emissiveIntensity: 0.0, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12,
        envMap: env, envMapIntensity: 1.1, clippingPlanes: [this.clip],
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      const U = new THREE.Vector3(...f.U), V = new THREE.Vector3(...f.V), N = new THREE.Vector3(...f.N);
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(U, V, N));
      m.position.copy(N).multiplyScalar(0.5012);
      this.spin.add(m); this.faceMats.push(mat);
    });
    // anchors where a scene stands: local faces that come to the top as the cube rolls about its Z axis
    this.anchors = [];
    for (let k = 0; k < 4; k++) {
      const n = new THREE.Vector3(Math.sin(k * Math.PI / 2), Math.cos(k * Math.PI / 2), 0).round();
      const a = new THREE.Group();
      a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      a.position.copy(n).multiplyScalar(0.5);
      this.spin.add(a); this.anchors.push(a);
    }
    // glow: halo behind, a pool of light below, the hot printing layer
    this.halo = glowSprite(GREEN, 3.2, 0); this.halo.position.z = -0.6; this.halo.renderOrder = 1;
    this.root.add(this.halo);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: glowTex(), color: GREEN, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = -0.95; this.root.add(pool); this.pool = pool;
    const sq = new THREE.BufferGeometry().setFromPoints([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    this.layerLine = new THREE.Line(sq, new THREE.LineBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.yaw.add(this.layerLine);
    this.nozzle = glowSprite(0xffa040, 0.42, 0); this.yaw.add(this.nozzle);
    const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    this.yaw.add(ghost); this.ghost = ghost;
    this.led = 0; this.ledTarget = 1; this.night = 0;
    this.roll = 0;           // roll angle (radians, about the cube's own Z axis)
    this.hop = 0;
    this.printing = -1;      // 0..1 while the intro prints the cube
  }

  // Which anchor is on top for roll index k (k*90 degrees)
  anchorFor(k) { return this.anchors[((k % 4) + 4) % 4]; }

  setPrint(p) {
    this.printing = p;
    if (p < 0 || p >= 1) {
      this.clip.constant = 10; this.layerLine.material.opacity = 0; this.nozzle.material.opacity = 0; this.ghost.material.opacity = 0;
      return;
    }
    const h = -0.5 + p * 1.02;
    this.clip.constant = h + this.root.position.y;
    this.layerLine.position.y = h; this.layerLine.material.opacity = 0.9;
    // the nozzle runs round the layer
    const per = (p * 34) % 1, side = Math.floor(per * 4), f = (per * 4) % 1;
    const P = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5]];
    this.nozzle.position.set(P[side][0] + (P[side + 1][0] - P[side][0]) * f, h + 0.02, P[side][1] + (P[side + 1][1] - P[side][1]) * f);
    this.nozzle.material.opacity = 1;
    this.ghost.material.opacity = 0.22 * (1 - smooth((p - 0.8) / 0.2));
  }

  update(t, dt) {
    const bob = Math.sin(t * 1.15) * 0.035;
    this.root.position.y = bob + this.hop;
    this.root.rotation.z = Math.sin(t * 0.7) * 0.012;
    this.root.rotation.x = Math.sin(t * 0.53 + 1) * 0.01;
    this.spin.rotation.z = this.roll;
    if (this.printing >= 0 && this.printing < 1) this.clip.constant = this.layerLine.position.y + this.root.position.y;
    this.led += (this.ledTarget - this.led) * clamp(dt * 3);
    const pulse = 0.88 + 0.12 * Math.sin(t * 1.9);
    const e = this.led * pulse * (0.55 + this.night * 0.75);
    for (const m of this.faceMats) m.emissiveIntensity = e;
    this.halo.material.opacity = this.led * (0.22 + this.night * 0.38) * pulse;
    this.pool.material.opacity = this.led * (0.18 + this.night * 0.3) * (0.9 + 0.1 * Math.sin(t * 1.15 + 1.6)) * (1 - this.hop * 2);
  }

  // world-space plane of a local face (for clipping a scene that rises out of it)
  facePlane(anchor, out) {
    anchor.updateWorldMatrix(true, false);
    const n = new THREE.Vector3(0, 1, 0).applyQuaternion(anchor.getWorldQuaternion(new THREE.Quaternion()));
    const p = anchor.getWorldPosition(new THREE.Vector3());
    return out.setFromNormalAndCoplanarPoint(n, p.addScaledVector(n, -0.0005));
  }
}

export { easeOut };
