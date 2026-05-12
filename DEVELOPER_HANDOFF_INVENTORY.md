# PrayerFeed Developer Handoff & Implementation Inventory

**Based on: PrayerFeed Foundation v5**
**Current Goal:** Controlled MVP testing support only. No new features. No v1.1 initialization.

---

## 1. Current Build Status

- **Current Project Phase:** Phase 5 Prep (Controlled MVP Testing Support readiness).
- **What Phase 4 Completed:** Hold-to-pray mechanism implementation, stats subcollection extraction (private stats), bounded/balanced feed ordering sorting logic without popularity tracking, closed community gatekeeping in rules and UI, local journal isolation.
- **What Phase 5 Prep Completed:** Safer test-data seating scripts (`seed.js` and `cleanup.js`), dry-run capabilities, test safety wrappers, updated security rules for private access, creation of MVP pilot test matrix.
- **Accepted for MVP Testing:** Yes, strictly scoped features (feed, hold-to-pray, moderation, direct messages, local journal).
- **Not Production-Ready:** Security around statistical increments natively, permanent persistence for journaling.
- **Known MVP Limitations:**
  1. Journal currently uses `localStorage`. Private from the server, but not production-grade secure native storage.
  2. Prayer-stat aggregation is still client-triggered directly from the frontend (using Firestore `increment()`).
  3. Production should eventually use Cloud Functions or trusted backend transactions for stat aggregation due to possibility of spam payloads.
  4. Intercession logs must remain private to avoid becoming spiritual-performance tracking for elders.
  5. Membership document visibility requires reviewing before production.
- **Current No-New-Features Boundary:** **Strict**. No scripture modules, no devotionals, no comments, no likes, no reactions, no public prayer times, no AI-generated prayers, no AI pastoral counseling, no general church announcements or advanced analytics.

---

## 2. Technical Stack

- **Frontend Framework:** React (19.x)
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling Approach:** Inline `<style>` CSS with standard classnames and custom theme CSS variables in `App.tsx` (Tailwind is available in `package.json` but legacy custom CSS blocks are heavily utilized). 
- **Backend Services:** Firebase (Firestore, Authentication).
- **Firestore Usage:** Heavily utilized for data persistence, strict security rules gating read/write using `rules_version = 2`.
- **Firebase Auth Usage:** `GoogleAuthProvider` (OAuth mapping to Firebase UID).
- **Gemini SDK / AI Usage:** `@google/genai` (Gemini 2.0 Flash used natively on the client via API key for triage logic). 
- **Hosting/Deployment Assumptions:** Assumes Vite static exporting, static web hosting (e.g. Firebase Hosting, Cloud Run with Express router fallback).
- **Package Manager:** `npm`
- **Major Dependencies:** `firebase`, `firebase-admin`, `@google/genai`, `lucide-react`, `motion`, `zustand`, `date-fns`.

---

## 3. Key Files and What They Do

- **`src/main.tsx`**
  - **Purpose:** Entry point for Vite. Renders `App` into DOM root.
- **`src/App.tsx`**
  - **Purpose:** Main application shell, state management of visual tabs, Feed ordering, rendering constraints.
  - **Key Functions/Components:** `useMemo` for feed sorting. `handlePrayerComplete`. 
  - **Data:** Renders Prayers, reads local contexts, triggers stat update calls using refs.
- **`src/lib/firebase.ts`**
  - **Purpose:** Firebase service initialization, environment configuration, standardizes error parsing (`handleFirestoreError`).
- **`src/hooks/useAppData.ts`**
  - **Purpose:** Centralized Global State & Data Fetching.
  - **Key Functions:** Watches `onAuthStateChanged`, maintains continuous `onSnapshot` queries for `prayers`, `memberships`, `internal/stats`, `bookmarks`, `logs`, and `journal`.
  - **Data Reads:** Authenticated user, fetches scoped church content based on active member role.
  - **Data Writes:** Manipulates local storage for journals and personal bookmarks. 
- **`firestore.rules`**
  - **Purpose:** Security. Denies access unless specific user token mapping and church membership roles allow it. Limits stats writes to valid incremental steps (+1).
- **`src/services/aiService.ts`**
  - **Purpose:** Executes zero-shot classification via Gemini 2.0 Flash to detect `URGENT`, `ELEVATED`, or `STANDARD` labels.
  - **Limitations:** API key currently consumed on the client; limits scaling.
- **`src/components/HoldButton.tsx`**
  - **Purpose:** Hold-to-pray UI logic executing `requestAnimationFrame` for a live 3-second hold timer.
- **`src/components/AdminPanel.tsx`**
  - **Purpose:** The Elder view. Iterates all scoped church prayers, allows status toggling (hide/approve), rendering of user rosters, and handles Direct Message components.
- **`scripts/seed.js` & `scripts/cleanup.js`**
  - **Purpose:** Administrative deployment of fake `isTestData: true` objects via `firebase-admin` without exposing UI endpoints. Handles automated dry-runs and safe test-church injections.
