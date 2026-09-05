# Lab 2 UI Specification (Zen Green Theme)

## 1. Color Tokens

| Token | Value | Used for |
| --- | --- | --- |
| Primary green | #006B3C | Header, primary buttons, strong emphasis |
| Secondary green | #0B7A46 | Active tabs, links, hover states, focus outline |
| Pale green | #EAF6EF | Selected rows, success banners, subtle highlights |
| Page background | #F5F7F6 | Behind everything |
| Surface/cards | White + light border + soft shadow | Forms, table container, cards |
| Text | Dark charcoal-green (not pure black) | Body text |
| Editable field | White bg, neutral border | Inputs I can type in |
| Read-only field | Soft gray-green / ivory shading | Ticket Number, Ticket Date, etc. |
| Error | Dark red text + border | Validation errors |
| Warning | Amber | File-type/size warnings |
| Success | Green + text (not color-only) | Ticket created confirmation |

## 2. Typography and Spacing

Same font stack as Lab 1. Section headings bold, 16-18px. Body text 14-15px for comfortable
reading. Consistent 16px gap between form fields, 24px between form sections.

## 3. Field and Control States

- **Editable**: white background, neutral gray border, darker border on focus.
- **Read-only**: soft gray-green background, no border highlight on click, cursor stays default.
- **Invalid**: red border + red helper text directly under the field.
- **Disabled**: lighter gray, reduced opacity, cursor not-allowed, cannot be focused/clicked.
- **Focused**: visible outline in secondary green for keyboard users — never removed.

## 4. Required-Field Marker and Validation Placement

- Required fields get a red asterisk right after the label.
- The asterisk alone is never the only validation cue — an actual error message appears under
  the field once it's been touched and is invalid.
- Errors never show up only as one generic banner at the top of the form.

## 5. Buttons

- **Primary** (Submit, Create Ticket): solid primary green, white text.
- **Secondary** (Cancel, Back): white background, green border and text.
- **Tertiary** (Change Requester, links): text-only, secondary green, underline on hover.
- **Destructive** (Remove Attachment): red text/border, confirmation required before it does
  anything.
- **Disabled**: grayed out, not clickable, no hover effect.
- **Busy**: while a request is in flight, the button shows a small spinner and text like
  "Submitting..." and is disabled so it can't be double-clicked.

## 6. Attachment Selection and Errors

- Drag-and-drop area or a plain file input, either is fine, but must show which file types and
  size limit are allowed right there in the UI (not hidden in an error message only).
- Each attached file shows name, size, and a small preview icon by type.
- Invalid files (wrong type / too big) show a red message inline, right next to that file, and
  are never silently dropped.
- A progress indicator (spinner or bar) shows while a file is uploading.

## 7. Screen States (apply to every screen with data)

Initial → Loading → (Validation, for forms) → Submitting (forms only) → Success or Failure.
Every screen must be able to show: a loading spinner/skeleton, a true empty state ("you have no
tickets yet"), a no-results state (search/filter matched nothing), and a safe failure state
("couldn't reach the server, try again") that never shows a raw stack trace or technical error.

## 8. Responsive Layout Rules

| Viewport | Behavior |
| --- | --- |
| Desktop ≥992px | Multi-column layout, content centered, max-width so lines don't get silly long |
| Tablet 768-991px | Two columns where it makes sense, Summary/Description get enough width |
| Mobile <768px | Everything stacks in one column, buttons stay big enough to tap, no sideways scroll |

## 9. Accessibility

- Every icon-only button (like a trash icon) has an aria-label and a tooltip.
- Tab order follows the visual order of the form.
- Focus ring is always visible for keyboard users, never removed with CSS.
- Status/priority isn't communicated by color alone — badges also have text.

## 10. Application Shell and Navigation

Same header as Lab 1's TokTickIT bar, now with "My Tickets" and "Create Ticket" links, plus the
current Development Requester's name shown on the right with a "Change Requester" option next to
it. The active page is visually highlighted (secondary green underline or background).

## 11. Development Requester Selection Screen

- Title + one-line explanation that this is a Lab 2 testing tool, not real login.
- Dropdown of active Requesters, loaded from the DB.
- "Continue" button, disabled until a Requester is picked.
- Loading state while requesters load, empty state if none are active, error state if the
  request fails.

## 12. Create Ticket Screen

- System-generated / read-only info (none until after creation — Ticket Number only appears
  post-submit) grouped near the top once shown.
- Classification fields (Category, Related System, Requested Priority) grouped together.
- Summary and Description get full-width, roomy text areas.
- Attachments section below the main fields, showing the 5-file / 5MB / type limits.
- Submit + Cancel at the bottom, Submit is the primary button.
- On success: clear confirmation showing the real Ticket Number and a link/button to go see it
  in My Tickets.

## 13. My Tickets Screen

- Columns (desktop table): Ticket No., Created Date, Summary, Category, Requested Priority, IT
  Priority, Current Status, Last Updated.
- Search box (ticket number / summary), filter dropdowns for Category / Requested Priority / IT
  Priority / Current Status, a sort control, and pagination controls.
- "Create Ticket" button always visible top-right.
- On mobile: table becomes a stack of cards, each showing Ticket No., Summary, Status badge, and
  Last Updated, tap to open.
- Status/Priority shown as colored badges (pale green background + text) matching the spec
  colors, never color-only.

## 14. Requester Ticket Detail Screen

- All ticket fields shown read-only, grouped clearly (header info, then description).
- Attachments list separate from ticket info: file name, size, upload date, status
  (active/removed), download button (disabled if removed), remove button (only for active
  attachments owned by the current Requester).
- "Add Attachment" control available directly on this screen too.
- No comments/notes/status-change UI anywhere on this screen — out of scope for this lab.

## 15. Visual Inspection Checklist

- [ ] No clipped text or overlapping elements at any of the three breakpoints
- [ ] Read-only fields are visually distinct from editable ones at a glance
- [ ] Error messages appear directly under their field, not floating elsewhere
- [ ] Badge colors match this spec exactly
- [ ] Screenshots saved: artifacts/lab-02/screenshots/create-ticket/, .../my-tickets/,
      .../ticket-detail/ (desktop + tablet + mobile for each)
