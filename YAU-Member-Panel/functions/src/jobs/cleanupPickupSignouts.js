const admin = require("firebase-admin");

/**
 * Deletes pickup signout records older than N days.
 *
 * Collection: pickupSignouts
 * Age check: signedOutAt (Firestore Timestamp)
 *
 * Notes:
 * - Deletes in batches of up to 500 (Firestore batch write limit).
 * - Only records with a valid signedOutAt are eligible for deletion.
 */
async function cleanupPickupSignouts({ days = 60, batchSize = 500 } = {}) {
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error("cleanupPickupSignouts: days must be a positive number");
  }
  const size = Math.min(Math.max(1, batchSize || 500), 500);

  const db = admin.firestore();
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const cutoff = admin.firestore.Timestamp.fromMillis(cutoffMs);

  let totalDeleted = 0;

  // Loop until there are no more docs older than cutoff.
  while (true) {
    const snap = await db
      .collection("pickupSignouts")
      .where("signedOutAt", "<", cutoff)
      .orderBy("signedOutAt", "asc")
      .limit(size)
      .get();

    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    totalDeleted += snap.size;

    // If we deleted fewer than batch size, we’re done.
    if (snap.size < size) break;
  }

  console.log(
    `🧹 pickupSignouts cleanup: deleted ${totalDeleted} docs older than ${days} days (cutoff=${new Date(
      cutoffMs
    ).toISOString()})`
  );

  return { totalDeleted, cutoffMs, days };
}

module.exports = { cleanupPickupSignouts };

