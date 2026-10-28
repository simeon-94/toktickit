# Lab 4 Sprint Engineering Specification

## 1. Sprint Goal
Complete the core TokTickIT service-desk workflow: IT Staff and Administrators record Actions
Taken under each Ticket, the Ticket lifecycle is enforced by the backend (transition matrix,
resolution gate, stale-update protection), Requesters and IT Staff get concise role-based
dashboards, and the whole application from Labs 1-3 is hardened for final demonstration.

## 2. Stakeholder Request Interpretation
The desk can receive Tickets and talk to Requesters, but cannot yet track the real work. Each
Ticket gets a list of Actions Taken (what was done, by whom, with what result, whether follow-up
is needed). The Ticket Owner still coordinates, but any IT Staff member may perform an action.
A Requester's "looks resolved" signal stays advisory; staff formally resolve. Dashboards are
short summaries that link into the existing detailed screens. Everything earlier must still work.

## 3. Scope
**Included:** Actions Taken (model, API, UI, seed); full Ticket status-transition matrix and
resolution gate enforced server-side; optimistic-concurrency (`version`) for workflow changes;
Requester dashboard; IT Staff dashboard (Administrator = same + user counts); drill-down links;
additive Prisma migration; idempotent seed; final regression, accessibility, responsive and
error-handling polish; README refresh.

**Excluded (per handout 4.2):** SLA clocks/escalation, notifications (email/SMS/LINE/push),
inventory/spare parts/costing, time-sheets/billing, multi-level approvals/e-signatures, BI/custom
reports/exports, multi-tenancy, and any feature not listed here. Also excluded by decision:
Requester-initiated cancel/reopen, a status-history table, deletion of Actions Taken.

## 4. Functional Requirements
- FR-01: IT Staff/Administrator can create an Action Taken on an accessible, non-terminal Ticket.
- FR-02: Any IT Staff/Administrator may edit, complete or cancel a PLANNED Action Taken.
- FR-03: A PLANNED action can be completed (a Result is then mandatory).
- FR-04: A PLANNED action can be cancelled.
- FR-05: Ticket Detail lists Actions Taken in stable order; staff see create/edit controls,
  Requesters see all actions of their own Ticket read-only.
- FR-06: An action has an assignee (active IT Staff/Administrator), defaulting to the creator.
- FR-07: Ticket status changes follow the transition matrix (BR-12), enforced by the backend.
- FR-08: Moving a Ticket to RESOLVED passes the resolution gate (BR-13).
- FR-09: Stale updates to a Ticket workflow field or an action are rejected with 409.
- FR-10: Requester dashboard summarises only the authenticated Requester's Tickets.
- FR-11: IT Staff dashboard summarises operational data; Administrator also sees user counts.
- FR-12: Every dashboard card/list item links to a filtered list or Ticket Detail whose total
  equals the card value.
- FR-13: Seed data is idempotent and demonstrates all statuses, priorities, 0/1/many actions,
  and non-zero and zero dashboard metrics.
- FR-14: Hardening: duplicate-submit protection, preserved form data on recoverable failures,
  consistent loading/empty/error/forbidden/conflict/not-found feedback, no console errors,
  no placeholder text, current README.

## 5. Business Rules
Lab 3 rules BR-01..BR-17 (authentication, ownership, comments/notes, admin protections) remain in
force unless superseded by CHG items in section 11. Lab 4 rules use the prefix **L4-BR**; the
handout's example IDs BR-01 and BR-02 are L4-BR-01 and L4-BR-02.

- L4-BR-01: An Action Taken belongs to exactly one Ticket.
- L4-BR-02: The Ticket Owner coordinates the Ticket, but an Action Taken may be performed by a
  different IT Staff member or Administrator.
- L4-BR-03: `performedBy` is the authenticated user, set by the server; client-supplied values are ignored.
- L4-BR-04: `assignee` must be an active IT Staff/Administrator; default = creator. Inactive or
  non-staff assignee -> 400. If an assignee is later deactivated, existing actions stay unchanged.
- L4-BR-05: `description` is required, 3-1000 characters (trimmed). `result` max 1000.
  `attachmentNotes` optional, max 500. `actionAt` required, defaults to now.
- L4-BR-06: If `followUpRequired` is true, `followUpNote` is required (3-500 chars); if false,
  `followUpNote` is stored as null.
