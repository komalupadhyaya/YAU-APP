# Grade-Based System Migration Guide

## Overview

This guide documents the migration from age-based roster and group chat logic to grade-based logic. The system now uses **grade** as the primary grouping field for rosters and group chats, while maintaining `ageGroup` for backward compatibility.

---

## Key Changes Summary

### 1. **API Endpoints Updated**

#### Backend Routes (`functions/src/routes/rosters.js`)
- **Old:** `GET /rosters/options/age-groups` → **New:** `GET /rosters/options/grades`
- **Old:** `GET /rosters/age-group/:ageGroup` → **New:** `GET /rosters/grade/:grade`

#### Frontend API Config (`src/firebase/config.js`)
- **Old:** `getOptionAgeGroups: '/rosters/options/age-groups'` → **New:** `getOptionGrades: '/rosters/options/grades'`
- **Old:** `getByAgeGroup: '/rosters/age-group/:ageGroup'` → **New:** `getByGrade: '/rosters/grade/:grade'`

#### Frontend Service (`src/services/apiService.js`)
- **Old:** `RostersService.getOptionAgeGroups()` → **New:** `RostersService.getOptionGrades()`
- **New:** `RostersService.getByGrade(grade)` (replaces `getByAgeGroup`)

### 2. **Backend Controller Methods**

#### `functions/src/controllers/rosterController.js`
- **Old:** `getOptionAgeGroups()` → **New:** `getOptionGrades()`
- **Old:** `getRostersByAgeGroup(ageGroup)` → **New:** `getRostersByGrade(grade)`
- **Updated:** `getManualCreateOptions()` and `getOptionStudents()` now accept `grade` query parameter instead of `ageGroup`

### 3. **Backend Service Methods**

#### `functions/src/services/rosterService.js`
- **Added:** `STANDARD_GRADES` constant: `["Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade"]`
- **New:** `getOptionGrades()` returns standard grade options
- **Old:** `getRostersByAgeGroup(ageGroup)` → **New:** `getRostersByGrade(grade)` (queries by `grade` field)
- **Updated:** `getOptionStudents()` now filters by `grade` instead of `ageGroup` and includes `grade` and `school_name` in student objects
- **Updated:** `getManualCreateOptions()` returns `grades` instead of `ageGroups`

### 4. **Roster ID Generation**

#### Format Change
- **Old Format:** `sport-ageGroup-location` (e.g., `soccer-10u-andrews-afb---clinton`)
- **New Format:** `sport-grade-location` (e.g., `soccer-1st-grade-andrews-afb---clinton`)

#### Files Updated:
- `src/services/rosterService.js` - `generateRosterId()` and `addPlayerToRoster()`
- `functions/src/services/groupChatService.js` - `generateRosterId()` and `createOrEnsureGroupChat()`
- `src/firebase/apis/api-members.js` - `createRostersForMember()`, `addPlayerToMatchingRoster()`, `createNewRosterForChild()`

### 5. **Group Chat ID Generation**

#### Format Change
- **Old Format:** `ageGroup_Sport_Location` (e.g., `10U_Soccer_Greenbelt,_MD`)
- **New Format:** `grade_Sport_Location` (e.g., `1st_Grade_Kickball_Greenbelt,_MD`)

#### Files Updated:
- `functions/src/services/groupChatService.js` - `generateChatId()`, `findExistingGroupChat()`, `createOrEnsureGroupChat()`

### 6. **Registration Form Changes**

#### `src/components/auth/Registration/Registration.jsx`
- **Added:** Grade dropdown field for each student (Kindergarten through 8th Grade)
- **Changed:** School name field from searchable dropdown to manual text input
- **Added:** Per-student sport and location fields (each student can have different sport/location)
- **Removed:** Parent-level sport/location step (now per-student)

#### Grade Options:
```javascript
const GRADE_OPTIONS = [
  { value: "Kindergarten", label: "Kindergarten" },
  { value: "1st Grade", label: "1st Grade" },
  // ... through 8th Grade
];
```

### 7. **Data Structure Changes**

#### Student Object (in `members` collection)
```javascript
{
  uid: "student-uid",
  firstName: "John",
  lastName: "Doe",
  dob: "2014-05-01",
  grade: "1st Grade",           // NEW: Primary grouping field
  school_name: "Benjamin Stoddert",  // NEW: School name
  ageGroup: "10U",              // RETAINED: For backward compatibility
  sport: "SOCCER",              // NEW: Per-student sport
  location: "Andrews AFB - Clinton",  // NEW: Per-student location
  // ... other fields
}
```

#### Roster Object (in `rosters` collection)
```javascript
{
  id: "soccer-1st-grade-andrews-afb---clinton",
  sport: "SOCCER",
  grade: "1st Grade",           // NEW: Primary grouping field
  ageGroup: "10U",              // RETAINED: For backward compatibility
  location: "Andrews AFB - Clinton",
  teamName: "1st Grade SOCCER - Andrews AFB - Clinton",
  participants: [
    {
      grade: "1st Grade",       // NEW
      school_name: "Benjamin Stoddert",  // NEW
      ageGroup: "10U",           // RETAINED
      // ... other fields
    }
  ],
  // ... other fields
}
```

#### Group Chat Object (in `groupChats` collection)
```javascript
{
  chatId: "1st_Grade_Kickball_Greenbelt,_MD",
  rosterId: "kickball-1st-grade-greenbelt-md",
  grade: "1st Grade",           // NEW: Primary grouping field
  ageGroup: "10U",              // RETAINED: For backward compatibility
  sport: "Kickball",
  location: "Greenbelt, MD",
  teamName: "1st Grade Kickball - Greenbelt, MD",
  // ... other fields
}
```

