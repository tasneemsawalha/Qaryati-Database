# Application Requirements and Technology Stack

This document explains which backend technology Qaryati uses, why it was
chosen, and where each mandatory application requirement is implemented.

## 1. Selected Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (Node.js 24) |
| Framework | NestJS 12 |
| Database | PostgreSQL 17 (relational) |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver |
| Validation | `class-validator` / `class-transformer` DTOs |
| API documentation | OpenAPI (Swagger UI at `/api-docs`, exported to `docs/openapi.json`) |
| Tests | Jest, Supertest, real PostgreSQL integration test |
| Load testing | k6 (`performance/`) |
| Containers | Docker, Docker Compose |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

Allowed options were Spring Boot, Node.js (Express or NestJS) and Django REST
Framework / FastAPI. We chose **Node.js with NestJS**.

## 2. Justification

| Quality | Why NestJS + TypeScript + PostgreSQL + Prisma |
|---|---|
| **Maintainability** | NestJS modules (`auth`, `villages`, `knowledge`, `geocoding`, `prisma`) give clear boundaries. Controllers, services and DTOs follow one convention, so every team member's feature looks the same. TypeScript types catch mistakes at compile time, and Prisma generates types from `schema.prisma`, so a schema change breaks the build instead of failing at runtime. |
| **Security** | Global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted` blocks mass assignment. Guards centralise authentication and role checks. Prisma and tagged `Prisma.sql` templates parameterise every query, preventing SQL injection. Passwords use `scrypt` with a per-user salt; tokens are random and only their SHA-256 hash is stored. |
| **Testability** | Dependency injection lets tests replace `PrismaService` and the geocoding provider with mocks. Domain rules (`src/common/domain.ts`) are plain functions with no framework or database dependency. A separate integration suite runs against real PostgreSQL. |
| **Scalability** | The API is stateless (sessions live in the database), so several API containers can run behind a load balancer. PostgreSQL provides transactions, indexes (B-tree and trigram GIN) and mature tooling for growth. |
| **Development efficiency** | The supplied starter already used NestJS, Prisma and Swagger, so keeping them avoided a rewrite. NestJS generates OpenAPI documentation from decorators, and the whole team shares one language (TypeScript). |

Alternatives:

- **Express only** – lighter, but we would have to build DI, validation and
  module structure ourselves.
- **Spring Boot** – strong, but the team and starter code were TypeScript; a
  rewrite would cost time with no benefit for this scope.
- **Django REST / FastAPI** – good productivity, but again a different language
  from the existing code.
- **Microservices** – rejected: distributed transactions and deployment work
  are not justified for this project size (see `docs/adr/001-architecture.md`).

## 3. Mandatory Requirements and Where They Are Met

### 3.1 Relational database

PostgreSQL holds all data. Relations and constraints are defined in
`prisma/schema.prisma` and applied through versioned migrations in
`prisma/migrations/`:

- Foreign keys with `ON DELETE CASCADE` from aliases, population and entries to
  `Village`.
- Unique constraints, e.g. `PopulationRecord(villageId, year, source)` and
  `VillageName(villageId, value, type)`.
- Indexes for filtering/sorting and trigram GIN indexes for name search.

### 3.2 ORM usage and native/raw SQL

Most data access uses the Prisma ORM (type-safe CRUD, relations, transactions).
Selected cases use raw SQL deliberately, always parameterised with tagged
`Prisma.sql` templates:

| Case | File | Why raw SQL |
|---|---|---|
| Village name search across Arabic name, English name and aliases | `src/villages/villages.service.ts` (`search`) | A `UNION` of `ILIKE` queries lets PostgreSQL use each trigram GIN index. The ORM's `OR`/relation filter produced a near full scan (measured in `performance/RESULTS.md`). |
| Village count per governorate | `src/villages/villages.service.ts` (`countByGovernorate`) → `GET /api/v1/villages/stats/by-governorate` | A `GROUP BY` aggregate is clearer and cheaper as SQL. |
| Database readiness check | `src/app.controller.ts` → `GET /api/v1/health/ready` | `SELECT 1` is the simplest connectivity probe. |
| Trigram extension and GIN indexes | `prisma/migrations/20261018010000_search_trigram_indexes` | `CREATE EXTENSION pg_trgm` is a database-level operation written as SQL in the migration. |

### 3.3 Versioned RESTful API

`setupApp` (`src/common/setup.ts`) applies the global prefix `api/v1`, so every
endpoint is under `/api/v1/...`. A future breaking change would be released as
`/api/v2` while `/api/v1` keeps working. Resources are nouns
(`/villages`, `/villages/{id}/population`, `/villages/{id}/entries`) and the
HTTP methods carry the action (`GET`, `POST`, `PATCH`, `DELETE`). Details are in
`docs/API.md`.

### 3.4 Authentication and authorization

- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`,
  `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- Login returns a random bearer token; the database stores only its hash and an
  expiry (`SESSION_TTL_SECONDS`).
- Roles: `READER`, `EDITOR`, `VERIFIER`, `ADMIN`, enforced by `AuthGuard` with
  `@Roles(...)`. Writes without a declared policy are denied.
- Separate, stricter rate limit for login/register.

See `docs/SECURITY.md`, `docs/adr/003-authentication.md` and
`docs/data-quality-provenance.md` for the permission matrix.

### 3.5 Docker

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build; the runtime image runs as the non-root `node` user. |
| `docker-compose.yml` | `postgres` (health-checked) → `migrate` (runs migrations once) → `api` (starts only after migrations succeed, has its own health check). |
| `docker-compose.test.yml` | Unit + integration tests against a disposable database. |
| `docker-compose.benchmark.yml` | Environment for the k6 load tests. |

Start everything with:

```sh
cp .env.example .env      # then set POSTGRES_PASSWORD
docker compose up --build -d
```

The API is on http://localhost:3000, Swagger UI on
http://localhost:3000/api-docs.

### 3.6 Configuration

All configuration comes from environment variables, validated at startup by
`src/common/config.ts`. Invalid values (non-PostgreSQL URL, out-of-range port,
rate limits or timeouts) stop the application immediately instead of running
with hidden defaults. `.env` is git-ignored; `.env.example` documents every
variable without real secrets. Tests for this are in
`src/common/config.spec.ts`.
