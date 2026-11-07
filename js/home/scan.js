// The header: the real photo of the Prokletije peaks above Grebaje, slowly scanned into a digital "x-ray" and back.
// Loop (16 s): photo -> a slanted scan beam sweeps across and digitises it (cool x-ray grade, glowing rock edges,
// a triangulated wire mesh that draws itself, nodes, data paths, summit markers, floating cubes) -> hold ->
// a second sweep clears it -> photo. The photo's pixels are never moved: the mountains stay exactly as photographed.
//
// Reusable: new MountainScan({ photo, mask, data }) then setSize(w, h, dpr), update(seconds), and render the
// .scene with .camera into a viewport of that size. Opaque; its lower part fades into `paper`.
import * as THREE from '../../vendor/three/three.module.min.js';

export const PERIOD = 16;
const SLANT = 0.32, SOFT = 0.07;
const T_IN = [2.2, 3.4], T_OUT = [10.2, 3.4];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Where the two beams are at loop time p (in slanted image units), and how visible each beam is
export function timeline(p) {
  const kIn = clamp((p - T_IN[0]) / T_IN[1]), kOut = clamp((p - T_OUT[0]) / T_OUT[1]);
  return {
    bIn: -0.4 + 1.85 * ease(kIn), bOut: -0.4 + 1.85 * ease(kOut),
    aIn: kIn > 0 && kIn < 1 ? Math.sin(Math.PI * kIn) ** 0.5 : 0,
    aOut: kOut > 0 && kOut < 1 ? Math.sin(Math.PI * kOut) ** 0.5 : 0,
  };
}
export function digitalAt(u, v, st) {
  const x = u + (v - 0.5) * SLANT;
  return clamp((st.bIn - x) / SOFT) * (1 - clamp((st.bOut - x) / SOFT));
}

const GLSL_COMMON = /* glsl */`
uniform float uBIn, uBOut, uAIn, uAOut, uTime, uFadeA, uFadeB;
float slantX(vec2 uv) { return uv.x + (uv.y - 0.5) * ${SLANT.toFixed(3)}; }
float digital(float x) { return clamp((uBIn - x) / ${SOFT.toFixed(3)}, 0.0, 1.0) * (1.0 - clamp((uBOut - x) / ${SOFT.toFixed(3)}, 0.0, 1.0)); }
float reveal(float x) { return clamp((uBIn - x) / 0.06, 0.0, 1.0); }
float hideK(float x) { return clamp((uBOut - x) / 0.05, 0.0, 1.0); }
`;

const PHOTO_VS = /* glsl */`
varying vec2 vUv; varying float vSy;
void main() {
  vUv = vec2(uv.x, 1.0 - uv.y);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vSy = p.y / p.w * 0.5 + 0.5;
  gl_Position = p;
}`;

