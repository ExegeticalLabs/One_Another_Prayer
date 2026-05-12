import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

console.log("=====================================================");
console.log("⚠️ WARNING: CLEANUP SCRIPT");
console.log("THIS WILL DELETE ALL SEEDED TEST DATA.");
console.log("=====================================================\n");

const SERVICE_ACCOUNT_PATH = process.env.SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`❌ Error: Service account key not found at ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(resolve(SERVICE_ACCOUNT_PATH), 'utf-8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function deleteCollectionAtPath(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.limit(500).get();

  if (snapshot.size === 0) {
    return;
  }

  console.log(`Deleting ${snapshot.size} documents from ${collectionPath}...`);
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteCollectionAtPath(collectionPath);
  });
}

async function cleanup() {
  try {
    console.log("Cleaning up Grace Test Church Prayers and Stats...");
    
    // Quick approach to delete nested stats collections: we must query them in a collection group 
    // or iterate the prayers. For safety, let's iterate.
    const gracePrayers = await db.collection('churches').doc('church_grace_test').collection('prayers').get();
    
    for (const doc of gracePrayers.docs) {
      await db.collection('churches').doc('church_grace_test').collection('prayers').doc(doc.id).collection('internal').doc('stats').delete();
      await doc.ref.delete();
    }
    console.log("Deleted Grace Test prayers & internal stats.");

    const bethelPrayers = await db.collection('churches').doc('church_bethel_test').collection('prayers').get();
    for (const doc of bethelPrayers.docs) {
      await db.collection('churches').doc('church_bethel_test').collection('prayers').doc(doc.id).collection('internal').doc('stats').delete();
      await doc.ref.delete();
    }
    console.log("Deleted Bethel Test prayers & internal stats.");

    await db.collection('churches').doc('church_grace_test').delete();
    await db.collection('churches').doc('church_bethel_test').delete();

    console.log("✅ Cleanup completed successfully.");
    
  } catch (err) {
    console.error("❌ Cleanup failed:", err);
  }
}

cleanup();
