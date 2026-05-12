# User Flow Map v1

## Flow 1: First Sign-In / Join Church
- **Start:** Unauthenticated user hits domain.
- **Screens:** `App.tsx` (Sign in component).
- **Action:** User clicks Sign in with Google. OAuth Resolves.
- **Data Read:** Fetches `/users/{uid}`, then `/memberships/{uid}` (returns none).
- **Data Write:** Creates `/users/{uid}`.
- **Fail Edge:** User sits unassigned. Must supply church pin/invite UI manually.

## Flow 2: Active Member Opens Feed
- **Start:** Authenticated user with `status: active`.
- **Screens:** `App.tsx` Main Feed Tab.
- **Data Read:** Pulls `/churches/{churchId}/prayers`. Sweeps `/users/{uid}/logs`.
- **Result:** Renders chronologically staggered feed avoiding items listed in `logs` payload natively pushing unprayed things to the top automatically.

## Flow 3: Member Holds to Pray
- **Start:** Active member finds distinct feed item.
- **Screens:** `HoldButton.tsx` nested inside Card.
- **Action:** Pressed and held continuously > 3 seconds.
- **Data Write:** 
  1. Frontend writes `/users/{uid}/logs/{uuid}` payload.
  2. Frontend hits `/internal/stats` to iterate `increment(1)` algorithm.
- **Success State:** Button morphs tracking progress, resolves providing calm confirmation tick, visually greys out natively signifying completion.

## Flow 4: Member Posts a Prayer
- **Start:** Active feed user.
- **Screens:** Post Prayer modal.
- **Action:** Types text, selects anonymity context, hits Submit.
- **Data Read:** `aiService.ts` fires local key to Gemini API returning classifications.
- **Data Write:** Pushes combined `{text, ai_urgency, ai_reason, author_info}` to `/prayers` collection. 
- **Success:** Closes modal natively, appears immediately in global church feeds context utilizing Realtime connections.

## Flow 5: Elder Hides / Approves
- **Start:** Elder `role` authenticates.
- **Screens:** `AdminPanel.tsx` -> Prayer row.
- **Data Write:** Updates specific `status: 'hidden'` fields inside targeting array objects.
- **Success State:** Prayer instantly delists from primary member feed array.

## Flow 6: Member Creates Journal Entry
- **Start:** User clicks Journal Tab.
- **Screens:** Private Text Input area.
- **Data Write:** Local Storage `setItem()`. Zero remote transactions.
- **Success State:** Entry visible instantly, sealed to specific machine context. 
- **Edge Cases:** Shared family laptops run risk of exposure assuming explicit Log-Out routines omit local wipes.
