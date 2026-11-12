// Copies the shared dataset into the frontend before `next dev` / `next build`,
// so the built-in /api routes (used by the Vercel deployment) can serve it.
//
//   backend/src/data/products.json              -> frontend/src/data/products.json
//   benchmark/raw-results/benchmark_results.csv -> frontend/src/data/benchmark_results.json
//
// If the source files are not available (e.g. a Docker build that only sees the
// frontend folder), empty placeholders are written so the build still succeeds.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(__dirname, '..', 'src', 'data');
const PRODUCTS_SRC = path.join(ROOT, 'backend', 'src', 'data', 'products.json');
const CSV_SRC = path.join(ROOT, 'benchmark', 'raw-results', 'benchmark_results.csv');

fs.mkdirSync(OUT_DIR, { recursive: true });

function writeIfMissing(file, content) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, content, 'utf-8');
}

// Products
const productsOut = path.join(OUT_DIR, 'products.json');
if (fs.existsSync(PRODUCTS_SRC)) {
  fs.copyFileSync(PRODUCTS_SRC, productsOut);
  console.log('[copy-data] products.json copied');
} else {
  writeIfMissing(productsOut, '[]');
  console.warn('[copy-data] backend products.json not found; using existing or empty dataset');
}

// Benchmark results (CSV -> JSON, same parsing as the Express controller)
const benchOut = path.join(OUT_DIR, 'benchmark_results.json');
if (fs.existsSync(CSV_SRC)) {
  const lines = fs.readFileSync(CSV_SRC, 'utf-8').trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const obj = {};
    headers.forEach((h, idx) => {
      let val = values[idx] ? values[idx].trim() : '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      obj[h] = val;
    });
    records.push({
      run_id: parseInt(obj.run_id, 10),
      timestamp: obj.timestamp,
      scenario_network: obj.scenario_network,
      mode: obj.mode,
      run_number: parseInt(obj.run_number, 10),
      target_route: obj.target_route,
      navigation_latency_ms: parseFloat(obj.navigation_latency_ms),
      ttfb_ms: parseFloat(obj.ttfb_ms),
      cache_hit: parseInt(obj.cache_hit, 10),
      prefetched: parseInt(obj.prefetched, 10),
      request_volume: parseInt(obj.request_volume, 10),
      payload_bytes: parseInt(obj.payload_bytes, 10)
    });
  }
  fs.writeFileSync(benchOut, JSON.stringify(records), 'utf-8');
  console.log(`[copy-data] benchmark results converted (${records.length} runs)`);
} else {
  writeIfMissing(benchOut, '[]');
  console.warn('[copy-data] benchmark_results.csv not found; using existing or empty results');
}
