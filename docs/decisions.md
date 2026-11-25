
# FlashDrop — Engineering Decisions, Bottlenecks & Problem Solving

> A reservation platform built to explore backend engineering concepts such as concurrency control, inventory consistency, caching, authentication, rate limiting, deployment, and performance testing.

---

## 1. Project Overview

FlashDrop is a mobile reservation platform designed around limited-availability drops, where multiple users may attempt to reserve the same inventory at the same time.

The primary engineering challenge was ensuring that reservations remain consistent under concurrent requests while maintaining responsive API performance.

Rather than treating FlashDrop as a simple CRUD application, the project was designed to explore real-world backend problems:

- Concurrent access to limited inventory
- Race conditions and overselling
- Database locking and transactional consistency
- Caching and cache invalidation
- API authentication and authorization
- Rate limiting
- Database query performance
- Load testing and performance measurement
- Containerization and deployment

### Project goals

- Build a complete mobile reservation application.
- Develop a REST API using Node.js and Express.
- Use PostgreSQL as the primary data store.
- Implement Redis for caching and supporting backend functionality.
- Prevent overselling when multiple requests compete for limited inventory.
- Test application behavior under concurrent traffic.
- Deploy the backend and connect a standalone mobile build to production services.

---

## 2. Technology Stack

### Mobile Frontend

- React Native
- Expo
- TypeScript
- Expo Router

### Backend

- Node.js
- Express 5
- TypeScript
- REST APIs
- JSON Web Tokens (JWT)

### Database

- PostgreSQL
- Neon (managed PostgreSQL)

### Caching and Rate Limiting

- Redis
- Upstash Redis (production)
- Local Redis through Docker

### Infrastructure & Deployment

- Docker
- Docker Compose
- Render (backend hosting)
- EAS Build (Android cloud builds)

### Testing & Development

- Postman
- Load testing and request simulation
- Android Emulator
- Physical Android device
- Git and GitHub

---

## 3. System Architecture

```text
                 ┌────────────────────────┐
                 │   React Native App   │
                 │   Expo + TypeScript  │
                 └───────────┬──────────┘
                             │
                             │ HTTPS / REST API
                             ▼
                 ┌────────────────────────┐
                 │     Express API        │
                 │     Node.js + TS       │
                 │                       │
                 │ Authentication        │
                 │ Rate Limiting         │
                 │ Reservation Logic     │
                 │ Cache Management      │
                 └───────┬──────┬────────┘
                         │      │
                 ┌───────▼──┐ ┌─▼────────────┐
                 │PostgreSQL│ │    Redis     │
                 │  Neon    │ │   Upstash   │
                 └──────────┘ └─────────────┘
```

### Request flow

1. The mobile application sends an API request.
2. Express receives and processes the request.
3. Authentication middleware validates the user's JWT when the route requires authentication.
4. Rate-limiting middleware controls request frequency.
5. Redis is used where caching or rate-limiting functionality applies.
6. PostgreSQL is used for persistent data and reservation operations.
7. The API returns the response to the client.

PostgreSQL remains the source of truth for reservation and inventory data.

---

# 4. Engineering Decisions

## Decision 1 — PostgreSQL as the Primary Database

### Context

The reservation system requires reliable inventory management and consistent reservation state. Concurrent requests must not result in inventory being oversold.

### Decision

Use PostgreSQL as the primary database.

### Reasons

- ACID transactions
- Row-level locking
- Strong consistency
- Relational constraints
- Reliable handling of concurrent writes
- SQL-based querying
- Ability to use transactions for reservation operations

### Trade-offs

PostgreSQL introduces database connection management, query optimization, transaction handling, and lock contention considerations.

However, these trade-offs were appropriate because inventory correctness was more important than using a simpler data store.

---

## Decision 2 — Neon for Managed PostgreSQL

### Context

The application needed a remotely accessible database without managing a database server on a local machine.

### Decision

Use Neon as the hosted PostgreSQL provider.

### Reasons

- Managed PostgreSQL infrastructure
- Remote access from local development and deployed backend
- Reduced infrastructure maintenance
- Suitable for a project deployed on a separate backend host

### Architecture

- Local development connects to Neon.
- Production backend connects to Neon through environment configuration.
- The database is not bundled inside the backend Docker container.

### Trade-offs

The application depends on an external managed database service and network connectivity.

---

## Decision 3 — Raw SQL Instead of an ORM

### Context

The project was intended to improve understanding of backend engineering and database behavior, particularly query execution, transactions, locking, and performance.