const PHOTO_FS = /* glsl */`
uniform sampler2D uPhoto, uMask; uniform vec2 uTexel; uniform vec3 uPaper; uniform float uLoop;
${GLSL_COMMON}
varying vec2 vUv; varying float vSy;
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 photoAt(vec2 uv) { return texture2D(uPhoto, vec2(uv.x, 1.0 - uv.y)).rgb; }
void main() {
  vec2 uv = vUv;
  vec4 m = texture2D(uMask, vec2(uv.x, 1.0 - uv.y));
  float land = m.r, mist = m.g, forest = m.b;
  // only the mist breathes, very little; the rock never moves
  float ph = uLoop * 6.28318;
  uv += mist * vec2(sin(ph * 2.0 + uv.y * 9.0), cos(ph + uv.x * 7.0)) * vec2(0.0022, 0.0012);
  float x = slantX(uv);
  float d = digital(x);
  // chromatic split right at the beam front
  float near = exp(-abs(x - uBIn) * 70.0) * uAIn + exp(-abs(x - uBOut) * 70.0) * uAOut;
  vec3 c = photoAt(uv);
  if (near > 0.02) { c.r = photoAt(uv + vec2(uTexel.x * 3.0 * near, 0.0)).r; c.b = photoAt(uv - vec2(uTexel.x * 3.0 * near, 0.0)).b; }
  vec3 col = c;
  if (d > 0.001) {
    float l = lum(c);
    // rock edges (Sobel, 1.6 texel step so the JPEG blocks don't show)
    vec2 s = uTexel * 1.6;
    float tl = lum(photoAt(uv + vec2(-s.x, -s.y))), t = lum(photoAt(uv + vec2(0.0, -s.y))), tr = lum(photoAt(uv + vec2(s.x, -s.y)));
    float ml = lum(photoAt(uv + vec2(-s.x, 0.0))), mr = lum(photoAt(uv + vec2(s.x, 0.0)));
    float bl = lum(photoAt(uv + vec2(-s.x, s.y))), b = lum(photoAt(uv + vec2(0.0, s.y))), br = lum(photoAt(uv + vec2(s.x, s.y)));
    float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl), gy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);
    float edge = clamp(sqrt(gx * gx + gy * gy) * 2.4, 0.0, 1.0);
    // sky: deep navy, clouds kept as soft steel blue
    vec3 skyD = mix(vec3(0.006, 0.026, 0.075), vec3(0.002, 0.010, 0.034), 1.0 - smoothstep(0.0, 0.7, uv.y));
    skyD += vec3(0.10, 0.20, 0.36) * pow(l, 1.5) * 0.9;
    // land: the rock as a cold steel-blue x-ray with glowing contours, forest dark teal, mist a cold haze
    float lc = pow(l, 0.95);
    vec3 landD = mix(vec3(0.003, 0.016, 0.042), vec3(0.20, 0.42, 0.62), smoothstep(0.0, 0.75, lc));
    landD += vec3(0.25, 0.42, 0.50) * smoothstep(0.55, 0.95, lc);            // snow stays the brightest
    landD = mix(landD, c * vec3(0.18, 0.50, 0.48), forest * 0.7);
    landD += edge * vec3(0.10, 0.55, 0.85) * (0.25 + 0.55 * land) * (1.0 - forest * 0.6);
    landD = mix(landD, vec3(0.30, 0.50, 0.70), mist * 0.4);
    vec3 dig = mix(skyD, landD, land);
    dig *= 0.93 + 0.07 * sin(gl_FragCoord.y * 1.6);                         // fine scan lines
    float shimmer = d * (1.0 - d) * 4.0;                                     // the freshly scanned edge flares
    dig += vec3(0.25, 0.75, 1.0) * shimmer * 0.35;
    col = mix(c, dig, d);
  }
  // the beam: a translucent slanted sheet with a bright leading edge
  float bi = uAIn * (exp(-abs(x - uBIn) * 160.0) * 1.4 + (1.0 - smoothstep(0.0, 0.16, uBIn - x)) * step(x, uBIn) * 0.16);
  float bo = uAOut * (exp(-abs(x - uBOut) * 160.0) * 1.4 + (1.0 - smoothstep(0.0, 0.16, uBOut - x)) * step(x, uBOut) * 0.12);
  col += vec3(0.30, 0.85, 1.0) * (bi + bo);
  // fade into the paper below
  float fade = smoothstep(uFadeA, uFadeB, vSy);
  gl_FragColor = vec4(mix(uPaper, col, fade), 1.0);
  #include <colorspace_fragment>
}`;

