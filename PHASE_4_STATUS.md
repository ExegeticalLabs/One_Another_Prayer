# Phase 4 Status

**Status:**
Accepted for controlled MVP testing.

**Not yet:**
Production-ready security architecture.

## Accepted Phase 4 Outcomes
1. Hold-to-pray requires intentional prayer and rejects quick taps.
2. Holds over the threshold record actual duration.
3. Prayer stats are no longer public feed fields.
4. Poster stats are private to author and elder/admin roles.
5. Closed church access is enforced by backend rules, not only UI routing.
6. Feed ordering follows balanced spiritual attention rather than popularity or least-prayed ranking.
7. Journal entries remain local-only and never reach Firestore or Gemini.
8. No new feature areas were added.

## Known MVP Limitations
1. Journal storage currently uses localStorage. It is private from the server but not production-grade secure native storage.
2. Prayer-stat increments are constrained by Firestore rules but still client-triggered. A malicious active member could potentially create repeated valid-looking increments outside the UI.
3. Production should move prayer-stat aggregation to Cloud Functions or another trusted backend transaction layer with per-user/per-prayer frequency validation.
4. Individual intercession logs must not become elder-facing spiritual-performance tracking.
5. Membership document visibility should be reviewed so ordinary members cannot access unnecessary administrative metadata.