### Decision

Use raw SQL queries through the PostgreSQL client rather than relying on an ORM to abstract database operations.

### Reasons

- Direct control over SQL
- Explicit query behavior
- Better understanding of query execution
- Easier to reason about row locking
- Direct use of prepared statements
- Reduced abstraction when debugging database performance

### Trade-offs

Raw SQL requires more manual work:

- Query maintenance
- Mapping database results
- Handling migrations and schema changes
- Preventing SQL injection
- Maintaining consistency across queries

This approach was selected as a learning and engineering trade-off rather than a claim that raw SQL is universally better than an ORM.

---

## Decision 4 — Parameterized Queries to Prevent SQL Injection

### Context

Dynamic SQL queries can become vulnerable to SQL injection if untrusted values are concatenated into query strings.

### Decision

Use parameterized queries with PostgreSQL placeholders.

Example:

```sql
SELECT *
FROM drops
WHERE id = $1;
```

Values are supplied separately to the query execution function rather than inserted directly into SQL strings.

### Benefits

- Prevents user-controlled values from being interpreted as SQL syntax
- Separates SQL structure from input data
- Improves security and query correctness

### Engineering lesson

Prepared/parameterized queries should be the default approach when passing external input to SQL.

---

## Decision 5 — PostgreSQL Row-Level Locking for Reservation Concurrency

### Context

FlashDrop allows multiple users to reserve limited inventory.

For example, if a drop has 3 items remaining and 10 users attempt to reserve simultaneously, only 3 reservations should succeed.

Without synchronization, concurrent transactions could read the same available inventory before any transaction updates it. This can result in a race condition and overselling.

### Decision

Use PostgreSQL transactions and row-level locking with `SELECT ... FOR UPDATE` during reservation operations.

### Reservation flow

1. Begin a database transaction.
2. Lock the relevant drop row.
3. Read the current inventory after acquiring the lock.
4. Verify that inventory is available.
5. Check reservation constraints.
6. Create the reservation.
7. Decrement available inventory.
8. Commit the transaction.

If inventory is unavailable, the reservation is rejected.

### Why `SELECT FOR UPDATE`?

The row lock serializes competing transactions attempting to modify the same inventory row.

A transaction must wait for the lock to be released before proceeding with the locked row, preventing multiple competing transactions from simultaneously making decisions using the same unlocked inventory state.

### Trade-offs

- Concurrent requests for the same drop may wait.
- Lock contention can increase latency during popular drops.
- Throughput may become limited by transactions competing for the same inventory row.

However, the locking approach prioritizes inventory correctness over allowing unsafe parallel writes.

### Result

Reservation requests competing for the same inventory are handled in a controlled manner instead of allowing overselling.

---

## Decision 6 — Redis for Caching

### Context

Repeated requests for frequently accessed drop data can generate unnecessary database queries.

The database should remain responsible for authoritative reservation and inventory state, while cacheable read data can be served more efficiently.

### Decision

Use Redis as a caching layer.

### Cache strategy

Cache-aside:

1. API receives a request.
2. API checks Redis for the requested data.
3. If a cache hit occurs, return cached data.
4. If a cache miss occurs, query PostgreSQL.
5. Store the retrieved data in Redis.
6. Return the response.

### Benefits

- Reduces repeated database reads
- Can reduce database load
- Improves response latency for cache hits
- Allows frequently accessed data to be served without repeated SQL queries

### Trade-offs

- Cached data may become stale.
- Cache invalidation introduces complexity.
- Redis is an additional dependency.
- Cache misses still require database access.
- Cache behavior must be monitored and tested.

---

## Decision 7 — Cache Invalidation After Reservation Mutations

### Context

Reservation operations change inventory. If previously cached drop information is not updated or invalidated, clients may receive outdated inventory information.

### Decision

Invalidate or update the affected cache entries after successful inventory-changing operations.

### Flow

1. Reservation transaction executes.
2. Database inventory is updated.
3. Transaction commits successfully.
4. Related cache entries are invalidated.
5. Subsequent reads retrieve updated information from the database and repopulate the cache.

### Why invalidate after commit?

The cache should not reflect a reservation that ultimately failed or rolled back.

Invalidating after a successful commit avoids treating an unsuccessful database operation as a successful inventory change.

### Trade-offs

Cache invalidation is difficult because it introduces coordination between the database and cache.

The database is the source of truth. Redis must not be allowed to independently determine whether a reservation is valid.

---

