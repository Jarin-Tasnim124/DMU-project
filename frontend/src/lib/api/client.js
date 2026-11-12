// Unified API Client supporting BASELINE vs OPTIMIZED Fetching Modes
//
// Both modes go through fetchWithStrategy(endpoint):
//   - BASELINE: always the network; the prefetcher and the cache are bypassed.
//   - OPTIMIZED: fresh or stale cache hit is returned immediately (a stale hit
//     also starts a background refresh); otherwise a request that is already
//     in flight for the same key is reused; otherwise a new request is sent and
//     its successful result is cached.
//
// The latency condition is applied by the server: the client sends the delay of
// the selected profile in the X-Simulated-Delay header (15, 85 or 380 ms).

import globalSWRCache from '../cache/swrCache';
import globalPrefetcher from '../prefetch/hoverIntent';
import globalTracker from '../metrics/performanceTracker';
import { API_BASE } from './apiBase';

export const NETWORK_DELAYS_MS = {
  'Broadband': 15,
  'Fast 4G': 85,
  'Throttled 3G': 380
};

export function getDelayForProfile(profile) {
  return NETWORK_DELAYS_MS[profile] ?? NETWORK_DELAYS_MS['Broadband'];
}

// key -> { promise, isPrefetch, consumedByNavigation }
const inFlightRequests = new Map();

export function isInFlight(key) {
  return inFlightRequests.has(key);
}

export function resetClientState() {
  inFlightRequests.clear();
}

export function cacheKeyFor(endpoint) {
  return `API:${endpoint}`;
}

// Let the prefetcher skip keys that are already being fetched, and clear
// in-flight bookkeeping when the tracker resets a trial.
globalPrefetcher.setInFlightChecker(isInFlight);
globalTracker.onReset(resetClientState);

async function networkFetch(endpoint, profile) {
  const delay = getDelayForProfile(profile);
  const start = performance.now();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Simulated-Delay': String(delay)
    }
  });

  // Time until the response headers arrived
  const ttfb = performance.now() - start;

  if (!response.ok) {
    globalTracker.recordHttpRequest(endpoint, 0);
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const bytes = new TextEncoder().encode(text).length;
  globalTracker.recordHttpRequest(endpoint, bytes);

  return { data: JSON.parse(text), ttfb, bytes };
}

function revalidateInBackground(endpoint, key, profile) {
  if (inFlightRequests.has(key)) return;
  const entry = { promise: null, isPrefetch: false, consumedByNavigation: true };
  entry.promise = networkFetch(endpoint, profile)
    .then(result => {
      globalSWRCache.set(key, result.data, { bytes: result.bytes, fetchDuration: result.ttfb });
      return result;
    })
    .catch(err => {
      // Keep serving the stale entry until it expires
      console.warn(`[SWR Revalidate] Error updating ${endpoint}`, err);
      return null;
    })
    .finally(() => {
      if (inFlightRequests.get(key) === entry) inFlightRequests.delete(key);
    });
  inFlightRequests.set(key, entry);
}

/**
 * Fetches an endpoint with the active strategy.
 * Returns { data, fromCache, prefetched, isStale, servedByInFlight, ttfb, bytes }.
 * ttfb is null when no new request was made (cache hit or in-flight reuse).
 */
export async function fetchWithStrategy(endpoint, { isPrefetch = false } = {}) {
  const mode = globalTracker.mode;
  const profile = globalTracker.networkProfile || 'Broadband';
  const key = cacheKeyFor(endpoint);

  // STRATEGY A: BASELINE - always the network, nothing cached
  if (mode !== 'OPTIMIZED') {
    const result = await networkFetch(endpoint, profile);
    return {
      data: result.data,
      fromCache: false,
      prefetched: false,
      isStale: false,
      servedByInFlight: false,
      ttfb: result.ttfb,
      bytes: result.bytes
    };
  }

  // STRATEGY B: OPTIMIZED - SWR cache, in-flight reuse, then network
  const cached = globalSWRCache.get(key, { consume: !isPrefetch });
  if (cached.isHit) {
    if (cached.isStale && !isPrefetch) {
      revalidateInBackground(endpoint, key, profile);
    }
    return {
      data: cached.data,
      fromCache: true,
      prefetched: cached.prefetched,
      isStale: cached.isStale,
      servedByInFlight: false,
      ttfb: null,
      bytes: 0
    };
  }

  const pending = inFlightRequests.get(key);
  if (pending) {
    if (!isPrefetch) {
      pending.consumedByNavigation = true;
      globalSWRCache.recordInFlightReuse();
    }
    const result = await pending.promise;
    if (!result) throw new Error(`API request failed for ${endpoint}`);
    return {
      data: result.data,
      fromCache: false,
      prefetched: pending.isPrefetch,
      isStale: false,
      servedByInFlight: true,
      ttfb: null,
      bytes: 0
    };
  }

  if (!isPrefetch) globalSWRCache.recordMiss();

  const entry = { promise: null, isPrefetch, consumedByNavigation: !isPrefetch };
  entry.promise = networkFetch(endpoint, profile)
    .then(result => {
      // Only successful responses are cached
      globalSWRCache.set(key, result.data, {
        prefetched: isPrefetch,
        consumed: isPrefetch && entry.consumedByNavigation,
        bytes: result.bytes,
        fetchDuration: result.ttfb
      });
      return result;
    })
    .finally(() => {
      if (inFlightRequests.get(key) === entry) inFlightRequests.delete(key);
    });
  inFlightRequests.set(key, entry);

  const result = await entry.promise;
  return {
    data: result.data,
    fromCache: false,
    prefetched: false,
    isStale: false,
    servedByInFlight: false,
    ttfb: result.ttfb,
    bytes: result.bytes
  };
}

// Helper methods for application pages
export async function getProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchWithStrategy(`/products${query ? `?${query}` : ''}`);
}

export async function getProductById(id, options = {}) {
  return fetchWithStrategy(`/products/${id}`, options);
}

export async function prefetchProductById(id) {
  return fetchWithStrategy(`/products/${id}`, { isPrefetch: true });
}

export async function getCategories() {
  return fetchWithStrategy(`/categories`);
}
