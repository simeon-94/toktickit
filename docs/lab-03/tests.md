# Lab 3 Test Plan and Results

## 1. Test Strategy
Every acceptance criterion in specification.md gets at least one automated test: unit, API,
UI component, responsive, security/authorization, migration/regression, and E2E. Written before
or alongside each feature — never reconstructed afterward.

## 2. Planned Tests

| Test ID | Type | AC | What It Tests | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- |
| UNIT-01 | Unit | BR-09 | Password strength validator (8 chars, upper/lower/number/special) | server/src/utils/password.test.ts | Planned |
| API-01 | API | AC-01 | Valid login returns session + user identity/role | server/tests/lab-03/auth.api.test.ts | Planned |
| API-02 | API | AC-02 | Wrong password returns generic error, no account details | server/tests/lab-03/auth.api.test.ts | Planned |
| API-03 | API | AC-02 | Login with inactive account returns generic error | server/tests/lab-03/auth.api.test.ts | Planned |
| API-04 | API | AC-03 | mustChangePassword user blocked from non-auth endpoints | server/tests/lab-03/auth.api.test.ts | Planned |
| API-05 | API | AC-04 | Successful password change clears mustChangePassword | server/tests/lab-03/auth.api.test.ts | Planned |
| API-06 | API | AC-05 | Logout invalidates the session cookie | server/tests/lab-03/auth.api.test.ts | Planned |
| API-07 | API | AC-06 | Client-supplied requesterId is ignored; auth identity wins | server/tests/lab-03/authorization.api.test.ts | Planned |
| API-08 | API | AC-07 | Requester calling Internal Notes endpoint is forbidden | server/tests/lab-03/authorization.api.test.ts | Planned |
| API-09 | API | AC-12 | Non-Administrator calling /api/admin/users is forbidden | server/tests/lab-03/authorization.api.test.ts | Planned |
| API-10 | API | BR-17 | Lab 2 ticket ownership checks still enforced post-migration | server/tests/lab-03/authorization.api.test.ts | Planned |
| API-11 | API | FR-09 | Ticket Queue search/filter/sort/pagination | server/tests/lab-03/staff-queue.api.test.ts | Planned |
| API-12 | API | FR-09 | Non-staff cannot access the Ticket Queue | server/tests/lab-03/staff-queue.api.test.ts | Planned |
| API-13 | API | AC-08 | IT Staff claims an unassigned ticket | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-14 | API | FR-11 | IT Staff changes IT Priority independent of Requested Priority | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-15 | API | AC-09 | Invalid status transition (New -> Closed) is rejected | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-16 | API | FR-12 | Valid status transition chain succeeds | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-17 | API | AC-10 | Public Comment visible to Requester and IT Staff | server/tests/lab-03/comments-notes.api.test.ts | Planned |
| API-18 | API | BR-04 | Internal Note never returned to Requester | server/tests/lab-03/comments-notes.api.test.ts | Planned |
| API-19 | API | BR-13 | Empty/whitespace comment or note is rejected | server/tests/lab-03/comments-notes.api.test.ts | Planned |
| API-20 | API | AC-11 | Requester "indicate resolved" does not change currentStatus | server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-21 | API | FR-14 | Admin lists/searches/filters users by role | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-22 | API | AC-13 | Duplicate email on user creation is rejected | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-23 | API | FR-17 | New initial password forces mustChangePassword=true | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-24 | API | AC-14 | Admin cannot deactivate their own account | server/tests/lab-03/users-admin.api.test.ts | Planned |
| API-25 | API | BR-15 | Cannot deactivate/change role of the last active Administrator | server/tests/lab-03/users-admin.api.test.ts | Planned |
| UI-01 | UI | AC-02 | Login form shows validation + safe error, busy state | client/.../Login.test.tsx | Planned |
| UI-02 | UI | AC-03 | Change Password screen enforces password rules | client/.../ChangePassword.test.tsx | Planned |
| UI-03 | UI | FR-09 | Ticket Queue empty/no-results states | client/.../StaffTicketQueue.test.tsx | Planned |
| UI-04 | UI | FR-13 | Ticket Detail distinguishes Public Comments vs Internal Notes visually | client/.../StaffTicketDetail.test.tsx | Planned |
| UI-05 | UI | AC-13 | User Management form shows duplicate-email error | client/.../UserManagement.test.tsx | Planned |
| RESP-01 | Responsive | FR-09 | Ticket Queue usable at 375px, no horizontal scroll | e2e/lab-03/staff-ticket-flow.spec.ts | Planned |
| E2E-01 | E2E | AC-01 | Login, mandatory password change, reach app | e2e/lab-03/authentication.spec.ts | Planned |
| E2E-02 | E2E | AC-04 | Initial password login and change opens normal app only after | e2e/lab-03/authentication.spec.ts | Planned |
| E2E-03 | E2E | FR-10 | IT Staff claims a ticket end-to-end and updates status | e2e/lab-03/staff-ticket-flow.spec.ts | Planned |
| E2E-04 | E2E | FR-15 | Admin creates a user who can then log in and is forced to change password | e2e/lab-03/user-administration.spec.ts | Planned |

## 3. Acceptance-Criterion Traceability

| AC | Covered by |
| --- | --- |
| AC-01 | API-01, E2E-01 |
| AC-02 | API-02, API-03, UI-01 |
| AC-03 | API-04, UI-02 |
| AC-04 | API-05, E2E-02 |
| AC-05 | API-06 |
| AC-06 | API-07 |
| AC-07 | API-08 |
| AC-08 | API-13, E2E-03 |
| AC-09 | API-15 |
| AC-10 | API-17 |
| AC-11 | API-20 |
| AC-12 | API-09 |
| AC-13 | API-22, UI-05 |
| AC-14 | API-24 |
| AC-15 | API-23, E2E-04 |

## 4. Responsive and Visual Checklist
- [ ] Desktop: Ticket Queue full table, User Management two-column create panel
- [ ] Tablet: Queue and Ticket Detail remain readable, no clipped labels
- [ ] Mobile: Queue becomes cards, Login/Change Password single column, no horizontal scroll
- [ ] Public Comments and Internal Notes are visually distinct at every breakpoint
- [ ] Role/status/priority badges match ui-spec.md

## 5. Test Commands
    cd server && npm test
    cd client && npm test
    cd e2e && npx playwright test

## 6. Final Results
(To be filled in once all Lab 3 Issues are implemented and passing on the final branch.)

## 7. Known Limitations or Deferred Tests
(To be updated as implementation proceeds — matching the honest approach used in Lab 2.)