// Automated browser benchmark (Objective 4)
//
// Runs the real prototype in an installed browser with Playwright:
//   2 modes (Baseline, Optimised) x 3 latency conditions (15, 85, 380 ms added
//   by the server) x 30 matched trials = 180 measured trials.
//
// Trial i uses the same product card and the same scripted pointer actions in
// both modes, and the two modes run back to back in alternating order. Every
// trial starts from a new page load with an empty application cache and reset
// counters. Three unrecorded warm-up trials precede each latency condition.
//
// Usage:
//   npm run benchmark:browser
//   node benchmark/run_browser_benchmark.js --browser=chrome --threshold=100
//
// Options:
//   --browser=msedge|chrome   installed browser to drive (default: msedge on Windows, chrome elsewhere)
//   --threshold=100           dwell threshold in ms (for a threshold pilot: 50, 100, 150, 200)
//   --trials=30               matched trials per cell
//   --warmup=3                unrecorded warm-up trials per latency condition
//   --skip-build              reuse the existing production build
//   --out=<name>              output file name without extension (default: measured_benchmark_results)

const os = require('os');
const fs = require('fs');
const path = require('path');
const h = require('./lib/harness');

// Scripted interaction sequence (repeats every five trials)
const INTERACTIONS = [
  { name: 'hover_150_click', description: 'Rest on the target card for 150 ms, then click' },
  { name: 'hover_300_click', description: 'Rest on the target card for 300 ms, then click' },
  { name: 'hover_600_click', description: 'Rest on the target card for 600 ms, then click' },
  { name: 'abandoned_hover_then_click', description: 'Rest on a different card for 250 ms, move to the target card and click after 40 ms' },
  { name: 'click_without_dwell', description: 'Move to the target card and click after 40 ms' }
];

const COLUMNS = [
  'trial_id', 'timestamp', 'scenario_network', 'added_delay_ms', 'mode', 'trial_number',
  'interaction', 'product_id', 'target_route', 'dwell_threshold_ms',
  'navigation_latency_ms', 'render_latency_ms', 'ttfb_ms',
  'cache_hit', 'served_by_inflight_prefetch', 'product_requests',
  'prefetch_initiated', 'prefetch_consumed', 'prefetch_wasted', 'payload_bytes'
];

// A different card in the same grid row as the target, so both are on screen
async function otherCardFor(page, productId) {
  const id = await page.evaluate((pid) => {
    const target = document.querySelector(`.product-grid-wrap #sneaker-card-${pid}`).getBoundingClientRect();
    const cards = [...document.querySelectorAll('.product-grid-wrap [id^="sneaker-card-"]')];
    let best = null;
    for (const c of cards) {
      const id = Number(c.id.replace('sneaker-card-', ''));
      if (id === pid) continue;
      const r = c.getBoundingClientRect();
      const sameRow = Math.abs(r.top - target.top) < 5;
      const visible = r.top >= 0 && r.bottom <= window.innerHeight + 1;
      const score = (sameRow ? 0 : 10000) + (visible ? 0 : 5000) + Math.abs(r.left - target.left);
      if (!best || score < best.score) best = { id, score };
    }
    return best.id;
  }, productId);
  return id;
}

async function runTrial(context, { mode, profile, trialNumber, threshold }) {
  const interaction = INTERACTIONS[(trialNumber - 1) % INTERACTIONS.length];
  const productId = ((trialNumber - 1) % 30) + 1;
  const page = await h.openGridWithProduct(context, productId);

  let counting = false;
  let productRequests = 0;
  page.on('request', req => {
    if (counting && req.method() === 'GET' && h.PRODUCT_REQUEST.test(req.url())) productRequests++;
  });

  // Start with the pointer away from every card
  await page.mouse.move(2, 2);
  await h.prepareTrial(page, { mode, profile, threshold });
  counting = true;

  // Card centres are measured before the trial; raw mouse events are used so
  // the scripted dwell times are exact (no automatic waiting before a click).
  const target = await h.centreOf(h.cardImage(page, productId));
  const other = await h.centreOf(h.cardImage(page, await otherCardFor(page, productId)));
  const hover = (pt) => page.mouse.move(pt.x, pt.y);
  const click = async () => { await page.mouse.down(); await page.mouse.up(); };

  switch (interaction.name) {
    case 'hover_150_click':
      await hover(target); await page.waitForTimeout(150); await click(); break;
    case 'hover_300_click':
      await hover(target); await page.waitForTimeout(300); await click(); break;
    case 'hover_600_click':
      await hover(target); await page.waitForTimeout(600); await click(); break;
    case 'abandoned_hover_then_click':
      await hover(other); await page.waitForTimeout(250);
      await hover(target); await page.waitForTimeout(40); await click();
      break;
    default:
      await hover(target); await page.waitForTimeout(40); await click();
  }

  const { nav, counters } = await h.waitForNavigationRecord(page);
  await page.waitForTimeout(150); // let any request already started reach the log
  counting = false;
  const final = await page.evaluate(() => window.__research.getCounters());
  await page.close();

  const initiated = final.prefetchesStarted;
  const consumed = final.prefetchesConsumed;

  return {
    timestamp: new Date().toISOString(),
    scenario_network: profile,
    added_delay_ms: h.DELAYS_MS[profile],
    mode,
    trial_number: trialNumber,
    interaction: interaction.name,
    product_id: productId,
    target_route: nav.targetRoute,
    dwell_threshold_ms: threshold,
    navigation_latency_ms: nav.latencyMs,
    render_latency_ms: nav.renderLatencyMs,
    ttfb_ms: nav.ttfb,
    cache_hit: nav.cacheHit ? 1 : 0,
    served_by_inflight_prefetch: nav.servedByInFlight ? 1 : 0,
    product_requests: productRequests,
    prefetch_initiated: initiated,
    prefetch_consumed: consumed,
    prefetch_wasted: Math.max(0, initiated - consumed),
    payload_bytes: nav.payloadBytes,
    _counters: counters
  };
}

