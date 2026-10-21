# Stage 2 screenshot set: report

Run 2026-10-21 (second run today) against `/home/user/ADPhysique/public` on branch `site/rebuild-2026-10`, HEAD `3d90b6293` ("Merge build/site-review2: compliance review 2 fixes") for the whole run. The working tree was clean before and after; no git command that changes state was run, and nothing in the repo was edited, committed or fetched. Served with `python3 -m http.server 8766 --bind 127.0.0.1` (stopped at the end). Everything was recaptured from scratch. The previous run (HEAD `53470ed18`) is kept outside this folder, in `scratchpad/site/stage2_prev_53470ed18/`, only for comparison.

Output folder: `/tmp/claude-0/-home-user-ADPhysique/54247315-889f-591a-b4e7-bf68adfaf7c2/scratchpad/site/stage2/`
- `<slug>.png`: one labelled composite per page state (59 files, listed in section 2).
- `views/<slug>__<view>.png`: the 348 full-size full-page captures the composites are built from.
- `compare-*.png`: 5 sheets (section 3).
- `REPORT.md`: this file. `tools/`: the scripts (capture.mjs, jobs.mjs, stitch.py, composite.py, elshot.mjs, compare.py, linkcheck.py, report.py). `_work/`: raw metrics JSON per view (`_work/metrics/`), link results (`_work/links.json`), path lists, logs. The self-test view and composite are in `_work/`, not in the output root.

## Summary

