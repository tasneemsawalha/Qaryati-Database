# ADR 004: Geocoding is advisory and replaceable

Status: accepted.

## Decision

Open-Meteo/GeoNames sits behind the GeocodingProvider interface and is injected using NestJS Dependency Injection.

The application limits new uncached requests, deduplicates in-flight requests and caches successful results for 24 hours with a maximum of 500 entries.

Outgoing provider attempts are separated by at least one second. Transient failures are retried once. HTTP 429 responses activate a cooldown based on the Retry-After header, with a minimum one-second delay.

Malformed JSON and invalid response structures are rejected without retrying.

Provider failures return controlled HTTP 503 errors.

## Why

Human-reviewed identity and historical geography must not be silently replaced by third-party matches.

Geographic provider coverage can be incomplete; results include attribution and remain suggestions.

Provider abstraction improves replaceability, maintainability and testability.

## Trade-offs

Process-local cache and rate control suit a single application instance. Distributed deployments require shared state.

Retries and request-slot waiting increase overall request latency beyond the individual fetch timeout.

No immediate retry on HTTP 429 avoids amplifying provider rate pressure.

## Verification

The geocoding test suite passed all 30 unit tests, including 21 additional tests covering retry behaviour, response validation and caching.

Live provider verification and simulated outage testing passed. The full project automated test run passed all 103 tests.

## References

- https://open-meteo.com/en/docs/geocoding-api
- `docs/external-api-integration.md`