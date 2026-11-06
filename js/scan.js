// "Skeniraj kocku": hold up the real printed cube; the side facing the camera picks the app (hold still to open it).
// Uses the same marker detector as the museum's cube page, on the phone only. Nothing leaves the phone.
let stream = null, raf = 0, det = null, cube = null, faceNames = [];

const area = (c) => Math.abs((c[0].x * c[1].y - c[1].x * c[0].y) + (c[1].x * c[2].y - c[2].x * c[1].y) + (c[2].x * c[3].y - c[3].x * c[2].y) + (c[3].x * c[0].y - c[0].x * c[3].y)) / 2;

export async function startScan({ el, apps, t, onPick, onFace, sfx }) {
  const video = el.querySelector('video'), over = el.querySelector('canvas.scan-draw'), msg = el.querySelector('.scan-msg');
  const label = el.querySelector('.scan-app'), ring = el.querySelector('.scan-ring circle.fill');
  const say = (s, err) => { msg.textContent = s; msg.classList.toggle('err', !!err); };
  el.hidden = false; requestAnimationFrame(() => el.classList.add('on'));
  label.textContent = ''; ring.style.strokeDashoffset = '1';
  say(t('scanStart'));
  if (/FBAN|FBAV|Instagram|Line\/|MicroMessenger|; wv\)/.test(navigator.userAgent)) say(t('scanInApp'), true);
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('no camera'), { name: 'NotFoundError' });
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    video.srcObject = stream; video.muted = true; video.setAttribute('playsinline', ''); await video.play();
  } catch (e) {
    say(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? t('scanDenied') : t('scanNoCam'), true);
    return;
  }
  if (!det) {
    const [{ MarkerDetector }, c] = await Promise.all([import('./cv/detector.js'), fetch('data/cube.json').then((r) => r.json())]);
    cube = c; faceNames = c.faces.map((f) => f.name);
    det = new MarkerDetector(c.markers.map((m) => ({ id: m.id, cells: Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, k) => +m.cells[r * 8 + k])) })));
  }
  if (!stream) return;
  say(t('scanTitle'));
  const faceOf = new Map(cube.markers.map((m) => [m.id, m.face]));
  const work = document.createElement('canvas'), wg = work.getContext('2d', { willReadFrequently: true });
  const og = over.getContext('2d');
  let held = -1, since = 0, done = false, last = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (!video.videoWidth || now - last < 55) return;
    last = now;
    const vw = video.videoWidth, vh = video.videoHeight, k = Math.min(1, 640 / Math.max(vw, vh));
    const w = Math.round(vw * k), h = Math.round(vh * k);
    if (work.width !== w) { work.width = w; work.height = h; }
    wg.drawImage(video, 0, 0, w, h);
    const found = det.detect(wg.getImageData(0, 0, w, h).data, w, h);
    // overlay in screen pixels (video is object-fit: cover)
    const cw = over.clientWidth, ch = over.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (over.width !== Math.round(cw * dpr)) { over.width = Math.round(cw * dpr); over.height = Math.round(ch * dpr); }
    const s = Math.max(cw / vw, ch / vh), ox = (cw - vw * s) / 2, oy = (ch - vh * s) / 2;
    og.setTransform(dpr, 0, 0, dpr, 0, 0); og.clearRect(0, 0, cw, ch);
    const score = new Map();
    for (const m of found) {
      const f = faceOf.get(m.id); if (f == null) continue;
      score.set(f, (score.get(f) || 0) + area(m.corners));
      og.beginPath();
      m.corners.forEach((p, i) => { const x = ox + p.x / k * s, y = oy + p.y / k * s; i ? og.lineTo(x, y) : og.moveTo(x, y); });
      og.closePath(); og.lineWidth = 3; og.strokeStyle = 'rgba(80,255,150,0.95)'; og.fillStyle = 'rgba(80,255,150,0.18)'; og.fill(); og.stroke();
    }
    let best = -1, bs = 0;
    for (const [f, a] of score) if (a > bs) { bs = a; best = f; }
    if (bs < 220) best = -1;
    if (best !== held) { held = best; since = now; if (best >= 0) { sfx?.('tick'); onFace?.(faceNames[best]); } }
    const app = best >= 0 ? apps.find((a) => a.face === faceNames[best]) : null;
    label.textContent = app ? app.title : '';
    el.style.setProperty('--app', app ? app.color : 'transparent');
    const p = app ? Math.min(1, (now - since) / 1300) : 0;
    ring.style.strokeDashoffset = String(1 - p);
    if (app) say(t('scanHold')); else if (!done) say(t('scanTitle'));
    if (app && p >= 1 && !done) { done = true; onPick(app); }
  };
  raf = requestAnimationFrame(loop);
}

export function stopScan(el) {
  cancelAnimationFrame(raf); raf = 0;
  if (stream) { for (const tr of stream.getTracks()) tr.stop(); stream = null; }
  const v = el.querySelector('video'); if (v) v.srcObject = null;
  el.classList.remove('on');
  setTimeout(() => { if (!el.classList.contains('on')) el.hidden = true; }, 300);
}
