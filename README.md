# An Empirical Framework for Algorithmic Optimization and Predictive Data-Fetching in Full-Stack Web Applications

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-REST_API-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-yellow.svg)](LICENSE)

* **Project Proposer:** Jarin Tasnim  
* **Academic Supervisor:** Fati Tahiru  
* **Research Field:** Software Architecture, Web Performance Optimization, Empirical Network Benchmarking  
* **Live Demo:** https://dmu-project.vercel.app/  
* **Source Code:** https://github.com/Jarin-Tasnim124/DMU-project  

---

## 📌 Executive Summary

Modern web applications suffer from perceived latency bottlenecks when relying on conventional on-demand data fetching. This research platform provides a repeatable, controlled empirical framework that compares:
* **Mode A (Baseline):** Conventional on-demand REST API data fetching on user click.
* **Mode B (Optimized):** Algorithmic hover-intent predictive prefetching (triggering on a `>100ms` pointer dwell) combined with an in-memory **Stale-While-Revalidate (SWR)** caching layer.

The project evaluates both strategies in an **automated browser benchmark** of the running prototype: 2 modes × 3 latency conditions (fixed delays of 15, 85 and 380 ms added by the server) × 30 matched trials = **180 measured trials**. The four measures are:
1. **Navigation time (ms)**
2. **Total HTTP request count**
3. **Cache-hit rate**
4. **Wasted-prefetch rate**

The optimisation layer includes in-flight request de-duplication (a click during a prefetch reuses the request already in flight), a cache limit of 100 entries with least-recently-used eviction, and defined keyboard and touch behaviour (keyboard focus uses the same delayed prefetch; touch falls back to on-demand fetching).

---

## 🚀 Quick Start Guide (Run on Any Computer)

This project requires **zero paid APIs, zero cloud databases, and zero external subscriptions**. It runs completely locally on Windows, macOS, or Linux.

