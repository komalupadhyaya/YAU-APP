# After School Pickup & Sign-out System — Planning Doc

## 1) Goal (what we’re building)

We need an **after school pickup + sign-out system** that has:

- An **Admin Panel section** to manage after school rosters + students + reporting
- A **separate simple pickup site** (subdomain recommended: `pickup.yauapp.com`) used by coaches/parents at dismissal to sign students out quickly
- A **shared login** for the pickup site (one username/password admins can set and share with all coaches)
- A **sign-out log** that records: roster + student + parent/guardian name + time + optional notes + who signed out
- **Prevent double sign-out**: a student should be signed out **only once per day per roster**
- **Real-time visibility** for coaches: who is still waiting vs picked up
- **Full visibility for admins** across rosters and sign-outs for reporting/review

This doc describes **flow + structure + scenarios**, and the **endpoints + data model** required to implement it cleanly in a new project folder.

---

## 2) Roles and responsibilities

### Admin (inside YAU admin panel)
- Creates/edits after school rosters (school/program/grade/group/days/session dates/active)
- Adds students to rosters (manual + bulk CSV/Excel)
- Manages the **pickup-site shared login** (create/activate/reset password)
- Reviews/export sign-out logs (filter by date range, roster, student)

### Coach / Staff (pickup.yauapp.com)
- Logs into pickup site with shared login
- Selects a roster
- Searches for student
- (Optional but recommended) marks students **present** at the start of dismissal
- Signs student out with parent/guardian name and optional notes
- Sees live “Waiting” vs “Picked up” state for that roster/date

### Parent (pickup.yauapp.com)
Two possible modes (pick one):
- **Mode A (recommended from requirement)**: parent does not login; coach’s tablet is logged in and parent only interacts with the sign-out form (coach assists).
- **Mode B**: parent can also use the same shared login from their phone (higher risk; still workable).

---

## 3) What exists today in the current repo (baseline)

### Admin side (already implemented in this repo)
- **After School Rosters admin page** (`/admin/after-school-rosters`)
  - Create/update/delete rosters (school/program/grade/group/days/session dates/active)
  - View roster students
  - Add student manually
  - Bulk upload CSV (Excel file input exists but parsing is CSV-based)
  - View sign-out logs and export CSV (filters exist on UI)
- **Pickup Users admin page** (`/admin/pickup-users`)
  - Create/update/delete pickup users
  - Reset password
  - Fallback demo data if API is unavailable

### Backend API (already implemented in this repo via Firebase Functions Express app)
Base: `https://us-central1-yau-app.cloudfunctions.net/apis`

Mounted router: `/pickup` (see `functions/index.js`)

Existing endpoints:
- **Rosters**
  - `GET /pickup/rosters`
  - `POST /pickup/rosters`
  - `GET /pickup/rosters/:id`
  - `PUT /pickup/rosters/:id`
  - `DELETE /pickup/rosters/:id`
- **Students**
  - `GET /pickup/rosters/:rosterId/students`
  - `POST /pickup/rosters/:rosterId/students`
  - `POST /pickup/rosters/:rosterId/students/bulk`
  - `PUT /pickup/students/:studentId`
  - `DELETE /pickup/students/:studentId` (soft delete)
- **Sign-outs**
  - `POST /pickup/signouts`
  - `GET /pickup/rosters/:rosterId/signouts`
  - `GET /pickup/signouts`
- **Pickup users**
  - `GET /pickup/users`
  - `POST /pickup/users`
  - `GET /pickup/users/:id`
  - `PUT /pickup/users/:id`
  - `DELETE /pickup/users/:id`
  - `PUT /pickup/users/:id/reset-password`
  - `POST /pickup/users/authenticate`

### Pickup site UI (NOT present in this repo)
There is **no** separate pickup.yauapp.com frontend flow currently in this codebase (no routes/components for pickup login, roster selection, live sign-out screen).

---

## 4) Key “flow” scenarios (end-to-end)

