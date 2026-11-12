// Built-in API routes used by the deployed (Vercel) version of the platform.
// They serve the same dataset and endpoints as the Express backend
// (backend/src/server.js), so the live demo works without a separately
// hosted server. During local development the frontend uses the Express
// backend on port 5001 instead (see src/lib/api/apiBase.js).

import products from '../../../data/products.json';
import benchmarkResults from '../../../data/benchmark_results.json';
import { listProducts, getProduct, listCategories } from '../../../lib/server/catalog';

export const dynamic = 'force-dynamic';

const telemetryLogs = [];

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

const PERMITTED_DELAYS_MS = [15, 85, 380];

async function applySimulatedDelay(request) {
  const url = new URL(request.url);
  const ms = parseInt(request.headers.get('x-simulated-delay') || url.searchParams.get('delay'), 10);
  if (PERMITTED_DELAYS_MS.includes(ms)) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

export async function GET(request, { params }) {
  const segments = params.path || [];
  const url = new URL(request.url);

  if (segments[0] === 'products' && segments.length === 1) {
    await applySimulatedDelay(request);
    const body = listProducts(products, url.searchParams);
    return json(body, 200, {
      'X-Total-Count': String(body.meta.total),
      'X-Server-Timestamp': String(Date.now())
    });
  }

  if (segments[0] === 'products' && segments.length === 2) {
    await applySimulatedDelay(request);
    const body = getProduct(products, segments[1]);
    if (!body) {
      return json({ status: 'error', message: `Product with ID ${segments[1]} not found.` }, 404);
    }
    return json(body);
  }

  if (segments[0] === 'categories') {
    await applySimulatedDelay(request);
    return json(listCategories(products));
  }

  if (segments[0] === 'telemetry') {
    return json({ status: 'success', totalEntries: telemetryLogs.length, data: telemetryLogs });
  }

  if (segments[0] === 'benchmark' && segments[1] === 'results') {
    return json({ status: 'success', count: benchmarkResults.length, data: benchmarkResults });
  }

  if (segments[0] === 'health') {
    return json({
      status: 'online',
      framework: 'Empirical Predictive Data-Fetching Research API (deployed)',
      timestamp: new Date().toISOString()
    });
  }

  return json({ status: 'error', message: 'Not found' }, 404);
}

export async function POST(request, { params }) {
  const segments = params.path || [];

  if (segments[0] === 'telemetry') {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ status: 'error', message: 'Empty body' }, 400);
    }
    const entry = { id: telemetryLogs.length + 1, timestamp: new Date().toISOString(), ...payload };
    telemetryLogs.push(entry);
    if (telemetryLogs.length > 5000) telemetryLogs.shift();
    return json({ status: 'success', recordedId: entry.id, totalLogs: telemetryLogs.length });
  }

  if (segments[0] === 'benchmark' && segments[1] === 'results') {
    // The hosted demo cannot write files; saving results to the CSV works when
    // running locally with the Express backend.
    return json({
      status: 'error',
      message: 'Saving benchmark results is only available when running the project locally.'
    }, 501);
  }

  return json({ status: 'error', message: 'Not found' }, 404);
}
