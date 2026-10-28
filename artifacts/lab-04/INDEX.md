# Lab 4 Evidence Index

Evidence is produced from real runs only. Every log starts with the command, commit hash, branch
and UTC date, and ends with the process exit code. Screenshots are taken by Playwright at
1280 / 768 / 320 px from the running app with seeded data and the E2E fixtures
(`server/scripts/e2e-lab4-fixtures.ts`); the spec also asserts there is no horizontal page scroll
before each screenshot (RESP-01).

## Logs (`logs/`)
| File | What | Issue |
| --- | --- | --- |
| logs/issue-50-server-tests.log | `npx vitest run` (server, all labs) | #50 |
| logs/issue-50-client-tests.log | `npx vitest run` (client) | #50 |
| logs/issue-50-server-build.log | `npm run build` (server) | #50 |
| logs/issue-50-client-build.log | `npm run build` (client) | #50 |
| logs/issue-51-server-tests.log | `npx vitest run` (server, all labs) | #51 |
| logs/issue-51-client-tests.log | `npx vitest run` (client) | #51 |
| logs/issue-51-server-build.log | `npm run build` (server) | #51 |
| logs/issue-51-client-build.log | `npm run build` (client) | #51 |
| logs/verify-dashboard.log | `npx tsx scripts/verify-dashboard.ts` - every dashboard metric vs raw SQL | #51 |
| logs/issue-52-server-tests.log | `npx vitest run` (server, all labs) | #52 |
| logs/issue-52-client-tests.log | `npx vitest run` (client) | #52 |
| logs/issue-52-server-build.log | `npm run build` (server) | #52 |
| logs/issue-52-client-build.log | `npm run build` (client) | #52 |
| logs/issue-52-e2e-actions-screens.log | `npx playwright test lab-04/actions-taken-flow.spec.ts` (screenshots) | #52 |
| logs/issue-54-server-tests.log | `npx vitest run` (server, all labs) | #54 |
| logs/issue-54-client-tests.log | `npx vitest run` (client, incl. CHG-06 App tests) | #54 |
| logs/issue-54-server-build.log | `npm run build` (server) | #54 |
| logs/issue-54-client-build.log | `npm run build` (client) | #54 |
| logs/issue-54-e2e-dashboard-screens.log | `npx playwright test lab-04/dashboards.spec.ts` (screenshots, card = drill-down total) | #54 |
| logs/issue-54-e2e-lab02-lab03.log | `npx playwright test lab-02 lab-03` - CHG-06 IT Staff test passes; 3 tests fail at login (local accounts, see #55) | #54 |

## Screenshots (`screenshots/`)
| File | Screen / state | Width | Issue |
| --- | --- | --- | --- |
| screenshots/actions-staff-list-1280.png | Staff Ticket Detail - Actions Taken list (Planned/Cancelled/Completed, row buttons, Locked cue) | 1280 | #52 |
| screenshots/actions-staff-list-768.png | Staff Ticket Detail - Actions Taken list (Planned/Cancelled/Completed, row buttons, Locked cue) | 768 | #52 |
| screenshots/actions-staff-list-320.png | Staff Ticket Detail - Actions Taken list (Planned/Cancelled/Completed, row buttons, Locked cue) | 320 | #52 |
| screenshots/actions-staff-empty-1280.png | Staff - empty state "No actions recorded yet." | 1280 | #52 |
| screenshots/actions-staff-empty-768.png | Staff - empty state "No actions recorded yet." | 768 | #52 |
| screenshots/actions-staff-empty-320.png | Staff - empty state "No actions recorded yet." | 320 | #52 |
| screenshots/actions-staff-loading-1280.png | Staff - loading state (request held) | 1280 | #52 |
| screenshots/actions-staff-loading-768.png | Staff - loading state (request held) | 768 | #52 |
| screenshots/actions-staff-loading-320.png | Staff - loading state (request held) | 320 | #52 |
| screenshots/actions-staff-error-1280.png | Staff - API 500: safe message + Retry | 1280 | #52 |
| screenshots/actions-staff-error-768.png | Staff - API 500: safe message + Retry | 768 | #52 |
| screenshots/actions-staff-error-320.png | Staff - API 500: safe message + Retry | 320 | #52 |
| screenshots/actions-staff-validation-1280.png | Staff - Add action form with inline validation (description, follow-up note) | 1280 | #52 |
| screenshots/actions-staff-validation-768.png | Staff - Add action form with inline validation (description, follow-up note) | 768 | #52 |
| screenshots/actions-staff-validation-320.png | Staff - Add action form with inline validation (description, follow-up note) | 320 | #52 |
| screenshots/actions-staff-created-1280.png | Staff - success alert after adding an action (new row) | 1280 | #52 |
| screenshots/actions-staff-created-768.png | Staff - success alert after adding an action (new row) | 768 | #52 |
| screenshots/actions-staff-created-320.png | Staff - success alert after adding an action (new row) | 320 | #52 |
| screenshots/actions-staff-complete-form-1280.png | Staff - inline Complete form with Result required error | 1280 | #52 |
| screenshots/actions-staff-complete-form-768.png | Staff - inline Complete form with Result required error | 768 | #52 |
| screenshots/actions-staff-complete-form-320.png | Staff - inline Complete form with Result required error | 320 | #52 |
| screenshots/actions-staff-conflict-1280.png | Staff - 409 conflict banner with Reload, draft kept | 1280 | #52 |
| screenshots/actions-staff-conflict-768.png | Staff - 409 conflict banner with Reload, draft kept | 768 | #52 |
| screenshots/actions-staff-conflict-320.png | Staff - 409 conflict banner with Reload, draft kept | 320 | #52 |
| screenshots/actions-requester-readonly-1280.png | Requester Ticket Detail - read-only Actions Taken (no buttons) | 1280 | #52 |
| screenshots/actions-requester-readonly-768.png | Requester Ticket Detail - read-only Actions Taken (no buttons) | 768 | #52 |
| screenshots/actions-requester-readonly-320.png | Requester Ticket Detail - read-only Actions Taken (no buttons) | 320 | #52 |
| screenshots/dashboard-staff-1280.png | IT Staff Dashboard - cards, status and priority breakdowns, lists; Dashboard nav active | 1280 | #54 |
| screenshots/dashboard-staff-768.png | IT Staff Dashboard - cards, status and priority breakdowns, lists; Dashboard nav active | 768 | #54 |
| screenshots/dashboard-staff-320.png | IT Staff Dashboard - cards, status and priority breakdowns, lists; Dashboard nav active | 320 | #54 |
| screenshots/dashboard-staff-drilldown-queue-1280.png | Unassigned open card -> Ticket Queue with filter chip; chip total equals card value | 1280 | #54 |
| screenshots/dashboard-staff-drilldown-queue-768.png | Unassigned open card -> Ticket Queue with filter chip; chip total equals card value | 768 | #54 |
| screenshots/dashboard-staff-drilldown-queue-320.png | Unassigned open card -> Ticket Queue with filter chip; chip total equals card value | 320 | #54 |
| screenshots/dashboard-staff-followups-list-1280.png | Open follow-ups card -> actions list (CL-02); total equals card value | 1280 | #54 |
| screenshots/dashboard-staff-followups-list-768.png | Open follow-ups card -> actions list (CL-02); total equals card value | 768 | #54 |
| screenshots/dashboard-staff-followups-list-320.png | Open follow-ups card -> actions list (CL-02); total equals card value | 320 | #54 |
| screenshots/dashboard-admin-1280.png | Administrator Dashboard with Users card; nav shows Users | 1280 | #54 |
| screenshots/dashboard-admin-768.png | Administrator Dashboard with Users card; nav shows Users | 768 | #54 |
| screenshots/dashboard-admin-320.png | Administrator Dashboard with Users card; nav shows Users | 320 | #54 |
| screenshots/dashboard-staff-loading-1280.png | IT Staff Dashboard loading state | 1280 | #54 |
| screenshots/dashboard-staff-loading-768.png | IT Staff Dashboard loading state | 768 | #54 |
| screenshots/dashboard-staff-loading-320.png | IT Staff Dashboard loading state | 320 | #54 |
| screenshots/dashboard-staff-error-1280.png | IT Staff Dashboard failure: safe message + Retry | 1280 | #54 |
| screenshots/dashboard-staff-error-768.png | IT Staff Dashboard failure: safe message + Retry | 768 | #54 |
| screenshots/dashboard-staff-error-320.png | IT Staff Dashboard failure: safe message + Retry | 320 | #54 |
| screenshots/dashboard-staff-forbidden-1280.png | IT Staff Dashboard forbidden (403) state with link to own dashboard | 1280 | #54 |
| screenshots/dashboard-staff-forbidden-768.png | IT Staff Dashboard forbidden (403) state with link to own dashboard | 768 | #54 |
| screenshots/dashboard-staff-forbidden-320.png | IT Staff Dashboard forbidden (403) state with link to own dashboard | 320 | #54 |
| screenshots/dashboard-requester-1280.png | Requester Dashboard - cards and lists; Dashboard nav active | 1280 | #54 |
| screenshots/dashboard-requester-768.png | Requester Dashboard - cards and lists; Dashboard nav active | 768 | #54 |
| screenshots/dashboard-requester-320.png | Requester Dashboard - cards and lists; Dashboard nav active | 320 | #54 |
| screenshots/dashboard-requester-drilldown-1280.png | Open tickets card -> My Tickets with filter chip; total equals card value | 1280 | #54 |
| screenshots/dashboard-requester-drilldown-768.png | Open tickets card -> My Tickets with filter chip; total equals card value | 768 | #54 |
| screenshots/dashboard-requester-drilldown-320.png | Open tickets card -> My Tickets with filter chip; total equals card value | 320 | #54 |
| screenshots/dashboard-change-password-1280.png | Change Password from the nav (voluntary form) | 1280 | #54 |
| screenshots/dashboard-change-password-768.png | Change Password from the nav (voluntary form) | 768 | #54 |
| screenshots/dashboard-change-password-320.png | Change Password from the nav (voluntary form) | 320 | #54 |
| screenshots/dashboard-requester-empty-1280.png | Requester with no tickets: zeros, Nothing to show, Create a ticket | 1280 | #54 |
| screenshots/dashboard-requester-empty-768.png | Requester with no tickets: zeros, Nothing to show, Create a ticket | 768 | #54 |
| screenshots/dashboard-requester-empty-320.png | Requester with no tickets: zeros, Nothing to show, Create a ticket | 320 | #54 |
