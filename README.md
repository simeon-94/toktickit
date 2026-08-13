# TokTickIT — Lab 1: Full-Stack Hello World Starter

A vertical slice proving the stack works end to end: React + Vite + Bootstrap
UI -> Express + TypeScript REST API -> Prisma -> PostgreSQL.

## Prerequisites
- Node.js 18+, PostgreSQL, Git

## Backend
```
cd server
cp .env.example .env   # set DATABASE_URL
npm install
npx prisma migrate dev --name init
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
