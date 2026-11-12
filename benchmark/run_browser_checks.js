// Automated behaviour checks of the running application (Playwright)
//
//   T19  Mode switch in the MetricsHUD: mode saved in localStorage; prefetcher
//        enabled or disabled accordingly.
//   T20  Keyboard focus and touch: focus prefetches after the dwell and Enter
//        gives a cache hit; a tap sends one on-demand request and no prefetch.
//   T21  Functional correctness on 30 products: data stored by a prefetch are
//        identical to the direct API response, and the correct product is
//        displayed in both modes.
//
// Usage: npm run checks:browser   (options: --browser=msedge|chrome --skip-build)

const fs = require('fs');
const path = require('path');
const h = require('./lib/harness');

async function freshGrid(context, productId) {
  const page = await h.openGridWithProduct(context, productId);
  await page.mouse.move(2, 2);
  return page;
}

function countProductRequests(page) {
  const state = { count: 0, on: false };
  page.on('request', req => {
    if (state.on && req.method() === 'GET' && h.PRODUCT_REQUEST.test(req.url())) state.count++;
  });
  return state;
}

async function checkModeSwitch(context) {
  const page = await context.newPage();
  await h.gotoHome(page);
  await page.waitForFunction(() => Boolean(window.__research), null, { timeout: 60000 });
  await page.waitForSelector('.product-grid-wrap #sneaker-card-1');
  await page.evaluate(() => { window.__research.setNetworkProfile('Broadband'); window.__research.reset(); });
  await page.evaluate(() => {
    document.querySelector('.product-grid-wrap #sneaker-card-1').scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await page.waitForTimeout(200);
  const card = await h.centreOf(h.cardImage(page, 1));
  const results = [];

  for (const [title, mode, expectPrefetch] of [['BASELINE', 'BASELINE', false], ['SWR_PREFETCH', 'OPTIMIZED', true]]) {
    await page.mouse.move(2, 2);
    await page.locator(`button[title^="${title}"]`).first().click();
    await page.evaluate(() => window.__research.reset());
    const stored = await page.evaluate(() => window.localStorage.getItem('research_mode'));
    await page.mouse.move(card.x, card.y);
    await page.waitForTimeout(250);
    const started = await page.evaluate(() => window.__research.getCounters().prefetchesStarted);
    results.push({ mode, stored, prefetchesStarted: started, pass: stored === mode && (started > 0) === expectPrefetch });
  }
  await page.close();
  return { id: 'T19', name: 'Mode switch in the MetricsHUD', pass: results.every(r => r.pass), details: results };
}

async function checkKeyboard(context) {
  const page = await freshGrid(context, 1);
  const requests = countProductRequests(page);
  await h.prepareTrial(page, { mode: 'OPTIMIZED', profile: 'Broadband', threshold: 100 });
  requests.on = true;
  await page.locator('.product-grid-wrap #sneaker-card-1 .btn-view-spec').focus();
  await page.waitForTimeout(250);
  const started = await page.evaluate(() => window.__research.getCounters().prefetchesStarted);
  await page.keyboard.press('Enter');
  const { nav } = await h.waitForNavigationRecord(page);
  await page.waitForTimeout(150);
  await page.close();
  const pass = started === 1 && nav.cacheHit === true && requests.count === 1;
  return { prefetchesStarted: started, cacheHit: nav.cacheHit, productRequests: requests.count, pass };
}

async function checkTouch(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, hasTouch: true });
  const page = await freshGrid(context, 1);
  const requests = countProductRequests(page);
  await h.prepareTrial(page, { mode: 'OPTIMIZED', profile: 'Broadband', threshold: 100 });
  requests.on = true;
  await h.cardImage(page, 1).tap();
  const { nav } = await h.waitForNavigationRecord(page);
  await page.waitForTimeout(300);
  const started = await page.evaluate(() => window.__research.getCounters().prefetchesStarted);
  await context.close();
  const pass = started === 0 && requests.count === 1 && nav.cacheHit === false;
  return { prefetchesStarted: started, cacheHit: nav.cacheHit, productRequests: requests.count, pass };
}

async function displayedName(page) {
  await page.waitForSelector('h1');
  return (await page.locator('h1').first().textContent()).trim();
}

async function checkCorrectness(context, products = 30) {
  let optimisedPass = 0;
  let baselinePass = 0;
  const failures = [];

  for (let id = 1; id <= products; id++) {
    const direct = await h.httpGetJson(`${h.API_URL}/products/${id}`);
    const expectedName = direct.json.data.name;

    // Optimised: prefetch by dwell, compare cached data with the API, then navigate
    let page = await freshGrid(context, id);
    await h.prepareTrial(page, { mode: 'OPTIMIZED', profile: 'Broadband', threshold: 100 });
    const pt = await h.centreOf(h.cardImage(page, id));
    await page.mouse.move(pt.x, pt.y);
    await page.waitForFunction((key) => window.__research.peekCache(key).isHit, `API:/products/${id}`, { timeout: 10000 });
    const cached = await page.evaluate((key) => window.__research.peekCache(key).data, `API:/products/${id}`);
    const identical = JSON.stringify(cached) === JSON.stringify(direct.json);
    await page.mouse.down(); await page.mouse.up();
    let { nav } = await h.waitForNavigationRecord(page);
    let name = await displayedName(page);
    await page.close();
    if (identical && nav.cacheHit && name === expectedName) optimisedPass++;
    else failures.push({ id, mode: 'OPTIMIZED', identical, cacheHit: nav.cacheHit, name, expectedName });

    // Baseline: navigate on demand and check the displayed product
    page = await freshGrid(context, id);
    await h.prepareTrial(page, { mode: 'BASELINE', profile: 'Broadband', threshold: 100 });
    const pb = await h.centreOf(h.cardImage(page, id));
    await page.mouse.move(pb.x, pb.y);
    await page.mouse.down(); await page.mouse.up();
    ({ nav } = await h.waitForNavigationRecord(page));
    name = await displayedName(page);
    await page.close();
    if (!nav.cacheHit && name === expectedName) baselinePass++;
    else failures.push({ id, mode: 'BASELINE', cacheHit: nav.cacheHit, name, expectedName });

    process.stdout.write(`\rT21: product ${id}/${products}   `);
  }
  process.stdout.write('\n');
  return {
    id: 'T21', name: 'Functional correctness on 30 products',
    pass: optimisedPass === products && baselinePass === products,
    details: { products, optimisedPass, baselinePass, failures }
  };
}

async function main() {
  const args = h.parseArgs(process.argv.slice(2), { browser: '', skipBuild: false });
  await h.startServers({ skipBuild: Boolean(args.skipBuild) });
  const { browser, channel } = await h.launchBrowser(args.browser);
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });

  const results = [];
  results.push(await checkModeSwitch(context));
  const keyboard = await checkKeyboard(context);
  const touch = await checkTouch(browser);
  results.push({ id: 'T20', name: 'Keyboard focus and touch', pass: keyboard.pass && touch.pass, details: { keyboard, touch } });
  results.push(await checkCorrectness(context));

  const browserVersion = browser.version();
  await browser.close();

  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  ${r.name}`);

  const outDir = path.join(h.ROOT, 'benchmark', 'raw-results');
  h.ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'browser_checks_results.json'), JSON.stringify({
    run_at: new Date().toISOString(),
    browser: `${channel} ${browserVersion}`,
    results
  }, null, 2) + '\n');
  console.log('Saved benchmark/raw-results/browser_checks_results.json');

  h.stopAll();
  process.exit(results.every(r => r.pass) ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  h.stopAll();
  process.exit(1);
});