- **`ACCEPTANCE_MATRIX.md`** & **`PHASE_4_STATUS.md`** & **`SEEDING_INSTRUCTIONS.md`**
  - **Purpose:** Testing orchestration files documenting boundaries and role scopes for QA/pilot testing.

---

## 4. Auth and Membership Flow

- **Login Method:** User initiates `signInWithPopup(auth, GoogleAuthProvider)` in `App.tsx`.
- **Post-Login:** `useAppData.ts` recognizes `onAuthStateChanged`, ensures the basic `/users/{uid}` doc exists. Next, connects to `memberships/{uid}` document to determine `status` and `churchId`.
- **Blocking Unapproved:** If membership `status` is `pending`, `denied`, or `suspended`, `JoinChurchScreen` blocks the feed UI and returns "Pending Membership".
- **Church Identity:** Gathered dynamically via `/memberships/{uid}` which holds the target `churchId`.
  - **Role Segregation:** Role definitions (`member`, `elder`, `admin`) are assigned primarily in the `memberships` document. Admin views (tab rendering logic and `firestore.rules` queries) validate standard access versus elevated roles.

---

## 5. Firestore Data Model

The data is deeply partitioned to prevent data leakage:

- **`/users/{userId}`**: Profile info (displayName, email).
- **`/users/{userId}/logs/{logId}`**: Individual user's intercession records. (Private).
- **`/users/{userId}/bookmarks/{bookmarkId}`**: Deprecated local usage (now handled locally), but reserved endpoints.
- **`/memberships/{userId}`**: Stores `churchId`, `status`, `role`. Controls primary routing gate check.
- **`/churches/{churchId}`**: Base organization documents (`name`, `inviteCode`).
- **`/churches/{churchId}/prayers/{prayerId}`**: The primary public document. Contains `text`, `authorId`, `category`, `createdAt`, `anon`, `status`.
- **`/churches/{churchId}/prayers/{prayerId}/internal/stats`**: Subcollection containing `prayCount` and `prayTime`. 
- **`/churches/{churchId}/messages/{messageId}`**: Direct Pastoral DMs routed by `toId`. 

### Public Payload Verification
**Does the public prayer document contain `prayCount`, `prayTime`, `cumulativePrayTime`, list of pray-ers, or metadata?**
- **NO.** These are strictly nested under `/internal/stats`. The public prayer payload respects v5 guidelines.

---

## 6. Firestore Security Rules Summary

- **Users:** Read owner/admin. Update owner/admin.
- **Memberships:** `list` restricted to self, or elders/admins matching `churchId`. Updates locked exclusively to elders/admins.
- **Churches:** Accessible generally if signed-in but immutable. 
- **Prayers:** 
  - `allow get, list`: If `isActiveMember(churchId)`.
  - `allow create`: If valid prayer constraints are matched.
  - `allow update`: Prevents editing state fields beyond `answered`/`category` for user, restricts moderation overrides (hide/approve) specifically to `isElder(churchId)`. 
- **Internal Stats (`/internal/stats`):** 
  - `allow get`: Specific rule isolates access to `isOwner()` of the prayer or `isElder()`.
  - `allow list`: Exclusively `isElder()`.
  - `allow update`: Restricts increments specifically to: `incoming().prayCount == existing().prayCount + 1 && incoming().prayTime >= existing().prayTime`. 
- **Messages:** Restricted to recipients and generating elders.

---

## 7. Hold-to-Pray Implementation

- **Location:** `src/components/HoldButton.tsx`
- **Intentionality Threshold:** 3 seconds minimum.
- **Under Threshold:** Triggers `setTooShort(true)` displaying "Hold longer to pray"; triggers no network call.
- **Over Threshold:** Passes duration seconds back to payload via `onComplete`.
- **Duration Storage:** Written out to `users/{uid}/logs` and triggers an incremental transaction manually in `App.tsx` updating `stats` doc. 
- **Gamification Check:** Clean. No UI gamification elements. No leaderboards. 

---

## 8. Feed Ordering / Balanced Spiritual Attention

- **Location:** `App.tsx` (`feed` array useMemo).
- **Factors:**
  1. Filters out `answered` and `hidden` or objects older than 7 days.
  2. Partitions into items the user has *already prayed for today* (based on local log timestamps). Pushes unprayed items to the top.
  3. Secondary sorting combines chronological offset with AI Urgency scores (Urgent = 2M offset weight bias, Elevated = 1M offset weight bias). Standard requests still appear, just chronologically behind equivalently aged elevated events. 
- **Risk Assessment:** Minor risk of becoming an "urgency-only" feed if a mega-church experiences unmanageable volumes of `URGENT` triggers, displacing Standard events entirely. But current architecture is stable for mid-sized pilot churches as required. Contains absolutely no "popularity" loops.

---

## 9. Journal Privacy Implementation

