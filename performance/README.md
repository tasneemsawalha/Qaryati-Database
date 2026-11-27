# Reproduce the performance comparison

Actual measurements, environment, bottleneck and limitations are in [RESULTS.md](RESULTS.md). Raw k6 summaries and query plans are in `results/`.

## Completed Docker evidence

The Docker reproduction reviewed on 29 October is recorded in RESULTS.md. Twelve raw summaries use the distinct docker-read/write-before/after-1/2/3.json names in results/. docker-comparison.json preserves their per-run metrics and medians. Keep these files unchanged; use a new run label for future trials. Historical native-process results remain separate. No application source change was needed to record this reproduction.

## Isolated Docker benchmark setup

`docker-compose.benchmark.yml` is separate from the application Compose file. It uses a project-scoped database volume named benchmark_data, no host database port, and host API port 3100 by default. Its test-only password and elevated limits must not be used for deployment. k6 is pinned to the digest of the user's confirmed v2.3.0 image.

First create the BEFORE stage from the project root:

```powershell
$env:BENCHMARK_STAGE = 'before'
$env:BENCHMARK_PORT = '3100'
docker compose -p qaryati-perf-before -f docker-compose.benchmark.yml up --build -d
docker compose -p qaryati-perf-before -f docker-compose.benchmark.yml ps -a
```

The benchmark Dockerfile copies source into its own image, substitutes the baseline service only for BEFORE, and omits only the fourth search-index migration in that image. It does not edit host source files. AFTER uses the optimized service and all four migrations. Never switch stages on an existing stage database; use qaryati-perf-after with BENCHMARK_STAGE=after and a separate project volume. Stop BEFORE before measuring AFTER so the idle instance does not consume competing resources. Use the same host port 3100 sequentially if desired.

Startup does not seed data or launch load. Next steps are readiness verification, seeding the empty database using `exec api node performance/seed.cjs`, and bootstrapping an administrator inside this benchmark instance. Never reuse the working application's token. Refresh statistics after seeding using VACUUM ANALYZE and warm up before each matched stage. Record actual execution evidence before changing RESULTS.md.

The optional k6 service runs only with `docker compose ... run --rm k6 ...`; the normal up command starts no load test. It reaches this project's API by its private service name. Pass TOKEN privately with `-e TOKEN` for write runs, override VUS to 5 for writes, and give every summary file a new dated filename under /results. Do not overwrite historical measurements.


## Alternative: native-process setup

For this alternative only, install k6 and run the API locally. Set `BENCHMARK_ONLY=true` before either load script. Use a disposable database named `qaryati_benchmark`, never real village data. Configure DATABASE_URL; migrate/build; run `node performance/seed.cjs` once for 10,000 clearly synthetic villages. Create an ADMIN account and obtain a token. Set `BASE_URL` to the test API, `TOKEN` to its token, `SEARCH=Synthetic 9999`, `VUS=10`, `DURATION=10s`. Raise API_RATE_LIMIT to 100000 only for this isolated load test and restart the API.

### Native before / after

Use separate working copies and disposable database instances for a clean reproduction. `baseline/villages.service.ts.txt` preserves the pre-optimization service: copy it over `src/villages/villages.service.ts` in the **baseline working copy**, rebuild, and apply only the first three migrations to its empty database. The final working copy uses all four migrations and the optimized service. Use identical synthetic datasets, configuration and machine resources. Do not drop indexes or roll back migrations on a real database.

Warm the API first. Run three matching sequential read/write trials, recording separate files:

```sh
k6 run --summary-export read-before-1.json performance/read.js
k6 run --vus 5 --summary-export write-before-1.json performance/write.js
# Repeat 2 and 3, then on the optimized instance use after filenames.
node performance/compare.cjs read-before-1.json read-after-1.json
node performance/compare.cjs write-before-1.json write-after-1.json
```

Do not run compilation, unit tests or other benchmarks concurrently with the measurements. Capture actual generated SQL and `EXPLAIN (ANALYZE, BUFFERS)` for lookup/count. The provided `candidate-index.sql` records the index-only experiment that motivated changing the query shape; the selected change is now part of the real fourth migration.

The read threshold is p95 < 500 ms; the write threshold is p95 < 1000 ms; HTTP error rate must stay below 1%. Baseline latency failures are valid measurement evidence: record their nonzero exit code and continue the comparison. Failures must not be relabeled as successes. Report average, p95, requests/second and error rate, plus root cause, chosen optimization, before/after and write overhead.

Load tests deliberately create/update/delete synthetic records and leave audits in the disposable database. Tokens belong in environment variables, not committed result files. For external deployment, repeat with longer runs, representative aliases/data, broad searches and realistic resource constraints.

## Shared preflight and measurement rules

The baseline imports now point to the extracted audit and JSON helpers. Its original ORM OR/EXISTS search is preserved. This is a compatibility repair, not a new search optimization. Verify it without replacing the live source:

```powershell
node performance/check-baseline.cjs
```

For native execution, k6 is a separate executable, not an npm script; confirm `k6 version` before running. The Docker workflow uses the bundled k6 service and does not require a host k6 installation. Completed Docker measurements are documented above.

Both scripts now require explicit `BASE_URL` and `BENCHMARK_ONLY=true`. The flag is an operator acknowledgement, not proof of database isolation. Verify the target API's DATABASE_URL points to the dedicated disposable `qaryati_benchmark` database. Do not use the working application on port 3000. The seed script refuses any other database name and refuses to append to a nonempty village table. It never clears data automatically.

Example settings AFTER provisioning an isolated instance on port 3100 (these commands do not create that instance):

```powershell
$env:BENCHMARK_ONLY = 'true'
$env:BASE_URL = 'http://127.0.0.1:3100/api/v1'
$env:SEARCH = 'Synthetic 9999'
$env:VUS = '10'
$env:DURATION = '10s'
k6 run --summary-export read-before-1.json performance/read.js
# Set TOKEN privately to a fresh administrator token for THIS benchmark instance.
k6 run --vus 5 --summary-export write-before-1.json performance/write.js
```

Read setup now checks readiness and verifies that the synthetic search has results. Write setup verifies the ADMIN session; failed cleanup lookups are included in check failures. Never count an empty database, failed setup, expired token, or unsuccessful cleanup as a valid before/after comparison. Short 10-second runs reproduce the historical method; use longer matching trials to assess sustained behavior.

Run the same revised scripts for BOTH stages. Their setup probes can contribute requests to aggregate k6 summaries, so do not mix new summaries with the old archived measurements. Save new results with new dated filenames. Preserve the existing report and raw evidence; write a new dated section only after genuine matched executions. Document configured rate limits, warm-up, VUs, duration, database state, Node/PostgreSQL/k6 versions, and whether execution is native or Docker.

After each write trial, inspect checks and confirm the village count has returned to the seeded 10,000. Audit records intentionally accumulate. For a database recreated from scratch, reseed only after migrations complete. Cleanup must target only the disposable benchmark resources.
