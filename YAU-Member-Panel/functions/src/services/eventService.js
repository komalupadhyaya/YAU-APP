// services/eventService.js
const { db } = require("../utils/firebase");
const {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} = require("firebase/firestore");

class EventService {
  static async getEvents() {
    try {
      const eventsSnapshot = await getDocs(
        query(collection(db, "events"), orderBy("createdAt", "desc"))
      );
      return eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
        expiresAt: doc.data().expiresAt?.toDate ? doc.data().expiresAt.toDate() : doc.data().expiresAt,
      }));
    } catch (error) {
      console.error("Error fetching events:", error);
      try {
        const eventsSnapshot = await getDocs(collection(db, "events"));
        return eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
          expiresAt: doc.data().expiresAt?.toDate ? doc.data().expiresAt.toDate() : doc.data().expiresAt,
        }));
      } catch (fallbackError) {
        console.error("Fallback error fetching events:", fallbackError);
        throw fallbackError;
      }
    }
  }

  static async getEventById(id) {
    try {
      const docRef = doc(db, "events", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const eventData = docSnap.data();
        return {
          id: docSnap.id,
          ...eventData,
          createdAt: eventData.createdAt?.toDate ? eventData.createdAt.toDate() : eventData.createdAt,
          expiresAt: eventData.expiresAt?.toDate ? eventData.expiresAt.toDate() : eventData.expiresAt,
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting event:", error);
      throw error;
    }
  }

  static async addEvent(eventData) {
    try {
      // Create expiration timestamp from date and time
      if (eventData.date && eventData.time) {
        const eventDateTime = new Date(`${eventData.date}T${eventData.time}:00`);
        eventData.expiresAt = eventDateTime;
      }

      const docRef = await addDoc(collection(db, "events"), {
        ...eventData,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding event:", error);
      throw error;
    }
  }

  static async updateEvent(eventId, eventData) {
    try {
      // Update expiration timestamp from date and time
      if (eventData.date && eventData.time) {
        const eventDateTime = new Date(`${eventData.date}T${eventData.time}:00`);
        eventData.expiresAt = eventDateTime;
      }

      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        ...eventData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  }
static async deleteEvent(eventId) {
    try {
      const eventRef = doc(db, "events", eventId);
      await deleteDoc(eventRef);
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  }

  static async deleteExpiredEvents() {
    try {
      const now = new Date();
      const eventsRef = collection(db, "events");
      const expiredEventsQuery = query(
        eventsRef,
        where("expiresAt", "<=", now)
      );

      const expiredSnapshot = await getDocs(expiredEventsQuery);

      if (!expiredSnapshot.empty) {
        console.log(`Deleting ${expiredSnapshot.docs.length} expired events`);

        const batch = writeBatch(db);
        expiredSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log("Expired events deleted successfully");
        
        return {
          deletedCount: expiredSnapshot.docs.length,
          message: `Successfully deleted ${expiredSnapshot.docs.length} expired events`
        };
      }

      return {
        deletedCount: 0,
        message: "No expired events found"
      };
    } catch (error) {
      console.error("Error deleting expired events:", error);
      throw error;
    }
  }
}

module.exports = EventService;