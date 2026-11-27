# History, Heritage and Landmarks

## 1. Overview

This module manages historical and cultural information
associated with Palestinian villages.

It supports:

- Historical overviews
- Historical events and timelines
- Heritage and archaeological sites
- Traditional buildings and religious sites
- Cultural traditions and practices
- Historical sources and references

## 2. Data Model

Historical overviews are stored in the Village model
using historicalOverview and historySource.

Other historical and cultural information is stored
in the KnowledgeEntry model.

Supported entry types:

- EVENT
- LANDMARK
- HERITAGE

## 3. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/v1/villages/:villageId/entries | List entries |
| POST | /api/v1/villages/:villageId/entries | Create entry |
| PATCH | /api/v1/villages/:villageId/entries/:id | Update entry |
| DELETE | /api/v1/villages/:villageId/entries/:id | Delete entry |
| POST | /api/v1/villages/:villageId/entries/:id/verify | Verify entry |

## 4. Request Examples

The following examples use illustrative test data.

### Historical Event

```json
{
  "kind": "EVENT",
  "title": "Historical event",
  "description": "Documented historical event",
  "year": 1948,
  "source": "Historical archive"
}
```

### Landmark

```json
{
  "kind": "LANDMARK",
  "title": "Traditional building",
  "description": "Historical village building",
  "category": "Traditional Architecture",
  "source": "Heritage reference"
}
```

### Cultural Heritage

```json
{
  "kind": "HERITAGE",
  "title": "Traditional embroidery",
  "description": "Traditional cultural practice",
  "category": "Traditional Crafts",
  "source": "Cultural heritage reference"
}
```

## 5. Historical Timeline

GET /api/v1/villages/1/entries?kind=EVENT&page=1&limit=10

Historical events are ordered chronologically by year.
The entry ID is used as a secondary sorting field.

## 6. Validation Rules

- Title and description must not be empty.
- Source information is required for entries.
- Historical events require a year.
- Future years are rejected.
- Coordinates must be provided together.
- Latitude must be between -90 and 90.
- Longitude must be between -180 and 180.
- Updates require a valid version.

## 7. Authorization

- EDITOR and ADMIN can create and update entries.
- ADMIN can delete entries.
- VERIFIER and ADMIN can verify entries.

## 8. Testing

The following unit test suites were executed successfully:

| Test Suite | Passed Tests |
|---|---:|
| History and Heritage Validation | 6 |
| Historical Timeline | 2 |
| Business Rules | 4 |
| Total | 12 |

## 9. Integration Testing Results

Manual integration tests were performed using Swagger UI,
PowerShell, Docker and PostgreSQL 17.

| Test Case | Result |
|---|---|
| Database readiness | PASS |
| Create historical overview | PASS |
| Retrieve historical overview | PASS |
| Create historical events | PASS |
| Chronological event ordering | PASS |
| Create and retrieve landmarks | PASS |
| Create and retrieve cultural heritage | PASS |
| Update historical event | PASS |
| Update historical source | PASS |
| Version increment after update | PASS |

Historical events were inserted in the order 1967 and 1920.
The API returned them chronologically: 1920 and 1967.

Updating a historical event successfully changed its
description and source, incremented its version from
1 to 2, and preserved its original year.

All 12 targeted unit tests passed.

Integration testing was performed using the complete
local application.