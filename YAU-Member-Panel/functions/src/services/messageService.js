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
const axios = require("axios");
const MemberService = require("./memberService");

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

      // Execute push notification logic without blocking the return
      this.sendPushNotifications(messageData).catch((err) => {
        console.error("Error sending push notifications for message:", err);
      });

      return docRef.id;
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  }

  static async sendPushNotifications(messageData) {
    try {
      console.log('📱 Preparing to send admin push notification...');
      const allMembers = await MemberService.getMembers();
      
      const { targetAgeGroup, targetLocation, targetSport, title, description } = messageData;

      // Filter members based on targeting criteria
      // Note: Admin messages may use "all" to bypass a filter
      const eligibleUsers = allMembers.filter(member => {
        // Evaluate location filter
        const locationMatch = targetLocation === "all" || member.location === targetLocation;
        // Evaluate sport filter
        const sportMatch = targetSport === "all" || member.sport === targetSport;

        // Evaluate age group filter - check if any of the member's students match the age group
        const ageGroupMatch = targetAgeGroup === "all" || 
            (member.students && member.students.some(student => student.ageGroup === targetAgeGroup || student.grade_band === targetAgeGroup));

        return locationMatch && sportMatch && ageGroupMatch;
      });

      // Extract valid Expo Push Tokens
      const pushTokens = eligibleUsers
        .map(user => user.expoPushToken)
        .filter(token => Boolean(token));

      // Remove duplicates
      const uniquePushTokens = [...new Set(pushTokens)];

      if (uniquePushTokens.length === 0) {
        console.log('ℹ️ No push tokens found for targeted audience. Notification skipped.');
        return;
      }

      console.log(`📤 Sending push notification to ${uniquePushTokens.length} recipients...`);

      const expoMessage = {
        to: uniquePushTokens,
        sound: 'default',
        title: title || 'New Message from YAU',
        body: description || 'You have a new message from the administrator.',
        data: { route: 'messages' },
      };

      const expoResponse = await axios.post('https://exp.host/--/api/v2/push/send', expoMessage, {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        }
      });
      console.log('✅ Expo push notification dispatched:', expoResponse.data);

    } catch (error) {
      console.error("❌ Failed to send push notifications:", error);
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