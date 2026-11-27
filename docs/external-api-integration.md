# Part 6 — External API Integration

## 1. Overview

Qaryati integrates the Open-Meteo Geocoding API to provide geographical suggestions when searching for Palestinian villages and localities.

External results are advisory and must be verified before being saved as authoritative village information.

## 2. External API

- Provider: Open-Meteo / GeoNames.
- Method: HTTP GET.
- External endpoint: `https://geocoding-api.open-meteo.com/v1/search`
- Application endpoint: `GET /api/v1/geocoding?name=Nablus`
- Response format: JSON.
- Maximum requested results: 10.

## 3. Architecture

The external provider is isolated behind the `GeocodingProvider` interface.

```text
Client
  |
GeocodingController
  |
GeocodingService
  |
GeocodingProvider Interface
  |
OpenMeteoProvider
  |
External API
```

NestJS Dependency Injection binds the interface through the `GEOCODING_PROVIDER` injection token.

This design allows replacing the external provider without modifying the controller or the main service.

## 4. Timeout Handling

Each outgoing request uses `AbortSignal.timeout()`.

- Default timeout: 2500 milliseconds.
- Configuration variable: `GEOCODING_TIMEOUT_MS`.
- Valid configuration range: 1–10000 milliseconds.

The timeout applies to individual fetch attempts rather than the complete operation, which may include waiting and retrying.

## 5. Retry Policy

A maximum of two attempts is permitted for transient failures.

| Failure | Behaviour |
|---|---|
| Network failure | Retry once |
| Timeout | Retry once |
| HTTP 5xx | Retry once |
| HTTP 429 | No immediate retry |
| Permanent HTTP 4xx | No retry |
| Malformed JSON | No retry |
| Invalid response structure | No retry |

After unsuccessful attempts, the provider returns a controlled HTTP 503 error.

## 6. Rate Limiting

The application implements a conservative local rate-control policy.

- New uncached searches are limited to one per second.
- Outgoing provider attempts are separated by at least one second, including retries.
- Concurrent identical searches share the same pending request.
- HTTP 429 responses do not trigger an immediate retry.
- The `Retry-After` header is interpreted as seconds or an HTTP date.
- When the header is absent or invalid, a minimum one-second cooldown applies.

This is an application-defined rate-control policy, not a guarantee of compliance with every external provider quota.

## 7. Caching Strategy

Successful search results are cached in memory.

| Property | Value |
|---|---|
| Cache type | In-memory Map |
| TTL | 24 hours |
| Maximum entries | 500 |
| Cache key | Trimmed, lowercase search term |
| Eviction policy | Oldest inserted entry |
| Failed requests | Not cached |
| Successful empty results | Cached |

Expired entries are removed when accessed before fresh data is requested.

## 8. Response Validation

External responses are validated before being returned to the client.

Validation covers:

- Malformed JSON.
- Invalid response structure.
- Invalid results arrays.
- Null result entries.
- Empty or whitespace-only place names.
- Non-numeric coordinates.
- Latitude outside the valid range.
- Longitude outside the valid range.

Optional country and governorate information is mapped to the application response model.

## 9. Failure Isolation

External provider failures are handled within the geocoding integration.

The provider maps unavailable responses to controlled HTTP 503 errors. Geocoding suggestions are not required for normal village database operations.

The architectural goal is to prevent external provider failures from making unrelated village APIs unavailable.

## 10. Testing

Verification date: November 27, 2026.

Test file: `src/geocoding/geocoding.service.spec.ts`

| Test category | Passed |
|---|---:|
| Original provider and resilience tests | 9 |
| Retry and rate-limit tests | 4 |
| Response validation tests | 12 |
| Cache and resilience tests | 5 |
| Total | 30 |

Build result: Successful.

Unit test result: 30 passed, 0 failed.

Tests use mocked external responses and simulated time where appropriate. Live external API verification and simulated outage testing were completed successfully, as documented in Section 14.

## 11. Improvements

The integration was enhanced through three commits:

- `146abab`: Improved retry policy and provider rate limiting.
- `7892e75`: Improved response validation and malformed JSON handling.
- `adb8be5`: Improved cache expiration and added cache resilience tests.

A total of 21 additional unit tests were introduced.

## 12. Limitations and Future Improvements

- Cache and rate-limit state are local to a single application instance.
- Restarting the application clears cached results and cooldown state.
- Distributed deployments would require shared caching and rate-limit coordination.
- External geographical coverage and accuracy may vary.
- Waiting for request slots and retries can increase overall latency.
- External results require human verification.

## 13. References

- Open-Meteo Geocoding API: https://open-meteo.com/en/docs/geocoding-api
- Existing project architecture decision: `docs/adr/004-external-api.md`

## 14. Final Verification Results

Verification date: November 27, 2026.

### Live External API Testing

The updated application was successfully built and deployed in an isolated Docker environment.

| Test | Observed result | Status |
|---|---|---|
| Nablus search | HTTP 200, cached: false | Passed |
| Repeated Nablus search | HTTP 200, cached: true | Passed |
| Jenin search | HTTP 200, geographic suggestions returned | Passed |
| Swagger input validation | Invalid input rejected | Passed |
| Backend input validation | HTTP 400 | Passed |
| Unknown locality search | HTTP 200, empty results | Passed |

### External Provider Outage Simulation

A temporary Docker container was configured to resolve the external provider hostname to localhost, simulating provider unavailability.

| Test | Observed result |
|---|---|
| Initial readiness check | HTTP 200 |
| Geocoding during simulated outage | HTTP 503 |
| Village listing during simulated outage | HTTP 200 |
| Readiness after provider failure | HTTP 200 |

The application remained operational, and database-backed village listing remained available during the simulated external provider failure.

### Full Project Automated Testing

- PostgreSQL version: 17.12.
- Prisma Client version: 7.10.1.
- Database migrations: 4 successfully applied.
- Unit and HTTP tests: 102 passed.
- PostgreSQL integration tests: 1 passed.
- Total automated tests: 103 passed, 0 failed.
- Total test suites: 16 passed.
- Process exit code: 0.

### Conclusion

The tested implementation satisfies the external API integration requirements, including timeout handling, bounded retries, local rate control, caching, response validation, provider abstraction and failure isolation.

The cache and rate-control state remain process-local. The outage test was simulated, and passing tests provide evidence for covered scenarios rather than a guarantee of defect-free operation. PostgreSQL client deprecation warnings remain for future maintenance.