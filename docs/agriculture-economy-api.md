# Agriculture, Local Economy and Community Information

## 1. Overview

This module manages agricultural products, crops, traditional crafts, local industries, economic activities and public facilities associated with registered villages.

## 2. Data Model

The module uses the existing KnowledgeEntry model.

| Field | Description |
|---|---|
| villageId | Associated village |
| kind | ECONOMY or FACILITY |
| title | Entry title |
| description | Detailed information |
| category | Entry classification |
| source | Information reference |
| latitude | Optional latitude |
| longitude | Optional longitude |
| version | Version used for concurrency control |
| status | Verification status |

## 3. Agriculture and Local Economy

Economic information is represented using the ECONOMY kind.

Supported examples include:

- Agricultural products
- Agricultural crops
- Traditional crafts
- Local industries
- Local trade and economic activities

## 4. Public Facilities

Community facilities are represented using the FACILITY kind.

Supported examples include:

- Schools
- Health clinics
- Public libraries
- Community centers
- Public parks
- Sports facilities

Categories are descriptive strings rather than a fixed enumeration.

## 5. API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/v1/villages/{villageId}/entries | Create an entry |
| GET | /api/v1/villages/{villageId}/entries | Retrieve entries |
| GET | /api/v1/villages/{villageId}/entries?kind=ECONOMY | Retrieve economic information |
| GET | /api/v1/villages/{villageId}/entries?kind=FACILITY | Retrieve public facilities |
| PATCH | /api/v1/villages/{villageId}/entries/{id} | Update an entry |

Creating and updating entries requires appropriate authorization.

## 6. Validation and Business Rules

- Title, description and source are required.
- Coordinates are optional but must be provided together.
- Latitude must be between -90 and 90.
- Longitude must be between -180 and 180.
- Successful updates increment the entry version.
- Stale versions are rejected with HTTP 409 Conflict.
- Invalid input is rejected with HTTP 400 Bad Request.

## 7. Unit Testing

The following targeted test suites were executed successfully:

| Test Suite | Passed Tests |
|---|---:|
| Agriculture and Local Economy | 7 |
| Public Facilities | 10 |
| Total | 17 |

## 8. Integration Testing Results

Manual integration testing was performed using Swagger UI, PowerShell, Docker and PostgreSQL 17.

| Test Case | Result |
|---|---|
| Create agricultural products | PASS |
| Create agricultural crops | PASS |
| Create traditional crafts | PASS |
| Create local industries | PASS |
| Create local trade information | PASS |
| Create schools | PASS |
| Create clinics | PASS |
| Create libraries | PASS |
| Create community centers | PASS |
| Create public parks | PASS |
| Create sports facilities | PASS |
| Retrieve and filter economic entries | PASS |
| Retrieve and filter public facilities | PASS |
| Store and retrieve facility coordinates | PASS |
| Update agricultural information | PASS |
| Update public facility information | PASS |
| Update source references | PASS |
| Increment version after update | PASS |
| Preserve coordinates after update | PASS |
| Reject stale version with HTTP 409 | PASS |
| Reject incomplete coordinates with HTTP 400 | PASS |
| Reject missing source with HTTP 400 | PASS |
| Reject invalid longitude with HTTP 400 | PASS |

## 9. Version Control Verification

Olive Oil Production and Village School entries were successfully updated.

Both entries increased their version from 1 to 2.

The school retained its original coordinates:

- Latitude: 32.22
- Longitude: 35.26

An update using an outdated version was rejected with HTTP 409 Conflict.

## 10. Testing Environment

- NestJS
- TypeScript
- Prisma
- PostgreSQL 17
- Docker
- Jest
- Swagger UI
- PowerShell

## 11. Limitations and Notes

- Integration tests were performed using the complete local application.
- Shared runtime files still need to be integrated into the repository.
- All sample records were created for testing purposes.
- Duplicate wheat and library entries were observed during manual testing. Duplicate prevention is not currently enforced.
- The module provides community information and does not implement a complaint management system.

## 12. Conclusion

The existing data model and API successfully supported the tested agricultural, economic and community information scenarios.

All 17 targeted unit tests passed, and the documented manual integration scenarios completed with their expected results.