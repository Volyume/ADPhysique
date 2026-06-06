# Phase 8: App Store metadata

Status: COMPLETE. Date 2026-06-06. Screenshot spec verified against Apple's
current screenshot-specifications reference.

## Already prepared (good)
`docs/APP_STORE_CONNECT_LISTING.md` holds production-ready, character-counted
copy. Note its "OUT OF SCOPE for v1" banner is now STALE: the App Store Connect
app record exists (App Apple ID 6777083702, created during the Build 6 upload),
so this listing is now live work.
- App name: `Volyume — Hypertrophy Logbook` (29 chars). Note: the name uses an em
  dash; the listing field is fine with it, but the in-repo voice rule bans em
  dashes, so if regenerating, prefer `Volyume: Hypertrophy Logbook`.
- Subtitle: `Log smarter. Grow faster.` (25).
- Promotional text: present (beta-free messaging).
- Bundle id `app.volyume`, Primary Category Health & Fitness, Secondary Sports,
  Primary language English (UK).
- Support `https://volyume.app/support`, Marketing `https://volyume.app`, Privacy
  `https://volyume.app/privacy`.

## Gaps / actions
- FINDING-H1 (High, blocks listing): SCREENSHOTS DO NOT EXIST. `assets/` has only
  icons/splash, no screenshots. Required: 6.9" iPhone at 1320x2868 px (portrait),
  1-10 images, PNG/JPEG RGB, NO transparency. iPad not required (iPhone-only app).
  Apple scales the 6.9" set down to smaller iPhones. Must be produced (manual).
- FINDING-M4 (Medium): full App Store description (up to 4000 chars) and keyword
  field (100 chars) should be confirmed/finalised in the listing doc. Lead the
  first paragraph with the strongest value line (no keyword stuffing).
- App icon: a 1024x1024 store icon must be exported flattened, RGB, no alpha, no
  rounded corners (Apple rounds). `assets/icon.png` / `volyume-icon.png` exist;
  confirm the store icon meets the no-alpha/no-rounding rule (the app icon asset
  often has alpha; the store icon must not).
- Age rating: complete the App Store Connect questionnaire. Given health/body
  data and the eating-disorder safeguard content, expect 12+; answer honestly.
- Version/build: marketing version 1.1.1, build owned by EAS autoIncrement (last
  was 6). For the first public submission set a clean version (e.g. 1.0.0 or keep
  1.1.x) and ensure the submitted build number is unique.
- "What's New": not required for the first submission; required for updates.
- App preview video: optional, recommended later. Not a blocker.

## Severity
H1 (screenshots) blocks the listing going live but is pure asset production, not
code. Everything else is prepared or a manual App Store Connect field. No code
changes here.
