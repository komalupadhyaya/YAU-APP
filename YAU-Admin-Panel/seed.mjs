import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, limit, query } from 'firebase/firestore';

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

const seedData = async () => {
    try {
        console.log("Fetching coaches...");
        const coachesSnapshot = await getDocs(query(collection(db, "coaches"), limit(1)));
        
        let coachId = "demo_coach";
        let coachName = "Chris Johnson";
        
        if (!coachesSnapshot.empty) {
            const coachDoc = coachesSnapshot.docs[0];
            coachId = coachDoc.id;
            coachName = `${coachDoc.data().firstName || 'Chris'} ${coachDoc.data().lastName || 'Johnson'}`;
            console.log(`Using real coach: ${coachName} (${coachId})`);
        } else {
            console.log("No real coaches found, using fallback demo coach");
        }

        const assignments = [
            {
                coachId,
                coachName,
                site: 'Brandywine ES',
                address: '14100 Brandywine Pike Rd, Brandywine, MD 20613',
                report: 'Tuesday, April 30',
                hours: '3:00 PM – 6:00 PM',
                role: 'Head Coach',
                status: 'Confirmed',
                note: 'Focus on defensive drills today.',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            },
            {
                coachId,
                coachName,
                site: 'John Hanson MS',
                address: '6800 Owen Hill Rd, Oxon Hill, MD 20745',
                report: 'Wednesday, May 1',
                hours: '2:30 PM – 5:30 PM',
                role: '',
                status: 'Pending',
                note: 'Grades 6-8 session',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            },
            {
                coachId,
                coachName,
                site: 'Benjamin Stoddert ES',
                address: '500 Marlboro Pike Upper Marlboro, MD 20772',
                report: 'Thursday, May 2',
                hours: '4:15 PM – 7:15 PM',
                role: 'Assistant Coach',
                status: 'Confirmed',
                note: 'Conditioning exercises after warm-up.',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }
        ];

        console.log("Inserting demo assignments...");
        
        for (const ast of assignments) {
            await addDoc(collection(db, "coach_assignments"), ast);
        }
        
        console.log("Successfully seeded 3 assignments!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding:", error);
        process.exit(1);
    }
};

seedData();