### Scenario 1: Admin sets up rosters before a program starts
1. Admin opens **After School Rosters**
2. Admin creates a roster:
   - Choose **School**, **Program**, **Grade**
   - Optional **Group Name** (e.g., “Group A”, “Gym door”)
   - Optional **Days of week**
   - Optional **Session start/end dates**
   - Set roster **Active**
3. Admin adds students:
   - Option A: **Bulk upload** CSV/Excel export from school
   - Option B: Add students one-by-one
4. Admin confirms roster list is correct and active.

### Scenario 2: Admin creates/updates the shared pickup login
1. Admin opens **Pickup Users**
2. Admin creates a user record:
   - Username + Password
   - Role = “coach” (or “shared” if you add that later)
   - Mark as **Shared login** (recommended: enforce only one active shared user)
3. Admin shares credentials with coaches.

### Scenario 3: Coach uses pickup site at dismissal (fast sign-out)
1. Coach goes to `pickup.yauapp.com` on tablet
2. Coach logs in with the shared credentials
3. Coach selects a roster (school/program/grade/group)
4. Coach searches a student by name
5. Parent/guardian types their name (or coach selects a quick “Sign Out” button)
6. System records the sign-out log:
   - rosterId, studentId, date, time, parent/guardian name, notes (optional), signedOutBy
7. Student now appears as **Picked up** on the roster screen for all logged-in devices.

### Scenario 4: Duplicate sign-out attempt (must be prevented)
1. Coach tries to sign out student again in the same roster on the same day
2. System blocks it and shows:
   - “Already signed out” + original timestamp + original signedOutBy (and parent name if allowed)
3. No new record is written.

### Scenario 5: Admin reporting and reconciliation
1. Admin opens **Sign-out Logs** tab
2. Filters by roster/date range/student
3. Exports CSV and reviews any anomalies

### Scenario 6 (recommended addition): “Present” marking before dismissal
Requirement mentions “staff to mark a student present”.
Recommended flow:
1. Coach opens roster for today
2. Marks which students are present (toggle)
3. Pickup list defaults to **Present & Waiting**
4. When signed out, student moves to **Picked up**

This avoids showing students who never attended that day.

---

## 5) Data model (recommended Firestore collections)

Use Firestore (or any DB) with these logical entities:

### `pickup_rosters`
- `id`
- `school` (string)
- `program` (string)
- `grade` (string)
- `groupName` (nullable string)
- `days` (nullable string[])
- `sessionStartDate` / `sessionEndDate` (nullable string, e.g. `MM-DD-YYYY`)
- `isActive` (boolean)
- `createdAt`, `createdBy`, `updatedAt`, `updatedBy`

### `pickup_roster_students`
- `id`
- `rosterId`
- `childName`
- `parentName` (the default parent name from roster import; used for reference, not as sign-out proof)
- `school`, `grade`, `program` (duplicated for convenience/reporting; can be derived from roster but duplication is ok)
- `isActive` (boolean)
- `addedAt`, `addedBy`, `removedAt`, `removedBy`

### `pickup_signouts`
- `id`
- `rosterId`
- `studentId`
- `date` (string in `MM-DD-YYYY` in EST)
- `signOutTime` (timestamp)
- `parentGuardianName` (string typed at sign-out)
- `notes` (nullable string)
- `signedOutBy` (username or userId)
- `createdAt` (timestamp)

**Uniqueness rule (must enforce):**
\[
unique(rosterId,\ studentId,\ date)
\]

### `pickup_attendance` (recommended addition to meet “mark present”)
Two workable shapes:

**Option A (document per roster/day)**
- doc id: `${rosterId}_${date}`
- fields:
  - `rosterId`, `date`
  - `presentStudentIds`: string[]
  - `updatedAt`, `updatedBy`

**Option B (one doc per student/day)**
- fields:
  - `rosterId`, `studentId`, `date`, `isPresent`, `updatedAt`, `updatedBy`

Option A is simpler but can hit array limits for very large rosters; Option B scales better.

