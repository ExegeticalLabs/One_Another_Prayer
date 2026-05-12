# PrayerFeed Developer Handoff Brief v1

**Based on: PrayerFeed Foundation v5**

## Product Purpose
PrayerFeed represents a sacred-space prayer encounter, not social engagement. The focus is on intentional intercession, guided pastoral triage, and strict privacy. It is explicitly designed to avoid the vanity metrics, gamification, and popularity loops common in social media feeds. 

## Current Phase and Build Status
- **Current Phase:** Phase 5 — Controlled MVP Testing Support
- **Build Status:** Feature-locked for MVP. Seed scripts and testing structures are in place for isolated, dry-run, and manual QA validation.
- **NOT in Development:** v1.1 is NOT starting. Do not add product features.

## What is Implemented
- **Hold-to-Pray Mechanism:** Requires a 3-second intentional hold before an intercession is counted. Avoids "quick taps."
- **Private Stats & Dashboards:** `prayCount` and `prayTime` are stored in secure subcollections (`internal/stats`). They are strictly hidden from the public feed and visible only to the post's author or church elders/admins.
- **Closed Community Routing:** Firmly gates feeds, actions, and reads behind a verified active `membership` mapping to a distinct `churchId`.
- **Feed Ordering:** Balanced spiritual attention. Factors chronological freshness, Gemini triage urgency, and removes already-prayed-for objects from the user's daily queue to ensure un-prayed items receive attention.
- **Local-Only Journaling:** Secure, private textual entries maintained natively on the device (`localStorage`), walled off from Firestore and Gemini unless explicitly manually forked to the church wall.
- **Role-Based Elder Moderation:** Hide/Approve capabilities, direct pastoral messaging, and AI triage visibility.

## What MUST NOT Be Added
The following violate the Foundation v5 doctrine and are explicitly prohibited:
- Public likes/reactions/“Amen” buttons
- Public prayer counts or public time-prayed stats
- Follower counts or leaderboards
- General church announcements or sermon distribution
- Comments/replies on prayers (direct pastoral messaging is the only allowed communication)
- Scripture modules or devotionals
- AI-generated prayers or AI pastoral counseling 
- Group chats or arbitrary public posting

## Known MVP Limitations & Production Warnings
**This build is not yet production-ready for real user data.**
1. **Frontend AI Key Exposure:** The system currently consumes standard `@google/genai` calls from the Vue/React client. For production, the API Key must be walled securely behind a server instance (Cloud Functions).
2. **Stat Aggregation Risk:** Holding the button triggers native `increment()` requests from the client. A malicious actor could bypass UI state and hit the DB directly multiple times. A trusted backend queue is required here.
3. **Journal Native Secure Storage:** The MVP uses standard browser `localStorage` which works for initial privacy, but does not wipe on sign-out. Shared devices (e.g. standard family iPads) risk exposing journals across accounts.
4. **Member Document Scoping:** The `memberships` table rules or UI queries need to be audited to prevent users from scanning the entire church's roster statuses needlessly.

## Next Testing Step
Execute the `SECURITY_RULES_TEST_PLAN_v1.md` and `MANUAL_QA_TEST_MATRIX_v1.md` using the seeded fake testing data (`scripts/seed.js`). Validate security scopes across isolated roles. 