- L4-BR-07: Action status lifecycle: PLANNED -> COMPLETED or PLANNED -> CANCELLED. COMPLETED and
  CANCELLED are terminal and read-only (HTTP 422 `ACTION_LOCKED` on edit).
- L4-BR-08: Completing an action requires a non-empty `result`.
- L4-BR-09: Actions Taken are never deleted (append-only history). No DELETE endpoint exists.
- L4-BR-10: Requesters can read all Actions Taken of their own Tickets (any status) but cannot
  create, edit, complete or cancel. Another Requester's Ticket returns 404.
- L4-BR-11: Actions cannot be created on a CLOSED or CANCELLED Ticket (422 `TICKET_TERMINAL`).
- L4-BR-12: Permitted status transitions (staff/admin only; anything else -> 422 `INVALID_TRANSITION`):

  | From | Allowed To |
  | --- | --- |
  | NEW | OPEN, CANCELLED |
  | OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
  | IN_PROGRESS | OPEN, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
  | WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
  | RESOLVED | CLOSED, REOPENED |
  | CLOSED | REOPENED |
  | REOPENED | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
  | CANCELLED | (none - terminal) |

  Same-status "transitions" are rejected. Requesters cannot change status at all (403).
- L4-BR-13: Resolution gate: a Ticket may enter RESOLVED only if (a) it has a Ticket Owner,
  (b) it has at least one COMPLETED action, and (c) it has no PLANNED action. Otherwise 422
  `RESOLUTION_GATE` with a `reasons` array. Legacy Tickets already RESOLVED/CLOSED are not re-checked.
- L4-BR-14: `requesterIndicatedResolved` is advisory only; it never changes `currentStatus`.
  Moving to REOPENED resets it to false.
- L4-BR-15: Stale-update protection: Ticket and ActionTaken have an integer `version`
  (starts at 1, +1 per successful change). Status changes and action edit/complete/cancel
  require `expectedVersion`; mismatch -> 409 `STALE_UPDATE` and nothing is written. Owner and
  priority changes check it only when supplied, and always bump the Ticket version.
- L4-BR-16: Action ordering is `actionAt` descending, then `id` descending (stable).
- L4-BR-17: Create is idempotent per `clientRequestId` (optional UUID from the client): a repeat
  returns the existing action with 200 instead of creating a duplicate.
- L4-BR-18: "Open Ticket" = status in NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED.
- L4-BR-19: Dashboards are computed by the backend from the database. "Recent" = within the last
  7 x 24 hours (rolling window, `updatedAt`); display time zone is Asia/Bangkok (UTC+7); stored
  timestamps are UTC. Lists are capped at 5 items. Exact metric definitions are in api-spec.md.
- L4-BR-20: Requester dashboard data is derived only from the authenticated user's Tickets; the
  Requester dashboard endpoint is forbidden (403) for staff, and the staff dashboard is
  forbidden for Requesters.
- L4-BR-21: Each dashboard count equals the `total` of its drill-down list for the same filter.
- L4-BR-22: Creating/updating an action also touches the parent Ticket's `updatedAt`.

## 6. UI Specification Summary
Zen Green theme, existing components and conventions. New: Dashboard nav item per role (active
page indicated), IT Staff Dashboard, Requester Dashboard, Actions Taken panel on Staff Ticket
Detail (list + create + view/edit modes; read-only list on Requester Ticket Detail), status
control showing only permitted transitions with resolution-gate feedback, conflict (409) banner
with "Reload" action. Full detail in ui-spec.md.

## 7. Data Changes
- **ActionTaken** (new): id, ticketId (FK Ticket, indexed), actionAt, description, result (nullable),
  status enum ActionStatus (PLANNED | COMPLETED | CANCELLED), performedById (FK User),
  assigneeId (FK User), followUpRequired (bool, default false), followUpNote (nullable),
  attachmentNotes (nullable), clientRequestId (nullable, unique), version (int, default 1),
  createdAt, updatedAt. Indexes: (ticketId, actionAt), (assigneeId, status), (status).
- **Ticket** (additive): `version Int @default(1)`. New index (currentStatus, updatedAt) for dashboards.
- **Migration** `lab4_actions_taken`: additive only (new enum, new table, new column with default).
  Existing Users, Tickets, Attachments, Comments and Notes are untouched.
- **Backfill**: Tickets get `version = 1` through the column default. Legacy Tickets have 0
  Actions Taken, which renders as an empty state and counts as 0 in action metrics. The
  resolution gate applies only to new transitions into RESOLVED.
