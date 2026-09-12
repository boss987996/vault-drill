# Acceptance evidence — v1.2.1

2026-09-12. Live URL: https://boss987996.github.io/vault-drill/

The owner approved patching before A6 is completed, with the export/share mechanism locked against changes. A6 remains **Pending physical device verification**. A1 and A2 are owner-reported baseline passes, not agent-operated phone tests.

| Criterion | Result | Evidence |
|---|---|---|
| A1: home-screen launch within 2 seconds | Pass — owner-reported baseline | Owner measured 2 seconds on the existing build. No new device timing is claimed for this patch. |
| A2: offline session | Pass — browser regression; owner baseline passed | With the local server stopped, patched app reopened and completed five distinct words/seven ratings using all four buttons without errors. Owner had separately completed the baseline in airplane mode. |
| A3: interrupted session preserves state and review log | Pass — browser/integration regression | Closed/reopened patched app offline mid-session and after completion. IndexedDB tests verify migration, saved queue/repeat counters, SRS/log atomicity, aborted transactions and concurrent writes. Physical force-close after this patch has not been independently tested. |
| A4: Forgot requeues | Pass | Three-card gap retained; final-card repeats retained until the third requeue-triggering rating. |
| A5: displayed interval matches applied schedule | Pass | Existing formula fixtures retained; repeat-policy preview and persistence agree, including third-repeat one-day deferral. Browser confirmed the third-attempt labels. |
| A6: summary and actual OneDrive save | Pending physical device verification | Summary/export File payload tests pass. Share/download functions, filename, MIME and fallback are hash-locked to the approved baseline. This does not prove the Android share sheet or OneDrive received a file. |
| A7: Thai in light/dark | Pass — baseline plus unchanged-source check | Render markup, CSS/design tokens, font build pipeline and font packages remain unchanged. Baseline visually verified both themes. |
| A8: 360px without horizontal overflow | Pass — baseline plus unchanged-source check | Layout markup/CSS unchanged; no new controls or text blocks added. |
| A9: ten new words/day | Superseded | Replaced by A14. |
| A10: no settings/login/deck selection | Pass | Locked render markup and source inspection. |
| A11: vocabulary not modified | Pass | Source and copied input SHA-256: d844a8d2b9383d7d9979e54996f505cd75c8cff0799768147ecb8d65d3441f27; IDs/order unchanged. |
| A12: schema-2 progress JSON | Pass | Actual app-generated File parses with schema_version 2 and reviews, exact event fields, +07:00 timestamps and valid nullable ms. |
| A13: append-only review log | Pass | One event per accepted rating, including repeats; prefix integrity checked; rollback/concurrent-write tests show no lost or overwritten events. |
| A14: maximum five new words/day | Pass | Fresh browser session showed five; restart, migration of an old ten-card queue, prior ten-rated-card preservation, and midnight reset tested. |
| A15: no new words when overdue work consumes the cap | Pass | 63 overdue cards yield sessions of 40 and 20 distinct cards, zero new words, then no further admissions that day. Partial remaining-slot case tested too. |
| A16: final card at daily ceiling still repeats | Pass | Fixture rates card 60, keeps its repeat, and allows 62 total events for 60 unique cards. |
| A17: third Forgot defers until tomorrow | Pass | Exact third-Forgot fixture, counter persistence, final state learning/interval 1/due tomorrow, empty repeat queue and matching preview all asserted. Hard-on-learning also cannot loop forever. |

## Regression checks

29 tests pass. Locked-baseline hashes verify the SM-2 grade() function, render markup, CSS, manifest, vocabulary, and export/share/download block remain identical. The local browser test exercised the built assets with the HTTP server stopped. Automated simulators are not proof of Android/OneDrive integration.

The written Section 6.2 example still shows schema 1, but the explicit v1.2/1.2.1 handoff and A12 mandate schema 2; implementation follows that explicit requirement. No product spec was edited.

## Owner follow-up

Open the live app online once, then close all Vault Drill windows/tabs and reopen to activate the cached update. Existing progress migrates without clearing site data. Complete a session, use the unchanged OneDrive export button, and confirm progress.json arrives in the book's Learning folder. Until that confirmation, A6 stays pending. The owner handles the 08:40 native alarm.

## Compatibility note

Earlier documentation overstated the Android file-picker conclusion. Chrome documentation and MDN's compatibility data list Android support, while Can I Use disagrees. This patch retains Web Share/download and makes no claim that file-picker support proves OneDrive access. See Chrome's File System Access guide and MDN browser-compat-data api/Window.json; any future storage-provider change needs device verification and owner approval.