### `pickup_users`
- `id`
- `username` (lowercased)
- `passwordHash` (bcrypt)
- `role` (`coach` / `parent` / `admin` — minimal needed is `coach`)
- `isShared` (boolean)
- `isActive` (boolean)
- `notes` (nullable string)
- `createdAt`, `createdBy`, `updatedAt`, `updatedBy`
- `lastLoginAt`

---

## 6) API endpoints (clean spec for the new project)

### Authentication (pickup site)
#### `POST /pickup/auth/login`
Body:
- `username`, `password`

Returns:
- `accessToken` (JWT or session token)
- `user`: `{ id, username, role, isShared }`

Notes:
- The pickup site should store token (memory/localStorage) and attach it to API calls.

#### `POST /pickup/auth/logout`
Optional if using stateless JWT; otherwise revoke session.

---

### Rosters (admin + pickup site)
#### `GET /pickup/rosters`
Query filters:
- `school`, `program`, `grade`, `isActive`

Used by:
- Admin roster list
- Pickup site roster selection list (typically only `isActive=true`)

#### `POST /pickup/rosters` (admin only)
Create roster.

#### `PUT /pickup/rosters/:rosterId` (admin only)
Update roster.

#### `DELETE /pickup/rosters/:rosterId` (admin only)
Decision needed:
- **Option 1**: hard-delete roster and cascade delete students
- **Option 2**: prohibit delete if students exist (current backend behavior)
- **Option 3 (recommended)**: soft-delete with `isActive=false`, keep data/history

---

### Students (admin + pickup site read)
#### `GET /pickup/rosters/:rosterId/students`
Query:
- `isActive=true|false` (default true)

Used by:
- Admin view students
- Pickup site roster screen

#### `POST /pickup/rosters/:rosterId/students` (admin only)
Add one student.

#### `POST /pickup/rosters/:rosterId/students/bulk` (admin only)
Bulk add students from CSV parse result.

#### `DELETE /pickup/students/:studentId` (admin only)
Soft-remove from roster.

---

### Attendance (recommended to satisfy “mark present”)
#### `PUT /pickup/rosters/:rosterId/attendance/:date`
Body:
- `presentStudentIds` (or `{ studentId, isPresent }` depending on chosen model)

Used by:
- Pickup site “mark present” screen (coach)

#### `GET /pickup/rosters/:rosterId/attendance/:date`
Used by:
- Pickup roster screen to show present vs absent (optional)

---

### Sign-outs (pickup site + admin reporting)
#### `POST /pickup/signouts`
Body:
- `rosterId`
- `studentId`
- `parentGuardianName`
- `notes` (optional)

Rules:
- Must enforce **one sign-out per (rosterId, studentId, date)**
- On duplicate attempt return `409` with payload including existing sign-out time

#### `GET /pickup/rosters/:rosterId/signouts`
Query:
- `date` (default today in EST)

Used by:
- Pickup roster screen (to label picked up)

#### `GET /pickup/signouts` (admin)
Query filters:
- `rosterId`
- `studentId`
- `date` OR `startDate` + `endDate`
- pagination: `limit`, `cursor` (recommended)

Used by:
- Admin “Sign-out Logs” tab and CSV export

---

### Pickup users (admin)
#### `GET /pickup/users`
Filters:
- `role`, `isActive`, `isShared`

#### `POST /pickup/users`
Create pickup user (including shared login).

#### `PUT /pickup/users/:id/reset-password`
Reset password for shared login.

#### `PUT /pickup/users/:id`
Update status/notes/role/isShared.

---

## 7) Real-time updates requirement (how to implement)

We need coaches to see “Waiting vs Picked up” **in real time**.

Recommended options:

- **Option A (best with Firebase)**: pickup site uses Firestore real-time listeners on:
  - `pickup_signouts` where `rosterId == X` and `date == today`
  - `pickup_attendance` for today (if implemented)
  This requires a secure auth story (custom token or Firebase Auth) OR proxying through a backend.

