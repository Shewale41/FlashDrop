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

    

