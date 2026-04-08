const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

// Initialize Firebase Admin
admin.initializeApp();

// Get Firestore instance
const db = admin.firestore();

// Initialize Express app for APIs
const app = express();

// Configure CORS
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Controllers / routers
const uniformController = require('./controllers/uniformController');
const pickupController = require('./controllers/pickupController');

// -------------------- helpers --------------------
const jsonOk = (res, data, status = 200) => res.status(status).json({ success: true, data });
const jsonErr = (res, error, status = 500) =>
  res.status(status).json({ success: false, error: typeof error === "string" ? error : error?.message || "Unknown error" });

const toIsoStringOrNull = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const toNumberOrZero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const shaPassword = async (password, salt) =>
  new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 120000, 64, "sha512", (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString("hex"));
    });
  });

const sanitizeAdmin = (docId, data) => {
  if (!data) return null;
  const { passwordHash, passwordSalt, ...safe } = data;
  return { id: docId, ...safe };
};

/**
 * HTTP-triggered function for deleting expired events
 * Can be called by external schedulers or manually
 */
exports.deleteExpiredEvents = functions.https.onRequest(async (req, res) => {
    // Add CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    console.log("🔄 Starting expired events cleanup...");

    try {
        const now = admin.firestore.Timestamp.now();
        console.log("Current timestamp:", now.toDate().toISOString());

        // Query for expired events
        const expiredEventsQuery = db.collection("events")
            .where("expiresAt", "<=", now);

        const expiredSnapshot = await expiredEventsQuery.get();

        if (expiredSnapshot.empty) {
            console.log("✅ No expired events found");
            const response = {
                success: true,
                message: "No expired events found",
                deletedCount: 0,
                timestamp: new Date().toISOString(),
            };
            res.status(200).json(response);
            return;
        }

        console.log(`🗑️ Found ${expiredSnapshot.size} expired events to delete`);

        // Use batch to delete multiple documents efficiently
        const batch = db.batch();
        const deletedEvents = [];

        expiredSnapshot.forEach((doc) => {
            const eventData = doc.data();
            deletedEvents.push({
                id: doc.id,
                title: eventData.title,
                date: eventData.date,
                time: eventData.time,
                expiresAt: eventData.expiresAt.toDate().toISOString(),
            });
            batch.delete(doc.ref);
        });

        // Execute the batch delete
        await batch.commit();

        console.log("✅ Successfully deleted expired events:", deletedEvents);

        const response = {
            success: true,
            message: `Successfully deleted ${deletedEvents.length} expired events`,
            deletedCount: deletedEvents.length,
            deletedEvents: deletedEvents,
            timestamp: new Date().toISOString(),
        };

        console.log("✅ Cleanup completed:", response);
        res.status(200).json(response);
    } catch (error) {
        console.error("❌ Error deleting expired events:", error);

        const errorResponse = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
        };

        res.status(500).json(errorResponse);
    }
});

/**
 * Function to get statistics about upcoming and expired events
 */
