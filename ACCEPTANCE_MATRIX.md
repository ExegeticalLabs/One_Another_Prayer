# Pilot Readiness: Acceptance Matrix & Testing

This document contains the controlled role-based test pass to be executed manually using real accounts before deploying the MVP pilot.

## Test Roles
1. **Signed-out User** (Anonymous, no access)
2. **Unapproved User** (Signed in via Google, but not approved in a church)
3. **Pending User** (Requested access, awaiting elders)
4. **Suspended User** (Role = suspended)
5. **Active Member** (Standard user in Church A)
6. **Prayer Author** (Active member who authored a specific test prayer)
7. **Elder** (Role = elder in Church A)
8. **Admin** (Role = admin in Church A)
9. **Other Church Member** (Member of Church B)

## Test Flows & Acceptance Criteria

### 1. Feed Read Integrity
- [ ] **Signed-out** user sees login screen, no feed data.
- [ ] **Unapproved/Pending/Suspended** user sees "Pending/Denied" screen, no feed data.
- [ ] **Active Member** sees only Church A feed.
- [ ] **Other Church Member** sees only Church B feed, gets Permission Denied if attempting to read Church A.

### 2. Prayer Creation
- [ ] **Active Member** successfully creates a prayer.
- [ ] Identity is stored as `authorId`.
- [ ] `internal/stats` is initialized with `prayCount: 0`, `prayTime: 0`.

### 3. Hold-to-Pray & Intercession
- [ ] **Early Release:** Release before 3s records nothing (no DB writes, UI indicates brief calm feedback).
- [ ] **Valid Hold:** Hold beyond 3s records actual duration.
- [ ] DB `prayCount` increments exactly by 1, `prayTime` increments by actual duration.
- [ ] User's personal dashboard log is appended.

### 4. Privacy & Stats Access
- [ ] **Active Member** reads feed but cannot see `prayCount` or `prayTime` on others' prayers.
- [ ] **Active Member** receives "Missing or insufficient permissions" gracefully if they try to hack stats access.
- [ ] **Prayer Author** can view their own prayer and see private stats (`prayCount`, `prayTime`).
- [ ] **Elder/Admin** can view the private stats for all prayers in Church A.

### 5. Moderation & Elder Actions
- [ ] **Elder** can hide a prayer. The prayer drops from Active Member feeds.
- [ ] **Active Member** cannot access hidden prayers.
- [ ] **Elder** can unhide/approve requests.
- [ ] **Elder** can send a direct message natively; member can receive it.

### 6. Journal Sealing Focus
- [ ] **Active Member** creates a Journal entry.
- [ ] Validate Network tab: no external XHR/Fetch request carries the journal payload.
- [ ] Data appears in LocalStorage.
- [ ] Using "Share with Church" creates a completely separate prayer document with no link back to the journal.
