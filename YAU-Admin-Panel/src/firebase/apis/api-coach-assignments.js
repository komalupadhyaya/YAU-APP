import { API_CONFIG, buildApiUrl } from '../config';
import { apiCall } from '../firestore';

/**
 * Creates a new coach assignment via API
 */
export const createCoachAssignment = async (assignmentData) => {
  try {
    const result = await apiCall(buildApiUrl(API_CONFIG.endpoints.coachAssignments.create), {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
    return { id: result.id || result.data?.id, ...assignmentData };
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

/**
 * Fetches all assignments via API
 */
export const getCoachAssignments = async (coachId = null) => {
  try {
    const url = coachId 
      ? buildApiUrl(API_CONFIG.endpoints.coachAssignments.getAll) + `?coachId=${coachId}`
      : buildApiUrl(API_CONFIG.endpoints.coachAssignments.getAll);
      
    const result = await apiCall(url);
    return result.data || result;
  } catch (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
};

/**
 * Updates an existing assignment via API
 */
export const updateCoachAssignment = async (assignmentId, updateData) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.coachAssignments.update, { id: assignmentId }), {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
};

/**
 * Deletes an assignment via API
 */
export const deleteCoachAssignment = async (assignmentId) => {
  try {
    return await apiCall(buildApiUrl(API_CONFIG.endpoints.coachAssignments.delete, { id: assignmentId }), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
};