// Screen-space thick lines with a soft glow; each edge draws itself once the beam has passed its middle
const LINE_VS = /* glsl */`
attribute vec3 aOther; attribute float aSide, aEnd, aX, aRand, aW;
uniform vec2 uRes; uniform float uWidth;
${GLSL_COMMON}
varying float vAcross, vAlong, vProg, vAmt, vFade, vPulse;
void main() {
  vec4 cT = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec4 cO = projectionMatrix * modelViewMatrix * vec4(aOther, 1.0);
  vec2 sT = cT.xy / cT.w * uRes * 0.5, sO = cO.xy / cO.w * uRes * 0.5;
  vec2 dir = normalize((sO - sT) * (aEnd < 0.5 ? 1.0 : -1.0) + 1e-6);
  vec2 n = vec2(-dir.y, dir.x) * aSide;
  cT.xy += n * uWidth * 0.5 / (uRes * 0.5) * cT.w;
  gl_Position = cT;
  vAcross = aSide; vAlong = aEnd;
  float jitter = aRand * 0.05;
  vProg = reveal(aX + jitter);
  vAmt = aW * (1.0 - hideK(aX + jitter * 1.6));
  vFade = smoothstep(uFadeA + 0.14, uFadeB + 0.22, cT.y / cT.w * 0.5 + 0.5);
  vPulse = smoothstep(0.86, 1.0, sin(uTime * 1.7 - aX * 13.0 + aRand * 6.28));
}`;
const LINE_FS = /* glsl */`
uniform vec3 uColor; uniform float uCore, uGain;
varying float vAcross, vAlong, vProg, vAmt, vFade, vPulse;
void main() {
  if (vAlong > vProg || vAmt <= 0.001) discard;
  float a = abs(vAcross);
  float core = 1.0 - smoothstep(uCore * 0.35, uCore, a);
  float glow = exp(-a * a * 5.0) * 0.42;
  float k = (core + glow) * vAmt * vFade * uGain * (1.0 + vPulse * 1.6);
  vec3 c = mix(uColor, vec3(1.0), core * 0.3 + vPulse * 0.35);
  gl_FragColor = vec4(c * k, 0.0);
}`;

const POINT_VS = /* glsl */`
attribute float aX, aRand, aSize, aW;
uniform float uDpr;
${GLSL_COMMON}
varying float vA, vFade;
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p;
  float r = reveal(aX + aRand * 0.05);
  float pop = r < 1.0 ? r * (1.0 + 0.8 * sin(r * 3.14159)) : 1.0;
  float tw = 0.65 + 0.35 * sin(uTime * (2.0 + aRand * 3.0) + aRand * 40.0);
  vA = aW * tw * (1.0 - hideK(aX + aRand * 0.08)) * step(0.001, r);
  vFade = smoothstep(uFadeA + 0.14, uFadeB + 0.22, p.y / p.w * 0.5 + 0.5);
  gl_PointSize = aSize * uDpr * pop;
}`;
const POINT_FS = /* glsl */`
uniform vec3 uColor;
varying float vA, vFade;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0; float r2 = dot(q, q);
  if (r2 > 1.0 || vA <= 0.001) discard;
  float k = ((1.0 - smoothstep(0.0, 0.35, r2)) + exp(-r2 * 4.0) * 0.45) * vA * vFade;
  gl_FragColor = vec4(mix(uColor, vec3(1.0), 1.0 - smoothstep(0.0, 0.3, r2)) * k, 0.0);
}`;

const PATH_VS = /* glsl */`
attribute float aX, aS;
uniform float uDpr;
${GLSL_COMMON}
varying float vA, vFade;
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p;
  float on = digital(aX) * reveal(aX - 0.12);
  float flow = pow(fract(aS * 5.0 - uTime * 0.22), 6.0);
  vA = on * (0.35 + 0.9 * flow);
  vFade = smoothstep(uFadeA + 0.14, uFadeB + 0.22, p.y / p.w * 0.5 + 0.5);
  gl_PointSize = (2.6 + 2.4 * flow) * uDpr;
}`;

function additive(mat) {
  mat.transparent = true; mat.depthTest = false; mat.depthWrite = false;
  mat.blending = THREE.CustomBlending;
  mat.blendSrc = THREE.OneFactor; mat.blendDst = THREE.OneFactor;
  mat.blendSrcAlpha = THREE.ZeroFactor; mat.blendDstAlpha = THREE.OneFactor;
  return mat;
}

function plusTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(120,220,255,0.55)'); gr.addColorStop(1, 'rgba(120,220,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#ffffff'; g.lineCap = 'round';
  g.shadowColor = '#7fe0ff'; g.shadowBlur = 10;
  g.lineWidth = 7; g.beginPath(); g.moveTo(64, 18); g.lineTo(64, 110); g.moveTo(18, 64); g.lineTo(110, 64); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 22, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class MountainScan {
  constructor({ photo, mask, data, paper = '#f5f3ee' }) {
    this.data = data;
    this.iw = data.w; this.ih = data.h;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, -1, -100, 100);
    this.img = new THREE.Group(); this.scene.add(this.img);
    photo.colorSpace = THREE.SRGBColorSpace; photo.anisotropy = 4;
    photo.minFilter = THREE.LinearMipmapLinearFilter; photo.generateMipmaps = true;
    mask.colorSpace = THREE.NoColorSpace;
    const U = this.u = {
      uBIn: { value: -1 }, uBOut: { value: -1 }, uAIn: { value: 0 }, uAOut: { value: 0 }, uTime: { value: 0 }, uLoop: { value: 0 },
      uFadeA: { value: 0.0 }, uFadeB: { value: 0.4 },
    };
    // the photo plane (image space: x right, y down = negative)
    const photoMat = new THREE.ShaderMaterial({
      uniforms: { ...U, uPhoto: { value: photo }, uMask: { value: mask }, uTexel: { value: new THREE.Vector2(1 / this.iw, 1 / this.ih) }, uPaper: { value: new THREE.Color(paper) } },
      vertexShader: PHOTO_VS, fragmentShader: PHOTO_FS, depthTest: false, depthWrite: false,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(this.iw, this.ih), photoMat);
    plane.position.set(this.iw / 2, -this.ih / 2, 0); plane.renderOrder = 0;
    this.img.add(plane);
    this.res = new THREE.Vector2(1, 1);
    this.dpr = { value: 1 };
    // wire mesh
    const V = data.verts.map(([u, v, w, deg]) => ({ p: new THREE.Vector3(u * this.iw, -v * this.ih, 0), u, v, w, deg }));
    const edges = data.edges.map(([a, b]) => [V[a], V[b], Math.random()]);
    this.wire = this.lines(edges, { width: 3.6, core: 0.34, gain: 0.42, color: 0x3fb6ff });
    this.wire.renderOrder = 2; this.img.add(this.wire);
    // the skyline itself, brighter
    const R = data.ridge.map(([u, v]) => ({ p: new THREE.Vector3(u * this.iw, -v * this.ih, 0), u, v, w: 1 }));
    const segs = []; for (let i = 1; i < R.length; i++) segs.push([R[i - 1], R[i], 0.2]);
    this.ridge = this.lines(segs, { width: 6, core: 0.3, gain: 1.1, color: 0x9fe6ff });
    this.ridge.renderOrder = 3; this.img.add(this.ridge);
    // nodes
    {
      const n = V.length, pos = new Float32Array(n * 3), ax = new Float32Array(n), ar = new Float32Array(n), as = new Float32Array(n), aw = new Float32Array(n);
      V.forEach((q, i) => {
        pos.set([q.p.x, q.p.y, 0], i * 3); ax[i] = q.u + (q.v - 0.5) * SLANT; ar[i] = Math.random();
        as[i] = q.deg >= 7 ? 5.2 : 3.3; aw[i] = q.w < 0.35 ? 0 : Math.min(0.85, q.w);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aX', new THREE.BufferAttribute(ax, 1));
      g.setAttribute('aRand', new THREE.BufferAttribute(ar, 1)); g.setAttribute('aSize', new THREE.BufferAttribute(as, 1)); g.setAttribute('aW', new THREE.BufferAttribute(aw, 1));
      this.nodes = new THREE.Points(g, additive(new THREE.ShaderMaterial({ uniforms: { ...U, uDpr: this.dpr, uColor: { value: new THREE.Color(0x8fe4ff) } }, vertexShader: POINT_VS, fragmentShader: POINT_FS })));
      this.nodes.frustumCulled = false; this.nodes.renderOrder = 4; this.img.add(this.nodes);
    }
    // dotted data paths along the mesh
    {
      const pts = [], ax = [], as = [];
      for (const path of data.paths) {
        const P = path.map(([u, v]) => new THREE.Vector2(u * this.iw, v * this.ih));
        let L = 0; const acc = [0];
        for (let i = 1; i < P.length; i++) { L += P[i].distanceTo(P[i - 1]); acc.push(L); }
        const curve = new THREE.SplineCurve(P);
        const n = Math.max(8, Math.floor(L / 13));
        for (let i = 0; i <= n; i++) {
          const q = curve.getPointAt(i / n);
          pts.push(q.x, -q.y, 0); ax.push(q.x / this.iw + (q.y / this.ih - 0.5) * SLANT); as.push(i / n);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('aX', new THREE.Float32BufferAttribute(ax, 1)); g.setAttribute('aS', new THREE.Float32BufferAttribute(as, 1));
      this.paths = new THREE.Points(g, additive(new THREE.ShaderMaterial({ uniforms: { ...U, uDpr: this.dpr, uColor: { value: new THREE.Color(0xd8fbff) } }, vertexShader: PATH_VS, fragmentShader: POINT_FS })));
      this.paths.frustumCulled = false; this.paths.renderOrder = 5; this.img.add(this.paths);
    }
    // summit markers
    const plus = plusTexture();
    this.marks = data.summits.map(([u, v]) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: plus, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.set(u * this.iw, -v * this.ih - 4, 1); s.renderOrder = 6; s.userData = { u, v };
      this.img.add(s); return s;
    });
    // floating cubes (the project's cube, in glass)
    this.cubes = [];
    const box = new THREE.BoxGeometry(1, 1, 1), edgesG = new THREE.EdgesGeometry(box);
    const sp = data.spawns.filter(([, v]) => v < 0.6);
    for (let i = 0; i < 9; i++) {
      const [u, v] = sp[i % sp.length];
      const g = new THREE.Group();
      const face = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0x5fd8ff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      const edge = new THREE.LineSegments(edgesG, new THREE.LineBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.add(face, edge); g.renderOrder = 7;
      const r = Math.random();
      g.userData = { u: u + (r - 0.5) * 0.08, v: v - 0.02 - (i % 3) * 0.03, size: 7 + ((i * 7) % 5) * 2.4, spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.9), delay: (i % 8) * 0.35, face, edge };
      this.img.add(g); this.cubes.push(g);
    }
    this.scale = 1;
  }

  lines(edges, { width, core, gain, color }) {
    const n = edges.length;
    const pos = new Float32Array(n * 12), oth = new Float32Array(n * 12), side = new Float32Array(n * 4), end = new Float32Array(n * 4);
    const ax = new Float32Array(n * 4), ar = new Float32Array(n * 4), aw = new Float32Array(n * 4), idx = new Uint32Array(n * 6);
    edges.forEach(([A, B, rnd], i) => {
      const mx = (A.u + B.u) / 2 + ((A.v + B.v) / 2 - 0.5) * SLANT, w = Math.min(1, (A.w + B.w) / 2);
      const P = [[A, B, -1, 0], [A, B, 1, 0], [B, A, -1, 1], [B, A, 1, 1]];
      P.forEach(([T, O, s, e], k) => {
        const j = i * 4 + k;
        pos.set([T.p.x, T.p.y, 0], j * 3); oth.set([O.p.x, O.p.y, 0], j * 3);
        side[j] = s; end[j] = e; ax[j] = mx; ar[j] = rnd; aw[j] = w;
      });
      idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aOther', new THREE.BufferAttribute(oth, 3));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    g.setAttribute('aX', new THREE.BufferAttribute(ax, 1)); g.setAttribute('aRand', new THREE.BufferAttribute(ar, 1)); g.setAttribute('aW', new THREE.BufferAttribute(aw, 1));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    const m = additive(new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { ...this.u, uRes: { value: this.res }, uWidth: { value: width }, uCore: { value: core }, uGain: { value: gain }, uColor: { value: new THREE.Color(color) }, uDpr: this.dpr, base: { value: width } },
      vertexShader: LINE_VS, fragmentShader: LINE_FS,
    }));
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
    return mesh;
  }

  // w, h: viewport in CSS px; fade: where the paper fade starts/ends (0 = bottom, 1 = top)
  setSize(w, h, dpr, fade = [0.0, 0.42]) {
    this.w = w; this.h = h;
    this.camera.left = 0; this.camera.right = w; this.camera.top = 0; this.camera.bottom = -h;
    this.camera.updateProjectionMatrix();
    this.res.set(w * dpr, h * dpr);
    this.dpr.value = dpr;
    for (const m of [this.wire, this.ridge]) m.material.uniforms.uWidth.value = m.material.uniforms.base.value * dpr;
    this.u.uFadeA.value = fade[0]; this.u.uFadeB.value = fade[1];
  }

  update(seconds) {
    const p = ((seconds % PERIOD) + PERIOD) % PERIOD, loop = p / PERIOD;
    const st = timeline(p);
    const U = this.u;
    U.uBIn.value = st.bIn; U.uBOut.value = st.bOut; U.uAIn.value = st.aIn; U.uAOut.value = st.aOut;
    U.uTime.value = seconds; U.uLoop.value = loop;
    // cover-fit around the focus point, with a slow breathing zoom that returns to the start each loop
    const [fx, fy] = this.data.focus;
    const zoom = 1 + 0.035 * (0.5 - 0.5 * Math.cos(loop * Math.PI * 2));
    const s = Math.max(this.w / this.iw, this.h / this.ih) * zoom;
    let ox = this.w * 0.5 - fx * this.iw * s, oy = this.h * 0.48 - fy * this.ih * s;
    ox = Math.min(0, Math.max(this.w - this.iw * s, ox)); oy = Math.min(0, Math.max(this.h - this.ih * s, oy));
    this.img.position.set(ox, -oy, 0); this.img.scale.set(s, s, 1);
    this.scale = s;
    // summit markers and cubes follow the scan
    for (const m of this.marks) {
      const d = digitalAt(m.userData.u, m.userData.v, st), r = clamp((st.bIn - (m.userData.u + (m.userData.v - 0.5) * SLANT)) / 0.06);
      const pop = r < 1 ? r * (1 + 0.9 * Math.sin(r * Math.PI)) : 1;
      const px = 30 * pop / s;
      m.scale.set(px, px, 1); m.material.opacity = d * (0.75 + 0.25 * Math.sin(seconds * 3 + m.userData.u * 9));
      m.material.rotation = (1 - r) * 1.2;
    }
    for (const c of this.cubes) {
      const D = c.userData;
      const d = digitalAt(D.u, D.v, st);
      const life = clamp((p - T_IN[0] - 1.2 - D.delay) / 7.5);
      const rise = life * 0.09;
      c.position.set(D.u * this.iw, -(D.v - rise) * this.ih, 2);
      const size = D.size / s * (0.6 + 0.4 * Math.min(1, life * 4));
      c.scale.setScalar(size);
      c.rotation.set(seconds * D.spin.x, seconds * D.spin.y + D.u * 6, seconds * D.spin.z * 0.4);
      const a = d * Math.sin(Math.PI * life);
      D.face.material.opacity = a * 0.1; D.edge.material.opacity = a * 0.75;
      c.visible = a > 0.01;
    }
    this.state = st;
  }
}
