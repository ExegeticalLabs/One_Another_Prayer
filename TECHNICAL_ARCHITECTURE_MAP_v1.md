# Technical Architecture Map v1

## Stack & Assumptions
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Custom CSS + Tailwind primitives
- **Backend:** Firebase (Firestore, Authentication)
- **AI Integration:** `@google/genai` (Gemini 2.0 Flash)
- **Hosting Assumptions:** Static Hosting (Firebase Hosting / Vercel / Cloud Run with static serving) over Node Server.

## Codebase Orientation

### Core Application
- **`src/main.tsx`**: Bootstraps the application.
- **`src/App.tsx`**: The monolithic application shell. Contains heavy lifting for feed sorting, component rendering logic, global states, and conditional rendering based on membership roles.
- **`src/components/HoldButton.tsx`**: Critical UI. Implements `requestAnimationFrame` logic enforcing the 3-second hold-to-pray threshold.
- **`src/components/AdminPanel.tsx`**: Renders Elder tools (triage visibility, roster management, hide/approve toggles, direct messaging).

### State & Hooks
- **`src/hooks/useAppData.ts`**: The pulse of the data layer. Dispatches parallel `onSnapshot` watchers to Firestore handling realtime syncing for prayers, internal stats, messages, basic auth context, and reads local journals.

### Services & Integrations 
- **`src/lib/firebase.ts`**: Handles Firebase config loading and standard exported db/auth contexts. Exports `handleFirestoreError`.
- **`src/services/aiService.ts`**: Houses `triagePrayer(text)` which calls Gemini for zero-shot classification (`URGENT`, `ELEVATED`, `STANDARD`).

### Administrative Shell
- **`scripts/seed.js` & `scripts/cleanup.js`**: Backend-context Node scripts utilizing `firebase-admin` to bypass rules, inject fake `church_grace_test` identities natively, and clean up safely `--dry-run` supported.
- **`firestore.rules`**: The security source of truth isolating document reads & writes natively upon request context.

## Active Data Flows

### Auth & Membership Flow
1. User authenticates via Google Popup (`App.tsx`).
2. Authentication resolves, passing `uid` to `useAppData.ts`.
3. `useAppData` subscribes to `/memberships/{uid}`.
4. `churchId` and `status` are routed back to `App`.
5. If `status !== 'active'`, user receives Pending UI blockade.

### Feed & Read Flow
1. With `churchId` verified, `useAppData` subscribes to `/churches/{churchId}/prayers`.
2. Valid entries (not hidden) feed to `App.tsx`'s `feed` array.
3. `App.tsx` filters out prayers natively logged today in `/users/{uid}/logs`.
4. Remaining array is sorted by date and AI `urgency` weight offsets.

### Hold-to-Pray & Stat Flow
1. User grips `HoldButton`.
2. `< 3s`: Fails gently, prompts "Hold longer to pray". No network action.
3. `>= 3s`: Success. Component emits `onComplete(duration)`.
4. `App.tsx` handles emission:
   - Increments Private Stat `prayCount` and `prayTime` on `/prayers/{id}/internal/stats`. (Client-driven risk).
   - Writes independent log to `/users/{uid}/logs`.

### Journal Flow
1. User writes entry in Journal tab.
2. Saved natively to browser `localStorage` keyed with `pf_journal_{uid}`.
3. **If Forked:** Payload populates a standard Create Prayer modal, stripped of metadata. Disconnected completely from local trace upon submission.

### AI Triage Flow
1. New Prayer queued for creation.
2. `aiService.triagePrayer` queries Gemini with text.
3. Receives `urgency` categorization.
4. Firebase natively records this in the payload `/prayers/{id}` available for feed sort and Elder visibility.

## Environment Variables
- `VITE_FIREBASE_API_KEY`, etc.: Required for React client build.
- `GEMINI_API_KEY`: Required string for local runtime.
- `GOOGLE_APPLICATION_CREDENTIALS`: Required path exported locally to run `seed.js`/`cleanup.js`.

## Local Dev Commands
- Install: `npm install`
- Run Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Seed test env: `export CONFIRM_TEST_SEED="I_UNDERSTAND_THIS_CREATES_TEST_DATA" && node scripts/seed.js`
