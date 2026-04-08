// services/gameScheduleService.js
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
  orderBy,
  where,
  limit,
  startAfter,
  writeBatch,
  documentId,
  serverTimestamp,
} = require("firebase/firestore");
const ParentService = require("./parentService");
const CoachService = require("./coachService");

const COLLECTIONS = {
  SCHEDULES: "schedules",
  GAME_NOTIFICATIONS: "game_notifications",
  MOBILE_NOTIFICATIONS: "mobile_notifications",
};

class GameScheduleService {
  static async getSchedules() {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, COLLECTIONS.SCHEDULES), orderBy("createdAt", "desc"))
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
      }));
    } catch (error) {
      console.error("Error getting schedules:", error);
      try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.SCHEDULES));
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
        }));
      } catch (fallbackError) {
        console.error("Fallback error getting schedules:", fallbackError);
        throw fallbackError;
      }
    }
  }

  static async getScheduleById(id) {
    try {
      const docRef = doc(db, COLLECTIONS.SCHEDULES, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const scheduleData = docSnap.data();
        return {
          id: docSnap.id,
          ...scheduleData,
          createdAt: scheduleData.createdAt?.toDate ? scheduleData.createdAt.toDate() : scheduleData.createdAt,
          updatedAt: scheduleData.updatedAt?.toDate ? scheduleData.updatedAt.toDate() : scheduleData.updatedAt,
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting schedule:", error);
      throw error;
    }
  }

  static async addSchedule(scheduleData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.SCHEDULES), {
        ...scheduleData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding schedule:", error);
      throw error;
    }
  }

  static async updateSchedule(id, updates) {
    try {
      const docRef = doc(db, COLLECTIONS.SCHEDULES, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating schedule:", error);
      throw error;
    }
  }

  static async deleteSchedule(id) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.SCHEDULES, id));
    } catch (error) {
      console.error("Error deleting schedule:", error);
      throw error;
    }
  }

  static _normalizeAgeGroupsInput(ageGroups) {
    if (!ageGroups) return [];
    if (Array.isArray(ageGroups)) return ageGroups.map(String).map(s => s.trim()).filter(Boolean);
    return [String(ageGroups).trim()].filter(Boolean);
  }

  static _buildBulkDeleteQuery(filters = {}, lastDoc = null, pageSize = 500) {
    const constraints = [];

    const eqFilters = ["season", "sport", "date", "coachId", "team1Id", "team2Id", "status"];
    for (const key of eqFilters) {
      if (filters[key] !== undefined && filters[key] !== null && String(filters[key]).trim() !== "") {
        constraints.push(where(key, "==", filters[key]));
      }
    }

    const ageGroups = this._normalizeAgeGroupsInput(filters.ageGroups);
    if (ageGroups.length === 1) {
      constraints.push(where("ageGroups", "array-contains", ageGroups[0]));
    } else if (ageGroups.length > 1) {
      // Firestore: array-contains-any supports up to 10 values
      constraints.push(where("ageGroups", "array-contains-any", ageGroups.slice(0, 10)));
    }

    constraints.push(orderBy(documentId()));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    constraints.push(limit(pageSize));

    return query(collection(db, COLLECTIONS.SCHEDULES), ...constraints);
  }

  /**
   * Bulk delete schedules by ids OR by filters.
   * - Uses batched deletes (max 500 ops/batch).
   * - Supports dryRun to preview count.
   */
  static async bulkDeleteSchedules({ ids, filters, dryRun = false, maxToDelete } = {}) {
    const MAX_DEFAULT = 5000;
    const HARD_MAX = 20000;
    const max = Math.min(
      Number.isFinite(Number(maxToDelete)) ? Number(maxToDelete) : MAX_DEFAULT,
      HARD_MAX
    );

    if (ids && !Array.isArray(ids)) {
      throw new Error("ids must be an array");
    }
    if (filters && typeof filters !== "object") {
      throw new Error("filters must be an object");
    }

    // ===== Delete by explicit ids =====
    if (Array.isArray(ids) && ids.length > 0) {
      const cleanIds = ids.map(String).map(s => s.trim()).filter(Boolean);
      const toProcess = cleanIds.slice(0, max);

      if (dryRun) {
        return {
          mode: "ids",
          dryRun: true,
          matchedCount: toProcess.length,
          deletedCount: 0,
          truncated: cleanIds.length > toProcess.length,
          sampleIds: toProcess.slice(0, 25),
          maxToDelete: max,
        };
      }

      let deletedCount = 0;
      let batchCount = 0;

      for (let i = 0; i < toProcess.length; i += 500) {
        const chunk = toProcess.slice(i, i + 500);
        const batch = writeBatch(db);
        chunk.forEach(id => batch.delete(doc(db, COLLECTIONS.SCHEDULES, id)));
        await batch.commit();
        deletedCount += chunk.length;
        batchCount += 1;
      }

      return {
        mode: "ids",
        dryRun: false,
        matchedCount: toProcess.length,
        deletedCount,
        batches: batchCount,
        truncated: cleanIds.length > toProcess.length,
        maxToDelete: max,
      };
    }

    // ===== Delete by filters (query + pagination) =====
    const safeFilters = filters || {};

    let lastDoc = null;
    let matchedCount = 0;
    let deletedCount = 0;
    let batches = 0;
    let truncated = false;

    while (deletedCount < max) {
      const q = this._buildBulkDeleteQuery(safeFilters, lastDoc, 500);
      const snapshot = await getDocs(q);

      if (snapshot.empty) break;

      matchedCount += snapshot.size;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];

      if (dryRun) {
        // Keep scanning until max (so user can "preview" up to the cap)
        if (matchedCount >= max) {
          truncated = true;
          break;
        }
        continue;
      }

      const remaining = max - deletedCount;
      const docsToDelete = snapshot.docs.slice(0, remaining);

      const batch = writeBatch(db);
      docsToDelete.forEach(d => batch.delete(d.ref));
      await batch.commit();

      deletedCount += docsToDelete.length;
      batches += 1;

      if (docsToDelete.length < snapshot.docs.length) {
        truncated = true;
        break;
      }
    }

    return {
      mode: "filters",
      dryRun: Boolean(dryRun),
      filters: safeFilters,
      matchedCount: dryRun ? Math.min(matchedCount, max) : deletedCount,
      deletedCount: dryRun ? 0 : deletedCount,
      batches: dryRun ? 0 : batches,
      truncated,
      maxToDelete: max,
    };
  }

  static async sendGameNotification(gameData, notificationType = "game_scheduled") {
    try {
      const ageGroups = gameData.ageGroups || (gameData.ageGroup ? [gameData.ageGroup] : []);

      console.log("Sending interactive mobile notification:", {
        gameTitle: `${gameData.team1 || gameData.team1Name} vs ${gameData.team2 || gameData.team2Name}`,
        type: notificationType,
        sport: gameData.sport,
        ageGroups: ageGroups,
        recipientAgeGroups: ageGroups.join(", ")
      });

      const recipients = await this.getGameRecipients({
        ...gameData,
        ageGroups: ageGroups
      });

      if (recipients.total === 0) {
        console.log("No recipients found for this game notification");
        return null;
      }

      const notificationPayload = {
        gameId: gameData.id,
        type: notificationType,
        title: this.getNotificationTitle(gameData, notificationType),
        body: this.getNotificationBody(gameData, notificationType, ageGroups),
        data: {
          gameId: gameData.id,
          team1: gameData.team1Name || gameData.team1,
          team2: gameData.team2Name || gameData.team2,
          date: gameData.date,
          time: gameData.time,
          location: gameData.location,
          sport: gameData.sport,
          ageGroups: ageGroups.join(","),
          status: gameData.status,
          coachName: gameData.coachName,
          notes: gameData.notes,
          actions: this.getNotificationActions(notificationType, gameData)
        },
        recipients: recipients.total,
        recipientBreakdown: {
          parents: recipients.parentIds.length,
          coaches: recipients.coachIds.length,
          ageGroups: ageGroups
        },
        sentAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.GAME_NOTIFICATIONS), {
        ...notificationPayload,
        sentAt: serverTimestamp(),
        status: "sent",
      });

      await this.sendMobilePushNotifications(recipients, notificationPayload);

      console.log("Interactive mobile notifications sent:", {
        notificationId: docRef.id,
        recipients: recipients.total,
        parents: recipients.parentIds.length,
        coaches: recipients.coachIds.length,
        ageGroups: ageGroups.join(", ")
      });

      return docRef.id;
    } catch (error) {
      console.error("Error sending mobile notification:", error);
      throw error;
    }
  }

  static async getGameRecipients(gameData) {
    try {
      const recipients = {
        parentIds: [],
        coachIds: [],
        total: 0
      };

      const ageGroups = gameData.ageGroups || (gameData.ageGroup ? [gameData.ageGroup] : []);

      console.log("Finding recipients for game:", {
        sport: gameData.sport,
        ageGroups: ageGroups,
        location: gameData.location,
        team1: gameData.team1 || gameData.team1Name,
        team2: gameData.team2 || gameData.team2Name
      });

      const [parentsData, coachesData] = await Promise.all([
        ParentService.getParents(),
        CoachService.getCoaches()
      ]);

      // Enhanced parent filtering for mobile users
      const relevantParents = parentsData.filter(parent => {
        if (!parent.students || !Array.isArray(parent.students)) {
          return false;
        }

        const hasRelevantChild = parent.students.some(student => {
          const sportMatch = parent.sport === gameData.sport;
          const ageGroupMatch = ageGroups.includes(student.ageGroup || this.calculateAgeGroup(student.dob));

          const locationMatch = !gameData.location ||
            parent.location === gameData.location ||
            (parent.sport === gameData.sport && ageGroups.includes(student.ageGroup));

          return sportMatch && ageGroupMatch && locationMatch;
        });

        return hasRelevantChild;
      });

      // Add parent recipients
      relevantParents.forEach(parent => {
        recipients.parentIds.push({
          id: parent.id,
          name: `${parent.firstName} ${parent.lastName}`,
          email: parent.email,
          phone: parent.phone,
          sport: parent.sport,
          location: parent.location,
          smsOptIn: parent.smsOptIn || parent.smsOtpIn,
          fcmToken: parent.fcmToken,
          children: parent.students.filter(student =>
            ageGroups.includes(student.ageGroup || this.calculateAgeGroup(student.dob))
          ).map(student => ({
            name: student.firstName + " " + (student.lastName || ""),
            ageGroup: student.ageGroup || this.calculateAgeGroup(student.dob)
          }))
        });
      });

      // Coach filtering
      const relevantCoaches = coachesData.filter(coach => {
        if (!coach.assignedTeams || coach.role !== "coach") {
          return false;
        }

        const hasRelevantTeam = coach.assignedTeams.some(team =>
          team.sport === gameData.sport &&
          ageGroups.includes(team.ageGroup) &&
          (team.id === gameData.team1Id ||
            team.id === gameData.team2Id ||
            (team.sport === gameData.sport && ageGroups.includes(team.ageGroup)))
        );

        return hasRelevantTeam;
      });

      // Add coach recipients
      relevantCoaches.forEach(coach => {
        recipients.coachIds.push({
          id: coach.id,
          name: `${coach.firstName} ${coach.lastName}`,
          email: coach.email,
          phone: coach.phone,
          primarySport: coach.primarySport,
          assignedTeams: coach.assignedTeams?.filter(team =>
            team.sport === gameData.sport && ageGroups.includes(team.ageGroup)
          ) || []
        });
      });

      recipients.total = recipients.parentIds.length + recipients.coachIds.length;

      console.log("Final notification recipients:", {
        parents: recipients.parentIds.length,
        coaches: recipients.coachIds.length,
        total: recipients.total,
        ageGroups: ageGroups.join(", ")
      });

      return recipients;
    } catch (error) {
      console.error("Error getting recipients:", error);
      throw error;
    }
  }

  static async sendMobilePushNotifications(recipients, payload) {
    try {
      console.log("Sending to mobile devices...");

      const allRecipientIds = [
        ...recipients.parentIds.map(p => p.id),
        ...recipients.coachIds.map(c => c.id)
      ];

      if (allRecipientIds.length > 0) {
        await addDoc(collection(db, COLLECTIONS.MOBILE_NOTIFICATIONS), {
          recipientIds: allRecipientIds,
          recipients: {
            parents: recipients.parentIds,
            coaches: recipients.coachIds
          },
          title: payload.title,
          body: payload.body,
          data: payload.data,
          type: payload.type,
          gameId: payload.gameId,
          priority: payload.type === "game_reminder" ? "high" : "normal",
          sentAt: serverTimestamp(),
          read: false,
          interacted: false
        });

        // Note: Actual FCM push notifications would be handled by a separate service
        // This could be implemented as a cloud function or external service

        console.log(`Enhanced mobile notification saved for ${allRecipientIds.length} recipients`);
      }
    } catch (error) {
      console.error("Error sending mobile notifications:", error);
      throw error;
    }
  }

  static calculateAgeGroup(dob) {
    if (!dob) return "6U";

    try {
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) {
        return "6U";
      }

      const today = new Date();
      const currentYear = today.getFullYear();

      // Create the cutoff date for this year (July 31)
      const cutoffDate = new Date(currentYear, 6, 31); // Month is 0-indexed (6 = July)

      // 1. Calculate the player's "season age" (age on Dec 31 of this year)
      const seasonAge = currentYear - birthDate.getFullYear();

      // 2. Check if the season age is within the valid range (3-14)
      if (seasonAge < 3 || seasonAge > 14) {
        return "6U";
      }

      // 3. Create the player's birthday for THIS year
      const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

      // 4. Apply the Roster Logic
      let ageGroup;
      if (birthdayThisYear > cutoffDate) {
        // Player's birthday is AFTER the cutoff.
        // They are eligible to play one group DOWN (e.g., 12U base -> 11U eligible).
        ageGroup = (seasonAge - 1) + "U";
      } else {
        // Player's birthday is ON or BEFORE the cutoff.
        // They must play in their base group.
        ageGroup = seasonAge + "U";
      }

      // 5. Handle the edge case for the youngest group.
      const groupNumber = parseInt(ageGroup);
      if (groupNumber < 3) {
        return "3U";
      }

      return ageGroup;

    } catch (error) {
      console.error("Error calculating age group:", error);
      return "6U";
    }
  }

  static getNotificationTitle(gameData, type) {
    switch (type) {
      case "game_scheduled":
        return "🏆 New Game Scheduled!";
      case "game_updated":
        return "📝 Game Updated";
      case "game_cancelled":
        return "❌ Game Cancelled";
      case "game_reminder":
        return "⏰ Game Reminder";
      default:
        return "🏆 Game Notification";
    }
  }

  static getNotificationBody(gameData, type, ageGroups = []) {
    const gameTitle = `${gameData.team1Name || gameData.team1} vs ${gameData.team2Name || gameData.team2}`;
    const gameTime = `${gameData.date} at ${gameData.time}`;
    const ageGroupText = ageGroups.length > 1 ? `(${ageGroups.join(", ")})` : `(${ageGroups[0] || ""})`;

    switch (type) {
      case "game_scheduled":
        return `${gameTitle} ${ageGroupText} - ${gameTime} at ${gameData.location}`;
      case "game_updated":
        return `${gameTitle} ${ageGroupText} details have been updated. Check the app for details.`;
      case "game_cancelled":
        return `${gameTitle} ${ageGroupText} scheduled for ${gameTime} has been cancelled.`;
      case "game_reminder":
        return `Don't forget! ${gameTitle} ${ageGroupText} is coming up at ${gameData.time}`;
      default:
        return `${gameTitle} ${ageGroupText} - ${gameTime}`;
    }
  }

  static getNotificationActions(type, gameData) {
    const actions = [];

    switch (type) {
      case "game_scheduled":
      case "game_updated":
        actions.push(
          { id: "view", title: "View Game", icon: "👁️" },
          { id: "directions", title: "Get Directions", icon: "🗺️" }
        );
        break;
      case "game_reminder":
        actions.push(
          { id: "view", title: "View Details", icon: "👁️" },
          { id: "directions", title: "Get Directions", icon: "🗺️" },
          { id: "remind_later", title: "Remind Later", icon: "⏰" }
        );
        break;
      case "game_cancelled":
        actions.push(
          { id: "view", title: "View Details", icon: "👁️" }
        );
        break;
      default:
        return [];
    }

    return actions;
  }
}

module.exports = GameScheduleService;