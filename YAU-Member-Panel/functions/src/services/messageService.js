// services/messageService.js
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
} = require("firebase/firestore");

class MessageService {
  static async getMessages() {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, "admin_posts"), orderBy("timestamp", "desc"))
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
      }));
    } catch (error) {
      console.error("Error getting messages:", error);
      throw error;
    }
  }

  static async getMessageById(id) {
    try {
      const docRef = doc(db, "admin_posts", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const messageData = docSnap.data();
        return {
          id: docSnap.id,
          ...messageData,
          timestamp: messageData.timestamp?.toDate ? messageData.timestamp.toDate() : messageData.timestamp,
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting message:", error);
      throw error;
    }
  }

  static async addMessage(messageData) {
    try {
      const docRef = await addDoc(collection(db, "admin_posts"), {
        ...messageData,
        timestamp: serverTimestamp(),
        read: false,
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  }

  static async updateMessage(id, updates) {
    try {
      const docRef = doc(db, "admin_posts", id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating message:", error);
      throw error;
    }
  }

  static async deleteMessage(id) {
    try {
      await deleteDoc(doc(db, "admin_posts", id));
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  }

  static async getMessagesForGroup(ageGroup, location, sport) {
    try {
      let q = collection(db, "admin_posts");

      if (ageGroup || location || sport) {
        q = query(
          q,
          where("targetAgeGroup", "in", ["all", ageGroup]),
          where("targetLocation", "in", ["all", location]),
          where("targetSport", "in", ["all", sport]),
          orderBy("timestamp", "desc")
        );
      } else {
        q = query(q, orderBy("timestamp", "desc"));
      }

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
      }));
    } catch (error) {
      console.error("Error getting targeted messages:", error);
      throw error;
    }
  }
}

module.exports = MessageService;