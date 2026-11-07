// Records the home page as a phone video, frame by frame on one clock (needs ?debug).
//   node tools/record.cjs URL OUTDIR [seconds=16] [fps=15] [w=390] [h=844]
const { chromium } = require('playwright');
(async () => {
  const [url, out, secs = '16', fps = '15', w = '390', h = '844', dpr = '2'] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr, isMobile: true, hasTouch: true })).newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__home && window.__home.thumbs.length === 5, null, { timeout: 60000 });
  await page.waitForTimeout(6000);
  const n = Math.round(+secs * +fps);
  for (let i = 0; i < n; i++) {
    await page.evaluate((x) => new Promise((res) => { window.__home.fix(x); requestAnimationFrame(() => requestAnimationFrame(res)); }), i / +fps);
    await page.screenshot({ path: `${out}/f${String(i).padStart(4, '0')}.png` });
  }
  await browser.close();
  console.log('frames', n);
})();
