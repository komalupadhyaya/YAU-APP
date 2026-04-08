# Coach Pickup (School Pickup) — End-to-End UI + API Guide

This guide defines the **Coach Pickup** experience end-to-end (UI + API), optimized for **mobile**.

Coach Pickup is **read-only** for student records: **no edit**, **no delete**, **no bulk delete**, **no import**.
It supports:

- viewing students for a school on a selected date
- seeing who is **signed out**
- performing a **sign out** (coach/staff action)

## Base URL

Firebase Functions mounts pickup routes under:

- `/apis/pickup`

## Key Concepts

- **Pickup Status**: server returns **students + signed-out status** (and signouts list) for a school/day in one response.
- **Signout**: record created at pickup time, stored with `signedOutAt` and optional `signedOutBy`.
- **Audit header**: coach/staff should send `x-username` header to record who performed the signout.

## API Contract (Coach Pickup)

### GET pickup status (primary screen data)

`GET /schools/:schoolId/pickup-status`

**Query params (optional)**

- `date`: `YYYY-MM-DD` (defaults to “today” on server)
- `isActive`: `true|false`
- `grade`: string
- `sport`: string

**200**

- `{ success: true, data: { schoolId, date, totals: { students, signedOut }, students: student[], signouts: signout[] } }`

**Notes**

- Coach UI should treat this as the **single source of truth** for “signed out” status on that date.
- Search is typically **client-side** (filter within the returned students).

### GET school signouts (optional: reporting / debug)

`GET /schools/:schoolId/signouts`

**Query params**

- `date`: `YYYY-MM-DD` (defaults to today)

**200**

- `{ success: true, data: signout[] }`

### POST signout (coach/staff action)

`POST /schools/:schoolId/signouts`

**Headers**

- `x-username` (optional) – stored in `signedOutBy`

**Body**

- `schoolStudentId`: string (**required**)
- `parentGuardianName`: string (**required**)
- `notes`: string (optional)
- `date`: `YYYY-MM-DD` (optional; normally omit to use server “today”)

**201**

- `{ success: true, data: { id } }`

## Coach Pickup UI Spec (End-to-End)

### Screen: “School Pickup”

**Purpose**

- Quick mobile-friendly list to find a student and sign them out.

**Non-goals**

- No student editing, deletion, imports, or bulk actions.

### Layout (compact, mobile-first)

#### Header row

- **Title**: “School Pickup”
- **Totals chip** (small): “X students / Y signed out”
- **Refresh** button (optional; small)

#### Filters (two-row layout, consistent with Admin)

**Row 1 (primary find controls)**

- **Search** (text input)
- **Date picker** (`YYYY-MM-DD`)
- **Signed out** checkbox (“Signed out only” behavior)

**Row 2 (server-side filters)**

- **Student status**: Active / Inactive / All (maps to `isActive`)
- **Grade** dropdown
- **Sport** dropdown
- **Clear filters** button
  - Shows a **badge** with number of active filters
  - Disabled when no filters are applied

#### Results list (mobile optimized)

Each row/card should show:

- Student name (primary)
- Parent name (secondary)
- Grade + sports chips (compact)
- Pickup status:
  - **Not signed out** badge, OR
  - **Signed out** badge + parent guardian name + time + signedOutBy (small text)
- Action:
  - If not signed out: **Sign out** button
  - If signed out: no action (or a disabled state)

### Data fetching + behavior

- **On initial load**
  - Load schools (active) for the dropdown.
  - Auto-select the first school (or last selected, if you later add persistence).
  - Call `GET /schools/:schoolId/pickup-status` with default filters:
    - date = today (local)
    - isActive = true
- **On filter change** (server-side filters)
  - Re-fetch pickup-status when any of these change:
    - schoolId, date, status (isActive), grade, sport
- **Search** (client-side)
  - Do NOT refetch on each keystroke.
  - Filter within returned students by:
    - student name, parent name, email/phone (if present), grade, sports
- **Signed out only** (client-side)
  - Filter within returned students where the computed status is signed out.

### Signed-out status computation (recommended)

- Use `pickup-status` response:
  - merge `students[]` with `signouts[]` by `schoolStudentId`
  - set `isSignedOut = true` when a matching signout exists for that student/date

### Sign out flow (coach)

1. Coach taps **Sign out**
2. Modal opens:
   - required: Parent/Guardian name
   - optional: notes
3. Submit calls `POST /schools/:schoolId/signouts`
   - body includes `schoolStudentId`, `parentGuardianName`, optional `notes`, and selected `date`
   - include header `x-username: <coach username/email>`
4. On success:
   - close modal
   - refetch pickup-status for the same school/date/filters

### Error + loading states (mobile-friendly)

- Loading:
  - show a single “Loading…” row (avoid heavy spinners everywhere)
- Errors:
  - show one concise toast/alert, keep filters intact so the coach can retry
- Empty state:
  - “No students found” (respecting current filters/search)

## Responsive / Mobile Guidelines (compact)

- **Touch targets**: minimum 40px height for inputs/buttons.
- **Stacking**:
  - On small screens, stack the filter controls in the same order:
    - Search → Date → Signed out → Status → Grade → Sport → Clear
- **Density**:
  - Keep rows tight: use small badges/chips, avoid verbose helper text.
- **Scrolling**:
  - Filters should be at the top; consider making them visually distinct (light background) so it’s easy to return and adjust.
- **No destructive actions**:
  - Coach UI should never show delete/import/bulk controls.

