/**
 * Fallback data for pickup system when APIs are unavailable
 * Provides dummy data to prevent UI errors
 */

export const pickupFallbackData = {
  users: [
    {
      id: 'fallback-001',
      username: 'coach_admin',
      role: 'coach',
      isShared: false,
      notes: 'Main admin coach account',
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'fallback-002',
      username: 'pickup_coach1',
      role: 'coach',
      isShared: true,
      notes: 'Shared coach account for pickup system',
      isActive: true,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'fallback-003',
      username: 'parent_user1',
      role: 'parent',
      isShared: false,
      notes: 'Parent pickup account',
      isActive: true,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastLoginAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'fallback-004',
      username: 'coach_secondary',
      role: 'coach',
      isShared: false,
      notes: 'Secondary coach account',
      isActive: false,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastLoginAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'fallback-005',
      username: 'shared_pickup',
      role: 'coach',
      isShared: true,
      notes: 'Shared login for multiple coaches',
      isActive: true,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      lastLoginAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    }
  ],

  rosters: [
    {
      id: 'fallback-roster-001',
      school: 'Springfield Elementary',
      program: 'After School Sports',
      grade: '3rd',
      groupName: 'Group A',
      days: ['Monday', 'Wednesday', 'Friday'],
      sessionStartDate: '2024-01-15',
      sessionEndDate: '2024-05-15',
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    }
  ],

  students: [
    {
      id: 'fallback-student-001',
      rosterId: 'fallback-roster-001',
      childName: 'John Smith',
      parentName: 'Sarah Smith',
      school: 'Springfield Elementary',
      grade: '3rd',
      program: 'After School Sports',
      isActive: true,
      addedAt: new Date().toISOString(),
      addedBy: 'system',
      removedAt: null,
      removedBy: null
    },
    {
      id: 'fallback-student-002',
      rosterId: 'fallback-roster-001',
      childName: 'Emma Johnson',
      parentName: 'Mike Johnson',
      school: 'Springfield Elementary',
      grade: '3rd',
      program: 'After School Sports',
      isActive: true,
      addedAt: new Date().toISOString(),
      addedBy: 'system',
      removedAt: null,
      removedBy: null
    }
  ],

  signOuts: [
    {
      id: 'fallback-signout-001',
      studentId: 'fallback-student-001',
      rosterId: 'fallback-roster-001',
      date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      signOutTime: new Date().toISOString(),
      parentGuardianName: 'Sarah Smith',
      notes: 'Picked up by mother',
      signedOutBy: 'fallback_user',
      createdAt: new Date().toISOString()
    }
  ]
};

/**
 * Function to safely get fallback data with default values
 */
export const getSafeFallbackData = (type) => {
  try {
    const data = pickupFallbackData[type];
    return data ? [...data] : []; // Return copy of array to prevent mutations
  } catch (error) {
    console.warn('Error accessing fallback data:', error);
    return [];
  }
};

/**
 * Filter fallback users based on filters
 */
export const getFilteredFallbackUsers = (filters = {}) => {
  try {
    let users = [...pickupFallbackData.users];
    
    if (filters.role) {
      users = users.filter(u => u.role === filters.role);
    }
    
    if (filters.isActive !== undefined) {
      users = users.filter(u => u.isActive === filters.isActive);
    }
    
    return users;
  } catch (error) {
    console.warn('Error filtering fallback users:', error);
    return [];
  }
};

export const mockApiResponse = (data, success = true) => ({
  success,
  data: Array.isArray(data) ? data : [data],
  count: Array.isArray(data) ? data.length : 1,
  message: 'Fallback data loaded (API unavailable)',
  timestamp: new Date().toISOString()
});

export default pickupFallbackData;