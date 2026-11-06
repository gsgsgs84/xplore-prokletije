// Screenshot the launcher in headless Chromium: node tools/shot.cjs URL OUT.png [W H] [waitMs]
const { chromium } = require('playwright');
(async () => {
  const [url, out, w = '390', h = '844', wait = '4500'] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, isMobile: +w < 700, hasTouch: +w < 700 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: out });
  if (process.env.STEPS) {
    for (const [i, s] of process.env.STEPS.split(';').entries()) {
      await page.evaluate(s).catch((e) => logs.push('step: ' + e.message));
      await page.waitForTimeout(1600);
      await page.screenshot({ path: out.replace('.png', `-${i + 1}.png`) });
    }
  }
  console.log(logs.join('\n') || 'no errors');
  await browser.close();
})();
