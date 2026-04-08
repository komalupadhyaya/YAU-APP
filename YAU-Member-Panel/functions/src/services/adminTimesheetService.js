const { db } = require("../utils/firebase");
const {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
} = require("firebase/firestore");

class AdminTimesheetService {
  static COLLECTION = "timesheetEntries";
  static COACHES_COLLECTION = "coaches";
  static USERS_COLLECTION = "users";

  // Get all timesheets with advanced filtering - NO INDEXES REQUIRED
  static async getAllTimesheets(filters = {}) {
    try {
      console.log("Getting all timesheets with filters:", filters);
      
      // Get ALL documents without any where clauses initially
      let q = collection(db, this.COLLECTION);
      const snapshot = await getDocs(q);
      console.log("Total documents found:", snapshot.docs.length);

      let timesheets = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const coachInfo = await this.getCoachInfo(data.coachId);

          return {
            id: docSnap.id,
            ...data,
            ...coachInfo,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate()
              : new Date(data.updatedAt),
            submittedAt: data.submittedAt?.toDate
              ? data.submittedAt.toDate()
              : data.submittedAt,
            date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          };
        })
      );
      // if (!filters.coachId) {
        timesheets = timesheets.filter(ts => ts.status != "draft");
      // }

      // Apply ALL filters manually in JavaScript
      timesheets = this.applyFiltersManually(timesheets, filters);
            
      // Manual sorting - newest first
      timesheets.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Descending order
      });

      // Apply pagination
      const startIndex = (filters.page - 1) * filters.limit;
      const endIndex = startIndex + filters.limit;
      const paginatedTimesheets = timesheets.slice(startIndex, endIndex);

      // Get unique locations for filter options
      const locations = [
        ...new Set(timesheets.map((ts) => ts.location).filter(Boolean)),
      ];

      console.log("Filtered timesheets:", timesheets.length);
      console.log("Paginated timesheets:", paginatedTimesheets.length);

      return {
        timesheets: paginatedTimesheets,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: timesheets.length,
          totalPages: Math.ceil(timesheets.length / filters.limit),
        },
        filters: {
          availableLocations: locations,
        },
      };
    } catch (error) {
      console.error("Error getting all timesheets:", error);
      throw new Error("Failed to fetch timesheets: " + error.message);
    }
  }

    // In the getCoachTimesheets method, update the filters handling:
    static async getCoachTimesheets(coachId, filters = {}) {
      try {
        console.log("Getting timesheets for coach:", coachId, "with filters:", filters);
        
        // Get ALL documents and filter manually
        let q = collection(db, this.COLLECTION);
        const snapshot = await getDocs(q);

        let timesheets = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const coachInfo = await this.getCoachInfo(data.coachId);
            
            return {
              id: docSnap.id,
              ...data,
              ...coachInfo,
              createdAt: data.createdAt?.toDate
                ? data.createdAt.toDate()
                : new Date(data.createdAt),
              updatedAt: data.updatedAt?.toDate
                ? data.updatedAt.toDate()
                : new Date(data.updatedAt),
              submittedAt: data.submittedAt?.toDate
                ? data.submittedAt.toDate()
                : data.submittedAt,
              date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
            };
          })
        );

        // Apply coach filter manually
        timesheets = timesheets.filter(ts => ts.coachId === coachId);
        
        // Apply additional filters manually
        if (filters.startDate || filters.endDate) {
          timesheets = timesheets.filter(ts => {
            const entryDate = ts.date instanceof Date ? ts.date : new Date(ts.date);
            
            if (filters.startDate && filters.endDate) {
              return entryDate >= filters.startDate && entryDate <= filters.endDate;
            } else if (filters.startDate) {
              return entryDate >= filters.startDate;
            } else if (filters.endDate) {
              return entryDate <= filters.endDate;
            }
            return true;
          });
        }
          timesheets = timesheets.filter(ts => ts.status != "draft");


        // Manual sorting - newest first
        timesheets.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

        // Apply pagination
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedTimesheets = timesheets.slice(startIndex, endIndex);

        const coachInfo = await this.getCoachInfo(coachId);

        // Calculate total hours for ALL timesheets (not just paginated)
        const totalHours = timesheets.reduce(
          (sum, ts) => sum + (ts.totalHours || 0),
          0
        );

        return {
          coach: coachInfo,
          timesheets: paginatedTimesheets,
          summary: {
            totalEntries: timesheets.length, // Total across all pages
            totalHours: Math.round(totalHours * 100) / 100,
            period: {
              startDate: filters.startDate,
              endDate: filters.endDate,
            },
          },
          pagination: {
            page: page,
            limit: limit,
            total: timesheets.length,
            totalPages: Math.ceil(timesheets.length / limit),
          },
        };
      } catch (error) {
        console.error("Error getting coach timesheets:", error);
        throw new Error("Failed to fetch coach timesheets: " + error.message);
      }
    }

  // Apply filters manually in JavaScript
  static applyFiltersManually(timesheets, filters) {
    let filtered = [...timesheets];

    // Coach filter
    if (filters.coachId) {
      filtered = filtered.filter(ts => ts.coachId === filters.coachId);
    }

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(ts => 
        ts.location && ts.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(ts => ts.status === filters.status);
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter(ts => {
        const entryDate = ts.date instanceof Date ? ts.date : new Date(ts.date);
        
        if (filters.startDate && filters.endDate) {
          return entryDate >= filters.startDate && entryDate <= filters.endDate;
        } else if (filters.startDate) {
          return entryDate >= filters.startDate;
        } else if (filters.endDate) {
          return entryDate <= filters.endDate;
        }
        return true;
      });
    }

    return filtered;
  }

  // Get coach information
  static async getCoachInfo(coachId) {
    try {
      // Fallback to users collection
      const userDoc = await getDoc(doc(db, this.USERS_COLLECTION, coachId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown Coach',
          email: userData.email || 'No email available',
          hourlyRate: userData.hourlyRate   || 0,
          coachId: coachId,
        };
      }

      // Return minimal info if no coach/user record found
      return {
        name: "Unknown Coach",
        email: "No email available",
        coachId: coachId,
      };
    } catch (error) {
      console.error("Error getting coach info:", error);
      return {
        name: "Unknown Coach",
        email: "No email available",
        coachId: coachId,
      };
    }
  }

  // Get timesheet statistics - NO INDEXES REQUIRED
  static async getTimesheetStats(filters = {}) {
    try {
      const allTimesheets = await this.getAllTimesheets(filters);
      const timesheets = allTimesheets.timesheets;

      // Group by coach
      const coachStats = {};
      timesheets.forEach((ts) => {
        if (!coachStats[ts.coachId]) {
          coachStats[ts.coachId] = {
            coachId: ts.coachId,
            coachName: ts.name || "Unknown Coach",
            coachEmail: ts.email,
            totalHours: 0,
            totalEntries: 0,
            submitted: 0,
            approved: 0,
            rejected: 0,
            draft: 0,
          };
        }

        coachStats[ts.coachId].totalHours += ts.totalHours || 0;
        coachStats[ts.coachId].totalEntries++;
        coachStats[ts.coachId][ts.status] = (coachStats[ts.coachId][ts.status] || 0) + 1;
      });

      // Calculate overall stats
      const overallStats = {
        totalCoaches: Object.keys(coachStats).length,
        totalEntries: timesheets.length,
        totalHours: timesheets.reduce(
          (sum, ts) => sum + (ts.totalHours || 0),
          0
        ),
        byStatus: {
          draft: timesheets.filter((ts) => ts.status === "draft").length,
          submitted: timesheets.filter((ts) => ts.status === "submitted")
            .length,
          approved: timesheets.filter((ts) => ts.status === "approved").length,
          rejected: timesheets.filter((ts) => ts.status === "rejected").length,
        },
        byLocation: this.groupByLocation(timesheets),
      };

      return {
        overall: overallStats,
        coaches: Object.values(coachStats).map((coach) => ({
          ...coach,
          totalHours: Math.round(coach.totalHours * 100) / 100,
        })),
      };
    } catch (error) {
      console.error("Error getting timesheet stats:", error);
      throw new Error("Failed to calculate statistics: " + error.message);
    }
  }

  // Group timesheets by location
  static groupByLocation(timesheets) {
    const locationStats = {};
    timesheets.forEach((ts) => {
      if (!locationStats[ts.location]) {
        locationStats[ts.location] = {
          location: ts.location,
          totalHours: 0,
          totalEntries: 0,
        };
      }
      locationStats[ts.location].totalHours += ts.totalHours || 0;
      locationStats[ts.location].totalEntries++;
    });

    return Object.values(locationStats).map((loc) => ({
      ...loc,
      totalHours: Math.round(loc.totalHours * 100) / 100,
    }));
  }

  // Approve timesheet
  static async approveTimesheet(entryId, adminNotes = "") {
    try {
      const docRef = doc(db, this.COLLECTION, entryId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Timesheet entry not found");
      }

      const updates = {
        status: "approved",
        approvedAt: new Date(),
        adminNotes: adminNotes || "",
        updatedAt: new Date(),
      };

      await updateDoc(docRef, updates);

      return {
        id: entryId,
        ...updates,
        message: "Timesheet approved successfully",
      };
    } catch (error) {
      console.error("Error approving timesheet:", error);
      throw new Error("Failed to approve timesheet: " + error.message);
    }
  }

  // Reject timesheet
  static async rejectTimesheet(entryId, reason = "") {
    try {
      const docRef = doc(db, this.COLLECTION, entryId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Timesheet entry not found");
      }

      if (!reason) {
        throw new Error("Rejection reason is required");
      }

      const updates = {
        status: "rejected",
        rejectedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      };

      await updateDoc(docRef, updates);

      return {
        id: entryId,
        ...updates,
        message: "Timesheet rejected successfully",
      };
    } catch (error) {
      console.error("Error rejecting timesheet:", error);
      throw new Error("Failed to reject timesheet: " + error.message);
    }
  }

  // Bulk approve timesheets
  static async bulkApproveTimesheets(entryIds, adminNotes = "") {
    try {
      if (!Array.isArray(entryIds) || entryIds.length === 0) {
        throw new Error("Entry IDs array is required and cannot be empty");
      }

      const results = {
        successful: [],
        failed: [],
      };

      // Process in batches of 500 (Firestore limit)
      const batchSize = 500;
      for (let i = 0; i < entryIds.length; i += batchSize) {
        const batchIds = entryIds.slice(i, i + batchSize);
        const batch = writeBatch(db);
        let hasUpdates = false;

        for (const entryId of batchIds) {
          try {
            const docRef = doc(db, this.COLLECTION, entryId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
              results.failed.push({
                id: entryId,
                error: "Timesheet entry not found",
              });
              continue;
            }

            const currentData = docSnap.data();
            if (currentData.status === "approved") {
              results.failed.push({
                id: entryId,
                error: "Timesheet already approved",
              });
              continue;
            }

            batch.update(docRef, {
              status: "approved",
              approvedAt: new Date(),
              adminNotes: adminNotes || "",
              updatedAt: new Date(),
            });

            hasUpdates = true;
            results.successful.push(entryId);
          } catch (error) {
            results.failed.push({
              id: entryId,
              error: error.message,
            });
          }
        }

        // Commit this batch if there are updates
        if (hasUpdates) {
          await batch.commit();
        }
      }

      return {
        total: entryIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        successfulIds: results.successful,
        failedEntries: results.failed,
        message: `Bulk approval completed: ${results.successful.length} approved, ${results.failed.length} failed`,
      };
    } catch (error) {
      console.error("Error bulk approving timesheets:", error);
      throw new Error("Failed to bulk approve timesheets: " + error.message);
    }
  }

  // Bulk reject timesheets
  static async bulkRejectTimesheets(entryIds, reason = "") {
    try {
      if (!Array.isArray(entryIds) || entryIds.length === 0) {
        throw new Error("Entry IDs array is required and cannot be empty");
      }

      if (!reason || reason.trim() === "") {
        throw new Error("Rejection reason is required for bulk rejection");
      }

      const results = {
        successful: [],
        failed: [],
      };

      // Process in batches of 500 (Firestore limit)
      const batchSize = 500;
      for (let i = 0; i < entryIds.length; i += batchSize) {
        const batchIds = entryIds.slice(i, i + batchSize);
        const batch = writeBatch(db);
        let hasUpdates = false;

        for (const entryId of batchIds) {
          try {
            const docRef = doc(db, this.COLLECTION, entryId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
              results.failed.push({
                id: entryId,
                error: "Timesheet entry not found",
              });
              continue;
            }

            const currentData = docSnap.data();
            if (currentData.status === "rejected") {
              results.failed.push({
                id: entryId,
                error: "Timesheet already rejected",
              });
              continue;
            }

            batch.update(docRef, {
              status: "rejected",
              rejectedAt: new Date(),
              rejectionReason: reason,
              updatedAt: new Date(),
            });

            hasUpdates = true;
            results.successful.push(entryId);
          } catch (error) {
            results.failed.push({
              id: entryId,
              error: error.message,
            });
          }
        }

        // Commit this batch if there are updates
        if (hasUpdates) {
          await batch.commit();
        }
      }

      return {
        total: entryIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        successfulIds: results.successful,
        failedEntries: results.failed,
        message: `Bulk rejection completed: ${results.successful.length} rejected, ${results.failed.length} failed`,
      };
    } catch (error) {
      console.error("Error bulk rejecting timesheets:", error);
      throw new Error("Failed to bulk reject timesheets: " + error.message);
    }
  }

  // Export timesheets - FIXED VERSION
  static async exportTimesheets(filters = {}, format = "json") {
    try {
      console.log("Export timesheets with filters:", filters);
      
      // Get ALL documents without pagination for export
      let q = collection(db, this.COLLECTION);
      const snapshot = await getDocs(q);
      console.log("Total documents for export:", snapshot.docs.length);

      let timesheets = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const coachInfo = await this.getCoachInfo(data.coachId);

          return {
            id: docSnap.id,
            ...data,
            ...coachInfo,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate()
              : new Date(data.updatedAt),
            submittedAt: data.submittedAt?.toDate
              ? data.submittedAt.toDate()
              : data.submittedAt,
            date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          };
        })
      );

      // Apply filters manually for export
      timesheets = this.applyFiltersManually(timesheets, filters);
      
      console.log("Filtered timesheets for export:", timesheets.length);

      if (format === "csv") {
        return this.convertToCSV(timesheets);
      }

      return timesheets;
    } catch (error) {
      console.error("Error exporting timesheets:", error);
      throw new Error("Failed to export timesheets: " + error.message);
    }
  }

  // Convert to CSV
  static convertToCSV(timesheets) {
    const headers = [
      "Coach Name",
      "Coach Email",
      "Date",
      "Start Time",
      "End Time",
      "Total Hours",
      "Location",
      "Hourly Rate",
      "Total Pay",
      "Status",
      "Notes",
      "Created At",
      "Updated At"
    ];

    const csvRows = [
      headers.join(","),
      ...timesheets.map((ts) =>
        [
          `"${ts.name || "Unknown"}"`,
          `"${ts.email || ""}"`,
          `"${
            ts.date instanceof Date
              ? ts.date.toISOString().split("T")[0]
              : ts.date
          }"`,
          `"${ts.startTime || ""}"`,
          `"${ts.endTime || ""}"`,
          ts.totalHours || 0,
          `"${ts.location || ""}"`,
          ts.hourlyRate || 0,
          (ts.totalHours || 0) * (ts.hourlyRate || 0),
          `"${ts.status || ""}"`,
          `"${(ts.notes || "").replace(/"/g, '""')}"`,
          `"${ts.createdAt instanceof Date ? ts.createdAt.toISOString() : ts.createdAt}"`,
          `"${ts.updatedAt instanceof Date ? ts.updatedAt.toISOString() : ts.updatedAt}"`
        ].join(",")
      ),
    ];

    return csvRows.join("\n");
  }
}

module.exports = AdminTimesheetService;