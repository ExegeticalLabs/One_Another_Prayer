import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

console.log("=====================================================");
console.log("⚠️ WARNING: TEST DATA ONLY");
console.log("DO NOT USE WITH REAL PRAYER REQUESTS OR IN PRODUCTION.");
console.log("=====================================================\n");

const SERVICE_ACCOUNT_PATH = process.env.SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`❌ Error: Service account key not found at ${SERVICE_ACCOUNT_PATH}`);
  console.log("Please download your Firebase admin SDK service account key, save it as 'serviceAccountKey.json' in the root directory, or provide its path via SERVICE_ACCOUNT_PATH.");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(resolve(SERVICE_ACCOUNT_PATH), 'utf-8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// We will map one or more test UIDs to the seeded prayers so you can test "Author owns prayer" logic.
// You can pass these via environment variables, otherwise they default to fake IDs.
const PRIMARY_UID = process.env.PRIMARY_UID || "test_user_uid_1";

async function seed() {
  try {
    const batch = db.batch();

    console.log("Seeding Churches...");
    const graceChurchRef = db.collection('churches').doc('church_grace_test');
    batch.set(graceChurchRef, {
      name: "Grace Test Church",
      inviteCodeEnabled: true,
      createdAt: FieldValue.serverTimestamp()
    });

    const bethelChurchRef = db.collection('churches').doc('church_bethel_test');
    batch.set(bethelChurchRef, {
      name: "Bethel Test Church",
      inviteCodeEnabled: true,
      createdAt: FieldValue.serverTimestamp()
    });

    console.log("Seeding Prayers for Grace Test Church...");
    
    const fakePrayers = [
      {
        text: "Praying for my mother's upcoming surgery next Tuesday.",
        category: "health",
        anon: false,
        answered: false,
        urgency: "STANDARD",
        status: "active",
        authorId: PRIMARY_UID, // Use the real test UID here to test author logic
        author: "Test User",
        stats: { prayCount: 2, prayTime: 45 }
      },
      {
        text: "Please pray for our family as we grieve the loss of my grandfather.",
        category: "grief",
        anon: true,
        answered: false,
        urgency: "ELEVATED",
        triageReason: "Grief and loss flag",
        status: "active",
        authorId: "fake_author_1",
        author: "A Church Member",
        stats: { prayCount: 5, prayTime: 120 }
      },
      {
        text: "Praise God! I finally found a new job after 6 months of searching.",
        category: "gratitude",
        anon: false,
        answered: true,
        urgency: "STANDARD",
        status: "answered",
        authorId: PRIMARY_UID,
        author: "Test User",
        stats: { prayCount: 12, prayTime: 300 }
      },
      {
        text: "Struggling with profound loneliness lately. Please pray for community.",
        category: "spiritual growth",
        anon: true,
        answered: false,
        urgency: "STANDARD",
        status: "active",
        authorId: "fake_author_2",
        author: "A Church Member",
        stats: { prayCount: 1, prayTime: 15 }
      },
      {
        text: "Pray for my marriage, we are going through a really tough time and need God's intervention.",
        category: "family",
        anon: true,
        answered: false,
        urgency: "ELEVATED",
        triageReason: "Marital distress flag",
        status: "active",
        authorId: "fake_author_3",
        author: "A Church Member",
        stats: { prayCount: 8, prayTime: 210 }
      },
      {
        text: "I am having dark thoughts and feel like I can't go on. Please someone help.",
        category: "ongoing burden",
        anon: true,
        answered: false,
        urgency: "URGENT",
        triageReason: "Severe distress / ideation",
        status: "active",
        authorId: "fake_author_4",
        author: "A Church Member",
        stats: { prayCount: 0, prayTime: 0 }
      },
      {
        text: "Praying for the youth ministry retreat this weekend. May lives be transformed.",
        category: "church body",
        anon: false,
        answered: false,
        urgency: "STANDARD",
        status: "active",
        authorId: "fake_author_5",
        author: "Youth Pastor",
        stats: { prayCount: 3, prayTime: 65 }
      },
      {
        text: "Feeling distant from God. Want to rekindle my faith.",
        category: "spiritual growth",
        anon: true,
        answered: false,
        urgency: "STANDARD",
        status: "active",
        authorId: "fake_author_6",
        author: "A Church Member",
        stats: { prayCount: 0, prayTime: 0 }
      },
      {
        text: "My boss is extremely hostile and it is affecting my health. Pray for a resolution.",
        category: "work",
        anon: false,
        answered: false,
        urgency: "STANDARD",
        status: "active",
        authorId: "fake_author_7",
        author: "John D.",
        stats: { prayCount: 4, prayTime: 100 }
      },
      {
        text: "A sensitive pastoral issue that an elder has hidden.",
        category: "ongoing burden",
        anon: true,
        answered: false,
        urgency: "ELEVATED",
        status: "hidden",
        authorId: "fake_author_8",
        author: "A Church Member",
        stats: { prayCount: 0, prayTime: 0 }
      },
      {
        text: "Archived prayer from months ago.",
        category: "health",
        anon: false,
        answered: false,
        urgency: "STANDARD",
        status: "archived",
        authorId: "fake_author_1",
        author: "Dave S.",
        stats: { prayCount: 20, prayTime: 500 }
      },
      {
        text: "My chronic back pain is really severe this week.",
        category: "health",
        anon: false,
        answered: false,
        urgency: "STANDARD",
        status: "active",
        authorId: "fake_author_9",
        author: "Sarah",
        stats: { prayCount: 2, prayTime: 30 }
      }
    ];

    let offsetSeconds = 0;
    
    for (const p of fakePrayers) {
      const pRef = graceChurchRef.collection('prayers').doc();
      const createdAt = new Date(Date.now() - offsetSeconds * 3600000); // Stagger times
      offsetSeconds += 3;

      batch.set(pRef, {
        churchId: "church_grace_test",
        text: p.text,
        category: p.category,
        anon: p.anon,
        answered: p.answered,
        urgency: p.urgency,
        triageReason: p.triageReason || null,
        status: p.status,
        authorId: p.authorId,
        author: p.author,
        createdAt,
      });

      // Seed Private Stats
      const statsRef = pRef.collection('internal').doc('stats');
      batch.set(statsRef, {
        churchId: "church_grace_test",
        prayCount: p.stats.prayCount,
        prayTime: p.stats.prayTime
      });

      // Optionally we could seed some logs in `users/fake_uid/logs` but let's 
      // rely on the user generating those in testing.
    }

    console.log("Committing to Firestore...");
    await batch.commit();

    console.log("✅ Seeding completed successfully.");
    console.log("Test Churches created: 'church_grace_test', 'church_bethel_test'");
    
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  }
}

seed();