## Decision 8 — Redis Fallback Behavior

### Context

Redis is used for performance-related functionality, but the core reservation system should not become completely unavailable merely because the cache service has an issue.

### Decision

Implement fallback behavior for cache-related operations when Redis is unavailable, where the application logic permits it.

### Expected behavior

- Cache hit: use cached data.
- Cache miss: fetch from PostgreSQL.
- Cache unavailable: continue using PostgreSQL for cacheable reads where supported.
- Reservation correctness: remains dependent on PostgreSQL transactions, not cache state.

### Trade-offs

Redis failure may increase database load and response latency.

The fallback improves availability but does not eliminate the need to monitor Redis health and database capacity.

---

## Decision 9 — Redis for Rate Limiting

### Context

Public API endpoints can be repeatedly requested and may be abused or overloaded.

A rate limiter is needed to control request frequency.

### Decision

Use Redis-backed rate limiting so request counters can be maintained outside individual Node.js process memory.

### Reasons

- Shared counters across application instances
- Centralized rate-limit state
- Better fit for a deployed backend than process-local counters
- Redis expiration support

### Trade-offs

- Rate limiting depends on Redis availability/configuration.
- Rate limits must be designed carefully to avoid blocking legitimate traffic.
- Incorrect key design can apply limits to the wrong users or clients.

---

## Decision 10 — JWT Authentication

### Context

The API contains user-specific functionality such as reservations. Requests to protected endpoints must identify and authenticate the user.

### Decision

Use JSON Web Tokens for authentication.

### Authentication flow

1. User submits login credentials.
2. Backend verifies the password.
3. Backend creates a JWT.
4. Token is returned to the client.
5. Client stores the token.
6. Client sends the token with protected API requests.
7. Authentication middleware validates the token.
8. The request continues with authenticated user context.

### Token configuration

The project used a short-lived JWT configuration during implementation, including a 15-minute expiration in the login flow.

### Benefits

- Stateless authentication
- No need to maintain a server-side session for each request
- Authentication middleware can validate tokens
- Suitable for REST API authentication

### Trade-offs

- Token expiration requires handling re-authentication or future refresh-token functionality.
- Token storage must be handled securely on mobile.
- A compromised token remains usable until expiration or additional revocation mechanisms are implemented.

---

## Decision 11 — bcrypt for Password Hashing

### Context

Passwords should never be stored in plaintext.

### Decision

Use bcrypt to hash passwords before storing them in PostgreSQL.

### Implementation approach

- Hash passwords during registration.
- Store the hash, not the original password.
- Verify submitted passwords against the stored hash during login.

### Benefits

- Passwords are not stored in plaintext.
- bcrypt provides computationally expensive password hashing.
- Reduces impact of database credential exposure.

---

## Decision 12 — Express and TypeScript for Backend Development

### Context

The application needed a backend capable of handling REST API routes, authentication, database queries, Redis, and reservation logic.

### Decision

Use Express with TypeScript.

### Reasons

- Lightweight backend framework
- Straightforward middleware architecture
- Flexible route organization
- Familiar JavaScript ecosystem
- Type safety through TypeScript
- Easy integration with PostgreSQL and Redis

### Trade-offs

Express leaves many architectural decisions to the developer.

Middleware ordering, validation, error handling, route structure, and security controls must be designed and maintained explicitly.

---

## Decision 13 — React Native and Expo for Mobile

### Context

FlashDrop needed a mobile application that could be tested on an Android emulator and a physical Android phone.

### Decision

Use React Native with Expo and TypeScript.

### Reasons

- Cross-platform mobile development
- TypeScript support
- Expo development tooling
- Simplified device testing
- Cloud build support through EAS

### Trade-offs

- Native configuration still matters.
- Expo Go and standalone builds have different capabilities.
- Production environment variables must be included correctly in builds.
- Native application changes require a new binary build.

---

## Decision 14 — Docker for Backend Containerization

### Context

The backend needed a consistent runtime environment across local development and deployment.

### Decision

Dockerize the backend.

### Benefits

- Consistent Node.js runtime
- Reproducible environment
- Easier deployment
- Isolated application dependencies
- Portable backend container

### Multi-stage Docker build

The backend Dockerfile uses separate build and runtime stages.

The builder stage:

- Installs dependencies
- Copies source code
- Compiles TypeScript

The runtime stage:

- Uses a Node.js base image
- Installs production dependencies
- Copies compiled output
- Runs the application

### Why multi-stage builds?