- **Rollback/recovery**: `docs/lab-04/rollback.sql` drops ActionTaken, the enum and `Ticket.version`;
  verified on a scratch database (test MIG-02). Before migrating a real database, take `pg_dump`.
- **Seed** (idempotent, upsert by unique keys such as ticketNumber/email/clientRequestId): users per
  role incl. one inactive staff user; Tickets in all 8 statuses and 3 priorities, assigned and
  unassigned; Tickets with 0, 1 and several actions (PLANNED/COMPLETED/CANCELLED, with and without
  follow-up); data that gives non-zero metrics plus one Requester with zero Tickets (zero state).
- **Design decision 1 - integer `version` rather than comparing `updatedAt`:** `updatedAt` has
  millisecond resolution, is also changed by unrelated writes (e.g. comments, touch from actions)
  and is awkward to round-trip; an explicit integer is exact, cheap, and testable.
- **Design decision 2 - separate ActionTaken table (1-to-many) with a PLANNED/COMPLETED/CANCELLED
  enum rather than JSON on Ticket or hard delete:** gives referential integrity, indexed dashboard
  queries ("my planned actions", follow-ups), append-only history, and per-action concurrency control.
- **Design decision 3 - rolling 7-day window instead of calendar-day boundaries:** removes
  time-zone/DST ambiguity from backend metrics while the UI still displays Asia/Bangkok time.

## 8. API Contract (summary - full contract in api-spec.md)
- `GET/POST /api/tickets/:id/actions`, `PATCH /api/tickets/:id/actions/:actionId`,
  `POST .../complete`, `POST .../cancel`
- `PATCH /api/tickets/:id/status` (matrix + gate + `expectedVersion`)
- `GET /api/dashboard/requester`, `GET /api/staff/dashboard`
- `GET /api/staff/tickets` gains `ownerId=me` and `statusGroup=open`; `GET /api/tickets` gains `statusGroup=open`
- Ticket detail responses now include `version`.
- Errors: `{ error, code, fields? }` with 400/401/403/404/409/422.

## 9. Acceptance Criteria
- AC-01: Given a permitted IT Staff user and valid data, when an Action Taken is created, then it is saved under the correct Ticket with the authenticated creator as performer and the approved assignee.
- AC-02: Given a Requester, when they try to create/edit/complete/cancel an action, then 403; when they open their own Ticket they can list all its actions; another Requester's Ticket returns 404.
- AC-03: Given invalid input (short description, follow-up required without note, over-length fields), when creating/editing, then 400 with per-field errors and nothing is saved.
- AC-04: Given an inactive or non-staff assignee, when creating/editing, then 400.
- AC-05: Given a PLANNED action, when edited by permitted staff, then it is updated; given COMPLETED/CANCELLED, then 422 `ACTION_LOCKED`.
- AC-06: Given a PLANNED action, when completed with a result it becomes COMPLETED; without a result 400; when cancelled it becomes CANCELLED; no delete endpoint exists.
- AC-07: Given a Ticket owned by staff A, when staff B creates an action, then it succeeds and the Ticket lists several actions from different people in stable order.
- AC-08: Given a stale `expectedVersion`, when an action or Ticket status is updated, then 409 `STALE_UPDATE` and the stored data is unchanged.
- AC-09: Given the same `clientRequestId` sent twice, when creating, then exactly one action exists.
- AC-10: Given any status pair, when status is changed, then allowed pairs succeed for staff/admin and all others (incl. same-status, from CANCELLED, Requester caller) are rejected per L4-BR-12.
- AC-11: Given a Ticket without owner, without a completed action, or with a planned action, when set to RESOLVED, then 422 `RESOLUTION_GATE`; when all conditions hold it succeeds; a Requester's "appears resolved" never changes status.
- AC-12: Given a RESOLVED/CLOSED Ticket, when REOPENED, then `requesterIndicatedResolved` resets to false; CANCELLED Tickets accept no further transitions or actions.
- AC-13: Given a Requester, when the Requester dashboard is fetched, then only that Requester's Tickets are counted/listed; other roles get 403; zero Tickets give zeros and empty lists.
- AC-14: Given seeded data, when the IT Staff dashboard is fetched, then unassigned, owned-by-me, by-status, by-IT-priority, urgent, recent, my-planned-actions and follow-up metrics equal the raw-SQL results.
- AC-15: Given an Administrator, when the staff dashboard is fetched, then it includes `userCounts`; Requesters get 403.
- AC-16: Given any dashboard card, when its drill-down link/query is used, then the list `total` equals the card count.
- AC-17: Given the Staff Ticket Detail, when the user lists/creates/edits/completes/cancels actions, then the UI shows loading, empty, validation, success, forbidden and failure states and keeps typed data after a recoverable failure; Requesters see a read-only list.
- AC-18: Given a Ticket, when the status control is shown, then only permitted transitions are offered, gate/409 errors are displayed clearly, and the Ticket summary status refreshes on success.
- AC-19: Given the dashboards, when loading/empty/forbidden/failed, then the specified feedback is shown and each card is an accessible link.
- AC-20: Given the migration and seed, when run on a database with Lab 3 data and run twice, then no data is lost, no duplicates are created, and rollback works on a scratch DB.
- AC-21: Given Labs 1-3, when their suites run (with only the CHG-listed edits), then all pass; role navigation, ownership, comments, notes, attachments, user management and auth still behave correctly.
- AC-22: Given desktop (1280), tablet (768) and mobile (320) widths, when each major screen is shown, then there is no clipping, overlap or horizontal page scroll; focus is visible; status/priority have non-colour cues.
- AC-23: Given the final `main`, when built and started from the README, then setup/seed/migrate/test/demo steps work, with no console errors, broken links or placeholder text.

