# ADR 002: Source-specific population facts and optimistic concurrency

Status: accepted.

Context: References may disagree and editors may modify the same record. A single population field or unconditional UPDATE loses evidence.

Decision: Separate population records with unique village/year/source. Require sources for historical facts. Use integer versions for compare-and-swap updates and explicit verification. Editing invalidates verification. Record before/after and actor within the write transaction; keep audit data after deletion.

Alternatives: Last-write-wins is simpler but loses changes; event sourcing preserves every domain event but adds reconstruction/versioning complexity; pessimistic locks over a user's editing session do not fit REST.

Consequences: Clients must include versions and handle 409. Conflicts remain visible and require human judgment; verification is a recorded review action, not a claim of external factual correctness.