### Prerequisites
* [Node.js](https://nodejs.org/) (Version 18 or higher)
* [Python 3](https://python.org/) (Optional, for running statistical analysis and generating SVG charts)

### Database
This project does not use a separate database server. The product catalog (5,000 items) is stored in
`backend/src/data/products.json`, which is generated deterministically by
`backend/src/data/generate_dataset.js` (run automatically by `npm run setup`, or manually with
`cd backend && npm run seed`). Benchmark measurements are stored in
`benchmark/raw-results/benchmark_results.csv`.

---

### Option 1: One-Command Start (Recommended)

#### On macOS / Linux:
```bash
./start.sh
```

#### On Windows:
Double-click `start.bat` or run:
```cmd
start.bat
```

---

### Option 2: Standard NPM Workflow
If you prefer running commands manually:

```bash
# 1. Install the root helper package (concurrently)
npm install

# 2. Install all dependencies and seed the 5,000 product mock dataset
npm run setup

# 3. Start both Backend API (Port 5001) and Frontend (Port 3000) concurrently
npm run dev
```

### Accessing the System:
* **Frontend Web Application:** [http://localhost:3000](http://localhost:3000)
* **Benchmark Cockpit (earlier simulation):** [http://localhost:3000/benchmark-dashboard](http://localhost:3000/benchmark-dashboard)
* **Backend REST API Health Check:** [http://localhost:5001/api/health](http://localhost:5001/api/health)
* **Catalog API Endpoint:** [http://localhost:5001/api/products](http://localhost:5001/api/products)

---

### Option 3: Docker Compose (Optional)
If your examiner or supervisor prefers containerized execution:
```bash
docker compose up --build
```

---

## ✅ Automated Tests

```bash
# Unit tests of the production modules (cache, prefetcher, API client)
npm test

# Behaviour checks of the running application in a real browser
# (mode switch, keyboard focus and touch, functional correctness on 30 products)
npm run checks:browser
```

The unit tests use Vitest and import `swrCache.js`, `hoverIntent.js` and `client.js` directly.

---

## 🧪 Measured Browser Benchmark (Objective 4)

The benchmark drives the running prototype in an installed browser (Microsoft Edge or Chrome) with Playwright.
Stop `npm run dev` first, because the script starts the API and a production build of the frontend itself.

```bash
# 1. Run 2 modes x 3 fixed delays x 30 matched trials = 180 measured trials (about 10 minutes)
npm run benchmark:browser

# 2. Compute the paired statistics from the measured CSV
npm run analyze:browser
```

* Every trial starts from a new page load with an empty application cache and reset counters.
* Trial *i* uses the same product card and the same scripted pointer actions in both modes; the two modes run back to back in alternating order.
* The scripted interaction sequence repeats every five trials: hover 150 ms then click; hover 300 ms then click; hover 600 ms then click; abandoned hover on another card then click; click without dwell.
* Options: `--browser=chrome` or `--browser=msedge`, `--threshold=100` (for a threshold pilot), `--trials=30`.

**Outputs**

* Raw trials: `benchmark/raw-results/measured_benchmark_results.csv`
* Run settings (browser, machine, Node.js version, interaction sequence): `benchmark/raw-results/measured_benchmark_results.meta.json`
* Summary (descriptive statistics, paired differences with bootstrap 95% confidence intervals, Wilcoxon signed-rank test, rank-biserial effect size, Wilson intervals): `analysis/measured_results_summary.md`

Measured times vary between machines and between runs.

---

## 🧮 Earlier Simulation (Exploratory Only)

An earlier version of the project generated 180 rows from a probability-based model instead of measuring the application. It is kept as exploratory material and is **not** used as evidence:

* `benchmark/run_synthetic_benchmark.js` and the Benchmark Cockpit page (`/benchmark-dashboard`) generate simulated rows.
* `analysis/analyze_results.py` summarises them in [`analysis/results_summary_table.md`](analysis/results_summary_table.md) (`npm run benchmark:simulated`, `npm run analyze:simulated`).

---

## 🏗️ Repository Architecture

```
├── backend/
│   ├── src/
│   │   ├── server.js               # Express REST API Server
│   │   ├── routes/products.js      # Product and telemetry routes
│   │   ├── controllers/productController.js
│   │   └── data/
│   │       ├── generate_dataset.js # Deterministic 5,000 product generator
│   │       └── products.json       # Mock catalog dataset (5.6 MB)
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.js           # Root layout & Metadata
│   │   │   ├── page.js             # Catalog view & interactive experiment hero
│   │   │   ├── products/[id]/page.js # Route diagnostic & detailed specs
│   │   │   ├── benchmark-dashboard/page.js # Cockpit for the earlier simulation (labelled as simulated)
│   │   │   ├── api/[...path]/route.js # Built-in API routes for the Vercel deployment
│   │   │   └── globals.css         # Modern design tokens, glassmorphism, animations
│   │   ├── components/
│   │   │   ├── Navbar.js           # Header with real-time Mode Switcher
│   │   │   ├── ProductCard.js      # Dwell-intent detection with visual glow
│   │   │   └── MetricsHUD.js       # Live floating performance HUD
│   │   ├── lib/
│   │   │   ├── cache/swrCache.js   # In-memory SWR cache (100 entries, LRU) & waste tracker
│   │   │   ├── prefetch/hoverIntent.js # >100ms dwell intent prefetch engine
│   │   │   ├── metrics/performanceTracker.js # Central telemetry engine & CSV exporter
│   │   │   └── api/client.js       # Unified dual-mode API fetcher with in-flight de-duplication
│   ├── tests/                      # Unit tests (Vitest) of the cache, prefetcher and client
│   ├── package.json
│   └── Dockerfile
├── benchmark/
│   ├── run_browser_benchmark.js    # Measured benchmark: 180 trials in a real browser (Playwright)
│   ├── run_browser_checks.js       # Automated behaviour checks in the browser
│   ├── lib/harness.js              # Shared helpers (servers, browser, trial set-up)
│   ├── run_synthetic_benchmark.js  # Earlier simulation (exploratory only)
│   └── raw-results/
│       ├── measured_benchmark_results.csv  # Measured trials (written by the browser benchmark)
│       └── benchmark_results.csv   # Simulated rows (exploratory only)
├── analysis/
│   ├── analyze_measured.py         # Paired analysis of the measured trials
│   ├── measured_results_summary.md # Summary of the measured trials (written by analyze_measured.py)
│   ├── analyze_results.py          # Summary of the simulated rows
│   ├── results_summary_table.md    # Simulated summary (exploratory only)
│   └── charts/
│       └── latency_comparison.svg  # Comparative latency chart
├── docs/
│   ├── SYSTEM_ARCHITECTURE.md      # Architecture specifications
│   └── METHODOLOGY.md              # Experimental design, measures and analysis
├── scripts/run-python.js           # Finds Python 3 on any operating system
├── start.sh                        # Mac / Linux one-click runner
├── start.bat                       # Windows one-click runner
├── docker-compose.yml              # Container orchestration
└── package.json                    # Root npm scripts
```

---

## 💡 How to Demonstrate the System to Examiners / Supervisors

1. **Start the Application:** Run `./start.sh` (or `npm run dev`).
2. **Observe Baseline Mode:**
   * In the floating panel on the right, click **BASELINE**.
   * Hover over product cards — notice no prefetch occurs.
   * Click any product card — the HUD shows that the navigation waits for the full round trip, including the added delay.
3. **Observe Optimized Mode:**
   * In the floating panel, click **SWR_PREFETCH**.
   * Rest the pointer on any product card for more than **100 ms** — the product data are prefetched into the SWR cache in the background.
   * Click the card — if the prefetch has completed, the navigation is served from the cache and a green badge is shown.
4. **Demonstrate Waste Rejection:**
   * Rapidly swipe your cursor across multiple cards (<100ms) — the debounce timer cancels immediately, preventing speculative bandwidth waste!
5. **Inspect Live Benchmark Telemetry:**
   * The floating HUD shows the navigation time, cache hits, request count and wasted prefetches of the current session. The `/benchmark-dashboard` page shows the earlier simulation and is labelled as simulated.

---

## 🌐 Live Deployment (Vercel)

The live demo at https://dmu-project.vercel.app/ deploys the Next.js frontend only. So that the demo works
without a separately hosted Express server, the frontend includes built-in API routes
(`frontend/src/app/api/[...path]/route.js`) that serve the same dataset and return the same responses as
the Express backend (`/api/products`, `/api/products/:id`, `/api/categories`, `/api/benchmark/results`,
`/api/telemetry`, `/api/health`). Before each build, `frontend/scripts/copy-data.js` copies the product
dataset and benchmark results into the frontend.

When running locally with `npm run dev`, the frontend uses the Express backend on port 5001, as described
above. The measured benchmark is run locally against the Express backend.
