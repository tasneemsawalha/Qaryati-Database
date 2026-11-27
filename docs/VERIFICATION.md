# Verification evidence and outstanding work

Updated: 27 November 2026. Evidence below distinguishes historical checks, user-provided execution results and current limitations. Test fixtures are synthetic and are not verified village facts.

## Latest user-confirmed runtime evidence

- On 27 October, the user ran `npm.cmd test -- --runInBand`: 9 suites, 49 tests passed. This includes HTTP tests with mocked persistence; it is not the real PostgreSQL integration suite.
- The user provided successful Docker builds and Compose startup results: PostgreSQL healthy, migration job completed, API started. Readiness returned `status: ready`.
- Manual Postman/Swagger checks covered authentication, roles, session revocation, village CRUD, source requirements, invalid values, version conflicts, population histories, entry kinds, pagination, search, sorting, audit access and persistence across restart.
- The user confirmed creation 201, update 200 and deletion 200. Reading the deleted temporary village returned 404.
- Geocoding returned fresh and cached results with provider attribution. Earlier isolated outage checks returned 503 while village reads continued working.
- After the request-path fix and rebuild, the user confirmed a 404 error.path retaining `/api/v1` and omitting query parameters. The framework message can still include the submitted URL.

These observations apply to the code tested at those points, not automatically to every subsequent change. Documentation-only changes after the last runtime check require rebuilding Docker to appear on its live Swagger page.

## Historical implementation checks (18–19 October)

The initial verification report records production build/type checking, Prisma validation, four migrations on dedicated PostgreSQL 17.10 databases, 38 unit/HTTP tests, and one real database integration scenario. That scenario exercised persistence, duplicate-alias rollback, competing versions, wrong-parent isolation, searches, cascade deletion and retained audit history. It was not rerun as part of the latest documentation editing task.

Performance evidence remains in ../performance/RESULTS.md: selective search on 10,000 synthetic villages had median-run p95 measurements of 188.37 ms before optimization and 33.36 ms after optimization (three runs per stage). Refer to that report for setup and limitations; these are shared local-machine results, not production guarantees.

## Recent maintenance

- Clearer validation messages and removal of duplicate name-length decorators.
- Removed unused Hello World service.
- Provider-owned geocoding attribution, including cached responses.
- Separated audit persistence from shared domain rules without moving it outside the caller's transaction.
- Separated geocoding controller and DTO from module wiring.
- Consistent original request paths, excluding queries, in error.path and structured request logs.
- Updated endpoint descriptions, response schemas and exported OpenAPI documentation. `scripts/check-openapi.cjs` checks structural references and selected documentation contracts; it does not execute the endpoints.

## Open items and limits

- Dependency audit previously reported 16 vulnerabilities (2 low, 2 moderate, 11 high, 1 critical). Remediation was explicitly deferred; do not claim these are fixed. Re-run the audit before remediation because dependency advisories can change.
- Hosted GitHub CI, external deployment and Apidog import have not been verified here. Swagger acceptance as the agreed alternative must be confirmed with the instructor.
- Authentic team Git history, branches, reviews and contributions must come from actual team work.
- The previously distributed ZIP is stale after recent changes. Prepare and inspect a new archive before delivery, excluding .env, credentials, node_modules and generated build artifacts.
- Passing automated and manual checks demonstrates covered behavior, not the absence of all defects. Not every manual check was repeated after every later refactor.

## Documentation inventory

API.md and openapi.json document the API. TESTING.md explains reproducible checks. ARCHITECTURE.md, SECURITY.md and adr/ explain design and trade-offs. This file records evidence and limitations. The old conversational review was removed because its useful verification information is consolidated here and its stale checklist duplicated these documents.

## Docker performance evidence reviewed 29 October

All twelve user-generated Docker summaries (three trials per stage for read and authenticated write workloads) were inspected. Every run has zero HTTP failures and zero failed checks. Median per-run read p95 decreased from 114.13 ms to 39.24 ms; write p95 was 39.80 ms before and 33.26 ms after. The user confirmed 10,000 villages after each write sequence. See ../performance/RESULTS.md and ../performance/docker-comparison.json for measurements, historical bottleneck evidence, methodology and limitations. This completes the measured scenarios and report for the bounded performance exercise; it does not resolve the dependency audit or other open delivery checks above.

## Shared infrastructure verification — 27 November 2026

- Prisma Client 7.10.0 generated successfully.
- Local NestJS production build completed successfully.
- All 10 unit and HTTP test suites passed (52/52 tests).
- Docker image built successfully.
- All four database migrations applied successfully.
- Real PostgreSQL 17.12 integration test passed (1/1).
- Automated Docker test process exited with code 0.
- Duplicate-record constraints were exercised successfully.
- PostgreSQL client deprecation warning remains.
- Historical performance measurements were not rerun.
- Dependency security review and final branch integration remain pending.

## Dependency security review — 27 November 2026

- Applied npm audit fix without force.
- Total reported vulnerabilities reduced from 35 to 26.
- Critical vulnerabilities reduced from 1 to 0.
- Production dependency findings reduced from 10 to 3.
- Remaining production findings involve the Prisma/effect dependency chain.
- Breaking dependency downgrades were deferred.
- Prisma Client 7.10.1 generated successfully.
- Local production build passed.
- Docker clean dependency installation and build passed.
- All four database migrations applied successfully.
- All 52 unit and HTTP tests passed locally and inside Docker.
- Real PostgreSQL integration test passed (1/1).
- Docker automated testing exited with code 0.
- Remaining dependency vulnerabilities and PostgreSQL deprecation warnings require future review.