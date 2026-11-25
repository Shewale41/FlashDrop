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
