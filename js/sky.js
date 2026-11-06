// The backdrop: sky, the real Prokletije skyline (seen from 1.5 km north of Gusinje, 400 m up), sun, moon,
// stars, mist and snow. Colours follow the actual time of day in Gusinje (or ?t=HH.H for testing).
import * as THREE from '../vendor/three/three.module.min.js';
import { clamp, lerp, rng, glowTex, dotTex, mistTex, smooth } from './fx.js';

const LAT = 42.562, LON = 19.833;
const D2R = Math.PI / 180;

// Sun elevation and azimuth (degrees, azimuth from north clockwise), NOAA-style approximation
export function sunPosition(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const N = (date.getTime() - start) / 864e5;
  const g = 2 * Math.PI / 365 * (N - 1 + (date.getUTCHours() - 12) / 24);
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60 + eot + 4 * LON;
  const ha = (tst / 4 - 180) * D2R, lat = LAT * D2R;
  const cosZ = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const zen = Math.acos(clamp(cosZ, -1, 1));
  let az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) / D2R + 180;
  return { el: 90 - zen / D2R, az: (az + 360) % 360 };
}

// Colour keys by sun elevation
const KEYS = [
  { e: -18, top: '#060a18', hor: '#182039', glow: '#33406e', r: ['#2b3150', '#1c2136', '#111521'], fog: '#161c30', hemiS: '#41507e', hemiG: '#0b0d14', key: '#a9b9ff', keyI: 0.75, rim: '#8fa2ff', night: 1 },
  { e: -9, top: '#111a3c', hor: '#4a3f63', glow: '#c06a62', r: ['#4b4664', '#302f47', '#1c1d2c'], fog: '#3a3350', hemiS: '#6d6a9a', hemiG: '#1a1622', key: '#ffc6a8', keyI: 0.9, rim: '#ff9c7a', night: 0.8 },
  { e: -2.5, top: '#284177', hor: '#ef9a6c', glow: '#ffae78', r: ['#857595', '#55506c', '#323347'], fog: '#a17f88', hemiS: '#a8a3c8', hemiG: '#3a2c2c', key: '#ffd2a8', keyI: 1.25, rim: '#ffb07a', night: 0.4 },
  { e: 4, top: '#3b67a6', hor: '#f4c891', glow: '#ffd8a0', r: ['#9d98ad', '#6f7189', '#464c60'], fog: '#c8b3a5', hemiS: '#c9d3e8', hemiG: '#5a4b3c', key: '#ffe4c0', keyI: 1.55, rim: '#ffc890', night: 0.1 },
  { e: 15, top: '#3e77c1', hor: '#c3dbef', glow: '#fff4da', r: ['#a9bacb', '#7f96a7', '#57705f'], fog: '#bccfe0', hemiS: '#d7e6f5', hemiG: '#59624a', key: '#fff6e8', keyI: 1.75, rim: '#ffffff', night: 0 },
  { e: 45, top: '#2e6ec4', hor: '#d0e5f6', glow: '#ffffff', r: ['#b4c5d3', '#87a1ae', '#5d7a69'], fog: '#cadeee', hemiS: '#e2eef9', hemiG: '#5f6a4e', key: '#ffffff', keyI: 1.85, rim: '#ffffff', night: 0 },
];
const C = (h) => new THREE.Color(h);
function paletteAt(e) {
  let i = 0;
  while (i < KEYS.length - 2 && e > KEYS[i + 1].e) i++;
  const a = KEYS[i], b = KEYS[i + 1], t = smooth((e - a.e) / (b.e - a.e));
  const mix = (k) => C(a[k]).lerp(C(b[k]), t);
  return {
    top: mix('top'), hor: mix('hor'), glow: mix('glow'), fog: mix('fog'), hemiS: mix('hemiS'), hemiG: mix('hemiG'), key: mix('key'), rim: mix('rim'),
    r: [0, 1, 2].map((j) => C(a.r[j]).lerp(C(b.r[j]), t)), keyI: lerp(a.keyI, b.keyI, t), night: lerp(a.night, b.night, t),
  };
}

