# Running and testing Qaryati

This guide uses synthetic data. Passing tests is evidence for covered behavior, not proof that every possible defect is absent.

## 1. Start the application

Use Docker Desktop with Linux containers. Open PowerShell in the project directory. On first setup only, copy `.env.example` to `.env`; do not overwrite an existing configured file. Set a strong POSTGRES_PASSWORD. If running Node outside Docker, keep the password in DATABASE_URL consistent (URL-encode special characters).

```powershell
Copy-Item .env.example .env
docker compose -p qaryati-updated up --build -d
docker compose -p qaryati-updated ps
```

The database should be healthy and the API running. The migration job exits after success; exit code 0 is normal. If port 3000 is occupied, configure PORT and use that port in requests.

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health/ready
docker compose -p qaryati-updated logs --tail=100 api migrate postgres
```

Expected statuses are `ok` and `ready`. Open http://127.0.0.1:3000/api-docs for Swagger.

## 2. Automated tests

For local development, use the Node version required in package.json. On initial dependency setup:

```powershell
npm.cmd ci
npm.cmd run prisma:generate
npm.cmd run build
npm.cmd test -- --runInBand
```

The last user-confirmed full run on 27 October 2026 passed 49 tests in 9 suites. Counts can change as tests are added. Any failing test or nonzero exit code requires investigation. VM Modules warnings alone are not failures.

Run the real database integration scenario only against a dedicated disposable test database. The separate Compose project builds the test image, applies migrations, and runs unit/HTTP and database integration tests:

```powershell
docker compose -p qaryati-check -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from tests
$LASTEXITCODE
docker compose -p qaryati-check -f docker-compose.test.yml down
```

Expected exit code: 0. The integration suite exercises persistence, authorization, concurrent versions, duplicate conflicts, rollback, deletion and audit history. Do not point it at your working database. Do not run `down -v` on your application database unless you intentionally want to erase its volume.

For unit/HTTP tests in an already rebuilt application container:

```powershell
docker compose -p qaryati-updated exec api npm test -- --runInBand
```

## 3. Bootstrap the administrator

Run once with your own credentials; the script refuses to overwrite an existing account:

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$adminPassword = Read-Host "Choose a password, 12 to 128 characters" -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $adminPassword).Password
docker compose -p qaryati-updated exec -e ADMIN_EMAIL -e ADMIN_PASSWORD api npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
```

POST `/api/v1/auth/login` with email/password. Use the returned accessToken in Swagger Authorize (token only), or Postman Bearer Token. This account password is different from the PostgreSQL password. Never share credentials or session tokens.

## 4. Exercise the API

All paths below start with `/api/v1`. Record IDs returned by your own requests instead of assuming fixed IDs. Public reads include DRAFT records.

1. POST `/villages` with an EDITOR or ADMIN token:

```json
{"arabicName":"Synthetic village","englishName":"Test Village","governorate":"Test governorate"}
```

Expect 201 and version 1. The `arabicName` value above is a synthetic validation fixture, not real Arabic village data.

2. GET `/villages/{id}`: expect 200. GET `/villages?search=Test&page=1&limit=10`: inspect data and pagination metadata.
3. PATCH `/villages/{id}` with `{"version":1,"englishName":"Updated Test Village"}`: expect 200 and version 2. Repeat version 1: expect 409. Reload and reconcile before another write.
4. POST `/villages/{id}/population`:

```json
{"year":2020,"population":1200,"source":"Synthetic source, not a factual census"}
```

Expect 201. Repeating the village/year/source combination returns 409. A different source may coexist. Negative population returns 400. GET the collection to inspect population history.

5. POST `/villages/{id}/entries`:

```json
{"kind":"LANDMARK","title":"Test landmark","description":"Synthetic description","source":"Synthetic reference"}
```

Expect 201. EVENT without year returns 400; a valid past year allows creation. Filter the collection with `?kind=LANDMARK`.
6. With a VERIFIER or ADMIN token, POST `/villages/{id}/verify` using the current version. Expect 201, VERIFIED and an incremented version. Subsequent edits reset verification to DRAFT.
7. GET `/villages/{id}/audit` as VERIFIER or ADMIN: inspect actorId, actions, timestamps and before/after snapshots.
8. DELETE only a disposable test village with an ADMIN token and `?version=<current-version>`. Expect 200 and `deleted:true`; reading it afterwards returns 404. Audit history survives deletion.

## 5. Negative cases and resilience

| Case | Expected result |
|---|---|
| Protected write without bearer token | 401 |
| READER attempts to create a village | 403 |
| EDITOR attempts verification or deletion | 403 |
| VERIFIER attempts an edit | 403 |
| Supply latitude without longitude | 400 |
| Supply limit=1000 or page=0 | 400 |
| Supply unknown field status in village creation | 400 |
| Send an outdated version | 409 |
| Read an absent village | 404 |
| Log out and reuse the token on auth/me | 401 |
| Login body omits password | 400, password is required |
| Malformed JSON | 400 with structured error |
| Unknown URL | 404; error.path includes /api/v1 and excludes the query |

GET `/geocoding?name=Nablus` returns suggestions and provider attribution. Repeating it within cache lifetime returns cached:true. Results are suggestions, not verified facts. If the provider fails, expect a structured 503 while ordinary village reads continue to work. Unit tests cover retry rules, invalid coordinates, caching and request deduplication. Do not load-test the external provider.

## 6. Documentation and performance

```powershell
npm.cmd run build
npm.cmd run docs:export
node scripts/check-openapi.cjs
```

Rebuild Docker after changes to update its Swagger page. Read API.md for authentication, contracts and error examples. Import docs/openapi.json into Apidog if required by the course.

Run performance experiments only on separate synthetic databases; see ../performance/README.md and ../performance/RESULTS.md. Local measurements do not demonstrate production scalability. Real source verification, team Git contributions and hosted CI evidence remain separate submission responsibilities.
