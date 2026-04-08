const admin = require("firebase-admin");

/**
 * Deletes game schedule records older than N days.
 *
 * Collection: schedules
 * Age check: createdAt (Firestore Timestamp)
 *
 * Notes:
 * - Deletes in batches of up to 500 (Firestore batch write limit).
 * - Only records with a valid createdAt are eligible for deletion.
 */
async function cleanupGameSchedules({ days = 90, batchSize = 500 } = {}) {
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error("cleanupGameSchedules: days must be a positive number");
  }
  const size = Math.min(Math.max(1, batchSize || 500), 500);

  const db = admin.firestore();
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const cutoff = admin.firestore.Timestamp.fromMillis(cutoffMs);

  let totalDeleted = 0;

  // Loop until there are no more docs older than cutoff.
  while (true) {
    const snap = await db
      .collection("schedules")
      .where("createdAt", "<", cutoff)
      .orderBy("createdAt", "asc")
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
    `🧹 schedules cleanup: deleted ${totalDeleted} docs older than ${days} days (cutoff=${new Date(
      cutoffMs
    ).toISOString()})`
  );

  return { totalDeleted, cutoffMs, days };
}

module.exports = { cleanupGameSchedules };