const SKY_VS = `varying vec2 vS; void main(){ vS = position.xy; gl_Position = vec4(position.xy, 0.9999, 1.0); }`;
const SKY_FS = `
uniform vec3 uTop, uHor, uGlow, uSunCol; uniform vec2 uSun; uniform float uHorY, uAspect, uSunOn, uNight;
varying vec2 vS;
void main(){
  float y = vS.y;
  float k = clamp((y - uHorY) / (1.0 - uHorY + 0.0001), 0.0, 1.0);
  vec3 c = mix(uHor, uTop, pow(k, 0.62));
  c = mix(c, uHor * 0.92, smoothstep(uHorY, uHorY - 0.6, y));
  vec2 d = vec2((vS.x - uSun.x) * uAspect, vS.y - uSun.y);
  float r = length(d);
  c += uGlow * (0.55 * exp(-r * 2.4) + 0.25 * exp(-r * 0.9)) * uSunOn;
  c += uGlow * 0.18 * exp(-abs(y - uHorY) * 7.0) * (1.0 - uNight);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export class Sky {
  constructor(scene, data, opts = {}) {
    this.scene = scene; this.data = data; this.opts = opts;
    this.group = new THREE.Group(); this.group.name = 'backdrop';
    scene.add(this.group);
    this.H0 = -22.5 * D2R;              // where the skyline's horizon (0°) sits, relative to the camera's level
    this.KY = 0.62;                    // vertical exaggeration of the elevation angles
    this.azC = 192;                    // centre of the view: between Maja Rosit and Karanfili
    // sky (full-screen quad, drawn first)
    this.skyU = {
      uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSunCol: { value: new THREE.Color() },
      uSun: { value: new THREE.Vector2(0, 0.4) }, uHorY: { value: 0 }, uAspect: { value: 1 }, uSunOn: { value: 1 }, uNight: { value: 0 },
    };
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: this.skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, depthWrite: false, depthTest: false }));
    sky.frustumCulled = false; sky.renderOrder = -10;
    scene.add(sky); this.sky = sky;
    // stars
    const R = rng(21), n = 260, sp = new Float32Array(n * 3), sz = new Float32Array(n);
    for (let i = 0; i < n; i++) { sp.set([(R() - 0.5) * 2.2, R() * 0.9, (R() - 0.5) * 0.1], i * 3); sz[i] = R(); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('tw', new THREE.BufferAttribute(sz, 1));
    this.starU = { uOp: { value: 0 }, uTime: { value: 0 }, uScale: { value: 1 }, uMap: { value: dotTex() } };
    this.stars = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: this.starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float tw; uniform float uTime, uScale; varying float vA;
        void main(){ vA = 0.45 + 0.55 * sin(uTime * (0.8 + tw * 2.0) + tw * 40.0); vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv; gl_PointSize = (1.2 + tw * 2.4) * uScale; }`,
      fragmentShader: `uniform float uOp; uniform sampler2D uMap; varying float vA;
        void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vec3(1.0, 0.97, 0.9), a * vA * uOp); }`,
    }));
    this.stars.frustumCulled = false; this.stars.renderOrder = -9;
    this.group.add(this.stars);
    // sun / moon
    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), transparent: true, depthWrite: false, fog: false }));
    this.sun.renderOrder = this.sunCore.renderOrder = -8;
    this.group.add(this.sun, this.sunCore);
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uOp: { value: 0 } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uOp; varying vec2 vP; void main(){ float r = length(vP); float lit = smoothstep(-0.25, 0.35, vP.x * 0.8 - vP.y * 0.25 + 0.15);
        vec3 c = mix(vec3(0.42, 0.45, 0.55), vec3(1.0, 0.97, 0.88), lit) - 0.06 * sin(vP.x * 9.0) * sin(vP.y * 7.0);
        gl_FragColor = vec4(c, (1.0 - smoothstep(0.96, 1.0, r)) * uOp); }`,
    }));
    this.moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0x9fb0ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.moon.renderOrder = this.moonGlow.renderOrder = -8;
    this.group.add(this.moon, this.moonGlow);
    // ridges (far -> near) and mist between them
    this.layers = [];
    const DIST = [34, 22, 13];
    for (let j = 0; j < 3; j++) {
      const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      mesh.renderOrder = -7 + j; mesh.frustumCulled = false;
      this.group.add(mesh); this.layers.push({ mesh, d: DIST[j], prof: data.prof[3 - j] });
    }
    this.mists = [];
    for (const [d, op, sp2] of [[27, 0.55, 0.006], [17, 0.42, -0.01], [10, 0.3, 0.014]]) {
      const tex = mistTex().clone(); tex.needsUpdate = true; tex.repeat.set(2.5, 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: op, fog: false }));
      m.renderOrder = -6.5 + this.mists.length; m.frustumCulled = false;
      this.group.add(m); this.mists.push({ m, d, sp: sp2, op });
    }
    // snow (winter months) / floating motes
    this.snow = null;
    const month = (opts.date || new Date()).getMonth();
    this.snowy = opts.season === 'winter' || (opts.season !== 'summer' && (month >= 10 || month <= 3));
    if (opts.season === 'winter' || (opts.season !== 'summer' && (month === 11 || month <= 1))) this.makeSnow();
    // lights
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    this.key = new THREE.DirectionalLight(0xffffff, 1.6);
    this.key.position.set(-2.4, 4.2, 3.2);
    this.rim = new THREE.DirectionalLight(0xffffff, 0.9);
    this.rim.position.set(1.5, 2.2, -4);
    scene.add(this.hemi, this.key, this.key.target, this.rim);
    this.setTime(opts.date || new Date(), opts.hours);
  }

  makeSnow() {
    const n = 420, R = rng(77), p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.set([(R() - 0.5) * 9, R() * 6 - 2, -R() * 6 + 2], i * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.snow = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex(), size: 0.035, transparent: true, opacity: 0.8, depthWrite: false, color: 0xffffff }));
    this.snow.frustumCulled = false;
    this.scene.add(this.snow);
  }

  setTime(date, hours) {
    let d = date;
    if (hours != null && !isNaN(hours)) {               // ?t=HH.H : that local (Podgorica) hour today
      d = new Date(date); const off = 60;                 // CET; good enough for a preview
      d.setUTCHours(Math.floor(hours - off / 60), Math.round((hours % 1) * 60), 0, 0);
    }
    this.sunPos = sunPosition(d);
    this.pal = paletteAt(this.sunPos.el);
    const P = this.pal;
    this.skyU.uTop.value.copy(P.top); this.skyU.uHor.value.copy(P.hor); this.skyU.uGlow.value.copy(P.glow);
    this.skyU.uNight.value = P.night;
    this.scene.fog = new THREE.Fog(P.fog, 11, 60);
    this.layers.forEach((L, j) => { L.top = P.r[j]; });
    this.mists.forEach((M, j) => { M.m.material.color.copy(P.fog).lerp(new THREE.Color(1, 1, 1), 0.25 - P.night * 0.15); });
    this.hemi.color.copy(P.hemiS); this.hemi.groundColor.copy(P.hemiG); this.hemi.intensity = lerp(1.25, 0.75, P.night);
    this.key.color.copy(P.key); this.key.intensity = P.keyI;
    this.rim.color.copy(P.rim); this.rim.intensity = lerp(1.1, 0.6, P.night);
    this.night = P.night;
    if (this.cam) this.layout(this.cam.camera, this.cam.pitch, this.cam.hfov);
  }

  // Place the backdrop for the current camera (called on resize). Everything sits in a group at the camera's position,
  // so small camera moves give real parallax between the ridge layers.
  layout(camera, pitch, hfov) {
    this.cam = { camera, pitch, hfov };
    const G = this.group; G.position.copy(camera.position); G.rotation.set(0, 0, 0);
    const S = this.data, N = S.N;
    const span = S.A1 - S.A0;
    const KX = Math.max(0.36, (hfov / D2R) * 0.85 / span);        // degrees of skyline per degree of view, never leaves a gap
    this.KX = KX;
    const yAt = (d, el) => d * Math.tan(pitch * 0 + this.H0 + el * this.KY * D2R);
    const xAt = (d, az) => d * Math.tan(clamp((az - this.azC) * KX * D2R, -1.5, 1.5));
    const snowLine = 3.4;
    this.layers.forEach((L, j) => {
      const d = L.d, prof = L.prof.map((v, i, a) => (a[Math.max(0, i - 1)] + 2 * v + a[Math.min(N - 1, i + 1)]) / 4);
      const pos = [], col = [], idx = [];
      const top = L.top || new THREE.Color(0.5, 0.5, 0.5), bot = (this.pal ? this.pal.fog : top).clone().lerp(top, 0.35 + j * 0.25);
      const snow = new THREE.Color(0.93, 0.95, 1.0).lerp(top, 0.25 + (this.night || 0) * 0.45);
      const lit = top.clone().lerp(this.pal ? this.pal.glow : top, 0.22 * (1 - (this.night || 0)));
      // the profile is extended at both ends by mirroring it, so wide or shifted views never see its edge
      const ext = Math.round(N * 0.6), M = N + 2 * ext;
      const at = (i) => { let q = i; while (q < 0 || q >= N) q = q < 0 ? -q : 2 * (N - 1) - q; return prof[q]; };
      for (let m = 0; m < M; m++) {
        const i = m - ext, az = S.A0 + span * i / (N - 1), el = Math.max(at(i), -6), x = xAt(d, az);
        const yT = yAt(d, el), yM = yAt(d, el - 0.55), yB = yAt(d, -14) - 30;
        pos.push(x, yT, -d, x, yM, -d, x, yB, -d);
        const capped = j === 0 && this.snowy && el > snowLine ? smooth((el - snowLine) / 0.9) : 0;
        const ct = lit.clone().lerp(snow, capped);
        col.push(ct.r, ct.g, ct.b, ...(capped > 0.5 ? snow.clone().lerp(top, 0.4).toArray() : top.toArray()), bot.r, bot.g, bot.b);
        if (m) { const a = (m - 1) * 3, b = m * 3; idx.push(a, a + 1, b, b, a + 1, b + 1, a + 1, a + 2, b + 1, b + 1, a + 2, b + 2); }
      }
      const g = L.mesh.geometry;
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx); g.computeBoundingSphere();
    });
    this.mists.forEach((M) => {
      const w = 2 * M.d * Math.tan(Math.min(1.4, hfov * 0.9)), h = M.d * 0.22;
      M.m.scale.set(w, h, 1); M.m.position.set(0, yAt(M.d, -3.2), -M.d - 0.5);
    });
    // stars across the upper sky
    this.stars.position.set(0, yAt(60, 0), -60); this.stars.scale.set(60 * Math.tan(hfov), 60 * 0.9, 1);
    // sun: real azimuth if it is in the view, else at the nearest edge
    const sp = this.sunPos, d = 50;
    const sAz = clamp(sp.az, S.A0 + 6, S.A1 - 6), sEl = sp.el;
    this.sun.position.set(xAt(d, sAz), yAt(d, sEl), -d);
    this.sunCore.position.copy(this.sun.position);
    const sunVis = clamp((sEl + 3) / 4) * (1 - clamp(Math.abs(sp.az - sAz) / 25));
    this.sunVis = sunVis;
    this.sun.scale.setScalar(d * 0.55); this.sunCore.scale.setScalar(d * 0.07);
    this.sun.material.color.copy(this.pal.glow); this.sun.material.opacity = 0.9 * sunVis;
    this.sunCore.material.color.copy(this.pal.glow).lerp(new THREE.Color(1, 1, 1), 0.6); this.sunCore.material.opacity = sunVis;
    // moon at night, high over Karanfili
    const mo = clamp(this.night * 1.4 - 0.3);
    this.moon.position.set(xAt(d, 203), yAt(d, 9.5), -d); this.moon.scale.setScalar(d * 0.022);
    this.moon.material.uniforms.uOp.value = mo;
    this.moonGlow.position.copy(this.moon.position); this.moonGlow.scale.setScalar(d * 0.2); this.moonGlow.material.opacity = 0.45 * mo;
    this.starU.uOp.value = clamp(this.night * 1.3 - 0.25);
  }

  // screen position of the horizon and the sun for the sky shader
  update(t, dt, camera, dpr) {
    this.starU.uTime.value = t; this.starU.uScale.value = dpr;
    const v = new THREE.Vector3();
    this.group.updateMatrixWorld();
    v.set(0, this.group.position.y + 40 * Math.tan(this.H0), this.group.position.z - 40).project(camera);
    this.skyU.uHorY.value = v.y;
    this.sun.getWorldPosition(v); v.project(camera);
    if (this.night > 0.6) { this.moon.getWorldPosition(v); v.project(camera); }
    this.skyU.uSun.value.set(v.x, v.y);
    this.skyU.uSunOn.value = Math.max(this.sunVis || 0, this.night > 0.6 ? 0.25 : 0);
    this.skyU.uAspect.value = camera.aspect;
    for (const M of this.mists) M.m.material.map.offset.x = (M.m.material.map.offset.x + dt * M.sp) % 1;
    if (this.snow) {
      const p = this.snow.geometry.attributes.position, a = p.array;
      for (let i = 0; i < a.length; i += 3) {
        a[i + 1] -= dt * (0.18 + (i % 7) * 0.02); a[i] += Math.sin(t * 0.7 + i) * dt * 0.05;
        if (a[i + 1] < -2.2) a[i + 1] += 6;
      }
      p.needsUpdate = true;
    }
  }
}
