# Coach Login + Coach Portal Guide (Pickup)

This guide explains **how coach accounts are stored**, and how to implement **coach login + authorization** for a coach portal (e.g. `pickup.com`) that needs to:

- Login as coach
- View **Schools**
- View/Search **Students**
- Sign out (logout)

It is written based on the patterns in this repo:

- Coaches are stored in Firestore **`users`** with `role: "coach"` and optional `uid`
- Pickup “schools + school students” APIs exist under `/apis/pickup`

---

## 1) What happens when Admin “adds a coach” in this repo?

### 1.1 Coach is stored as a Firestore **user** record

The backend creates a document in **Firestore `users`** with:

- `role: "coach"`
- `email`, `firstName`, `lastName`, etc.
- `uid`: Firebase Auth UID **only if** a Firebase Auth user was created

### 1.2 Firebase Auth account is created **only if password is provided**

If the admin includes `password` when creating a coach, the backend creates a Firebase Auth user, and stores its UID in Firestore.

Important: password is **not** saved in Firestore.

---

## 2) Is the “member panel” using Firebase Auth for login?

Yes. Frontend login uses Firebase Auth email/password (`signInWithEmailAndPassword`).

### Key detail (why coaches won’t “work” automatically)

After Firebase Auth login, the current member panel fetches profile data from:

- `members` collection (paid users)
- `registrations` collection (free users)

It does **not** look in `users` (where coaches are stored).

So if you reuse this auth pattern for a coach portal, you must add **a coach profile lookup** from `users`.

---

## 3) Recommended data model for Coach Portal

### 3.1 Firestore collections

Use a single “people” collection:

- `users/{docId}`

Coach record fields (minimum):

- `role`: `"coach"`
- `uid`: Firebase Auth UID (recommended)
- `email`: lowercased email
- `firstName`, `lastName`
- `isActive`: boolean

Optional access control fields (recommended):

- `assignedSchoolIds`: string[]  (if coaches should NOT see all schools)
- `assignedLocations`: string[]
- any org/tenant identifiers you need (if multi-org)

### 3.2 Pickup data collections (already used by the API)

Pickup Schools:

- `pickupSchools`

Pickup School Students:

- `pickupSchoolStudents` with a `schoolId` field

---

## 4) Coach login flow (frontend)

### Step A — Firebase Auth login

Use Firebase Auth:

- `signInWithEmailAndPassword(auth, email, password)`

### Step B — Load coach profile from Firestore

After login, fetch coach profile:

- Preferred: query `users` where `uid == auth.currentUser.uid`
- Fallback: query `users` where `email == auth.currentUser.email`

Then enforce:

- `role === "coach"`
- `isActive !== false`

If the user is not a coach:

- immediately sign out
- show “Not authorized” message

### Step C — Store in app state and guard routes

Use a `CoachAuthContext` (or reuse your `AuthContext`) with:

- `coachUser` (firebase user)
- `coachProfile` (Firestore `users` doc)
- `logout()`

Route guard:

- Allow only if `coachProfile.role === "coach"`
- Do NOT gate on paid membership (coaches are not members)

---

## 5) Calling Pickup APIs (Schools + Students)

In this repo, pickup endpoints are mounted like:

- `exports.apis = functions.https.onRequest(app)`
- `app.use("/pickup", pickupRoutes)`

So the HTTP base is:

- `/apis/pickup`

### Endpoints you can use for coach portal

- List schools:
  - `GET /apis/pickup/schools?isActive=true`
- List students for a school:
  - `GET /apis/pickup/schools/:schoolId/students?isActive=true`

### Searching students

Current API supports filters:

- `grade`
- `sport`
- `isActive`

For “search by name”, simplest approach:

- Fetch the school’s students, then filter client-side by:
  - studentFirstName / studentLastName / parent fields

If you want server-side search, add a query param like `q` and filter in the service.

---

## 6) Authorization (IMPORTANT)

Right now many endpoints are not protected. For a real coach portal you should enforce:

- Only authenticated users can call pickup endpoints
- Only coaches/admin can call coach/admin pickup endpoints

### Option 1 (Best): Use Firebase custom claims

On coach creation:

- create Firebase Auth user (Admin SDK `admin.auth().createUser`)
- set custom claim: `admin.auth().setCustomUserClaims(uid, { role: "coach" })`

On backend:

- verify ID token (`admin.auth().verifyIdToken`)
- check `decodedToken.role === "coach"` (or `"admin"`)

On frontend:

- `await auth.currentUser.getIdToken()` for Authorization header
- optional: `getIdTokenResult()` to read claims client-side

### Option 2: Role in Firestore only

Backend verifies ID token, then looks up user in Firestore (`users`) to confirm role.

This is simpler to roll out, but slower per request unless cached.

---

## 7) Minimal implementation checklist (Pickup coach portal)

- **Account creation**
  - Admin creates coach in Firebase Auth (email/password)
  - Firestore `users` doc created with `role: "coach"`, `uid`, `isActive`
- **Login UI**
  - Email/password login using Firebase Auth
  - Fetch `users` doc and confirm `role === "coach"`
- **Session**
  - Keep firebase session (default persistence)
  - Logout calls Firebase `signOut()`
- **Pages**
  - Schools list page: call `GET /pickup/schools`
  - Students page: call `GET /pickup/schools/:schoolId/students`
  - Student search: filter list client-side (or add API `q`)
- **Security**
  - Require Bearer token on pickup endpoints
  - Require role `"coach"` or `"admin"`

---

## 8) Quick notes / pitfalls

- Do **not** store coach passwords in Firestore.
- Normalize coach emails (lowercase + trim) so lookup is consistent.
- If you change coach role logic, decide ONE source of truth:
  - custom claims (recommended), or
  - Firestore `users.role`
- If coaches should NOT see “all schools”, add `assignedSchoolIds` and enforce it in the API (server-side).

