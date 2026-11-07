// The Xplore Prokletije logo, alive: the kula from the emblem is a real 3D tower that slowly turns
// (window face, QR face, hip roof, the blue base frame and its little square), and the letters, cut from the
// vector logo, ride a calm wave like boats on still water. Flat brand colours, shaded by hand per face.
import * as THREE from '../../vendor/three/three.module.min.js';
import { parsePath, toShapes, LW, LH } from '../logo.js';

const INK = '#1d1f22', BLUE = '#1a66f0', PAPER = '#ffffff';
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeBack = (t, s = 1.7) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };

function faceCanvas(draw, w = 256, h = 320) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Window face: dark, two rows of three arched windows, the arched door
function windowFace() {
  return faceCanvas((g, w, h) => {
    g.fillStyle = INK; g.fillRect(0, 0, w, h);
    const arch = (cx, top, ww, hh, lw, fillInk = true) => {
      g.beginPath();
      g.moveTo(cx - ww / 2, top + hh); g.lineTo(cx - ww / 2, top + ww / 2);
      g.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); g.lineTo(cx + ww / 2, top + hh); g.closePath();
      g.fillStyle = '#ffffff'; g.fill();
      g.beginPath();
      const i = lw;
      g.moveTo(cx - ww / 2 + i, top + hh - i * 0.2); g.lineTo(cx - ww / 2 + i, top + ww / 2);
      g.arc(cx, top + ww / 2, ww / 2 - i, Math.PI, 0); g.lineTo(cx + ww / 2 - i, top + hh - i * 0.2); g.closePath();
      if (fillInk) { g.fillStyle = INK; g.fill(); }
    };
    for (const row of [0.2, 0.44]) for (const col of [0.24, 0.5, 0.76]) arch(col * w, row * h, w * 0.12, h * 0.12, w * 0.028);
    arch(w * 0.5, h * 0.68, w * 0.27, h * 0.32, w * 0.05);
  });
}

// QR face: blue blocks on white, a finder square at the top left, as on the logo
function qrFace() {
  return faceCanvas((g, w, h) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, w, h);
    const cols = 8, rows = 10, cw = w / cols, ch = h / rows;
    g.fillStyle = BLUE;
    const cell = (c, r, s = 0.86) => g.fillRect(c * cw + cw * (1 - s) / 2, r * ch + ch * (1 - s) / 2, cw * s, ch * s);
    // finder
    g.fillRect(cw * 0.5, ch * 0.5, cw * 3, ch * 3);
    g.fillStyle = PAPER; g.fillRect(cw * 0.95, ch * 0.95, cw * 2.1, ch * 2.1);
    g.fillStyle = BLUE; g.fillRect(cw * 1.45, ch * 1.45, cw * 1.1, ch * 1.1);
    const on = [
      [5, 0], [6, 1], [5, 2], [7, 3], [4, 1], [6, 3],
      [0, 4], [2, 4], [3, 5], [5, 4], [6, 5], [1, 5],
      [0, 6], [2, 6], [4, 6], [5, 6], [7, 6], [3, 7],
      [1, 7], [6, 7], [0, 8], [2, 8], [3, 8], [5, 8], [7, 8], [4, 9], [1, 9], [6, 9],
    ];
    for (const [c, r] of on) cell(c, r);
    g.fillRect(cw * 4, ch * 2.3, cw * 1.6, ch * 1.4);
  });
}