- **Option B (simple)**: backend provides:
  - polling every 3–5 seconds for `GET /pickup/rosters/:rosterId/signouts?date=...`
  Works but less “live”.

- **Option C**: Server-Sent Events (SSE) / WebSockets
  More complex but good UX.

For a “fast MVP”, do **Option B**, then upgrade to **Option A** when ready.

---

## 8) Pickup site pages (UI structure)

### 8.1 Login page
- Username + password
- “Remember me” optional
- On success → roster selection

### 8.2 Roster selection page
- Filters: school/program/grade
- List active rosters
- Tap roster → roster screen

### 8.3 Roster screen (core dismissal screen)
Layout optimized for tablet:
- Search bar (child name)
- Student list rows:
  - Child name
  - Status badge: Waiting / Picked up
  - If picked up: show time and signedOutBy
  - Action: “Sign out” opens modal/inline form

### 8.4 Sign-out modal / inline
Two modes:
- **Mode 1**: parent types name + optional notes then submit
- **Mode 2**: simple green “Sign Out” button:
  - If no typed name, it can auto-fill from roster student `parentName`
  - (But requirement says “typing parent name”; allow both)

If already signed out:
- Show “Already signed out at …” clearly and disable submission

### 8.5 (Optional) Attendance/Present screen
- Toggle present for each student
- Defaults can be “all present” or “none present” depending on program

---

## 9) Admin pages (UI structure)

### 9.1 After School Rosters
Tabs:
- **Rosters**: CRUD + filters + active/inactive
- **Roster Students**: list + add + bulk upload
- **Sign-out Logs**: filter + export

### 9.2 Pickup Users
- Manage the shared login:
  - Create shared user
  - Reset password
  - Activate/deactivate
  - Audit last login time

---

## 10) Important “gotchas” to bake into the design

- **Time zone**: dismissal is local; store “today” based on **America/New_York** (or roster-specific timezone if needed).
- **Uniqueness**: enforce sign-out uniqueness at write time (transaction or deterministic doc id).
- **Security**:
  - Shared credential should not expose admin APIs.
  - Token/session should allow only pickup flows.
- **Performance**:
  - Roster screen must be fast (avoid huge payloads; prefetch roster + students + today’s sign-outs).
- **Auditability**:
  - Always log `signedOutBy`, timestamp, and optional notes.

---

## 11) Implementation roadmap (high level)

- Phase 1 (MVP)
  - Admin: rosters + student import + shared login management
  - Pickup site: login → roster select → roster sign-out screen
  - Sign-out uniqueness (per roster/day)
  - Admin: sign-out log view + export

- Phase 2
  - Attendance/present marking
  - Real-time via Firestore listeners or SSE
  - Better pagination for sign-out logs + large rosters

---

## 12) Firebase access guide (for the new Pickup website)

This section explains how the **Pickup site** should “access Firebase” for **coach/parent login** and for reading/writing pickup data.

### 12.1 What Firebase services we use (Pickup site)

- **Firebase Hosting**: serves the Pickup site (recommended domain: `pickup.yauapp.com`)
- **Firebase Cloud Functions (HTTP / Express)**: the Pickup site calls your existing API:
  - Base URL: `https://us-central1-yau-app.cloudfunctions.net/apis`
  - Pickup router base: `/pickup`
- **Firestore**: used by the backend (Cloud Functions Admin SDK) to store rosters/students/sign-outs/pickup users

**MVP recommendation**: Pickup site should **NOT** talk to Firestore directly. It should call **Cloud Function endpoints only** (simple + secure).

### 12.2 Login model for coach + parent (choose what you ship)

You currently have a working “Pickup user” login API:
- `POST /pickup/users/authenticate`

There are two ways to use it for the Pickup website:

#### Option A (matches your current backend): “Pickup Users” login (shared or individual)

- Users are stored in Firestore collection `pickup_users` (handled by backend).
- Pickup website calls:
  - `POST /pickup/users/authenticate` with `{ username, password }`
- On success, backend returns a user payload (today it returns user info; it does **not** issue a JWT yet).

