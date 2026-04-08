# Registration Flow Guide

## Overview
This document describes the student registration flow, from form submission to Firebase document creation.

---

## Flow Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Registration   │────▶│  Session Storage │────▶│     Payment     │
│     Form        │     │ (pendingRegistration)   │   (Stripe)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                            │
                                                            ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Firebase Auth  │◀────│  postRegistration │◀────│  Payment Success │
│   User Created  │     │   (after payment) │     │   (webhook)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Member Document│────▶│  Roster Service  │────▶│  Group Chat     │
│   (Firestore)   │     │  (addPlayerToRoster)    │  (createOrEnsureGroupChat)
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Uniform Order  │  (only for oneTime plan)
│   (Firestore)   │
└─────────────────┘
```

---

## Step 1: Registration Form Submission

**File:** `src/components/auth/Registration/Registration.jsx`

When the user submits the registration form, the data is stored in `sessionStorage` before redirecting to checkout.

### Session Storage Payload Structure

```javascript
{
  // Basic parent info
  parentFirst: "John",
  parentLast: "Doe",
  userEmail: "john.doe@example.com",
  userUID: "",                          // Empty - created after payment
  password: "userPassword123",
  mobile: "+1234567890",
  
  // Member data structure
  memberData: {
    // Parent info
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    location: "New York",               // From first child
    sport: "SOCCER",                    // From first child (uppercase)
    
    // Students array (mapped from form children)
    students: [
      {
        uid: "student_1709312000000_0", // Temporary ID (timestamp + index)
        firstName: "Jane",
        lastName: "Doe",
        dob: "01-15-2010",              // Format: MM-DD-YYYY
        ageGroup: "14U",                // Calculated from DOB
        grade: "8",
        school_name: "Lincoln Middle School",
        sport: "SOCCER",
        location: "New York",
        uniformTop: "YM",               // Youth Medium
        uniformBottom: "YM",
        registrationAgreement: true
      }
    ],
    
    // Membership info
    membershipType: "free",             // Always starts as free
    isPaidMember: false,
    registrationPlan: "oneTime",        // or "monthly"
    
    // Agreements (all boolean)
    consentText: true,
    registrationAgreement: true,
    parentConduct: true,
    fundraiserCommitment: true,
    encouragementCommitment: true,
    noRefundPolicy: true,
    
    // Metadata
    createdAt: new Date(),
    registrationSource: "web"
  },
  
  // Plan info
  selectedPlan: "oneTime",              // "oneTime" or "monthly"
  childrenCount: 1,
  basePrice: 150,                       // $150 for oneTime, $50/month for monthly
  includeUniform: true                  // true only for oneTime plan
}
```

---

## Step 2: Payment Processing

After storing data in session storage, the user is redirected to:
```
/checkout?plan=oneTime&email=john.doe@example.com
```

The payment is processed via Stripe. Upon successful payment, the webhook calls `completeRegistrationAfterPayment()`.

---

## Step 3: Post-Registration Processing

**File:** `src/firebase/apis/postRegistration.js`

### Function: `completeRegistrationAfterPayment(paymentIntent)`

This function is called after successful payment to complete the registration.

#### Process Flow:

1. **Retrieve pending registration** from sessionStorage
2. **Create Firebase Auth user** with email/password
3. **Add member document** to Firestore
4. **Create uniform orders** (if oneTime plan)
5. **Process rosters and group chats** for each student
6. **Send welcome SMS**
7. **Clear session storage**

---

## Step 4: Firebase Documents Created

### 4.1 Member Document (Firestore)

**Collection:** `members`

```javascript
{
  // Parent info
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  location: "New York",
  sport: "SOCCER",
  
  // Payment info
  paymentIntentId: "pi_3Oxxxxx",
  membershipType: "paid",
  isPaidMember: true,
  registrationPlan: "oneTime",
  paymentStatus: "paid",
  paidAt: new Date(),
  
  // Students array (with Firestore-generated UIDs)
  students: [
    {
      uid: "ABC123DEF456",              // Firestore auto-generated ID
      firstName: "Jane",
      lastName: "Doe",
      dob: "01-15-2010",
      ageGroup: "14U",
      grade: "8",
      school_name: "Lincoln Middle School",
      sport: "SOCCER",
      location: "New York",
      uniformTop: "YM",
      uniformBottom: "YM"
    }
  ],
  
  // Agreements
  consentText: true,
  registrationAgreement: true,
  parentConduct: true,
  fundraiserCommitment: true,
  encouragementCommitment: true,
  noRefundPolicy: true,
  
  // Metadata
  createdAt: new Date(),
  registrationSource: "web",
  uid: "authUID123"                     // Firebase Auth UID
}
```

### 4.2 Roster Service Call

**Service:** `RosterService.addPlayerToRoster(parentData, studentData)`

#### Parent Data Payload:
```javascript
{
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+1234567890",
  uid: "authUID123",
  sport: "SOCCER",
  location: "New York"
}
```

#### Student Data Payload:
```javascript
{
  firstName: "Jane",
  lastName: "Doe",
  dob: "01-15-2010",
  ageGroup: "14U",
  grade: "8",
  school_name: "Lincoln Middle School",
  sport: "SOCCER",
  location: "New York"
}
```

### 4.3 Group Chat Service Call

**Service:** `GroupChatService.createOrEnsureGroupChat(parentData, studentData)`

Uses the same parent and student payloads as the roster service.

### 4.4 Uniform Order Document (oneTime plan only)

**Collection:** `uniformOrders`

```javascript
{
  studentId: "ABC123DEF456",
  studentName: "Jane Doe",
  parentId: "authUID123",               // Real Firebase UID
  parentName: "John Doe",
  parentEmail: "john.doe@example.com",
  parentPhone: "+1234567890",
  team: "SOCCER",
  ageGroup: "14U",
  uniformTop: "YM",
  uniformBottom: "YM",
  paymentIntentId: "pi_3Oxxxxx",
  paymentStatus: "completed",
  orderStatus: "processing",
  orderSource: "registration",
  amount: 0,                            // $0 - included in one-time payment
  createdAt: new Date(),
  orderDate: new Date()
}
```

---

## Helper Functions

### Date Conversion: `ConvertYYMMDD(YYYYMMDD)`

Converts date from `YYYY-MM-DD` (form input) to `MM-DD-YYYY` (storage format).

**Input:** `"2010-01-15"`  
**Output:** `"01-15-2010"`

### Age Group Calculation: `calculateAgeGroup(dob)`

Calculates the age group based on date of birth using the roster logic:
- Cutoff date: July 31 of current year
- Valid range: 3-14 years old
- Returns format: `"14U"`, `"8U"`, etc.

**Example:**
- DOB: `"2010-01-15"` (born Jan 15, 2010)
- Current year: 2024
- Season age: 14
- Birthday this year: Jan 15, 2024 (before July 31 cutoff)
- Result: `"14U"`

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/auth/Registration/Registration.jsx` | Registration form, stores data in sessionStorage |
| `src/firebase/apis/postRegistration.js` | Post-payment processing, creates Firebase documents |
| `src/services/rosterService.js` | Adds players to rosters |
| `src/services/groupChatService.js` | Creates/ensures group chats |
| `src/firebase/ApiClient.js` | API client for SMS and uniform orders |

---

## Important Notes

1. **Grade-based grouping:** The system now uses `grade` instead of `ageGroup` for roster and chat grouping (ageGroup is kept for backward compatibility)

2. **One-time plan includes uniform:** Only the `oneTime` plan creates uniform orders

3. **Student UID generation:** Temporary UIDs are generated in the form, then replaced with Firestore auto-generated IDs

4. **Error handling:** SMS and uniform order failures don't fail the entire registration - they're logged and the process continues

5. **Phone format:** Phone numbers are stored with country code (e.g., `+1234567890`)

6. **Sport format:** Sport values are always stored in UPPERCASE