export class LogoKula {
  constructor(svgText) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(16, 2.4, 10, 20000);
    this.group = new THREE.Group(); this.scene.add(this.group);
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    // letters: every shape to the right of the emblem, grouped by colour
    this.letters = [];
    const inkCap = new THREE.MeshBasicMaterial({ color: INK, toneMapped: false }), inkSide = new THREE.MeshBasicMaterial({ color: '#000000', toneMapped: false });
    const bluCap = new THREE.MeshBasicMaterial({ color: BLUE, toneMapped: false }), bluSide = new THREE.MeshBasicMaterial({ color: '#0b3fa8', toneMapped: false });
    for (const el of doc.querySelectorAll('path')) {
      const blue = (el.getAttribute('fill') || '').toLowerCase() === BLUE;
      for (const s of toShapes(parsePath(el.getAttribute('d')))) {
        if (s.box[0] < 480) continue;
        const geo = new THREE.ExtrudeGeometry(s.shape, { depth: 16, bevelEnabled: true, bevelThickness: 2.4, bevelSize: 1.4, bevelSegments: 1, curveSegments: 2 });
        const cx = (s.box[0] + s.box[2]) / 2 - LW / 2, cy = LH / 2 - (s.box[1] + s.box[3]) / 2;
        geo.translate(-cx, -cy, -8);
        const m = new THREE.Mesh(geo, blue ? [bluCap, bluSide] : [inkCap, inkSide]);
        m.position.set(cx, cy, 0);
        this.group.add(m);
        this.letters.push({ m, x: cx, y: cy, blue, h: s.box[3] - s.box[1], order: 0 });
      }
    }
    this.letters.sort((a, b) => (a.blue - b.blue) || (a.x - b.x));
    this.letters.forEach((l, i) => { l.order = i; });
    // the kula
    const K = 228;                                   // model unit -> logo units
    this.kulaRoot = new THREE.Group();
    this.kulaRoot.position.set(269 - LW / 2, LH / 2 - 390, 0);
    this.kulaRoot.scale.setScalar(K);
    this.group.add(this.kulaRoot);
    this.tilt = new THREE.Group(); this.tilt.rotation.x = 0.36; this.kulaRoot.add(this.tilt);
    this.spin = new THREE.Group(); this.tilt.add(this.spin);
    const winT = windowFace(), qrT = qrFace();
    this.faces = [];
    const face = (map, normal) => { const m = new THREE.MeshBasicMaterial({ map, toneMapped: false }); this.faces.push({ m, n: normal, base: 1 }); return m; };
    const plain = (color, normal, base = 1) => { const m = new THREE.MeshBasicMaterial({ color, toneMapped: false }); this.faces.push({ m, n: normal, base, color: new THREE.Color(color) }); return m; };
    const W = 1, H = 1.22;
    // BoxGeometry groups: +x, -x, +y, -y, +z, -z
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, W), [
      face(qrT, new THREE.Vector3(1, 0, 0)), face(qrT, new THREE.Vector3(-1, 0, 0)),
      plain(INK, new THREE.Vector3(0, 1, 0)), plain(INK, new THREE.Vector3(0, -1, 0)),
      face(winT, new THREE.Vector3(0, 0, 1)), face(winT, new THREE.Vector3(0, 0, -1)),
    ]);
    body.position.y = H / 2 + 0.04;
    this.spin.add(body);
    // thin ink edges so the white QR faces read against the paper
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: '#c9ced6', toneMapped: false }));
    edges.position.copy(body.position); this.spin.add(edges);
    // hip roof with eaves: four triangles, each its own shade
    const R = 0.68, RH = 0.5, y0 = H + 0.04;
    const corners = [[R, R], [-R, R], [-R, -R], [R, -R]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, y0, az), new THREE.Vector3(bx, y0, bz), new THREE.Vector3(0, y0 + RH, 0)]);
      geo.computeVertexNormals();
      const mid = new THREE.Vector3((ax + bx) / 2, 0, (az + bz) / 2).normalize();
      const n = new THREE.Vector3(mid.x * RH, R, mid.z * RH).normalize();
      const m = new THREE.Mesh(geo, plain(INK, n, 1.05)); m.material.side = THREE.DoubleSide;
      this.spin.add(m);
    }
    const eave = new THREE.Mesh(new THREE.BoxGeometry(R * 2, 0.035, R * 2), plain('#2a2d31', new THREE.Vector3(0, -1, 0), 1)); eave.position.y = y0;
    this.spin.add(eave);
    // the base frame and its square
    const bm = plain(BLUE, new THREE.Vector3(0, 1, 0), 1.0);
    const F = 0.98, T = 0.075;
    for (const [x, z, w, d] of [[0, F, F * 2 + T, T], [0, -F, F * 2 + T, T], [F, 0, T, F * 2], [-F, 0, T, F * 2]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), bm); bar.position.set(x, 0.02, z); this.spin.add(bar);
    }
    this.marker = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), plain(BLUE, new THREE.Vector3(0, 1, 0), 0.95));
    this.marker.position.set(F + 0.2, 0.075, F + 0.2); this.spin.add(this.marker);
    // soft shadow on the paper
    const sc = document.createElement('canvas'); sc.width = sc.height = 128;
    const sg = sc.getContext('2d'), gr = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(23,34,42,0.28)'); gr.addColorStop(1, 'rgba(23,34,42,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
    const st = new THREE.CanvasTexture(sc);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.9), new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false }));
    this.shadow.position.set(0, -0.12, -0.5); this.kulaRoot.add(this.shadow);
    this.yaw0 = 0.62;
    this.light = new THREE.Vector3(-0.55, 0.75, 0.6).normalize();
    this.t0 = null; this.reduced = false;
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    const fitW = (LW * 1.02) / 2 / Math.tan((this.camera.fov * Math.PI) / 360) / this.camera.aspect;
    const fitH = (LH * 1.22) / 2 / Math.tan((this.camera.fov * Math.PI) / 360);
    const d = Math.max(fitW, fitH);
    this.camera.position.set(0, -6, d); this.camera.lookAt(0, -6, 0);
    this.camera.near = d * 0.5; this.camera.far = d * 2;
    this.camera.updateProjectionMatrix();
  }

  update(t, intro = 1) {
    // intro: kula rises with a turn, letters drop onto the "water" one after another
    const k = clamp(intro);
    const rise = easeBack(clamp(k / 0.55), 1.4);
    const yaw = this.yaw0 + (this.reduced ? 0 : t * (Math.PI * 2 / 24)) - (1 - easeOut(clamp(k / 0.7))) * Math.PI * 1.2;
    this.spin.rotation.y = yaw;
    this.kulaRoot.scale.setScalar(228 * Math.max(0.001, rise));
    this.shadow.material.opacity = clamp(k / 0.5);
    // hand shading: brightness by how much each face looks at the light
    const q = new THREE.Quaternion();
    this.spin.getWorldQuaternion(q);
    const n = new THREE.Vector3();
    for (const f of this.faces) {
      n.copy(f.n).applyQuaternion(q);
      const s = (0.78 + 0.3 * Math.max(0, n.dot(this.light))) * f.base;
      if (f.color) f.m.color.copy(f.color).multiplyScalar(f.color.r + f.color.g + f.color.b < 0.4 ? 0.85 + 0.6 * (s - 0.78) : s);
      else f.m.color.setScalar(Math.min(1.08, s));
    }
    // waves
    const A = this.reduced ? 0 : 6.5, w = 1.25, kx = (Math.PI * 2) / 560;
    for (const L of this.letters) {
      const drop = clamp((k - 0.25 - L.order * 0.035) / 0.4);
      const ph = t * w - L.x * kx;
      const y = Math.sin(ph) * A, slope = Math.cos(ph) * A * kx;
      L.m.position.y = L.y + y + (1 - easeOut(drop)) * 140;
      L.m.rotation.z = -slope * 0.9;
      L.m.rotation.x = Math.sin(ph + 0.8) * 0.05 * (A ? 1 : 0);
      const sq = drop < 1 ? 1 + Math.sin(drop * Math.PI) * 0.12 : 1;
      L.m.scale.set(1 / Math.sqrt(sq), sq, 1);
      L.m.visible = drop > 0;
    }
    this.marker.position.y = 0.075 + (this.reduced ? 0 : Math.max(0, Math.sin(t * 2.2)) * 0.04);
  }
}
