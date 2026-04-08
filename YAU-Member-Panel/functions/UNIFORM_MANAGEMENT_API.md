# Uniform Management API Documentation

## 🏒 Overview
Complete uniform management system that automatically tracks uniform purchases and provides admin controls for delivery status.

## 📊 Database Structure
**Collection**: `uniform_orders`

```javascript
{
  "studentId": "uuid",
  "studentName": "John Doe",
  "parentId": "parent_uuid", 
  "parentName": "Jane Doe",
  "parentEmail": "jane@example.com",
  "parentPhone": "301-292-3688",
  "team": "SOCCER",
  "ageGroup": "U12",
  "uniformTop": "Medium",
  "uniformBottom": "Medium", 
  "orderDate": "2025-01-05T10:30:00Z",
  "paymentIntentId": "pi_stripe_id",
  "paymentStatus": "completed",
  "orderSource": "registration", // registration, standalone, admin
  "received": false, // Admin toggle
  "receivedDate": null,
  "receivedBy": null, // Admin who marked as received
  "notes": "",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## 🔌 API Endpoints

### Admin Endpoints (require admin auth)

#### Get All Uniform Orders
```
GET /uniforms?team=SOCCER&received=false&limit=50
```
**Query Params:**
- `team` - Filter by team
- `ageGroup` - Filter by age group  
- `received` - true/false for delivery status
- `paymentStatus` - completed, pending, etc.
- `limit` - Number of results

#### Get Uniform Summary
```
GET /uniforms/summary?team=SOCCER
```
**Returns:** Statistics including total orders, received count, team breakdown

#### Search Orders
```
GET /uniforms/search?q=john
```
**Searches:** Student name and parent name

#### Update Received Status
```
PUT /uniforms/:orderId/received
Body: {
  "received": true,
  "adminId": "admin_uuid", 
  "adminName": "Admin Name",
  "notes": "Delivered on field day"
}
```

#### Create Manual Order
```
POST /uniforms
Body: {
  "studentName": "John Doe",
  "parentName": "Jane Doe", 
  "parentEmail": "jane@example.com",
  "team": "SOCCER",
  "ageGroup": "U12",
  "uniformTop": "Medium",
  "uniformBottom": "Medium",
  "paymentStatus": "completed"
}
```

#### Export to CSV
```
GET /uniforms/export/csv?team=SOCCER&received=false
```
**Returns:** CSV file download

### Member/Parent Endpoints

#### Get Orders by Parent
```
GET /uniforms/parent/:parentId
```

#### Get Orders by Student  
```
GET /uniforms/student/:studentId
```

## 🔄 Automatic Integration

### Registration Flow
When a user completes registration with uniforms:
1. Payment succeeds → `handlePaymentSuccess()` called
2. If `registrationData.includeUniform` → Creates uniform orders automatically
3. One order per student with uniform selection
4. Links to payment intent for tracking

### Data Flow
```
Registration Form → Checkout → Payment Success → Uniform Order Created
```

## 👤 Usage Examples

### Admin Panel Integration
```javascript
// Get all pending deliveries
const pendingOrders = await APIClient.getAllUniformOrders({
  received: false,
  paymentStatus: 'completed'
});

// Mark as received
await APIClient.updateUniformReceivedStatus(
  orderId, 
  true, 
  adminId, 
  'Admin Name',
  'Delivered at practice'
);

// Export for distribution day
const csvBlob = await APIClient.exportUniformOrdersCSV({
  team: 'SOCCER',
  received: false
});
```

### Parent Dashboard
```javascript 
// Show parent's uniform orders
const parentOrders = await APIClient.getUniformOrdersByParent(parentId);

// Display status: "Ordered", "Ready for Pickup", etc.
```

## 📋 Admin Panel Layout
**Suggested table structure:**
```
Actions | Student | Parent | Team | Size | Order Date | Payment | Status |
[Toggle] John Doe  Jane Doe SOCCER M/M   01/05/25   Paid    ☐ Not Received
[Toggle] Amy Smith Bob Smith SOCCER L/L   01/04/25   Paid    ☑ Received
```

## 🔍 Filter Options
- **By Team**: SOCCER, BASKETBALL, etc.
- **By Status**: Received / Not Received
- **By Payment**: Completed, Pending
- **Search**: Student or parent name

## 📤 Export Features
- **CSV Download**: Ready for Excel/printing
- **Headers**: Student, Parent, Contact, Team, Sizes, Dates, Status
- **Filtered**: Export only selected criteria

## 🔄 Status Management
- **New Order**: `received: false`
- **Admin Marks Received**: `received: true`, `receivedDate: now`, `receivedBy: admin`
- **Notes**: Optional delivery notes
- **Audit Trail**: All changes tracked with timestamps

## 🎯 Benefits
- ✅ **Auto-population** from purchases
- ✅ **No manual data entry** for orders
- ✅ **Easy admin controls** with toggle buttons
- ✅ **Searchable & filterable** 
- ✅ **Exportable** for distribution days
- ✅ **Parent visibility** of their orders
- ✅ **Complete audit trail**

Perfect for uniform distribution days and parent communication! 🎉