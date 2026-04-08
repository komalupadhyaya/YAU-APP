# Manual Roster Creation – Step-by-Step UI Guide

**Non-technical summary – endpoints created for manual roster creation:**

- Get everything for the form in one go (students, locations, sports, age groups).
- Get only the list of students, with optional filters by location, sport, or age group.
- Get only the list of locations for the dropdown.
- Get only the list of sports for the dropdown.
- Get only the list of age groups for the dropdown.
- Create a new roster by sending the chosen location, sport, age group, team name, and selected students.

---

This guide walks through **which endpoint to call when** in the UI and **what each response looks like**, so you can build the manual roster creation flow from scratch.

---

## Quick reference: endpoints used in the flow

| Step in UI | Endpoint | Method | When to call |
|------------|----------|--------|--------------|
| **1. Load form** | `/rosters/options` | GET | When "Create roster" page opens |
| **2. (Optional) Filter students** | `/rosters/options/students?location=&sport=&ageGroup=` | GET | When user changes location, sport, or age group |
| **3. Create roster** | `/rosters` | POST | When user clicks "Create roster" / "Save" |

Base URL: `API_CONFIG.baseURL` in `src/firebase/config.js` (e.g. `http://127.0.0.1:5001/yau-app/us-central1/apis`).

---

## Step 1: Load the "Create roster" page

**Goal:** Fill dropdowns (Location, Sport, Age group) and the list of students so the user can pick options and select players.

### Which endpoint

- **`GET /rosters/options`**  
- Frontend: `RostersService.getManualCreateOptions()`

**When:** Once when the manual roster creation screen mounts (e.g. in `useEffect` with `[]`).

**Optional:** To pre-filter students by location/sport/age group, pass query params:

- `RostersService.getManualCreateOptions({ location: 'X', sport: 'Y', ageGroup: 'Z' })`

### Example call

```js
import { RostersService } from '../services/apiService';

// On page load
const res = await RostersService.getManualCreateOptions();
```

### Response (success)

```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "parentId-childName",
        "parentId": "abc123",
        "name": "John Doe",
        "firstName": "John",
        "lastName": "Doe",
        "dob": "2014-05-01",
        "ageGroup": "10U",
        "parentName": "Jane Doe",
        "parentEmail": "jane@example.com",
        "parentPhone": "555-1234",
        "sport": "Football",
        "location": "Downtown"
      }
    ],
    "locations": [
      { "id": "loc1", "name": "Downtown" },
      { "id": "loc2", "name": "East Side" }
    ],
    "sports": ["Football", "Flag Football", "Tackle Football"],
    "ageGroups": ["3U", "4U", "5U", "6U", "7U", "8U", "9U", "10U", "11U", "12U", "13U", "14U"]
  }
}
```

### What to do in the UI

1. Check `res.success === true` and use `res.data`.
2. **Location dropdown** → bind options to `res.data.locations` (e.g. `location.name` or `location.id`).
3. **Sport dropdown** → bind options to `res.data.sports`.
4. **Age group dropdown** → bind options to `res.data.ageGroups`.
5. **Students list** (table / multi-select) → bind rows to `res.data.students`; each student has `id`, `name`, `ageGroup`, `parentName`, `sport`, `location`, etc.

Store in state, e.g.:

- `setLocations(res.data.locations)`
- `setSports(res.data.sports)`
- `setAgeGroups(res.data.ageGroups)`
- `setStudents(res.data.students)`

---

## Step 2: (Optional) Filter students when user changes Location / Sport / Age group

**Goal:** When the user picks a location, sport, or age group, show only students that match so it’s easier to build the roster.

### Which endpoint

- **`GET /rosters/options/students?location=&sport=&ageGroup=`**  
- Frontend: `RostersService.getOptionStudents({ location, sport, ageGroup })`

**When:** When the user changes the Location, Sport, or Age group dropdown (e.g. in an `onChange` handler). Pass only the values that are selected (omit or leave empty if not selected).

### Example call

```js
// User selected: location "Downtown", sport "Football", age group "10U"
const res = await RostersService.getOptionStudents({
  location: selectedLocation,  // e.g. "Downtown"
  sport: selectedSport,        // e.g. "Football"
  ageGroup: selectedAgeGroup, // e.g. "10U"
});
```

### Response (success)

```json
{
  "success": true,
  "data": [
    {
      "id": "parentId-childName",
      "parentId": "abc123",
      "name": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "dob": "2014-05-01",
      "ageGroup": "10U",
      "parentName": "Jane Doe",
      "parentEmail": "jane@example.com",
      "parentPhone": "555-1234",
      "sport": "Football",
      "location": "Downtown"
    }
  ]
}
```

### What to do in the UI

1. Check `res.success === true`.
2. Replace the students list with `res.data`: e.g. `setStudents(res.data)`.
3. Keep using the same students list component; only the data source changes (filtered list).

You do **not** need to call any other endpoint for locations/sports/age groups here; those dropdowns are already filled from Step 1.

---

## Step 3: User selects students and fills roster details

**Goal:** User picks which students are on the roster and (if required) enters team name.

- **No new endpoint.**  
- User selects rows from the students list (from Step 1 or Step 2) and you store them in state, e.g. `selectedStudents` (array of student objects).
- User also selects or confirms:
  - **Location** (from Step 1 dropdown)
  - **Sport** (from Step 1 dropdown)
  - **Age group** (from Step 1 dropdown)
- Optionally: **Team name** (e.g. input or auto-filled as `"10U Football - Downtown"`).

---

## Step 4: Submit – create the roster

