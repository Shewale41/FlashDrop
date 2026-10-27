# FlashDrop Performance Metrics

## Database Indexing

### Baseline — No Index

Query:
SELECT * FROM drops
WHERE name = 'Product 99999';

Rows: ~100,000
Scan: Sequential Scan
Execution time: 106 ms
Planning time: 13.4 ms

### After Index

Execution time: TBD
Planning time: TBD
Scan: TBD

### Improvement

Before: 106 ms
After: TBD
Improvement: TBD

## Database Indexing — `drops.name`

Dataset: ~100,000 rows

Query:
SELECT *
FROM drops
WHERE name = 'Product 99999';

| Metric | Before | After |
|---|---:|---:|
| Scan | Sequential Scan | Index Scan |
| Execution | 106 ms | 1.36 ms |
| Planning | 13.4 ms | 0.286 ms |

Index:
idx_drops_name

Result:
The indexed lookup was ~78x faster in this benchmark.

# FlashDrop Metrics

## Database Performance

### Indexing Benchmark

- Dataset: ~100,000 drops
- Query: `SELECT * FROM drops WHERE name = 'Product 99999';`
- Before index execution time: ~106 ms
- After index execution time: 1.36 ms
- Before index planning time: ~13.4 ms
- After index planning time: 0.286 ms
- Query plan before: Sequential Scan
- Query plan after: Index Scan
- Benchmark-specific improvement: ~78x execution-time reduction

## Redis Caching


### Redis GET Benchmark — Run 1

- Requests: 100
- Request pattern: Sequential
- Operation: `GET flashdrop:drop_1`
- Cache state: Warm cache (key already exists)
- Average latency: 0.437 ms
- Minimum latency: 0.267 ms
- Maximum latency: 1.973 ms
- p50 / p95 / p99: Not measured yet
- Environment: Windows, Node.js, Redis in Docker
- Status: Initial baseline; repeat runs needed


### Redis GET Benchmark — Run 2

- Requests: 100
- Request pattern: Sequential
- Operation: `GET flashdrop:drop_1`
- Cache state: Warm cache
- p50 latency: 0.680 ms
- p95 latency: 1.038 ms
- p99 latency: 1.443 ms
- Environment: Windows, Node.js, Redis in Docker
- Method: `performance.now()`, nearest-rank percentile
- Notes: Separate run from the initial average/min/max benchmark.


### PostgreSQL SELECT Benchmark — Run 1

- Requests: 100
- Request pattern: Sequential
- Operation: SELECT drop by primary key
- Database: Neon PostgreSQL (remote)
- Connection pool: Reused across requests
- Warm-up: One query before measurements
- Average latency: 653.853 ms
- Minimum latency: 476.627 ms
- Maximum latency: 2672.721 ms
- p50 latency: 567.712 ms
- p95 latency: 849.874 ms
- p99 latency: 2313.395 ms
- Environment: Windows, Node.js
- Notes: Initial run; high observed latency requires investigation.
  Measurements include client-to-database round-trip time.


### PostgreSQL Server-Side Query Analysis

- Query: Lookup drop by primary key
- Tool: Neon SQL Editor
- Method: EXPLAIN (ANALYZE, BUFFERS)
- Execution time: 0.083 ms
- Planning time: 0.224 ms
- Query plan: Index Scan
- Index used: drops_pkey
- Dataset: Approximately 100,000+ drops
- Notes: Server-side execution measurement; not directly comparable
  to end-to-end Node.js request latency.


### k6 GET /drops/drop_2 — Run 1

- Virtual users: 10
- Duration: 30 seconds
- Requests completed: 222
- Throughput: 7.17 requests/second
- HTTP failures: 0%
- Checks passed: 444/444 (100%)
- Average HTTP latency: 374 ms
- Minimum latency: 0.510 ms
- p50: 4.03 ms
- p90: 7.54 ms
- p95: 18.53 ms
- Maximum latency: 9.79 seconds
- Cache state: Not independently verified for every request
- Notes: Large gap between average and median; investigate
  long-tail latency before making performance claims.

### Cache-Aside Benchmark

Status: Pending

- PostgreSQL lookup: TBD
- Redis GET: TBD
- Cache MISS: TBD
- Cache HIT: TBD
- p50: TBD
- p95: TBD
- p99: TBD

