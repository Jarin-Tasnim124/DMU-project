# Methodology and Benchmark Protocol

**Project Title:** An Empirical Framework for Algorithmic Optimization and Predictive Data-Fetching in Full-Stack Web Applications  
**Proposer:** Jarin Tasnim | **Supervisor:** Fati Tahiru  

---

## 1. Approach

The project follows Design Science Research. The artefact is one full-stack prototype with two fetching modes, and it is evaluated in a controlled setting by an automated browser script that drives the running application.

---

## 2. Experimental Design

A 3 × 2 full-factorial design with 30 matched trials per cell (180 measured trials).

### 2.1 Independent variables

| Variable | Level | Definition |
| :--- | :--- | :--- |
| Fetching strategy | Baseline | Data are fetched only after the click; the prefetcher and the cache are bypassed |
| Fetching strategy | Optimised | Hover-intent prefetch after a 100 ms dwell, plus the in-memory SWR cache (TTL 120 s, grace 60 s, at most 100 entries) |
| Latency condition | Broadband | Fixed delay of 15 ms added by the server |
| Latency condition | Fast 4G | Fixed delay of 85 ms added by the server |
| Latency condition | Throttled 3G | Fixed delay of 380 ms added by the server |

Bandwidth limits, packet loss and jitter are not simulated.

### 2.2 Dependent variables (columns of `measured_benchmark_results.csv`)

| Measure | CSV column | Definition |
| :--- | :--- | :--- |
| Navigation time (ms) | `navigation_latency_ms` | Time from the click until the product data are available to the detail page |
| Render time (ms) | `render_latency_ms` | Time from the click until the first animation frame after the product data are in the page |
| Time to first byte (ms), supporting telemetry only | `ttfb_ms` | Time until the response headers of the navigation request arrive; empty when no new request was made |
| Cache hit (0/1) | `cache_hit` | The navigation was served from the SWR cache without a new request |
| Served in flight (0/1) | `served_by_inflight_prefetch` | The navigation reused a prefetch request that was still loading |
| Total HTTP request count per trial | `product_requests` | GET requests to `/api/products/:id` seen in the browser network log during the trial |
| Prefetch counts | `prefetch_initiated`, `prefetch_consumed`, `prefetch_wasted` | Prefetches started, used by a navigation, and never used in the trial |

Derived measures: paired difference in navigation time (Baseline minus Optimised for the same trial); extra requests = (Optimised − Baseline) / Baseline; cache-hit rate = cache hits / navigations; wasted-prefetch rate = wasted prefetches / prefetches started.

### 2.3 Scripted interaction sequence (repeats every five trials)

| Trial (mod 5) | Interaction | Pointer actions |
| :--- | :--- | :--- |
| 1 | Hover 150 ms, click | Rest on the target card for 150 ms, then click |
| 2 | Hover 300 ms, click | Rest on the target card for 300 ms, then click |
| 3 | Hover 600 ms, click | Rest on the target card for 600 ms, then click |
| 4 | Abandoned hover, then click | Rest on a different card for 250 ms, move to the target card and click after 40 ms |
| 5 | Click without dwell | Move to the target card and click after 40 ms |

The dwell values are design choices of the script, not observations of users.

### 2.4 Controls

* Both modes use the same production build (`next build` and `next start`), dataset, API and routes.
* Every trial starts from a new page load with an empty application cache and reset counters.
* Trial *i* uses the same product card and the same pointer actions in both modes; the two modes run back to back in alternating order.
* Three unrecorded warm-up trials precede each latency condition.
* The browser, machine, Node.js version and settings of a run are saved in `measured_benchmark_results.meta.json`.

---

## 3. Analysis

`analysis/analyze_measured.py` computes every statistic from the measured CSV; no value is hard-coded.

* Mean, sample standard deviation, median and 95th percentile of the navigation time per cell.
* Paired difference (Baseline minus Optimised) with a bootstrap 95% confidence interval (10,000 resamples, fixed seed).
* Wilcoxon signed-rank test (two-sided, α = 0.05, normal approximation with tie and continuity correction).
* Matched-pairs rank-biserial correlation as the effect size.
* Wilson 95% confidence intervals for the cache-hit rate and the wasted-prefetch rate.

---

## 4. Reproducing the run

```bash
npm install
npm run setup
npm test                  # unit tests of the cache, prefetcher and client
npm run checks:browser    # behaviour checks in the browser
npm run benchmark:browser # 180 measured trials
npm run analyze:browser   # paired analysis
```

Measured times vary between machines and between runs.

---

## 5. Earlier simulation

`benchmark/run_synthetic_benchmark.js` and the Benchmark Cockpit page generate 180 rows from assumed probabilities and timing distributions. They are kept as exploratory material, are labelled as simulated, and are not used as evidence.
