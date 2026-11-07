// Compact copies of real app models for the menu thumbnails.
//   node tools/bake_models.cjs <http base serving /home/claude> -> assets/models/*.bin + *.jpg
// dzezva (museum, GLB with meshopt) is simplified in Chromium; kula-rasica (Gusinjska kocka, GKM1) is
// copied as binary and its texture shrunk with sharp.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const sharp = require('sharp');
const BASE = process.argv[2] || 'http://localhost:8766';
const OUT = path.join(__dirname, '..', 'assets', 'models');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (m) => console.log('page:', m.text()));
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.goto(`${BASE}/xplore-prokletije/tools/bake_models.html`);
  await page.waitForFunction(() => window.ready);
  for (const [id, G, UVQ] of [['dzezva', 42, 44], ['fenjer', 42, 44]]) {
    const r = await page.evaluate(([u, g, q]) => window.bake(u, g, q, 512), [`${BASE}/src/gsgsgs84/gusinjska-bastina/models/${id}.glb`, G, UVQ]);
    fs.writeFileSync(path.join(OUT, `${id}.bin`), Buffer.from(r.bin, 'base64'));
    if (r.map) fs.writeFileSync(path.join(OUT, `${id}.jpg`), Buffer.from(r.map, 'base64'));
    if (r.normal) fs.writeFileSync(path.join(OUT, `${id}-n.jpg`), Buffer.from(r.normal, 'base64'));
    console.log(id, JSON.stringify(r.stats));
  }
  await browser.close();
  const src = '/home/claude/src/bertiscus/gusinjska-kocka/models/kula-rasica';
  const j = JSON.parse(fs.readFileSync(src + '.json', 'utf8'));
  fs.writeFileSync(path.join(OUT, 'kula-rasica.bin'), Buffer.from(j.data, 'base64'));
  await sharp(src + '.jpg').resize(512, 512, { fit: 'fill' }).jpeg({ quality: 84 }).toFile(path.join(OUT, 'kula-rasica.jpg'));
  for (const f of fs.readdirSync(OUT)) console.log(f, fs.statSync(path.join(OUT, f)).size);
})();
