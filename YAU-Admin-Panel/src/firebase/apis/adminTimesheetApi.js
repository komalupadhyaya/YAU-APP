import { API_CONFIG, buildApiUrl } from "../config";

// Helper function for admin API calls
const adminApiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Admin API call failed:", error);
    throw error;
  }
};

// Admin Timesheet API functions
export const adminTimesheetApi = {
  // Get all timesheets with optional filters
  getAllTimesheets: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const url = buildApiUrl(
        `${API_CONFIG.endpoints.adminTimesheets.getAll}`
      );
      return await adminApiCall(url);
    } catch (error) {
      console.error("Error fetching all timesheets:", error);
      throw error;
    }
  },

  // Get timesheets by specific coach
  getCoachTimesheets: async (coachId, filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const url = buildApiUrl(
        `${API_CONFIG.endpoints.adminTimesheets.getByCoach.replace(":coachId", coachId)}?${queryParams.toString()}`
      );
      return await adminApiCall(url);
    } catch (error) {
      console.error("Error fetching coach timesheets:", error);
      throw error;
    }
  },

  // Get timesheet statistics
  getTimesheetStats: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const url = buildApiUrl(
        `${API_CONFIG.endpoints.adminTimesheets.stats}?${queryParams.toString()}`
      );
      return await adminApiCall(url);
    } catch (error) {
      console.error("Error fetching timesheet stats:", error);
      throw error;
    }
  },

  // Approve timesheet
  approveTimesheet: async (timesheetId) => {
    try {
      const url = buildApiUrl(
        API_CONFIG.endpoints.adminTimesheets.approve.replace(":id", timesheetId)
      );
      return await adminApiCall(url, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error approving timesheet:", error);
      throw error;
    }
  },

  // Reject timesheet
  rejectTimesheet: async (timesheetId, reason = "") => {
    try {
      const url = buildApiUrl(
        API_CONFIG.endpoints.adminTimesheets.reject.replace(":id", timesheetId)
      );
      return await adminApiCall(url, {
        method: "POST",
        body: reason ? JSON.stringify({ reason }) : "{}",
      });
    } catch (error) {
      console.error("Error rejecting timesheet:", error);
      throw error;
    }
  },

  // Bulk approve timesheets
  bulkApproveTimesheets: async (entryIds, notes = "") => {
    try {
      const url = buildApiUrl(API_CONFIG.endpoints.adminTimesheets.bulkApprove);
      return await adminApiCall(url, {
        method: "POST",
        body: JSON.stringify({
          entryIds: entryIds,
          notes: notes,
        }),
      });
    } catch (error) {
      console.error("Error bulk approving timesheets:", error);
      throw error;
    }
  },

  // Bulk reject timesheets
  bulkRejectTimesheets: async (entryIds, reason) => {
    if (!reason || reason.trim() === "") {
      throw new Error("Rejection reason is required");
    }
    try {
      const url = buildApiUrl(API_CONFIG.endpoints.adminTimesheets.bulkReject);
      return await adminApiCall(url, {
        method: "POST",
        body: JSON.stringify({
          entryIds: entryIds,
          reason: reason,
        }),
      });
    } catch (error) {
      console.error("Error bulk rejecting timesheets:", error);
      throw error;
    }
  },


  // Export timesheets with format option
exportTimesheets: async (filters = {}, format = 'csv') => {
  try {
    const queryParams = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        queryParams.append(key, filters[key]);
      }
    });

    // Add format parameter
    queryParams.append('format', format);

    const url = buildApiUrl(
      `${API_CONFIG.endpoints.adminTimesheets.export}?${queryParams.toString()}`
    );
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }
    
    if (format === 'csv') {
      // Handle CSV response
      const csvText = await response.text();
      
      // Validate that we actually got CSV content
      if (!csvText || csvText.trim() === '') {
        throw new Error('No data available for export');
      }
      
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      let filename = `timesheets-export-${new Date().toISOString().split('T')[0]}`;
      if (filters.coachId) {
        filename += `-coach-${filters.coachId}`;
      }
      if (filters.startDate) {
        filename += `-from-${filters.startDate}`;
      }
      if (filters.endDate) {
        filename += `-to-${filters.endDate}`;
      }
      filename += '.csv';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      return { success: true, message: 'CSV export completed successfully' };
    } else {
      // Handle JSON response
      const jsonData = await response.json();
      return { success: true, data: jsonData };
    }
  } catch (error) {
    console.error("Error exporting timesheets:", error);
    throw new Error(`Failed to export timesheets: ${error.message}`);
  }
}
};