- **Coverage.** 24 HTML pages under `public/` (members/ excluded) gave 59 captured states and 348 views, the same set as the previous run. Six views per state: 375 dark, 375 light, 1280 dark, 1280 light, 360 dark, 200% zoom. 200% zoom is a 180 CSS px wide viewport at device scale 2, which is a 360 px phone at browser zoom 200%. Two extra states: `home-menu` (mobile menu open, top 900 px, four mobile views) and `404-deep` (the 404 page served with a 404 status at an unmatched deep path, two views). Data-driven pages (c, challenge-terms, s, u, g, partner, survey, email/*, auth/*) are captured empty or not-found, and where the page fetches, with mocked data (all invented: no real person, gym or prize). The mocks answer the page's own Supabase calls; no request left the machine (4d, 4e).
- **Horizontal overflow: none. 0 of 348 views overflow (the previous run had 5, all on `/s/`).** Commit `af541a3c5` ("Let a long member name or handle wrap on the shared Community pages") adds `min-width: 0` and `overflow-wrap: anywhere` to `.author .name` and the other shared Community selectors in `public/assets/site.css`. Measured effect: `s-extreme` (a 45-character handle, beyond the 20 the app allows; informational) now fits at 375, 360 and 200% zoom, with the page width equal to the viewport; `s-limits` at 200% zoom went from 261 px to 180 px. The name wraps mid-word in the 180 px column (checked by eye in `s-extreme` at 200%). This run measured the effect and did not test the mechanism separately.
- **Clipped text: none.** No element with `overflow` hidden or clip has text cut off in any of the 348 views (4b). The detector still finds the planted faults on its synthetic page (4): 2 clipped blocks, 1 scroller, 1 off-screen offender.
- **At 200% zoom a long word still breaks mid-word, without overflowing.** `c-limits` at 200% shows the challenge title "Conditioni / ng" in the 180 px column (checked by eye; not measured). Readable, no horizontal scroll. Unchanged from the previous run.
- **Placeholder text is still visible on the challenge terms page.** `challenge-terms` (empty and mocked states) shows "Address: [Promoter postal address to be added before the first challenge]". The source is `public/challenge-terms/index.html` line 218 (`PROMOTER_ADDRESS`); the page's script comment says the line shows this marked placeholder until the real address is added. Listed because it is bracketed placeholder wording on a rendered page. No other TODO, TBC or lorem text exists in any page under `public/` except members/ (not searched).
- **Console.** The same as the previous run: only the browser's "Failed to load resource" lines for the 404 responses the mocks or the capture server returned on purpose (not-found and closed states, the deep 404 path) and one `favicon.ico` 404 on the `/privacy.html` redirect stub, which has no `<link rel="icon">`. No script errors, no broken images, no external request from any page.
- **Links.** 1,035 references on 24 pages, 56 distinct internal URLs, 10 external. Internal and https://volyume.app links: 0 broken, 0 missing fragment ids. External: 8 of 10 answer 200 or 203; the other two are bot challenges, not broken pages (section 5): the five PubMed links give a 203 bot-check shell and `dl.acm.org` gives a Cloudflare 403.
- **Paths against origin/main (e653a1617).** Removed 0, added 52, changed 28 (the previous run listed 23; `.well-known/README.md`, the store-style screenshots 02, 03, 05 and 06 now differ from main at HEAD), unchanged 10. `/privacy.html` is still a redirect stub to `/privacy/`; `robots.txt` and `sitemap.xml` are unchanged (section 6).
- **Compare sheets.** The served Progress picture is now the top 966 px of its render and stops above "Your progress", so no result shows (the intent of commit `749e79906`). The served workout-summary picture is the bottom 1,071 px of its render (from y 849, below the "Strongest workout" card). The previous compare script assumed every served picture was the top of its render, so that box was in the wrong place; this run measured the offset and corrected the script. The coaching picture still cuts the Confidence line. Section 3.


## 1. Captures

Every view is a full-page capture (tiled, stitched). Cell = document scrollWidth / viewport width; "ok" means no horizontal scroll. `c` = number of elements whose text is clipped by their own box (section 4). Full-size views are in `views/<slug>__<view>.png`; the labelled composite is `<slug>.png`.

| slug | path | state | 375 dark | 375 light | 1280 dark | 1280 light | 360 dark | 200% zoom | composite |
|---|---|---|---|---|---|---|---|---|---|
| `404` | `/404.html` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `404.png` |
| `404-deep` | `/articles/no/such/page/` | unmatched deep path, served as 404.html with a 404 status (what GitHub Pages does) | 375/375 ok | n/a | n/a | 1280/1280 ok | n/a | n/a | `404-deep.png` |
| `article-training-volume-when-to-add-sets` | `/articles/training-volume-when-to-add-sets/` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `article-training-volume-when-to-add-sets.png` |
| `article-when-to-change-your-calories` | `/articles/when-to-change-your-calories/` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `article-when-to-change-your-calories.png` |
| `article-why-explainable-coaching-beats-black-box` | `/articles/why-explainable-coaching-beats-black-box/` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `article-why-explainable-coaching-beats-black-box.png` |
| `articles` | `/articles/` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `articles.png` |
| `auth-callback` | `/auth/callback/?code=abc&state=def` | with sample query (redirect to volyume:// frozen) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `auth-callback.png` |
| `auth-confirm` | `/auth/confirm/` | empty (no token: error state) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `auth-confirm.png` |
| `auth-confirm-valid` | `/auth/confirm/?token_hash=abcdefghijklmnopqrstuvwxyz0123&type=signup` | valid token (hand-off to Supabase frozen) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `auth-confirm-valid.png` |
| `c` | `/c/` | empty (no code) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `c.png` |
| `c-finished` | `/c/?code=spring-26` | mocked finished challenge | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `c-finished.png` |
| `c-limits` | `/c/?code=spring-26` | mocked live challenge with title, gym and prizes at or near their field limits | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `c-limits.png` |
| `c-live` | `/c/?code=spring-26` | mocked live challenge | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `c-live.png` |
| `c-notfound` | `/c/?code=nosuch-26` | code not found (RPC returns null) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `c-notfound.png` |
| `challenge-terms` | `/challenge-terms/` | empty (no code; general terms and the not-found line) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `challenge-terms.png` |
| `challenge-terms-limits` | `/challenge-terms/?c=spring-26` | mocked challenge with title, gym and prizes at or near their field limits | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `challenge-terms-limits.png` |
| `challenge-terms-live` | `/challenge-terms/?c=spring-26` | mocked challenge | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `challenge-terms-live.png` |
| `email-preferences` | `/email/preferences/` | empty (no token) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `email-preferences.png` |
| `email-preferences-alloff` | `/email/preferences/?t=signedtoken1234567890` | mocked: after Turn all of these emails off (result, reason box) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `email-preferences-alloff.png` |
| `email-preferences-form` | `/email/preferences/?t=signedtoken1234567890` | mocked subscribed account (form) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `email-preferences-form.png` |
| `email-preferences-invalid` | `/email/preferences/?t=expiredtoken` | mocked invalid token (API 404) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `email-preferences-invalid.png` |
| `email-preferences-off` | `/email/preferences/?t=signedtoken1234567890` | mocked unsubscribed account (turn back on) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `email-preferences-off.png` |
| `email-unsubscribe` | `/email/unsubscribe/` | empty (no token or user id) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `email-unsubscribe.png` |
| `email-unsubscribe-done` | `/email/unsubscribe/?t=signedtoken1234567890` | with token, after pressing the button (mocked 200, reason box) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `email-unsubscribe-done.png` |
| `email-unsubscribe-token` | `/email/unsubscribe/?t=signedtoken1234567890` | with token, before pressing the button | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `email-unsubscribe-token.png` |
| `features` | `/features/` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `features.png` |
| `g` | `/g/` | empty (no id) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `g.png` |
| `g-invite` | `/g/?id=grp-7c1f&t=tok123456789` | with id and token | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `g-invite.png` |
| `get` | `/get/` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `get.png` |
| `home` | `/` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `home.png` |
| `home-menu` | `/` | mobile menu open (top of page only) | 375/375 ok | 375/375 ok | n/a | n/a | 360/360 ok | 180/180 ok | `home-menu.png` |
| `how-the-coach-works` | `/how-the-coach-works/` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `how-the-coach-works.png` |
| `p` | `/p/` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `p.png` |
| `partner` | `/partner/` | empty (no code) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `partner.png` |
| `partner-code` | `/partner/?c=K7M2QX9P4TZA` | with a code (carried to the Open button; no longer printed on the page) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `partner-code.png` |
| `privacy` | `/privacy/` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `privacy.png` |
| `privacy-html` | `/privacy.html` | redirect stub (meta refresh removed for the screenshot) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `privacy-html.png` |
| `s` | `/s/` | empty (no id) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `s.png` |
| `s-block` | `/s/?id=blk1` | mocked block complete | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `s-block.png` |
| `s-extreme` | `/s/?id=extreme1` | mocked PR with a 45-character handle (beyond the 20 the app allows; informational) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `s-extreme.png` |
| `s-limits` | `/s/?id=limits1` | mocked PR with name, handle and caption at the app limits | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `s-limits.png` |
| `s-milestone` | `/s/?id=mile1` | mocked milestone | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `s-milestone.png` |
| `s-note` | `/s/?id=note1` | mocked note (caption only) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `s-note.png` |
| `s-notfound` | `/s/?id=missing` | id not found (API 404) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `s-notfound.png` |
| `s-pr` | `/s/?id=pr1` | mocked personal record with caption | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `s-pr.png` |
| `s-programme` | `/s/?id=prog1` | mocked shared programme (link row) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `s-programme.png` |
| `s-session` | `/s/?id=sess1` | mocked training session | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `s-session.png` |
| `support` | `/support/` | default | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `support.png` |
| `survey` | `/survey/` | default (the original five-question survey) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `survey.png` |
| `survey-closed` | `/survey/?id=gone` | survey closed (API 404) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `survey-closed.png` |
| `survey-error` | `/survey/?id=first-month` | mocked survey after pressing send with required questions empty | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `survey-error.png` |
| `survey-generic` | `/survey/?id=first-month` | mocked survey with rating, 0-10, single, multi and text questions | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `survey-generic.png` |
| `survey-generic-thanks` | `/survey/?id=first-month` | mocked survey after sending (mocked 200) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `survey-generic-thanks.png` |
| `survey-thanks` | `/survey/` | original survey after sending (mocked 201) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `survey-thanks.png` |
| `u` | `/u/` | empty (no handle) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `u.png` |
| `u-limits` | `/u/?h=limitshandle` | mocked profile with every field at the app limits, three style chips, a programme | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `u-limits.png` |
| `u-notfound` | `/u/?h=nobody` | handle not found (API 404) | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `u-notfound.png` |
| `u-profile` | `/u/?h=samlifts` | mocked profile | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `u-profile.png` |
| `u-quiet` | `/u/?h=quietlifter` | mocked profile with no name, bio or stories | 375/375 ok | 375/375 ok | 1280/1280 ok | 1280/1280 ok | 360/360 ok | 180/180 ok | `u-quiet.png` |

## 2. Composite list

One PNG per captured page state, at most 2400 px wide, under 2 MB, with each of the six views labelled (viewport, document height, H-SCROLL where the page scrolls sideways, clip count). The 200% zoom column is drawn at half size.

| file | size px | bytes | page | state |
|---|---|---|---|---|
| `404.png` | 2389 x 1037 | 77,792 | `/404.html` | default |
| `404-deep.png` | 1697 x 1398 | 50,449 | `/articles/no/such/page/` | unmatched deep path, served as 404.html with a 404 status (what GitHub Pages does) |
| `article-training-volume-when-to-add-sets.png` | 2389 x 8153 | 821,279 | `/articles/training-volume-when-to-add-sets/` | default |
| `article-when-to-change-your-calories.png` | 2389 x 8273 | 831,497 | `/articles/when-to-change-your-calories/` | default |
| `article-why-explainable-coaching-beats-black-box.png` | 2389 x 7285 | 736,254 | `/articles/why-explainable-coaching-beats-black-box/` | default |
| `articles.png` | 2389 x 1951 | 175,830 | `/articles/` | default |
| `auth-callback.png` | 2389 x 1170 | 95,041 | `/auth/callback/?code=abc&state=def` | with sample query (redirect to volyume:// frozen) |
| `auth-confirm.png` | 2389 x 1151 | 89,343 | `/auth/confirm/` | empty (no token: error state) |
| `auth-confirm-valid.png` | 2389 x 1131 | 90,420 | `/auth/confirm/?token_hash=abcdefghijklmnopqrstuvwxyz0123&type=signup` | valid token (hand-off to Supabase frozen) |
| `c.png` | 2389 x 1025 | 70,526 | `/c/` | empty (no code) |
| `c-finished.png` | 2389 x 1173 | 92,693 | `/c/?code=spring-26` | mocked finished challenge |
| `c-limits.png` | 2389 x 2484 | 222,130 | `/c/?code=spring-26` | mocked live challenge with title, gym and prizes at or near their field limits |
| `c-live.png` | 2389 x 2146 | 173,848 | `/c/?code=spring-26` | mocked live challenge |
| `c-notfound.png` | 2389 x 1025 | 71,659 | `/c/?code=nosuch-26` | code not found (RPC returns null) |
| `challenge-terms.png` | 2389 x 4499 | 425,965 | `/challenge-terms/` | empty (no code; general terms and the not-found line) |
| `challenge-terms-limits.png` | 2389 x 4618 | 440,972 | `/challenge-terms/?c=spring-26` | mocked challenge with title, gym and prizes at or near their field limits |
| `challenge-terms-live.png` | 2389 x 4390 | 413,265 | `/challenge-terms/?c=spring-26` | mocked challenge |
| `email-preferences.png` | 2389 x 1100 | 81,868 | `/email/preferences/` | empty (no token) |
| `email-preferences-alloff.png` | 2389 x 1844 | 149,062 | `/email/preferences/?t=signedtoken1234567890` | mocked: after Turn all of these emails off (result, reason box) |
| `email-preferences-form.png` | 2389 x 1795 | 144,815 | `/email/preferences/?t=signedtoken1234567890` | mocked subscribed account (form) |
| `email-preferences-invalid.png` | 2389 x 1083 | 85,828 | `/email/preferences/?t=expiredtoken` | mocked invalid token (API 404) |
| `email-preferences-off.png` | 2389 x 1177 | 93,745 | `/email/preferences/?t=signedtoken1234567890` | mocked unsubscribed account (turn back on) |
| `email-unsubscribe.png` | 2389 x 1401 | 114,239 | `/email/unsubscribe/` | empty (no token or user id) |
| `email-unsubscribe-done.png` | 2389 x 1887 | 151,959 | `/email/unsubscribe/?t=signedtoken1234567890` | with token, after pressing the button (mocked 200, reason box) |
| `email-unsubscribe-token.png` | 2389 x 1186 | 94,396 | `/email/unsubscribe/?t=signedtoken1234567890` | with token, before pressing the button |
| `features.png` | 1873 x 16106 | 1,827,757 | `/features/` | default |
| `g.png` | 2389 x 965 | 65,076 | `/g/` | empty (no id) |
| `g-invite.png` | 2389 x 1302 | 113,606 | `/g/?id=grp-7c1f&t=tok123456789` | with id and token |
| `get.png` | 2389 x 2990 | 290,193 | `/get/` | default |
| `home.png` | 2389 x 8258 | 881,215 | `/` | default |
| `home-menu.png` | 1360 x 1030 | 72,322 | `/` | mobile menu open (top of page only) |
| `how-the-coach-works.png` | 2389 x 5763 | 578,642 | `/how-the-coach-works/` | default |
| `p.png` | 2389 x 1106 | 88,031 | `/p/` | default |
| `partner.png` | 2389 x 1156 | 92,618 | `/partner/` | empty (no code) |
| `partner-code.png` | 2389 x 1204 | 100,854 | `/partner/?c=K7M2QX9P4TZA` | with a code (carried to the Open button; no longer printed on the page) |
| `privacy.png` | 2389 x 14110 | 1,457,581 | `/privacy/` | default |
| `privacy-html.png` | 2389 x 657 | 20,166 | `/privacy.html` | redirect stub (meta refresh removed for the screenshot) |
| `s.png` | 2389 x 1036 | 70,835 | `/s/` | empty (no id) |
| `s-block.png` | 2389 x 1400 | 109,985 | `/s/?id=blk1` | mocked block complete |
| `s-extreme.png` | 2389 x 1598 | 140,779 | `/s/?id=extreme1` | mocked PR with a 45-character handle (beyond the 20 the app allows; informational) |
| `s-limits.png` | 2389 x 1640 | 144,226 | `/s/?id=limits1` | mocked PR with name, handle and caption at the app limits |
| `s-milestone.png` | 2389 x 1220 | 97,132 | `/s/?id=mile1` | mocked milestone |
| `s-note.png` | 2389 x 1212 | 99,598 | `/s/?id=note1` | mocked note (caption only) |
| `s-notfound.png` | 2389 x 1036 | 71,555 | `/s/?id=missing` | id not found (API 404) |
| `s-pr.png` | 2389 x 1304 | 108,127 | `/s/?id=pr1` | mocked personal record with caption |
| `s-programme.png` | 2389 x 1214 | 98,617 | `/s/?id=prog1` | mocked shared programme (link row) |
| `s-session.png` | 2389 x 1355 | 105,177 | `/s/?id=sess1` | mocked training session |
| `support.png` | 2389 x 4634 | 463,831 | `/support/` | default |
| `survey.png` | 2389 x 2012 | 171,366 | `/survey/` | default (the original five-question survey) |
| `survey-closed.png` | 2389 x 1036 | 77,540 | `/survey/?id=gone` | survey closed (API 404) |
| `survey-error.png` | 2389 x 2761 | 219,876 | `/survey/?id=first-month` | mocked survey after pressing send with required questions empty |
| `survey-generic.png` | 2389 x 2681 | 212,048 | `/survey/?id=first-month` | mocked survey with rating, 0-10, single, multi and text questions |
| `survey-generic-thanks.png` | 2389 x 1178 | 96,512 | `/survey/?id=first-month` | mocked survey after sending (mocked 200) |
| `survey-thanks.png` | 2389 x 1195 | 97,646 | `/survey/` | original survey after sending (mocked 201) |
| `u.png` | 2389 x 995 | 65,812 | `/u/` | empty (no handle) |
| `u-limits.png` | 2389 x 1919 | 171,289 | `/u/?h=limitshandle` | mocked profile with every field at the app limits, three style chips, a programme |
| `u-notfound.png` | 2389 x 995 | 66,524 | `/u/?h=nobody` | handle not found (API 404) |
| `u-profile.png` | 2389 x 1585 | 119,243 | `/u/?h=samlifts` | mocked profile |
| `u-quiet.png` | 2389 x 1157 | 86,554 | `/u/?h=quietlifter` | mocked profile with no name, bio or stories |


## 3. Compare sheets

Five sheets, each pairing a live page section (captured from the local copy of public/) with the app screen it shows, and one sheet pairing site components with the app's matching UI. App renders are `render/paper-renders/store/play/*.png` (1080 x 1920, dark theme, the store screenshots' source); the site pictures are `public/assets/screens/*-720.jpg` (what the page serves, with a .webp twin). Each served picture was matched against its render (grey-level block match at 1.5x) to fix its vertical placement; the results are in the notes below.

- `compare-home-today-and-log.png`: home hero with the Today screen, and "Log a workout set by set" with the set-logging screen. The Today picture is the top 1,038 px of the 1,920 px render (served 720 x 692); the set-logging picture is the whole render (720 x 1280). The orange box on the render marks the part the page shows.
- `compare-home-plans-and-food.png`: "Plans built around you" with the Train screen (served 720 x 670, the top 1,005 px; the Plan tools rows below it, which name injuries and conditions, are off the picture by the crop in commit affc3b556) and "Food that fits your day" with the Nutrition screen (whole render).
- `compare-home-coach-and-progress.png`: the weekly decision with the Coaching decision screen (served 720 x 834, the top 1,251 px; the line under "Confidence" that names the morning weigh-ins is still cut off) and "See what is working" with the Progress screen (served 720 x 644, the top 966 px; the crop now stops above "Your progress", so no result is shown; before commit 749e79906 the picture was 720 x 920 and showed more of the screen).
- `compare-features-screens.png`: the four-screen strip on /features/ (Workout summary, Food diary, Estimated recovery, Weekly coaching decision) at 1280 and 375 px, with each app render, the box the page shows, and the picture as served. Nutrition and recovery are whole renders. The workout-summary picture is the bottom 1,071 px of its render (from y 849, below the Strongest workout card), so its box sits on the lower part of the render; the decision picture is the top 1,251 px.
- `compare-ui-primitives.png`: the site's button, store buttons, card, note, list rows, option chips and headline at 3x (360 px at device scale 3, the same scale as the 1080 px app render) beside the nearest app UI. Observed differences, not defects: the site has no capsule shapes (tokens.css says radius.full is left out on purpose) so its buttons are rounded rectangles where the app's Apply and Start workout buttons are full pills; the site's note box has no leading info icon; the site's option chips are radio rows where the nearest app control is the segmented Feed / People / Groups / You selector. Colours, the amber primary, surfaces and the Inter type come from the app's theme through the generated tokens.css, and the two sides read as one family.
- Renders not used by the site pages: 07-recovery-speed and 10-community.

| file | size px | bytes |
|---|---|---|
| `compare-features-screens.png` | 2400 x 1380 | 209,467 |
| `compare-home-coach-and-progress.png` | 1989 x 1808 | 187,904 |
| `compare-home-plans-and-food.png` | 1989 x 1808 | 177,874 |
| `compare-home-today-and-log.png` | 1989 x 1808 | 161,896 |
| `compare-ui-primitives.png` | 2052 x 3565 | 228,122 |

## 4. Clipping

Method: the page is loaded at each viewport with network blocked except the local server (Supabase calls answered by mocks where a state needs data). Per view the script records `documentElement.scrollWidth` and `body.scrollWidth` against the viewport width, and walks every element under `<body>` that has `overflow` hidden/clip/auto/scroll to find (a) text that is cut off (`scrollWidth > clientWidth` or `scrollHeight > clientHeight` on a hidden/clip element with text), and (b) intended horizontal scrollers whose content is wider than the box. When the document overflows it lists the elements whose box leaves the viewport and are not already inside a clipping or scrolling ancestor. The 200% zoom view is a 180 CSS px wide viewport at device scale 2 (a 360 px phone at browser zoom 200%). The detector was self-tested on a synthetic page (below).

Self-test (`zz-selftest`, synthetic page): overflowX=True (scrollWidth 901/375), clipped elements found=2, scrollers found=1, off-screen offenders found=1. The page was built with one ellipsis-clipped line, one 900 px bar, one height-clipped block and one 400 px scroller, so 2 clipped, 1 scroller and at least 1 offender is the expected answer.

### 4a. Views with horizontal overflow

None. Every view of every page and state fits its viewport.

### 4b. Elements with clipped text

None. No element with `overflow: hidden|clip` on any page, state or view has text wider or taller than its box.

### 4c. Intended horizontal scrollers

None found.

### 4d. Other per-view observations

Broken images: none.

Document status other than 200: `404-deep` 375 dark 404; `404-deep` 1280 light 404

States whose expected content did not appear within 8 s: none.

Requests that left the local server and were blocked (the capture sandbox allows none): none.


Console errors and warnings (de-duplicated per page): 

- `404-deep`: log: Failed to load resource: the server responded with a status of 404 (Not Found) http://127.0.0.1:8766/articles/no/such/page/
- `email-preferences-invalid`: log: Failed to load resource: the server responded with a status of 404 (Not Found) https://sujrylzzxcqxxfygptns.supabase.co/functions/v1/member-email-public
- `privacy-html`: log: Failed to load resource: the server responded with a status of 404 (File not found) http://127.0.0.1:8766/favicon.ico
- `s-notfound`: log: Failed to load resource: the server responded with a status of 404 (Not Found) https://sujrylzzxcqxxfygptns.supabase.co/functions/v1/community-public?kind=post&id=missing
- `survey-closed`: log: Failed to load resource: the server responded with a status of 404 (Not Found) https://sujrylzzxcqxxfygptns.supabase.co/functions/v1/member-email-public?action=get_survey&id=gone
- `u-notfound`: log: Failed to load resource: the server responded with a status of 404 (Not Found) https://sujrylzzxcqxxfygptns.supabase.co/functions/v1/community-public?kind=profile&h=nobody

### 4e. Data requests made by the data-driven states (all answered by the capture mock, none reached the network)

| state | requests seen at the 375 dark view |
|---|---|
| `c-finished` | supabase (mocked 200) POST /rest/v1/rpc/gym_challenge_public |
| `c-limits` | supabase (mocked 200) POST /rest/v1/rpc/gym_challenge_public |
| `c-live` | supabase (mocked 200) POST /rest/v1/rpc/gym_challenge_public |
| `c-notfound` | supabase (mocked 200) POST /rest/v1/rpc/gym_challenge_public |
| `challenge-terms-limits` | supabase (mocked 200) POST /rest/v1/rpc/gym_challenge_public |
| `challenge-terms-live` | supabase (mocked 200) POST /rest/v1/rpc/gym_challenge_public |
| `email-preferences-alloff` | supabase (mocked 200) POST /functions/v1/member-email-public<br>supabase (mocked 200) POST /functions/v1/member-email-public |
| `email-preferences-form` | supabase (mocked 200) POST /functions/v1/member-email-public |
| `email-preferences-invalid` | supabase (mocked 404) POST /functions/v1/member-email-public |
| `email-preferences-off` | supabase (mocked 200) POST /functions/v1/member-email-public |
| `email-unsubscribe-done` | supabase (mocked 200) POST /functions/v1/member-email-public |
| `s-block` | supabase (mocked 200) GET /functions/v1/community-public?kind=post&id=blk1 |
| `s-extreme` | supabase (mocked 200) GET /functions/v1/community-public?kind=post&id=extreme1 |
| `s-limits` | supabase (mocked 200) GET /functions/v1/community-public?kind=post&id=limits1 |
| `s-milestone` | supabase (mocked 200) GET /functions/v1/community-public?kind=post&id=mile1 |
| `s-note` | supabase (mocked 200) GET /functions/v1/community-public?kind=post&id=note1 |
| `s-notfound` | supabase (mocked 404) GET /functions/v1/community-public?kind=post&id=missing |
| `s-pr` | supabase (mocked 200) GET /functions/v1/community-public?kind=post&id=pr1 |
| `s-programme` | supabase (mocked 200) GET /functions/v1/community-public?kind=post&id=prog1 |
| `s-session` | supabase (mocked 200) GET /functions/v1/community-public?kind=post&id=sess1 |
| `survey-closed` | supabase (mocked 404) GET /functions/v1/member-email-public?action=get_survey&id=gone |
| `survey-error` | supabase (mocked 200) GET /functions/v1/member-email-public?action=get_survey&id=first-month |
| `survey-generic` | supabase (mocked 200) GET /functions/v1/member-email-public?action=get_survey&id=first-month |
| `survey-generic-thanks` | supabase (mocked 200) GET /functions/v1/member-email-public?action=get_survey&id=first-month<br>supabase (mocked 200) POST /functions/v1/member-email-public |
| `survey-thanks` | supabase (mocked 201) POST /rest/v1/marketing_survey_responses |
| `u-limits` | supabase (mocked 200) GET /functions/v1/community-public?kind=profile&h=limitshandle |
| `u-notfound` | supabase (mocked 404) GET /functions/v1/community-public?kind=profile&h=nobody |
| `u-profile` | supabase (mocked 200) GET /functions/v1/community-public?kind=profile&h=samlifts |
| `u-quiet` | supabase (mocked 200) GET /functions/v1/community-public?kind=profile&h=quietlifter |


## 5. Link check

24 HTML pages scanned (members/ excluded), 1035 references (href, src, srcset, poster, action, og:/twitter: image and url, meta refresh): canonical 68, external 78, internal 862, mailto 26, scheme 1.

- Internal and https://volyume.app links resolved against the local tree: 930 references, 56 distinct URLs, **0 broken**. Fragment ids checked on the target page: **0 missing**.
- Empty href/src values: 0.
- `mailto:` 26, app scheme links 1 (not fetched).

External URLs, `curl -sS -L -o /dev/null -w "%{http_code}"` (a second try with a browser User-Agent is made when the first is not 2xx):

| URL | status | with browser UA | used on |
|---|---|---|---|
| https://apps.apple.com/gb/app/volyume/id6777083702 | 200 |  | 404.html, articles/index.html, articles/training-volume-when-to-add-sets/index.html, articles/when-to-change-your-calories/index.html, articles/why-explainable-coaching-beats-black-box/index.html, auth/callback/index.html, auth/confirm/index.html, c/index.html, challenge-terms/index.html, email/preferences/index.html, email/unsubscribe/index.html, features/index.html, g/index.html, get/index.html, how-the-coach-works/index.html, index.html, p/index.html, partner/index.html, privacy/index.html, s/index.html, support/index.html, survey/index.html, u/index.html |
| https://dl.acm.org/doi/10.1145/3571730 | 403 | 403 | articles/why-explainable-coaching-beats-black-box/index.html |
| https://play.google.com/store/apps/details?id=app.volyume | 200 |  | 404.html, articles/index.html, articles/training-volume-when-to-add-sets/index.html, articles/when-to-change-your-calories/index.html, articles/why-explainable-coaching-beats-black-box/index.html, auth/callback/index.html, auth/confirm/index.html, c/index.html, challenge-terms/index.html, email/preferences/index.html, email/unsubscribe/index.html, features/index.html, g/index.html, get/index.html, how-the-coach-works/index.html, index.html, p/index.html, partner/index.html, privacy/index.html, s/index.html, support/index.html, survey/index.html, u/index.html |
| https://pubmed.ncbi.nlm.nih.gov/22434603/ | 203 |  | articles/when-to-change-your-calories/index.html |
| https://pubmed.ncbi.nlm.nih.gov/24504358/ | 203 |  | articles/when-to-change-your-calories/index.html |
| https://pubmed.ncbi.nlm.nih.gov/27433992/ | 203 |  | articles/training-volume-when-to-add-sets/index.html |
| https://pubmed.ncbi.nlm.nih.gov/35291645/ | 203 |  | articles/training-volume-when-to-add-sets/index.html |
| https://pubmed.ncbi.nlm.nih.gov/37730925/ | 203 |  | articles/training-volume-when-to-add-sets/index.html |
| https://www.beateatingdisorders.org.uk | 200 |  | support/index.html |
| https://www.nature.com/articles/s42256-019-0048-x | 200 |  | articles/why-explainable-coaching-beats-black-box/index.html |

Notes on the external statuses (observed, then what it suggests):

- 8 of the 10 external URLs return 200 or 203 with `curl -sS -L`. The 5 PubMed URLs answer **203 with a 5,591-byte page titled "pubmed.ncbi.nlm.nih.gov"** (response headers carry `vary: X-NCBI-CAPTCHA`), which is NCBI's bot-check shell, not the article. So the 203 says the host is up and the path was accepted; it does not by itself prove the article page exists. To check the targets properly the five PMIDs were looked up through NCBI's E-utilities (`esummary`), and each returns the paper the article cites: 22434603 Hall et al., Am J Clin Nutr 2012 (energy balance); 24504358 Orsama et al., Obes Facts 2014 (weight rhythms); 27433992 Schoenfeld et al., J Sports Sci 2017 (dose-response volume); 35291645 Baz-Valle et al., J Hum Kinet 2022 (volume and hypertrophy review); 37730925 Bell et al., Sports Med Open 2023 (deloading Delphi consensus). Authors, titles, journals and years match the reference lines on the two articles.
- `https://dl.acm.org/doi/10.1145/3571730` returns **403 with `cf-mitigated: challenge` and a "Just a moment..." Cloudflare page**, with and without a browser User-Agent. That is a bot challenge, not a missing page. Crossref resolves the DOI (api.crossref.org: "Survey of Hallucination in Natural Language Generation", ACM Computing Surveys, 2023) and `https://doi.org/10.1145/3571730` answers 302 to the same dl.acm.org URL, which matches the reference line on the black-box article. Counted as a known bot-challenge, not a broken link.
- nature.com (Rudin, Nature Machine Intelligence) 200; Beat (beateatingdisorders.org.uk) 200; App Store listing 200; Google Play listing 200.


## 6. Paths against origin/main

Command: `git -C /home/user/ADPhysique ls-tree -r --name-only origin/main -- public` (local ref origin/main = e653a1617, not re-fetched) against `git ls-tree -r --name-only HEAD -- public` (HEAD = 3d90b6293, site/rebuild-2026-10). Changed paths from `git diff --name-status origin/main HEAD -- public`. 38 paths on origin/main, 90 on HEAD.

- **Removed** from origin/main: **0** (none: no URL that exists on main is gone).
- **Added**: **52**.
  - `public/assets/brand/`: `wordmark.png`, `wordmark@2x.png`, `wordmark@3x.png`
  - `public/assets/`: `facts.json`, `share.png`, `site.css`, `tokens.css`
  - `public/assets/fonts/`: `INTER_LICENSE.txt`, `Inter-Bold.ttf`, `Inter-Bold.woff`, `Inter-ExtraBold.ttf`, `Inter-ExtraBold.woff`, `Inter-Medium.ttf`, `Inter-Medium.woff`, `Inter-Regular.ttf`, `Inter-Regular.woff`, `Inter-SemiBold.ttf`, `Inter-SemiBold.woff`, `InterDisplay-Bold.ttf`, `InterDisplay-Bold.woff`, `InterDisplay-ExtraBold.ttf`, `InterDisplay-ExtraBold.woff`
  - `public/assets/icons/`: `IONICONS_LICENSE.txt`, `ionicons.svg`
  - `public/assets/screens/`: `coaching-decision-360.webp`, `coaching-decision-720.jpg`, `coaching-decision-720.webp`, `nutrition-360.webp`, `nutrition-720.jpg`, `nutrition-720.webp`, `progress-360.webp`, `progress-720.jpg`, `progress-720.webp`, `recovery-360.webp`, `recovery-720.jpg`, `recovery-720.webp`, `set-logged-360.webp`, `set-logged-720.jpg`, `set-logged-720.webp`, `today-360.webp`, `today-720.jpg`, `today-720.webp`, `train-360.webp`, `train-720.jpg`, `train-720.webp`, `workout-summary-360.webp`, `workout-summary-720.jpg`, `workout-summary-720.webp`
  - `public/features/`: `index.html`
  - `public/how-the-coach-works/`: `index.html`
  - `public/`: `robots.txt`, `sitemap.xml`
- **Changed in place** (same path, different content): **28**: `.well-known/README.md`, `404.html`, `articles/index.html`, `articles/training-volume-when-to-add-sets/index.html`, `articles/when-to-change-your-calories/index.html`, `articles/why-explainable-coaching-beats-black-box/index.html`, `auth/callback/index.html`, `auth/confirm/index.html`, `c/index.html`, `challenge-terms/index.html`, `email/preferences/index.html`, `email/unsubscribe/index.html`, `g/index.html`, `get/index.html`, `index.html`, `p/index.html`, `partner/index.html`, `privacy-policy.md`, `privacy.html`, `privacy/index.html`, `s/index.html`, `screenshots/02_know_what_to_do_today.jpg`, `screenshots/03_plan_that_moves_with_you.jpg`, `screenshots/05_log_every_set.jpg`, `screenshots/06_meals_planned_to_your_targets.jpg`, `support/index.html`, `survey/index.html`, `u/index.html`.
- **Unchanged**: 10 paths: `.nojekyll`, `.well-known/apple-app-site-association`, `.well-known/assetlinks.json`, `CNAME`, `auth/confirm/security.js`, `favicon.png`, `members/index.html`, `members/members.js`, `volyume-v.png`, `volyume-wordmark.png`.

Page URLs (non-members HTML): all 22 that exist on origin/main are still at the same URL (24 on HEAD; the two new ones are /features/ and /how-the-coach-works/).

**Redirects and stubs on HEAD**
- `/privacy.html`: on origin/main a full copy of the policy page. On HEAD a 500-byte stub: `<meta http-equiv="refresh" content="0; url=/privacy/">`, canonical to https://volyume.app/privacy/, `noindex`, plus a visible link. This is a client-side redirect (GitHub Pages cannot send a 301 for a file), so an old link or search result still lands on /privacy/ after a flash of the stub; the capture shows the stub with the refresh removed.
- `/p/`: retired link page (noindex), text "This link no longer works. Open Volyume to see Community."
- `/partner/`: no longer describes training partners; says invites have moved into Community and tells people to open the link in Volyume and follow the person who sent it. The code is carried to the Open button and is not printed.
- `/404.html`: served by GitHub Pages for any unmatched path with a 404 status. Uses root-relative asset paths so it also renders at a deep path (capture `404-deep`: /articles/no/such/page/).

**Crawl files**: robots.txt and sitemap.xml are new (neither exists on origin/main). The sitemap lists 10 URLs (home, features, how-the-coach-works, get, support, privacy, the articles index and its 3 articles), all of which exist, and every one of them says index, follow. Every page that is not in the sitemap is marked noindex (404, privacy.html, auth/*, c, challenge-terms, email/*, g, p, partner, s, survey, u), so the sitemap and the robots tags agree. Checked again in this run.

**Files kept but no longer used by any page in public/** (searched by path in every html, css, js, json, xml, md and svg file under public/, outside members/): `screenshots/02_know_what_to_do_today.jpg`, `screenshots/03_plan_that_moves_with_you.jpg`, `screenshots/05_log_every_set.jpg`, `screenshots/06_meals_planned_to_your_targets.jpg` and `volyume-v.png`. The four screenshots were re-cropped at HEAD (commit `749e79906`: "current compliant crops instead of the old captures"), so any outside link to them (a store listing, an email) now gets the new crops. Nothing in the rebuilt site points at them. `volyume-wordmark.png` is still used by members/. Non-page files that are data rather than links (`assets/facts.json`, `privacy-policy.md`, `robots.txt`, `assets/fonts/INTER_LICENSE.txt`) are not referenced from a page either, by design.


