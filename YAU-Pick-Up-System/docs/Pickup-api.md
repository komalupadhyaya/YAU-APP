# Pickup API (Schools + Students + Signouts)

This document covers the **currently active** Pickup **Admin** endpoints mounted in Firebase Functions under the Express app exported as `apis`.

## Base URL

In `functions/index.js`, routes are mounted like:

- `app.use("/pickup", pickupRoutes);`

So the effective base path is:

- **`/apis/pickup`**

Example (production):

- `https://<region>-<project>.cloudfunctions.net/apis/pickup`

## Common behavior

- **JSON**: requests/responses are JSON.
- **Success response**: `{ "success": true, "data": ... }` or `{ "success": true, "message": "..." }`
- **Error response**: `{ "success": false, "error": "..." }`
- **Audit header**:
  - Admin mutations accept header `x-admin-id` (stored in `createdBy/updatedBy/deletedBy`).
  - Pickup signouts accept header `x-username` (stored in `signedOutBy`) to record which coach/staff performed the signout.

### Query boolean parsing

Some list endpoints accept `isActive=true|false`. If it is missing/empty itâ€™s treated as â€œno filterâ€.

### Bulk import + progress (â€œgod level loadingâ€)

Bulk import endpoints accept **JSON `rows`**. Recommended frontend behavior:

- Parse Excel/CSV in the UI
- Send rows in **chunks** (e.g. 50 rows/request)
- Show progress using the chunk responses: `rowsReceived`, `created`, `updated`, `errors`

---

## Schools (Admin)

### GET `/schools`

List schools.

- **Query params**
  - `isActive` (`true|false`, optional)
  - `q` (string, optional; simple client filtering)
- **200**
  - `{ success: true, data: school[] }`

### POST `/schools`

Create a school (**unique by name**, enforced via normalized `schoolKey`).

- **Headers**
  - `x-admin-id` (optional)
- **Body**
  - `name` (string, required)
  - `location` (string, optional)
  - `sports` (string[] or string, optional; comma-separated string allowed)
- **201**
  - `{ success: true, data: { id } }`

### GET `/schools/:schoolId`

Get school by id.

- **200** `{ success: true, data: school }`
- **404** `{ success: false, error: "School not found" }`

### PUT `/schools/:schoolId`

Update school.

- **Headers**
  - `x-admin-id` (optional)
- **Body**
  - any fields to update: `name`, `location`, `sports`, `isActive`, ...
- **200** `{ success: true, message: "School updated successfully" }`

### DELETE `/schools/:schoolId`

Hard-delete school (permanent).

- **Headers**
  - `x-admin-id` (optional)
- **200** `{ success: true, message: "School deleted successfully" }`

### POST `/schools/bulk-import`

Bulk create/update schools from JSON `rows`.

- **Headers**
  - `x-admin-id` (optional)
- **Body (required)**
  - `rows`: object[] (non-empty)
- **Body (optional)**
  - `mode`: `"upsert" | "create_only"` (default `"upsert"`)
  - `columnMap`: `{ name?: string, location?: string, sports?: string }`
- **200**
  - `{ success: true, data: { created, updated, skippedExisting, errors, results[] } }`

Recommended School import columns:

- `School Name`
- `Location`
- `Sports` (comma-separated)

### POST `/schools/bulk-delete` (NEW)

Bulk hard-delete schools (permanent), optionally hard-deleting all students associated to those schools.

- **Headers**
  - `x-admin-id` (optional)
- **Body (required)**
  - `schoolIds`: string[] (non-empty)
- **Body (optional)**
  - `deleteStudents`: boolean (default `false`)
- **200**
  - `{ success: true, data: { deleteStudents, schools: { deletedCount, batches }, students?: { scannedCount, deletedCount, batches, truncated } } }`

---

## School Students (Admin)

Students are stored in `pickupSchoolStudents` and are always associated with a `schoolId`.

### GET `/schools/:schoolId/students`

List students for a school.

