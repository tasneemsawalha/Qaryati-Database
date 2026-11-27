# Qaryati Frontend

React 19 + Vite + TypeScript user interface for the Qaryati API. Arabic, right-to-left.

> The course evaluates the backend; this UI is an optional addition that uses only the public `/api/v1` endpoints.

## Features

| Page | What it does | API used |
|---|---|---|
| Villages (`/`) | Search (Arabic / English / alternative names), filter by governorate, sort, paginate | `GET /villages` |
| Village details | Identity & names, geography, history with sources | `GET /villages/{id}` |
| Population tab | Population history per year and source; sources that disagree are shown side by side | `/villages/{id}/population` |
| Events / Landmarks / Heritage / Economy / Facilities tabs | Typed knowledge entries; events shown as a timeline | `/villages/{id}/entries?kind=` |
| Change history tab (VERIFIER/ADMIN) | Audit log with before/after snapshots | `GET /villages/{id}/audit` |
| Add / edit village (EDITOR/ADMIN) | Full form incl. aliases, nearby places, and coordinate suggestions from the external geocoding API | `POST/PATCH /villages`, `GET /geocoding` |
| Verify / delete buttons | Shown only to roles allowed to use them; send the record `version` (409 conflicts are explained to the user) | `POST .../verify`, `DELETE ...?version=` |
| Statistics (`/stats`) | Villages per governorate (raw SQL endpoint) | `GET /villages/stats/by-governorate` |
| Login / register | Bearer-token session | `/auth/*` |
| Admin (`/admin`) | Change a user's role | `PATCH /auth/users/{id}/role` |

The UI hides buttons the user's role cannot use, but the backend remains the authority: it enforces every permission itself.

## Run in development

Start the backend first (see the root README, API on http://localhost:3000), then:

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to `http://localhost:3000`
(override with `VITE_API_TARGET`), so no CORS change is needed.

## Run with Docker

From the repository root:

```sh
docker compose up --build -d
```

The UI is served by nginx on http://localhost:8080 and forwards `/api` to the `api` container.

## Structure

```
src/
  api/        client.ts (fetch + error mapping), endpoints.ts, types.ts
  components/ shared UI, population/entries/audit sections
  pages/      one file per route
  auth.tsx    session state and role checks
  labels.ts   Arabic labels for enums
```
