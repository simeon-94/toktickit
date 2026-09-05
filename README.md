# TokTickIT — Requester Ticketing MVP

A full-stack IT ticketing app: React + Vite + Bootstrap UI -> Express + TypeScript REST API -> Prisma -> PostgreSQL.

Lab 1 proved the stack works end to end (health check, categories). Lab 2 adds the Requester-facing app: a temporary Development Requester selector, creating tickets with attachments, searching/filtering/sorting My Tickets, and a Ticket Detail screen with attachment management.

## Prerequisites
- Node.js 18+, PostgreSQL, Git

## Backend

```
cd server
cp .env.example .env   # set DATABASE_URL
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev             # http://localhost:4000
```

## Frontend

```
cd client
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

## Tests

```
cd server && npm test
cd client && npm test
```

## End-to-End Tests (Playwright)

The `e2e` folder is a separate package from `client` and `server`. First-time setup:

```
cd e2e
npm install
npx playwright install chromium
```

Then, with both the server and client already running (`npm run dev` in each), run:

```
cd e2e
npx playwright test
```