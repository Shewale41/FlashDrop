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