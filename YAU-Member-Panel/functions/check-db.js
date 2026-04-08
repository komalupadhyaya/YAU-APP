const admin = require('firebase-admin');
const serviceAccount = require('../src/firebase/serviceAccountKey.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function checkData() {
    try {
        const coaches = await admin.firestore().collection('coaches').limit(1).get();
        console.log('Coaches collection size:', coaches.size);
        if (coaches.size > 0) {
            console.log('Sample Coach ID:', coaches.docs[0].id);
        } else {
            console.log('⚠️ Coaches collection is EMPTY');
        }

        const assignments = await admin.firestore().collection('coach_assignments').limit(1).get();
        console.log('Assignments collection size:', assignments.size);
        if (assignments.size > 0) {
            console.log('Sample Assignment ID:', assignments.docs[0].id);
        } else {
            console.log('⚠️ Assignments collection is EMPTY');
        }
    } catch (err) {
        console.error('Error checking DB:', err.message);
    }
    process.exit(0);
}

checkData();
