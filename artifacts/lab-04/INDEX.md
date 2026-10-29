# Lab 4 Evidence Index

Evidence is produced from real runs only. Every log starts with the command, commit hash, branch
and UTC date, and ends with the process exit code. Screenshots are taken by Playwright at
1280 / 768 / 320 px from the running app; the specs assert there is no horizontal page scroll before
each screenshot (RESP-01).

**#68 adds 54 screenshots (18 screens x 3 widths, table at the end: E2E-04 and REG-04), so the folder holds 132.**

**All 78 screenshots were retaken in #55 on a clean database** (migrations + seed + E2E fixtures from
`server/scripts/e2e-lab4-fixtures.ts`), so the dashboard counts are demo-sized. Earlier versions in the
Git history of #52-#54 were taken on the shared dev database that also held automated-test rows.

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
| logs/verify-dashboard.log | `verify-dashboard.ts` in #51, on the shared dev database before #55 (24/24 matched) | #51 |
| logs/issue-52-server-tests.log | `npx vitest run` (server, all labs) | #52 |
| logs/issue-52-client-tests.log | `npx vitest run` (client) | #52 |
| logs/issue-52-server-build.log | `npm run build` (server) | #52 |
| logs/issue-52-client-build.log | `npm run build` (client) | #52 |
| logs/issue-52-e2e-actions-screens.log | `npx playwright test lab-04/actions-taken-flow.spec.ts` (screenshots) | #52 |
| logs/batch-a-staging-migrate-deploy.log | `npx prisma migrate deploy` on lab4-staging after Batch A (#60, #61, #62) merged | Batch A |
| logs/batch-a-staging-server-tests.log | `npx vitest run` (server) on lab4-staging after Batch A | Batch A |
| logs/batch-a-staging-client-tests.log | `npx vitest run` (client) on lab4-staging after Batch A | Batch A |
| logs/batch-a-staging-server-build.log | `npm run build` (server) on lab4-staging after Batch A | Batch A |
| logs/batch-a-staging-client-build.log | `npm run build` (client) on lab4-staging after Batch A | Batch A |
| logs/issue-53-server-tests.log | `npx vitest run` (server, all labs) | #53 |
| logs/issue-53-client-tests.log | `npx vitest run` (client) | #53 |
| logs/issue-53-server-build.log | `npm run build` (server) | #53 |
| logs/issue-53-client-build.log | `npm run build` (client) | #53 |
| logs/issue-53-e2e-workflow-screens.log | `npx playwright test lab-04/ticket-resolution.spec.ts` (screenshots) | #53 |
| logs/issue-54-server-tests.log | `npx vitest run` (server, all labs) | #54 |
| logs/issue-54-client-tests.log | `npx vitest run` (client, incl. CHG-06 App tests) | #54 |
| logs/issue-54-server-build.log | `npm run build` (server) | #54 |
| logs/issue-54-client-build.log | `npm run build` (client) | #54 |
| logs/issue-54-e2e-dashboard-screens.log | `npx playwright test lab-04/dashboards.spec.ts` (screenshots, card = drill-down total) | #54 |
| logs/issue-54-e2e-lab02-lab03.log | `npx playwright test lab-02 lab-03` - CHG-06 IT Staff test passes; 3 tests fail at login (local accounts, see #55) | #54 |
| logs/batch-b-staging-migrate-deploy.log | `npx prisma migrate deploy` on lab4-staging after Batch B (#63, #64) merged | Batch B |
| logs/batch-b-staging-server-tests.log | `npx vitest run` (server) on lab4-staging after Batch B | Batch B |
| logs/batch-b-staging-client-tests.log | `npx vitest run` (client) on lab4-staging after Batch B | Batch B |
| logs/batch-b-staging-server-build.log | `npm run build` (server) on lab4-staging after Batch B | Batch B |
| logs/batch-b-staging-client-build.log | `npm run build` (client) on lab4-staging after Batch B | Batch B |
| logs/issue-55-e2e-all.log | `npx playwright test` - Lab 2, 3 and 4 suites on the clean database (retakes all screenshots) | #55 |
| logs/verify-dashboard-staff.log | `npm run verify:dashboard` as IT Staff (priya.nair) + Requester (jennifer.anderson), clean database | #55 |
| logs/verify-dashboard-admin.log | `npm run verify:dashboard` as Administrator (olivia.grant, incl. user counts) + Requester (michael.brown) | #55 |
| logs/verify-dashboard-requester.log | `npm run verify:dashboard` as e2e.staff + Requester e2e.requester (fixture data) | #55 |
| logs/issue-55-server-tests.log | `npx vitest run` (server, all labs, own test database) | #55 |
| logs/issue-55-client-tests.log | `npx vitest run` (client) | #55 |
| logs/issue-55-server-build.log | `npm run build` (server) | #55 |
| logs/issue-55-client-build.log | `npm run build` (client) | #55 |
| logs/issue-69-red-server-tests.log | Red run of HARD-06..08 before any fix: the file fails to load (`middleware/errors` missing) | #69 |
| logs/issue-69-red2-server-tests.log | Red run after the async safety net only: HARD-08 passes, HARD-06/07 fail (`status=New` gives 500, expected 400) | #69 |
| logs/issue-69-red-client-tests.log | Red run of HARD-09: the "New" option value is `New`, expected `NEW` | #69 |
| logs/issue-69-server-tests.log | `npx vitest run --reporter=verbose` (server, all labs, own test database) | #69 |
| logs/issue-69-client-tests.log | `npx vitest run --reporter=verbose` (client) | #69 |
| logs/issue-69-server-build.log | `npm run build` (server) | #69 |
| logs/issue-69-client-build.log | `npm run build` (client) | #69 |
| logs/issue-69-e2e-all.log | `npx playwright test` (Lab 2, 3 and 4) against the fixed API | #69 |
| logs/issue-71-red-e2e.log | Red run of RESP-02 before the fix: 284px page overflow at 320px; no scroll container at any width | #71 |
| logs/issue-71-server-tests.log | `npx vitest run --reporter=verbose` (server, all labs, own test database) | #71 |
| logs/issue-71-client-tests.log | `npx vitest run --reporter=verbose` (client) | #71 |
| logs/issue-71-server-build.log | `npm run build` (server) | #71 |
| logs/issue-71-client-build.log | `npm run build` (client) | #71 |
| logs/issue-71-e2e-all.log | `npx playwright test` (Lab 2, 3 and 4) including RESP-02 | #71 |
| logs/inactive-assignee-api.log | `e2e/lab-04/inactive-assignee-api.sh`: real POST of an action assigned to the inactive IT Staff user Mark Diaz -> 400 `VALIDATION` `fields.assigneeId`, nothing stored | #68 |
| logs/evidence-server-tests.log | `npx vitest run --reporter=verbose` (server, all labs, own test database) | #68 |
| logs/evidence-client-tests.log | `npx vitest run --reporter=verbose` (client) | #68 |
| logs/evidence-server-build.log | `npm run build` (server) | #68 |
| logs/evidence-client-build.log | `npm run build` (client) | #68 |
| logs/evidence-e2e-all.log | `npx playwright test` (Lab 2, 3, 4) incl. `evidence-completion.spec.ts` (E2E-04, REG-04); produces the #68 screenshots | #68 |
| logs/release-staging-migrate-deploy.log | `npx prisma migrate deploy` on lab4-staging `7a0cb17` before the release PR | Release |
| logs/release-staging-server-tests.log | `npx vitest run` (server) on lab4-staging `7a0cb17` before the release PR | Release |
| logs/release-staging-client-tests.log | `npx vitest run` (client) on lab4-staging `7a0cb17` before the release PR | Release |
| logs/release-staging-server-build.log | `npm run build` (server) on lab4-staging `7a0cb17` before the release PR | Release |
| logs/release-staging-client-build.log | `npm run build` (client) on lab4-staging `7a0cb17` before the release PR | Release |
| logs/release-staging-e2e-all.log | `npx playwright test` (Lab 2, 3, 4) on lab4-staging `7a0cb17` before the release PR | Release |
| logs/final-main-migrate-deploy.log | `npx prisma migrate deploy` on main `b83e85b` after the release merge | Final |
| logs/final-main-server-tests.log | `npx vitest run --reporter=verbose` (server, every test named) on main `b83e85b` after the release merge | Final |
| logs/final-main-client-tests.log | `npx vitest run --reporter=verbose` (client, every test named) on main `b83e85b` after the release merge | Final |
| logs/final-main-server-build.log | `npm run build` (server) on main `b83e85b` after the release merge | Final |
| logs/final-main-client-build.log | `npm run build` (client) on main `b83e85b` after the release merge | Final |
| logs/final-main-e2e-all.log | `npx playwright test` (Lab 2, 3, 4) on main `b83e85b` after the release merge | Final |
| logs/release-evidence-staging-migrate-deploy.log | `npx prisma migrate deploy` on lab4-staging `aa74121` before the release PR #74 | Release #74 |
| logs/release-evidence-staging-server-tests.log | `npx vitest run --reporter=verbose` (server) on lab4-staging `aa74121` before #74 | Release #74 |
| logs/release-evidence-staging-client-tests.log | `npx vitest run --reporter=verbose` (client) on lab4-staging `aa74121` before #74 | Release #74 |
| logs/release-evidence-staging-server-build.log | `npm run build` (server) on lab4-staging `aa74121` before #74 | Release #74 |
| logs/release-evidence-staging-client-build.log | `npm run build` (client) on lab4-staging `aa74121` before #74 | Release #74 |
| logs/release-evidence-staging-e2e-all.log | `npx playwright test` (Lab 2, 3, 4) on lab4-staging `aa74121` before #74 | Release #74 |
| logs/final-main-evidence-migrate-deploy.log | `npx prisma migrate deploy` on main `ca4f614` after the #74 merge | Final |
| logs/final-main-evidence-server-tests.log | `npx vitest run --reporter=verbose` (server, every test named) on main `ca4f614` | Final |
| logs/final-main-evidence-client-tests.log | `npx vitest run --reporter=verbose` (client, every test named) on main `ca4f614` | Final |
| logs/final-main-evidence-server-build.log | `npm run build` (server) on main `ca4f614` | Final |
| logs/final-main-evidence-client-build.log | `npm run build` (client) on main `ca4f614` | Final |
| logs/final-main-evidence-e2e-all.log | `npx playwright test` (Lab 2, 3, 4) on main `ca4f614` | Final |
| logs/final-main-evidence-verify-dashboard-staff.log | `npm run verify:dashboard` as IT Staff (priya.nair) + Requester (jennifer.anderson) on main `ca4f614` | Final |
| logs/final-main-evidence-verify-dashboard-admin.log | `npm run verify:dashboard` as Administrator (olivia.grant, incl. user counts) + Requester (michael.brown) on main `ca4f614` | Final |
| logs/final-main-evidence-verify-dashboard-fixtures.log | `npm run verify:dashboard` as e2e.staff + Requester e2e.requester (fixture data) on main `ca4f614` | Final |

## Repository history
`git-graph.txt` - `git log --graph --oneline --decorate --all` after the second release merge (#74, `ca4f614`).

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
| screenshots/workflow-staff-control-1280.png | Staff Ticket Detail - status control offering only permitted transitions (submit disabled until a change) | 1280 | #53 |
| screenshots/workflow-staff-control-768.png | Staff Ticket Detail - status control offering only permitted transitions (submit disabled until a change) | 768 | #53 |
| screenshots/workflow-staff-control-320.png | Staff Ticket Detail - status control offering only permitted transitions (submit disabled until a change) | 320 | #53 |
| screenshots/workflow-staff-success-1280.png | Staff - status changed: badge refreshed, success message | 1280 | #53 |
| screenshots/workflow-staff-success-768.png | Staff - status changed: badge refreshed, success message | 768 | #53 |
| screenshots/workflow-staff-success-320.png | Staff - status changed: badge refreshed, success message | 320 | #53 |
| screenshots/workflow-staff-final-1280.png | Staff - CANCELLED Ticket: "No further changes" instead of a select | 1280 | #53 |
| screenshots/workflow-staff-final-768.png | Staff - CANCELLED Ticket: "No further changes" instead of a select | 768 | #53 |
| screenshots/workflow-staff-final-320.png | Staff - CANCELLED Ticket: "No further changes" instead of a select | 320 | #53 |
| screenshots/workflow-staff-gate-1280.png | Staff - RESOLUTION_GATE 422: reasons in plain words, status unchanged | 1280 | #53 |
| screenshots/workflow-staff-gate-768.png | Staff - RESOLUTION_GATE 422: reasons in plain words, status unchanged | 768 | #53 |
| screenshots/workflow-staff-gate-320.png | Staff - RESOLUTION_GATE 422: reasons in plain words, status unchanged | 320 | #53 |
| screenshots/workflow-staff-conflict-1280.png | Staff - 409 conflict banner with Reload after a colleague's change | 1280 | #53 |
| screenshots/workflow-staff-conflict-768.png | Staff - 409 conflict banner with Reload after a colleague's change | 768 | #53 |
| screenshots/workflow-staff-conflict-320.png | Staff - 409 conflict banner with Reload after a colleague's change | 320 | #53 |
| screenshots/workflow-requester-status-1280.png | Requester Ticket Detail - read-only status badge and resolved-signal note | 1280 | #53 |
| screenshots/workflow-requester-status-768.png | Requester Ticket Detail - read-only status badge and resolved-signal note | 768 | #53 |
| screenshots/workflow-requester-status-320.png | Requester Ticket Detail - read-only status badge and resolved-signal note | 320 | #53 |
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

### Evidence completion (#68)
| File | Screen | State | Width | Issue | AC (test) |
| --- | --- | --- | --- | --- | --- |
| screenshots/actions-staff-edit-1280.png | Staff Ticket Detail - Actions Taken | PLANNED action in edit mode, form pre-filled (description, assignee Sam Second) | 1280 | #68 | AC-17 (E2E-04) |
| screenshots/actions-staff-edit-768.png | Staff Ticket Detail - Actions Taken | PLANNED action in edit mode, form pre-filled (description, assignee Sam Second) | 768 | #68 | AC-17 (E2E-04) |
| screenshots/actions-staff-edit-320.png | Staff Ticket Detail - Actions Taken | PLANNED action in edit mode, form pre-filled (description, assignee Sam Second) | 320 | #68 | AC-17 (E2E-04) |
| screenshots/actions-staff-edit-saved-1280.png | Staff Ticket Detail - Actions Taken | After saving the edit: "Action updated.", new description and attachment notes, still Planned | 1280 | #68 | AC-17 (E2E-04) |
| screenshots/actions-staff-edit-saved-768.png | Staff Ticket Detail - Actions Taken | After saving the edit: "Action updated.", new description and attachment notes, still Planned | 768 | #68 | AC-17 (E2E-04) |
| screenshots/actions-staff-edit-saved-320.png | Staff Ticket Detail - Actions Taken | After saving the edit: "Action updated.", new description and attachment notes, still Planned | 320 | #68 | AC-17 (E2E-04) |
| screenshots/actions-staff-assign-1280.png | Staff Ticket Detail - Actions Taken | Create form, Assignee options shown as an open list (size attribute set by the test; a native popup is not captured headless): only active IT Staff/Administrators, inactive Mark Diaz absent | 1280 | #68 | AC-17, AC-04 (E2E-04) |
| screenshots/actions-staff-assign-768.png | Staff Ticket Detail - Actions Taken | Create form, Assignee options shown as an open list (size attribute set by the test; a native popup is not captured headless): only active IT Staff/Administrators, inactive Mark Diaz absent | 768 | #68 | AC-17, AC-04 (E2E-04) |
| screenshots/actions-staff-assign-320.png | Staff Ticket Detail - Actions Taken | Create form, Assignee options shown as an open list (size attribute set by the test; a native popup is not captured headless): only active IT Staff/Administrators, inactive Mark Diaz absent | 320 | #68 | AC-17, AC-04 (E2E-04) |
| screenshots/actions-staff-inactive-assignee-1280.png | Staff Ticket Detail - Actions Taken | Real API 400 VALIDATION for an inactive assignee shown under Assignee + form banner; typed description kept (the test rewrote only assigneeId in the request, since the UI never offers inactive users; see logs/inactive-assignee-api.log) | 1280 | #68 | AC-17, AC-04 (E2E-04) |
| screenshots/actions-staff-inactive-assignee-768.png | Staff Ticket Detail - Actions Taken | Real API 400 VALIDATION for an inactive assignee shown under Assignee + form banner; typed description kept (the test rewrote only assigneeId in the request, since the UI never offers inactive users; see logs/inactive-assignee-api.log) | 768 | #68 | AC-17, AC-04 (E2E-04) |
| screenshots/actions-staff-inactive-assignee-320.png | Staff Ticket Detail - Actions Taken | Real API 400 VALIDATION for an inactive assignee shown under Assignee + form banner; typed description kept (the test rewrote only assigneeId in the request, since the UI never offers inactive users; see logs/inactive-assignee-api.log) | 320 | #68 | AC-17, AC-04 (E2E-04) |
| screenshots/actions-staff-cancelled-1280.png | Staff Ticket Detail - Actions Taken | PLANNED action cancelled (the UI has no confirmation dialog): "Action cancelled.", status Cancelled, Locked, no row buttons | 1280 | #68 | AC-17, AC-06 (E2E-04) |
| screenshots/actions-staff-cancelled-768.png | Staff Ticket Detail - Actions Taken | PLANNED action cancelled (the UI has no confirmation dialog): "Action cancelled.", status Cancelled, Locked, no row buttons | 768 | #68 | AC-17, AC-06 (E2E-04) |
| screenshots/actions-staff-cancelled-320.png | Staff Ticket Detail - Actions Taken | PLANNED action cancelled (the UI has no confirmation dialog): "Action cancelled.", status Cancelled, Locked, no row buttons | 320 | #68 | AC-17, AC-06 (E2E-04) |
| screenshots/actions-staff-followup-error-1280.png | Staff Ticket Detail - Actions Taken | Follow-up required without a note: "Follow-up note is required (3-500 characters).", aria-invalid | 1280 | #68 | AC-17, AC-03 (E2E-04) |
| screenshots/actions-staff-followup-error-768.png | Staff Ticket Detail - Actions Taken | Follow-up required without a note: "Follow-up note is required (3-500 characters).", aria-invalid | 768 | #68 | AC-17, AC-03 (E2E-04) |
| screenshots/actions-staff-followup-error-320.png | Staff Ticket Detail - Actions Taken | Follow-up required without a note: "Follow-up note is required (3-500 characters).", aria-invalid | 320 | #68 | AC-17, AC-03 (E2E-04) |
| screenshots/actions-staff-followup-1280.png | Staff Ticket Detail - Actions Taken | Saved action with follow-up: "Yes: Install the cartridge when it arrives on Friday" | 1280 | #68 | AC-17 (E2E-04) |
| screenshots/actions-staff-followup-768.png | Staff Ticket Detail - Actions Taken | Saved action with follow-up: "Yes: Install the cartridge when it arrives on Friday" | 768 | #68 | AC-17 (E2E-04) |
| screenshots/actions-staff-followup-320.png | Staff Ticket Detail - Actions Taken | Saved action with follow-up: "Yes: Install the cartridge when it arrives on Friday" | 320 | #68 | AC-17 (E2E-04) |
| screenshots/regression-login-1280.png | Login (Lab 3) | Empty login form | 1280 | #68 | AC-21 (REG-04) |
| screenshots/regression-login-768.png | Login (Lab 3) | Empty login form | 768 | #68 | AC-21 (REG-04) |
| screenshots/regression-login-320.png | Login (Lab 3) | Empty login form | 320 | #68 | AC-21 (REG-04) |
| screenshots/regression-login-error-1280.png | Login (Lab 3) | Wrong password: error message, not signed in | 1280 | #68 | AC-21 (REG-04) |
| screenshots/regression-login-error-768.png | Login (Lab 3) | Wrong password: error message, not signed in | 768 | #68 | AC-21 (REG-04) |
| screenshots/regression-login-error-320.png | Login (Lab 3) | Wrong password: error message, not signed in | 320 | #68 | AC-21 (REG-04) |
| screenshots/regression-change-password-forced-1280.png | Change Password (Lab 3) | First login of an Administrator-created user: forced change form, no navigation | 1280 | #68 | AC-21 (REG-04) |
| screenshots/regression-change-password-forced-768.png | Change Password (Lab 3) | First login of an Administrator-created user: forced change form, no navigation | 768 | #68 | AC-21 (REG-04) |
| screenshots/regression-change-password-forced-320.png | Change Password (Lab 3) | First login of an Administrator-created user: forced change form, no navigation | 320 | #68 | AC-21 (REG-04) |
| screenshots/regression-my-tickets-1280.png | My Tickets (Lab 2) | List with filters: search "E2E-L4" + status New (works since #69) | 1280 | #68 | AC-21 (REG-04) |
| screenshots/regression-my-tickets-768.png | My Tickets (Lab 2) | List with filters: search "E2E-L4" + status New (works since #69) | 768 | #68 | AC-21 (REG-04) |
| screenshots/regression-my-tickets-320.png | My Tickets (Lab 2) | List with filters: search "E2E-L4" + status New (works since #69) | 320 | #68 | AC-21 (REG-04) |
| screenshots/regression-create-ticket-1280.png | Create Ticket (Lab 2) | Form filled with category, system, priority and a PNG attachment selected | 1280 | #68 | AC-21 (REG-04) |
| screenshots/regression-create-ticket-768.png | Create Ticket (Lab 2) | Form filled with category, system, priority and a PNG attachment selected | 768 | #68 | AC-21 (REG-04) |
| screenshots/regression-create-ticket-320.png | Create Ticket (Lab 2) | Form filled with category, system, priority and a PNG attachment selected | 320 | #68 | AC-21 (REG-04) |
| screenshots/regression-create-ticket-success-1280.png | Create Ticket (Lab 2) | Ticket created: success message | 1280 | #68 | AC-21 (REG-04) |
| screenshots/regression-create-ticket-success-768.png | Create Ticket (Lab 2) | Ticket created: success message | 768 | #68 | AC-21 (REG-04) |
| screenshots/regression-create-ticket-success-320.png | Create Ticket (Lab 2) | Ticket created: success message | 320 | #68 | AC-21 (REG-04) |
| screenshots/regression-staff-queue-1280.png | Ticket Queue (Lab 3) | Staff queue list | 1280 | #68 | AC-21 (REG-04) |
| screenshots/regression-staff-queue-768.png | Ticket Queue (Lab 3) | Staff queue list | 768 | #68 | AC-21 (REG-04) |
| screenshots/regression-staff-queue-320.png | Ticket Queue (Lab 3) | Staff queue list | 320 | #68 | AC-21 (REG-04) |
| screenshots/regression-staff-ticket-detail-1280.png | Staff Ticket Detail (Lab 3) | Owner Erin Staff, IT priority High, attachment, public comment and internal note (staff only) | 1280 | #68 | AC-21 (REG-04) |
| screenshots/regression-staff-ticket-detail-768.png | Staff Ticket Detail (Lab 3) | Owner Erin Staff, IT priority High, attachment, public comment and internal note (staff only) | 768 | #68 | AC-21 (REG-04) |
| screenshots/regression-staff-ticket-detail-320.png | Staff Ticket Detail (Lab 3) | Owner Erin Staff, IT priority High, attachment, public comment and internal note (staff only) | 320 | #68 | AC-21 (REG-04) |
| screenshots/regression-ticket-detail-requester-1280.png | Ticket Detail (Lab 2/3, Requester) | Attachment, staff and requester public comments; the internal note is not shown | 1280 | #68 | AC-21 (REG-04) |
| screenshots/regression-ticket-detail-requester-768.png | Ticket Detail (Lab 2/3, Requester) | Attachment, staff and requester public comments; the internal note is not shown | 768 | #68 | AC-21 (REG-04) |
| screenshots/regression-ticket-detail-requester-320.png | Ticket Detail (Lab 2/3, Requester) | Attachment, staff and requester public comments; the internal note is not shown | 320 | #68 | AC-21 (REG-04) |
| screenshots/regression-admin-users-1280.png | User Management (Lab 3) | User list incl. inactive users (the table scrolls inside its box at 320px since #71) | 1280 | #68 | AC-21 (REG-04) |
| screenshots/regression-admin-users-768.png | User Management (Lab 3) | User list incl. inactive users (the table scrolls inside its box at 320px since #71) | 768 | #68 | AC-21 (REG-04) |
| screenshots/regression-admin-users-320.png | User Management (Lab 3) | User list incl. inactive users (the table scrolls inside its box at 320px since #71) | 320 | #68 | AC-21 (REG-04) |
| screenshots/regression-admin-users-self-protect-1280.png | User Management (Lab 3) | Admin tries to deactivate their own account: "You cannot deactivate your own account." (the last-Administrator message is not reachable without deactivating the seeded admin Olivia Grant, so it is not captured) | 1280 | #68 | AC-21 (REG-04) |
| screenshots/regression-admin-users-self-protect-768.png | User Management (Lab 3) | Admin tries to deactivate their own account: "You cannot deactivate your own account." (the last-Administrator message is not reachable without deactivating the seeded admin Olivia Grant, so it is not captured) | 768 | #68 | AC-21 (REG-04) |
| screenshots/regression-admin-users-self-protect-320.png | User Management (Lab 3) | Admin tries to deactivate their own account: "You cannot deactivate your own account." (the last-Administrator message is not reachable without deactivating the seeded admin Olivia Grant, so it is not captured) | 320 | #68 | AC-21 (REG-04) |
