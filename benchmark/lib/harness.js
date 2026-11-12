// Shared helpers for the automated browser benchmark and behaviour checks.
// Starts the Express API and a production build of the frontend, and launches
// an installed browser (Microsoft Edge or Chrome) through Playwright.

const { spawn, spawnSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const FRONTEND = path.join(ROOT, 'frontend');
const API_PORT = 5001;
const WEB_PORT = 3000;
const API_URL = `http://localhost:${API_PORT}/api`;
const API_HEALTH_URL = `http://127.0.0.1:${API_PORT}/api/health`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

const PROFILES = ['Broadband', 'Fast 4G', 'Throttled 3G'];
const DELAYS_MS = { 'Broadband': 15, 'Fast 4G': 85, 'Throttled 3G': 380 };
const PRODUCT_REQUEST = /\/api\/products\/\d+(\?|$)/;

function parseArgs(argv, defaults) {
  const args = { ...defaults };
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) continue;
    const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const raw = m[2] === undefined ? true : m[2];
    args[key] = typeof defaults[key] === 'number' ? Number(raw) : raw;
  }
  return args;
}

function loadPlaywright() {
  try {
    return require('playwright-core');
  } catch {
    console.error('playwright-core is not installed. Run "npm install" in the project root first.');
    process.exit(1);
  }
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { body += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(body) }); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function waitForUrl(url, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise(resolve => {
      http.get(url, res => { res.resume(); resolve(res.statusCode < 500); }).on('error', () => resolve(false));
    });
    if (ok) return;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function assertPortFree(port) {
  const busy = await new Promise(resolve => {
    http.get(`http://localhost:${port}`, res => { res.resume(); resolve(true); }).on('error', () => resolve(false));
  });
  if (busy) {
    throw new Error(`Port ${port} is already in use. Stop "npm run dev" (or anything else on port ${port}) and try again.`);
  }
}

const children = [];

function startProcess(label, args, options) {
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
  let log = '';
  child.stdout.on('data', d => { log += d; });
  child.stderr.on('data', d => { log += d; });
  child.on('exit', code => {
    if (code && !child.killedByUs) {
      console.error(`[${label}] exited with code ${code}\n${log.slice(-2000)}`);
    }
  });
  children.push(child);
  return child;
}

function stopAll() {
  for (const c of children) {
    if (!c.killed) { c.killedByUs = true; c.kill(); }
  }
}
process.on('exit', stopAll);
process.on('SIGINT', () => { stopAll(); process.exit(130); });

/** Starts the API and a production build of the frontend that talks to it. */
async function startServers({ skipBuild = false } = {}) {
  await assertPortFree(API_PORT);
  await assertPortFree(WEB_PORT);

  console.log('Starting the Express API on port 5001...');
  startProcess('api', [path.join(ROOT, 'backend', 'src', 'server.js')], {
    cwd: path.join(ROOT, 'backend'),
    env: { ...process.env, PORT: String(API_PORT), NODE_ENV: 'test' }
  });
  await waitForUrl(API_HEALTH_URL);

  const nextBin = require.resolve('next/dist/bin/next', { paths: [FRONTEND] });
  const env = { ...process.env, NEXT_PUBLIC_API_URL: API_URL, NEXT_TELEMETRY_DISABLED: '1' };

  if (!skipBuild) {
    console.log('Building the frontend for production (this takes a minute)...');
    spawnSync(process.execPath, [path.join(FRONTEND, 'scripts', 'copy-data.js')], { cwd: FRONTEND, stdio: 'inherit' });
    const build = spawnSync(process.execPath, [nextBin, 'build'], { cwd: FRONTEND, env, stdio: 'inherit' });
    if (build.status !== 0) throw new Error('Frontend build failed');
  }

  console.log('Starting the production frontend on port 3000...');
  startProcess('web', [nextBin, 'start', '-p', String(WEB_PORT), '-H', '0.0.0.0'], { cwd: FRONTEND, env });
  await waitForUrl(WEB_URL);
}

async function launchBrowser(channelArg) {
  const { chromium } = loadPlaywright();
  const channel = channelArg || (process.platform === 'win32' ? 'msedge' : 'chrome');
  try {
    const browser = await chromium.launch({ channel, headless: true });
    return { browser, channel };
  } catch (err) {
    console.error(`Could not start "${channel}". Use --browser=msedge or --browser=chrome for an installed browser.`);
    throw err;
  }
}

/** Loads the home page; retries because the first requests to a fresh server can be slow. */
async function gotoHome(page) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(WEB_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      return;
    } catch (err) {
      lastError = err;
      await page.waitForTimeout(2000);
    }
  }
  throw lastError;
}

