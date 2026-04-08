# Rosters Page Documentation
## `/admin/rosters` - Current Endpoints and Functionalities

**Date:** February 3, 2026  
**Page:** `http://localhost:3001/admin/rosters`  
**Component:** `src/components/sections/Rosters.jsx`

---

## 📋 Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Search Functionality](#search-functionality)
3. [Filter Functionality](#filter-functionality)
4. [Create Roster Functionality](#create-roster-functionality)
5. [Other Functionalities](#other-functionalities)
6. [Data Flow](#data-flow)

---

## 🔌 API Endpoints

### Base URL Configuration
- **Development:** `http://127.0.0.1:5001/yau-app/us-central1/apis`
- **Production:** `https://us-central1-yau-app.cloudfunctions.net/apis`

### 1. Get All Rosters
**Endpoint:** `GET /rosters`  
**Function:** `getRosters()`  
**Location:** `src/firebase/firestore.js:315`  
**Usage:** Loads all rosters on page initialization and refresh  
**Called From:**
- `loadRosterData()` - Line 152
- `initializeRosters()` - Line 70

**Response Structure:**
```javascript
[
  {
    id: string,
    teamName: string,
    sport: string,
    ageGroup: string,
    location: string,
    coachId: string | null,
    coachName: string | null,
    hasAssignedCoach: boolean,
    hasPlayers: boolean,
    playerCount: number,
    participants: Array<Participant>,
    status: 'active' | 'needs-coach' | 'needs-players' | 'empty',
    lastUpdated: string (ISO date),
    updatedAt: string (ISO date)
  }
]
```

---

### 2. Get Manual Create Options
**Endpoint:** `GET /rosters/options`  
**Function:** `getManualCreateOptions(filters?)`  
**Location:** `src/firebase/firestore.js:269`  
**Usage:** Loads form options (locations, sports, age groups, students) for creating a roster  
**Called From:**
- `handleOpenCreateRoster()` - Line 454
- `handleCreateRosterFilterChange()` - Line 470

**Query Parameters (Optional):**
- `location` (string)
- `sport` (string)
- `ageGroup` (string)

**Response Structure:**
```javascript
{
  locations: Array<string | { id: string, name: string }>,
  sports: Array<string | { name: string }>,
  ageGroups: Array<string | { name: string }>,
  students: Array<Student>
}
```

---

### 3. Get Option Students (Filtered)
**Endpoint:** `GET /rosters/options/students`  
**Function:** `getOptionStudents({ location?, sport?, ageGroup? })`  
**Location:** `src/firebase/firestore.js:285`  
**Usage:** Gets filtered list of students based on location, sport, and age group  
**Called From:**
- `handleCreateRosterFilterChange()` - Line 473

**Query Parameters:**
- `location` (string, optional)
- `sport` (string, optional)
- `ageGroup` (string, optional)

**Response Structure:**
```javascript
Array<Student>
```

---

### 4. Create Roster
**Endpoint:** `POST /rosters`  
**Function:** `createRoster(payload)`  
**Location:** `src/firebase/firestore.js:301`  
**Usage:** Creates a new roster manually  
**Called From:**
- `handleCreateRosterSubmit()` - Line 521

**Request Body:**
```javascript
{
  sport: string,              // Required
  ageGroup: string,           // Required
  location: string,           // Required
  teamName: string,           // Optional (auto-generated if not provided)
  participants: Array<Student> // Optional
}
```

**Response Structure:**
```javascript
{
  id: string,
  ...rosterData
}
```

---

### 5. Update Roster
**Endpoint:** `PUT /rosters/:id`  
**Function:** `updateRoster(id, updates)`  
**Location:** `src/firebase/firestore.js:346`  
**Usage:** Updates roster data (participants, coach assignment, status, etc.)  
**Called From:**
- `handleAddSelectedStudents()` - Line 301 (updates participants)
- `handleCoachAssignment()` - Line 377 (assigns coach)

**Request Body (examples):**
```javascript
// Adding players
{
  participants: Array<Participant>,
  playerCount: number,
  hasPlayers: boolean,
  status: string,
  lastUpdated: string,
  updatedAt: string
}

// Assigning coach
{
  coachId: string,
  coachName: string,
  hasAssignedCoach: boolean,
  status: string,
  updatedAt: string
}
```

---

### 6. Get All Coaches
**Endpoint:** `GET /coaches`  
**Function:** `getCoaches()`  
**Location:** `src/firebase/firestore.js:147`  
**Usage:** Loads all coaches for assignment dropdown and coach assignment modal  
**Called From:**
- `loadRosterData()` - Line 151

**Response Structure:**
```javascript
Array<{
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  role: 'coach',
  primarySport: string,
  secondarySports: Array<string>,
  yearsExperience: number,
  assignedTeams: Array<Team>,
  updatedAt: string
}>
```

---

### 7. Update Coach
**Endpoint:** `PUT /coaches/:id`  
**Function:** `updateCoach(id, updates)`  
**Location:** `src/firebase/firestore.js:178`  
**Usage:** Updates coach's assigned teams when assigning a roster  
**Called From:**
- `handleCoachAssignment()` - Line 403

**Request Body:**
```javascript
{
  assignedTeams: Array<{
    id: string,
    sport: string,
    ageGroup: string,
    location: string,
    teamName: string,
    isPrimary: boolean
  }>,
  updatedAt: string
}
```

---

### 8. Get All Parents
**Endpoint:** `GET /parents`  
**Function:** `getParents()`  
**Location:** `src/firebase/apis/api-parents.js:584`  
**Usage:** Loads all parents/registrations for filtering eligible students  
**Called From:**
- `loadRosterData()` - Line 150
- `handleAddPlayers()` - Line 194 (uses local state)

---

### 9. Update Parent
**Endpoint:** `PUT /parents/:id`  
**Function:** `updateParent(id, updates)`  
**Location:** `src/firebase/apis/api-parents.js:621`  
**Usage:** Updates parent's assignments when adding students to roster  
**Called From:**
- `handleAddSelectedStudents()` - Line 329

**Request Body:**
```javascript
{
  assignments: Array<{
    rosterId: string,
    teamName: string,
    childName: string,
    coachName: string
  }>,
  assignedAt: string,
  assignedBy: string,
  lastAssignmentUpdate: string,
  updatedAt: string
}
```

---

## 🔍 Search Functionality

### Search Implementation
**Location:** `src/components/sections/Rosters.jsx:588-594`

**Search Field:**
- Input field with search icon (Line 834-841)
- State: `searchTerm` (Line 15)
- Placeholder: "Search rosters..."

**Search Criteria:**
Searches across multiple fields (case-insensitive):
- `roster.teamName`
- `roster.sport`
- `roster.ageGroup`
- `roster.location`
- `roster.coachName`

**Search Logic:**
```javascript
const searchMatch = !searchTerm || (
  roster.teamName?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
  roster.sport?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
  roster.ageGroup?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
  roster.location?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
  roster.coachName?.toLowerCase().includes(searchTerm?.toLowerCase())
);
```

**Filter Reset:**
- Resets to page 1 when search term changes (Line 97-98)
- "Reset Filter" button clears all filters including search (Line 738-744)

**Student Search (Add Players Modal):**
- Searches available students by student name or parent name (Line 1191-1195)
- State: `studentSearchTerm` (Line 32)

---

## 🎛️ Filter Functionality

### Filter Controls
**Location:** `src/components/sections/Rosters.jsx:765-843`

### 1. Age Group Filter
**State:** `selectedAgeGroup` (Line 11)  
**Options:**
- `'all'` - All Age Groups
- `'3U'`, `'4U'`, `'5U'`, `'6U'`, `'7U'`, `'8U'`, `'9U'`, `'10U'`, `'11U'`, `'12U'`, `'13U'`, `'14U'`

**Filter Logic:** `roster.ageGroup === selectedAgeGroup` (Line 573)

---

### 2. Sport Filter
**State:** `selectedSport` (Line 12)  
**Options:**
- `'all'` - All Sports
- `'Soccer'`, `'Basketball'`, `'Baseball'`, `'Track & Field'`, `'Flag Football'`, `'Tackle Football'`, `'Kickball'`, `'Golf'`, `'Cheer'`

**Filter Logic:** `roster.sport === selectedSport` (Line 574)

---

### 3. Location Filter
**State:** `selectedLocation` (Line 13)  
**Options:**
- `'all'` - All Locations
- `'National Harbor, MD'`, `'Greenbelt, MD'`, `'Bowie, MD'`, `'Andrews AFB - Clinton'`, `'Waldorf-Laplata, MD'`, `'New York'`

**Filter Logic:** `roster.location === selectedLocation` (Line 575)

---

### 4. Coach Assignment Filter (Admin Only)
**State:** `selectedCoach` (Line 14)  
**Options:**
- `'all'` - All Rosters
- `'assigned'` - Has Assigned Coach
- `'unassigned'` - Needs Coach Assignment
- Specific coach IDs (from coaches list)

**Filter Logic:** (Line 577-586)
```javascript
if (selectedCoach === 'unassigned') {
  coachMatch = !roster.hasAssignedCoach;
} else if (selectedCoach === 'assigned') {
  coachMatch = roster.hasAssignedCoach;
} else {
  coachMatch = roster.coachId === selectedCoach;
}
```

---

### Combined Filter Logic
**Location:** `src/components/sections/Rosters.jsx:560-598`

All filters are combined with AND logic:
```javascript
return ageGroupMatch && sportMatch && locationMatch && coachMatch && searchMatch;
```

**Role-Based Filtering:**
- **Admin:** Sees all rosters
- **Coach:** Only sees rosters where `roster.coachId === userId` (Line 567)

**Pagination Reset:**
- Resets to page 1 when any filter changes (Line 97-98)

---

## ➕ Create Roster Functionality

### Create Roster Flow
**Location:** `src/components/sections/Rosters.jsx:443-530`

### Step 1: Open Create Modal
**Function:** `handleOpenCreateRoster()` (Line 444)  
**Trigger:** "Create Roster" button click (Line 752)

**Actions:**
1. Opens modal (`setIsCreateRosterModalOpen(true)`)
2. Resets form state
3. Calls `GET /rosters/options` to load initial options
4. Sets locations, sports, age groups, and students

---

### Step 2: Filter Students
**Function:** `handleCreateRosterFilterChange()` (Line 466)  
**Triggers:**
- Location change (Line 485)
- Sport change (Line 490)
- Age group change (Line 495)

**Logic:**
- If no filters selected: Calls `GET /rosters/options` (all students)
- If filters selected: Calls `GET /rosters/options/students?location=X&sport=Y&ageGroup=Z`

**Updates:** `createRosterStudents` state with filtered list

---

### Step 3: Select Students
**Function:** `toggleCreateRosterStudent()` (Line 498)  
**Action:** Toggles student selection in `createRosterSelectedStudents` array

---

### Step 4: Submit Roster
**Function:** `handleCreateRosterSubmit()` (Line 506)

**Validation:**
- Requires: `location`, `sport`, `ageGroup` (Line 507-510)

**Request Payload:**
```javascript
{
  sport: string,
  ageGroup: string,
  location: string,
  teamName: string, // Auto-generated if empty: `${ageGroup} ${sport} - ${location}`
  participants: Array<Student>
}
```

**API Call:** `POST /rosters` (Line 521)

**Success Actions:**
1. Closes modal
2. Refreshes roster data (`loadRosterData()`)
3. Shows success alert

---

## 🎯 Other Functionalities

### 1. Assign Coach to Roster
**Location:** `src/components/sections/Rosters.jsx:356-419`

**Trigger:**
- "Assign Coach" button on roster card (Line 1011-1018)
- "Assign Coach" button in roster detail modal (Line 1606-1617)
- Alert banner for rosters needing coaches (Line 890-903)

**Flow:**
1. Opens "Assign Coach" modal with roster info
2. Displays available coaches with:
   - Primary sport match (green highlight)
   - Secondary sport match (blue highlight)
   - Experience and current assignments
3. User clicks coach to assign
4. **API Calls:**
   - `PUT /rosters/:id` - Updates roster with coach (Line 377)
   - `PUT /coaches/:id` - Updates coach's assigned teams (Line 403)
5. Refreshes data and shows success alert

---

### 2. Add Players to Roster
**Location:** `src/components/sections/Rosters.jsx:188-354`

**Trigger:**
- "Add Players" button on roster card (Line 1023-1041)
- "Add Players" button in roster detail modal (Line 1619-1632)

**Flow:**
1. Opens "Add Players" modal
2. Filters eligible students from local `parents` state:
   - Matches roster's sport, location, and age group
   - Excludes students already in roster
3. User searches and selects students
4. **API Calls:**
   - `PUT /rosters/:id` - Adds participants to roster (Line 301)
   - `PUT /parents/:id` - Updates each parent's assignments (Line 329)
5. Updates roster status based on player count and coach assignment
6. Refreshes data and shows success alert

**Eligibility Criteria:**
```javascript
const matchesSport = parent.sport === roster.sport;
const matchesLocation = parent.location === roster.location;
const matchesAgeGroup = student.ageGroup === roster.ageGroup;
const alreadyInRoster = roster.participants?.some(p => 
  p.parentId === parent.id && 
  p.name === student.name
);
```

---

### 3. View Roster Details
**Location:** `src/components/sections/Rosters.jsx:1571-1991`

**Trigger:** "View Details" button on roster card (Line 1001-1009)

**Displays:**
- Roster status (active, needs-coach, needs-players, empty)
- Team information (name, sport, age group, location, player count)
- Assigned coach information (if assigned)
- Complete parent/student information grouped by family
- Team statistics
- Action buttons (Export CSV, Assign Coach, Add Players)

---

### 4. Export Roster to CSV
**Location:** `src/components/sections/Rosters.jsx:532-558`

**Trigger:**
- "Export CSV" button in roster detail modal (Line 1598-1605)
- "Export Family List" button in modal footer (Line 1945-1952)

**Function:** `handleExportCSV(rosterId)` (Line 532)

**CSV Columns:**
- `#` (index)
- `Student Name`
- `Age Group`
- `Current Age` (calculated)
- `Date of Birth`
- `Parent Name`
- `Parent Email`
- `Parent Phone`
- `Sport`
- `Location`
- `Coach`
- `Team Status`
- `Last Updated`

**File Naming:** `${teamName}_roster_YYYY-MM-DD.csv`

---

### 5. Refresh Data
**Location:** `src/components/sections/Rosters.jsx:144-185`

**Trigger:** "Refresh Data" button (Line 746-749)

**Function:** `loadRosterData()` (Line 144)

**API Calls:**
- `GET /parents` (Line 150)
- `GET /coaches` (Line 151)
- `GET /rosters` (Line 152)

**Actions:**
- Loads all data in parallel
- Filters coaches by role === 'coach'
- Sorts rosters by status and age group
- Updates state and stops loading

---

### 6. Bulk Sync All Rosters
**Location:** `src/components/sections/Rosters.jsx:421-441`

**Trigger:** "Sync All Rosters" button (Line 756-759)

**Function:** `handleBulkSync()` (Line 422)

**Action:** Calls `loadRosterData()` to refresh all roster data

---

### 7. Pagination
**Location:** `src/components/sections/Rosters.jsx:604-627`

**Controls:**
- Items per page: 5, 10, 25, 50, 100 (Line 61)
- First page, Previous, Page numbers, Next, Last page buttons
- Shows current range: "Showing X to Y of Z entries"

**State:**
- `currentPage` (Line 22)
- `itemsPerPage` (Line 23)

**Logic:**
- Filters rosters first, then paginates active rosters
- Resets to page 1 when filters/search change (Line 97-98)

---

### 8. Statistics Dashboard
**Location:** `src/components/sections/Rosters.jsx:847-878`

**Displays:**
- Total Rosters (or "Your Rosters" for coaches)
- ✅ Ready Teams (has players + coach)
- ❌ Need Coaches (has players, no coach)
- 👥 Need Players (has coach, no players)
- Total Families
- Assigned Coaches

**Function:** `getDemandStatistics()` (Line 128)

---

## 📊 Data Flow

### Page Initialization
```
1. Component mounts
2. useEffect triggers initializeRosters()
3. Checks if rosters exist (GET /rosters)
4. If no rosters, generates initial rosters
5. Calls loadRosterData()
   - GET /parents
   - GET /coaches
   - GET /rosters
6. Filters and displays rosters
```

### Create Roster Flow
```
1. User clicks "Create Roster"
2. GET /rosters/options → Loads form options
3. User selects location/sport/ageGroup
4. GET /rosters/options/students?location=X&sport=Y&ageGroup=Z → Filters students
5. User selects students
6. POST /rosters → Creates roster
7. loadRosterData() → Refreshes list
```

### Add Players Flow
```
1. User clicks "Add Players" on roster
2. Filters eligible students from local parents state
3. User selects students
4. PUT /rosters/:id → Updates roster participants
5. PUT /parents/:id (for each parent) → Updates assignments
6. loadRosterData() → Refreshes list
```

### Assign Coach Flow
```
1. User clicks "Assign Coach" on roster
2. Displays available coaches (from local state)
3. User selects coach
4. PUT /rosters/:id → Assigns coach to roster
5. PUT /coaches/:id → Updates coach's assigned teams
6. loadRosterData() → Refreshes list
```

---

## 🔄 State Management

### Main State Variables
- `rosters` - Array of all rosters
- `coaches` - Array of all coaches
- `parents` - Array of all parents/registrations
- `selectedAgeGroup`, `selectedSport`, `selectedLocation`, `selectedCoach` - Filter states
- `searchTerm` - Search query
- `currentPage`, `itemsPerPage` - Pagination
- `loading` - Loading state

### Modal States
- `isRosterModalOpen`, `selectedRoster` - View details modal
- `isAssignCoachModalOpen`, `assigningRoster` - Assign coach modal
- `isAddPlayersModalOpen`, `addingPlayersRoster`, `availableStudents`, `selectedStudents` - Add players modal
- `isCreateRosterModalOpen`, `createRosterLocations`, `createRosterSports`, `createRosterAgeGroups`, `createRosterStudents`, `createRosterSelectedLocation`, `createRosterSelectedSport`, `createRosterSelectedAgeGroup`, `createRosterSelectedStudents`, `createRosterTeamName` - Create roster modal

---

## 📝 Notes for Endpoint Changes

When updating endpoints, ensure:

1. **Base URL** is correctly configured in `src/firebase/config.js:27-30`
2. **Endpoint paths** match backend routes in `src/firebase/config.js:154-176`
3. **Request/Response formats** match backend expectations
4. **Error handling** is maintained in all API calls
5. **Loading states** are properly managed
6. **Data refresh** happens after mutations (`loadRosterData()`)

---

## 🚨 Current Issues / Areas for Change

Based on the code analysis, the following endpoints may need updates:

1. **GET /rosters/options** - May need to return consistent data structure
2. **GET /rosters/options/students** - Filtering logic may need backend optimization
3. **POST /rosters** - Payload structure should be validated
4. **PUT /rosters/:id** - Multiple update scenarios (participants, coach, status)
5. **PUT /coaches/:id** - Team assignment structure
6. **PUT /parents/:id** - Assignment tracking structure

---

**Document Generated:** February 3, 2026  
**Last Updated:** February 3, 2026
