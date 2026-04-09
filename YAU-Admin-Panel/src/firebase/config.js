import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your Firebase config (get this from Firebase Console > Project Settings > General > Your apps)
const firebaseConfig = {
  apiKey: "AIzaSyCADG-9nm-61nmsHbe-hNlg82g0ccKpjkw",
  authDomain: "yau-app.firebaseapp.com",
  projectId: "yau-app",
  storageBucket: "yau-app.firebasestorage.app",
  messagingSenderId: "696491882997",
  appId: "1:696491882997:web:c191283f1415b8e913c8bc",
  measurementId: "G-9S8WBX0J2Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// API Configuration
export const API_CONFIG = {
  // FIXED: Remove the extra /api from baseURL since we add it in endpoints
  baseURL: process.env.NODE_ENV === "development"
    ? 'http://127.0.0.1:5001/yau-app/us-central1/apis'
    : 'https://yau-app.onrender.com',

  endpoints: {

    // Stripe endpoints
    stripe: {
      createPaymentIntent: '/stripe/create-payment-intent',
      createCustomer: '/stripe/create-customer',
      createSubscription: '/stripe/create-subscription',
      cancelSubscription: '/stripe/cancel-subscription',
      createCheckoutSession: '/stripe/create-checkout-session',
      verifyPayment: '/stripe/verify-payment',
      getPlans: '/stripe/plans',
      getPaymentMethods: '/stripe/payment-methods'
    },

    // Payment endpoints
    payments: {
      createRecord: '/payments/create-payment-record',
      updateStatus: '/payments/update-status',
      getUserHistory: '/payments/history/user',
      getEmailHistory: '/payments/history/email',
      getStats: '/payments/stats',
      recordRefund: '/payments/refund',
      completePayment: '/payments/complete-payment',
      webhook: '/payments/webhook'
    },

    // Membership endpoints
    membership: {
      test: '/membership/test',
      findUser: '/membership/find-user',
      upgrade: '/membership/upgrade',
      getStatus: '/membership/status',
      cancel: '/membership/cancel',
      moveToMembers: '/membership/move-to-members'
    },
    organization: {
      base: '/organization',
      create: '/organization',
      getAll: '/organization',
      getById: '/organization/:id',
      update: '/organization/:id',
      delete: '/organization/:id',
      addSport: '/organization/:id/sports',
      updateSport: '/organization/:id/sports/:sportName',
      removeSport: '/organization/:id/sports/:sportName',
      addDivision: '/organization/:id/sports/:sportName/divisions',
      removeDivision: '/organization/:id/sports/:sportName/divisions/:division',
      // Age groups endpoints
      getAllAgeGroups: '/organization/age-groups/all',
      getAgeGroupByAge: '/organization/age-groups/:age',
      createAgeGroup: '/organization/age-groups',
      updateAgeGroup: '/organization/age-groups/:age',
      deleteAgeGroup: '/organization/age-groups/:age',
      // Bulk operations
      deleteAllOrganizations: '/organization/bulk/all-organization',
      deleteAllAgeGroups: '/organization/bulk/all-age-groups',
      deleteAllData: '/organization/bulk/all-data',
      externalSchedule: '/external_schedules',
      // deleteAllMatches: '/bulk/all-matches',
      deleteMultipleMatches: '/external_schedules/bulk/matches'
    },

    // Parent endpoints
    parents: {
      getAll: '/parents',
      getById: '/parents/:id',
      create: '/parents',
      update: '/parents/:id',
      delete: '/parents/:id',
      getBySport: '/parents/sport/:sport',
      getByLocation: '/parents/location/:location',
      getByAgeGroup: '/parents/age-group/:ageGroup',
      getStats: '/parents/stats',
      bulkUpdate: '/parents/bulk-update',
      search: '/parents/search',
      export: '/parents/export',
      sendBulkEmail: '/parents/send-bulk-email',
      sendBulkSMS: '/parents/send-bulk-sms'
    },

    // Coach endpoints
    coaches: {
      getAll: '/coaches',
      getById: '/coaches/:id',
      create: '/coaches',
      update: '/coaches/:id',
      delete: '/coaches/:id',
      getBySport: '/coaches/sport/:sport',
      getByLocation: '/coaches/location/:location',
      getStats: '/coaches/stats',
      getAssignments: '/coaches/:id/assignments',
      assignTeam: '/coaches/:id/assign-team',
      removeTeam: '/coaches/:id/remove-team',
      bulkUpdate: '/coaches/bulk-update',
      bulkDelete: '/coaches/bulk',
      search: '/coaches/search'
    },

    // Member endpoints
    members: {
      getAll: '/members',
      getById: '/members/:id',
      create: '/members',
      update: '/members/:id',
      delete: '/members/:id',
      getByType: '/members/type/:type',
      getStats: '/members/stats',
      search: '/members/search',
      bulkUpdate: '/members/bulk-update'
    },

    // Location endpoints
    locations: {
      getAll: '/locations',
      getById: '/locations/:id',
      create: '/locations',
      update: '/locations/:id',
      delete: '/locations/:id',
      getStats: '/locations/stats'
    },

    // Roster endpoints
    rosters: {
      getAll: '/rosters',
      getById: '/rosters/:id',
      create: '/rosters',
      // Manual roster creation flow
      getOptions: '/rosters/options',
      getOptionStudents: '/rosters/options/students',
      update: '/rosters/:id',
      delete: '/rosters/:id',
      addPlayer: '/rosters/:rosterId/players',
      removePlayer: '/rosters/:rosterId/players/:playerId',
      assignCoach: '/rosters/:rosterId/assign-coach',
      removeCoach: '/rosters/:rosterId/coach',
      getByLocation: '/rosters/location/:location',
      getBySport: '/rosters/sport/:sport',
      getByAgeGroup: '/rosters/age-group/:ageGroup',
      generateInitial: '/rosters/generate-initial',
      syncAll: '/rosters/sync-all',
      bulkUpdate: '/rosters/bulk-update',
      bulkDelete: '/rosters/bulk-delete',
      getStats: '/rosters/stats/overview',
      cleanupEmpty: '/rosters/cleanup/empty',
      getCreationStats: '/rosters/stats/creation'
    },

    // Community endpoints
    community: {
      // Posts
      getPosts: '/community/posts',
      getPostById: '/community/posts/:id',
      createPost: '/community/posts',
      updatePost: '/community/posts/:id',
      deletePost: '/community/posts/:id',

      // Likes
      toggleLike: '/community/posts/:postId/like',
      getPostLikes: '/community/posts/:postId/likes',

      // Comments
      addComment: '/community/posts/:postId/comments',
      getPostComments: '/community/posts/:postId/comments',
      deleteComment: '/community/comments/:commentId',

      // Reports
      reportPost: '/community/posts/:postId/report',
      getReportedPosts: '/community/reported-posts',

      // Analytics & Stats
      getStats: '/community/stats',
      getAnalytics: '/community/analytics',

      // Bulk operations
      bulkUpdatePosts: '/community/posts/bulk-update'
    },

    // Message endpoints
    messages: {
      getAll: '/messages',
      getById: '/messages/:id',
      create: '/messages',
      update: '/messages/:id',
      delete: '/messages/:id',
      getForGroup: '/messages/group/targeted'
    },

    // Event endpoints
    events: {
      getAll: '/events',
      getById: '/events/:id',
      create: '/events',
      update: '/events/:id',
      delete: '/events/:id',
      deleteExpired: '/events/cleanup/expired'
    },

    // Game Schedule endpoints
    gameSchedules: {
      getAll: '/game-schedules',
      getById: '/game-schedules/:id',
      create: '/game-schedules',
      update: '/game-schedules/:id',
      delete: '/game-schedules/:id',
      bulkDelete: '/game-schedules/bulk-delete',
      sendNotification: '/game-schedules/notifications/send',
      getRecipients: '/game-schedules/notifications/recipients'
    },

    // File Upload endpoints
    upload: {
      image: '/upload/image',
      document: '/upload/document',
      avatar: '/upload/avatar',
      communityMedia: '/upload/community-media',
      eventImage: '/upload/event-image'
    },

    // Email endpoints
    email: {
      send: '/email/send',
      sendBulk: '/email/send-bulk',
      sendTemplate: '/email/send-template',
      getTemplates: '/email/templates',
      createTemplate: '/email/templates',
      updateTemplate: '/email/templates/:id',
      deleteTemplate: '/email/templates/:id'
    },

    // SMS endpoints
    sms: {
      send: '/sms/send',
      sendBulk: '/sms/send-bulk',
      getHistory: '/sms/history',
      getStats: '/sms/stats'
    },

    // Notification endpoints
    notifications: {
      getAll: '/notifications',
      getById: '/notifications/:id',
      create: '/notifications',
      update: '/notifications/:id',
      delete: '/notifications/:id',
      markAsRead: '/notifications/:id/read',
      markAllAsRead: '/notifications/read-all',
      getUserNotifications: '/notifications/user/:userId',
      sendPushNotification: '/notifications/push/send',
      registerDevice: '/notifications/device/register',
      unregisterDevice: '/notifications/device/unregister'
    },

    // Analytics endpoints
    analytics: {
      dashboard: '/analytics/dashboard',
      users: '/analytics/users',
      engagement: '/analytics/engagement',
      revenue: '/analytics/revenue',
      sports: '/analytics/sports',
      locations: '/analytics/locations',
      ageGroups: '/analytics/age-groups',
      export: '/analytics/export'
    },

    admin: {
      getAll: '/admins',
      getById: '/admins/:id',
      create: '/admins',
      update: '/admins/:id',
      updatePassword: '/admins/:id/password',
      delete: '/admins/:id',
      deactivate: '/admins/:id/deactivate',
      login: '/admins/login',
      getStats: '/admins/stats',

      // User management (existing)
      getUsers: '/admin/users',
      createUser: '/admin/users',
      updateUser: '/admin/users/:id',
      deleteUser: '/admin/users/:id',
      getUserStats: '/admin/users/stats',
      getSystemStats: '/admin/system/stats',
      getLogs: '/admin/logs',
      getAuditTrail: '/admin/audit',
      backupData: '/admin/backup',
      restoreData: '/admin/restore',
      sendSystemNotification: '/admin/notifications/system'
    },
    // Settings endpoints
    settings: {
      getAll: '/settings',
      getById: '/settings/:key',
      update: '/settings/:key',
      reset: '/settings/reset',
      backup: '/settings/backup',
      restore: '/settings/restore'
    },

    // Report endpoints
    reports: {
      generate: '/reports/generate',
      getAll: '/reports',
      getById: '/reports/:id',
      delete: '/reports/:id',
      schedule: '/reports/schedule',
      getScheduled: '/reports/scheduled',
      export: '/reports/:id/export'
    },

    // Utility endpoints
    utils: {
      health: '/utils/health',
      version: '/utils/version',
      test: '/utils/test',
      validateEmail: '/utils/validate/email',
      validatePhone: '/utils/validate/phone',
      geocode: '/utils/geocode',
      generateQR: '/utils/qr-code',
      shortUrl: '/utils/short-url'
    },
    resources: {
      getAll: '/resources',
      getById: '/resources/:id',
      create: '/resources',
      update: '/resources/:id',
      delete: '/resources/:id',
      batchDelete: '/resources/batch-delete',
    },

    // Uniform Management endpoints
    uniforms: {
      getAll: '/uniforms',
      summary: '/uniforms/summary',
      search: '/uniforms/search',
      updateReceived: '/uniforms/:orderId/received',
      exportCsv: '/uniforms/export/csv',
      getByParent: '/uniforms/parent/:parentId',
      getByStudent: '/uniforms/student/:studentId',
      batchDelete: '/uniforms/batch-delete'
    },
    // timesheets endpoints
    timesheets: {
      get: '/timesheets',
      create: '/timesheets',
      update: '/timesheets/{id}',
      delete: '/timesheets/{id}'
    },
    // Timesheet management endpoints
    adminTimesheets: {
      getAll: '/adminTimesheetRoutes/timesheets',
      getByCoach: '/adminTimesheetRoutes/timesheets/coach/:coachId',
      stats: '/adminTimesheetRoutes/timesheets/stats',
      approve: '/adminTimesheetRoutes/timesheets/:id/approve',
      reject: '/adminTimesheetRoutes/timesheets/:id/reject',
      bulkApprove: '/adminTimesheetRoutes/timesheets/bulk-approve',
      bulkReject: '/adminTimesheetRoutes/timesheets/bulk-reject',
      export: '/adminTimesheetRoutes/timesheets/export'
    },

    // Pickup System endpoints
    pickup: {
      // Rosters
      rosters: {
        getAll: '/pickup/rosters',
        getById: '/pickup/rosters/:id',
        create: '/pickup/rosters',
        update: '/pickup/rosters/:id',
        delete: '/pickup/rosters/:id',
        bulkDelete: '/pickup/rosters/bulk-delete'
      },
      // Schools + Students (Admin workflow)
      schools: {
        getAll: '/pickup/schools',
        getById: '/pickup/schools/:schoolId',
        create: '/pickup/schools',
        update: '/pickup/schools/:schoolId',
        delete: '/pickup/schools/:schoolId',
        bulkImport: '/pickup/schools/bulk-import',
        bulkDelete: '/pickup/schools/bulk-delete',
        // NEW – admin-friendly view: students + signed-out status for a date + filters
        pickupStatus: '/pickup/schools/:schoolId/pickup-status'
      },
      // Enrollments (read-only admin)
      enrollments: {
        // Newest first
        getAll: '/pickup/enrollments',
        // Full payload / answers
        getById: '/pickup/enrollments/:enrollmentId'
      },
      schoolStudents: {
        getBySchool: '/pickup/schools/:schoolId/students',
        createForSchool: '/pickup/schools/:schoolId/students',
        bulkDeleteBySchool: '/pickup/schools/:schoolId/students/bulk-delete',
        update: '/pickup/school-students/:studentId',
        delete: '/pickup/school-students/:studentId',
        bulkImport: '/pickup/school-students/bulk-import'
      },
      // Students
      students: {
        add: '/pickup/rosters/:rosterId/students',
        getByRoster: '/pickup/rosters/:rosterId/students',
        update: '/pickup/students/:studentId',
        delete: '/pickup/students/:studentId',
        bulkAdd: '/pickup/rosters/:rosterId/students/bulk',
        // NEW – smart bulk processor
        bulkImport: '/pickup/students/bulk-import',
        // Alias
        uploadNew: '/pickup/uploadNew'
      },
      // Sign-outs
      signouts: {
        create: '/pickup/signouts',
        getByRoster: '/pickup/rosters/:rosterId/signouts',
        getAll: '/pickup/signouts'
      },
      // NEW – school pickup signouts (coach/staff flow)
      schoolSignouts: {
        getBySchool: '/pickup/schools/:schoolId/signouts',
        createForSchool: '/pickup/schools/:schoolId/signouts'
      },
      // Users
      users: {
        getAll: '/pickup/users',
        getById: '/pickup/users/:id',
        create: '/pickup/users',
        update: '/pickup/users/:id',
        delete: '/pickup/users/:id',
        resetPassword: '/pickup/users/:id/reset-password',
        authenticate: '/pickup/users/authenticate'
      }
    }

  }
};

// Helper function to build complete URL
export const buildApiUrl = (endpoint, params = {}) => {
  let url = `${API_CONFIG.baseURL}${endpoint}`;

  // Replace URL parameters
  Object.keys(params).forEach(key => {
    // Encode to keep URLs valid (spaces, slashes, etc.)
    const raw = params[key];
    const encoded = encodeURIComponent(raw == null ? '' : String(raw));
    url = url.replace(`:${key}`, encoded);
  });

  return url;
};

// Helper function to get endpoint by path
export const getEndpoint = (path) => {
  const pathParts = path.split('.');
  let endpoint = API_CONFIG.endpoints;

  for (const part of pathParts) {
    if (endpoint[part]) {
      endpoint = endpoint[part];
    } else {
      throw new Error(`Endpoint not found: ${path}`);
    }
  }

  return endpoint;
};

// Usage examples:
// buildApiUrl(API_CONFIG.endpoints.parents.getById, { id: '123' })
// getEndpoint('community.getPosts')
// buildApiUrl(getEndpoint('rosters.addPlayer'), { rosterId: 'roster123' })
export default app;