# REST API contract

Base: `/api/v1`. JSON request/response bodies; bearer token for protected routes. OpenAPI is served at `/api-docs` and `/api-docs-json`; the exported `openapi.json` can be imported into API-Dog. Swagger exposes request schemas; this reference defines response contracts and business behavior.

## Routes

| Method / path | Access | Request / response |
|---|---|---|
| POST /auth/register | Public, throttled | `{email,password}` -> 201 `{id,email,role:READER}` |
| POST /auth/login | Public, throttled | Credentials -> 200 `{accessToken,tokenType,expiresAt,user}` |
| GET /auth/me | Any account | 200 `{id,email,role}` |
| POST /auth/logout | Any account | 200 `{loggedOut:true}`; token revoked |
| PATCH /auth/users/{id}/role | ADMIN | `{role}` -> safe user object; revokes user's sessions |
| GET /villages | Public | paginated Village[] with aliases |
| GET /villages/{id} | Public | Village with aliases; 404 if absent |
| GET /villages/stats/by-governorate | Public | `[{governorate,count}]` |
| POST /villages | EDITOR, ADMIN | CreateVillage -> 201 Village |
| PATCH /villages/{id} | EDITOR, ADMIN | Partial fields + version -> 200 Village |
| DELETE /villages/{id}?version=N | ADMIN | 200 `{deleted:true}` |
| POST /villages/{id}/verify | VERIFIER, ADMIN | `{version}` -> 201 verified Village |
| GET /villages/{id}/audit | VERIFIER, ADMIN | paginated AuditLog[]; works after deletion |
| GET /villages/{villageId}/population | Public | paginated PopulationRecord[], year DESC then id ASC |
| POST /villages/{villageId}/population | EDITOR, ADMIN | PopulationDto -> 201 PopulationRecord |
| PATCH /villages/{villageId}/population/{id} | EDITOR, ADMIN | Partial fields + version -> 200 PopulationRecord |
| DELETE /villages/{villageId}/population/{id}?version=N | ADMIN | 200 `{deleted:true}` |
| POST /villages/{villageId}/population/{id}/verify | VERIFIER, ADMIN | `{version}` -> 201 verified record |
| GET /villages/{villageId}/entries | Public | paginated KnowledgeEntry[], optional `kind`, id ASC |
| POST /villages/{villageId}/entries | EDITOR, ADMIN | EntryDto -> 201 KnowledgeEntry |
| PATCH /villages/{villageId}/entries/{id} | EDITOR, ADMIN | Partial fields + version -> 200 KnowledgeEntry |
| DELETE /villages/{villageId}/entries/{id}?version=N | ADMIN | 200 `{deleted:true}` |
| POST /villages/{villageId}/entries/{id}/verify | VERIFIER, ADMIN | `{version}` -> 201 verified entry |
| GET /geocoding?name=... | Public | `{data:Place[],meta:{cached,attribution,notice}}`; 503 if unavailable |
| GET /health | Public | `{status:ok}` |
| GET /health/ready | Public | `{status:ready}` or 503 |

Public reads include DRAFT records; clients must display their status and provenance, not treat all data as verified. A READER account has no mutation privileges. A VERIFIER can verify but cannot edit facts. ADMIN can perform all operations. No self-service privilege escalation or user deletion API exists.

## Shapes

Village has `id`, `arabicName`, optional `englishName`, `governorate`, optional `localCouncil`, `municipalityRelationship`, `nameOrigin`, `nameOriginSource`, `latitude`, `longitude`, `locationDescription`, `nearbyPlaces:[{name,relationship,distanceKm?}]`, `elevationMeters`, `landAreaKm2`, `historicalOverview`, `historySource`, and review fields. Alias: `{id,villageId,value,type,source}`; type is ALTERNATIVE, TRANSLITERATION, FORMER, HISTORICAL. Creating aliases omits id/villageId. PATCH aliases replaces the whole alias collection transactionally; omit it to leave aliases unchanged, send `[]` to clear.

PopulationRecord: `{id,villageId,year,population,source,notes?,...reviewFields}`.

KnowledgeEntry: `{id,villageId,kind,title,description,source,category?,year?,latitude?,longitude?,...reviewFields}`. `kind`: EVENT, LANDMARK, HERITAGE, ECONOMY, FACILITY. Year may be negative for BCE; EVENT requires it.

Review fields: `{version:number,status:DRAFT|VERIFIED,verifiedBy:number|null,verifiedAt:ISO-date|null,createdAt:ISO-date,updatedAt:ISO-date}`. A verification response increments version. Population sources may disagree; callers display both and choose only with an explicit review decision.

AuditLog: `{id,actorId,action,entity,entityId,villageId,before:object|null,after:object|null,createdAt}`. No password or session token appears in audit responses. Place: `{name,latitude,longitude,country?,governorate?}`. Optional database scalars are usually returned as null; external provider optional values may be absent.

Paginated village, population, entry and audit lists: `{data:[],meta:{page,limit,total,totalPages}}`, with 1 <= page <= 1,000,000 and 1 <= limit <= 100 (default 10). Village query: `search`, `governorate`, `localCouncil`, `sortBy=arabicName|englishName|createdAt`, `order=asc|desc`. Audit/population/entry list ordering is fixed as documented above; those endpoints accept only page and limit, plus entry kind. Unknown parameters are rejected.

