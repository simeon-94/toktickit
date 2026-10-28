# Lab 4 UI Specification

Zen Green theme from Labs 2-3 is kept (same Bootstrap tokens, badges, cards, tables, buttons,
loading/empty/error patterns). No new visual language is introduced.

## 0. Routing note
The app has no URL router: screens are switched through the `view` state in `App.tsx`. A drill-down
therefore means "switch to the target view and pass an initial filter object" (e.g. view
`staffQueue` with `{ ownerId: "me", statusGroup: "open" }`). Paths such as `/staff/queue?...` in
this spec and in api-spec.md are shorthand for that view + filter pair; filters are sent to the API
as the query parameters named in api-spec.md. Adding a real router is out of scope.

## 1. Navigation
- Requester nav: **Dashboard** (new, default landing page after login), My Tickets, Create Ticket, Change Password, Logout.
- IT Staff nav: **Dashboard** (new, default landing), Ticket Queue, Change Password, Logout.
- Administrator nav: Dashboard, Ticket Queue, Users, Change Password, Logout.
- The active page has `aria-current="page"` and a visible highlight (not colour alone: underline/bold).
- Header must not clip at 320px (collapse into a toggle or wrap).

## 2. IT Staff Dashboard (`/staff/dashboard`)
Layout: heading "Dashboard"; a responsive grid of metric cards, then three lists.
- Cards (each is a single `<a>` with label, large value, and "View" affordance): Unassigned open, Owned by me, Urgent (High IT priority), Planned actions (mine), Follow-ups open.
- Status breakdown: small table/list of 8 statuses with counts, each count a link to the queue.
- IT priority breakdown: High/Medium/Low counts with text labels (not colour-only).
- Lists (max 5 each, each row links to Ticket Detail): Urgent Tickets, Recently updated, My planned actions.
- Administrator additionally sees a "Users" card (active/inactive + per-role counts) linking to Users.
- Responsive: 1280px = 4-5 cards per row; 768px = 2 per row; 320px = 1 per row, tables become stacked lists. No horizontal page scroll.
- States: loading ("Loading dashboard..." with role=status), empty (cards show 0, lists show "Nothing to show"), forbidden (Requester opening staff URL -> "You do not have access to this page" + link to own dashboard), failure ("Could not load the dashboard." + Retry button).
- data-testids: `staff-dashboard`, `dash-card-unassigned`, `dash-card-owned`, `dash-card-urgent`, `dash-card-planned-actions`, `dash-card-followups`, `dash-status-row-<STATUS>`, `dash-list-urgent`, `dash-list-recent`, `dash-list-my-actions`, `dash-users-card`, `dash-loading`, `dash-error`, `dash-forbidden`, `dash-retry`.

## 3. Requester Dashboard (`/dashboard`)
- Cards: Open tickets, Waiting for you, Recently resolved (7 days). Each links to My Tickets with the matching filter.
- Lists (max 5): "Needs your attention" (Waiting for Requester), "Recently updated", "Recently resolved".
- Must not duplicate the full My Tickets table (no pagination/search here); include a "View all tickets" link.
- States identical to section 2 (empty: "No tickets yet" + "Create a ticket" button).
- data-testids: `req-dashboard`, `req-card-open`, `req-card-waiting`, `req-card-resolved`, `req-list-attention`, `req-list-recent`, `req-list-resolved`, `req-dash-loading`, `req-dash-error`, `req-dash-forbidden`, `req-dash-retry`.