// A trial that fails for a technical reason (for example a page that did not
// load) is discarded and repeated from a new page load. The number of repeated
// attempts is saved in the settings file.
let repeatedAttempts = 0;

async function runTrialWithRetry(context, options, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await runTrial(context, options);
    } catch (err) {
      lastError = err;
      repeatedAttempts++;
      console.warn(`\n[retry] ${options.profile} ${options.mode} trial ${options.trialNumber}, attempt ${attempt} failed: ${String(err.message).split('\n')[0].slice(0, 300)}`);
      for (const p of context.pages()) await p.close().catch(() => {});
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw lastError;
}

async function main() {
  const args = h.parseArgs(process.argv.slice(2), {
    browser: '', threshold: 100, trials: 30, warmup: 3, skipBuild: false, out: 'measured_benchmark_results'
  });

  await h.startServers({ skipBuild: Boolean(args.skipBuild) });
  const { browser, channel } = await h.launchBrowser(args.browser);
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });

  const rows = [];
  const started = new Date();
  console.log(`Browser: ${channel} ${browser.version()} (headless). Threshold ${args.threshold} ms. ${args.trials} trials per cell.`);

  for (const profile of h.PROFILES) {
    for (let w = 1; w <= args.warmup; w++) {
      const mode = w % 2 ? 'BASELINE' : 'OPTIMIZED';
      await runTrialWithRetry(context, { mode, profile, trialNumber: w, threshold: args.threshold });
    }
    for (let i = 1; i <= args.trials; i++) {
      const order = i % 2 ? ['BASELINE', 'OPTIMIZED'] : ['OPTIMIZED', 'BASELINE'];
      for (const mode of order) {
        const row = await runTrialWithRetry(context, { mode, profile, trialNumber: i, threshold: args.threshold });
        delete row._counters;
        rows.push(row);
      }
      process.stdout.write(`\r${profile}: trial ${i}/${args.trials}   `);
    }
    process.stdout.write('\n');
  }

  await browser.close();

  // Sort by condition, mode and trial so the file reads naturally
  const profileOrder = Object.fromEntries(h.PROFILES.map((p, i) => [p, i]));
  rows.sort((a, b) =>
    profileOrder[a.scenario_network] - profileOrder[b.scenario_network] ||
    (a.mode === b.mode ? 0 : a.mode === 'BASELINE' ? -1 : 1) ||
    a.trial_number - b.trial_number);
  rows.forEach((r, i) => { r.trial_id = i + 1; });

  const outDir = path.join(h.ROOT, 'benchmark', 'raw-results');
  h.ensureDir(outDir);
  const csvPath = path.join(outDir, `${args.out}.csv`);
  fs.writeFileSync(csvPath, h.toCsv(rows, COLUMNS));

  // Run settings (no user names, host names or file paths are recorded)
  const meta = {
    started_at: started.toISOString(),
    finished_at: new Date().toISOString(),
    browser: { channel, version: browser.version(), headless: true, viewport: '1366x900' },
    machine: {
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      cpu: (os.cpus()[0] || {}).model || 'unknown',
      logical_cpus: os.cpus().length,
      memory_gb: Math.round(os.totalmem() / 1024 ** 3)
    },
    node_version: process.version,
    frontend: 'next build + next start (production)',
    dwell_threshold_ms: args.threshold,
    trials_per_cell: args.trials,
    warmup_trials_per_condition: args.warmup,
    added_delays_ms: h.DELAYS_MS,
    interaction_sequence: INTERACTIONS,
    trial_order: 'For each latency condition: warm-up, then trials 1..N; within trial i both modes run back to back, Baseline first when i is odd',
    cache_reset: 'New page load and empty application cache before every trial',
    repeated_attempts_after_technical_failure: repeatedAttempts,
    total_rows: rows.length
  };
  fs.writeFileSync(path.join(outDir, `${args.out}.meta.json`), JSON.stringify(meta, null, 2) + '\n');

  console.log(`Saved ${rows.length} trials to benchmark/raw-results/${args.out}.csv`);
  console.log('Next step: npm run analyze:browser');
  h.stopAll();
}

main().catch(err => {
  console.error(err);
  h.stopAll();
  process.exit(1);
});
