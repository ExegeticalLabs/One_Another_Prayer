# Manual QA Test Matrix v1

| Test ID | Area | Role | Precondition | Action | Expected Result | Actual Result | Pass/Fail | Severity | Notes |
|---|---|---|---|---|---|---|---|---|---|
| QA-01 | Feed Integrity | Signed-out | App launched | View home screen | Redirected to sign in. No prayers visible. | | | HIGH | |
| QA-02 | Feed Integrity | Active | Logged into Grace Test | Open Feed | Only Grace Test prayers appear. No Bethel prayers. | | | HIGH | |
| QA-03 | Prayer Create | Active | Local user authenticated | Post test request | Prayer appears in feed. `internal/stats` subcollection initialized seamlessly. | | | HIGH | |
| QA-04 | Hold-to-Pray | Active | Target unprayed target | Hold for 1 second, release | UI shows "Hold longer". No DB records created. | | | HIGH | Validates no quick taps |
| QA-05 | Hold-to-Pray | Active | Target unprayed target | Hold for 4 seconds, release | Animates to completion. `duration` logged accurately. | | | HIGH | |
| QA-06 | Private Stats | Author | User views own post | Tap personal post card | `prayCount` and `prayTime` are visible | | | HIGH | |
| QA-07 | Private Stats | Active | User views post they didn't write | View card | `prayCount` and `prayTime` are invisible. DB errors if fetching. | | | HIGH | |
| QA-08 | Elder View | Elder | Valid Elder logged in | Open Admin/Elder tab | Complete stats seen. Triage/Urgency reasons visible. | | | MED | |
| QA-09 | Moderation | Elder | Finds issue | Clicks "Hide" toggling active to hidden | Card vanishes from member feeds. Remains visible in Admin tab. | | | MED | |
| QA-10 | Direct Message | Elder | Opens Member pane | Sends test message | Private comms appear in member inbox native path. | | | LOW | |
| QA-11 | Journal | Active | Opens Journal tab | Writes text and closes app | Reload proves data persists safely in local browser storage only. | | | HIGH | Check Network tab! |
| QA-12 | Journal Share | Active | Selects Journal local row | Modifies context, hits Share | Creates public feed entry, retains no DB association to original local entry. | | | HIGH | |
| QA-13 | Cross-Church | Active | Logged into Bethet Test | Manual fetch API for Grace Test | Returns `Missing or insufficient permissions` safely locking query. | | | HIGH | |
| QA-14 | Sign Out / Switch| Active | Has Local Journal data | Sign out. Sign back in new user | Is old data isolated natively? | | | HIGH | Storage persistence bug likely |

*All results should be marked PASS/FAIL natively by physical manual testing validation utilizing the `seed.js` environment structure.*
