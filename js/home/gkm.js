// GKM1 meshes (the compact format of Gusinjska kocka's scanned buildings, also used for the baked museum exhibits)
import * as THREE from '../../vendor/three/three.module.min.js';

export function parseGKM(buf) {
  const dv = new DataView(buf);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'GKM1') throw new Error('not a model file');
  const hl = dv.getUint32(4, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
  let off = 8 + hl;
  const take = (T, n, size) => { const a = new T(buf, off, n); off += Math.ceil((n * size) / 4) * 4; return a; };
  const qp = take(Uint16Array, head.nv * 3, 2), qu = take(Uint16Array, head.nv * 2, 2), qn = take(Int8Array, head.nv * 4, 1);
  const idx = head.idx32 ? take(Uint32Array, head.nf * 3, 4) : take(Uint16Array, head.nf * 3, 2);
  const lo = head.min, span = head.max.map((v, i) => v - lo[i]);
  const pos = new Float32Array(head.nv * 3), nor = new Float32Array(head.nv * 3), uv = new Float32Array(head.nv * 2);
  for (let i = 0; i < head.nv; i++) {
    for (let k = 0; k < 3; k++) { pos[3 * i + k] = lo[k] + (qp[3 * i + k] / 65535) * span[k]; nor[3 * i + k] = qn[4 * i + k] / 127; }
    uv[2 * i] = qu[2 * i] / 65535; uv[2 * i + 1] = qu[2 * i + 1] / 65535;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(head.idx32 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
  g.computeBoundingBox(); g.computeBoundingSphere();
  return { geometry: g, size: span, min: lo };
}

function tex(url) {
  return new Promise((res, rej) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { const t = new THREE.Texture(im); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; res(t); };
    im.onerror = () => rej(new Error(url)); im.src = url;
  });
}

const cache = new Map();
// Resolves to { geometry, map, normalMap?, size }
export function loadModel(base, id, { normal = false } = {}) {
  const key = base + id;
  if (!cache.has(key)) {
    cache.set(key, Promise.all([
      fetch(`${base}${id}.bin`).then((r) => { if (!r.ok) throw new Error(id); return r.arrayBuffer(); }),
      tex(`${base}${id}.jpg`),
      normal ? tex(`${base}${id}-n.jpg`).catch(() => null) : null,
    ]).then(([buf, map, nmap]) => {
      const m = parseGKM(buf);
      if (nmap) nmap.colorSpace = THREE.NoColorSpace;
      return { geometry: m.geometry, map, normalMap: nmap, size: m.size };
    }));
  }
  return cache.get(key);
}
