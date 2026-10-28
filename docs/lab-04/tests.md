# Lab 4 Test Plan and Results

## 1. Test Strategy
Every acceptance criterion in specification.md maps to at least one automated test. Tests are
written before or alongside each feature (Test DD / TDD): each Issue starts with failing tests,
then code, then green. Types: unit, API/integration, UI component, UI style, responsive,
authorization, workflow, migration/regression, performance-smoke, E2E.
Server tests run sequentially (`fileParallelism: false`) because they share one database.
Final column is updated to Pass/Fail only from real runs: first on the Issue's feature branch,
then re-run on `main` before the final report.

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-01 | Unit | L4-BR-12 | Transition matrix helper: every (from,to) pair | Only the 20 allowed pairs return true (all other of the 64 pairs return false) | server/src/utils/ticketWorkflow.test.ts | Pass |
| UNIT-02 | Unit | L4-BR-13 | Resolution gate helper reasons | Correct reasons array for each combination | server/src/utils/ticketWorkflow.test.ts | Pass |
| UNIT-03 | Unit | L4-BR-05/06 | Action input validator | Field errors for short description, missing follow-up note, over-length | server/src/utils/actionValidation.test.ts | Pass |
| API-01 | API | AC-01 | Staff creates valid action | 201, correct ticket, performer = caller, assignee default = caller | server/tests/lab-04/actions-taken.api.test.ts | Pass |
| API-02 | API | AC-03 | Invalid create payloads | 400 with field errors, nothing stored | server/tests/lab-04/actions-taken.api.test.ts | Pass |
| API-03 | API | AC-04 | Inactive / Requester-role assignee | 400 on assigneeId | server/tests/lab-04/actions-taken.api.test.ts | Pass |
| API-04 | API | AC-05 | Edit PLANNED vs COMPLETED/CANCELLED | 200 / 422 ACTION_LOCKED | server/tests/lab-04/actions-taken.api.test.ts | Pass |
| API-05 | API | AC-06 | Complete requires result; cancel; no DELETE | 400 w/o result; statuses set; DELETE not routed | server/tests/lab-04/actions-taken.api.test.ts | Pass |
| API-06 | API | AC-07 | Different staff act on a Ticket owned by another; several actions | 201; list shows both, stable order | server/tests/lab-04/actions-taken.api.test.ts | Pass |
| API-07 | API | AC-08 | Stale action update | 409 STALE_UPDATE, data unchanged | server/tests/lab-04/actions-taken.api.test.ts | Pass |
| API-08 | API | AC-09 | Duplicate clientRequestId | One action, second call 200 same id | server/tests/lab-04/actions-taken.api.test.ts | Pass |
| API-09 | API | AC-02 | Requester create/edit/complete/cancel forbidden; own list readable; other's ticket 404 | 403 / 200 / 404 | server/tests/lab-04/actions-taken.api.test.ts | Pass |
| API-10 | API | L4-BR-11 | Create on CLOSED / CANCELLED Ticket | 422 TICKET_TERMINAL | server/tests/lab-04/actions-taken.api.test.ts | Pass |
| WF-01 | Workflow | AC-10 | Every allowed transition succeeds for staff | 200, version +1 | server/tests/lab-04/ticket-workflow.api.test.ts | Pass |
| WF-02 | Workflow | AC-10 | Disallowed, same-status and from-CANCELLED transitions | 422 INVALID_TRANSITION with allowed list | server/tests/lab-04/ticket-workflow.api.test.ts | Pass |
| WF-03 | Workflow | AC-10 | Requester changes status | 403 | server/tests/lab-04/ticket-workflow.api.test.ts | Pass |
| WF-04 | Workflow | AC-11 | Resolution gate: no owner / no completed / planned pending | 422 RESOLUTION_GATE with reasons | server/tests/lab-04/ticket-workflow.api.test.ts | Pass |
| WF-05 | Workflow | AC-11 | Gate satisfied -> RESOLVED; Requester indicator alone does not resolve | 200; status unchanged by indicate-resolved | server/tests/lab-04/ticket-workflow.api.test.ts | Pass |
| WF-06 | Workflow | AC-12 | Reopen resets requesterIndicatedResolved | false after REOPENED | server/tests/lab-04/ticket-workflow.api.test.ts | Pass |
| WF-07 | Workflow | AC-08 | Stale ticket status update (two users) | 409, second write rejected | server/tests/lab-04/ticket-workflow.api.test.ts | Pass |
| WF-08 | Workflow | AC-08 | Missing expectedVersion on status | 400 | server/tests/lab-04/ticket-workflow.api.test.ts | Pass |
| API-11 | API | AC-13 | Requester dashboard scoped to caller; zero state | Only own counts; zeros for empty user | server/tests/lab-04/requester-dashboard.api.test.ts | Pass |
| API-12 | API | AC-13 | Role restriction on requester dashboard | 403 for staff/admin, 401 anonymous | server/tests/lab-04/requester-dashboard.api.test.ts | Pass |
| API-13 | API | AC-16 | Requester card counts equal drill-down totals | Equal | server/tests/lab-04/requester-dashboard.api.test.ts | Pass |
| API-14 | API | AC-14 | Staff dashboard metrics vs direct SQL counts, incl. open Tickets with null itPriority counted by requestedPriority (CL-01) | Equal for every metric | server/tests/lab-04/staff-dashboard.api.test.ts | Pass |
| API-15 | API | AC-14 | Staff dashboard zero state & recent window (7d) | Zeros / old tickets excluded | server/tests/lab-04/staff-dashboard.api.test.ts | Pass |
| API-16 | API | AC-15 | Admin sees userCounts; staff does not; Requester 403 | As specified | server/tests/lab-04/staff-dashboard.api.test.ts | Pass |
| API-17 | API | AC-16 | Staff card counts equal drill-down totals: queue (ownerId=me, statusGroup=open, effectivePriority=P incl. null itPriority, status=X) and /api/staff/actions views (CL-01, CL-02) | Equal | server/tests/lab-04/staff-dashboard.api.test.ts | Pass |
| MIG-01 | Migration | AC-20 | Lab 3 data preserved after migration; version = 1 | Row counts and sample rows unchanged | server/tests/lab-04/migration.test.ts | Pass |
| MIG-02 | Migration | AC-20 | rollback.sql on scratch DB; seed run twice | Clean rollback; no duplicates | server/tests/lab-04/migration.test.ts | Pass |
| REG-01 | Regression | AC-21 | Full Lab 1-3 server suite (with CHG edits only) | All pass | server/tests/lab-01..03 | Planned |
| REG-02 | Regression | AC-21 | Full Lab 1-3 client suite | All pass | client/src/components/*.test.tsx | Planned |
| REG-03 | Regression | AC-21 | Lab 2/3 E2E suites | All pass | e2e/lab-02, e2e/lab-03 | Planned |
| PERF-01 | Performance smoke | AC-14 | Both dashboards respond < 500 ms on seeded data | Under threshold | server/tests/lab-04/staff-dashboard.api.test.ts | Pass |
| UI-01 | UI component | AC-17 | Actions panel: loading, empty, list, error+retry | States render | client/src/components/lab-04/ActionsTaken.test.tsx | Pass |
| UI-02 | UI component | AC-17 | Create form validation, follow-up note toggling, submit disabled while pending, data kept after failure | As specified | client/src/components/lab-04/ActionsTaken.test.tsx | Pass |
| UI-03 | UI component | AC-17 | Edit / complete (result required) / cancel actions; locked rows have no buttons | As specified | client/src/components/lab-04/ActionsTaken.test.tsx | Pass |
| UI-04 | UI component | AC-17, AC-02 | Requester view is read-only | No buttons/forms | client/src/components/lab-04/ActionsTaken.test.tsx | Pass |
| UI-05 | UI component | AC-18 | Only permitted transitions offered; success refreshes badge | As specified | client/src/components/lab-04/TicketWorkflow.test.tsx | Pass |
| UI-06 | UI component | AC-18 | Gate / invalid-transition / 409 messages displayed | Messages and banner shown | client/src/components/lab-04/TicketWorkflow.test.tsx | Pass |
| UI-07 | UI component | AC-19 | Staff dashboard: cards, links, lists, loading, empty, forbidden, failure+retry, admin users card | As specified | client/src/components/lab-04/StaffDashboard.test.tsx | Pass |
| UI-08 | UI component | AC-19 | Requester dashboard: cards, links, lists, empty, forbidden, failure | As specified | client/src/components/lab-04/RequesterDashboard.test.tsx | Pass |
| STYLE-01 | UI style | AC-22 | Status/priority badges include text; focus-visible styles present; aria attributes on errors | Assertions pass | client/src/components/lab-04/ActionsTaken.test.tsx | Pass |
| E2E-01 | E2E | AC-01, AC-07, AC-17 | Staff A and B add different actions on one Ticket; Requester sees them read-only | Pass | e2e/lab-04/actions-taken-flow.spec.ts | Planned |
| E2E-02 | E2E | AC-11, AC-18 | Gate blocks RESOLVED; complete action; resolve; close; reopen | Pass | e2e/lab-04/ticket-resolution.spec.ts | Planned |
| E2E-03 | E2E | AC-13..16, AC-19 | Dashboards by role, drill-down totals match | Pass | e2e/lab-04/dashboards.spec.ts | Planned |
| RESP-01 | Responsive | AC-22 | Screenshots 1280/768/320 of dashboards and actions; asserts no horizontal scroll | Pass; images saved | e2e/lab-04/dashboards.spec.ts, e2e/lab-04/actions-taken-flow.spec.ts | Planned |
| A11Y-01 | Accessibility | AC-22 | Keyboard-only create-action flow; labels and focus order | Pass | e2e/lab-04/actions-taken-flow.spec.ts | Planned |
| HARD-01 | Hardening | AC-23 | No console errors during E2E; README steps verified manually | Pass | e2e/lab-04/dashboards.spec.ts + manual checklist | Planned |

## 3. Acceptance Criteria Traceability
| AC | Tests |
| --- | --- |
| AC-01 | API-01, E2E-01 |
| AC-02 | API-09, UI-04 |
| AC-03 | API-02, UNIT-03 |
| AC-04 | API-03 |
| AC-05 | API-04 |
| AC-06 | API-05 |
| AC-07 | API-06, E2E-01 |
| AC-08 | API-07, WF-07, WF-08 |
| AC-09 | API-08 |
| AC-10 | UNIT-01, WF-01, WF-02, WF-03 |
| AC-11 | UNIT-02, WF-04, WF-05, E2E-02 |
| AC-12 | WF-06, API-10 |
| AC-13 | API-11, API-12 |
| AC-14 | API-14, API-15, PERF-01 |
| AC-15 | API-16 |
| AC-16 | API-13, API-17, E2E-03 |
| AC-17 | UI-01..04, E2E-01 |
| AC-18 | UI-05, UI-06, E2E-02 |
| AC-19 | UI-07, UI-08, E2E-03 |
| AC-20 | MIG-01, MIG-02 |
| AC-21 | REG-01..03 |
| AC-22 | RESP-01, A11Y-01, STYLE-01 |
| AC-23 | HARD-01 |

## 4. Allowed Changes to Earlier Tests
Only edits listed as CHG-xx in specification.md section 11 (matrix-compliant status jumps,
`expectedVersion` in status calls). Each edited test is listed here when it happens:

| CHG | Test file | Change |
| --- | --- | --- |
| CHG-02 | server/tests/lab-03/staff-ticket-detail.api.test.ts | "a permitted status change is accepted" now sends `expectedVersion: 1` (NEW -> OPEN is already in the matrix, so no CHG-01 edit was needed) |
| CHG-05 | client/src/components/CreateTicket.test.tsx | `fetchMock.mock.calls` -> `vi.mocked(fetchMock).mock.calls` (2 lines, type-only; assertions unchanged) |
| CHG-06 | client/src/App.test.tsx | "shows a loading state, then the system status..." and "shows a useful error message...": one added line each, clicking `nav-check-system` before the existing `check-system-btn` steps; assertions unchanged |
| CHG-06 | e2e/lab-03/auth-role-flow.spec.ts | "IT staff sees the Ticket Queue...": one added line clicking `nav-staff-queue` before the existing `staff-queue-table` assertion; assertions unchanged |

## 5. Final Results
Filled at the end from real runs on `main` (server, client, E2E output pasted in the report).
