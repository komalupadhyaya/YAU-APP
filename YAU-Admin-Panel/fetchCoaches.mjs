import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCADG-9nm-61nmsHbe-hNlg82g0ccKpjkw",
  authDomain: "yau-app.firebaseapp.com",
  projectId: "yau-app",
  storageBucket: "yau-app.firebasestorage.app",
  messagingSenderId: "696491882997",
  appId: "1:696491882997:web:c191283f1415b8e913c8bc",
  measurementId: "G-9S8WBX0J2Q"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const fetchCoachEmails = async () => {
    try {
        console.log("🔍 Fetching all users with role 'coach' from live Database...");
        const coachQuery = query(collection(db, "users"), where("role", "==", "coach"));
        const snapshot = await getDocs(coachQuery);
        
        if (snapshot.empty) {
            console.log("No registered users with role 'coach' found in the users collection.");
        } else {
            console.log(`\nFound ${snapshot.size} coach accounts:`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`- Name: ${data.firstName || ''} ${data.lastName || ''} | Email: ${data.email} | Active: ${data.isActive}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

fetchCoachEmails();
