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

