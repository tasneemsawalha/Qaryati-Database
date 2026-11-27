# ADR 004: Geocoding is advisory and replaceable

Status: accepted.

Decision: Open-Meteo/GeoNames sits behind GeocodingProvider. The application limits request starts, deduplicates in-flight requests, caches successful results for 24h and retries once only for transient failures. Provider failures return 503 without taking down the village APIs.

Why: Human-reviewed identity and historical geography must not be silently replaced by third-party matches. Geographic provider coverage can be incomplete; results include attribution and remain suggestions.

Trade-offs: Process-local cache/rate control suits one instance; distributed deployments require shared state. Retry increases worst-case request latency to roughly twice the per-attempt deadline plus backoff. No retry on 429 avoids amplifying provider rate pressure.

Reference: https://open-meteo.com/en/docs/geocoding-api
