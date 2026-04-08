# Rosters Page - Endpoints Summary & Change Checklist

## 🎯 Quick Reference: All Endpoints Used

### Primary Endpoints

| Endpoint | Method | Purpose | Current Usage |
|----------|--------|---------|---------------|
| `/rosters` | GET | Get all rosters | ✅ Main data loading |
| `/rosters/options` | GET | Get create form options | ⚠️ May need structure update |
| `/rosters/options/students` | GET | Get filtered students | ⚠️ Filtering may need optimization |
| `/rosters` | POST | Create new roster | ⚠️ Payload structure validation needed |
| `/rosters/:id` | PUT | Update roster | ⚠️ Multiple update scenarios |
| `/coaches` | GET | Get all coaches | ✅ Working |
| `/coaches/:id` | PUT | Update coach assignments | ⚠️ Team structure may need update |
| `/parents` | GET | Get all parents | ✅ Working |
| `/parents/:id` | PUT | Update parent assignments | ⚠️ Assignment structure may need update |

---

## 🔍 Search & Filter Endpoints

### Current Implementation
- **Search:** Client-side filtering (no API endpoint)
- **Filters:** Client-side filtering (no API endpoint)

### Filter Options:
- Age Group: `all`, `3U`, `4U`, `5U`, `6U`, `7U`, `8U`, `9U`, `10U`, `11U`, `12U`, `13U`, `14U`
- Sport: `all`, `Soccer`, `Basketball`, `Baseball`, `Track & Field`, `Flag Football`, `Tackle Football`, `Kickball`, `Golf`, `Cheer`
- Location: `all`, `National Harbor, MD`, `Greenbelt, MD`, `Bowie, MD`, `Andrews AFB - Clinton`, `Waldorf-Laplata, MD`, `New York`
- Coach: `all`, `assigned`, `unassigned`, or specific coach ID

---

## ➕ Create Roster Flow - Detailed

### Step 1: Load Form Options
```
GET /rosters/options
```
**Expected Response:**
```json
{
  "locations": ["Location1", "Location2", ...],
  "sports": ["Sport1", "Sport2", ...],
  "ageGroups": ["3U", "4U", ...],
  "students": [...]
}
```

**⚠️ Potential Issues:**
- Response structure may vary (string arrays vs object arrays)
- Students array may be empty initially

---

### Step 2: Filter Students
```
GET /rosters/options/students?location=X&sport=Y&ageGroup=Z
```

**Query Parameters:**
- `location` (optional)
- `sport` (optional)
- `ageGroup` (optional)

**Expected Response:**
```json
[
  {
    "id": "student-id",
    "name": "Student Name",
    "firstName": "First",
    "lastName": "Last",
    "ageGroup": "10U",
    "parentName": "Parent Name",
    "parentId": "parent-id",
    ...
  }
]
```

**⚠️ Potential Issues:**
- Filtering logic may need backend optimization
- Response format consistency

---

### Step 3: Create Roster
```
POST /rosters
```

**Request Body:**
```json
{
  "sport": "Soccer",
  "ageGroup": "10U",
  "location": "National Harbor, MD",
  "teamName": "10U Soccer - National Harbor, MD", // Optional, auto-generated if empty
  "participants": [
    {
      "id": "student-id",
      "name": "Student Name",
      ...
    }
  ]
}
```

**⚠️ Potential Issues:**
- Payload structure validation needed
- Participants array structure
- Auto-generated teamName format

---

## 🔄 Update Roster Scenarios

### Scenario 1: Add Players
```
PUT /rosters/:id
```

**Request Body:**
```json
{
  "participants": [...], // Combined existing + new
  "playerCount": 5,
  "hasPlayers": true,
  "status": "needs-coach" | "active",
  "lastUpdated": "2026-02-03T...",
  "updatedAt": "2026-02-03T..."
}
```

---

### Scenario 2: Assign Coach
```
PUT /rosters/:id
```

**Request Body:**
```json
{
  "coachId": "coach-id",
  "coachName": "Coach Name",
  "hasAssignedCoach": true,
  "status": "active" | "needs-players",
  "updatedAt": "2026-02-03T..."
}
```

