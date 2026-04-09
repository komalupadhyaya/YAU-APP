// coach-panel/src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase config (same as admin panel)
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
  baseURL: process.env.NODE_ENV === "development" 
    ? 'http://127.0.0.1:5001/yau-app/us-central1/apis'
    : 'https://yau-app.onrender.com',
    
  endpoints: {
    // Coach endpoints
    coaches: {
      getAll: '/coaches',
      getById: '/coaches/:id',
      create: '/coaches',
      update: '/coaches/:id',
      delete: '/coaches/:id',
      getAssignments: '/coaches/:id/assignments'
    },

    // Roster endpoints
    rosters: {
      getAll: '/rosters',
      getById: '/rosters/:id',
      create: '/rosters',
      update: '/rosters/:id',
      delete: '/rosters/:id'
    },

    // Event endpoints
    events: {
      getAll: '/events',
      getById: '/events/:id',
      create: '/events',
      update: '/events/:id',
      delete: '/events/:id'
    },

    // Game Schedule endpoints
    gameSchedules: {
      getAll: '/game-schedules',
      getById: '/game-schedules/:id',
      create: '/game-schedules',
      update: '/game-schedules/:id',
      delete: '/game-schedules/:id'
    },

    // Message endpoints
    messages: {
      getAll: '/messages',
      create: '/messages',
      update: '/messages/:id',
      delete: '/messages/:id'
    },
    // timesheets endpoints
    timesheets: { 
      get: '/timesheets/coach/:coachId',        
      create: '/timesheets/:coachId',       
      update: '/timesheets/:coachId/entry/:id',  
      delete: '/timesheets/:coachId/entry/:id',
      submit: '/timesheets/:coachId/entry/:id/submit',
      stats: '/timesheets/coach/:coachId/stats'
    },
    // location endpoints
    locations: { 
      get: '/locations',         
    },
    // Parent endpoints
    parents: {
      getAll: '/parents',
      sendBulkEmail: '/parents/send-bulk-email',
      sendBulkSMS: '/parents/send-bulk-sms'
    }
  }
};

// Helper function to build complete URL
export const buildApiUrl = (endpoint, params = {}) => {
  let url = `${API_CONFIG.baseURL}${endpoint}`;
  
  // Replace URL parameters
  Object.keys(params).forEach(key => {
    url = url.replace(`:${key}`, params[key]);
  });
  
  return url;
};

export default app;