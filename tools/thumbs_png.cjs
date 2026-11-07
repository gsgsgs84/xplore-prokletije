// Still images of the five live thumbnails, for phones without WebGL: node tools/thumbs_png.cjs URL
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  await page.goto(process.argv[2], { waitUntil: 'load' });
  await page.waitForFunction(() => window.__home && window.__home.thumbs.length === 5, null, { timeout: 60000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => window.__home.fix(8));
  await page.waitForTimeout(1500);
  for (const id of ['muzej', 'mapa', 'kocka', 'slagalica', 'staze']) {
    const b = await page.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }, `.row[data-app="${id}"] .thumb .gl`);
    await page.screenshot({ path: path.join(__dirname, '..', 'assets', 'thumbs', `${id}.png`), clip: b });
  }
  await browser.close();
})();
