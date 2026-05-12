# Screen Inventory v1

### Public / Auth Screen
- **Component:** `<SignInScreen>` or conditional block resolving `GoogleAuthProvider`.
- **Visible Data:** Logo, App Title, "Continue with Google" action button block.
- **Restrictions:** Unauthenticated paths forbidden heavily blocking deep navigation loops.

### Join Church / Pending Screen
- **Component:** `<JoinChurchScreen>` / conditional loading blockers inside `App.tsx`.
- **Visible Data:** Status markers signifying pending checks or requests for invite codes.
- **Actions:** Submit invite code payload checking `church` boundaries.

### Member Feed (Main Tab)
- **Component:** Main `App.tsx` return block holding `PrayerCard` blocks natively. 
- **Visible Data:** Global text requests, author names (if explicit), ages, categorical pills.
- **Forbidden Data:** No `prayCount` labels, no public reaction signals, no AI triage reasoning (if standard).
- **Actions:** Initialize `HoldButton` component flow. Scroll chronologically. 
- **Empty State:** "No active prayers requested."

### Dashboard / Authored Post Modal
- **Component:** Specific Card clicks evaluating `authorId === user.uid`.
- **Visible Data:** Text request. Native `/internal/stats` extraction showcasing specific numerical responses (`prayCount`).
- **Actions:** Move to Answered status.
- **Forbidden:** Identifiers of *who* incremented the counters.

### Elder Admin Panel 
- **Component:** `<AdminPanel>` isolated visual tab.
- **Visible Data:** Complete unredacted (non-anonymous) rosters of feed posts, attached specific `ai_triageReason` warnings, and historical intersession totals matching `/internal/stats`.
- **Actions:** Hide items, Open Direct Message modal, Review AI scopes.
- **Forbidden Data:** Individual log extraction (users cannot track personal `users/{uid}/logs` datasets natively).

### Direct Message Inbox
- **Component:** Isolated Message mapping blocks rendering `messages`.
- **Visible Data:** Specific to/from pastoral chat blocks.
- **Actions:** Allows continuous thread updates.

### Journal Tab
- **Component:** Local render blocks for Private entries.
- **Visible Data:** Local storage strings natively.
- **Actions:** Add note, Share to Church (forking data into Modal).
- **Empty State:** Blank entry box ready for typing. 
