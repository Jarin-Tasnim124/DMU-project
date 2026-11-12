// Unified API Client supporting BASELINE vs OPTIMIZED Fetching Modes
// Implements latency simulation, SWR caching, and telemetry recording

import globalSWRCache from '../cache/swrCache';
import globalTracker from '../metrics/performanceTracker';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Network profile latency simulation delays (ms)
const NETWORK_SIMULATION_DELAYS = {
  'Broadband': 15,
  'Fast 4G': 85,
  'Throttled 3G': 380
};

export async function fetchWithStrategy(endpoint, options = {}) {
  const mode = globalTracker.mode; // 'BASELINE' or 'OPTIMIZED'
  const profile = globalTracker.networkProfile || 'Broadband';
  const simulatedDelay = NETWORK_SIMULATION_DELAYS[profile] || 15;
  const cacheKey = `API:${endpoint}`;

  // ==========================================
  // STRATEGY B: OPTIMIZED (SWR Cache + Prefetch)
  // ==========================================
  if (mode === 'OPTIMIZED') {
    const cached = globalSWRCache.get(cacheKey);

    if (cached.isHit) {
      // Mark as consumed if it was prefetched
      if (cached.prefetched) {
        globalSWRCache.markConsumed(cacheKey);
      }

      // If stale, revalidate in background without blocking UI
      if (cached.isStale) {
        triggerBackgroundRevalidation(endpoint, cacheKey, simulatedDelay);
      }

      return {
        data: cached.data,
        fromCache: true,
        prefetched: cached.prefetched,
        isStale: cached.isStale,
        ttfb: 1.5 // sub-2ms in-memory cache lookup
      };
    }
  }

  // ==========================================
  // STRATEGY A: BASELINE / Cache-Miss Fetch
  // ==========================================
  const start = performance.now();
  globalTracker.recordHttpRequest(endpoint, 2400);

  // Apply simulated network delay for controlled scenario testing
  if (simulatedDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, simulatedDelay));
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Simulated-Profile': profile,
      ...options.headers
    }
  });

  const ttfb = performance.now() - start;

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  // If in OPTIMIZED mode, store fresh data in SWR cache
  if (mode === 'OPTIMIZED') {
    globalSWRCache.set(cacheKey, result, {
      prefetched: options.isPrefetch || false,
      fetchDuration: ttfb
    });
  }

  return {
    data: result,
    fromCache: false,
    prefetched: false,
    isStale: false,
    ttfb
  };
}

// Background revalidation for SWR pattern
async function triggerBackgroundRevalidation(endpoint, cacheKey, simulatedDelay) {
  try {
    if (simulatedDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, simulatedDelay));
    }
    const url = `${API_BASE}${endpoint}`;
    const res = await fetch(url);
    if (res.ok) {
      const freshData = await res.json();
      globalSWRCache.set(cacheKey, freshData, { prefetched: false });
    }
  } catch (err) {
    console.warn(`[SWR Revalidate] Error updating ${endpoint}`, err);
  }
}

// Helper methods for application pages
export async function getProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const endpoint = `/products${query ? `?${query}` : ''}`;
  return fetchWithStrategy(endpoint);
}

export async function getProductById(id) {
  const endpoint = `/products/${id}`;
  return fetchWithStrategy(endpoint);
}

export async function getCategories() {
  const endpoint = `/categories`;
  return fetchWithStrategy(endpoint);
}
