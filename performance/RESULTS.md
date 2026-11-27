# Measured performance report

## Historical native-process measurements: 18–19 October 2026

Windows 10.0.26200, Intel Core i7-1355U, 12 logical processors, 15.65 GiB RAM. Node 24.21.0, PostgreSQL 17.10 (temporary local cluster), k6 2.3.0. PostgreSQL: 128 MB shared buffers, max_connections 100; default pg adapter pooling. API and load generator share the same laptop. This is a local engineering comparison, not a production capacity claim. Docker execution was unavailable, so these numbers are native-process results.

Dataset: 10,000 explicitly synthetic village rows; no factual Palestinian population claims. Search `Synthetic 9999` selects one English-name match. Read: 10 VUs with 100 ms think time. Write: 5 VUs with 200 ms think time, using an authenticated ADMIN session to create, update and clean up a synthetic village per iteration; each iteration includes a detail GET, and its audit history remains. Rate limit raised to 100,000 only on the isolated benchmark instance.

The final matched stages were rerun on 19 October with a fresh authenticated session, after an overnight pause had expired the pilot token. Expired-token runs were invalid performance measurements and are excluded; write setup now validates the token before generating load. Each stage used a separate server start and 3-second read warm-up, then three 10-second runs for each scenario, sequentially. One post-change read run started before the server had finished starting; it was rerun after an explicit successful readiness check and is not treated as steady-state performance evidence. No unit/type-check suite was running during these final measurements. Both stages used VACUUM ANALYZE before the measured sequence. Baseline latency-threshold outcomes are recorded in the raw summaries and are distinct from HTTP failures. The table reports the median of the three per-run metrics (not pooled p95). Raw summaries and all individual runs are in `results/` and `comparison.json`.

| Scenario | Avg ms | p95 ms | Requests/s | HTTP error rate |
|---|---:|---:|---:|---:|
| Read before | 141.35 | 188.37 | 41.08 | 0.00% |
| Read after | 18.76 | 33.36 | 83.12 | 0.00% |
| Write before | 11.49 | 29.84 | 79.77 | 0.00% |
| Write after | 13.27 | 33.99 | 77.95 | 0.00% |


Read p95 decreased by approximately **82.3%** in these final runs. Throughput includes think time and is not a saturation benchmark. Inspect write metrics too: the additional indexes cost maintenance work, and a faster read path does not guarantee faster writes.

## Observed bottleneck and investigation

The original ORM query combines Arabic-name ILIKE, English-name ILIKE and an alias EXISTS with OR. Its captured plan reads nearly the whole village relation for a single match: the first plan's name index scan discards 9,999 rows, and the count must evaluate the predicate again. B-tree indexes help ordering but do not accelerate a leading-wildcard substring predicate.

Adding GIN trigram indexes alone did not solve the OR/EXISTS access pattern: the pilot plan still spent about 14.5 ms on its village lookup, similar to the initial 14.7 ms sample. These pilot plan timings were diagnostic samples, not the aggregate table. After table statistics were refreshed, repeated baseline load exposed still worse latency, which is why the final matched stages both use refreshed statistics. See the saved query plans; do not compare a single plan timing to an HTTP p95.

## Applied optimization

The search service now computes candidate IDs with a parameterized SQL UNION of the three searchable fields, allowing each selective branch to use its GIN index. It applies governorate/council filters, stable sorting and LIMIT/OFFSET inside PostgreSQL. Only at most one page of IDs is returned to the application; Prisma hydrates the corresponding records and aliases. The count and page execute in one REPEATABLE READ transaction.

Migration `20261018010000_search_trigram_indexes` installs pg_trgm and the three matching indexes. The Prisma schema declares those indexes too. Search values are bound parameters; SQL sort columns/direction come only from hard-coded alternatives, and `%`, `_`, and backslash are escaped for literal substring search. Alias matching, filters and injection-like terms are tested against PostgreSQL.