exports.getEventStatistics = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const now = admin.firestore.Timestamp.now();

        // Get all events
        const allEventsSnapshot = await db.collection("events").get();
        const totalEvents = allEventsSnapshot.size;

        // Get expired events
        const expiredEventsQuery = db.collection("events")
            .where("expiresAt", "<=", now);
        const expiredSnapshot = await expiredEventsQuery.get();
        const expiredCount = expiredSnapshot.size;

        // Get upcoming events
        const upcomingEventsQuery = db.collection("events")
            .where("expiresAt", ">", now);
        const upcomingSnapshot = await upcomingEventsQuery.get();
        const upcomingCount = upcomingSnapshot.size;

        const statistics = {
            totalEvents,
            upcomingEvents: upcomingCount,
            expiredEvents: expiredCount,
            timestamp: new Date().toISOString(),
        };

        console.log("📊 Event Statistics:", statistics);
        res.status(200).json(statistics);
    } catch (error) {
        console.error("❌ Error getting statistics:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// ==================== API ROUTES ====================

// Initialize controllers
const uniformControllerInstance = uniformController;

// Root / health (prevents "Cannot GET /" on https://.../apis)
app.get('/', async (req, res) => {
  jsonOk(res, {
    name: "yau-app apis",
    timestamp: new Date().toISOString(),
  });
});

// ==================== UNIFORM MANAGEMENT ROUTES ====================
app.get('/uniforms', uniformControllerInstance.getAllUniformOrders.bind(uniformControllerInstance));
app.get('/uniforms/parent/:parentId', uniformControllerInstance.getUniformOrdersByParent.bind(uniformControllerInstance));
app.get('/uniforms/student/:studentId', uniformControllerInstance.getUniformOrdersByStudent.bind(uniformControllerInstance));
app.put('/uniforms/order/:orderId/status', uniformControllerInstance.updateReceivedStatus.bind(uniformControllerInstance));
// Alias for frontend endpoint: /uniforms/:orderId/received
app.put('/uniforms/:orderId/received', uniformControllerInstance.updateReceivedStatus.bind(uniformControllerInstance));
app.get('/uniforms/summary', uniformControllerInstance.getUniformSummary.bind(uniformControllerInstance));
app.get('/uniforms/search', uniformControllerInstance.searchUniformOrders.bind(uniformControllerInstance));
app.post('/uniforms/order', uniformControllerInstance.createUniformOrder.bind(uniformControllerInstance));
app.put('/uniforms/order/:orderId', uniformControllerInstance.updateUniformOrder.bind(uniformControllerInstance));
app.get('/uniforms/export/csv', uniformControllerInstance.exportUniformOrdersCSV.bind(uniformControllerInstance));
// Batch delete (frontend endpoint: /uniforms/batch-delete)
app.post('/uniforms/batch-delete', async (req, res) => {
  try {
    const orderIds = Array.isArray(req.body?.orderIds) ? req.body.orderIds : [];
    if (orderIds.length === 0) return jsonErr(res, "orderIds array is required", 400);

    const col = db.collection("uniformOrders");
    const batch = db.batch();
    orderIds.forEach((id) => batch.delete(col.doc(id)));
    await batch.commit();

    return jsonOk(res, { deleted: orderIds.length });
  } catch (error) {
    console.error("Error batch deleting uniform orders:", error);
    return jsonErr(res, error);
  }
});

// ==================== PICKUP MANAGEMENT ROUTES ====================
// Keep pickup routes out of this file; they live in the pickup controller router.
app.use('/pickup', pickupController);

// ==================== MEMBER MANAGEMENT ROUTES ====================
app.get('/members', async (req, res) => {
  try {
    const membersSnapshot = await db.collection('members').get();
    const members = [];
    membersSnapshot.forEach(doc => {
      members.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const memberDoc = await db.collection('members').doc(id).get();
    if (!memberDoc.exists) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }
    res.json({ success: true, data: { id: memberDoc.id, ...memberDoc.data() } });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/members', async (req, res) => {
  try {
    const memberData = req.body;
    const docRef = await db.collection('members').add(memberData);
    res.status(201).json({ success: true, data: { id: docRef.id, ...memberData } });
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await db.collection('members').doc(id).update(updateData);
    res.json({ success: true, message: 'Member updated successfully' });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('members').doc(id).delete();
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backward-compat: /members/email/:value (was reported as 404 in production)
// - If :value contains '@' => exact email match
// - Else => prefix search (requires email field + simple index)
app.get('/members/email/:value', async (req, res) => {
  try {
    const { value } = req.params;
    const v = (value || "").toLowerCase().trim();
    if (!v) return jsonErr(res, "Email value is required", 400);

    let q = db.collection("members");
    if (v.includes("@")) {
      q = q.where("email", "==", v);
    } else {
      q = q.orderBy("email").startAt(v).endAt(`${v}\uf8ff`);
    }

    const snap = await q.get();
    const matches = [];
    snap.forEach((doc) => matches.push({ id: doc.id, ...doc.data() }));
    return jsonOk(res, matches);
  } catch (error) {
    console.error("Error fetching member by email:", error);
    return jsonErr(res, error);
  }
});

// ==================== PARENT MANAGEMENT ROUTES ====================
app.get('/parents', async (req, res) => {
  try {
    const parentsSnapshot = await db.collection('parents').get();
    const parents = [];
    parentsSnapshot.forEach(doc => {
      parents.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: parents });
  } catch (error) {
    console.error('Error fetching parents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/parents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parentDoc = await db.collection('parents').doc(id).get();
    if (!parentDoc.exists) {
      return res.status(404).json({ success: false, error: 'Parent not found' });
    }
    res.json({ success: true, data: { id: parentDoc.id, ...parentDoc.data() } });
  } catch (error) {
    console.error('Error fetching parent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/parents', async (req, res) => {
  try {
    const parentData = req.body;
    const docRef = await db.collection('parents').add(parentData);
    res.status(201).json({ success: true, data: { id: docRef.id, ...parentData } });
  } catch (error) {
    console.error('Error creating parent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/parents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await db.collection('parents').doc(id).update(updateData);
    res.json({ success: true, message: 'Parent updated successfully' });
  } catch (error) {
    console.error('Error updating parent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/parents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('parents').doc(id).delete();
    res.json({ success: true, message: 'Parent deleted successfully' });
  } catch (error) {
    console.error('Error deleting parent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ORGANIZATION MANAGEMENT ROUTES ====================
app.get('/organization', async (req, res) => {
  try {
    const orgSnapshot = await db.collection('organizations').get();
    const organizations = [];
    orgSnapshot.forEach(doc => {
      organizations.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/organization/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgDoc = await db.collection('organizations').doc(id).get();
    if (!orgDoc.exists) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }
    res.json({ success: true, data: { id: orgDoc.id, ...orgDoc.data() } });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/organization', async (req, res) => {
  try {
    const orgData = req.body;
    const docRef = await db.collection('organizations').add(orgData);
    res.status(201).json({ success: true, data: { id: docRef.id, ...orgData } });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/organization/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await db.collection('organizations').doc(id).update(updateData);
    res.json({ success: true, message: 'Organization updated successfully' });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/organization/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('organizations').doc(id).delete();
    res.json({ success: true, message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== LOCATION MANAGEMENT ROUTES ====================
app.get('/locations', async (req, res) => {
  try {
    const locationsSnapshot = await db.collection('locations').get();
    const locations = [];
    locationsSnapshot.forEach(doc => {
      locations.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/locations', async (req, res) => {
  try {
    const locationData = req.body;
    const docRef = await db.collection('locations').add(locationData);
    res.status(201).json({ success: true, data: { id: docRef.id, ...locationData } });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await db.collection('locations').doc(id).update(updateData);
    res.json({ success: true, message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('locations').doc(id).delete();
    res.json({ success: true, message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== COACH MANAGEMENT ROUTES ====================
app.get('/coaches', async (req, res) => {
  try {
    const coachesSnapshot = await db.collection('coaches').get();
    const coaches = [];
    coachesSnapshot.forEach(doc => {
      coaches.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: coaches });
  } catch (error) {
    console.error('Error fetching coaches:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/coaches', async (req, res) => {
  try {
    const coachData = req.body;
    const docRef = await db.collection('coaches').add(coachData);
    res.status(201).json({ success: true, data: { id: docRef.id, ...coachData } });
  } catch (error) {
    console.error('Error creating coach:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/coaches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await db.collection('coaches').doc(id).update(updateData);
    res.json({ success: true, message: 'Coach updated successfully' });
  } catch (error) {
    console.error('Error updating coach:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/coaches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('coaches').doc(id).delete();
    res.json({ success: true, message: 'Coach deleted successfully' });
  } catch (error) {
    console.error('Error deleting coach:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ROSTER MANAGEMENT ROUTES ====================
app.get('/rosters', async (req, res) => {
  try {
    const rostersSnapshot = await db.collection('rosters').get();
    const rosters = [];
    rostersSnapshot.forEach(doc => {
      rosters.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: rosters });
  } catch (error) {
    console.error('Error fetching rosters:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/rosters', async (req, res) => {
  try {
    const rosterData = req.body;
    const docRef = await db.collection('rosters').add(rosterData);
    res.status(201).json({ success: true, data: { id: docRef.id, ...rosterData } });
  } catch (error) {
    console.error('Error creating roster:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/rosters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await db.collection('rosters').doc(id).update(updateData);
    res.json({ success: true, message: 'Roster updated successfully' });
  } catch (error) {
    console.error('Error updating roster:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/rosters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('rosters').doc(id).delete();
    res.json({ success: true, message: 'Roster deleted successfully' });
  } catch (error) {
    console.error('Error deleting roster:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add player to roster
app.post('/rosters/:rosterId/players', async (req, res) => {
  try {
    const { rosterId } = req.params;
    const playerData = req.body;

    await db.collection('rosters').doc(rosterId).update({
      players: admin.firestore.FieldValue.arrayUnion(playerData)
    });

    res.json({ success: true, message: 'Player added to roster successfully' });
  } catch (error) {
    console.error('Error adding player to roster:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove player from roster
app.delete('/rosters/:rosterId/players/:playerId', async (req, res) => {
  try {
    const { rosterId, playerId } = req.params;

    // Get current roster to find player data
    const rosterDoc = await db.collection('rosters').doc(rosterId).get();
    if (!rosterDoc.exists) {
      return res.status(404).json({ success: false, error: 'Roster not found' });
    }

    const rosterData = rosterDoc.data();
    const playerToRemove = rosterData.players?.find(p => p.id === playerId);

    if (!playerToRemove) {
      return res.status(404).json({ success: false, error: 'Player not found in roster' });
    }

    await db.collection('rosters').doc(rosterId).update({
      players: admin.firestore.FieldValue.arrayRemove(playerToRemove)
    });

    res.json({ success: true, message: 'Player removed from roster successfully' });
  } catch (error) {
    console.error('Error removing player from roster:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== COMMUNITY MANAGEMENT ROUTES ====================
app.get('/community/posts', async (req, res) => {
  try {
    const postsSnapshot = await db.collection('communityPosts').orderBy('createdAt', 'desc').get();
    const posts = [];
    postsSnapshot.forEach(doc => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('Error fetching community posts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/community/posts', async (req, res) => {
  try {
    const postData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('communityPosts').add(postData);
    res.status(201).json({ success: true, data: { id: docRef.id, ...postData } });
  } catch (error) {
    console.error('Error creating community post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== MESSAGE MANAGEMENT ROUTES ====================
app.get('/messages', async (req, res) => {
  try {
    const messagesSnapshot = await db.collection('messages').orderBy('timestamp', 'desc').get();
    const messages = [];
    messagesSnapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/messages', async (req, res) => {
  try {
    const messageData = {
      ...req.body,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('messages').add(messageData);
    res.status(201).json({ success: true, data: { id: docRef.id, ...messageData } });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EVENT MANAGEMENT ROUTES ====================
app.get('/events', async (req, res) => {
  try {
    const eventsSnapshot = await db.collection('events').orderBy('date', 'desc').get();
    const events = [];
    eventsSnapshot.forEach(doc => {
      events.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/events', async (req, res) => {
  try {
    const eventData = req.body;
    const docRef = await db.collection('events').add(eventData);
    res.status(201).json({ success: true, data: { id: docRef.id, ...eventData } });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await db.collection('events').doc(id).update(updateData);
    res.json({ success: true, message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('events').doc(id).delete();
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GAME SCHEDULE ROUTES ====================
app.get('/game-schedules', async (req, res) => {
  try {
    const schedulesSnapshot = await db.collection('gameSchedules').orderBy('date', 'desc').get();
    const schedules = [];
    schedulesSnapshot.forEach(doc => {
      schedules.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('Error fetching game schedules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/game-schedules', async (req, res) => {
  try {
    const scheduleData = req.body;
    const docRef = await db.collection('gameSchedules').add(scheduleData);
    res.status(201).json({ success: true, data: { id: docRef.id, ...scheduleData } });
  } catch (error) {
    console.error('Error creating game schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EXTERNAL SCHEDULES (matches) ====================
// Frontend expects:
// - GET    /external_schedules
// - POST   /external_schedules
// - PATCH  /external_schedules/:id
// - DELETE /external_schedules/:id
// - DELETE /external_schedules/bulk/matches   body: { ids: [] }
const externalSchedulesCol = db.collection("external_schedules");

app.get("/external_schedules", async (req, res) => {
  try {
    const snap = await externalSchedulesCol.orderBy("date", "desc").get().catch(async () => externalSchedulesCol.get());
    const matches = [];
    snap.forEach((doc) => matches.push({ id: doc.id, ...doc.data() }));
    return jsonOk(res, matches);
  } catch (error) {
    console.error("Error fetching external schedules:", error);
    return jsonErr(res, error);
  }
});

app.post("/external_schedules", async (req, res) => {
  try {
    const payload = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await externalSchedulesCol.add({ ...payload, createdAt: now, updatedAt: now });
    return jsonOk(res, { id: docRef.id }, 201);
  } catch (error) {
    console.error("Error creating external schedule match:", error);
    return jsonErr(res, error);
  }
});

app.patch("/external_schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    await externalSchedulesCol.doc(id).update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return jsonOk(res, { id, message: "Match updated" });
  } catch (error) {
    console.error("Error updating external schedule match:", error);
    return jsonErr(res, error);
  }
});

app.delete("/external_schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await externalSchedulesCol.doc(id).delete();
    return jsonOk(res, { id, message: "Match deleted" });
  } catch (error) {
    console.error("Error deleting external schedule match:", error);
    return jsonErr(res, error);
  }
});

app.delete("/external_schedules/bulk/matches", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) return jsonErr(res, "ids array is required", 400);

    const batch = db.batch();
    ids.forEach((id) => batch.delete(externalSchedulesCol.doc(id)));
    await batch.commit();
    return jsonOk(res, { deleted: ids.length });
  } catch (error) {
    console.error("Error bulk deleting external schedule matches:", error);
    return jsonErr(res, error);
  }
});

// ==================== COACH TIMESHEETS (coach-facing) ====================
// Frontend expects /timesheets and /timesheets/{id}
const timesheetsCol = db.collection("timesheets");

app.get("/timesheets", async (req, res) => {
  try {
    const coachId = (req.query.coachId || "").toString().trim();
    let q = timesheetsCol.orderBy("date", "desc");
    if (coachId) q = q.where("coachId", "==", coachId);

    const snap = await q.get().catch(async () => timesheetsCol.get());
    const rows = [];
    snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));
    return jsonOk(res, rows);
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    return jsonErr(res, error);
  }
});

app.post("/timesheets", async (req, res) => {
  try {
    const payload = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    const status = payload.status || "draft";
    const docRef = await timesheetsCol.add({ ...payload, status, createdAt: now, updatedAt: now });
    return jsonOk(res, { id: docRef.id }, 201);
  } catch (error) {
    console.error("Error creating timesheet entry:", error);
    return jsonErr(res, error);
  }
});

app.put("/timesheets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    await timesheetsCol.doc(id).update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return jsonOk(res, { id, message: "Timesheet updated" });
  } catch (error) {
    console.error("Error updating timesheet entry:", error);
    return jsonErr(res, error);
  }
});

app.delete("/timesheets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await timesheetsCol.doc(id).delete();
    return jsonOk(res, { id, message: "Timesheet deleted" });
  } catch (error) {
    console.error("Error deleting timesheet entry:", error);
    return jsonErr(res, error);
  }
});

// ==================== ADMIN TIMESHEET ROUTES ====================
// Frontend expects:
// - GET  /adminTimesheetRoutes/timesheets                 => { data: [] }
// - GET  /adminTimesheetRoutes/timesheets/coach/:coachId  => { data: { timesheets, coach, summary, pagination } }
// - GET  /adminTimesheetRoutes/timesheets/stats           => { data: { ... } }
// - POST /adminTimesheetRoutes/timesheets/:id/approve
// - POST /adminTimesheetRoutes/timesheets/:id/reject      body: { reason }
// - POST /adminTimesheetRoutes/timesheets/bulk-approve    body: { entryIds, notes }
// - POST /adminTimesheetRoutes/timesheets/bulk-reject     body: { entryIds, reason }
// - GET  /adminTimesheetRoutes/timesheets/export?format=csv|json&...
app.get("/adminTimesheetRoutes/timesheets", async (req, res) => {
  try {
    const { status, coachId, startDate, endDate, location } = req.query;
    const snap = await timesheetsCol.get();
    let rows = [];
    snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));

    // In-memory filtering (keeps it simple and avoids index issues)
    if (coachId) rows = rows.filter((r) => r.coachId === coachId);
    if (status) rows = rows.filter((r) => r.status === status);
    if (location) rows = rows.filter((r) => (r.location || "").toLowerCase().includes(String(location).toLowerCase()));
    if (startDate) rows = rows.filter((r) => new Date(r.date) >= new Date(startDate));
    if (endDate) rows = rows.filter((r) => new Date(r.date) <= new Date(endDate));

    // newest first where possible
    rows.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching admin timesheets:", error);
    return jsonErr(res, error);
  }
});

app.get("/adminTimesheetRoutes/timesheets/coach/:coachId", async (req, res) => {
  try {
    const { coachId } = req.params;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "5", 10));
    const { status, startDate, endDate, search, location } = req.query;

    const snap = await timesheetsCol.get();
    let rows = [];
    snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));
    rows = rows.filter((r) => r.coachId === coachId);

    if (status) rows = rows.filter((r) => r.status === status);
    if (location) rows = rows.filter((r) => (r.location || "").toLowerCase().includes(String(location).toLowerCase()));
    if (startDate) rows = rows.filter((r) => new Date(r.date) >= new Date(startDate));
    if (endDate) rows = rows.filter((r) => new Date(r.date) <= new Date(endDate));
    if (search) {
      const s = String(search).toLowerCase();
      rows = rows.filter((r) => (r.location || "").toLowerCase().includes(s) || (r.notes || "").toLowerCase().includes(s));
    }

    rows.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIdx = (page - 1) * limit;
    const paged = rows.slice(startIdx, startIdx + limit);

    const totalHours = rows.reduce((sum, r) => sum + toNumberOrZero(r.totalHours), 0);
    const coach = {
      id: coachId,
      name: rows[0]?.name || "",
      email: rows[0]?.email || "",
    };

    return jsonOk(res, {
      timesheets: paged,
      coach,
      summary: { totalEntries: total, totalHours },
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error("Error fetching coach timesheets:", error);
    return jsonErr(res, error);
  }
});

app.get("/adminTimesheetRoutes/timesheets/stats", async (req, res) => {
  try {
    const snap = await timesheetsCol.get();
    const rows = [];
    snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));

    const total = rows.length;
    const submitted = rows.filter((r) => r.status === "submitted").length;
    const approved = rows.filter((r) => r.status === "approved").length;
    const rejected = rows.filter((r) => r.status === "rejected").length;
    const totalHours = rows.reduce((sum, r) => sum + toNumberOrZero(r.totalHours), 0);

    return jsonOk(res, { total, submitted, approved, rejected, totalHours });
  } catch (error) {
    console.error("Error getting timesheet stats:", error);
    return jsonErr(res, error);
  }
});

app.post("/adminTimesheetRoutes/timesheets/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    await timesheetsCol.doc(id).update({
      status: "approved",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return jsonOk(res, { id, status: "approved" });
  } catch (error) {
    console.error("Error approving timesheet:", error);
    return jsonErr(res, error);
  }
});

app.post("/adminTimesheetRoutes/timesheets/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const reason = (req.body?.reason || "").toString();
    await timesheetsCol.doc(id).update({
      status: "rejected",
      rejectionReason: reason,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return jsonOk(res, { id, status: "rejected" });
  } catch (error) {
    console.error("Error rejecting timesheet:", error);
    return jsonErr(res, error);
  }
});

app.post("/adminTimesheetRoutes/timesheets/bulk-approve", async (req, res) => {
  try {
    const entryIds = Array.isArray(req.body?.entryIds) ? req.body.entryIds : [];
    if (entryIds.length === 0) return jsonErr(res, "entryIds array is required", 400);

    const batch = db.batch();
    entryIds.forEach((id) =>
      batch.update(timesheetsCol.doc(id), {
        status: "approved",
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );
    await batch.commit();
    return res.json({ success: true, message: `Approved ${entryIds.length} timesheet(s)`, data: { successful: entryIds.length, failed: 0 } });
  } catch (error) {
    console.error("Error bulk approving timesheets:", error);
    return jsonErr(res, error);
  }
});

app.post("/adminTimesheetRoutes/timesheets/bulk-reject", async (req, res) => {
  try {
    const entryIds = Array.isArray(req.body?.entryIds) ? req.body.entryIds : [];
    const reason = (req.body?.reason || "").toString();
    if (entryIds.length === 0) return jsonErr(res, "entryIds array is required", 400);
    if (!reason.trim()) return jsonErr(res, "reason is required", 400);

    const batch = db.batch();
    entryIds.forEach((id) =>
      batch.update(timesheetsCol.doc(id), {
        status: "rejected",
        rejectionReason: reason,
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );
    await batch.commit();
    return res.json({ success: true, message: `Rejected ${entryIds.length} timesheet(s)`, data: { successful: entryIds.length, failed: 0 } });
  } catch (error) {
    console.error("Error bulk rejecting timesheets:", error);
    return jsonErr(res, error);
  }
});

app.get("/adminTimesheetRoutes/timesheets/export", async (req, res) => {
  try {
    const format = (req.query.format || "csv").toString().toLowerCase();
    const { coachId, status, startDate, endDate, location } = req.query;

    const snap = await timesheetsCol.get();
    let rows = [];
    snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));

    if (coachId) rows = rows.filter((r) => r.coachId === coachId);
    if (status) rows = rows.filter((r) => r.status === status);
    if (location) rows = rows.filter((r) => (r.location || "").toLowerCase().includes(String(location).toLowerCase()));
    if (startDate) rows = rows.filter((r) => new Date(r.date) >= new Date(startDate));
    if (endDate) rows = rows.filter((r) => new Date(r.date) <= new Date(endDate));

    if (format === "json") {
      return jsonOk(res, rows);
    }

    // CSV
    const headers = ["id", "coachId", "name", "email", "date", "location", "startTime", "endTime", "totalHours", "status", "notes", "rejectionReason"];
    const escapeCsv = (val) => {
      const s = (val ?? "").toString().replace(/"/g, '""');
      return `"${s}"`;
    };
    const lines = [headers.join(",")].concat(
      rows.map((r) =>
        headers
          .map((h) => {
            if (h === "date") return escapeCsv(toIsoStringOrNull(r.date) || r.date || "");
            return escapeCsv(r[h]);
          })
          .join(",")
      )
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    return res.status(200).send(lines.join("\n"));
  } catch (error) {
    console.error("Error exporting timesheets:", error);
    return jsonErr(res, error);
  }
});

// ==================== AUTH ROUTES (used by frontend helpers) ====================
app.post("/auth/create-auth-user", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return jsonErr(res, "email and password are required", 400);
    const userRecord = await admin.auth().createUser({ email: String(email).trim().toLowerCase(), password: String(password) });
    return jsonOk(res, { uid: userRecord.uid }, 201);
  } catch (error) {
    console.error("Error creating auth user:", error);
    return jsonErr(res, error);
  }
});

// ==================== ADMINS CRUD + STATS ====================
const adminsCol = db.collection("admins");

app.get("/admins", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "50", 10));

    const snap = await adminsCol.orderBy("createdAt", "desc").get().catch(async () => adminsCol.get());
    const rows = [];
    snap.forEach((doc) => rows.push(sanitizeAdmin(doc.id, doc.data())));

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIdx = (page - 1) * limit;
    const admins = rows.slice(startIdx, startIdx + limit);

    return jsonOk(res, { admins, pagination: { page, limit, total, totalPages } });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return jsonErr(res, error);
  }
});

app.get("/admins/:id", async (req, res) => {
  try {
    const doc = await adminsCol.doc(req.params.id).get();
    if (!doc.exists) return jsonErr(res, "Admin not found", 404);
    return jsonOk(res, sanitizeAdmin(doc.id, doc.data()));
  } catch (error) {
    console.error("Error fetching admin by id:", error);
    return jsonErr(res, error);
  }
});

app.post("/admins", async (req, res) => {
  try {
    const payload = req.body || {};
    const email = String(payload.email || "").toLowerCase().trim();
    const password = String(payload.password || "");

    if (!email) return jsonErr(res, "email is required", 400);
    if (!password || password.length < 6) return jsonErr(res, "password must be at least 6 characters", 400);

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({ email, password });

    // Store admin profile in Firestore (store only hash, not raw password)
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = await shaPassword(password, salt);
    const now = admin.firestore.FieldValue.serverTimestamp();

    const adminDoc = {
      uid: userRecord.uid,
      email,
      firstName: payload.firstName || "",
      lastName: payload.lastName || "",
      role: payload.role || "admin",
      sportsArea: payload.sportsArea || "",
      permissions: Array.isArray(payload.permissions) ? payload.permissions : ["read"],
      phone: payload.phone || "",
      address: payload.address || "",
      notes: payload.notes || "",
      isActive: true,
      createdAt: now,
      updatedAt: now,
      passwordSalt: salt,
      passwordHash,
    };

    const docRef = await adminsCol.add(adminDoc);
    return jsonOk(res, sanitizeAdmin(docRef.id, adminDoc), 201);
  } catch (error) {
    console.error("Error creating admin:", error);
    return jsonErr(res, error);
  }
});

app.put("/admins/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    await adminsCol.doc(id).update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const doc = await adminsCol.doc(id).get();
    return jsonOk(res, sanitizeAdmin(doc.id, doc.data()));
  } catch (error) {
    console.error("Error updating admin:", error);
    return jsonErr(res, error);
  }
});

app.patch("/admins/:id/deactivate", async (req, res) => {
  try {
    const { id } = req.params;
    await adminsCol.doc(id).update({ isActive: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return jsonOk(res, { id, isActive: false });
  } catch (error) {
    console.error("Error deactivating admin:", error);
    return jsonErr(res, error);
  }
});

app.put("/admins/:id/password", async (req, res) => {
  try {
    const { id } = req.params;
    const newPassword = String(req.body?.newPassword || "");
    if (!newPassword || newPassword.length < 6) return jsonErr(res, "newPassword must be at least 6 characters", 400);

    const doc = await adminsCol.doc(id).get();
    if (!doc.exists) return jsonErr(res, "Admin not found", 404);

    const adminData = doc.data();
    if (adminData?.uid) {
      await admin.auth().updateUser(adminData.uid, { password: newPassword });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = await shaPassword(newPassword, salt);
    await adminsCol.doc(id).update({
      passwordSalt: salt,
      passwordHash,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return jsonOk(res, { id, message: "Password updated" });
  } catch (error) {
    console.error("Error updating admin password:", error);
    return jsonErr(res, error);
  }
});

app.delete("/admins/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await adminsCol.doc(id).get();
    if (!doc.exists) return jsonErr(res, "Admin not found", 404);

    const adminData = doc.data();
    if (adminData?.uid) {
      try {
        await admin.auth().deleteUser(adminData.uid);
      } catch (e) {
        console.warn("Failed deleting auth user for admin:", id, e?.message);
      }
    }

    await adminsCol.doc(id).delete();
    return jsonOk(res, { id, message: "Admin deleted" });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return jsonErr(res, error);
  }
});

app.post("/admins/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const password = String(req.body?.password || "");
    if (!email || !password) return jsonErr(res, "email and password are required", 400);

    const snap = await adminsCol.where("email", "==", email).limit(1).get();
    if (snap.empty) return jsonErr(res, "Invalid credentials", 401);

    const doc = snap.docs[0];
    const adminData = doc.data();
    if (adminData?.isActive === false) return jsonErr(res, "Admin is inactive", 403);

    // verify password
    if (!adminData?.passwordSalt || !adminData?.passwordHash) return jsonErr(res, "Admin password not set", 400);
    const computed = await shaPassword(password, adminData.passwordSalt);
    if (computed !== adminData.passwordHash) return jsonErr(res, "Invalid credentials", 401);

    const token = adminData?.uid ? await admin.auth().createCustomToken(adminData.uid) : null;
    return jsonOk(res, { admin: sanitizeAdmin(doc.id, adminData), token });
  } catch (error) {
    console.error("Error logging in admin:", error);
    return jsonErr(res, error);
  }
});

app.get("/admins/stats", async (req, res) => {
  try {
    const snap = await adminsCol.get();
    const admins = [];
    snap.forEach((doc) => admins.push(doc.data()));

    const totalAdmins = admins.length;
    const activeAdmins = admins.filter((a) => a.isActive !== false).length;
    const inactiveAdmins = totalAdmins - activeAdmins;

    const departmentBreakdown = {};
    admins.forEach((a) => {
      const dept = a.sportsArea || a.department || "unassigned";
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;
    });

    return jsonOk(res, { totalAdmins, activeAdmins, inactiveAdmins, departmentBreakdown });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return jsonErr(res, error);
  }
});

// ==================== STRIPE / PAYMENTS / UPLOAD / EMAIL / SMS / ANALYTICS ====================
// NOTE: These routes are defined to prevent 404s. They currently return 501 (Not Implemented)
// unless otherwise specified. This keeps the frontend from "missing route" errors while you
// restore the full implementations/keys/providers.
const notImplemented = (featureName) => (req, res) =>
  res.status(501).json({
    success: false,
    error: `${featureName} is not implemented on the backend yet`,
    feature: featureName,
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  });

// Stripe endpoints (API_CONFIG.endpoints.stripe.*)
app.post("/stripe/create-payment-intent", notImplemented("stripe.createPaymentIntent"));
app.post("/stripe/create-customer", notImplemented("stripe.createCustomer"));
app.post("/stripe/create-subscription", notImplemented("stripe.createSubscription"));
app.post("/stripe/cancel-subscription", notImplemented("stripe.cancelSubscription"));
app.post("/stripe/create-checkout-session", notImplemented("stripe.createCheckoutSession"));
app.post("/stripe/verify-payment", notImplemented("stripe.verifyPayment"));
app.get("/stripe/plans", notImplemented("stripe.getPlans"));
app.get("/stripe/payment-methods", notImplemented("stripe.getPaymentMethods"));

// Payments endpoints (API_CONFIG.endpoints.payments.*)
app.post("/payments/create-payment-record", notImplemented("payments.createRecord"));
app.post("/payments/update-status", notImplemented("payments.updateStatus"));
app.get("/payments/history/user", notImplemented("payments.getUserHistory"));
app.get("/payments/history/email", notImplemented("payments.getEmailHistory"));
app.get("/payments/stats", notImplemented("payments.getStats"));
app.post("/payments/refund", notImplemented("payments.recordRefund"));
app.post("/payments/complete-payment", notImplemented("payments.completePayment"));
app.post("/payments/webhook", notImplemented("payments.webhook"));

// Membership endpoints (API_CONFIG.endpoints.membership.*)
app.get("/membership/test", notImplemented("membership.test"));
app.get("/membership/find-user", notImplemented("membership.findUser"));
app.post("/membership/upgrade", notImplemented("membership.upgrade"));
app.get("/membership/status", notImplemented("membership.getStatus"));
app.post("/membership/cancel", notImplemented("membership.cancel"));
app.post("/membership/move-to-members", notImplemented("membership.moveToMembers"));

// Upload endpoints (API_CONFIG.endpoints.upload.*)
app.post("/upload/image", notImplemented("upload.image"));
app.post("/upload/document", notImplemented("upload.document"));
app.post("/upload/avatar", notImplemented("upload.avatar"));
app.post("/upload/community-media", notImplemented("upload.communityMedia"));
app.post("/upload/event-image", notImplemented("upload.eventImage"));

// Email endpoints (API_CONFIG.endpoints.email.*)
app.post("/email/send", notImplemented("email.send"));
app.post("/email/send-bulk", notImplemented("email.sendBulk"));
app.post("/email/send-template", notImplemented("email.sendTemplate"));
app.get("/email/templates", notImplemented("email.getTemplates"));
app.post("/email/templates", notImplemented("email.createTemplate"));
app.put("/email/templates/:id", notImplemented("email.updateTemplate"));
app.delete("/email/templates/:id", notImplemented("email.deleteTemplate"));

// SMS endpoints (API_CONFIG.endpoints.sms.*)
app.post("/sms/send", notImplemented("sms.send"));
app.post("/sms/send-bulk", notImplemented("sms.sendBulk"));
app.get("/sms/history", notImplemented("sms.getHistory"));
app.get("/sms/stats", notImplemented("sms.getStats"));

// Analytics endpoints (API_CONFIG.endpoints.analytics.*)
app.get("/analytics/dashboard", async (req, res) => {
  try {
    // Minimal dashboard metrics (safe defaults).
    const [membersSnap, parentsSnap, coachesSnap, rostersSnap, eventsSnap] = await Promise.all([
      db.collection("members").get(),
      db.collection("parents").get(),
      db.collection("coaches").get(),
      db.collection("rosters").get(),
      db.collection("events").get(),
    ]);

    return jsonOk(res, {
      counts: {
        members: membersSnap.size,
        parents: parentsSnap.size,
        coaches: coachesSnap.size,
        rosters: rostersSnap.size,
        events: eventsSnap.size,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error building analytics dashboard:", error);
    return jsonErr(res, error);
  }
});
app.get("/analytics/users", notImplemented("analytics.users"));
app.get("/analytics/engagement", notImplemented("analytics.engagement"));
app.get("/analytics/revenue", notImplemented("analytics.revenue"));
app.get("/analytics/sports", notImplemented("analytics.sports"));
app.get("/analytics/locations", notImplemented("analytics.locations"));
app.get("/analytics/age-groups", notImplemented("analytics.ageGroups"));
app.get("/analytics/export", notImplemented("analytics.export"));

// Utility endpoints (API_CONFIG.endpoints.utils.*)
app.get("/utils/health", async (req, res) => jsonOk(res, { ok: true, timestamp: new Date().toISOString() }));
app.get("/utils/version", async (req, res) => jsonOk(res, { version: "apis", node: process.version, timestamp: new Date().toISOString() }));
app.post("/utils/test", async (req, res) => jsonOk(res, { echo: req.body ?? null, timestamp: new Date().toISOString() }));
app.get("/utils/test", async (req, res) => jsonOk(res, { ok: true, timestamp: new Date().toISOString() }));
app.get("/utils/validate/email", notImplemented("utils.validateEmail"));
app.get("/utils/validate/phone", notImplemented("utils.validatePhone"));
app.get("/utils/geocode", notImplemented("utils.geocode"));
app.get("/utils/qr-code", notImplemented("utils.generateQR"));
app.get("/utils/short-url", notImplemented("utils.shortUrl"));

// Settings endpoints (API_CONFIG.endpoints.settings.*)
app.get("/settings", notImplemented("settings.getAll"));
app.get("/settings/:key", notImplemented("settings.getById"));
app.put("/settings/:key", notImplemented("settings.update"));
app.post("/settings/reset", notImplemented("settings.reset"));
app.post("/settings/backup", notImplemented("settings.backup"));
app.post("/settings/restore", notImplemented("settings.restore"));

// Reports endpoints (API_CONFIG.endpoints.reports.*)
app.post("/reports/generate", notImplemented("reports.generate"));
app.get("/reports", notImplemented("reports.getAll"));
app.get("/reports/:id", notImplemented("reports.getById"));
app.delete("/reports/:id", notImplemented("reports.delete"));
app.post("/reports/schedule", notImplemented("reports.schedule"));
app.get("/reports/scheduled", notImplemented("reports.getScheduled"));
app.get("/reports/:id/export", notImplemented("reports.export"));

// Resources endpoints (API_CONFIG.endpoints.resources.*)
app.get("/resources", notImplemented("resources.getAll"));
app.get("/resources/:id", notImplemented("resources.getById"));
app.post("/resources", notImplemented("resources.create"));
app.put("/resources/:id", notImplemented("resources.update"));
app.delete("/resources/:id", notImplemented("resources.delete"));
app.post("/resources/batch-delete", notImplemented("resources.batchDelete"));

// ==================== ADMIN ROUTES ====================
app.post('/admin/delete-auth-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Delete from Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(userRecord.uid);

    res.json({ success: true, message: `User ${email} deleted from Firebase Auth` });
  } catch (error) {
    console.error('Error deleting auth user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Legacy UID delete used by frontend helper
app.post("/admin/delete-auth-user-by-uid", async (req, res) => {
  try {
    const { uid } = req.body || {};
    if (!uid) return jsonErr(res, "uid is required", 400);
    await admin.auth().deleteUser(String(uid).trim());
    return jsonOk(res, { message: `User ${uid} deleted from Firebase Auth` });
  } catch (error) {
    console.error("Error deleting auth user by uid:", error);
    return jsonErr(res, error);
  }
});

app.post('/admin/batch-delete-auth-users', async (req, res) => {
  try {
    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, error: 'Emails array is required' });
    }

    const results = [];
    for (const email of emails) {
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        await admin.auth().deleteUser(userRecord.uid);
        results.push({ email, success: true });
      } catch (error) {
        results.push({ email, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      results,
      summary: {
        total: emails.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('Error batch deleting auth users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/admin/test-function', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Test function executed successfully',
      timestamp: new Date().toISOString(),
      data: req.body
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== EXPORT THE EXPRESS APP AS FIREBASE FUNCTION ====================
exports.apis = functions.https.onRequest(app);