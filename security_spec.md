# Security Spec

## 1. Data Invariants
- A **Prayer** has an `authorId` which must match the logged-in user at creation. Once created, `authorId` is immutable.
- A **Prayer** must have `createdAt` equal to the server timestamp. The categories must be a string up to 64 chars.
- The `text` of a **Prayer** or **Journal** must be a string up to 4096 characters to prevent storage attacks.
- Only the `authorId` can update a **Prayer** (e.g., mark as answered with an answer note).
- **JournalEntry**, **PrayerLog**, and **Bookmark** are private collections under `/users/{userId}/...` and can ONLY be read/written by the user whose `userId` matches the path and the data payload.

## 2. The "Dirty Dozen" Payloads
1. **Identity Spoofing (Create Prayer):** Creating a Prayer using another user's `authorId`.
2. **Path Variables Poisoning:** Passing a 500-char string for `{prayerId}`.
3. **Data Type Attack:** Setting `createdAt` as a string instead of a timestamp.
4. **Denial of Wallet:** Adding a `text` string with 1 million characters.
5. **Ghost Fields:** Creating a prayer with `{ isVerified: true }` added.
6. **Immutable Field Change:** Trying to change `authorId` during an update.
7. **PII Leakage:** Trying to read `/users/otherUser/...` records.
8. **Invalid State Transition:** Updating a prayer with `answered: false` when it was already `answered: true`.
9. **Blanket Read Exploit:** Reading `/prayers` with an unauthorized account (must be signed in and email verified, if applicable).
10. **Array Poisoning:** N/A since arrays are not used.
11. **Spoofed Bookmark:** Creating a bookmark in another user's space.
12. **Unverified Timestamp:** Sending `{ createdAt: 1670000 }` instead of `request.time`.

## 3. The Test Runner
Provides the foundation for `firestore.rules.test.ts` to assert these invariants.