- **Location:** Managed locally within `hooks/useAppData.ts`.
- **Storage Strategy:** Uses `localStorage` keyed with `pf_journal_${user.uid}`. 
- **Network Boundaries:** Never interacts with `firebase.ts`. Never interacts with `aiService.ts` Gemini triage. Never hits church collections. Readability strictly locked to local physical device profile context.
- **Bridge to Church:** `Share with Church` loads states into a standard compose pane allowing complete editing and anonymizing before a *brand new document* is manually committed to Firebase. Original journal item retains zero metadata associations with the new prayer context. Privacy guidelines strictly adhered to.

---

## 10. Gemini / AI Triage Implementation

- **Location:** `src/services/aiService.ts` (`triagePrayer`).
- **Initialization:** Created inline using `@google/genai`. 
- **Payload Data:** Standard context instruction merged with only the prayer string `"text"`. Journal entries skipped. No user identifiers, timestamps, or PII meta.
- **Responses:** Structured JSON identifying `urgency` (URGENT/ELEVATED/STANDARD), `reason` (advisory warning string), and `suggestedCategory`.
- **Visibility:** `triageReason` strings are rendered securely only inside the `AdminPanel.tsx` Elder component interface. Members do not see AI scoring results. 

---

## 11. Elder/Admin Implementation

- **Location:** `src/components/AdminPanel.tsx`. 
- **Access Strategy:** Visual UI tab gated locally by `role === 'admin' || role === 'elder'`. Reads all system configurations by executing isolated `/memberships` and root `/prayers` sweeps using `churchId` matches.
- **Features:** View/modify global `URGENT` statuses, override global anonymity metadata to identify authors, flag requests to `hidden`, and invoke `MessageCircle` to issue Direct Pastoral Messages native to the app `messages` collection. 
- **Privacy Assurance:** Elders do not track *who exactly* prayed for whom (no individual logs shown), ensuring no "member-spiritual-performance tracking". 

---

## 12. Seed and Cleanup Scripts

- **Location:** `scripts/seed.js` and `scripts/cleanup.js`.
- **Safety Setup:** Employs `process.env.CONFIRM_TEST_SEED`, `--dry-run` modes, and imports service account credentials remotely outside the repo root (`GOOGLE_APPLICATION_CREDENTIALS`).
- **Test Integrity:** Injected documents receive explicit dummy hashes: `isTestData: true`, `testSeedVersion: "phase5"`. 
- **Targeting Boundaries:** Cleanup targets iteration specifically to collections matching internal test constraints inside `church_grace_test` and `church_bethel_test`. Real Firebase Auth users and legitimate production memberships are strictly shielded.

---

## 13. Local Development and Deployment

- **Installation:** `npm install`
- **Local Dev Server:** `npm run dev` (Hooks Vite to `0.0.0.0:3000`).
- **Linter:** `npm run lint` (`tsc --noEmit`).
- **Deployment Assumptions:** Standard SPA build `npm run build`. Requires server or `.env` initialization of standard `VITE_FIREBASE_...` keys natively, plus native runtime implementation of `GEMINI_API_KEY`. 
- **Service Account Context:** Exclusively required for backend script tooling. (Not utilized locally on standard client startup).

---

## 14. Existing Test Materials

- **`PHASE_4_STATUS.md`:** Documentation defining transition success from phase 4 development, logging remaining gaps natively.
- **`ACCEPTANCE_MATRIX.md`:** Sandbox QA plan identifying the 9 distinct roles/account behaviors necessary to vet the feed and permission behaviors prior to launch.
- **`SEEDING_INSTRUCTIONS.md`:** Documentation for authorized developers operating the Seed/Cleanup scripts cleanly securely tracking test accounts. 

---

## 15. Gaps and Developer Questions

### Must resolve before controlled MVP test
*None discovered; codebase supports matrix executions successfully.*

### Must resolve before real church pilot
1. **Frontend-to-Gemini Call Risk:** `aiService.ts` utilizes the GenAI key natively on the frontend via `process.env.GEMINI_API_KEY`. This runs the risk of API key extraction natively in the browser if exposed publicly in SPA builds. Suggest moving Gemini triage call to Firebase Cloud Functions / Server boundary.
2. **Offline Data Sealing:** Verify localStorage journal data wipes seamlessly on Log Out to prevent multi-account data leaking locally if devices are shared.

### Must resolve before production launch
1. **Prayer Stats Tampering Security:** Client currently sends native `increment(1)` requests against private prayer stat trackers on completing holds. Rate-limiter bounds or Trusted Function backend endpoints should handle updates so users cannot script mass increments manually defeating the 3-second hold rule algorithmically.
2. **Database Membership Isolation Request:** Ensure standard users querying `/memberships` for rules matching are strictly bounded so that users cannot reverse-engineer entire membership databases (though `firestore.rules` handles most routing gracefully already).

### Nice to clarify later
1. Scaling limitations with 1-to-many direct messaging arrays.
2. Migrating heavy string CSS templates globally inside `App.tsx` into tailwind definitions.
