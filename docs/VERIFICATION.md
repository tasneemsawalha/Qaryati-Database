# Verification Evidence and Outstanding Work

**Updated:** 27 November 2026

This document summarizes the project's implementation verification, runtime testing, security improvements, performance evaluation, and remaining delivery considerations.

Test fixtures are synthetic and are not verified village facts.

## Latest User-Confirmed Runtime Evidence

- On 27 October, `npm.cmd test -- --runInBand` completed successfully: 9 test suites and 49 tests passed. These included HTTP tests with mocked persistence.
- Docker builds and Compose startup were verified successfully, with PostgreSQL healthy, database migrations completed, and the API started.
- Application readiness checks returned `status: ready`.
- Manual Postman and Swagger testing covered:
  - Authentication and authorization.
  - User roles and session revocation.
  - Village CRUD operations.
  - Source and reference requirements.
  - Invalid input validation.
  - Version conflicts.
  - Population history.
  - Knowledge entry types.
  - Pagination, searching, and sorting.
  - Audit access.
  - Data persistence across restarts.
- Village creation returned HTTP 201, updates returned HTTP 200, and deletion returned HTTP 200.
- Reading a deleted temporary village returned HTTP 404.
- Geocoding integration successfully returned fresh and cached results with provider attribution.
- External-provider outage handling was tested, returning HTTP 503 while normal village reads remained operational.
- Request-path handling was verified after rebuilding the application. Structured error paths retained `/api/v1` and excluded query parameters.

These results document the behavior tested at the time of execution. Subsequent code changes should be verified against the latest application version.

## Historical Implementation Checks — 18–19 October 2026

Initial verification included:

- Successful production build and TypeScript checking.
- Prisma schema validation.
- Application of four database migrations using PostgreSQL 17.10.
- Successful execution of 38 unit and HTTP tests.
- Successful execution of a real database integration scenario.

Database integration testing covered:

- Data persistence.
- Duplicate-alias transaction rollback.
- Concurrent version handling.
- Wrong-parent record isolation.
- Village searching.
- Cascade deletion.
- Retention of audit history.

The integration scenario was independently verified during the initial implementation phase. More recent PostgreSQL integration verification was completed on 27 November 2026.

### Performance Evidence

Performance results are documented in `performance/RESULTS.md`.

Selective search testing used 10,000 synthetic village records.

Median-run p95 latency:

| Measurement | Before Optimization | After Optimization |
|---|---|---|
| Search p95 latency | 188.37 ms | 33.36 ms |

Three test runs were conducted per stage.

These measurements demonstrate the observed performance improvement in the documented local testing environment and do not represent production performance guarantees.

## Recent Maintenance and Improvements

The following improvements were implemented:

- Improved request validation messages.
- Removed duplicate name-length validation decorators.
- Removed the unused Hello World service.
- Improved geocoding provider attribution for fresh and cached responses.
- Separated audit persistence from shared domain rules while maintaining transaction consistency.
- Separated geocoding controller and DTO responsibilities from module wiring.
- Standardized original request-path handling in structured errors and request logs.
- Excluded query parameters from structured request paths.
- Improved API endpoint descriptions and response schemas.
- Updated exported OpenAPI documentation.
- Implemented structural API documentation validation through `scripts/check-openapi.cjs`.

The OpenAPI validation script verifies structural references and selected documentation contracts. Runtime endpoint behavior is verified separately through automated and manual testing.

## Open Items and Limits

- Dependency security auditing and remediation activities were performed on 27 November 2026. Available non-breaking fixes were applied, and the application was successfully rebuilt and tested. 
- Hosted deployment and Apidog import require confirmation where applicable. Swagger documentation is available as an API documentation solution, subject to instructor acceptance.
- Git branches, Pull Requests, reviews, and contributions should reflect actual team development activity.
- The final submission archive should be generated from the latest integrated project version.
- Sensitive configuration files, credentials, `node_modules`, and generated build artifacts must be excluded from the submission archive.
- Automated and manual testing provide evidence for the tested functionality, but do not guarantee the absence of all software defects.
- Final verification should be performed after the last application changes and branch integration.