## 10. Definition of Done
- [ ] All 4 spec files + tests.md/reviewer.md/ai-use.md exist and were merged before implementation PRs (Part 2 evidence).
- [ ] Every AC maps to at least one automated test in tests.md; all tests pass on `main` (server, client, E2E).
- [ ] Migration applies cleanly on Lab 3 data; rollback verified; seed idempotent.
- [ ] Backend enforces roles, matrix, gate and stale updates independently of the UI.
- [ ] Dashboard counts verified against raw SQL (`server/scripts/verify-dashboard.ts` output saved).
- [ ] Screenshots at 1280/768/320 for staff dashboard, requester dashboard and actions taken in `artifacts/lab-04/screenshots/`.
- [ ] Visual and accessibility checklist completed (ui-spec.md section 8).
- [ ] Every PR reviewed by the partner; `reviewer.md` records reviewer, PR links, comments, responses, approvals.
- [ ] Feature branches -> `lab4-staging` -> `main`; all Issues in Done; no post-release direct fixes bypassing staging.
- [ ] README current; `.gitignore` correct; no secrets, console errors, placeholders or dead controls.
- [ ] `ai-use.md` has 6-10 key prompts and the reflection.

## 11. Assumptions and Decisions
- Requester cancel/reopen and a status-history table are out of scope; staff change status.
- Actions allow a future `actionAt` (planned work), capped at 1 year ahead / 5 years back.
- Administrators perform IT Staff operations (handout 4.3). This supersedes Lab 3 BR-16 wording;
  the code already behaved this way.
- Optional `expectedVersion` on owner/priority keeps Lab 3 clients working; status requires it.
- **CHG-01:** Lab 3 status tests that jump between arbitrary statuses are updated to follow the matrix (Lab 3 BR-12 was specified but not enforced).
- **CHG-02:** Lab 3 status tests/clients now send `expectedVersion`.
- **CHG-03:** Ticket detail payloads gain `version`; strict-equality assertions on full payloads (if any) are updated.
- **CHG-04:** Lab 3 BR-16 reworded as above (documentation only).
- **CHG-05:** Lab 2 `client/src/components/CreateTicket.test.tsx` reads the fetch mock through `vi.mocked(...)` so `npm run build` type-checks (type-only; no assertion or behaviour change).
- Any further edit to an old test requires a new CHG-xx entry here before the PR is merged.
- **CL-01 (clarification, #51):** `byItPriority.P` counts open-set Tickets by effective priority `COALESCE(itPriority, requestedPriority)`. Its drill-down uses a new additive queue filter `effectivePriority=P` so L4-BR-21 holds for Tickets without an IT priority. `urgentOpen` stays exact `itPriority = HIGH`; the Lab 3 `itPriority` filter is unchanged.
- **CL-02 (clarification, #51):** the action-based cards (`openFollowUps`, `myPlannedActions`) drill down to `GET /api/staff/actions?view=openFollowUps|myPlanned`, which returns `{ items, total }` with the same filter, so L4-BR-21 holds for them too. The staff dashboard also returns a `followUps` list (max 5).
