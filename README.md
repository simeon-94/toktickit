# TokTickIT — IT Service Desk

A full-stack IT ticketing app: React + Vite + Bootstrap UI -> Express + TypeScript REST API -> Prisma -> PostgreSQL.

- **Lab 1:** stack proof (health check, categories).
- **Lab 2:** Requesters create tickets with attachments, search/filter/sort My Tickets, Ticket Detail.
- **Lab 3:** login and roles (Requester, IT Staff, Administrator), staff queue, ownership, comments and internal notes, user management.
- **Lab 4:** Actions Taken per Ticket, the status transition matrix with a resolution gate and stale-update protection, role dashboards with drill-downs, and final hardening. The engineering contract is in `docs/lab-04/`; evidence (logs, screenshots) is in `artifacts/lab-04/` (see `artifacts/lab-04/INDEX.md`).

## Prerequisites
- Node.js 18+, Git
- PostgreSQL 13+ with a user that may create databases (the server tests create their own database)

## 1. Database and API

```
createdb -U postgres toktickit          # or create it in pgAdmin / psql
cd server
cp .env.example .env                    # set DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate deploy               # applies all migrations, incl. lab4_actions_taken
npx prisma db seed                      # idempotent: safe to run again
npm run dev                             # http://localhost:4000
```

The server checks `JWT_SECRET` and `JWT_EXPIRES_IN` at startup and stops with a clear message if they are missing or invalid.

**Rollback of the Lab 4 migration** (removes Actions Taken and `Ticket.version`): take a `pg_dump` first, then
`npx prisma db execute --file ../docs/lab-04/rollback.sql --schema prisma/schema.prisma`.

## 2. Client

```
cd client
cp .env.example .env
npm install
npm run dev                             # http://localhost:5173
```

## 3. Demo accounts

The seed creates these accounts with the local development password `ChangeMe123!`. Each one must set a new password at first login; the API refuses every other request until it does.

| Role | Accounts |
| --- | --- |
| Requester | jennifer.anderson@example.com, michael.brown@example.com, sarah.johnson@example.com, david.lee@example.com (no tickets: shows the empty dashboard) |
| IT Staff | priya.nair@example.com, tom.walker@example.com, lisa.chen@example.com |
| Administrator | olivia.grant@example.com |
| Inactive (cannot log in) | alex.turner@example.com (Requester), mark.diaz@example.com (IT Staff) |

For tests and screenshots there are also fixture accounts (`e2e.requester`, `e2e.requester.empty`, `e2e.staff`, `e2e.staff2`, `e2e.admin`, all `@example.com`) with the test password from `server/tests/helpers/testAuth.ts`. Create or reset them with `cd server && npm run e2e:fixtures`. They only touch their own users and `E2E-L4-*` Tickets.

## 4. Tests

```
cd server && npm test                   # unit + API tests, Labs 1-4
cd client && npm test                   # component tests, Labs 1-4
cd server && npm run build              # tsc
cd client && npm run build              # tsc + vite build
```

The server suite never uses the dev database. Before each run it drops, recreates, migrates and seeds its own database: by default the `DATABASE_URL` database name plus `_test` (e.g. `toktickit_test`), or `TEST_DATABASE_URL` if set. As a safety check it refuses any database whose name does not end with `_test`. The migration tests use one more throw-away database (`toktickit_l4_scratch`).

## 5. End-to-end tests (Playwright)

`e2e` is a separate package. First-time setup:

```
cd e2e
npm install
npx playwright install chromium
```

Start the API and the client (`npm run dev` in `server` and `client`), then:

```
cd e2e
npx playwright test                     # Lab 2, 3 and 4 suites
```

A global setup creates the fixture accounts and Tickets in the dev database first. The Lab 4 specs also save the responsive screenshots (1280 / 768 / 320 px) to `artifacts/lab-04/screenshots/`.

## 6. Dashboard verification

```
cd server
npm run verify:dashboard -- priya.nair@example.com jennifer.anderson@example.com
npm run verify:dashboard -- olivia.grant@example.com michael.brown@example.com   # Administrator: also checks user counts
```

The script computes every dashboard metric through the API code and through independent raw SQL. It prints both values and exits with 1 if any of them differ.