**Also Updates Coach:**
```
PUT /coaches/:id
```

**Request Body:**
```json
{
  "assignedTeams": [
    {
      "id": "roster-id",
      "sport": "Soccer",
      "ageGroup": "10U",
      "location": "National Harbor, MD",
      "teamName": "10U Soccer - National Harbor, MD",
      "isPrimary": true | false
    }
  ],
  "updatedAt": "2026-02-03T..."
}
```

---

### Scenario 3: Update Parent Assignments
```
PUT /parents/:id
```

**Request Body:**
```json
{
  "assignments": [
    {
      "rosterId": "roster-id",
      "teamName": "10U Soccer - National Harbor, MD",
      "childName": "Student Name",
      "coachName": "Coach Name"
    }
  ],
  "assignedAt": "2026-02-03T...",
  "assignedBy": "admin" | "user-id",
  "lastAssignmentUpdate": "2026-02-03T...",
  "updatedAt": "2026-02-03T..."
}
```

---

## 📋 Checklist for Endpoint Changes

### ✅ Verify These Endpoints Work Correctly:

- [ ] `GET /rosters` - Returns all rosters with correct structure
- [ ] `GET /rosters/options` - Returns locations, sports, ageGroups, students
- [ ] `GET /rosters/options/students` - Filters correctly by location/sport/ageGroup
- [ ] `POST /rosters` - Creates roster with participants
- [ ] `PUT /rosters/:id` - Updates participants, coach, status correctly
- [ ] `GET /coaches` - Returns all coaches with assignedTeams
- [ ] `PUT /coaches/:id` - Updates assignedTeams array correctly
- [ ] `GET /parents` - Returns all parents with students/children
- [ ] `PUT /parents/:id` - Updates assignments array correctly

### ⚠️ Potential Changes Needed:

1. **Response Structure Consistency**
   - Ensure `/rosters/options` returns consistent format
   - Verify student objects have all required fields

2. **Filtering Optimization**
   - Consider moving search/filter to backend
   - Add query parameters to `GET /rosters` for filtering

3. **Payload Validation**
   - Validate `POST /rosters` payload structure
   - Ensure `PUT /rosters/:id` handles all update scenarios

4. **Status Management**
   - Verify roster status calculation logic
   - Ensure status updates correctly on changes

5. **Assignment Tracking**
   - Verify parent assignments structure
   - Ensure coach assignedTeams updates correctly

---

## 🔧 Code Locations for Updates

### Frontend API Calls:
- `src/firebase/firestore.js` - All roster API functions
- `src/firebase/config.js` - Endpoint configuration
- `src/components/sections/Rosters.jsx` - UI logic and API calls

### Key Functions:
- `getRosters()` - Line 315 in firestore.js
- `getManualCreateOptions()` - Line 269 in firestore.js
- `getOptionStudents()` - Line 285 in firestore.js
- `createRoster()` - Line 301 in firestore.js
- `updateRoster()` - Line 346 in firestore.js
- `getCoaches()` - Line 147 in firestore.js
- `updateCoach()` - Line 178 in firestore.js
- `getParents()` - Line 584 in api-parents.js
- `updateParent()` - Line 621 in api-parents.js

---

## 📝 Testing Checklist

After endpoint changes, test:

1. **Page Load**
   - [ ] Rosters load correctly
   - [ ] Filters work
   - [ ] Search works
   - [ ] Pagination works

2. **Create Roster**
   - [ ] Form options load
   - [ ] Student filtering works
   - [ ] Roster creation succeeds
   - [ ] New roster appears in list

3. **Add Players**
   - [ ] Eligible students show correctly
   - [ ] Students can be selected
   - [ ] Players added successfully
   - [ ] Roster updates correctly
   - [ ] Parent assignments updated

4. **Assign Coach**
   - [ ] Coaches list loads
   - [ ] Coach assignment succeeds
   - [ ] Roster status updates
   - [ ] Coach's assignedTeams updated

5. **View Details**
   - [ ] Roster details display correctly
   - [ ] All information accurate
   - [ ] Export CSV works

---

**Last Updated:** February 3, 2026
