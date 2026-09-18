# Lab 3 UI Specification (Zen Green Theme — extends Lab 2)

## 1. Reused from Lab 2
Color tokens, typography, spacing, field states, required-field markers, button hierarchy,
attachment UI, screen-state model (loading/validation/submitting/success/failure), and responsive
breakpoints (desktop ≥992px, tablet 768-991px, mobile <768px) are unchanged from Lab 2's
ui-spec.md. See that file for the full token table.

## 2. New Badge Types
- **Role badge**: Requester (gray), IT Staff (blue), Administrator (dark green) — text always
  included, never color-only.
- **Current Status badge**: one color family per status group — New/Open/Reopened (blue),
  In Progress/Waiting for Requester (amber), Resolved/Closed (green), Cancelled (gray).
- **IT Priority badge**: same LOW/MEDIUM/HIGH styling as Requested Priority, placed right next to
  it so the two are easy to compare, never confused visually.

## 3. Application Shell
- Header right side: authenticated user's name + role badge, replacing "Signed in as [Dev
  Requester]" from Lab 2. A "Profile ▾" menu holds Logout.
- Navigation shows only permitted destinations: Requester sees Create Ticket / My Tickets;
  IT Staff sees My Queue / Create Ticket (still allowed to file their own); Administrator sees
  Admin (User Management). No destination is rendered then blocked — it's simply absent.

## 4. Login Screen
- Email + password fields, "Sign In" primary button, busy state ("Signing in..." + spinner,
  disabled button).
- Invalid credentials or inactive account: one generic red message under the form ("Invalid email
  or password. Please try again.") — never distinguishes which case, never mentions "inactive".
- Safe failure state if the API is unreachable, same pattern as Lab 2's Create Ticket.

## 5. Mandatory Change Password Screen
- Shown immediately after login if mustChangePassword is true; no way to reach any other screen
  until it succeeds.
- Fields: current (temporary) password, new password, confirm new password.
- Live password-rule checklist (8+ chars, upper+lower, number, special character), each rule
  ticks green once satisfied.
- On success: continues straight into the app (no separate "success" screen needed, just moves
  on) — matches the mock in the labsheet.

## 6. IT Staff Ticket Queue
- Columns (desktop table): Ticket No., Created Date, Summary, Category, Requested Priority,
  IT Priority, Current Status, Ticket Owner, Last Updated. Justification: this is the set IT Staff
  actually need to triage work; Related System and Description are one click away in Ticket Detail
  and would make the grid unreadable here.
- Search (ticket number/summary), a Filters control (status, IT Priority, ownership: mine /
  unassigned / all), sort control, pagination — same pattern as Lab 2's My Tickets.
- Unassigned tickets show an "Unassigned" tag instead of an owner name.
- Mobile: becomes a stack of cards (Ticket No., Summary, Status + IT Priority badges, Owner),
  same approach as Lab 2's My Tickets cards.
- Empty (queue has nothing yet), no-results (filters matched nothing), and safe-failure states,
  same visual language as Lab 2.

## 7. IT Staff Ticket Detail
- Extends the Lab 2 Ticket Detail layout: header info block (read-only), then an operational
  block that's now editable for IT Staff: Ticket Owner (dropdown of active IT Staff/Admin, plus
  "Claim" shortcut button if unassigned), IT Priority (dropdown), Current Status (dropdown limited
  to permitted next states).
- Below that, two visually separated panels:
  - **Public Comments** — pale-green card background, visible label "Public — visible to
    Requester", a text box + "Post Comment" button, entries show author name + role badge +
    timestamp.
  - **Internal Notes** — pale-amber card background with a small lock icon and the label
    "Internal — staff only, never shown to the Requester", same posting pattern.
- Existing Attachments list from Lab 2 stays as-is (download/remove), unaffected by this lab.
- Status changes that matter (e.g. moving to Resolved/Closed/Cancelled) ask for a one-line
  confirmation before applying.

## 8. Requester Ticket Detail (regression + additions)
- Same read-only layout as Lab 2, Requester can no longer edit Ticket Owner/IT Priority/Status
  (those fields, if shown at all, are read-only for this role).
- Adds a Public Comments panel (same pale-green styling as the Staff view, so it's recognizably
  the same feature) and a "Problem Appears Resolved" button. Clicking it shows a short confirm,
  then a pale-green confirmation banner ("Thanks — IT Staff will follow up."); it does not change
  the visible Current Status badge.
- No Internal Notes panel is rendered for this role at all.

## 9. Administrator User Management
- Single screen, two-panel layout (list left, create/edit panel right), matching the labsheet's
  mock: Users list (Name, Email, Role, Status, Edit) + search box + role filter dropdown + "Create
  User" button opening the right-hand panel.
- Create/Edit panel: Full Name, Email, Role (select), Active (toggle), and for create only, an
  Initial Password field; a "Deactivate User" destructive button appears only when editing.
- Validation: duplicate email shown inline under the Email field; invalid role rejected the same
  way.
- Self-deactivation and last-Administrator deactivation attempts are blocked with a clear inline
  message, not just prevented silently.
- Mobile: the two panels stack vertically (list on top, create/edit panel below, opened by
  tapping a row or "Create User").

## 10. Visual Inspection Checklist
- [ ] Role badge always shows text, never color-only
- [ ] Public Comments and Internal Notes are never visually confusable
- [ ] No screen exposes an action the current role isn't permitted to use
- [ ] Editable vs read-only fields stay visually distinct on every new screen
- [ ] No clipped text/overlap at desktop, tablet, or mobile
- [ ] Screenshots captured for Login, Change Password, Queue, Ticket Detail (staff), User
      Management at all three breakpoints