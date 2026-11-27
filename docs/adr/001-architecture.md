# ADR 001: Retain NestJS modular monolith

Status: accepted.

Context: The supplied repository has a NestJS village module, Prisma and Swagger. A small team must explain architecture and test independently owned concerns.

Decision: Keep controllers -> services -> Prisma, with Auth, Villages, Knowledge and Geocoding modules. Extract cross-domain invariants and provider interfaces; use dependency injection in tests.

Alternatives: Express with manual wiring is leaner but loses existing conventions; microservices support independent deployment but require distributed consistency, network operations and more infrastructure.

Consequences: One deployable unit and simple transactions; Prisma types couple persistence-facing services to the ORM. A repository interface is deferred until there is a second persistence implementation or substantive testability pressure. Domain validation remains pure and testable.
