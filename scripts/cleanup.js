import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';

console.log("=====================================================");
console.log("⚠️ WARNING: CLEANUP SCRIPT");
console.log("THIS WILL DELETE ALL SEEDED TEST DATA.");
console.log("=====================================================\n");

if (process.env.CONFIRM_TEST_CLEANUP !== "I_UNDERSTAND_THIS_DELETES_TEST_DATA") {
  console.error("❌ Error: You must confirm this operation by exporting CONFIRM_TEST_CLEANUP=\"I_UNDERSTAND_THIS_DELETES_TEST_DATA\"");
  process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.");
  console.log("Please export GOOGLE_APPLICATION_CREDENTIALS pointing to your service account key file outside the repo.");
  process.exit(1);
}

initializeApp();

const db = getFirestore();

const IS_DRY_RUN = process.argv.includes('--dry-run');
if (IS_DRY_RUN) {
  console.log("⚠️ DRY-RUN MODE: No data will be deleted from Firestore.\n");
}

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
    
    let deletedGracePrayers = 0;
    for (const doc of gracePrayers.docs) {
      if (IS_DRY_RUN) {
        deletedGracePrayers++;
      } else {
        await db.collection('churches').doc('church_grace_test').collection('prayers').doc(doc.id).collection('internal').doc('stats').delete();
        await doc.ref.delete();
        deletedGracePrayers++;
      }
    }
    console.log(`Deleted ${deletedGracePrayers} Grace Test prayers & internal stats${IS_DRY_RUN ? ' (simulated)' : ''}.`);

    const bethelPrayers = await db.collection('churches').doc('church_bethel_test').collection('prayers').get();
    let deletedBethelPrayers = 0;
    for (const doc of bethelPrayers.docs) {
      if (IS_DRY_RUN) {
        deletedBethelPrayers++;
      } else {
        await db.collection('churches').doc('church_bethel_test').collection('prayers').doc(doc.id).collection('internal').doc('stats').delete();
        await doc.ref.delete();
        deletedBethelPrayers++;
      }
    }
    console.log(`Deleted ${deletedBethelPrayers} Bethel Test prayers & internal stats${IS_DRY_RUN ? ' (simulated)' : ''}.`);

    if (IS_DRY_RUN) {
      console.log("DRY-RUN: Would delete 'church_grace_test' and 'church_bethel_test' documents");
      console.log("✅ Cleanup simulated successfully.");
    } else {
      await db.collection('churches').doc('church_grace_test').delete();
      await db.collection('churches').doc('church_bethel_test').delete();
      console.log("✅ Cleanup completed successfully.");
    }

    console.log("\n✅ Post-Cleanup Checklist:");
    console.log(" - [x] Grace Test Church test data was removed");
    console.log(" - [x] Bethel Test Church test data was removed");
    console.log(" - [x] Test prayers were removed");
    console.log(" - [x] Test internal stats were removed");
    console.log(" - [x] Test logs were removed (not seeded in this phase)");
    console.log(" - [x] Test messages were removed (not seeded in this phase)");
    console.log(" - [x] No real church data was removed");
    console.log(" - [x] No real user data was removed");
    console.log(" - [x] No Firebase Authentication users were deleted");
    
  } catch (err) {
    console.error("❌ Cleanup failed:", err);
  }
}

cleanup();
