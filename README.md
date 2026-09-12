# Vault Drill

An Android PWA for reviewing the owner's 76-word Thinking in Systems vocabulary deck. Opens straight to a card; no accounts, settings, backend, or vocabulary editing.

## Use

Open https://boss987996.github.io/vault-drill/ in Chrome on Android. Wait for “พร้อมทบทวนออฟไลน์”, then use Chrome's menu → Add to Home screen → Install. Open the home-screen icon to review. Tap the card to reveal; choose ลืม / ยาก / ได้ / ง่าย. Keyboard: Space/Enter reveals, 1–4 grades.

Set a daily **08:40** alarm in Android Clock named **Vault Drill**. Change the time in Clock whenever needed. The PWA does not schedule notifications.

After a session, choose **ส่งความคืบหน้าเข้า OneDrive**, select OneDrive, and save `progress.json` to your book's `Learning` folder. The share sheet still requires choosing a destination and confirming the save. If OneDrive does not accept the share, use **ดาวน์โหลด progress.json**, then upload that file with OneDrive. Progress stays in IndexedDB between sessions; exported JSON is a separate vault backup. v1 does not import backups. Clearing site data/uninstalling may remove local progress.

## Development and updates

Requires Node.js 24 and npm. Run `npm ci`, `npm test`, `npm run build`, then `npm run serve`. The local preview is http://127.0.0.1:4173/vault-drill/.

All source, dependencies, Git metadata, and builds belong outside the vault. `data/vocab.json` is a byte-for-byte build input snapshot, not an editable vocabulary source. To refresh from the owner's source, set the environment variable `VOCAB_SOURCE` to the authorized vault `Learning/vocab.json` path and run `npm run build`. Review and commit the copied data plus code. Do not modify card IDs or order. No vault files or progress exports belong in this repository beyond the explicitly approved vocabulary snapshot.

Push to `main`: GitHub Actions runs tests, builds the static PWA, and deploys `dist` to Pages. Set repository Settings → Pages → Source to **GitHub Actions**. App assets and fonts are precached together. Updates activate when all old app windows are closed, preserving IndexedDB; reopening loads the updated app. No background update resets a session.

## Scheduling decisions

- Section 5 formulas are preserved, including increased ease in Easy's interval calculation before the final clamp.
- `MAX_NEW_PER_DAY = 5` is enforced across sessions by Bangkok calendar date.
- `MAX_REVIEWS_PER_DAY = 60` counts distinct IDs rated today, not taps. Sessions admit up to 40 distinct cards; repeats can take total taps above 60. Overdue cards get the available daily slots before new words.
- Requeue after three remaining cards, or at the end if fewer than three remain. The third requeue-triggering rating for a card in one session defers it as learning, interval 1, due tomorrow. This applies to Forgot and Hard when Hard would requeue a learning card. Previews use the same policy; the underlying grade() formula is unchanged.
- Early-return new/learning grades are persisted as due today with `last_review` today, so interruption cannot drop them.
- The spec's `card.last` is mapped to the data contract's `last_review`.
- History counts answer attempts; summary shows both distinct words and attempts. Streak advances once per Bangkok study day.
- The app preserves a completed summary on reopening when no further cards are due; a new session starts immediately if additional eligible cards remain.

## Verification

See `ACCEPTANCE.md` for evidence and remaining physical-device checks. Font licenses are included in the built `fonts` directory. There are no production npm runtime dependencies.

## v1.2.1 progress log and migration

Export schema is now **2**, with an append-only `reviews` array. Each accepted rating records `id`, Bangkok-offset `at`, `grade`, `prev_interval`, `new_interval`, `elapsed_days`, and `ms`. Repeats are logged too. `elapsed_days` uses Bangkok calendar dates and is zero for first exposure or same-day repeats. `ms` measures question display to rating press; unavailable timing after suspension/restored answer is null. The answer, log, queue, and repeat count commit in one IndexedDB transaction. Existing review entries cannot be removed or rewritten through the storage layer.

Existing v1 stored progress migrates automatically with `reviews: []`; cards, streak, history, and existing progress remain. Unrecorded historic rating events are not invented. If an old session reserved ten new cards, the remaining unintroduced cards are trimmed to the new five-card allowance; already reviewed cards are preserved. A schema-1 object without internal introduction metadata conservatively admits no additional new words on previously studied migration dates. Future days get the normal five-word allowance. There is still no new file-import UI.

To receive an update, open the app online, close it and any other Vault Drill tabs, then reopen. Do not clear site data to update: that would erase local progress. Web Share, filename `progress.json`, MIME `application/json`, and download fallback are unchanged. A6 remains pending an actual phone-to-OneDrive save.