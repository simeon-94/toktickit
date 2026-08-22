# Lab 2 API Contract

All endpoints assume a `requesterId` is known (sent as a header `X-Requester-Id` or query param,
decided during implementation) since there's no real auth session yet. Any endpoint touching a
specific ticket/attachment must check ownership before returning data.

## GET /api/dev-requesters
Returns active Development Requesters for the selector dropdown.
- 200: `[{ "id": 1, "name": "Jennifer Anderson", "email": "..." }, ...]`
- Only `isActive: true` rows are included.

## GET /api/categories
Same as Lab 1 — returns the 4 seeded categories.

## GET /api/related-systems
Returns active Related Systems.
- 200: `[{ "id": 1, "name": "Corporate Laptop" }, ...]`

## POST /api/tickets
Creates a ticket for the current Requester.
- Request body:
```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 5,
  "summary": "Laptop battery drains quickly",
  "description": "Started after last update...",
  "requestedPriority": "MEDIUM"
}
```
- 201: `{ "id": 10, "ticketNumber": "TKT-2026-000010", "currentStatus": "New", ... }`
- 400: validation error, body like `{ "errors": { "summary": "required, 3-150 chars" } }`
- 500: safe generic error, no stack trace leaked

## GET /api/tickets?search=&category=&priority=&status=&sort=&page=&pageSize=
Returns the current Requester's own tickets, paginated.
- 200:
```json
{
  "items": [ { "id": 10, "ticketNumber": "TKT-2026-000010", "summary": "...", "currentStatus": "New", ... } ],
  "page": 1,
  "pageSize": 10,
  "totalItems": 42,
  "totalPages": 5
}
```
- Invalid `page`/`pageSize` values fall back to defaults (page=1, pageSize=10) rather than
  erroring.
- Only returns tickets where `requesterId` matches the current Requester — never another one's.

## GET /api/tickets/:id
Returns one ticket if it belongs to the current Requester.
- 200: full ticket object including category/relatedSystem names.
- 403 or 404 (decided during implementation, documented once picked) if the ticket belongs to
  someone else or doesn't exist. Either way, no data about the ticket is leaked.

## POST /api/tickets/:id/attachments
Uploads a file to a ticket the current Requester owns.
- multipart/form-data, one file field.
- 201: `{ "id": 3, "fileName": "screenshot.png", "sizeBytes": 204800, "uploadedAt": "..." }`
- 400: wrong file type or over 5MB, message says which rule failed.
- 403/404: ticket not owned / not found.
- 409 (or 400): ticket already has 5 active attachments.

## GET /api/tickets/:id/attachments
Lists attachment metadata (including removed ones, marked as such) for an owned ticket.
- 200: `[{ "id": 3, "fileName": "screenshot.png", "isRemoved": false, ... }, ...]`

## GET /api/attachments/:id/download
Downloads the actual file, only if active and owned.
- 200: file stream.
- 403/404: not owned, or removed (removed attachments are never downloadable, even by the
  owner).

## DELETE /api/attachments/:id
Soft-removes an attachment (sets isRemoved=true, removedAt=now), only if owned and currently
active.
- 200: `{ "id": 3, "isRemoved": true, "removedAt": "..." }`
- 403/404: not owned / not found.
- 409: already removed.

## HTTP Status Summary

| Status | Used for |
| --- | --- |
| 200 | Successful GET/DELETE |
| 201 | Ticket or attachment created |
| 400 | Validation failure (bad input, bad file type/size) |
| 403 | Trying to access something that isn't yours |
| 404 | Resource doesn't exist (or hidden as if it doesn't, to avoid leaking ownership info) |
| 409 | Conflict (already removed, attachment limit reached) |
| 500 | Unexpected server error, generic safe message only |
