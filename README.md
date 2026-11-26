
# FlashDrop

**FlashDrop** is a mobile reservation platform built around limited-availability drops, where multiple users compete to reserve inventory. It focuses on reliable reservation handling, concurrency control, caching, and backend performance.

## Features

- User authentication with JWT
- Browse available drops
- Reserve limited inventory
- Inventory-safe reservation handling
- PostgreSQL transactions and row-level locking
- Redis caching with cache invalidation
- API rate limiting
- REST API backend
- Android application built with React Native and Expo

## Tech Stack

| Category | Technologies |
|---|---|
| Mobile | React Native, Expo, TypeScript |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL, Neon |
| Cache | Redis, Upstash |
| Authentication | JWT, bcrypt |
| Infrastructure | Docker, Docker Compose |
| Deployment | Render, EAS Build |

## Architecture

```text
React Native App (Expo)
         │
         ▼
    Express REST API
      /         \
     ▼           ▼
PostgreSQL     Redis
  (Neon)     (Upstash)
```

PostgreSQL serves as the source of truth for inventory and reservations, while Redis is used for caching and rate-limiting functionality.

## Concurrency Handling

FlashDrop uses PostgreSQL transactions and `SELECT FOR UPDATE` row-level locking to handle concurrent reservation requests and prevent overselling limited inventory.

A simulated concurrency test with 10 users competing for 3 items resulted in:

- 3 successful reservations
- 7 rejected reservations
- 0 remaining inventory

## Performance Testing

A load test was conducted with 10 virtual users over 30 seconds to evaluate API behavior under simulated traffic.

Performance testing focused on:

- Request throughput
- Response latency (p50, p95, p99)
- Error rate
- Concurrent reservation correctness

## Deployment

- **Backend:** Dockerized Express API deployed on Render
- **Database:** Neon PostgreSQL
- **Redis:** Upstash Redis
- **Android:** Expo EAS builds

## Project Documentation

- [`decisions.md`](./decisions.md) — Engineering decisions, problems encountered, solutions, bottlenecks, and technical trade-offs.
- `metrics.md` — Performance benchmarks and test measurements.

## Android

FlashDrop is available as an Android APK.

Download the latest release from [GitHub Releases](../../releases).

## License

This project is open source. See the repository license for details.
