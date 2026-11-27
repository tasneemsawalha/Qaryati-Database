# Data Quality, Provenance and Change History

## 1. Overview

Historical, demographic and geographic information about a village can come
from different references and can change over time. Qaryati therefore treats
data quality as part of the domain, not as an afterthought:

- Important facts must carry their **source**.
- Every write is performed by an **identified user with a role**.
- Every important change is **audited** (who, what, when, before/after).
- Conflicting or incomplete data is **rejected or kept side by side**, never
  silently overwritten.
- Data becomes **VERIFIED** only through an explicit review action.

## 2. Source / Provenance Requirements

| Information | Where it is stored | Source rule |
|---|---|---|
| Historical overview | `Village.historicalOverview` | `historySource` is required when an overview is given |
| Name meaning / origin | `Village.nameOrigin` | `nameOriginSource` is required when an origin is given |
| Alternative / former names | `VillageName.source` | Optional source per name |
| Population | `PopulationRecord.source` | Always required |
| Events, landmarks, heritage, economy, facilities | `KnowledgeEntry.source` | Always required |

The rules for the village record live in `src/common/domain.ts`
(`validateVillage`) so they are independent of HTTP and the database and can be
unit tested.

## 3. Roles and Permissions

New accounts start as `READER`. Only an `ADMIN` can change a user's role
(`PATCH /api/v1/auth/users/{id}/role`), and changing a role revokes that user's
sessions so the new permissions apply immediately. Role changes are audited
(`ROLE_CHANGE`), and an administrator cannot change their own role.

| Action | Anonymous | READER | EDITOR | VERIFIER | ADMIN |
|---|:-:|:-:|:-:|:-:|:-:|
| Read villages, population, entries | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create / update villages, population, entries | | | ✓ | | ✓ |
| Verify villages, population, entries | | | | ✓ | ✓ |
| Read audit history of a village | | | | ✓ | ✓ |
| Delete villages, population, entries | | | | | ✓ |
| Change user roles | | | | | ✓ |

Enforcement is in `AuthGuard` (`src/auth/auth.guard.ts`):

- `GET`/`HEAD` routes are public unless a role is declared.
- Any other method **must** declare `@Roles(...)`; a write without an explicit
  policy is refused with `403` (secure by default).
- Missing/invalid/expired tokens → `401`; valid token with the wrong role → `403`.

Why separate EDITOR and VERIFIER? The person who enters a fact and the person
who confirms it should normally be different, which reduces unreviewed errors.

## 4. Verification Lifecycle

```
create ──► DRAFT ──verify──► VERIFIED
             ▲                   │
             └────── any edit ───┘
```

- New records start as `DRAFT`.
- `POST .../verify` sets `status=VERIFIED`, `verifiedBy` and `verifiedAt`.
- Any later edit returns the record to `DRAFT` and clears `verifiedBy` /
  `verifiedAt`, because verified content has changed.

Verification means "reviewed by a trusted member", not a guarantee of
historical truth.

## 5. Audit Trail

Every create, update, verify and delete writes an `AuditLog` row:

| Field | Meaning |
|---|---|
| `actorId` | The user who made the change |
| `action` | `CREATE`, `UPDATE`, `VERIFY`, `DELETE`, `ROLE_CHANGE` |
| `entity`, `entityId` | Which record changed |
| `villageId` | Village the change belongs to |
| `before`, `after` | JSON snapshots of the record |
| `createdAt` | When the change happened |

The audit row is written with the **same transaction** as the data change
(`src/prisma/audit.ts`), so a change can never be saved without its audit entry
and vice versa. Audit rows are kept after a village is deleted.

History is available at `GET /api/v1/villages/{id}/audit` (VERIFIER/ADMIN,
paginated, newest first).

## 6. Conflicting and Incomplete Data Strategy

| Situation | Strategy |
|---|---|
| Two users edit the same record | Every record has a `version`. Updates must send the version they read; the update is `UPDATE ... WHERE id = ? AND version = ?`. If someone changed it first, the API returns `409 Conflict` and the client must reload and reconcile. Nothing is overwritten silently. |
| Two sources give different population numbers | Both are kept: population is unique per **village + year + source**, so each source keeps its own record. Readers see the disagreement instead of a single "winning" number. |
| Same source and year sent twice | Rejected with `409` (duplicate). |
| Incomplete coordinates (only latitude or only longitude) | Rejected with `400`. |
| A history/name origin without a source | Rejected with `400`. |
| Timeline event without a year | Rejected with `400`. |
| Optional data unknown (elevation, land area, English name) | Stored as `null`, never guessed. |

Alternatives considered: last-write-wins (simple but loses work), pessimistic
locks (do not fit stateless REST), full event sourcing (more complex than this
project needs). See `docs/adr/002-provenance-concurrency.md`.

## 7. Tests

| Test file | What it proves |
|---|---|
| `src/common/data-quality.spec.ts` | Stale versions are rejected, sources are required, edits reset verification, audit snapshots are recorded |
| `src/auth/auth.guard.spec.ts` | Role matrix for create/edit/verify/delete, `401` vs `403`, writes without a policy are denied |
| `src/villages/villages.service.spec.ts` | Update resets verification and audits atomically; concurrent update is not overwritten |
| `test/api.integration-spec.ts` | Real PostgreSQL: conflict rollback, verification, audit history, session revocation |

Run with:

```sh
npm test -- --runInBand
npm run test:integration   # needs a dedicated test database
```
