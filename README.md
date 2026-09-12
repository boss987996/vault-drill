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
- `MAX_NEW_PER_DAY = 10` is enforced across sessions by Bangkok calendar date.
- Owner approved 40 **distinct** cards per session, allowing repeat attempts beyond 40.
- Requeue after three remaining cards, or at the end if fewer than three remain. Repeating the final card is immediate; no filler cards are introduced.
- Early-return new/learning grades are persisted as due today with `last_review` today, so interruption cannot drop them.
- The spec's `card.last` is mapped to the data contract's `last_review`.
- History counts answer attempts; summary shows both distinct words and attempts. Streak advances once per Bangkok study day.
- The app preserves a completed summary on reopening when no further cards are due; a new session starts immediately if additional eligible cards remain.

## Verification

See `ACCEPTANCE.md` for evidence and remaining physical-device checks. Font licenses are included in the built `fonts` directory. There are no production npm runtime dependencies.
