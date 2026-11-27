# ADR 005: Indexed UNION candidate search

Status: accepted after measurement.

Context: Captured plans showed that the original OR/EXISTS substring search discarded 9,999 village rows to find one result in a 10,000-row synthetic dataset. Adding trigram indexes alone left the access pattern inefficient.

Decision: Use three parameterized UNION branches with GIN trigram indexes, then perform stable sorting/pagination in PostgreSQL and hydrate only the bounded page with Prisma. Keep count/page in REPEATABLE READ. Preserve the original service for benchmark reproduction.

Alternatives: Caching village results introduces stale facts and invalidation; loading all matching IDs into application memory is unbounded; a separate search engine is disproportionate to the scope.

Consequences: Selective-search p95 improved in the recorded runs; indexes consume storage and add write maintenance. More hydration queries and broad/short searches can offset gains. This is an evidence-backed workload optimization, not a claim that every query is faster. See performance/RESULTS.md and its raw runs.
