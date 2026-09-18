# Lab 3 API Contract

Authentication uses a JWT signed by the server, delivered in an httpOnly, sameSite=lax cookie
(`token`). No requesterId, ticketOwnerId, or role is ever trusted from the client — every
protected route reads the identity from the verified token via an auth middleware that populates
`req.user = { id, role, isActive }`.

## Status Code Conventions
| Status | Used for |
| --- | --- |
| 200/201 | Success |
| 400 | Validation failure |
| 401 | Not authenticated (missing/invalid/expired token) |
| 403 | Authenticated but not permitted for this role/ownership |
| 404 | Resource doesn't exist, or hidden as if it doesn't (no ownership leaks) |
| 409 | Conflict (duplicate email, invalid status transition, last-admin rule) |
| 500 | Unexpected error, generic safe message only |

## Authentication

### POST /api/auth/login
Body: `{ "email": "...", "password": "..." }`
- 200: sets `token` cookie, body `{ "id":1, "name":"...", "role":"REQUESTER", "mustChangePassword": false }`
- 401: `{ "error": "Invalid email or password." }` — identical message for wrong password AND
  inactive account, so nothing about account existence leaks.

### POST /api/auth/logout
- 200: clears the `token` cookie. Any request with the old cookie afterward gets 401.

### GET /api/auth/me
- 200: same shape as login response, based on the current cookie.
- 401: no cookie / invalid / expired token.

### POST /api/auth/change-password
Body: `{ "currentPassword": "...", "newPassword": "..." }`
- 200: `{ "mustChangePassword": false }`
- 400: new password fails the strength rule, or matches the current password.
- 401: currentPassword doesn't match.

## Lab 2 Regression (Tickets, Attachments, Categories, Related Systems)
Same endpoints and shapes as Lab 2's api-spec.md, with one change: **no `requesterId` query
param/body field is accepted anymore** — the Requester is always `req.user.id`. Any legacy field
sent by an old client is ignored, not trusted.

## IT Staff — Ticket Queue

### GET /api/staff/tickets?search=&status=&itPriority=&owner=mine|unassigned|all&sort=&page=&pageSize=
IT Staff or Administrator only.
- 200: `{ "items": [ { ...ticket, ticketOwner: {id,name} | null } ], "page":1, "pageSize":10, "totalItems":42, "totalPages":5 }`
- 403: caller is a Requester.
- Invalid page/pageSize/sort fall back to defaults instead of erroring.

### PATCH /api/tickets/:id/owner
Body: `{ "ticketOwnerId": 4 }` (or `null` to unassign)
IT Staff/Administrator only; ticketOwnerId must be an active IT Staff/Administrator.
- 200: updated ticket.
- 400: target user isn't an active IT Staff/Administrator.
- 403: caller isn't IT Staff/Administrator.

### PATCH /api/tickets/:id/priority
Body: `{ "itPriority": "HIGH" }` — IT Staff/Administrator only.
- 200: updated ticket. 403 otherwise.

### PATCH /api/tickets/:id/status
Body: `{ "status": "IN_PROGRESS" }` — IT Staff/Administrator only.
- 200: updated ticket.
- 409: transition not permitted from the current status (see tests.md for the matrix).
- 403: caller isn't IT Staff/Administrator.

### POST /api/tickets/:id/indicate-resolved
Requester only, must own the ticket. No body.
- 200: `{ "requesterIndicatedResolved": true }` — currentStatus is unchanged.
- 403: caller isn't the ticket's Requester.

## Public Comments and Internal Notes

### POST /api/tickets/:id/comments
Body: `{ "content": "..." }` — Requester (owner), IT Staff, or Administrator.
- 201: `{ "id":1, "authorId":.., "authorName":"..", "authorRole":"..", "content":"..", "createdAt":".." }`
- 400: empty/whitespace content, or over the length limit.
- 403: Requester who isn't the ticket's owner.

### GET /api/tickets/:id/comments
Same access as above — returns the list, oldest first.

### POST /api/tickets/:id/notes
Body: `{ "content": "..." }` — IT Staff/Administrator only.
- 201: same shape as comments. 403 for Requester (no note content in the response body or error).

### GET /api/tickets/:id/notes
IT Staff/Administrator only. 403 for Requester, with no indication notes exist.

## Administrator — User Management

### GET /api/admin/users?search=&role=
Administrator only.
- 200: `[{ "id":1, "name":"..", "email":"..", "role":"..", "isActive":true }]`
- 403: caller isn't Administrator.

### POST /api/admin/users
Body: `{ "name":"..", "email":"..", "role":"IT_STAFF", "isActive":true, "initialPassword":".." }`
- 201: created user (no password hash returned).
- 409: email already in use.
- 400: invalid role or weak initial password.

### PATCH /api/admin/users/:id
Body: any of `{ "name", "email", "role", "isActive" }`.
- 200: updated user.
- 409: email already in use by another user, or this would deactivate the last active
  Administrator, or an Administrator is trying to deactivate themselves.

### POST /api/admin/users/:id/reset-password
Body: `{ "newInitialPassword": ".." }`
- 200: `{ "mustChangePassword": true }` — user must change it at next login.
- 403: caller isn't Administrator.