## 4. Actions Taken on Staff Ticket Detail
New card "Actions Taken" placed between Ticket summary/controls and Comments/Notes, visually distinct from
private Internal Notes (neutral border + "Visible to Requester" label; Internal Notes keep their "Private" label).
- **List mode** (default): table at >=992px, stacked cards at <992px (CL-03). Columns: Action date/time (Asia/Bangkok), Description, Result, Performed by, Assignee, Status badge (text + colour), Follow-up (Yes/No + note), Attachment notes. Order = actionAt desc, id desc.
- Row actions (staff only, PLANNED rows): Edit, Complete, Cancel. COMPLETED/CANCELLED rows are read-only (no buttons, a "Locked" text cue).
- **Create mode**: "Add action" opens an inline form (not a modal) with: Action date/time (default now), Description*, Assignee (select of active staff, default me), Follow-up required? (checkbox), Follow-up note (shown/required only when checked), Attachment notes. Performed by is shown read-only ("Performed by: <me>"). Submit disables while pending (prevents double click); `clientRequestId` generated per form open.
- **Edit mode**: same form pre-filled for a PLANNED action; sends `expectedVersion`.
- **Complete**: small inline form asking for Result* (required) then Confirm.
- Validation messages appear under their field with `role=alert`, `aria-invalid`, and are linked via `aria-describedby`. Entered data is kept after a recoverable failure (400/409/500).
- 409 -> banner "This item was changed by someone else. Reload to see the latest version." with a Reload button (re-fetches, keeps the user's draft text visible in the form).
- Empty state: "No actions recorded yet." Loading: "Loading actions...". Failure: error message + Retry.
- Requester Ticket Detail: same list, read-only, no buttons, no assignee select; heading "Actions Taken".
- data-testids: `actions-panel`, `actions-loading`, `actions-empty`, `actions-error`, `action-row`, `action-status`, `action-add-btn`, `action-form`, `action-description`, `action-assignee`, `action-followup-required`, `action-followup-note`, `action-attachment-notes`, `action-submit`, `action-cancel-form`, `action-edit-btn`, `action-complete-btn`, `action-cancel-btn`, `action-result`, `action-complete-confirm`, `action-error-<field>`, `conflict-banner`, `conflict-reload`.

## 5. Ticket Workflow Controls
- The status control lists only the current status (disabled/selected) plus permitted next statuses from the matrix (L4-BR-12); terminal statuses (CANCELLED) show a "No further changes" text.
- Sending sends `expectedVersion`; on success the summary badge and `version` refresh immediately.
- `RESOLUTION_GATE` 422 -> inline alert listing reasons in plain words ("Assign a Ticket Owner", "Complete at least one action", "Complete or cancel planned actions").
- `INVALID_TRANSITION` -> alert "That change is not allowed from <status>"; 409 -> conflict banner as above.
- Requesters see status as a read-only badge plus the existing "Problem appears resolved" button (advisory; text clarifies staff will confirm).
- data-testids: `status-select` (`staff-status-select` on Staff Ticket Detail, CL-04), `status-submit`, `status-error`, `status-gate-reasons`, `ticket-status-badge`, `no-further-changes`.

## 6. Feedback Conventions (all screens)
Loading (`role=status`), validation (inline), success (dismissible toast/alert `role=status`), empty / no results,
forbidden (403 view), conflict (409 banner), not found (404 view with link back), safe API failure (generic
message, Retry; no stack traces or raw server text).

## 7. Responsive and Accessibility Rules (same as Labs 2-3)
Widths tested: 1280, 768, 320. No horizontal page scroll, no clipped or overlapping controls, tap targets >= 40px,
visible keyboard focus on every control, logical tab order, labels bound to inputs, status/priority never
colour-only, modal dialogs avoided (inline forms used instead), contrast >= 4.5:1 for text.
Remove leftovers: temporary buttons, duplicate headings, "TODO"/lorem text, obsolete dev controls.

## 8. Visual and Accessibility Checklist (completed at the end; copy into Part 9)
| # | Item | Dashboards | Actions Taken | Workflow | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Zen Green tokens/components reused | | | | |
| 2 | Active nav indicated | | | | |
| 3 | Editable vs read-only fields distinguishable | n/a | | | |
| 4 | Validation next to field, linked by aria | n/a | | | |
| 5 | Visible keyboard focus | | | | |
| 6 | No clipping/overlap at 320/768/1280 | | | | |
| 7 | No horizontal page scroll | | | | |
| 8 | Non-colour status cues | | | | |
| 9 | Private vs shared content distinguished | n/a | | | |
| 10 | No console errors / placeholder text | | | | |