## Documentation Inventory

The project includes the following documentation:

| File | Purpose |
|---|---|
| `docs/API.md` | REST API documentation |
| `docs/openapi.json` | Exported OpenAPI specification |
| `docs/TESTING.md` | Testing procedures and reproducible checks |
| `docs/ARCHITECTURE.md` | System architecture and component responsibilities |
| `docs/SECURITY.md` | Security architecture and considerations |
| `docs/adr/` | Architecture Decision Records |
| `docs/VERIFICATION.md` | Verification evidence and limitations |
| `performance/RESULTS.md` | Performance evaluation and optimization evidence |

These documents describe both implementation details and the engineering decisions supporting the system design.

## Docker Performance Evidence — Reviewed 29 October 2026

Twelve Docker performance summaries were reviewed.

Testing included:

- Three trials per stage.
- Read-heavy workloads.
- Authenticated write workloads.
- Before-and-after optimization measurements.

All recorded runs completed with:

- Zero HTTP failures.
- Zero failed checks.
- Verification of 10,000 village records after each write sequence.

### Performance Results

| Metric | Before Optimization | After Optimization |
|---|---|---|
| Read p95 latency | 114.13 ms | 39.24 ms |
| Write p95 latency | 39.80 ms | 33.26 ms |

The performance optimization produced a substantial improvement in read latency and a smaller improvement in authenticated write latency.

Supporting reports and measurements are available in:

- `performance/RESULTS.md`
- `performance/docker-comparison.json`

These results complete the documented performance evaluation scenarios and provide evidence of optimization effectiveness.

Dependency security improvements were addressed separately during the November security review, while other delivery checks remain subject to final verification.

## Shared Infrastructure Verification — 27 November 2026

The following checks were completed successfully:

- Prisma Client 7.10.0 generated successfully.
- Local NestJS production build completed successfully.
- All 10 unit and HTTP test suites passed.
- **52 out of 52 tests passed.**
- Docker image built successfully.
- All four database migrations applied successfully.
- Real PostgreSQL 17.12 integration test passed (1/1).
- Automated Docker testing process exited successfully with code 0.
- Duplicate-record database constraints were tested successfully.
- Dependency security review and available remediation steps were completed.

### Verification Notes

- A PostgreSQL client deprecation warning remains.
- Historical performance measurements were not rerun during this verification.
- Final branch integration should be checked against the latest `main` branch.

## Dependency Security Review — 27 November 2026

### Security Improvements

The following dependency security activities were performed:

- Conducted a dependency security audit using `npm audit`.
- Applied available security fixes and updated project dependencies.
- Updated the dependency lockfile.
- Successfully regenerated Prisma Client.
- Verified that the application builds successfully after dependency updates.
- Completed unit and integration testing.
- Verified Docker image building and database migrations.
- Confirmed successful application execution following the dependency updates.

### Security Verification Status

Dependency security improvements have been implemented and validated through the project's build and testing procedures.

The completed remediation activities improved the dependency security posture while preserving application functionality and compatibility.


## Final Verification Summary

The project has demonstrated successful implementation and verification of its core backend functionality, including:

- RESTful API functionality.
- Authentication and authorization.
- Village identity and administrative information.
- Geographic information management.
- Historical population records.
- Heritage, history, and community information.
- External geocoding integration.
- Database persistence and migrations.
- Input validation and error handling.
- Audit logging and change history.
- Automated unit and integration testing.
- Docker-based application execution.
- API documentation.
- Performance measurement and optimization.
- Dependency security improvements.

The latest documented testing results include **52 passing unit and HTTP tests**, successful PostgreSQL integration testing, and successful Docker build and execution checks.

The project is prepared for final integration review and submission validation. Final acceptance remains subject to successful verification of the submitted version and confirmation of the remaining delivery requirements.
