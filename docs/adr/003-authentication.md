# ADR 003: Revocable opaque bearer sessions

Status: accepted.

Context: Authentication and distinct author/reviewer/admin permissions are mandatory; immediate revocation is useful for role changes.

Decision: Scrypt passwords, random opaque tokens with only hashes stored, short expiry and explicit logout. Register only READER; bootstrap ADMIN via a deliberate CLI. Roles are checked against current database state.

Alternatives: JWTs avoid a session lookup but need a revocation design and careful key management; external OAuth introduces an additional service and setup requirements.

Consequences: Each protected request incurs an indexed database lookup. Session data can be cleaned up by expiry; current login cleans up expired sessions for that user. The system has no refresh tokens; users log in again after expiry. A periodic expired-session cleanup job is appropriate at larger scale.