## Limits and trade-offs

- This is a selective synthetic workload on one shared laptop with short runs. The dataset has no large alias distribution. Broad/very short searches may still scan much of the data; test them on a representative real dataset before capacity commitments.
- More indexes consume disk and add insert/update/delete overhead. The search path adds bounded hydration queries; the selective-query benefit need not generalize to every search.
- Audit rows accumulate during write tests, though village row count returns to 10,000. Windows scheduling, caches and background applications cause variation. Treat medians as measured observations, not guaranteed service levels.
- Docker resource constraints, multiple app replicas, sustained-duration tests and provider-outage load tests were not measured here.
- The initial pilot results differed from the final refreshed-statistics runs. Only the three final runs per stage feed the table; this distinction is intentional and documented.

## Docker reproduction reviewed 29 October 2026

After the baseline compatibility and preflight updates on 27 October, the user executed the isolated Docker trials; all twelve exported summaries were subsequently inspected from disk. Historical native summaries and plans were preserved and are not mixed with the new measurements.

### Setup and method

Separate Compose projects qaryati-perf-before and qaryati-perf-after use independent PostgreSQL volumes. BEFORE was stopped before AFTER was started; both expose the test API on host port 3100. The normal application uses port 3000. Both stages were built from the same Node 24 bookworm image digest reported in the build logs (Node 24.22.0); PostgreSQL uses image postgres:17 (the exact benchmark server patch version was not captured). k6 is 2.3.0, pinned by digest in docker-compose.benchmark.yml. Docker Desktop reported 12 CPUs available and 7.4 GB memory; no per-service resource limits are configured. Background host activity was not instrumented.

Each fresh database received 10,000 synthetic villages, followed by VACUUM ANALYZE and a successful readiness check. Read workload: search Synthetic 9999, 10 VUs, 100 ms think time. Write workload: fresh stage-specific ADMIN session, 5 VUs, 200 ms think time, create/PATCH/detail GET/DELETE per iteration. Each workload had a 3-second warm-up excluded from the results, followed by three 10-second measured runs. Reads preceded writes in both stages. API_RATE_LIMIT=100000 and AUTH_RATE_LIMIT=100 are benchmark-only settings. The user confirmed 10,000 villages after each complete write sequence; audit rows intentionally remain.

BEFORE substitutes the archived ORM service and excludes the search-trigram migration only inside its disposable image. AFTER uses the current optimized service and all four migrations. The historical query-plan investigation above motivated this implementation; no new EXPLAIN measurements are claimed for Docker.

### Results

Each table cell is the median of three per-run metrics, not a pooled percentile. Full per-run values and filenames are in docker-comparison.json, calculated from results/docker-{read,write}-{before,after}-{1,2,3}.json.

| Scenario | Avg ms | p95 ms | HTTP requests/s | HTTP error rate |
|---|---:|---:|---:|---:|
| Read before | 79.26 | 114.13 | 55.01 | 0.00% |
| Read after | 19.55 | 39.24 | 82.32 | 0.00% |
| Write before | 19.27 | 39.80 | 71.68 | 0.00% |
| Write after | 15.72 | 33.26 | 74.91 | 0.00% |

All twelve summaries report zero failed checks and zero failed HTTP requests. Read mean latency decreased about 75.3%, read p95 decreased 65.6%, and read request throughput increased 49.6%. The matched write workload showed no observed regression in these runs. Its modest improvement must not be attributed conclusively to the search optimization: host scheduling, cache state and short trial duration can affect results, and index maintenance still has a write cost.

HTTP throughput and duration include setup probes and, for writes, cleanup GET/DELETE requests; they are not counts or latency measurements of successful mutations alone. Read setup contributes two requests and write setup one. Ten-second tests with fixed VUs and think time demonstrate a bounded comparison, not sustained load capacity, saturation, production readiness or statistical significance. Broad searches, large alias distributions and multiple replicas remain outside this measurement.