**How the Pickup site identifies the signed-in person**
- When creating sign-outs, your backend reads:
  - `req.body.signedOutBy` OR request header `x-username`
- So on the Pickup site, send one of:
  - `signedOutBy` in request body, or
  - `x-username: <username>` header

**Parent login**
- If you want “parent login” too, you can reuse the same endpoint and create pickup users with `role = "parent"`.
- If you do **not** want parents to login (recommended for simplicity), then only coaches/staff login and parents just type their name during sign-out.

#### Option B (more secure long-term): Firebase Auth (custom token) + Firestore listeners

Use this only if/when you need:
- Firestore real-time listeners directly in the Pickup site
- Strong auth + security rules enforcement client-side

Typical approach:
- Pickup login endpoint verifies username/password, then backend creates a **Firebase custom token** (Admin SDK) with custom claims like `{ role: "coach" }`
- Pickup site signs in with `signInWithCustomToken`
- Pickup site can then read real-time sign-outs from Firestore with security rules

This requires extra backend work (token issuance + rules), so it’s best as **Phase 2**.

### 12.3 Required screens for the Pickup website (separate folder/app)

Minimum screens you need to build in the Pickup Vite app:

- **`/login`**
  - Coach login (and parent login only if you choose to support it)
- **`/rosters`**
  - List active rosters (filter by school/program/grade optional)
- **`/rosters/:rosterId`** (core dismissal screen)
  - Student search
  - Student list with status: Waiting / Picked up
  - “Sign out” action (modal/inline)
- **(Optional) `/rosters/:rosterId/attendance`**
  - Mark students present for the day (recommended Phase 2)

### 12.4 Pickup website → API endpoint map (what each screen calls)

#### Login screen
- `POST /pickup/users/authenticate`
  - Body: `{ username, password }`
  - Store returned user in app state (and/or localStorage for “remember me”)

#### Rosters list screen
- `GET /pickup/rosters?isActive=true`

#### Roster dismissal screen
- Students for roster:
  - `GET /pickup/rosters/:rosterId/students?isActive=true`
- Today’s sign-outs for roster:
  - `GET /pickup/rosters/:rosterId/signouts?date=MM-DD-YYYY` (or omit date to use backend default)
- Create sign-out:
  - `POST /pickup/signouts`
  - Body: `{ rosterId, studentId, parentGuardianName, notes?, signedOutBy? }`
  - If already signed out: backend returns **409**

### 12.5 Recommended folder structure for the separate Pickup Vite app

Because this Pickup website should be a separate deploy (different domain), keep it in its own folder.

Recommended structure inside this repo:

- `pickup-site/` (new Vite app)
  - `src/`
    - `pages/` (`Login`, `RosterList`, `RosterScreen`, optional `Attendance`)
    - `services/` (API client for `/apis/pickup`)
    - `firebase/` (Firebase init if needed for Hosting/Auth later)

### 12.6 Firebase config for the Pickup Vite app (how to initialize)

If the Pickup app will use Firebase SDK (even just for Hosting/auth later), store config in env vars and initialize once.

Example `pickup-site/src/firebase/config.ts` (or `.js`):

```ts
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
```

**Important**: your current admin app has Firebase web keys hard-coded in `src/firebase/config.js`. For the Pickup site, prefer env vars (`.env`) so you can easily switch dev/stage/prod.

### 12.7 What still needs to be developed (Pickup site)

Backend is already in place for the MVP endpoints (rosters/students/sign-outs/pickup users). What’s missing is the Pickup frontend screens + wiring:

- **Pickup frontend**
  - `/login` (calls authenticate)
  - `/rosters` (calls get rosters)
  - `/rosters/:id` (calls students + signouts + create signout)
  - Optional attendance UI (Phase 2)

Optional but recommended backend hardening (Phase 2):
- Return a **JWT** from `POST /pickup/users/authenticate` and require it for write actions (like `POST /pickup/signouts`)
- Add a lightweight auth middleware to validate token + role

