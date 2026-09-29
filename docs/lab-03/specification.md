# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal
This sprint replaces the fake Development Requester picker with real login, and adds two new
roles: IT Staff (who work tickets from a shared queue) and Administrator (who manage user
accounts). Every existing Lab 2 feature keeps working, but now driven by a real authenticated
identity instead of a client-supplied requesterId.

## 2. Stakeholder Request Interpretation
IT wants real accounts instead of the dev-only picker. Admins need a simple screen to create/edit
users, assign one role, and reset passwords. Requesters keep doing what they did in Lab 2, just
logged in for real. IT Staff need a queue to find tickets, claim them, set priority, change status,
and talk to the Requester (public) or each other (private notes). Nothing here should be enforced
only in the UI — the backend has to check role and ownership on every request.

## 3. Scope

Included:
- Login, logout, current-user, mandatory password change on first login
- Migrating DevRequester rows into a real User model with hashed passwords
- Role-based authorization (Requester / IT Staff / Administrator) enforced server-side
- Requester: unchanged Lab 2 functions + Public Comments + "Problem Appears Resolved"
- IT Staff: Ticket Queue, Ticket Detail (claim/reassign, IT Priority, status, comments, notes)
- Administrator: minimal User Management (list, create, edit, activate/deactivate, reset password)

Excluded (deferred, not forgotten):
- Email invitations, password-reset emails, MFA, social login, SSO
- Self-registration
- Actions Taken (Lab 4)
- SLA/escalation rules, dashboards/KPIs beyond simple counts
- Multiple roles per user, user deletion, bulk ops, import/export, audit history
- Pagination/multi-sort/multi-filter on the Admin user list

## 4. Functional Requirements
- FR-01: A user logs in with email + password and gets an authenticated session.
- FR-02: A user with an initial password must set a new password before using the app.
- FR-03: A user can log out, which invalidates their access immediately.
- FR-04: The app always knows "who am I" via a current-user endpoint, never via a client-sent id.
- FR-05: Each role sees only the navigation/actions permitted for that role.
- FR-06: A Requester creates and manages only their own Tickets and Attachments, same as Lab 2.
- FR-07: A Requester can post a Public Comment on their own Ticket.
- FR-08: A Requester can mark a Ticket as "problem appears resolved" without closing it.
- FR-09: IT Staff can see a Ticket Queue of tickets (search/filter/sort/paginate).
- FR-10: IT Staff can claim an unassigned Ticket or reassign an already-owned one.
- FR-11: IT Staff can set IT Priority, independent of Requested Priority.
- FR-12: IT Staff can change Ticket status along the permitted transitions.
- FR-13: IT Staff can post Public Comments and private Internal Notes on a Ticket.
- FR-14: An Administrator can list/search/filter users by role.
- FR-15: An Administrator can create a user with one role and an initial password.
- FR-16: An Administrator can edit a user's name/email/role/active state.
- FR-17: An Administrator can set a new initial password for a user (forces change at next login).
- FR-18: An Administrator cannot deactivate themselves or remove the last active Administrator.

## 5. Business Rules
- BR-01: Only an active user with valid credentials may authenticate.
- BR-02: A user with mustChangePassword=true cannot use any screen except Change Password.
- BR-03: Ownership of Requester operations always comes from the authenticated user, never a
  requesterId supplied by the client.
- BR-04: Public Comments are visible to Requester, IT Staff, Administrator. Internal Notes are
  visible only to IT Staff and Administrator.
- BR-05: A Requester may indicate a problem appears resolved, but only IT Staff/Administrator can
  set status to Resolved or Closed.
- BR-06: Passwords are hashed with bcrypt; plaintext passwords are never stored or logged.
- BR-07: Login with wrong credentials or an inactive account returns the same generic error —
  never reveals whether the email exists or why it failed.
- BR-08: Email addresses are unique across all users, case-insensitive.
- BR-09: New passwords must be at least 8 characters with upper+lower case, a number, and a
  special character.
- BR-10: A Ticket has zero or one Ticket Owner, who must be an active IT Staff or Administrator.
- BR-11: Requested Priority is set once by the Requester at creation and never changes. IT
  Priority starts equal to Requested Priority and can only be changed by IT Staff/Administrator.
- BR-12: Ticket status must follow the permitted transition matrix (see §7); invalid transitions
  are rejected.
- BR-13: Public Comments and Internal Notes are append-only (no edit, no delete) and reject
  empty/whitespace-only content.
- BR-14: An Administrator cannot deactivate their own account.
- BR-15: The system always keeps at least one active Administrator; the last one cannot be
  deactivated or have their role changed.
- BR-16: Administrators manage users; they are not automatically IT Staff and cannot perform IT
  Staff Ticket operations.