## Example workflow (synthetic data only)

```json
{"arabicName":"Synthetic village","englishName":"Example Village","governorate":"Test governorate","latitude":32.1,"longitude":35.2,"nearbyPlaces":[{"name":"Synthetic city","relationship":"NEARBY","distanceKm":5}]}
```

Create a village as editor; copy its id and version. Add a population record:

```json
{"year":2020,"population":1200,"source":"Synthetic test fixture — not a historical claim"}
```

Update the village with `{"version":1,"englishName":"Revised Example"}`. A second update with version 1 gets 409; reload and reconcile. Verify using the new version and a VERIFIER token.

## Error model and security

```json
{"error":{"status":409,"code":"HTTP_409","message":"Resource changed; reload and reconcile before retrying","requestId":"uuid","path":"/api/v1/villages/1","timestamp":"ISO-8601"}}
```

`message` may be a string array for validation failures. Statuses: 400 invalid fields/JSON or domain rules; 401 missing/expired token; 403 role denied; 404 missing or wrong-parent resource; 409 duplicate/source conflict, stale write or serialization conflict; 413 body too large; 429 request limit (Retry-After); 500 unexpected failure; 503 external/database unavailable. Unexpected server errors do not expose SQL or stack traces. Never place credentials in query parameters, since framework messages can echo the URL. All responses include `x-request-id`. POST creates return 201 except login/logout (200).

## Authentication flow

1. Register with POST `/api/v1/auth/register` using email and password (12–128 characters). Registration always creates READER; do not send role. Bootstrap the initial administrator using `npm run admin:create` as described in README; there is no public administrator-registration endpoint.
2. POST `/api/v1/auth/login` with the same credentials. Copy `accessToken` from the 200 response. The database password in `.env` is not the account password.
3. In Swagger click **Authorize** and paste only the token. In Postman choose **Bearer Token**. The actual header is `Authorization: Bearer <accessToken>`.
4. Read `expiresAt`. The default lifetime is 3600 seconds (configured by SESSION_TTL_SECONDS). Login again after expiry. Never put passwords or tokens in URLs.
5. POST `/api/v1/auth/logout` revokes the current session. Changing a user's role revokes all that user's sessions; they must log in again.

Public GETs require no token except `/auth/me` (all account roles) and village `/audit` (VERIFIER/ADMIN). EDITOR and ADMIN create/edit village content; VERIFIER and ADMIN verify; only ADMIN deletes or assigns roles. Public reads include DRAFT records.

## Current validation and error examples

Missing login password: POST `/api/v1/auth/login` with `{"email":"admin@example.com"}` returns 400:

```json
{
  "error": {
    "status": 400,
    "code": "HTTP_400",
    "message": ["password is required"],
    "requestId": "00000000-0000-4000-8000-000000000001",
    "path": "/api/v1/auth/login",
    "timestamp": "2026-10-27T00:00:00.000Z"
  }
}
```

Each invalid field receives one useful validation message; multiple invalid fields still produce multiple messages. Missing fields use `field is required`, forbidden fields use `field is not allowed`, and whitespace-only required text uses `field must not be empty or contain only spaces`. Nested errors identify paths such as `aliases.0.type`. Business-rule errors may instead be strings. Error arrays are not guaranteed to have a particular order.

GET `/api/v1/route-that-does-not-exist?name=test` returns 404. Its `error.path` is `/api/v1/route-that-does-not-exist`. The `message` may include the submitted URL, including query parameters: only the path field and structured request-log path omit query parameters. Do not send secrets in URLs.

Request validation rejects unknown fields, malformed JSON, invalid enum values and invalid numeric ranges. A failed write does not increment the record version. The API version `/api/v1` is distinct from the optimistic-locking `version` in each record. Creation requires no version; PATCH and verification accept it in the JSON body; DELETE accepts it in the query string.

## Documentation maintenance and Apidog import

The live Swagger page is `http://127.0.0.1:3000/api-docs`; live JSON is `/api-docs-json`. Descriptions are maintained in `src/common/openapi-descriptions.ts`; response/error schemas in `src/common/openapi.ts`; request fields in the DTO files. Run these from the project folder after changing documentation:

```powershell
npm.cmd run build
npm.cmd run docs:export
```

This regenerates `docs/openapi.json` without connecting to a real database. Import that file as OpenAPI into Apidog if using Apidog for submission. Import and instructor acceptance have not been verified here. Rebuild Docker to update its live documentation; source edits do not update an already-built container:

```powershell
docker compose -p qaryati-updated up --build -d
```

The exported file is a snapshot and must be regenerated after future API changes. All example records and credentials in documentation are illustrative, not production data.
`src/common/openapi-schemas.ts` documents numeric, text and array constraints. After export, run `node scripts/check-openapi.cjs` to check operation descriptions, references and selected schema/authentication contracts. This structural check does not replace runtime API tests.

## Expected response codes

Swagger lists expected application errors per operation, rather than all codes on every endpoint. Public liveness documents 200, 429 and 500; readiness also documents 503. Protected endpoints document authentication/authorization errors as applicable. Network, proxy and malformed transport failures are not exhaustively listed. Error examples illustrate one possible cause, not every message. Health success examples are ok/ready; deleted and loggedOut examples are true.