The final container does not need the complete TypeScript source and development dependency tree to execute the compiled backend.

This reduces unnecessary contents in the runtime image.

### Trade-offs

- Docker adds build and debugging complexity.
- Container networking requires configuration.
- Environment variables must be managed correctly.
- Image size and build cache need to be monitored.

---

## Decision 15 — Docker Compose for Local Backend and Redis

### Context

Local development requires the API and Redis to communicate in a consistent environment.

### Decision

Use Docker Compose for local backend and Redis services.

### Local architecture

```text
Docker Compose
│
├── API Container
│   └── Express / Node.js
│
└── Redis Container
    └── Cache and rate-limit data
```

### Networking

Inside Docker Compose, the backend uses the Redis service hostname:

```text
redis://redis:6379
```

The hostname `redis` resolves through the Compose network.

### Trade-offs

- Requires Docker to be running.
- Container networking differs from host networking.
- Environment configuration differs between local development and production.

---

## Decision 16 — Environment-Based Service Configuration

### Context

FlashDrop runs in multiple environments:

- Local development
- Docker Compose
- Cloud backend deployment
- Expo development
- Standalone Android builds

Each environment uses different service endpoints.

### Decision

Use environment variables for service configuration.

### Examples

| Environment | PostgreSQL | Redis |
|---|---|---|
| Local API | Neon | `redis://localhost:6379` |
| Docker Compose API | Neon | `redis://redis:6379` |
| Production API | Neon | Upstash `rediss://` |

The backend reads configuration from environment variables instead of hardcoding service credentials and URLs.

### Benefits

- Same backend code across environments
- Environment-specific infrastructure
- No need to hardcode credentials
- Easier deployment configuration

### Trade-offs

- Missing variables can cause runtime failures.
- Incorrect environment values can connect the app to the wrong service.
- Cloud build environments must include the correct public frontend configuration.

---

## Decision 17 — Render for Backend Deployment

### Context

The backend needed a public HTTPS endpoint accessible by the mobile application.

### Decision

Deploy the Dockerized backend to Render.

### Reasons

- Docker deployment support
- Public web service
- Straightforward deployment from project source
- Suitable for the project's zero-cost deployment goal at the time of setup

### Deployment architecture

```text
Mobile Application
        │
        │ HTTPS
        ▼
Render
┌────────────────────┐
│ Dockerized API    │
│ Node.js / Express │
└─────────┬──────────┘
          │
     ┌────┴─────┐
     ▼          ▼
   Neon      Upstash
 PostgreSQL    Redis
```

### Trade-offs

- Free-tier resource constraints
- Cold starts or service availability limitations depending on the hosting plan
- Backend latency can be influenced by hosting location and external services
- Production capacity is not equivalent to a dedicated production infrastructure

---

## Decision 18 — Upstash for Production Redis

### Context

The production backend runs independently of the local development machine.

A local Redis container cannot be used by the deployed Render service.

### Decision

Use Upstash Redis as the remotely accessible Redis service.

### Reasons

- Managed Redis service
- Accessible by deployed backend
- No Redis server administration
- TLS-enabled Redis connection
- Compatible with Redis-based caching and rate-limiting use cases

### Connection configuration

Production uses a remote Redis URL through the `REDIS_URL` environment variable.

The application does not need a separate hardcoded production Redis implementation.

### Trade-offs

- External network dependency
- Redis service limits
- Latency between backend and Redis provider
- Requires secure environment configuration

---

## Decision 19 — EAS Cloud Builds for Android

### Context

Local Android builds on Windows encountered build tooling and filesystem path issues, including CMake/Ninja path-related failures.

The local build environment was taking time away from application development and deployment.

### Decision

Use Expo EAS cloud builds for Android binaries.

### Reasons

- Cloud build environment
- Reduced dependency on local Android build toolchain
- Avoided recurring local Windows build issues
- Easier APK generation

### Trade-offs

- Cloud build queue and build time
- Build configuration must be correct
- Environment variables must be configured for the correct build profile
- Build artifacts must be downloaded and tested

---

## Decision 20 — APK for Direct Android Distribution

### Context

The goal was to install FlashDrop on physical devices and distribute it directly without requiring Google Play Store publishing.

### Decision

Generate an Android APK through EAS.

### APK advantages

- Direct installation on Android devices
- Easy to share
- Suitable for GitHub Releases
- Does not require Play Store publication

### Trade-offs

- Users may need to allow installation from unknown sources.
- APK distribution does not provide Play Store update mechanisms.
- Updates must be distributed through new builds.
- Android package identity must remain consistent for upgrades.

