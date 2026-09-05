# Lab 2 Test Plan and Results

## 1. Test Strategy

I'm covering every acceptance criterion from specification.md with at least one automated test,
mixing unit, API, UI, responsive, and E2E tests. Tests get written before or alongside the
matching feature — not reconstructed afterward from whatever ends up in the code.

## 2. Planned Tests

| Test ID | Type | AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-01 | Unit | BR-01 | Ticket Number generator format | Matches TKT-{year}-{6 digits} | server/src/utils/ticketNumber.test.ts | Pass |
| API-01 | API | AC-01 | Create a valid ticket | 201, ticket saved, number returned | server/tests/lab-02/create-ticket.api.test.ts | Pass |
| API-02 | API | AC-04 | Create ticket with empty summary | 400, validation error | server/tests/lab-02/create-ticket.api.test.ts | Pass |
| API-03 | API | AC-03 | List tickets as Requester B | Requester A's tickets not included | server/tests/lab-02/my-tickets.api.test.ts | Pass |
| API-04 | API | AC-03 | Get one ticket owned by someone else | 404, no data leaked | server/tests/lab-02/ticket-detail.api.test.ts | Pass |
| API-05 | API | AC-08 | Upload a .exe as attachment | 400, rejected, not saved | server/tests/lab-02/attachments.api.test.ts | Pass |
| API-06 | API | AC-09 | Download a removed attachment | Blocked (404) | server/tests/lab-02/attachments.api.test.ts | Pass |
| API-07 | API | BR-18 | Soft-remove an attachment | isRemoved=true, metadata still returned | server/tests/lab-02/attachments.api.test.ts | Pass |
| API-08 | API | BR-09 | Filter tickets by category + priority together | Only tickets matching both | server/tests/lab-02/my-tickets.api.test.ts | Pass |
| UI-01 | UI | AC-04 | Submit Create Ticket with empty Summary | Field error shown, no API call | client/src/components/CreateTicket.test.tsx | Pass |
| UI-02 | UI | AC-01 | Submit valid Create Ticket | Success state shows Ticket Number | client/src/components/CreateTicket.test.tsx | Pass |
| UI-03 | UI | AC-10 | Submit Create Ticket while API is down | Safe error shown, form values kept | client/src/components/CreateTicket.test.tsx | Pass |
| UI-04 | UI | AC-06 | Open My Tickets with zero tickets | Empty state + Create Ticket button | client/src/components/MyTickets.test.tsx | Pass |
| UI-05 | UI | AC-05 | Search with no matching tickets | No-results state (not empty state) | client/src/components/MyTickets.test.tsx | Pass |
| UI-06 | UI | AC-09 | View a removed attachment in Ticket Detail | Shown as removed, download disabled | client/src/components/TicketDetail.test.tsx | Pass |
| UI-07 | UI | AC-08 | Select an oversized file to attach | Rejected client-side with message | (manual verification only, see below) | Manual |
| UI-08 | UI | AC-12 | Load Requester selector with an inactive Requester in DB | Inactive Requester not in dropdown | client/src/components/RequesterSelect.test.tsx | Pass |
| RESP-01 | Responsive | AC-11 | Open My Tickets on a 375px viewport | No horizontal scroll | e2e/lab-02/responsive.spec.ts | Pass |
| E2E-01 | E2E | AC-01, AC-07 | Select Requester, create ticket, find it in My Tickets | Ticket appears with correct number | e2e/lab-02/requester-ticket-flow.spec.ts | Pass |
| E2E-02 | E2E | AC-03 | Create ticket as Requester A, switch to Requester B | Requester A's ticket is gone from the list | e2e/lab-02/requester-ticket-flow.spec.ts | Pass |

Note: UI-07 ended up manual instead of automated. I checked it by hand in the browser (picking an
oversized file shows the inline error and the file never reaches the API), but I didn't get
around to writing a dedicated component test for it before the sprint wrapped up. Flagging it
here instead of quietly marking it "Pass" as if it were automated.

## 3. Acceptance-Criterion Traceability

| AC | Covered by |
| --- | --- |
| AC-01 | API-01, UI-02, E2E-01 |
| AC-02 | (frontend routing guard, covered manually + screenshot evidence) |
| AC-03 | API-03, API-04, E2E-02 |
| AC-04 | API-02, UI-01 |
| AC-05 | UI-05 |
| AC-06 | UI-04 |
| AC-07 | E2E-01 |
| AC-08 | API-05 (automated), UI-07 (manual) |
| AC-09 | API-06, UI-06 |
| AC-10 | UI-03 |
| AC-11 | RESP-01 |
| AC-12 | UI-08 |

## 4. Responsive and Visual Checklist

- [x] Desktop (≥992px): My Tickets shows the full table with all columns visible
- [x] Tablet (768–991px): layout adjusts, Summary/Description still readable
- [x] Mobile (<768px): fields stack vertically, ticket list becomes cards, no sideways scroll
- [x] No clipped labels or overlapping error messages at any size
- [x] Badge colors match the spec for Requested Priority / IT Priority / Current Status
- [ ] Screenshots taken and stored under artifacts/lab-02/screenshots/ (to do before the report)

## 5. Test Commands

    cd server && npm test
    cd client && npm test
    cd e2e && npx playwright test

## 6. Final Results

All planned tests pass on the final `lab2-staging` branch before the release PR to `main`.

**Server (Vitest):**

    Test Files  7 passed (7)
         Tests  14 passed (14)

**Client (Vitest + React Testing Library):**

    Test Files  5 passed (5)
         Tests  11 passed (11)

**End-to-end (Playwright):**

    3 passed (2.9s)

Total: 28 automated tests passing across unit, API, UI, responsive, and end-to-end levels, plus
one manually-verified case (UI-07) noted above.

## 7. Known Limitations or Deferred Tests

- UI-07 (oversized file rejection) is verified manually rather than with an automated test — see
  note in section 2.
- Full keyboard-navigation testing is done manually (tab order, focus rings) rather than
  automated, since Lab 2 doesn't require automated accessibility tests specifically.
- Load/performance testing (e.g. hundreds of tickets) is out of scope for this sprint.