### Testing metrics Backend tests with vitest and supertest 


  Test Files  1 failed | 4 passed (5)
       Tests  1 failed | 21 passed (22)
    Start at  17:02:01
    Duration  117.54s (tests 97%, import 2%)

  one case fails which we will fix later , beacuse of network issues we know :(

    

## Paginated GET /drops — k6 Performance Baseline

### Test Configuration
- Endpoint: `GET /drops?limit=20&offset=0`
- Load tool: k6
- Virtual users: 1
- Test duration: 30 seconds
- Sleep between iterations: 2 seconds
- Page size: 20 drops
- Database: Neon PostgreSQL
- Environment: Local API server with remote database

### Successful Run (Manual Warm-up Before k6)

A manual request was sent using PowerShell immediately before running k6.

| Metric | Result |
|---|---:|
| Requests completed | 12 |
| Average latency | 582.19 ms |
| Median latency (p50) | 565.13 ms |
| 90th percentile latency (p90) | 650.24 ms |
| 95th percentile latency (p95) | 702.86 ms |
| Minimum latency | 529.67 ms |
| Maximum latency | 760.76 ms |
| HTTP failure rate | 0% |
| Checks passed | 36/36 (100%) |
| Request rate | 0.387 requests/sec |

### Thresholds
- `http_req_failed < 1%`: PASSED
- `http_req_duration p95 < 1000 ms`: PASSED
- `checks rate > 99%`: PASSED

### Comparison Runs

Repeated runs without a manual warm-up frequently missed the p95 target.

| Run | Average latency | Median latency | p95 latency | Maximum latency | HTTP failures |
|---|---:|---:|---:|---:|---:|
| Initial run | 1.19 s | 565.49 ms | 4.07 s | 6.89 s | 0% |
| Subsequent run | 2.14 s | 878.26 ms | 6.85 s | 9.35 s | 0% |
| Another run | Not recorded | Not recorded | 3.54 s | Not recorded | 0% |

### Server-Side Timing Investigation

Temporary instrumentation measured database-query duration and total API response duration.

| Observation | Database query | Total API duration |
|---|---:|---:|
| First request in one run | 9.474 s | 9.484 s |
| First request after manual warm-up attempt | 5.326 s | 5.336 s |
| Typical subsequent requests in observed runs | ~0.49–0.79 s | ~0.50–0.79 s |

A separate diagnostic using a fresh PostgreSQL connection pool measured:
- Connection acquisition: 4.636 s
- Five sequential `SELECT 1` queries: 611.726 ms, 1.638 s, 711.358 ms, 507.057 ms, 511.336 ms
- Fetching 20 drops: 532.607 ms

### Findings and Limitations
- Pagination returns the expected response structure and passed the associated automated tests.
- The successful warmed-up k6 run met the initial p95 target of less than one second.
- Other runs showed substantial latency variability and missed the p95 target.
- Server-side timings closely tracked database-query timings, suggesting database access is a major contributor to observed request latency.
- A manual request before k6 was associated with better results, but the precise cause of the first-request delay has not been confirmed.
- The diagnostic used a fresh pool; its connection-acquisition time is not representative of every request handled by the running API's existing pool.
- These measurements are from a low-load, single-VU test. They do not establish multi-user capacity or production performance.
- No verified performance improvement from a database or connection-pool optimization has been established yet.

### Status
Pagination implementation and initial performance baseline: complete.

Database connection/query latency variability: observed; root cause unresolved.

The successful warmed-up result is a single measured run and should not be treated as representative performance without further testing.


## Docker Build and Image Baseline

**Measurement date:** October 2026  
**Project:** FlashDrop API  
**Environment:** Windows, Docker Compose, Node.js 24 multi-stage Dockerfile

### Image measurements

| Metric | Measured value |
|---|---:|
| API image tag | `server-api:latest` |
| Docker-reported disk usage | 360 MB |
| Docker-reported content size | 84 MB |
| Production dependency installation layer | 26.8 MB |
| Compiled `dist/` layer | 143 kB |

Note: Docker-reported disk usage and content size are distinct
metrics. Preserve the labels when reporting these measurements.

### Build duration

| Build condition | Duration |
|---|---:|
| Cached `docker compose build api` | 6.99 seconds |
| Uncached `docker compose build --no-cache api` | 46.80 seconds |
| Difference in this run | 39.81 seconds |

The cached build took approximately 85.1% less wall-clock time
than the uncached build in this single comparison.

**Caveat:** This compares cached and uncached builds, not the
old and new Dockerfiles. Results may vary with network speed,
dependency downloads, machine load, and Docker cache state.
Repeat measurements before treating this as a stable benchmark.

### Runtime verification

- `docker compose ps`: API running; Redis healthy.
- `docker compose logs --tail 50 api`: Redis connected.
- `GET /health`: returned `{"status":"ok"}`.

### Interpretation and next measurements

The multi-stage build separates compilation from the production
runtime image. The runtime stage installs production dependencies
and copies compiled JavaScript from the builder stage.

The current measurements establish a baseline, but do not prove
a percentage reduction in image size or build time versus the
previous Dockerfile.

Next:
- Measure startup-to-health-check duration across repeated runs.
- Preserve an old image or rebuild the old Dockerfile for a
  fair before/after image-size comparison.
- Repeat cached and uncached build measurements.
- Record Docker image size and disk usage as separate metrics.

# Image size reduced 
  -from 450 to 350 mb more than 20% reduction