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