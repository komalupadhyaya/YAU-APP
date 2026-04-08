const { db } = require("../utils/firebase");
const {
collection,
doc,
getDocs,
getDoc,
addDoc,
updateDoc,
deleteDoc,
query,
orderBy,
serverTimestamp,

} = require("firebase/firestore");
const COLLECTIONS = {
PARENTS: "registrations",
COACHES: "users",
LOCATIONS: "locations",
GAME_NOTIFICATIONS: "game_notifications",
};
class LocationService {
static async getLocations() {
try {
const querySnapshot = await getDocs(
query(collection(db, COLLECTIONS.LOCATIONS), orderBy("name", "asc"))
);
return querySnapshot.docs.map((doc) => ({
id: doc.id,
...doc.data(),
}));
} catch (error) {
console.error("Error getting locations:", error);
try {
const querySnapshot = await getDocs(collection(db, COLLECTIONS.LOCATIONS));
return querySnapshot.docs.map((doc) => ({
id: doc.id,
...doc.data(),
}));
} catch (fallbackError) {
console.error("Fallback error getting locations:", fallbackError);
throw fallbackError;
}
}
}
static async getLocationById(id) {
try {
const docRef = doc(db, COLLECTIONS.LOCATIONS, id);
const docSnap = await getDoc(docRef);
if (docSnap.exists()) {
return {
id: docSnap.id,
...docSnap.data(),
};
}
return null;
} catch (error) {
console.error("Error getting location:", error);
throw error;
}
}
static async addLocation(locationData) {
try {
const docRef = await addDoc(collection(db, COLLECTIONS.LOCATIONS), {
...locationData,
createdAt: serverTimestamp(),
});
return docRef.id;
} catch (error) {
console.error("Error adding location:", error);
throw error;
}
}
static async updateLocation(id, updates) {
try {
const docRef = doc(db, COLLECTIONS.LOCATIONS, id);
await updateDoc(docRef, {
...updates,
updatedAt: serverTimestamp(),
});
} catch (error) {
console.error("Error updating location:", error);
throw error;
}
}
static async deleteLocation(id) {
try {
await deleteDoc(doc(db, COLLECTIONS.LOCATIONS, id));
} catch (error) {
console.error("Error deleting location:", error);
throw error;
}
}
}
module.exports = LocationService;