### Future consideration

Google Play releases should use an Android App Bundle (AAB) when preparing Play Store publication.

---

# 5. Problems Encountered & Solutions

## Problem 1 — Pagination and Full Database Fetch Timeout

### Problem

An API request attempted to retrieve approximately 100,004 rows from the `drops` table in a single request.

The full query timed out, even though smaller database queries succeeded.

### Observations

During investigation:

- `COUNT(*)` succeeded.
- `SELECT 1` succeeded.
- `LIMIT 1000` succeeded in testing, although response behavior varied.
- Retrieving the entire dataset timed out.

### Root cause

The problem was not simply that PostgreSQL was unavailable.

Retrieving a very large dataset in one request introduced significant work involving:

- Query execution
- Data retrieval
- Network transfer
- Node.js result handling
- Serialization
- Response transmission

A large response creates overhead beyond database query execution itself.

### Solution / engineering direction

Use pagination instead of returning every row.

The API should:

- Limit the number of returned rows.
- Support page-based or cursor-based retrieval.
- Return a manageable response size.
- Allow the client to request additional records incrementally.

### Engineering lesson

A query returning successfully in the database does not guarantee that returning the entire result set through an HTTP API is efficient.

Pagination is a fundamental API scalability requirement.

---

## Problem 2 — Concurrent Reservation Race Condition

### Problem

Multiple users could attempt to reserve the same limited inventory simultaneously.

Without synchronization, concurrent requests could observe the same available inventory and both attempt to reserve it.

### Risk

Overselling inventory.

### Solution

Use PostgreSQL transaction-level coordination and row locking with `SELECT FOR UPDATE`.

### Expected behavior

For a drop containing 3 available items and 10 competing reservation requests:

- At most 3 requests should successfully reserve.
- Remaining requests should be rejected when inventory is exhausted.
- Final inventory should not become negative.
- The reservation count should not exceed the original available inventory.

### Verification

A concurrency simulation was conducted with 10 users competing for 3 items.

Observed result:

- 3 successful reservations
- 7 rejected reservations
- 0 remaining inventory

### Engineering lesson

Application-level checks alone are insufficient for concurrency-sensitive inventory operations.

Correctness must be enforced by the database transaction and locking strategy.

---

## Problem 3 — Cache Staleness After Inventory Updates

### Problem

Caching drop data improves read performance, but inventory is mutable.

If cached inventory remains unchanged after a reservation, subsequent clients may receive stale data.

### Solution

Invalidate relevant cache entries following successful database mutations.

### Flow

```text
Reservation Request
       │
       ▼
Database Transaction
       │
       ▼
Inventory Updated
       │
       ▼
Transaction Committed
       │
       ▼
Cache Invalidated
       │
       ▼
Next Read Fetches Fresh Data
```

### Engineering lesson

Caching mutable data requires an explicit consistency strategy.

Cache invalidation is part of application logic, not an optional optimization.

---

## Problem 4 — Redis Configuration Across Environments

### Problem

The backend uses different Redis connection addresses depending on where it runs.

A connection working locally does not necessarily work inside Docker or in production.

### Environment differences

- Host machine: `localhost`
- Docker Compose: Redis service hostname `redis`
- Production: remote Upstash connection URL

### Solution

Configure Redis using `REDIS_URL`.

The same backend implementation uses environment configuration to connect to the appropriate Redis instance.

### Engineering lesson

`localhost` is relative to the environment in which the application runs.

Inside a container, `localhost` refers to that container, not another service or the host machine.

---

## Problem 5 — TypeScript / ESM Runtime Issues

### Problem

The backend encountered module configuration errors during development, including:

```text
SyntaxError: Cannot use import statement outside a module
```

### Cause

The runtime was not interpreting the emitted/imported JavaScript using the intended module configuration.

### Solution

Configure the project for ES modules, including the package module setting:

```json
{
  "type": "module"
}
```

The TypeScript build and Node.js runtime configuration must agree on module behavior.

### Engineering lesson

TypeScript compilation does not eliminate JavaScript runtime module configuration requirements.

ESM import/export behavior must be compatible with the Node.js runtime and emitted build output.

---

## Problem 6 — Express Type Import Runtime Error

### Problem

A runtime import involving Express types failed:

```text
The requested module 'express' does not provide an export named 'NextFunction'
```

### Cause

TypeScript-only types were being handled as runtime imports rather than type-only imports.

### Solution

