# Data Model & Security Rules Specification v1

Firestore natively segments public feeds from sensitive analytics. Data is deeply partitioned. The `firestore.rules` file enforces rigorous isolation based on `churchId` matches inside `/memberships/{userId}` profiles.

## Root Collections & Paths

### 1. `/users/{userId}`
- **Purpose:** Public/Baseline platform identity.
- **Fields:** `displayName`, `email`.
- **Permissions:** Read/Write heavily gated to `request.auth.uid == userId` or System Admin.
- **Privacy Boundary:** Extremely sensitive. `email` should not be casually shared unless elder triage demands it.

### 2. `/users/{userId}/logs/{logId}`
- **Purpose:** A user's private ledger of prayers interceded for.
- **Fields:** `prayerId`, `durationSec`, `type`, `createdAt`.
- **Permissions:** Strict `isOwner()` isolation. 
- **Privacy Boundary:** Elders **DO NOT** have permission to read these. These are intercession histories specific to the user preventing spiritual performance tracking.

### 3. `/memberships/{userId}`
- **Purpose:** The global application gateway dictating organizational context.
- **Fields:** `churchId`, `status` (active/pending/suspended), `role` (member/elder/admin), `joinedAt`.
- **Permissions:** 
  - Read: Self, or any Elder/Admin inside matching `churchId`.
  - Write: Only Elder/Admin. Users cannot promote themselves.
- **Limitations:** General users listing `/memberships` needs verifying.

### 4. `/churches/{churchId}`
- **Purpose:** Tenant Organization details.
- **Fields:** `name`, `inviteCodeEnabled`, `createdAt`.
- **Permissions:** Read globally if logged in (for join flows). Write limits applied to admins.

### 5. `/churches/{churchId}/prayers/{prayerId}`
- **Purpose:** The public prayer board payload.
- **Fields:** `text`, `authorId`, `author`, `anon` (boolean), `category`, `urgency` (AI gen), `triageReason` (AI gen), `status`, `createdAt`. 
- **Permissions:**
  - Read/List: Users with an `active` membership matching `churchId`.
  - Write: Active members can create. Authors can moderate/close. Elders can force `hidden`/`active` and toggle values.
- **Violation Check (v5 compliance):** `prayCount` and `prayTime` are **VERIFIED EXCLUDED** from this payload.

### 6. `/churches/{churchId}/prayers/{prayerId}/internal/stats`
- **Purpose:** The private ledger aggregating intercessions connected to a distinct prayer.
- **Fields:** `prayCount`, `prayTime`. 
- **Permissions:** 
  - Read/Get: Target `isOwner()` of the parent prayer, or `role == 'elder' || 'admin'`. General members see "Permission Denied".
  - Write/Update: Specifically constrained via `firestore.rules` requiring increments exactly `+1` sequentially.
- **Known Limitations:** Though gated by sequential increment rules, this is still accessible to an authenticated user generating rogue API calls without the UI. A backend function is desired here.

### 7. `/churches/{churchId}/messages/{messageId}`
- **Purpose:** Direct inbox for pastoral check-ins.
- **Fields:** `fromId`, `toId`, `prayerId`, `text`, `createdAt`. 
- **Permissions:** Restricted to Elder author and Member recipient strictly isolating chatter down to pure pastoral support channels.

## Security Rules Review Status

The current implementation securely partitions the app logic into horizontal multi-tenant church bounds while vertically isolating public objects and private nested subcollections (e.g., stats). 
* **`list` requests** are guarded manually checking `active` memberships.
* **Elder Rules** employ isolated user payload validation before generating `true` values on elevated functions. Ensure rules evaluate target documents correctly instead of trusting standard client properties.
