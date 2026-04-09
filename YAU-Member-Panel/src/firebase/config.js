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
  // baseURL: process.env.NODE_ENV==="development" 
  //   // ? 'http://127.0.0.1:5001/yau-app/us-central1/api'  // This is for test
  //   ? 'https://us-central1-yau-app.cloudfunctions.net/api'
  //   : 'https://us-central1-yau-app.cloudfunctions.net/api',
  baseURL: process.env.NODE_ENV === "development"
    ?'http://127.0.0.1:5001/yau-app/us-central1/apis' //// local
    // ? 'https://yau-app.onrender.com' //// live 
    : 'https://yau-app.onrender.com',

  endpoints: {

    externalSchedules: {
      createMatch: '/external_schedules/:org/:sport/:ageGroup',
      getMatches: '/external_schedules/:org/:sport/:ageGroup',
      getMatchById: '/external_schedules/:org/:sport/:ageGroup/:matchId',
      updateMatch: '/external_schedules/:org/:sport/:ageGroup/:matchId',
      deleteMatch: '/external_schedules/:org/:sport/:ageGroup/:matchId'
    },
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
    // Message endpoints
    messages: {
      getAll: '/messages',
      getById: '/messages/:id',
      create: '/messages',
      update: '/messages/:id',
      delete: '/messages/:id',
      getForGroup: '/messages/group/targeted',
      
    },

    // Admin notifications (admin_posts collection)
    adminNotifications: {
      getAll: '/messages',
      getById: '/messages/:id',
      markAsRead: '/messages/:id',
      getForGroup: '/messages/group/targeted'
    },

    // Team messages (groupChats collection)
    teamMessages: {
      getByRoster: '/team-messages/:rosterId',
      create: '/team-messages',
      getAll: '/team-messages'
    },
    
    // Roster-based team chats
    rosterTeamChats: {
      getMemberChats: '/chats/member-team-chats',
      getCoachChats: '/chats/coach-team-chats',
      getMessages: '/chats/team-chat/:teamChatId/messages',
      sendMessage: '/chats/team-chat/:teamChatId/send-message',
      checkAccess: '/chats/team-chat/:teamChatId/check-access'
    },

    // Group chats (new backend-only service)
    groupChats: {
      createOrEnsure: '/group-chats/create-or-ensure',
      getUserChats: '/group-chats/user-chats-',
      getMessages: '/group-chats/:chatId/messages',
      sendMessage: '/group-chats/:chatId/send-message',
      fromRoster: '/group-chats/from-roster',
      syncRosters: '/group-chats/sync-rosters',
      validateAccess: '/group-chats/:chatId/validate-access',
      ensureStructure: '/group-chats/admin/ensure-message-structure',
      getUserMessages: '/group-chats/user-chats-with-messages',

    },

    // Pickup endpoints
    pickup: {
      // School-based pickup (active)
      listSchools: '/pickup/schools',
      getSchoolStudents: '/pickup/schools/:schoolId/students',

      // Signouts (coach pickup)
      listSchoolSignouts: '/pickup/schools/:schoolId/signouts',
      createSchoolSignout: '/pickup/schools/:schoolId/signouts',

      // Admin UI helper: students + signout status for selected date
      getPickupStatusBySchool: '/pickup/schools/:schoolId/pickup-status',

      // Reporting (admin)
      listSignouts: '/pickup/signouts'
    },


    // Parent messages
    parentMessages: {
      getByRoster: '/parent-messages/:rosterId',
      create: '/parent-messages',
      getAll: '/parent-messages'
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
      // Manual roster creation: options to populate form
      getManualCreateOptions: '/rosters/options',
      getOptionStudents: '/rosters/options/students',
      getOptionLocations: '/rosters/options/locations',
      getOptionSports: '/rosters/options/sports',
      getOptionGrades: '/rosters/options/grades',
      getById: '/rosters/:id',
      create: '/rosters',
      update: '/rosters/:id',
      delete: '/rosters/:id',
      addPlayer: '/rosters/:rosterId/players',
      removePlayer: '/rosters/:rosterId/players/:playerId',
      assignCoach: '/rosters/:rosterId/assign-coach',
      removeCoach: '/rosters/:rosterId/coach',
      getByLocation: '/rosters/location/:location',
      getBySport: '/rosters/sport/:sport',
      getByGrade: '/rosters/grade/:grade',
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
    resources: {
      getAll: '/resources',
      getById: '/resources/:id',
      create: '/resources',
      update: '/resources/:id',
      delete: '/resources/:id',
      batchDelete: '/resources/batch-delete',
    },

    referrals: {
      create: '/referrals/create',
      getByCode: '/referrals/:referralCode',
      trackOpened: '/referrals/track-opened',
      trackJoined: '/referrals/track-joined',
      getUserReferrals: '/referrals/user/:userId',
      getUserStats: '/referrals/user/:userId/stats',
      checkRateLimit: '/referrals/check-rate-limit',
      getGlobalStats: '/referrals/admin/stats/global',
      deleteReferral: '/referrals/admin/:referralCode'
    },

    // SMS endpoints
    sms: {
      send: '/sms/send',
      bulk: '/sms/bulk'
    },

    // CSRF endpoint
    csrf: {
      token: '/csrf-token'
    },

  }
};

export default app;