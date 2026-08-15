# Lab 1 — AI Use and Reflection

I used Claude (Claude Sonnet 5) as an AI coding assistant to help scaffold parts of the TokTickIT Lab 1 project.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| --- | --- | --- |
| Plan Lab 1 Implementation | Summarize the four GitHub Issues, their dependencies, and the required tests, and propose an implementation order. | Gave me a clear plan before I started. |
| Set Up Full-Stack Project | Scaffold the React/Vite/Bootstrap frontend and Express/TypeScript backend with Prisma, following the required folder structure. | Good starting point; I reviewed the files and set up my own .env configuration. |
| Implement Health Check | Suggest an implementation for GET /api/health and its Supertest test. | Worked once I had my local backend running. |
| Implement Category Feature | Suggest the Prisma Category model, migration, and an idempotent seed script. | I had to install and configure PostgreSQL myself (PATH, password) before this would run. |
| Build and Test Check System UI | Suggest a Bootstrap Check System button with loading/success/error states and Vitest tests. | I tested the success and error cases manually in the browser before accepting it. |
| Review Final Lab 1 Work | Review the implementation against the acceptance criteria. | Helped me double-check the endpoints before finishing. |

## Overall reflection

I used the AI assistant mainly to speed up scaffolding and to keep the Git workflow organized. I set up and debugged the local environment myself (PostgreSQL installation, PATH, .env files), ran and verified all the tests, and reviewed each change before merging on GitHub.
