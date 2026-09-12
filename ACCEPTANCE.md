# Acceptance evidence

2026-09-12. Status is conservative: Android-only criteria are not claimed passed from a desktop browser.

| Criterion | Status | Evidence |
|---|---|---|
| A1: home-screen launch to first card under 2 seconds | Pending device verification | Local browser opened directly to interconnected without intermediate UI. Actual Android installed launch needs timing. |
| A2: full offline session | Pass in local browser; Android check pending | Stopped the local HTTP server, reloaded the cached app, and completed 10 distinct cards / 11 attempts. |
| A3: close/reopen retains progress | Pass in local browser | Reload after Forgot retained next card, counts, and repeat queue; persistent IndexedDB transaction commits answer and queue together. |
| A4: Forgot returns in same session | Pass | Browser showed interconnected again after exactly three intervening cards; tests also cover final-card repeat and >40 attempts. |
| A5: button interval matches scheduling | Pass | 144 preview/persist comparisons across states, grades, eases, intervals; browser new buttons show immediate/immediate/1 day/4 days. |
| A6: summary, next date, OneDrive export | Pass for UI; OneDrive device share pending | Offline summary showed 10 words, 11 attempts, promoted words, next date, share and download. Actual OneDrive save must be verified on Android. |
| A7: Thai text in both themes | Pending light verification | Bundled IBM Plex Sans Thai loaded and visually verified in dark. |
| A8: no horizontal scroll at 360px | Pass for tested states | At innerWidth 360, document scrollWidth 345; dark answer and summary visually inspected. |
| A9: at most 10 new cards on day one | Pass | Browser session introduced 10, left 66 untouched; tests cover restarting, repeat sessions and Bangkok midnight. |
| A10: no settings/login/deck selector | Pass | Single-screen implementation contains none. |
| A11: no vocabulary mutation | Pass | No edit UI or vocabulary write path; IndexedDB and export contain schedule fields only. Source deck SHA-256 d844a8d2b9383d7d9979e54996f505cd75c8cff0799768147ecb8d65d3441f27. |
| A12: exported JSON schema | Pass in engine test; browser file check pending | Exact Section 6.2 keys and reviewed-only schedule records asserted. |

## Owner Android check

Install from the live HTTPS URL; launch from the home-screen icon and time the first card. Turn on airplane mode, review, close/reopen, and finish a session. Test both Android light/dark themes. Share progress.json to OneDrive and confirm the file appears in the book's Learning folder. Set the daily Clock alarm for 08:40 (editable in Clock).
