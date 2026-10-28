# Lab 4 Evidence Index

Evidence is produced from real runs only. Every log starts with the command, commit hash, branch
and UTC date, and ends with the process exit code. Screenshots are taken by Playwright at
1280 / 768 / 320 px from the running app with seeded data.

## Logs (`logs/`)
| File | What | Issue |
| --- | --- | --- |
| logs/issue-50-server-tests.log | `npx vitest run` (server, all labs) | #50 |
| logs/issue-50-client-tests.log | `npx vitest run` (client) | #50 |
| logs/issue-50-server-build.log | `npm run build` (server) | #50 |
| logs/issue-50-client-build.log | `npm run build` (client) | #50 |

## Screenshots (`screenshots/`)
| File | Screen / state | Width | Issue |
| --- | --- | --- | --- |
