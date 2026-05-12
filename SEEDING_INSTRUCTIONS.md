# Phase 5: Controlled MVP Testing Seeding Instructions

This directory contains one-time, local administrator scripts designed strictly to seed fake environments for controlled MVP role-based testing. 

**THESE SCRIPTS ARE FOR TEST ENVIRONMENTS ONLY. NEVER USE THEM IN A PRODUCTION DATABASE CONTAINING REAL PRAYER REQUESTS.**

## Why these scripts exist
These scripts use standard `firebase-admin` tools to bypass client security rules. This allows us to inject fake church states, hidden prayers, specific triage statuses, and private stats without building a vulnerable "seeding UI" into the production application.

## Prerequisites
1. You must have a **Service Account Key** for your Firebase Project.
   - Go to your [Firebase Console](https://console.firebase.google.com/).
   - Click the gear icon > **Project settings**.
   - Go to the **Service accounts** tab.
   - Click **Generate new private key**.
   - Save the downloaded JSON file to a secure location **OUTSIDE of this repository** (e.g. `~/.keys/serviceAccountKey.json`).

2. Run `npm install` to ensure `firebase-admin` and `dotenv` are installed.

## How to Run

Before running the script, log into your application using your real Google account to create a Firebase Auth UID. Copy your UID (you can find it in the Authentication tab in Firebase Console).

Export your UID, point to your service account key, and confirm your intent so the seed script attributes some prayers to you for testing "Author owns prayer" logic:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/outside/the/repo/serviceAccountKey.json"
export PRIMARY_UID="your-firebase-auth-uid"
export CONFIRM_TEST_SEED="I_UNDERSTAND_THIS_CREATES_TEST_DATA"
node scripts/seed.js
```

This will create:
- `church_grace_test` (Grace Test Church)
- `church_bethel_test` (Bethel Test Church)
- 12-15 fake prayer requests spanning various states (active, hidden, answered, archived) and triage levels.
- Private stats subcollections attached to each prayer.

---

## Role-Based Testing Setup

Because PrayerFeed exclusively relies on secure Google Sign-in and enforces backend rules via the `memberships` collection, you **must manually configure your test roles** in the Firebase Console. 

### To test the roles from ACCEPTANCE_MATRIX.md:

1. **Log into the app** normally with your Google Account. Make note of the user UID.
2. **Open the Firestore Database** in Firebase Console.
3. **Navigate to the `memberships` collection**.
4. **Create or edit the document** where the Document ID is your UID.

**To test "Active Member" in Grace Church:**
```json
{
  "churchId": "church_grace_test",
  "status": "active",
  "role": "member"
}
```

**To test "Pending Member":**
Change `status` to `"pending"`.

**To test "Suspended Member":**
Change `status` to `"suspended"`.

**To test "Elder":**
Change `status` to `"active"` and `role` to `"elder"`.

**To test "Admin":**
Change `status` to `"active"` and `role` to `"admin"`.

**To test "Other Church Member":**
Change `churchId` to `"church_bethel_test"`.

*Wait a moment for the Firestore listener to update your UI, then verify the acceptance criteria!*

---

## Cleanup
Once testing is fully completed and signed off, use the cleanup script to remove all the seeded fake data.

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/outside/the/repo/serviceAccountKey.json"
export CONFIRM_TEST_CLEANUP="I_UNDERSTAND_THIS_DELETES_TEST_DATA"
node scripts/cleanup.js
```

This securely deletes `church_grace_test`, `church_bethel_test`, and all recursively nested collections (prayers, stats) that were created by the seed script.
