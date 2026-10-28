# Lab 4 AI Use

**LLMs used:** Claude (Anthropic) - Claude Code as coding agent; Claude chat/Cowork as specification and project-planning agent.

## Key Prompts (6-10, filled as the sprint progresses)
| # | Agent | Prompt (short) | Result / how it was used |
| --- | --- | --- | --- |
| 1 | Specification agent | Turn the Lab 4 handout into specification.md, api-spec.md, ui-spec.md, tests.md | TODO |
| 2 | Coding agent (Claude Code) | Issue #50: implement the L4-BR-12 matrix, L4-BR-13 gate and `expectedVersion` checks test-first; edit Lab 3 tests only per CHG-xx | Wrote UNIT-01/02 and WF-01..08 first (8 failing), then `ticketWorkflow.ts` and the status/owner/priority routes; one Lab 3 test needed CHG-02, no CHG-01 edit was needed. Kept: all of it after reviewing the check order against api-spec section 6 |
| 3 | Coding agent (Claude Code) | Issue #51: build the requester and IT Staff dashboard APIs test-first, with counts verified against raw SQL | The agent stopped on two contract gaps (null itPriority drill-down; action cards without a drill-down total) and asked; I chose an additive `effectivePriority` filter (CL-01) and it implemented `/api/staff/actions` (CL-02) as a separate commit. Kept, with the contract updated in the same PR |
| 4 | Coding agent (Claude Code) | Issue #52: build the Actions Taken panel per ui-spec section 4 test-first, then take Playwright screenshots of every state at 1280/768/320 | Wrote UI-01..04/STYLE-01 first, then the component; reviewing its own screenshots it found mid-word wrapping at 1280px and clipped row buttons at 768px, fixed them and recorded the 992px breakpoint as CL-03 instead of deviating silently. Kept |
| 5 | Coding agent (Claude Code) | Issue #53: status control per ui-spec section 5 test-first (only permitted transitions, gate/422/409 feedback), plus screenshots at 1280/768/320 | Wrote UI-05/06 first; to keep the Lab 3 StaffTicketDetail test unedited it kept that test id and recorded CL-04. Its own 768px screenshot check caught the select overflowing its column, which it fixed. Kept |

## My Reflection
TODO (specification-agent use, coding-agent use, what I corrected, what I would do differently).
