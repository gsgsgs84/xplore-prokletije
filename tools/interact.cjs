// Interaction check: drag the cube to the next app, arrows, keyboard, tap to dive. node tools/interact.cjs URL OUTDIR
const { chromium } = require('playwright');
(async () => {
  const [url, out] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  let nav = null;
  await page.route(/github\.io/, (r) => { if (r.request().isNavigationRequest()) nav = r.request().url(); r.abort(); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(12000);
  const name = () => page.$eval('#sheet .name', (e) => e.textContent);
  const res = { start: await name() };
  const st = await page.$eval('#stage', (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  // drag left -> next
  await page.mouse.move(st.x + 80, st.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(st.x + 80 - i * 22, st.y); await page.waitForTimeout(40); }
  await page.mouse.up(); await page.waitForTimeout(3500);
  res.afterDragLeft = await name();
  await page.screenshot({ path: out + '/drag.png' });
  // arrow back
  await page.click('#prev'); await page.waitForTimeout(3500); res.afterPrev = await name();
  // keyboard
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(3500); res.afterKey = await name();
  // small drag snaps back
  await page.mouse.move(st.x, st.y); await page.mouse.down(); await page.mouse.move(st.x - 30, st.y, { steps: 3 }); await page.mouse.up();
  await page.waitForTimeout(2500); res.afterSmallDrag = await name();
  // dots
  await page.click('.dots button:nth-child(6)'); await page.waitForTimeout(3500); res.afterDot6 = await name();
  // tap the cube -> dive
  await page.mouse.click(st.x, st.y + 20); await page.waitForTimeout(4000);
  res.dive = nav; res.errors = errs;
  console.log(JSON.stringify(res, null, 1));
  await browser.close();
})();
