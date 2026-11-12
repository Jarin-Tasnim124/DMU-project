import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchWithStrategy, getProductById, prefetchProductById, cacheKeyFor } from '../src/lib/api/client';
import globalSWRCache from '../src/lib/cache/swrCache';
import globalTracker from '../src/lib/metrics/performanceTracker';

// Counting stub for fetch. Each call returns a deferred response so tests can
// control when a request "arrives".
function makeFetchStub({ status = 200 } = {}) {
  const calls = [];
  const stub = vi.fn((url, init) => {
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    const call = {
      url,
      headers: (init && init.headers) || {},
      respond: (body = { status: 'success', data: { id: 1 } }, code = status) =>
        resolve({
          ok: code >= 200 && code < 300,
          status: code,
          statusText: code === 200 ? 'OK' : 'Error',
          text: async () => JSON.stringify(body)
        })
    };
    calls.push(call);
    return promise;
  });
  stub.calls = calls;
  stub.respondAll = (body, code) => calls.forEach(c => c.respond(body, code));
  return stub;
}

// Fetches and answers every request immediately.
async function run(fetchStub, promise, body, code) {
  await Promise.resolve();
  fetchStub.respondAll(body, code);
  return promise;
}

describe('API client', () => {
  let fetchStub;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    fetchStub = makeFetchStub();
    vi.stubGlobal('fetch', fetchStub);
    globalTracker.resetAll();
    globalTracker.setMode('OPTIMIZED');
    globalTracker.setNetworkProfile('Broadband');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('Baseline mode always uses the network and caches nothing', async () => {
    globalTracker.setMode('BASELINE');
    await run(fetchStub, getProductById(1));
    await run(fetchStub, getProductById(1));
    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(globalSWRCache.size()).toBe(0);
  });

  it('sends the delay of the selected profile to the server (15 ms for Broadband)', async () => {
    await run(fetchStub, getProductById(1));
    expect(fetchStub.calls[0].headers['X-Simulated-Delay']).toBe('15');
  });

  it('sends 85 ms for Fast 4G and 380 ms for Throttled 3G', async () => {
    globalTracker.setNetworkProfile('Fast 4G');
    await run(fetchStub, getProductById(1));
    globalTracker.setNetworkProfile('Throttled 3G');
    await run(fetchStub, getProductById(2));
    expect(fetchStub.calls[0].headers['X-Simulated-Delay']).toBe('85');
    expect(fetchStub.calls[1].headers['X-Simulated-Delay']).toBe('380');
  });

  it('Optimised mode: a repeated navigation is a cache hit with no request and no TTFB', async () => {
    const first = await run(fetchStub, getProductById(1));
    expect(first.fromCache).toBe(false);
    expect(typeof first.ttfb).toBe('number');
    const second = await getProductById(1);
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(second.fromCache).toBe(true);
    expect(second.ttfb).toBeNull();
  });

  it('prefetch followed by navigation: one request, a cache hit, and no miss counted', async () => {
    await run(fetchStub, prefetchProductById(1));
    const nav = await getProductById(1);
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(nav.fromCache).toBe(true);
    expect(nav.prefetched).toBe(true);
    const m = globalSWRCache.getMetrics();
    expect(m.misses).toBe(0);
    expect(m.hits).toBe(1);
    expect(m.prefetchesConsumed).toBe(1);
  });

  it('a click during an in-flight prefetch reuses that request (one request only)', async () => {
    const prefetch = prefetchProductById(1);
    await Promise.resolve();
    const nav = getProductById(1);
    await Promise.resolve();
    expect(fetchStub).toHaveBeenCalledTimes(1);
    fetchStub.respondAll();
    await prefetch;
    const result = await nav;
    expect(result.servedByInFlight).toBe(true);
    expect(result.ttfb).toBeNull();
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it('a prefetch used while in flight is counted as consumed, not wasted', async () => {
    const prefetch = prefetchProductById(1);
    await Promise.resolve();
    const nav = getProductById(1);
    await Promise.resolve();
    fetchStub.respondAll();
    await Promise.all([prefetch, nav]);
    const m = globalSWRCache.getMetrics();
    expect(m.prefetchesInitiated).toBe(1);
    expect(m.prefetchesConsumed).toBe(1);
    expect(m.unusedPrefetches).toBe(0);
    expect(m.inFlightReuses).toBe(1);
  });

  it('an API failure (HTTP 500) is reported, nothing is cached, and the next attempt uses the network', async () => {
    await expect(run(fetchStub, getProductById(1), { status: 'error' }, 500)).rejects.toThrow('500');
    expect(globalSWRCache.has(cacheKeyFor('/products/1'))).toBe(false);
    await run(fetchStub, getProductById(1));
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it('a stale hit is served immediately and refreshed in the background (counted as a request)', async () => {
    await run(fetchStub, getProductById(1), { status: 'success', data: { v: 'old' } });
    vi.advanceTimersByTime(150000); // stale
    const stale = await getProductById(1);
    expect(stale.fromCache).toBe(true);
    expect(stale.isStale).toBe(true);
    expect(stale.data.data.v).toBe('old');
    expect(fetchStub).toHaveBeenCalledTimes(2); // background refresh started
    fetchStub.calls[1].respond({ status: 'success', data: { v: 'new' } });
    await vi.waitFor(() => {
      expect(globalSWRCache.get(cacheKeyFor('/products/1'), { consume: false }).data.data.v).toBe('new');
    });
    expect(globalTracker.getSummary().totalHttpRequests).toBe(2);
  });

  it('keeps the stale entry when the background refresh fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await run(fetchStub, getProductById(1), { status: 'success', data: { v: 'old' } });
    vi.advanceTimersByTime(150000);
    await getProductById(1);
    fetchStub.calls[1].respond({ status: 'error' }, 500);
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    const entry = globalSWRCache.get(cacheKeyFor('/products/1'), { consume: false });
    expect(entry.isHit).toBe(true);
    expect(entry.data.data.v).toBe('old');
    warn.mockRestore();
  });

  it('switching to Baseline bypasses entries cached in Optimised mode', async () => {
    await run(fetchStub, fetchWithStrategy('/products/1'));
    globalTracker.setMode('BASELINE');
    const r = await run(fetchStub, fetchWithStrategy('/products/1'));
    expect(r.fromCache).toBe(false);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });
});
