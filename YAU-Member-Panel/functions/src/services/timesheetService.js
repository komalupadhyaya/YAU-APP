// services/timesheetService.js
const { db } = require("../utils/firebase");
const {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
  where,
} = require("firebase/firestore");

class TimesheetService {
  static COLLECTION = "timesheetEntries";

  // Validation helper methods
  static validateTimesheetData(data) {
    console.log("comming in valadation " ,data)
    const errors = [];

    // Date validation
    if (!data.date) {
      errors.push("Date is required");
    } else {
      const inputDate = new Date(data.date);
      const today = new Date();
      // if (inputDate > today) {
      //   errors.push("Date cannot be in the future");
      // }
    }

    // Time validation
    const timePattern = /^(0?[1-9]|1[0-2]):[0-5][0-9] [AP]M$/;
    if (!data.startTime || !timePattern.test(data.startTime)) {
      errors.push("Start time must be in format 'HH:MM AM/PM'");
    }
    if (!data.endTime || !timePattern.test(data.endTime)) {
      errors.push("End time must be in format 'HH:MM AM/PM'");
    }

    // Location validation
    if (!data.location || data.location.trim().length === 0) {
      errors.push("Location is required");
    } else if (data.location.length > 255) {
      errors.push("Location cannot exceed 255 characters");
    }

    // Notes validation
    if (data.notes && data.notes.length > 1000) {
      errors.push("Notes cannot exceed 1000 characters");
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
  }

  static validateUpdateData(updates) {
    const errors = [];

    // Date validation
    if (updates.date) {
      const inputDate = new Date(updates.date);
      const today = new Date();
      // if (inputDate > today) {
      //   errors.push("Date cannot be in the future");
      // }
    }

    // Time validation
    const timePattern = /^(0?[1-9]|1[0-2]):[0-5][0-9] [AP]M$/;
    if (updates.startTime && !timePattern.test(updates.startTime)) {
      errors.push("Start time must be in format 'HH:MM AM/PM'");
    }
    if (updates.endTime && !timePattern.test(updates.endTime)) {
      errors.push("End time must be in format 'HH:MM AM/PM'");
    }

    // Location validation
    if (updates.location) {
      if (updates.location.trim().length === 0) {
        errors.push("Location cannot be empty");
      } else if (updates.location.length > 255) {
        errors.push("Location cannot exceed 255 characters");
      }
    }

    // Notes validation
    if (updates.notes && updates.notes.length > 1000) {
      errors.push("Notes cannot exceed 1000 characters");
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
  }

  // Calculate total hours from start and end time
  static calculateTotalHours(startTime, endTime) {
    const convertTo24Hour = (timeStr) => {
      const [time, modifier] = timeStr.split(" ");
      let [hours, minutes] = time.split(":");

      if (modifier === "PM" && hours !== "12") {
        hours = parseInt(hours, 10) + 12;
      }
      if (modifier === "AM" && hours === "12") {
        hours = "00";
      }

      return new Date(1970, 0, 1, parseInt(hours), parseInt(minutes));
    };

    const start = convertTo24Hour(startTime);
    const end = convertTo24Hour(endTime);
    const diff = (end - start) / (1000 * 60 * 60);

    return diff > 0 ? Math.round(diff * 100) / 100 : 0;
  }

  // Create a new entry
  static async createEntry(data) {
    try {
      // Validate input data
      this.validateTimesheetData(data);

      console.log("data is ",data)

      // Calculate total hours
      const totalHours = this.calculateTotalHours(data.startTime, data.endTime);

      console.log("Creating entry with total hours:", data, totalHours);

      const entryData = {
        ...data,
        totalHours,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log("entryDataentryDataentryData",entryData)

      const docRef = await addDoc(collection(db, this.COLLECTION), entryData);

      console.log("afterafter",docRef.id)

      return {
        id: docRef.id,
        ...entryData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error creating entry:", error);
      throw error;
    }
  }

  // Get all entries for a specific coach
  static async getEntriesByCoachId(coachId) {
    console.log("coach id:", coachId);

    try {
      // TEMPORARY: Remove orderBy to avoid index requirement
      const q = query(
        collection(db, this.COLLECTION),
        where("coachId", "==", coachId)
      );

      const snapshot = await getDocs(q);
      console.log("Snapshot docs count:", snapshot.docs.length);

      let entries = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate
            ? data.updatedAt.toDate()
            : new Date(data.updatedAt),
          submittedAt: data.submittedAt?.toDate
            ? data.submittedAt.toDate()
            : data.submittedAt,
        };
      });

      // Manual sorting - same result as orderBy("createdAt", "desc")
      entries.sort((a, b) => {
        const dateA =
          a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB =
          b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Descending
      });

      console.log("Processed entries:", entries.length);
      return entries;
    } catch (error) {
      console.error("Error getting entries by coach:", error);
      throw new Error("Failed to fetch timesheet entries: " + error.message);
    }
  }

  // Get single entry by ID with ownership check
  static async getEntryById(id, coachId) {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Timesheet entry not found");
      }

      const data = docSnap.data();

      // Security: Verify ownership
      if (data.coachId !== coachId) {
        throw new Error(
          "Access denied - You can only access your own timesheet entries"
        );
      }

      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : data.createdAt,
        updatedAt: data.updatedAt?.toDate
          ? data.updatedAt.toDate()
          : data.updatedAt,
        submittedAt: data.submittedAt?.toDate
          ? data.submittedAt.toDate()
          : data.submittedAt,
      };
    } catch (error) {
      console.error("Error getting entry by ID:", error);
      throw error;
    }
  }

  // Update entry with security and business logic
  static async updateEntry(id, updates, coachId) {
    try {
      // Validate update data
      this.validateUpdateData(updates);

      const docRef = doc(db, this.COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Timesheet entry not found");
      }

      const existing = docSnap.data();

      // Security: Verify ownership
      if (existing.coachId !== coachId) {
        throw new Error(
          "Access denied - You can only update your own timesheet entries"
        );
      }

      // Business logic: Prevent updating submitted entries
      if (existing.status === "submitted") {
        throw new Error("Cannot update submitted timesheet");
      }

      // Calculate total hours if times are updated
      let totalHours = existing.totalHours;
      if (updates.startTime || updates.endTime) {
        const startTime = updates.startTime || existing.startTime;
        const endTime = updates.endTime || existing.endTime;
        totalHours = this.calculateTotalHours(startTime, endTime);
      }

      // Prevent changing coachId or other protected fields
      const { coachId: _, id: __, createdAt: ___, ...safeUpdates } = updates;

      const updateData = {
        ...safeUpdates,
        totalHours,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(docRef, updateData);

      return {
        id,
        ...updateData,
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error updating entry:", error);
      throw error;
    }
  }

  // Delete entry with security and business logic
  static async deleteEntry(id, coachId) {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Timesheet entry not found");
      }

      const existing = docSnap.data();

      // Security: Verify ownership
      if (existing.coachId !== coachId) {
        throw new Error(
          "Access denied - You can only delete your own timesheet entries"
        );
      }

      // Business logic: Prevent deleting submitted entries
      if (existing.status === "submitted") {
        throw new Error("Cannot delete submitted timesheet");
      }

      await deleteDoc(docRef);

      return {
        message: "Timesheet entry deleted successfully",
        deletedEntryId: id,
      };
    } catch (error) {
      console.error("Error deleting entry:", error);
      throw error;
    }
  }

  // Submit timesheet for review
  static async submitTimesheet(id, coachId) {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Timesheet entry not found");
      }

      const existing = docSnap.data();

      // Security: Verify ownership
      if (existing.coachId !== coachId) {
        throw new Error(
          "Access denied - You can only submit your own timesheet entries"
        );
      }

      // Business logic: Prevent re-submitting
      if (existing.status === "submitted") {
        throw new Error("Timesheet is already submitted");
      }

      const updates = {
        status: "submitted",
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(docRef, updates);

      return {
        id,
        ...updates,
        submittedAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error submitting timesheet:", error);
      throw error;
    }
  }

  // Get coach statistics for dashboard
  static async getCoachStats(coachId) {
    try {
      const entries = await this.getEntriesByCoachId(coachId);

      const stats = {
        totalEntries: entries.length,
        totalHours: 0,
        draftEntries: 0,
        submittedEntries: 0,
        approvedEntries: 0,
        rejectedEntries: 0,
        thisWeekHours: 0,
        thisMonthHours: 0,
      };

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      entries.forEach((entry) => {
        const entryDate =
          entry.date instanceof Date ? entry.date : new Date(entry.date);
        const hours = entry.totalHours || 0;

        stats.totalHours += hours;

        // Status counts
        switch (entry.status) {
          case "draft":
            stats.draftEntries++;
            break;
          case "submitted":
            stats.submittedEntries++;
            break;
          case "approved":
            stats.approvedEntries++;
            break;
          case "rejected":
            stats.rejectedEntries++;
            break;
        }

        // Time-based calculations
        if (entryDate >= oneWeekAgo) {
          stats.thisWeekHours += hours;
        }

        if (entryDate >= oneMonthAgo) {
          stats.thisMonthHours += hours;
        }
      });

      // Round to 2 decimal places
      stats.totalHours = Math.round(stats.totalHours * 100) / 100;
      stats.thisWeekHours = Math.round(stats.thisWeekHours * 100) / 100;
      stats.thisMonthHours = Math.round(stats.thisMonthHours * 100) / 100;

      return stats;
    } catch (error) {
      console.error("Error getting coach stats:", error);
      throw new Error("Failed to calculate coach statistics");
    }
  }
}

module.exports = TimesheetService;
