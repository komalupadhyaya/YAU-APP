const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCoach() {
  const snapshot = await db.collection('users').where('role', '==', 'coach').limit(3).get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data().firstName, doc.data().hourlyRate);
  });
}

checkCoach();
