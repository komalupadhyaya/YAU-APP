import { API_CONFIG, buildApiUrl } from '../config';

class PickupAPI {
  // Allow pickup APIs to point at a separate backend without changing other API clients.
  // Expected: same shape as API_CONFIG.baseURL (i.e., includes `/apis`), since endpoints include `/pickup/...`.
  static pickupBaseURL = process.env.REACT_APP_PICKUP_API_BASE_URL || API_CONFIG.baseURL;

  static buildPickupUrl(endpoint, params = {}) {
    let url = `${PickupAPI.pickupBaseURL}${endpoint}`;
    Object.keys(params).forEach((key) => {
      url = url.replace(`:${key}`, params[key]);
    });
    return url;
  }

  static buildHeaders({ adminId, username } = {}) {
    return {
      'Content-Type': 'application/json',
      ...(adminId ? { 'x-admin-id': adminId } : {}),
      ...(username ? { 'x-username': username } : {}),
    };
  }

  /**
   * Shared HTTP helper for pickup endpoints (Members-style): centralizes query params,
   * JSON parsing, and consistent error messages.
   */
  static async pickupApiCall(
    endpoint,
    { method = 'GET', params = {}, query = {}, adminId, username, body } = {}
  ) {
    const urlObj = new URL(PickupAPI.buildPickupUrl(endpoint, params));

    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        urlObj.searchParams.set(key, value.toString());
      }
    });

    const response = await fetch(urlObj.toString(), {
      method,
      headers: PickupAPI.buildHeaders({ adminId, username }),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const text = await response.text().catch(() => '');
    let result = {};
    if (text) {
      try {
        result = JSON.parse(text);
      } catch {
        result = { message: text };
      }
    }

    if (!response.ok) {
      throw new Error(
        result.message || result.error || `HTTP ${response.status}: ${response.statusText || 'Request failed'}`
      );
    }

    return result;
  }

  // ==================== PICKUP ROSTERS ====================
  
  static async getAllRosters(filters = {}) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.rosters.getAll, {
        method: 'GET',
        query: filters,
      });
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching rosters:', error);
      throw error;
    }
  }

  static async getRosterById(rosterId) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.rosters.getById, {
        method: 'GET',
        params: { id: rosterId },
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching roster:', error);
      throw error;
    }
  }

  static async createRoster(rosterData) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.rosters.create, {
        method: 'POST',
        adminId: rosterData?.createdBy,
        body: rosterData,
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error creating roster:', error);
      throw error;
    }
  }

  static async updateRoster(rosterId, updateData) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.rosters.update, {
        method: 'PUT',
        params: { id: rosterId },
        adminId: updateData?.updatedBy,
        body: updateData,
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error updating roster:', error);
      throw error;
    }
  }

  static async deleteRoster(rosterId, adminId) {
    try {
      await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.rosters.delete, {
        method: 'DELETE',
        params: { id: rosterId },
        adminId,
      });
      return true;
    } catch (error) {
      console.error('❌ Error deleting roster:', error);
      throw error;
    }
  }

  static async bulkDeleteRosters(rosterIds = [], deleteStudents = false, adminId) {
    try {
      const normalizedRosterIds = Array.isArray(rosterIds) ? rosterIds.filter(Boolean) : [];
      if (normalizedRosterIds.length === 0) {
        throw new Error('rosterIds is required');
      }

      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.rosters.bulkDelete, {
        method: 'POST',
        adminId,
        body: {
          rosterIds: normalizedRosterIds,
          deleteStudents: !!deleteStudents,
        },
      });

      return result.data ?? true;
    } catch (error) {
      console.error('❌ Error bulk deleting rosters:', error);
      throw error;
    }
  }

  // ==================== SCHOOLS (ADMIN) ====================

  static async getAllSchools(filters = {}) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schools.getAll, {
        method: 'GET',
        query: filters,
      });
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching schools:', error);
      throw error;
    }
  }

  static async createSchool(schoolData, adminId) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schools.create, {
        method: 'POST',
        adminId,
        body: schoolData,
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error creating school:', error);
      throw error;
    }
  }

  static async getSchoolById(schoolId) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schools.getById, {
        method: 'GET',
        params: { schoolId },
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching school:', error);
      throw error;
    }
  }

  static async updateSchool(schoolId, updateData, adminId) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schools.update, {
        method: 'PUT',
        params: { schoolId },
        adminId,
        body: updateData,
      });
      return result.data ?? true;
    } catch (error) {
      console.error('❌ Error updating school:', error);
      throw error;
    }
  }

  static async deleteSchool(schoolId, adminId) {
    try {
      await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schools.delete, {
        method: 'DELETE',
        params: { schoolId },
        adminId,
      });
      return true;
    } catch (error) {
      console.error('❌ Error deleting school:', error);
      throw error;
    }
  }

  static async bulkImportSchools(rows = [], options = {}, adminId) {
    try {
      const normalizedRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
      if (normalizedRows.length === 0) throw new Error('rows is required');
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schools.bulkImport, {
        method: 'POST',
        adminId,
        body: { rows: normalizedRows, ...options },
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error bulk importing schools:', error);
      throw error;
    }
  }

  static async bulkDeleteSchools(schoolIds = [], deleteStudents = false, adminId) {
    try {
      const normalizedIds = Array.isArray(schoolIds) ? schoolIds.filter(Boolean) : [];
      if (normalizedIds.length === 0) throw new Error('schoolIds is required');

      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schools.bulkDelete, {
        method: 'POST',
        adminId,
        body: {
          schoolIds: normalizedIds,
          deleteStudents: !!deleteStudents,
        },
      });

      return result.data ?? true;
    } catch (error) {
      console.error('❌ Error bulk deleting schools:', error);
      throw error;
    }
  }

  // ==================== SCHOOL STUDENTS (ADMIN) ====================

  static async getSchoolStudentsBySchool(schoolId, filters = {}) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schoolStudents.getBySchool, {
        method: 'GET',
        params: { schoolId },
        query: filters,
      });
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching school students:', error);
      throw error;
    }
  }

  static async createSchoolStudent(schoolId, studentData, adminId) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schoolStudents.createForSchool, {
        method: 'POST',
        params: { schoolId },
        adminId,
        body: studentData,
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error creating school student:', error);
      throw error;
    }
  }

  static async updateSchoolStudent(studentId, updateData, adminId) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schoolStudents.update, {
        method: 'PUT',
        params: { studentId },
        adminId,
        body: updateData,
      });
      return result.data ?? true;
    } catch (error) {
      console.error('❌ Error updating school student:', error);
      throw error;
    }
  }

  static async deleteSchoolStudent(studentId, adminId) {
    try {
      await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schoolStudents.delete, {
        method: 'DELETE',
        params: { studentId },
        adminId,
      });
      return true;
    } catch (error) {
      console.error('❌ Error deleting school student:', error);
      throw error;
    }
  }

  static async bulkImportSchoolStudents(rows = [], options = {}, adminId) {
    try {
      const normalizedRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
      if (normalizedRows.length === 0) throw new Error('rows is required');
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schoolStudents.bulkImport, {
        method: 'POST',
        adminId,
        body: { rows: normalizedRows, ...options },
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error bulk importing school students:', error);
      throw error;
    }
  }

  static async bulkDeleteSchoolStudentsForSchool(schoolId, studentIds = [], adminId) {
    try {
      if (!schoolId) throw new Error('schoolId is required');
      const normalizedIds = Array.isArray(studentIds) ? studentIds.filter(Boolean) : [];
      if (normalizedIds.length === 0) throw new Error('studentIds is required');

      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schoolStudents.bulkDeleteBySchool, {
        method: 'POST',
        adminId,
        params: { schoolId },
        body: { studentIds: normalizedIds },
      });

      return result.data ?? true;
    } catch (error) {
      console.error('❌ Error bulk deleting school students:', error);
      throw error;
    }
  }

  // ==================== PICKUP STATUS (ADMIN) ====================

  /**
   * GET /pickup/schools/:schoolId/pickup-status
   * Returns: { schoolId, date, totals, students, signouts }
   */
  static async getPickupStatusBySchool(schoolId, filters = {}) {
    try {
      if (!schoolId) throw new Error('schoolId is required');
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schools.pickupStatus, {
        method: 'GET',
        params: { schoolId },
        query: filters,
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching pickup status:', error);
      throw error;
    }
  }

  // ==================== ENROLLMENTS (ADMIN, READ-ONLY) ====================

  /**
   * GET /pickup/enrollments?limit=50
   * Returns newest first.
   */
  static async getAllEnrollments({ limit = 50 } = {}) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.enrollments.getAll, {
        method: 'GET',
        query: { limit },
      });
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching enrollments:', error);
      throw error;
    }
  }

  /**
   * GET /pickup/enrollments/:enrollmentId
   * Returns full payload (rawPayload, studentsRaw, createdStudents, errors, etc.)
   */
  static async getEnrollmentById(enrollmentId) {
    try {
      if (!enrollmentId) throw new Error('enrollmentId is required');
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.enrollments.getById, {
        method: 'GET',
        params: { enrollmentId },
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching enrollment:', error);
      throw error;
    }
  }

  // ==================== ROSTER STUDENTS ====================

  static async getStudentsByRoster(rosterId, filters = {}) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.students.getByRoster, {
        method: 'GET',
        params: { rosterId },
        query: filters,
      });
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      throw error;
    }
  }

  static async addStudent(studentData) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.students.add, {
        method: 'POST',
        params: { rosterId: studentData?.rosterId },
        adminId: studentData?.addedBy,
        body: studentData,
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error adding student:', error);
      throw error;
    }
  }

  static async updateStudent(studentId, updateData) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.students.update, {
        method: 'PUT',
        params: { studentId },
        adminId: updateData?.updatedBy,
        body: updateData,
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error updating student:', error);
      throw error;
    }
  }

  static async deleteStudent(studentId, deletedBy) {
    try {
      await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.students.delete, {
        method: 'DELETE',
        params: { studentId },
        adminId: deletedBy,
        body: { deletedBy },
      });
      return true;
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      throw error;
    }
  }

  static async bulkAddStudents(rosterId, students, addedBy) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.students.bulkAdd, {
        method: 'POST',
        params: { rosterId },
        adminId: addedBy,
        body: { students, addedBy },
      });
      return result.data || [];
    } catch (error) {
      console.error('❌ Error bulk adding students:', error);
      throw error;
    }
  }

  // ==================== SMART BULK IMPORT ====================
  // POST /pickup/students/bulk-import (alias: /pickup/uploadNew)
  static async bulkImportStudents(rows, options = {}, adminId) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.students.bulkImport, {
        method: 'POST',
        adminId,
        body: { rows, ...options },
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error bulk importing students:', error);
      throw error;
    }
  }

  static async uploadNew(rows, options = {}, adminId) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.students.uploadNew, {
        method: 'POST',
        adminId,
        body: { rows, ...options },
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error uploadNew importing students:', error);
      throw error;
    }
  }

  // ==================== SIGN-OUTS ====================

  static async createSignOut(signOutData) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.signouts.create, {
        method: 'POST',
        username: signOutData?.signedOutBy,
        body: signOutData,
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error creating sign-out:', error);
      throw error;
    }
  }

  static async getSignOutsByRoster(rosterId, date = null) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.signouts.getByRoster, {
        method: 'GET',
        params: { rosterId },
        query: date ? { date } : {},
      });
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching sign-outs:', error);
      throw error;
    }
  }

  static async getAllSignOuts(filters = {}) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.signouts.getAll, {
        method: 'GET',
        query: filters,
      });
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching sign-outs:', error);
      throw error;
    }
  }

  // ==================== SCHOOL SIGN-OUTS (COACH PICKUP) ====================

  /**
   * GET /pickup/schools/:schoolId/signouts?date=YYYY-MM-DD
   */
  static async getSchoolSignOutsBySchool(schoolId, date = null) {
    try {
      if (!schoolId) throw new Error('schoolId is required');
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schoolSignouts.getBySchool, {
        method: 'GET',
        params: { schoolId },
        query: date ? { date } : {},
      });
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching school sign-outs:', error);
      throw error;
    }
  }

  /**
   * POST /pickup/schools/:schoolId/signouts
   * Body: { schoolStudentId, parentGuardianName, notes?, date? }
   * Header: x-username (optional) via signedOutBy
   */
  static async createSchoolSignOutForSchool(schoolId, signOutData = {}) {
    try {
      if (!schoolId) throw new Error('schoolId is required');
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.schoolSignouts.createForSchool, {
        method: 'POST',
        params: { schoolId },
        username: signOutData?.signedOutBy,
        body: {
          schoolStudentId: signOutData?.schoolStudentId,
          parentGuardianName: signOutData?.parentGuardianName,
          ...(signOutData?.notes ? { notes: signOutData.notes } : {}),
          ...(signOutData?.date ? { date: signOutData.date } : {}),
        },
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error creating school sign-out:', error);
      throw error;
    }
  }

  // ==================== PICKUP USERS ====================

  static async getAllPickupUsers(filters = {}) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.users.getAll, {
        method: 'GET',
        query: filters,
      });
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching pickup users:', error);
      throw error;
    }
  }

  static async getPickupUserById(userId) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.users.getById, {
        method: 'GET',
        params: { id: userId },
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching pickup user:', error);
      throw error;
    }
  }

  static async createPickupUser(userData) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.users.create, {
        method: 'POST',
        adminId: userData?.createdBy,
        body: userData,
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error creating pickup user:', error);
      throw error;
    }
  }

  static async updatePickupUser(userId, updateData) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.users.update, {
        method: 'PUT',
        params: { id: userId },
        adminId: updateData?.updatedBy,
        body: updateData,
      });
      return result.data;
    } catch (error) {
      console.error('❌ Error updating pickup user:', error);
      throw error;
    }
  }

  static async deletePickupUser(userId, adminId) {
    try {
      await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.users.delete, {
        method: 'DELETE',
        params: { id: userId },
        adminId,
      });
      return true;
    } catch (error) {
      console.error('❌ Error deleting pickup user:', error);
      throw error;
    }
  }

  static async resetPickupUserPassword(userId, newPassword, updatedBy) {
    try {
      await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.users.resetPassword, {
        method: 'PUT',
        params: { id: userId },
        adminId: updatedBy,
        body: { newPassword, updatedBy },
      });
      return true;
    } catch (error) {
      console.error('❌ Error resetting password:', error);
      throw error;
    }
  }

  static async authenticatePickupUser(username, password) {
    try {
      const result = await PickupAPI.pickupApiCall(API_CONFIG.endpoints.pickup.users.authenticate, {
        method: 'POST',
        body: { username, password },
      });
      return result.data;
    } catch (error) {
      console.error('❌ Authentication error:', error);
      throw error;
    }
  }
}

export default PickupAPI;
