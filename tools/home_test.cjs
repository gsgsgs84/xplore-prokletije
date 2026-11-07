// Home page check in headless Chromium: no errors, texts per language, tap = glow + veil + navigation.
//   node tools/home_test.cjs URL OUTDIR
const { chromium } = require('playwright');
(async () => {
  const [url, out] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let nav = null;
  await page.route(/github\.io/, (r) => { if (r.request().isNavigationRequest()) nav = r.request().url(); r.abort(); });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(6000);
  const res = {};
  res.live = await page.evaluate(() => document.body.className);
  res.titles = await page.$$eval('.row b', (els) => els.map((e) => e.textContent));
  await page.click('[data-lang="sq"]'); res.sq = await page.$$eval('.row small', (els) => els.map((e) => e.textContent));
  res.sqHref = await page.$eval('.row', (e) => e.href);
  await page.click('[data-lang="me"]');
  res.thumbs = await page.evaluate(() => window.__home ? window.__home.thumbs.length : -1);
  const t0 = Date.now(); let navAt = null;
  page.on('request', (r) => { if (r.isNavigationRequest() && /github\.io/.test(r.url())) navAt = Date.now() - t0; });
  await page.tap('.row[data-app="mapa"]');
  await page.waitForTimeout(150);
  res.glow = await page.evaluate(() => document.querySelector('.row[data-app="mapa"]').classList.contains('glow')).catch((e) => 'gone: ' + e.message.slice(0, 60));
  await page.screenshot({ path: out + '/tap.png' }).catch(() => {});
  await page.waitForTimeout(700);
  res.veil = await page.evaluate(() => document.querySelector('#veil').classList.contains('on')).catch((e) => 'gone');
  await page.waitForTimeout(1200);
  res.navAt = navAt;
  res.nav = nav; res.errors = errs;
  console.log(JSON.stringify(res, null, 1));
  await browser.close();
})();
