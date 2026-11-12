# Measured Browser Benchmark: Summary

Source: `benchmark/raw-results/measured_benchmark_results.csv` (180 measured trials). Every value below is computed from that file by `analysis/analyze_measured.py`.

## Navigation time (ms)

| Network | Mode | n | Mean | SD | Median | 95th pct. |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| Broadband | Baseline | 30 | 71.34 | 10.33 | 70.85 | 90.25 |
| Broadband | Optimised | 30 | 50.00 | 17.06 | 45.25 | 75.84 |
| Fast 4G | Baseline | 30 | 139.29 | 7.28 | 139.40 | 151.91 |
| Fast 4G | Optimised | 30 | 81.47 | 49.42 | 49.00 | 148.73 |
| Throttled 3G | Baseline | 30 | 446.44 | 47.12 | 437.60 | 463.20 |
| Throttled 3G | Optimised | 30 | 293.15 | 173.01 | 331.60 | 449.01 |

## Paired comparison of navigation time (Baseline minus Optimised)

| Network | Pairs | Mean difference (ms) | 95% CI (ms) | Median difference (ms) | Reduction in mean | Wilcoxon z | p | Effect size r |
| :--- | ---: | ---: | :---: | ---: | ---: | ---: | ---: | ---: |
| Broadband | 30 | 21.34 | 15.20 to 27.29 | 24.00 | 29.9% | -4.32 | < 0.001 | 0.91 |
| Fast 4G | 30 | 57.83 | 39.80 to 75.13 | 87.90 | 41.5% | -3.94 | < 0.001 | 0.84 |
| Throttled 3G | 30 | 153.29 | 97.45 to 210.07 | 105.65 | 34.3% | -3.95 | < 0.001 | 0.83 |

Bootstrap: 10,000 resamples, seed 42. Wilcoxon signed-rank test: two-sided, normal approximation with tie and continuity correction. Effect size: matched-pairs rank-biserial correlation.

## Requests, cache hits and wasted prefetches

| Network | Baseline requests | Optimised requests | Extra requests | Cache-hit rate | Served by in-flight prefetch | Wasted-prefetch rate |
| :--- | ---: | ---: | ---: | :--- | ---: | :--- |
| Broadband | 30 | 36 | +20.0% | 60.0% (18/30; 95% CI 42.3% to 75.4%) | 0 | 25.0% (6/24; 95% CI 12.0% to 44.9%) |
| Fast 4G | 30 | 36 | +20.0% | 50.0% (15/30; 95% CI 33.2% to 66.8%) | 4 | 24.0% (6/25; 95% CI 11.5% to 43.4%) |
| Throttled 3G | 30 | 36 | +20.0% | 20.0% (6/30; 95% CI 9.5% to 37.3%) | 13 | 24.0% (6/25; 95% CI 11.5% to 43.4%) |

Requests are GET requests to `/api/products/:id` seen in the browser network log. Extra requests = (Optimised - Baseline) / Baseline. Cache-hit rate = cache hits / navigations. Wasted-prefetch rate = wasted prefetches / prefetches started. Intervals are Wilson 95% intervals.

## Effect of the scripted interaction

| Network | Interaction | Trials | Baseline mean (ms) | Optimised mean (ms) | Cache hits | In flight | Optimised requests |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| Broadband | hover_150_click | 6 | 75.10 | 39.37 | 6 | 0 | 6 |
| Broadband | hover_300_click | 6 | 73.23 | 39.75 | 6 | 0 | 6 |
| Broadband | hover_600_click | 6 | 63.93 | 33.93 | 6 | 0 | 6 |
| Broadband | abandoned_hover_then_click | 6 | 74.45 | 68.02 | 0 | 0 | 12 |
| Broadband | click_without_dwell | 6 | 69.98 | 68.95 | 0 | 0 | 6 |
| Fast 4G | hover_150_click | 6 | 143.85 | 48.75 | 3 | 3 | 6 |
| Fast 4G | hover_300_click | 6 | 138.63 | 38.38 | 6 | 0 | 6 |
| Fast 4G | hover_600_click | 6 | 136.37 | 39.93 | 6 | 0 | 6 |
| Fast 4G | abandoned_hover_then_click | 6 | 137.43 | 141.80 | 0 | 1 | 12 |
| Fast 4G | click_without_dwell | 6 | 140.18 | 138.47 | 0 | 0 | 6 |
| Throttled 3G | hover_150_click | 6 | 441.65 | 333.63 | 0 | 6 | 6 |
| Throttled 3G | hover_300_click | 6 | 441.08 | 181.47 | 0 | 6 | 6 |
| Throttled 3G | hover_600_click | 6 | 434.83 | 33.15 | 6 | 0 | 6 |
| Throttled 3G | abandoned_hover_then_click | 6 | 439.03 | 439.58 | 0 | 0 | 12 |
| Throttled 3G | click_without_dwell | 6 | 475.58 | 477.92 | 0 | 1 | 6 |

## Checks taken from the benchmark

- Baseline trials with exactly one product request: 90 of 90
- Navigations served by an in-flight prefetch that sent no second request: 16 of 17
