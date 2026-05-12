# Privacy Data Inventory v1

PrayerFeed enforces strict data minimization mapped natively against the Foundation v5 doctrine. 

## 1. User Profile Data (`/users`)
- **Data Collected:** Display Name, Email, Profile Avatar URL (from Google accounts natively).
- **Location:** Firestore (`/users/{uid}`).
- **Visibility:** Public feeds optionally (if not anonymous). Emails should be heavily restricted explicitly limiting views to Elder contexts in Admin tools if required. 

## 2. Church Membership Data (`/memberships`)
- **Data Collected:** Church organization identifier, user status, user role.
- **Visibility:** Required locally natively for routing bounds, visible fully to Elders resolving member list checks globally.

## 3. Prayer Requests (`/prayers`)
- **Data Collected:** Text-String requests natively, Authorship mapping, AI triage scoring definitions natively.
- **Visibility:** Published natively across scoped members holding `churchId`. Anonymous options hide UID/Author mapping from standard payload fetches natively but retain links for Elder accountability queries. 
- **AI Processing:** Sent natively isolated without author strings (text payload only) to `@google/genai` API. Gemini does not receive names, UIDs, or personal context mappings isolating the AI requests.

## 4. Prayer Statistics (`/internal/stats`)
- **Data Collected:** Numerical aggregation totals. `prayCount`, `prayTime`.
- **Visibility:** Strongly walled off. Isolated inside Firestore using multi-subcollections. Native validation permits reading ONLY for explicitly matching `authorId` or Elevated `role`.

## 5. Intercession Logs (`/logs`)
- **Data Collected:** Individual actions, timestamps, duration seconds natively executing on feed triggers.
- **Visibility:** **Strictly Private**. No entity, explicitly including Elders natively, is allowed query access over this path checking the specific datasets. Represents a user's isolated spiritual record preventing accountability weaponization against congregation participants.

## 6. Journal Entries (`pf_journal_uid`)
- **Data Collected:** User intimate text recordings.
- **Location:** Local-Storage context (`window.localStorage`). 
- **Visibility:** Completely unbound from backend tracking endpoints natively. Data sits physically mapped inside the machine context natively. 
- **Risk Scope:** Does not clear on signing out naturally. 

## 7. Known Data Deletion Constraints
- Production environment currently lacks explicit automated deletion boundaries natively clearing prayer records over > N days definitively holding state persistently natively representing physical cost storage long-term naturally natively.