- BR-17: All Lab 2 ownership/validation rules for Tickets and Attachments still apply, just scoped
  to the authenticated user instead of a query-param requesterId.

## 6. UI Specification Summary
Reuses the Zen Green theme. New screens: Login, Change Password, IT Staff Ticket Queue, IT Staff
Ticket Detail (extends Lab 2's Ticket Detail), Administrator User Management. The app shell shows
the authenticated user's name/role and a Logout action instead of "Change Requester". Full detail
in ui-spec.md.

## 7. Data Changes
- **User** (evolved from DevRequester, same ids preserved): id, name, email (unique), passwordHash,
  role (REQUESTER | IT_STAFF | ADMINISTRATOR), isActive, mustChangePassword, createdAt, updatedAt
- **Ticket**: add ticketOwnerId (nullable FK -> User), requesterId now FK -> User (was DevRequester),
  currentStatus enum expands to New/Open/InProgress/WaitingForRequester/Resolved/Closed/Reopened/
  Cancelled, add requesterIndicatedResolved (boolean, default false)
- **PublicComment**: id, ticketId FK, authorId FK -> User, content, createdAt
- **InternalNote**: id, ticketId FK, authorId FK -> User, content, createdAt

Migration: the DevRequester table/model is renamed to User with new columns added (role,
passwordHash, mustChangePassword). Existing rows get role=REQUESTER, isActive kept as-is,
mustChangePassword=true, and passwordHash set to a bcrypt hash of a documented local dev password.
Because ids don't change, Ticket.requesterId stays valid with no data conversion needed.

## 8. API Contract (summary — full contract in api-spec.md)
- POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me, POST /api/auth/change-password
- All Lab 2 ticket/attachment/category/related-system endpoints, now authenticated (no more
  requesterId query param)
- GET /api/staff/tickets (queue: search/filter/sort/page), PATCH /api/tickets/:id/owner,
  PATCH /api/tickets/:id/priority, PATCH /api/tickets/:id/status
- POST /api/tickets/:id/comments, GET /api/tickets/:id/comments
- POST /api/tickets/:id/notes, GET /api/tickets/:id/notes (IT Staff/Admin only)
- POST /api/tickets/:id/indicate-resolved (Requester, owner only)
- GET /api/admin/users, POST /api/admin/users, PATCH /api/admin/users/:id,
  POST /api/admin/users/:id/reset-password

## 9. Acceptance Criteria
- AC-01: Valid active-user login returns an authenticated session and the user's identity/role.
- AC-02: Login with wrong password or inactive account returns a generic error, no account details.
- AC-03: A user with mustChangePassword=true is blocked from every screen except Change Password.
- AC-04: After changing password, mustChangePassword becomes false and the app opens normally.
- AC-05: Logout invalidates access; a later request with the old cookie is rejected.
- AC-06: A Requester sending a different requesterId never affects whose data is returned.
- AC-07: A Requester calling an Internal Notes endpoint is rejected without leaking note content.
- AC-08: IT Staff can claim an unassigned ticket; it then shows them as Ticket Owner.
- AC-09: An invalid status transition (e.g. New -> Closed directly) is rejected with a clear error.
- AC-10: A Requester posting a Public Comment appears immediately to IT Staff on that ticket.
- AC-11: A Requester's "indicate resolved" action never changes currentStatus by itself.
- AC-12: A non-Administrator calling any /api/admin/users endpoint gets 403.
- AC-13: Creating a user with a duplicate email is rejected with a clear validation error.
- AC-14: An Administrator cannot deactivate their own account or the last active Administrator.
- AC-15: A user given a new initial password must change it at their next login.

## 10. Definition of Done
- All 9 report parts have evidence gathered.
- specification.md, tests.md, ui-spec.md, api-spec.md, ai-use.md, reviewer.md filled in for real.
- Every FR/BR maps to at least one AC, every AC maps to at least one passing test.
- All Lab 2 regression tests still pass against the new authenticated routes.
- Every protected endpoint enforces role/ownership server-side, verified by tests, not just hidden
  UI controls.
- Migration from DevRequester to User is tested and documented.
- All Lab 3 Issues in Done on the Kanban board; feature branches merged into lab3-staging, then
  lab3-staging merged into main via one release PR.

## 11. Assumptions and Decisions
- Auth uses a JWT signed by the server, stored in an httpOnly, sameSite=lax cookie — no separate
  sessions table needed, and the token never touches client-side JS.
- Migrated DevRequesters get a shared documented local dev password (not emailed, not real).
- "Indicate resolved" is a boolean flag on the Ticket, not a status value, so IT Staff still make
  the formal call on Resolved/Closed.
- Status transition matrix (New→Open→In Progress⇄Waiting for Requester→Resolved→Closed, plus
  Reopened and Cancelled) is defined in tests.md/ui-spec.md rather than repeated here.