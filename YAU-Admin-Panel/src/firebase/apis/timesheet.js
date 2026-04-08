import { API_CONFIG, buildApiUrl } from "../config";

// Helper function for API calls
const coachApiCall = async (url, options = {}) => {
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
    console.error("Coach API call failed:", error);
    throw error;
  }
};

// ----------------- TIMESHEET -----------------

// Fetch all timesheet entries for a coach
export const getTimesheetEntries = async (coachId) => {
  try {
    const url = buildApiUrl(
      `${API_CONFIG.endpoints.timesheets.get}?coachId=${coachId}`
    );
    return await coachApiCall(url);
  } catch (error) {
    console.error("Error fetching timesheet entries:", error);
    throw error;
  }
};

// Create a new timesheet entry
export const createTimesheetEntry = async (entryData) => {
  try {
    const url = buildApiUrl(API_CONFIG.endpoints.timesheets.create);
    return await coachApiCall(url, {
      method: "POST",
      body: JSON.stringify(entryData),
    });
  } catch (error) {
    console.error("Error creating timesheet entry:", error);
    throw error;
  }
};

// Update an existing timesheet entry
export const updateTimesheetEntry = async (entryId, updatedData) => {
  try {
    const url = buildApiUrl(
      API_CONFIG.endpoints.timesheets.update.replace("{id}", entryId)
    );
    return await coachApiCall(url, {
      method: "PUT",
      body: JSON.stringify(updatedData),
    });
  } catch (error) {
    console.error("Error updating timesheet entry:", error);
    throw error;
  }
};

// Delete a timesheet entry
export const deleteTimesheetEntry = async (entryId) => {
  try {
    const url = buildApiUrl(
      API_CONFIG.endpoints.timesheets.delete.replace("{id}", entryId)
    );
    return await coachApiCall(url, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Error deleting timesheet entry:", error);
    throw error;
  }
};

// ----------------- Location -----------------

// Fetch all timesheet entries for a coach
export const getAllLocations = async () => {
  try {
    const url = buildApiUrl(`${API_CONFIG.endpoints.locations.getAll}`);
    return await coachApiCall(url);
  } catch (error) {
    console.error("Error fetching timesheet entries:", error);
    throw error;
  }
};
