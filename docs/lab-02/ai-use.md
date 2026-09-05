# AI Use — Lab 2

## Tools Used

I used Claude (Anthropic's AI assistant) through most of this sprint, in the same way as Lab 1: as a pair-programming/tutoring tool, not as something that wrote the whole project on its own. I typed or pasted every line into my own VS Code and ran every command myself in Git Bash — nothing was automated on Claude, on purpose (I asked for this mode so I'd actually understand what I was doing).

## How I Used It

| Area | What I asked for | What I actually did |
| --- | --- | --- |
| Planning | Breaking the labsheet into 6 GitHub Issues, one per screen/feature | Created and managed the Issues/branches/PRs myself |
| Specs (specification.md, tests.md, ui-spec.md, api-spec.md) | Drafting the 4 docs | Reviewed them and approved the final versions |
| Database design | Explaining Prisma models/relations and writing the schema | Typed the schema myself, ran every migration and seed command, read the generated SQL |
| Backend routes | Code for each Express route (tickets, attachments, dev-requesters, related-systems) | Typed every file, tested each route by hand with curl/browser before trusting it |
| Frontend components | Code for RequesterSelect, CreateTicket, MyTickets, TicketDetail | Typed every file, manually tested every screen at every step (loading/empty/error/success states) |
| Tests | Vitest unit/API/UI tests, Playwright E2E tests | Ran them myself after every change, only moved on once they passed |
| Debugging | Fixing syntax errors from my own copy-paste mistakes (missing `<a` tag, truncated file, wrong folder from VS Code's compact-folder view) | Diagnosed together — Claude pointed at the error, I found/fixed the exact broken line myself in a few cases |
| Concepts I didn't know | Explanations of things like React Context, debounce, multer, soft-delete, Prisma relations, Playwright locators | Asked "why" a lot, made sure I could explain it back before moving on |

## What I Did Not Use AI For

- Actually running the commands, clicking through the app, and reading terminal/browser output — that was all me, every step.
- Deciding when something was "done enough" to commit — I made that call each time, sometimes after finding bugs Claude's first draft didn't catch (e.g. it took me pointing out visible issues, like the mobile table overflow, before we fixed it).
- The Git workflow itself (branches, PRs, merges, moving cards on the board) — I did every click.

## Honest Reflection


Doing everything by hand (typing every file myself, running every command, testing every screen) was slower than letting an agent handle it end-to-end, but it meant I actually followed what was happening at each step. Copy-pasting large code blocks caused a few real bugs (a dropped `<a` tag, a truncated file) that I had to notice and fix myself — annoying in the moment, but it forced me to read the code instead of just trusting it. I still relied on AI heavily for boilerplate (validation functions, Express routes, React state management) since writing all of that from scratch without ever having done it before would've taken way longer than the sprint allowed.