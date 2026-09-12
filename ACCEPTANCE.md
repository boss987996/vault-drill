# Acceptance evidence

2026-09-12. Live URL: https://boss987996.github.io/vault-drill/

Pass means verified in the stated test environment. Fail (unverified) means the required physical-device check is outstanding, not an observed defect. Full A1-A12 acceptance is not yet complete.

| Criterion | Result | Evidence |
|---|---|---|
| A1: home-screen launch to first card under 2 seconds | Fail (unverified) | Live browser opens directly to the first word; actual Android installed launch timing remains untested. |
| A2: session with Wi-Fi and mobile data disabled | Fail (unverified on Android) | Browser offline test passed: stopped the local HTTP server, reloaded from Service Worker cache, and completed 10 words / 11 answers. Phone radio-off test remains. |
| A3: close/reopen retains progress | Pass | Closed live app tab after Forgot, reopened: next card, reviewed count and learning state retained. IndexedDB integration also checks saved repeat queue. |
| A4: Forgot returns in same session | Pass | Browser showed interconnected after exactly three intervening cards; tests cover final-card repeat and more than 40 attempts. |
| A5: displayed interval matches actual scheduling | Pass | 144 preview/persist comparisons across states, grades, eases and intervals; live new buttons show immediate/immediate/1 day/4 days. |
| A6: summary, next date and OneDrive export | Fail (OneDrive save unverified) | Summary and export controls passed browser checks. Real File payload, share, cancellation and download fallback passed integration test. Actual Android share-sheet save to OneDrive remains. |
| A7: Thai renders in light and dark | Pass | Visually checked bundled IBM Plex Sans Thai in dark answer and light summary. Light iframe uses browser color-scheme inheritance; computed backgrounds match the prescribed tokens. |
| A8: no horizontal scrolling at 360px | Pass | Tested question, answer and summary. Viewport 360, document scroll width 345; light iframe client/scroll width both 345. Export buttons exceed 44px in both dimensions. |
| A9: no more than 10 new cards on day one | Pass | Browser session introduced 10 and left 66 untouched; tests cover restarts, multiple sessions and Bangkok midnight. |
| A10: no settings/login/deck selector | Pass | Source and UI inspection: none present. |
| A11: no vocabulary modification | Pass | No editing UI or vocabulary writes from app; persistence/export contains scheduling fields only. Source and copied deck SHA-256 both d844a8d2b9383d7d9979e54996f505cd75c8cff0799768147ecb8d65d3441f27. |
| A12: progress JSON schema | Pass | Actual app download/share handlers generate parseable File payload with exact Section 6.2 keys and reviewed-only schedule records. |

## Tests

`npm test`: 13 passing tests, including app handlers with jsdom and fake-indexeddb plus SRS fixtures. Production UI also checked manually through the browser. Simulators do not prove Android OS integration.

## Remaining owner phone check

Install the live HTTPS app in Chrome; launch from its home-screen icon and confirm the first card appears within two seconds. Disable Wi-Fi and mobile data, review, close/reopen, and finish a session. Share progress.json to OneDrive and verify the saved file in the book's Learning folder. Set the native Clock alarm to 08:40 daily; adjust it in Clock whenever needed.

## Technical notes

Notifications remain outside the PWA. Correction to the earlier categorical statement that Section 8.2 was outdated: compatibility sources conflict. Can I Use lists Chrome Android 152 as unsupported, while current MDN browser-compat-data lists showDirectoryPicker, showOpenFilePicker and showSaveFilePicker as added in Chrome Android 132, and Chrome's guide includes Android. Experimental/not-Baseline labels alone do not establish Android non-support. None of these sources proves reliable access to the owner's OneDrive folder. Keep the specified Web Share plus download flow; any future file-picker proposal needs verification on the actual device and storage provider before changing the design. No vault or spec files were changed for this correction.

Sources checked on 2026-09-12:
- https://caniuse.com/native-filesystem-api
- https://github.com/mdn/browser-compat-data/blob/main/api/Window.json (showDirectoryPicker, showOpenFilePicker, showSaveFilePicker)
- https://developer.chrome.com/docs/capabilities/web-apis/file-system-access