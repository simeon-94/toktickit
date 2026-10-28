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