Use type-only imports for types that should not exist in emitted JavaScript.

Example:

```typescript
import type { NextFunction, Request, Response } from "express";
```

### Engineering lesson

TypeScript types are erased at compilation.

Using `import type` prevents type-only dependencies from being treated as runtime values.

---

## Problem 7 — Docker Image Size

### Problem

The initial backend container image contained unnecessary build/development content.

### Decision / solution

Use a multi-stage Docker build with separate builder and runtime stages.

Only the compiled backend and production dependencies are copied into the final runtime image.

### Recorded Docker baseline

| Metric | Observed value |
|---|---:|
| `server-api:latest` Docker disk usage | 360 MB |
| Docker content size | 84 MB |
| Total disk usage across 3 images | 894.2 MB |
| Build cache | 633.5 MB |
| Reclaimable build cache | 273.2 MB |
| Containers | 4 (2 active) |
| Local volumes | 89 B |

### Important distinction

Docker image **disk usage** and **content size** are different metrics.

These values should not be reported interchangeably.

The image metrics are environment-specific and represent a recorded baseline, not a universal image size.

### Engineering lesson

Multi-stage builds reduce unnecessary runtime contents, but Docker disk usage also includes image layers, build cache, and other images stored locally.

---

## Problem 8 — Local Android Build Failures on Windows

### Problem

Local Android builds encountered issues involving:

- Gradle
- CMake
- Ninja
- Windows path-length constraints
- Android emulator/ADB setup

Some errors were related to native build paths and toolchain configuration.

### Impact

Repeated local build failures slowed down delivery and did not contribute directly to application functionality.

### Solution

Use EAS cloud builds for Android binary generation.

### Engineering lesson

A development environment problem should not unnecessarily block delivery when a reliable alternative build environment is available.

---

## Problem 9 — APK Installation Failure on Physical Device

### Problem

An earlier APK build failed to install on a physical Android device and displayed:

> App not installed — package appears to be invalid.

### Investigation direction

The issue was isolated from backend/network configuration.

The build artifact, device compatibility, APK integrity, and installation diagnostics needed to be treated separately from API connectivity.

### Resolution

A subsequent EAS build was downloaded and successfully installed on the physical Android phone.

### Verification

FlashDrop was confirmed running on:

- Android emulator
- Physical Android device

### Engineering lesson

An APK installation failure and an application network failure are separate categories of issues and should be diagnosed independently.

---

## Problem 10 — Production API Network Error in Standalone Build

### Problem

The standalone Android app initially displayed a network error when attempting to log in.

### Investigation

The development app worked, but the standalone EAS build did not have the expected production API URL configuration.

### Cause

The frontend production API environment variable was not correctly available in the EAS preview build environment.

### Solution

Configure:

```text
EXPO_PUBLIC_API_URL
```

in the appropriate EAS build environment.

The variable must be available at build time for the standalone app.

### Result

After updating the EAS environment configuration and rebuilding:

- Standalone app login worked.
- The app connected to the production backend.
- The emulator standalone build was confirmed working.

The updated APK was subsequently installed and verified on the physical Android phone.

### Engineering lesson

Expo environment variables used by client code may be embedded during build.

A local `.env` file is not automatically equivalent to an EAS cloud build environment.

---

## Problem 11 — EAS Project Slug Mismatch

### Problem

A build failed with the error:

```text
Project config: Slug for project identified by
"extra.eas.projectId" (mobile) does not match
the "slug" field (Flashdrop).
```

### Cause

The project was linked to an existing EAS project with the slug `mobile`, but the local Expo configuration had changed the slug to `Flashdrop`.

### Solution

Keep the display name separate from the EAS project slug.

```json
{
  "expo": {
    "name": "Flashdrop",
    "slug": "mobile"
  }
}
```

### Engineering lesson

The application display name and Expo project slug serve different purposes.

Changing the visible application name does not require changing the linked EAS slug.

---

## Problem 12 — Android Icon Configuration

### Problem

The app name was updated, but the Android launcher icon configuration used separate adaptive icon assets.

### Cause

Android adaptive icons were configured independently from the general Expo icon property.

### Solution

Configure the Android adaptive icon assets explicitly.

The launcher icon configuration uses:

- Foreground image
- Background image/color
- Monochrome image where configured

### Engineering lesson

Changing the general Expo `icon` field does not necessarily replace every platform-specific launcher icon asset.

The actual icon must be configured for the target platform and included in a new binary build.

---

# 6. Performance Testing & Benchmarks