### 8. **Member Panel Updates**

#### Components Updated:
- `src/components/Dashboard/StudentInfo.jsx` - Displays `grade` with fallback to `ageGroup`
- `src/components/Dashboard/Dashboard.jsx` - Account summary shows `grade` with fallback
- `src/components/Pages/Profile.jsx` - Student profile displays `grade` when available

#### Display Logic:
```javascript
{student.grade || student.ageGroup || "N/A"}
```

---

## Migration Steps for Existing Data

### 1. **Backward Compatibility**

The system maintains `ageGroup` fields for backward compatibility. Existing rosters and group chats will continue to function, but new registrations will use grade-based logic.

### 2. **Data Migration (If Needed)**

If you need to migrate existing rosters to use grade-based IDs:

1. **Query all rosters** that don't have a `grade` field
2. **Calculate grade** from student `dob` or use a mapping table
3. **Update roster IDs** to new format: `sport-grade-location`
4. **Update group chat IDs** to new format: `grade_Sport_Location`
5. **Add `grade` field** to roster and group chat documents

**Note:** This migration is optional and should be done carefully with backups.

### 3. **API Query Parameter Changes**

#### Old Query Format:
```
GET /rosters/options?location=X&sport=Y&ageGroup=Z
GET /rosters/options/students?location=X&sport=Y&ageGroup=Z
```

#### New Query Format:
```
GET /rosters/options?location=X&sport=Y&grade=1st%20Grade
GET /rosters/options/students?location=X&sport=Y&grade=1st%20Grade
```

---

## Updated Endpoints Reference

### Manual Roster Creation Endpoints

#### 1. Get All Options
```
GET /rosters/options
Query Params: location?, sport?, grade?
Response: { students, locations, sports, grades }
```

#### 2. Get Students Only
```
GET /rosters/options/students
Query Params: location?, sport?, grade?
Response: { students[] }
```

#### 3. Get Grades Only
```
GET /rosters/options/grades
Response: ["Kindergarten", "1st Grade", ..., "8th Grade"]
```

#### 4. Get Rosters by Grade
```
GET /rosters/grade/:grade
Response: { rosters[] }
```

---

## Frontend Usage Examples

### Loading Roster Creation Options
```javascript
import { RostersService } from '../services/apiService';

// Load all options
const res = await RostersService.getManualCreateOptions();
const { students, locations, sports, grades } = res.data;

// Filter students by grade
const filteredRes = await RostersService.getManualCreateOptions({
  location: 'Andrews AFB - Clinton',
  sport: 'SOCCER',
  grade: '1st Grade'
});
```

### Getting Rosters by Grade
```javascript
import { RostersService } from '../services/apiService';

const res = await RostersService.getByGrade('1st Grade');
const rosters = res.data;
```

### Getting Grade Options
```javascript
import { RostersService } from '../services/apiService';

const res = await RostersService.getOptionGrades();
const grades = res.data; // ["Kindergarten", "1st Grade", ...]
```

---

## Breaking Changes

### ⚠️ **API Endpoints**
- `/rosters/options/age-groups` → `/rosters/options/grades` (404 if using old endpoint)
- `/rosters/age-group/:ageGroup` → `/rosters/grade/:grade` (404 if using old endpoint)

### ⚠️ **Query Parameters**
- `ageGroup` query param → `grade` query param in `getManualCreateOptions()` and `getOptionStudents()`

### ⚠️ **Response Structure**
- `getManualCreateOptions()` returns `grades` instead of `ageGroups`
- `getOptionStudents()` filters by `grade` instead of `ageGroup`

---

## Files Modified

### Backend
- `functions/src/routes/rosters.js`
- `functions/src/controllers/rosterController.js`
- `functions/src/services/rosterService.js`
- `functions/src/services/groupChatService.js`
- `functions/src/services/parentService.js`

### Frontend
- `src/firebase/config.js`
- `src/services/apiService.js`
- `src/components/auth/Registration/Registration.jsx`
- `src/firebase/apis/postRegistration.js`
- `src/firebase/apis/api-members.js`
- `src/services/rosterService.js`
- `src/components/Dashboard/StudentInfo.jsx`
- `src/components/Dashboard/Dashboard.jsx`
- `src/components/Pages/Profile.jsx`

---

## Testing Checklist

-  Registration form accepts grade input
-  Registration form accepts manual school name input
-  Per-student sport/location selection works
-  Roster creation uses grade-based IDs
-  Group chat creation uses grade-based IDs
-  `GET /rosters/options/grades` returns correct grades
-  `GET /rosters/grade/:grade` returns correct rosters
-  `getManualCreateOptions()` with `grade` filter works
-  `getOptionStudents()` with `grade` filter works
-  Member dashboard displays grade correctly
-  Student info displays grade correctly
-  Profile page displays grade correctly

---

## Notes

1. **Backward Compatibility:** The system retains `ageGroup` fields for existing data. New registrations will have both `grade` and `ageGroup`.

2. **Date Handling:** The `ConvertYYMMDD` and `calculateAgeGroup` functions have been improved to use `dayjs` for robust date parsing and handle invalid dates gracefully.

3. **Per-Student Sport/Location:** Each student can now have different sports and locations, allowing more flexibility in registration.

4. **School Name:** School name is now a manual text input field instead of a dropdown, giving parents more flexibility.

---

## Support

For questions or issues related to this migration, please refer to:
- Registration form: `src/components/auth/Registration/Registration.jsx`
- Roster service: `functions/src/services/rosterService.js`
- Group chat service: `functions/src/services/groupChatService.js`