/** Opens the home page, waits for the product grid and goes to the grid page holding productId. */
async function openGridWithProduct(context, productId, pageSize = 12) {
  const page = await context.newPage();
  await gotoHome(page);
  await page.waitForFunction(() => Boolean(window.__research), null, { timeout: 60000 });
  // Hide the floating metrics panel so it cannot cover product cards
  await page.addStyleTag({ content: '#prefetch-engine-dock { display: none !important; }' });

  const targetPage = Math.floor((productId - 1) / pageSize) + 1;
  try {
    await page.waitForSelector('.product-grid-wrap #sneaker-card-1', { timeout: 20000 });
  } catch (err) {
    // Say what the page showed instead of the grid, to make a failure easy to diagnose
    const seen = await page.evaluate(() => {
      const section = document.querySelector('.product-grid-wrap');
      const text = (document.body.innerText || '').replace(/\s+/g, ' ');
      const i = text.indexOf('verified pairs');
      return { gridPresent: Boolean(section), around: text.slice(Math.max(0, i - 40), i + 160) };
    }).catch(() => ({}));
    err.message = `Product grid did not load (${JSON.stringify(seen)}). ${err.message}`;
    throw err;
  }
  for (let p = 2; p <= targetPage; p++) {
    const firstOnPage = (p - 1) * pageSize + 1;
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForSelector(`.product-grid-wrap #sneaker-card-${firstOnPage}`);
  }
  await page.waitForSelector(`.product-grid-wrap #sneaker-card-${productId}`);
  await page.waitForTimeout(600); // let the pagination's smooth scrolling finish
  await page.evaluate((pid) => {
    document.querySelector(`.product-grid-wrap #sneaker-card-${pid}`)
      .scrollIntoView({ block: 'center', behavior: 'instant' });
  }, productId);
  await page.waitForTimeout(100);
  return page;
}

async function centreOf(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Product card is not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function cardImage(page, productId) {
  return page.locator(`.product-grid-wrap #sneaker-card-${productId} .card-img-box`);
}

/** Sets the mode, latency profile and threshold, and clears cache and counters. */
async function prepareTrial(page, { mode, profile, threshold }) {
  await page.evaluate(({ mode, profile, threshold }) => {
    const r = window.__research;
    r.setMode(mode);
    r.setNetworkProfile(profile);
    r.setDwellThreshold(threshold);
    r.reset();
  }, { mode, profile, threshold });
}

async function waitForNavigationRecord(page, timeout = 20000) {
  await page.waitForFunction(() => {
    const r = window.__research;
    const nav = r.getLastNavigation();
    return r.getNavigationCount() >= 1 && nav && nav.renderLatencyMs !== null;
  }, null, { timeout });
  return page.evaluate(() => ({
    nav: window.__research.getLastNavigation(),
    counters: window.__research.getCounters()
  }));
}

function toCsv(rows, columns) {
  const esc = v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map(r => columns.map(c => esc(r[c])).join(','))].join('\n') + '\n';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

module.exports = {
  ROOT, FRONTEND, API_URL, WEB_URL, PROFILES, DELAYS_MS, PRODUCT_REQUEST,
  parseArgs, httpGetJson, startServers, launchBrowser, openGridWithProduct,
  gotoHome, cardImage, centreOf, prepareTrial, waitForNavigationRecord, toCsv, ensureDir, stopAll
};
