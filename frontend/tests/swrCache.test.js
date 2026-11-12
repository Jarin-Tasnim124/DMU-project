import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SWRCache } from '../src/lib/cache/swrCache';

describe('SWRCache', () => {
  let cache;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    cache = new SWRCache({ ttl: 120000, grace: 60000, maxEntries: 100 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a fresh entry as a hit', () => {
    cache.set('k', { v: 1 });
    const r = cache.get('k');
    expect(r.isHit).toBe(true);
    expect(r.isStale).toBe(false);
    expect(r.data).toEqual({ v: 1 });
    expect(cache.getMetrics().hits).toBe(1);
  });

  it('serves a stale entry within the grace period with isStale = true', () => {
    cache.set('k', { v: 1 });
    vi.advanceTimersByTime(150000); // past TTL, within TTL + grace
    const r = cache.get('k');
    expect(r.isHit).toBe(true);
    expect(r.isStale).toBe(true);
    expect(cache.getMetrics().staleHits).toBe(1);
  });

  it('removes an expired entry and treats it as a miss', () => {
    cache.set('k', { v: 1 });
    vi.advanceTimersByTime(180001); // past TTL + grace
    const r = cache.get('k');
    expect(r.isHit).toBe(false);
    expect(cache.has('k')).toBe(false);
    expect(cache.size()).toBe(0);
  });

  it('counts an unused prefetched entry as wasted when it expires', () => {
    cache.set('k', { v: 1 }, { prefetched: true });
    vi.advanceTimersByTime(180001);
    cache.reapExpired();
    const m = cache.getMetrics();
    expect(m.prefetchesInitiated).toBe(1);
    expect(m.prefetchesWasted).toBe(1);
  });

  it('counts an unused prefetched entry as wasted when it is evicted', () => {
    const small = new SWRCache({ maxEntries: 2 });
    small.set('a', 1, { prefetched: true });
    small.set('b', 2);
    small.set('c', 3); // evicts "a"
    const m = small.getMetrics();
    expect(small.has('a')).toBe(false);
    expect(m.evictions).toBe(1);
    expect(m.prefetchesWasted).toBe(1);
  });

  it('never holds more than 100 entries after 250 inserts', () => {
    for (let i = 0; i < 250; i++) {
      cache.set(`k${i}`, i);
      expect(cache.size()).toBeLessThanOrEqual(100);
    }
    expect(cache.size()).toBe(100);
    expect(cache.getMetrics().evictions).toBe(150);
  });

  it('evicts the least recently used entry, not the oldest inserted', () => {
    for (let i = 0; i < 100; i++) cache.set(`k${i}`, i);
    cache.get('k0'); // k0 becomes most recently used
    cache.set('new', 'x'); // evicts k1
    expect(cache.has('k0')).toBe(true);
    expect(cache.has('k1')).toBe(false);
  });

  it('marks a prefetched entry as consumed on its first navigation hit', () => {
    cache.set('k', 1, { prefetched: true });
    cache.get('k');
    cache.get('k');
    const m = cache.getMetrics();
    expect(m.prefetchesConsumed).toBe(1);
    expect(m.unusedPrefetches).toBe(0);
    expect(m.wasteRate).toBe(0);
  });

  it('does not change counters when peeking with consume = false', () => {
    cache.set('k', 1, { prefetched: true });
    const r = cache.get('k', { consume: false });
    expect(r.isHit).toBe(true);
    const m = cache.getMetrics();
    expect(m.hits).toBe(0);
    expect(m.prefetchesConsumed).toBe(0);
  });

  it('clears entries and counters', () => {
    cache.set('k', 1, { prefetched: true });
    cache.get('k');
    cache.clear();
    const m = cache.getMetrics();
    expect(cache.size()).toBe(0);
    expect(m.hits).toBe(0);
    expect(m.prefetchesInitiated).toBe(0);
  });
});
