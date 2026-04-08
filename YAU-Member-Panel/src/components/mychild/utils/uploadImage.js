
// src\firebase\config.js
import { storage } from "../../../firebase/config.js"; // your firebase.js
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

async function uploadChildImage(file, childId) {
  try {
    const storageRef = ref(storage, `children/${childId}/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    console.log("✅ Uploaded file:", downloadURL);
    // ✅ Uploaded file: https://firebasestorage.googleapis.com/v0/b/yau-app.firebasestorage.app/o/children%2Fchild-123%2FprofilePic.jpg?alt=media&token=4e16d6cc-1cc3-46b4-971a-91c6b88bc91b
    return downloadURL;
  } catch (error) {
    console.error("❌ Upload failed:", error);
    throw error;
  }
}
export { uploadChildImage };