Performance testing was performed to understand backend behavior under simulated traffic rather than relying only on manual testing.

## Load Test Baseline

A load test was run with 10 virtual users over 30 seconds.

| Metric | Recorded result |
|---|---:|
| Virtual users | 10 |
| Test duration | 30 seconds |
| Total requests | 242 |
| Throughput | 5.57 requests/sec |
| p95 latency | 19.7 ms |
| Failure rate | 0.41% |
| Maximum observed latency | 19.25 seconds |

### Interpretation

The test generated a small amount of simulated traffic and provided an initial baseline.

The p95 latency and maximum latency are substantially different, which indicates that the test included a long-tail latency event.

The low p95 should not be interpreted as proof that all requests were fast.

### Important limitations

- Only 10 virtual users were used.
- Test duration was short.
- This was not a large-scale capacity test.
- The maximum latency requires investigation.
- The 0.41% failure rate means the run was not completely error-free.
- Results depend on the environment, hosting conditions, and test configuration.

These measurements should be treated as a baseline, not a claim of production capacity.

---

## Concurrency Test

A simulated reservation test was conducted with 10 concurrent users competing for 3 available items.

| Metric | Result |
|---|---:|
| Concurrent users | 10 |
| Initial inventory | 3 |
| Successful reservations | 3 |
| Rejected reservations | 7 |
| Final inventory | 0 |

### Outcome

The system did not oversell the available inventory during the test.

The result demonstrated that reservation logic correctly handled competing requests for the tested scenario.

### Limitation

This test validates a specific scenario. It does not prove correctness under every possible workload, failure condition, or concurrency level.

---

# 7. Metrics We Care About

Future performance tests should capture:

### API

- Requests per second (RPS)
- Total requests
- Error rate
- Response time

### Latency

- Average
- Median (p50)
- p90
- p95
- p99
- Maximum

### PostgreSQL

- Query execution time
- Query planning time
- Connection pool usage
- Lock waiting
- Transaction duration
- Database load

### Redis

- Cache hit rate
- Cache miss rate
- Redis response time
- Memory usage
- Connection errors

### Docker / Infrastructure

- CPU usage
- Memory usage
- Image size
- Container resource consumption

### Reservation correctness

- Successful reservations
- Rejected reservations
- Remaining inventory
- Duplicate reservations
- Overselling incidents

---

# 8. Known Bottlenecks & Limitations

## 8.1 Database contention

Popular drops can cause many transactions to compete for the same inventory row.

Row locking protects correctness, but lock contention can affect throughput and latency.

Possible future investigation:

- Lock wait time
- Transaction duration
- Reservation query optimization
- Different inventory allocation strategies

---

## 8.2 Cache consistency

Cached inventory can become stale if invalidation is missed or fails.

The database remains authoritative.

Possible future improvements:

- More systematic cache invalidation
- Cache versioning
- Short TTLs where appropriate
- Better monitoring of cache behavior

---

## 8.3 Large result sets

Returning large datasets in one response can cause:

- Database workload
- High memory usage
- Serialization overhead
- Network transfer delays
- API timeouts

Pagination is required for large collections.

---

## 8.4 External service dependencies

FlashDrop relies on:

- Render
- Neon
- Upstash

Failures, latency, service limits, or availability issues in external services can affect the application.

---

## 8.5 Free-tier infrastructure

The deployed infrastructure is intended for a project/demo environment.

It is not a high-availability production architecture.

Potential constraints include:

- Limited CPU
- Limited memory
- Service sleep/cold-start behavior
- Database connection limits
- Redis limits
- Network latency

---

## 8.6 Limited load-testing scale

The recorded test used 10 virtual users for 30 seconds.

It is not sufficient to establish:

- Maximum capacity
- Sustained throughput
- Production traffic readiness
- Behavior under hundreds or thousands of concurrent users

Higher-scale testing should be performed in a controlled environment with resource monitoring.

---

# 9. Deployment Architecture

## Local Development

```text
Developer Machine
│
├── React Native / Expo
│
├── Node.js API
│
└── Docker Compose
    └── Redis
```

PostgreSQL is accessed through Neon.

---

## Production

```text
Android App
    │
    │ HTTPS
    ▼
Render
    │
    ├── Node.js / Express API
    │
    ├──────────────► Neon PostgreSQL
    │
    └──────────────► Upstash Redis
```