- **Query params**
  - `isActive` (`true|false`, optional)
  - `grade` (string, optional)
  - `sport` (string, optional; uses `array-contains`)
- **200** `{ success: true, data: student[] }`

### POST `/schools/:schoolId/students/bulk-delete` (NEW)

Bulk hard-delete selected students from a specific school (permanent).

- **Headers**
  - `x-admin-id` (optional)
- **Body (required)**
  - `studentIds`: string[] (non-empty)
- **200**
  - `{ success: true, data: { scannedCount, deletedCount, notFoundCount, wrongSchoolCount, batches } }`

### POST `/schools/:schoolId/students`

Create a student (duplicate protection via `studentKey`).

- **Headers**
  - `x-admin-id` (optional)
- **Body (required)**
  - `studentFirstName`, `studentLastName`
  - `parentFirstName`, `parentLastName`
  - `grade`
  - `sports` (string[] or comma-separated string)
- **Body (optional)**
  - `parentEmail`, `parentPhone`
  - `season1..season4` (booleans)
  - `seasons` (string[]; optional alternative)
- **201** `{ success: true, data: { id } }`

### PUT `/school-students/:studentId`

Update a student by id.

- **Headers**
  - `x-admin-id` (optional)
- **Body**
  - any student fields to update
- **200** `{ success: true, message: "Student updated successfully" }`

### DELETE `/school-students/:studentId`

Hard-delete student (permanent).

- **Headers**
  - `x-admin-id` (optional)
- **200** `{ success: true, message: "Student deleted successfully" }`

### POST `/school-students/bulk-import`

Bulk create/update students from JSON `rows` (frontend chunking recommended).

- **Headers**
  - `x-admin-id` (optional)
- **Body (required)**
  - `rows`: object[] (non-empty)
- **Body (optional)**
  - `mode`: `"upsert" | "create_only"` (default `"upsert"`)
  - `createMissingSchools`: boolean (default `false`) â€“ if true, creates the school when the rowâ€™s School Name is not found
  - `columnMap`: override column names
- **200** `{ success: true, data: { created, updated, skippedExisting, errors, results[] } }`

Recommended Student import columns (supported by default):

- `First Name` (Parent First Name)
- `Last Name` (Parent Last Name)
- `Email`
- `Mobile Number`
- `Student Name (First Name)`
- `Student Name (Last Name)`
- `What school does your student attend?`
- `Your Student's Current Grade ?`
- `Which sport would your student like to play?`
- `Season 1`, `Season 2`, `Season 3`, `Season 4` (Y/N, TRUE/FALSE, 1/0)

---

## Signouts (Coach Pickup)

Signouts are stored in `pickupSignouts`.

Each signout records:

- `schoolId`
- `schoolStudentId`
- `parentGuardianName` (typed manually at pickup time)
- `signedOutAt` (server timestamp)
- `date` (YYYY-MM-DD key for filtering)
- `signedOutBy` (optional; from header `x-username`)
- `notes` (optional)

### GET `/schools/:schoolId/signouts`

List signouts for a school (most commonly "today").

- **Query params**
  - `date` (string, optional; `YYYY-MM-DD`, defaults to today)
- **200** `{ success: true, data: signout[] }`

### POST `/schools/:schoolId/signouts`

Create a signout record for a student.

- **Headers**
  - `x-username` (optional; coach/staff username for audit)
- **Body (required)**
  - `schoolStudentId` (string)
  - `parentGuardianName` (string)
- **Body (optional)**
  - `notes` (string)
  - `date` (`YYYY-MM-DD`; normally omit to use server "today")
- **201** `{ success: true, data: { id } }`

### GET `/signouts` (Reporting)

Admin/reporting endpoint to list signouts with filters.

- **Query params (optional)**
  - `schoolId`
  - `schoolStudentId`
  - `date` (`YYYY-MM-DD`)
  - `startDate` (`YYYY-MM-DD`)
  - `endDate` (`YYYY-MM-DD`)
  - `limit` (number)
- **200** `{ success: true, data: signout[] }`