**Goal:** Send the chosen location, sport, age group, team name, and selected students to the API so the roster is created.

### Which endpoint

- **`POST /rosters`**  
- Frontend: build the URL from config and send a POST with `fetch`, or add a `RostersService.create(payload)` that uses `API_CONFIG.endpoints.rosters.create` and `makeRequest` with `method: 'POST'`.

**When:** When the user clicks "Create roster" / "Save" (or your submit button).

### Request payload

Send a JSON body with at least:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sport` | string | Yes | e.g. `"Football"` |
| `ageGroup` | string | Yes | e.g. `"10U"` |
| `location` | string | Yes | e.g. `"Downtown"` |
| `teamName` | string | No | e.g. `"10U Football - Downtown"` (backend can derive it) |
| `participants` | array | No | Array of **student objects** from Step 1/2 (same shape as each item in `res.data.students`). |

### Example payload

```json
{
  "sport": "Football",
  "ageGroup": "10U",
  "location": "Downtown",
  "teamName": "10U Football - Downtown",
  "participants": [
    {
      "id": "parentId-childName",
      "parentId": "abc123",
      "name": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "dob": "2014-05-01",
      "ageGroup": "10U",
      "parentName": "Jane Doe",
      "parentEmail": "jane@example.com",
      "parentPhone": "555-1234",
      "sport": "Football",
      "location": "Downtown"
    }
  ]
}
```

Use the **exact student objects** you got from `getManualCreateOptions()` or `getOptionStudents()`; do not strip required fields.

### Example call (fetch)

```js
import { API_CONFIG } from '../firebase/config';

const payload = {
  sport: selectedSport,
  ageGroup: selectedAgeGroup,
  location: selectedLocation,
  teamName: selectedTeamName || `${selectedAgeGroup} ${selectedSport} - ${selectedLocation}`,
  participants: selectedStudents,
};

const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.rosters.create}`;
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const result = await res.json();
```

### Response (success)

```json
{
  "success": true,
  "data": {
    "id": "football-10u-downtown"
  }
}
```

### Response (error, e.g. validation or duplicate)

```json
{
  "success": false,
  "error": "Roster already exists for Football 10U at Downtown"
}
```

### What to do in the UI

1. If `result.success === true`: show success message, optionally navigate to the new roster (e.g. using `result.data.id`) or refresh the roster list.
2. If `result.success === false`: show `result.error` to the user (e.g. in a toast or under the form).

---

## Flow summary (which endpoint where)

| Step | UI moment | Endpoint | Response you use |
|------|-----------|----------|-------------------|
| **1** | Page load ("Create roster" screen) | `GET /rosters/options` | `data.locations`, `data.sports`, `data.ageGroups`, `data.students` → dropdowns + students list |
| **2** | User changes location/sport/age group (optional) | `GET /rosters/options/students?location=&sport=&ageGroup=` | `data` → replace students list |
| **3** | User picks students + location/sport/age group | (no API call) | Use state: `selectedStudents`, `selectedLocation`, `selectedSport`, `selectedAgeGroup` |
| **4** | User clicks "Create roster" | `POST /rosters` | `data.id` on success; `error` on failure |

---

## Direct URLs (for Postman / curl)

Replace `BASE` with your base URL (e.g. `http://127.0.0.1:5001/yau-app/us-central1/apis`).

- **Step 1:** `GET BASE/rosters/options`  
  Optional filters: `GET BASE/rosters/options?location=Downtown&sport=Football&ageGroup=10U`
- **Step 2:** `GET BASE/rosters/options/students`  
  With filters: `GET BASE/rosters/options/students?location=Downtown&sport=Football&ageGroup=10U`
- **Step 4:** `POST BASE/rosters` with JSON body (sport, ageGroup, location, teamName, participants)

---

## Optional: separate dropdown endpoints

If you prefer to load dropdowns and students in separate requests:

- **Dropdowns only:**  
  - `GET /rosters/options/locations` → `res.data` for locations  
  - `GET /rosters/options/sports` → `res.data` for sports  
  - `GET /rosters/options/age-groups` → `res.data` for age groups  
- **Students:**  
  - Same as Step 1/2: `GET /rosters/options` (and use only `data.students`) or `GET /rosters/options/students` with query params.

Response shape for each:

- `GET /rosters/options/locations` → `{ success: true, data: [ { id, name, ... } ] }`
- `GET /rosters/options/sports` → `{ success: true, data: [ "Football", "Flag Football", "Tackle Football" ] }`
- `GET /rosters/options/age-groups` → `{ success: true, data: [ "3U", "4U", ..., "14U" ] }`

Using **Step 1** (`GET /rosters/options`) once is usually simpler for the "Create roster" page.



Endpoints created for manual roster creattion

- Get everything for the form in one go (students, locations, sports, age groups).
- Get only the list of students, with optional filters by location, sport, or age group.
- Get only the list of locations for the dropdown.
- Get only the list of sports for the dropdown.
- Get only the list of age groups for the dropdown.
- Create a new roster by sending the chosen location, sport, age group, team name, and selected students.

  - `GET /rosters/options/locations` → `res.data` for locations  
  - `GET /rosters/options/sports` → `res.data` for sports  
  - `GET /rosters/options/age-groups` → `res.data` for age groups 

  - `GET /rosters/options/locations` → `{ success: true, data: [ { id, name, ... } ] }`
  - `GET /rosters/options/sports` → `{ success: true, data: [ "Football", "Flag Football", "Tackle Football" ] }`
  - `GET /rosters/options/age-groups` → `{ success: true, data: [ "3U", "4U", ..., "14U" ] }`