### Production environment configuration

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_SECRET` | JWT signing secret |
| `REDIS_URL` | Redis connection |
| `EXPO_PUBLIC_API_URL` | Mobile app API base URL |

Secrets are configured in deployment environments rather than committed to the source repository.

---

# 10. Release & Versioning

## Version 1.0.0

FlashDrop's first release represents the initial deployed and installable mobile application.

### Release process

1. Complete frontend and backend changes.
2. Verify backend deployment.
3. Verify production environment variables.
4. Build Android application through EAS.
5. Install the build on a physical Android device.
6. Test login and core reservation flow.
7. Commit release changes.
8. Create Git tag.
9. Publish GitHub Release.
10. Attach APK.

### Versioning convention

Use semantic versioning:

```text
MAJOR.MINOR.PATCH
```

Examples:

| Version | Meaning |
|---|---|
| `1.0.0` | Initial release |
| `1.0.1` | Backward-compatible bug fixes |
| `1.1.0` | Backward-compatible features |
| `2.0.0` | Major changes that may break compatibility |

---

# 11. Future Engineering Improvements

These are potential future improvements, not features currently claimed to be implemented.

## Backend

- Better structured logging
- Centralized error handling
- API validation
- Monitoring and alerting
- More extensive integration tests
- Automated deployment pipeline
- Better reservation idempotency
- Improved reservation expiration handling
- Transaction failure/retry strategies

## Database

- Query plan analysis
- Index benchmarking
- Connection pool tuning
- Lock contention analysis
- Cursor-based pagination
- Query performance monitoring

## Redis

- Cache hit/miss instrumentation
- TTL tuning
- Cache invalidation reliability
- Redis failure testing
- Rate-limit strategy review

## Load Testing

- Increase virtual users gradually
- Test longer durations
- Run endpoint-specific tests
- Test reservation bursts
- Track p50/p95/p99
- Measure error rates
- Monitor PostgreSQL and Redis
- Compare results before and after optimizations

## Mobile

- Improve release branding
- Add loading/error states where needed
- Improve offline/network handling
- Release management
- App distribution
- Future Play Store publication

---

# 12. Key Engineering Lessons

### Correctness before performance

Inventory reservation must remain correct under concurrency. A fast reservation system that oversells is not acceptable.

### The database is the source of truth

Redis can improve read performance, but it should not determine authoritative inventory state.

### Caching introduces complexity

Caching reduces repeated work, but cache invalidation and stale data must be handled intentionally.

### Pagination is a necessity

Large datasets should not be returned in a single API response.

### Test the system, not just the code

Manual testing verifies functionality. Load testing and concurrency testing help reveal behavior under competing requests and traffic.

### Measure before making performance claims

Benchmarks should include test conditions and be repeatable.

### Deployment is part of software engineering

Environment configuration, containerization, production services, cloud builds, and installation are all part of delivering an application.

### Failures are valuable engineering experience

The most useful problems encountered were not merely coding errors. They involved runtime configuration, environment differences, database behavior, networking, build infrastructure, and deployment.

---

# 13. Project Completion Summary

FlashDrop was developed from a mobile application concept into a deployed Android application connected to a production backend.

The project explored:

- Full-stack mobile application development
- REST API design
- JWT authentication
- Password hashing
- PostgreSQL
- SQL query safety
- Database transactions
- Row-level locking
- Concurrency control
- Inventory consistency
- Redis caching
- Cache invalidation
- Rate limiting
- Docker
- Docker Compose
- Environment configuration
- Cloud deployment
- Load testing
- Android cloud builds
- Physical device testing

The primary engineering focus was building a reservation system that handles limited inventory safely while learning how backend design decisions affect correctness, performance, and deployment.

---

## 14. Final Status

| Component | Status |
|---|---|
| Mobile application | Completed |
| Backend REST API | Deployed |
| Authentication | Implemented |
| PostgreSQL | Connected |
| Redis | Configured |
| Cache-aside strategy | Implemented |
| Cache invalidation | Implemented |
| Rate limiting | Implemented |
| Reservation concurrency control | Implemented |
| Docker backend | Implemented |
| Local Docker Compose | Configured |
| Production backend | Deployed |
| Android cloud build | Completed |
| Emulator testing | Completed |
| Physical Android testing | Completed |
| Version 1.0.0 | Built |

---

> **FlashDrop v1.0.0 — Completed**
>
> Built, deployed, and verified on a physical Android device.
>
> This document records the engineering decisions, problems encountered, solutions implemented, and measurements obtained during development. Benchmark values represent the specific recorded test runs and should not be generalized beyond their test conditions.
