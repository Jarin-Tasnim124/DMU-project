# System Architecture & Technical Specifications

**Project Title:** An Empirical Framework for Algorithmic Optimization and Predictive Data-Fetching in Full-Stack Web Applications  
**Proposer:** Jarin Tasnim | **Supervisor:** Fati Tahiru  

---

## 1. Architectural Overview

The system is constructed as a decoupled full-stack web research platform designed to experimentally compare two data-fetching paradigms under identical environmental constraints:
1. **Mode A: Baseline Implementation** (Conventional on-demand data fetching upon user click).
2. **Mode B: Algorithmic Optimization Layer** (Hover-intent predictive prefetching triggered on >100ms pointer dwell, coupled with an in-memory Stale-While-Revalidate caching engine).

```
                      +-------------------------------------------------+
                      |                CLIENT BROWSER                   |
                      |  (Next.js 14 / React Virtual DOM Architecture)  |
                      +-------------------------------------------------+
                                      |                     |
                   [Hover Dwell >100ms]                     [Direct Click]
                                      v                     v
                +----------------------------+      +-------------------------+
                |   Hover-Intent Engine      |      |  Baseline Fetch Engine  |
                |  - Debounce (100ms threshold)     |  - On-Demand Request    |
                |  - Fast-Swipe Cancellation |      |  - No Speculation       |
                +----------------------------+      +-------------------------+
                              |                                  |
                              v                                  |
                +----------------------------+                   |
                |   In-Memory SWR Cache      |                   |
                |  - LRU Key-Value Map       |                   |
                |  - Lifecycle Tagging       |                   |
                |  - Waste Rate Telemetry    |                   |
                +----------------------------+                   |
                              |                                  |
                              +----------------+-----------------+
                                               |
                                               v  (HTTP / JSON REST)
                               +-------------------------------+
                               |     Network Simulation Layer  |
                               |  - Standard Broadband (15ms)  |
                               |  - Fast 4G Mobile (85ms)      |
                               |  - Throttled 3G (380ms)       |
                               +-------------------------------+
                                               |
                                               v
                               +-------------------------------+
                               |      Node.js / Express API    |
                               |  (Deterministic Synthetic DB) |
                               |  5,000 Catalog Items (JSON)   |
                               +-------------------------------+
```

---

## 2. Core Algorithmic Components

### 2.1 Hover-Intent Predictive Prefetcher (`frontend/src/lib/prefetch/hoverIntent.js`)
* **Dwell Threshold ($\tau$):** Parameterized at $\tau = 100\text{ ms}$.
* **Mechanism:**
  1. User hovers pointer over card or anchor element: `onPointerEnter` initiates high-precision timer `setTimeout(callback, 100)`.
  2. If the user moves pointer away before $100\text{ ms}$: `onPointerLeave` executes `clearTimeout()`. This completely cancels speculative prefetch, eliminating unnecessary network bandwidth on rapid cursor swipes.
  3. If dwell time $t \ge 100\text{ ms}$: The intent callback fires, requesting the target resource and injecting it into SWR cache.
  4. Keys that are already cached or already being fetched are skipped.
  5. A prefetch that has already been sent is not cancelled when the pointer leaves; its result stays in the cache and is counted as wasted if it is never used.
* **Keyboard and touch:** Keyboard focus on a card uses the same delayed prefetch. Touch has no hover, so a tap falls back to on-demand fetching.

### 2.1.1 In-Flight Request De-duplication (`frontend/src/lib/api/client.js`)
* An in-flight map stores one Promise per cache key. A click that arrives while a prefetch for the same product is still loading reuses that Promise, so no second request is sent.
* Failed requests are never cached; the next attempt uses the network.
* The latency condition is applied by the server: the client sends the delay of the selected profile (15, 85 or 380 ms) in the `X-Simulated-Delay` header.

### 2.2 Stale-While-Revalidate (SWR) In-Memory Cache (`frontend/src/lib/cache/swrCache.js`)
* Implements the stale-while-revalidate pattern in client JavaScript memory (an application-level cache, not the browser HTTP cache):
  * **Fresh State:** Age $\le \text{TTL}$ (default 120 seconds). Returned synchronously without a request.
  * **Stale State:** $\text{TTL} < \text{Age} \le (\text{TTL} + \text{Grace Period})$. Returns cached data immediately to keep UI responsive, while initiating an asynchronous background HTTP fetch to update cache.
  * **Consumption & Waste Tracking:**
    * When an item is prefetched, it is marked `prefetched = true`, `consumed = false`.
    * The first navigation that reads the entry sets `consumed = true`.
    * If the entry expires or is evicted without being used, it is counted as `wasted`.
  * **Expired State:** Age $> (\text{TTL} + \text{Grace Period})$ (grace 60 seconds). The entry is removed and treated as a miss.
  * **Capacity limit:** At most 100 entries. When the cache is full, the least recently used entry is evicted.
  * **Failed revalidation:** The stale entry is kept until it expires.

---

## 3. REST API Specifications

The backend server is implemented using Node.js and Express.js running on port `5001`.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/products` | `GET` | Paginated product listing. Supports `page`, `limit`, `category`, `search`, `sortBy`. The `X-Simulated-Delay` header adds a fixed delay of 15, 85 or 380 ms. |
| `/api/products/:id` | `GET` | Individual product specification by ID, with 4 clustered related products. |
| `/api/categories` | `GET` | List of all available product categories and inventory counts. |
| `/api/telemetry` | `POST` | Ingests client-side experimental navigation timing records. |
| `/api/telemetry` | `GET` | Retrieves aggregated telemetry records. |
| `/api/health` | `GET` | Service uptime and request counter diagnostic endpoint. |

---

## 4. Synthetic Mock Dataset
To eliminate external network volatility, a deterministic dataset containing 5,000 realistic e-commerce products is stored at `backend/src/data/products.json`.
Each record includes deterministic identifiers, pricing, reviews, technical specifications (latency, battery autonomy, wireless protocol), and unique dynamic CSS gradient palettes.
