# Lab 4 Evidence Index

Evidence is produced from real runs only. Every log starts with the command, commit hash, branch
and UTC date, and ends with the process exit code. Screenshots are taken by Playwright at
1280 / 768 / 320 px from the running app with seeded data.

## Logs (`logs/`)
| File | What | Issue |
| --- | --- | --- |
| logs/issue-51-server-tests.log | `npx vitest run` (server, all labs) | #51 |
| logs/issue-51-client-tests.log | `npx vitest run` (client) | #51 |
| logs/issue-51-server-build.log | `npm run build` (server) | #51 |
| logs/issue-51-client-build.log | `npm run build` (client) | #51 |
| logs/verify-dashboard.log | `npx tsx scripts/verify-dashboard.ts` - every dashboard metric vs raw SQL | #51 |

## Screenshots (`screenshots/`)
| File | Screen / state | Width | Issue |
| --- | --- | --- | --- |
