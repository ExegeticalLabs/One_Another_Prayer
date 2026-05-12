# Security Rules Test Plan v1

Firestore security rules are not just database filters; they reject insecure queries entirely. The following checks must be manually verified.

## Connection & Role Gates
- [ ] **Signed-out User Denied:** Attempt any `list` against `/churches/church_grace_test/prayers`. Must yield `Permission Denied`.
- [ ] **Google-Only User Denied:** Authenticate but have no `/memberships/{uid}` document. Feed loads must fail gracefully. 
- [ ] **Pending User Denied:** Authenticate with `status: pending`. Root church query must return `null` or permission denied.
- [ ] **Suspended User Denied:** Authenticate with `status: suspended`. No access to creates/updates/lists.
- [ ] **Active Member Allowed:** Feed list returns populated array.
- [ ] **Church B isolation:** `[User A]` with active status in Grace Test Church queries Bethel Test Church prayers. Should yield `Permission Denied`.

## Private Statistic Read/Write Gates
- [ ] **Author Can Read Own Stats:** Perform a distinct `get` request against `/churches/{church}/prayers/{author_prayer_1}/internal/stats`. Must allow.
- [ ] **Non-Author Cannot Read Stats:** `[User B]` executes `get` against `author_prayer_1/internal/stats`. Must yield `Permission Denied`.
- [ ] **Elder/Admin Can Read Stats:** Set `role: elder`. Execute `list` against a collection group or specific subcollections. Must allow.
- [ ] **Member Cannot Arbitrarily Set Statistics:** Update `/internal/stats` payload sending `prayCount = 99999999` manually via script against matching Church logic. Must fail due to incremental strict logic. 

## Log & Privacy Shielding
- [ ] **Log Privacy:** Attempt to execute `list` against `/users/{anotherUserUID}/logs`. Must yield `Permission Denied`.
- [ ] **Elder Surveillance Defense:** As an active `elder`, attempt to read `/users/{anyMember}/logs`. Must yield `Permission Denied`.
- [ ] **Journal Isolation:** Confirm absolutely no `firestore.rules` exist referencing `journals` anywhere since it's `localStorage` only.

## Action Scopes
- [ ] **Member cannot perform Elder actions:** Member sets `urgency: URGENT` or changes `status: hidden` on someone else's request. Native update must fail.
- [ ] **Messages scoping:** User attempts to list `messages` lacking their `uid` as `toId` or `fromId`. Native list rejects.
