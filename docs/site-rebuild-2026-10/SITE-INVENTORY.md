# SITE-INVENTORY: volyume.app (public/)

Read-only inventory for the website rebuild. No repo files were edited.
Repo: /home/user/ADPhysique, branch main, HEAD 078f174 (2026-10-21).
Scope: every file under public/ (38 files), every reference to them in the repo (node_modules excluded), and the deploy workflow.

Inbound tags used in section 3:
- APP-DEPENDS: the app, or Android or iOS association data, opens, links or shares it.
- EMAIL-DEPENDS: a Supabase email template or member-email function builds a link to it.
- STORE-LISTING: a Play or App Store listing field names it.
- INTERNAL-ONLY: reached only from other site pages, the team, or as a Pages fallback or asset. No app, email or store dependency.
- ORPHAN: nothing in the repo links to it. Tests or docs may still name it.

---

## 0. Headline counts

- Files under public/: 38. HTML 23 (includes 404.html), Markdown 2, JS 2, JSON 1, extensionless AASA 1, images 7, CNAME 1, .nojekyll 1.
- Pages with noindex: 13 of 23 HTML. Explicit index,follow: 8. No robots tag at all: 2 (get/index.html, p/index.html).
- HTML pages with inline script logic: 12. Plus members/index.html, which only loads members.js. Pages with no script: 10.
- Pages that call Supabase at runtime: 8 (c, challenge-terms, email/preferences, email/unsubscribe, s, survey, u, and members via members.js). auth/confirm also navigates to Supabase /auth/v1/verify.
- External hosts: play.google.com, apps.apple.com, pubmed.ncbi.nlm.nih.gov, dl.acm.org, nature.com, beateatingdisorders.org.uk, and sujrylzzxcqxxfygptns.supabase.co. No external script, font, stylesheet, or analytics host appears in any public file.
- Inbound classification: APP-DEPENDS 9 (c, challenge-terms, g, u, s, p, partner, the AASA, assetlinks.json). EMAIL-DEPENDS 7 (auth/confirm, auth/confirm/security.js, members, survey, email/preferences, email/unsubscribe, volyume-wordmark.png). STORE-LISTING 3 (/, /support/, /privacy/). ORPHAN 5 (get, privacy.html, privacy-policy.md, auth/callback, .well-known/README.md). The rest are INTERNAL-ONLY.
- Tests that read public/ or docs/web/ directly: 14 test files, listed in section 4.1.
- docs/web/: 4 files. Only docs/web/privacy.html is pinned (byte parity with public/privacy.html). docs/web/index.html has no test and differs from public/index.html.
- .nojekyll: present (0 bytes). Deploy uses the Actions artifact path (upload-pages-artifact, path ./public), so Jekyll does not run.

---

## 1. Every file under public/

Served URL is https://volyume.app plus the path. A folder index.html is served at the folder URL with a trailing slash. Bytes are from `stat`.

| # | Path under public/ | Served URL | Purpose | Bytes |
|---|---|---|---|---|
| 1 | .nojekyll | (marker, not a page) | Empty marker that stops Jekyll if Pages ever builds from a branch | 0 |
| 2 | .well-known/README.md | https://volyume.app/.well-known/README.md | Internal note on the assetlinks placeholders and the AASA rollout. Published in full | 2660 |
| 3 | .well-known/apple-app-site-association | https://volyume.app/.well-known/apple-app-site-association | iOS Universal Links payload: appID K79JA5JUF8.app.volyume, 8 paths | 321 |
| 4 | .well-known/assetlinks.json | https://volyume.app/.well-known/assetlinks.json | Android App Links template. The two REPLACE_WITH placeholders are filled from secrets at deploy | 322 |
| 5 | 404.html | any unmatched path (Pages serves it) | Pages fallback. Forwards /partner/CODE and /c/CODE to their landing pages, otherwise "Page not found" | 2809 |
| 6 | CNAME | (read by Pages) | Custom domain: volyume.app | 12 |
| 7 | articles/index.html | https://volyume.app/articles/ | Articles index | 6391 |
| 8 | articles/training-volume-when-to-add-sets/index.html | https://volyume.app/articles/training-volume-when-to-add-sets/ | Article: volume landmarks and when to add sets | 14829 |
| 9 | articles/when-to-change-your-calories/index.html | https://volyume.app/articles/when-to-change-your-calories/ | Article: calorie change decision framework | 14644 |
| 10 | articles/why-explainable-coaching-beats-black-box/index.html | https://volyume.app/articles/why-explainable-coaching-beats-black-box/ | Article: explainable versus black-box coaching | 14270 |
| 11 | auth/callback/index.html | https://volyume.app/auth/callback/ (also /auth/callback) | Compatibility page: forwards query and hash to volyume://auth-callback | 1686 |
| 12 | auth/confirm/index.html | https://volyume.app/auth/confirm/ | Email confirmation bridge. Validates token params, then hands to Supabase /auth/v1/verify | 3678 |
| 13 | auth/confirm/security.js | https://volyume.app/auth/confirm/security.js | Pure parser for token, type and redirect_to. Loaded by #12 | 3109 |
| 14 | c/index.html | https://volyume.app/c/ | Gym challenge landing. Reads the code from /c/CODE or ?code= | 10615 |
| 15 | challenge-terms/index.html | https://volyume.app/challenge-terms/ | Gym challenge terms, filled from ?c=CODE | 14867 |
| 16 | email/preferences/index.html | https://volyume.app/email/preferences/ | Email topic preferences (token t=) | 14271 |
| 17 | email/unsubscribe/index.html | https://volyume.app/email/unsubscribe/ | Stop news emails (token t=), plus the legacy user-id path (u=) | 11345 |
| 18 | favicon.png | https://volyume.app/favicon.png | Tab icon, linked by 22 of 23 HTML pages | 14598 |
| 19 | g/index.html | https://volyume.app/g/ | Group invite landing. Opens volyume://g/?id=&t= | 5180 |
| 20 | get/index.html | https://volyume.app/get/ | "Get Volyume" install page with store links and four screenshots | 12956 |
| 21 | index.html | https://volyume.app/ | Home landing: hero, feature screenshots, store links and badge, footer nav | 17386 |
| 22 | members/index.html | https://volyume.app/members/ | Private team admin page shell (noindex) | 9524 |
| 23 | members/members.js | https://volyume.app/members/members.js | Admin page logic. Its only network call is to member-email-admin | 163264 |
| 24 | p/index.html | https://volyume.app/p/ | Retired programme-share notice. Static, store links only | 3101 |
| 25 | partner/index.html | https://volyume.app/partner/ | Partner invite landing. Code from /partner/CODE, ?c= or the hash | 6577 |
| 26 | privacy-policy.md | https://volyume.app/privacy-policy.md | Markdown source of the privacy policy (served raw) | 12477 |
| 27 | privacy.html | https://volyume.app/privacy.html | Privacy policy, HTML copy A (byte-identical to #28) | 20080 |
| 28 | privacy/index.html | https://volyume.app/privacy/ | Privacy policy, HTML copy B. This is the URL the stores list | 20080 |
| 29 | s/index.html | https://volyume.app/s/ | Community training story card. Reads ?id= | 11904 |
| 30 | screenshots/02_know_what_to_do_today.jpg | https://volyume.app/screenshots/02_know_what_to_do_today.jpg | Feature screenshot (index, get) | 128172 |
| 31 | screenshots/03_plan_that_moves_with_you.jpg | https://volyume.app/screenshots/03_plan_that_moves_with_you.jpg | Feature screenshot (index, get) | 184949 |
| 32 | screenshots/05_log_every_set.jpg | https://volyume.app/screenshots/05_log_every_set.jpg | Feature screenshot (index, get) | 136529 |
| 33 | screenshots/06_meals_planned_to_your_targets.jpg | https://volyume.app/screenshots/06_meals_planned_to_your_targets.jpg | Feature screenshot (index, get) | 156224 |
| 34 | support/index.html | https://volyume.app/support/ | Support page: help topics, support@volyume.app, Beat signposting | 7191 |
| 35 | survey/index.html | https://volyume.app/survey/ | Survey: generic form by ?id= (optional t=), plus the legacy five-question form | 18484 |
| 36 | u/index.html | https://volyume.app/u/ | Community profile card. Reads ?h= | 11518 |
| 37 | volyume-v.png | https://volyume.app/volyume-v.png | Social share image (og:image and twitter:image) | 634791 |
| 38 | volyume-wordmark.png | https://volyume.app/volyume-wordmark.png | Wordmark logo. Header logo on 22 pages; also used in member-email HTML | 114676 |

---

## 2. HTML pages: title, robots, inline script, external URLs

Self-references (canonical, og:url, same-site images and links) are not listed as external.

| Page | <title> | Robots | Inline script (one line) | External URLs loaded |
|---|---|---|---|---|
| 404.html | Not found · Volyume | noindex, nofollow | Redirect: /partner/CODE (8+ alnum) goes to /partner/?c=CODE; /c/CODE (3 to 32 chars) goes to /c/?code=code | none |
| articles/index.html | Volyume articles: training and nutrition decisions | index, follow | none | play.google.com (store link) |
| articles/training-volume-when-to-add-sets/index.html | Training volume: how to know when to add sets (and when to hold) | index, follow | none | play.google.com; pubmed.ncbi.nlm.nih.gov/27433992/ and /35044672/ |
| articles/when-to-change-your-calories/index.html | When should you actually change your calories? A decision framework | index, follow | none | play.google.com; pubmed.ncbi.nlm.nih.gov/22258266/ and /25683066/ |
| articles/why-explainable-coaching-beats-black-box/index.html | Why an explainable coaching decision beats a black-box one | index, follow | none | play.google.com; dl.acm.org/doi/10.1145/3571730; nature.com/articles/s42256-019-0048-x |
| auth/callback/index.html | Open Volyume | noindex | Sets the Open button href and, after 500 ms, replace() to volyume://auth-callback + search + hash (not copied into the DOM) | none (custom scheme only) |
| auth/confirm/index.html | Confirming your email — Volyume | noindex | Parses token or token_hash, type (signup or recovery) and redirect_to with security.js. Invalid shows "This link can't be used". Valid sets Continue href to supabase /auth/v1/verify and, after 500 ms, replace() | sujrylzzxcqxxfygptns.supabase.co/auth/v1/verify (navigation); local ./security.js |
| c/index.html | Gym challenge · Volyume | noindex, nofollow | Reads the code (/c/CODE or ?code=). POSTs supabase rpc/gym_challenge_public with the anon key. Fills title, prizes, thresholds, scoring table, terms link. Play link carries referrer challenge=CODE. Finished statuses show a calm line. Errors show not-found | sujrylzzxcqxxfygptns.supabase.co/rest/v1/rpc/gym_challenge_public (fetch); play.google.com; apps.apple.com |
| challenge-terms/index.html | Gym challenge terms · Volyume | noindex, nofollow | Reads ?c=. One POST to the same rpc. Fills dates, draw sentences, prize lines. Promoter Volyume, support@volyume.app; postal line hidden (PROMOTER_ADDRESS is empty) | sujrylzzxcqxxfygptns.supabase.co rpc (fetch); play.google.com |
| email/preferences/index.html | Volyume: email preferences | noindex, nofollow | POSTs member-email-public with t and action get_preferences, set_preferences, turn_all_off, turn_all_on, unsubscribe_reason. Four topic checkboxes | sujrylzzxcqxxfygptns.supabase.co/functions/v1/member-email-public (fetch); play.google.com |
| email/unsubscribe/index.html | Volyume: email preferences | noindex, nofollow | With ?t=, unsubscribe runs on click only (never on load), then reason buttons call unsubscribe_reason. Legacy ?u= POSTs straight to REST marketing_email_optout (anon insert) | member-email-public (fetch); sujrylzzxcqxxfygptns.supabase.co/rest/v1/marketing_email_optout; play.google.com |
| g/index.html | Group invite · Volyume Community | noindex, nofollow | Builds volyume://g/?id=&t= (same shape as src/lib/community/links.js). iOS gets the App Store link. No id shows not-found. No fetch | apps.apple.com; play.google.com |
| get/index.html | Get Volyume | none | none | apps.apple.com; play.google.com |
| index.html | Volyume: the connected system for self-coached lifters | index, follow | none | play.google.com (link); play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png (badge image); apps.apple.com |
| members/index.html | Volyume members | noindex, nofollow (referrer no-referrer) | none inline; loads members.js (self) | none |
| members/members.js | (script, see row 23) | (script) | Sign-in with a one-time ?login= code, sessionStorage session, all admin screens. Single fetch to member-email-admin | sujrylzzxcqxxfygptns.supabase.co/functions/v1/member-email-admin (fetch); https://volyume.app/survey/?id= (text, copy-link) |
| p/index.html | Volyume Community (title id pageTitle) | none | none (static notice) | apps.apple.com; play.google.com |
| partner/index.html | Training partner invite · Volyume | noindex, nofollow | Code from /partner/CODE, ?c= or #hash (8+ alnum, uppercased). Sets volyume://partner/CODE. Hides the open button if no code. iOS gets the App Store link | apps.apple.com; play.google.com |
| privacy.html | Volyume privacy policy | index, follow | none | play.google.com |
| privacy/index.html | Volyume privacy policy | index, follow | none | play.google.com |
| s/index.html | Training story · Volyume Community | noindex, nofollow | Reads ?id=. GET community-public?kind=post&id=. Renders pr, session, block, milestone, note and programme cards with textContent. Programme card links /p/?id= | sujrylzzxcqxxfygptns.supabase.co/functions/v1/community-public (fetch); play.google.com; apps.apple.com |
| support/index.html | Volyume support | index, follow | none | play.google.com; beateatingdisorders.org.uk (Beat, support link) |
| survey/index.html | Volyume: a two-minute survey | noindex, nofollow | With ?id=: GET member-email-public?action=get_survey, POST submit_survey (optional t). Without id: legacy five-question form POSTs to REST marketing_survey_responses with optional user_id (u) and email_kind (k) | sujrylzzxcqxxfygptns.supabase.co/functions/v1/member-email-public (fetch); sujrylzzxcqxxfygptns.supabase.co/rest/v1/marketing_survey_responses (fetch); play.google.com |
| u/index.html | Profile · Volyume Community | noindex, nofollow | Reads ?h=. GET community-public?kind=profile&h=. Renders profile, programme links (/p/?id=) and story links (/s/?id=) | sujrylzzxcqxxfygptns.supabase.co/functions/v1/community-public (fetch); play.google.com; apps.apple.com |

Notes on page-level assets (all local, from the same origin):
- Shared stylesheet: none. Each page carries its own inline style block.
- favicon.png: linked from 22 pages. auth/callback is the exception.
- volyume-wordmark.png: header logo on 22 pages.
- og:image and twitter:image volyume-v.png: c, g, get, p, s, u.
- The anon JWT literal (same value) appears on c, challenge-terms, survey and email/unsubscribe. auth/confirm carries no key.

---

## 3. Inbound dependencies, per file

### 3.1 Pages

**/ (index.html): STORE-LISTING, INTERNAL-ONLY**
- docs/APP_STORE_CONNECT_LISTING.md:33 (Marketing URL https://volyume.app).
- Every page's brand link points to "/". 404.html links "Go to volyume.app".
- Not linked from app code or any email.
- Stale doc: DOMAIN_SETUP.md:3-8 (dated 2026-06-08) says the apex currently redirects to /privacy/ and that docs/web/index.html is the shelved landing. Observed: public/index.html has no meta refresh or location redirect, and it is the served landing.

**/articles/ and the three articles: INTERNAL-ONLY**
- Linked from index.html (nav, footer) and from each article's nav and footer.
- Cited only by marketing copy and HQ docs: marketing/hq/copy-library/community/quora-answers.md:32 and :131 (the when-to-change-your-calories article). Not in app code, emails or store listings.

**/get/: ORPHAN**
- No page in public/ links to it. index.html links only the #get anchor.
- The app never builds a /get link. src/lib/__tests__/attribution.test.js:47-48 parses ?src= from https://volyume.app/get, so the page is an attribution entry point if shared externally (external use is not in the repo).
- Pinned: src/__tests__/marketingClaimsGuard.test.js:60-61 and src/__tests__/community.earlyDays.guard.test.js:82.

**/support/: STORE-LISTING, INTERNAL-ONLY**
- docs/APP_STORE_CONNECT_LISTING.md:32 (Support URL), :379 (checklist); docs/IOS_GO_LIVE_STEP_BY_STEP.md:242-244.
- Play listing has no support-URL field. docs/PLAY_STORE_LISTING.md:96-102 lists a contact email only (line 101, a personal Gmail address).
- Linked from index.html, articles, and get/index.html.
- The app does not open /support. In-app support uses the address in src/screens/CreditsScreen.js:100 and src/screens/PrivacyPolicyScreen.js:280.

**/privacy/ (privacy/index.html): STORE-LISTING, APP-DEPENDS (dormant only), INTERNAL-ONLY**
- docs/PLAY_STORE_LISTING.md:102 (Privacy Policy URL); docs/APP_STORE_CONNECT_LISTING.md:34.
- src/screens/ProUpgradeScreen.js:654 opens https://volyume.app/privacy (no trailing slash). That screen is part of the dormant billing surface (CLAUDE.md section 1), so it is not a live runtime dependency. The in-app policy is native (src/screens/PrivacyPolicyScreen.js).
- Linked from index.html:149 and from most site pages. challenge-terms/index.html:186 links the section 9 anchor.
- Not verified here: whether GitHub Pages redirects the slash-less /privacy to /privacy/.

**/privacy.html: ORPHAN (byte-identical copy)**
- No page or store field links it. Named only by tests and docs.
- Parity pinned: src/__tests__/memberEmailWebsite.guard.test.js:287 (privacy/index.html must equal privacy.html); src/screens/__tests__/privacyTruth.guard.test.js:127.

**/privacy-policy.md: ORPHAN**
- No page or store field links it. docs/appstore-readiness-2026-06-06/appstore-01-review-guidelines-audit.md:66 names it as the source file.
- DOMAIN_SETUP.md:138-139 says it is hosted at /privacy-policy "or similar". No such route exists (stale).
- Pinned as content: src/screens/__tests__/privacyTruth.guard.test.js:88, :114, :155; src/__tests__/usageDataDisclosure.guard.test.js:24; src/__tests__/gymChallengePrivacy.guard.test.js:22; src/__tests__/memberEmailWebsite.guard.test.js:286.

**/auth/confirm/ (+ security.js): EMAIL-DEPENDS**
- supabase/email-templates/confirm-signup.html:121 and :159 build https://volyume.app/auth/confirm/?token=...&type=signup&redirect_to=... The template header says it must match the Supabase dashboard paste.
- The app does not open this page. The app's auth redirects use the custom scheme: src/lib/supabase.js:387 (OAUTH_REDIRECT_URL = 'volyume://'), :448, :477.
- security.js:10 also accepts type=recovery. The recovery template is not in the repo, so a recovery email may link here too. Not verifiable from the repo.
- Pinned: src/__tests__/universalLinksPreparation.test.js:5 and :51-57.

**/auth/callback/ (+ /auth/callback): ORPHAN (AASA-prepared only)**
- Listed in the AASA paths (public/.well-known/apple-app-site-association). Nothing opens it.
- app.json intent filters (lines 92-190) do not include /auth/callback. The custom scheme is the only redirect in src/lib/supabase.js (:387, :448, :477, :512, :758) and in docs/release/SIGN-IN-SETUP.md:47-48.
- iOS Associated Domains is absent (no associatedDomains in app.json; src/__tests__/campaign7.releaseConfig.test.js:59-62).
- Rollout plan: docs/security/daybreak-blue-2026-08-28/UNIVERSAL-LINKS-ROLLOUT.md:34-36 (serve the AASA as application/json, no redirect) and :40-65 (move redirects later).
- Pinned: src/__tests__/universalLinksPreparation.test.js:10-27.

**/c/ (gym challenge landing): APP-DEPENDS**
- Android verified App Link: app.json:181-190 (pathPrefix /c/, autoVerify, host volyume.app). The Android prefix set is pinned at src/__tests__/campaign7.releaseConfig.test.js:76.
- In-app route: src/navigation/RootNavigator.js:1076-1078 comment and :1078 ChallengeJoin 'c/:code'.
- 404.html forwards /c/CODE to /c/?code=CODE.
- Poster QR: supabase/README.md:851 (https://volyume.app/c/CODE), :861 (terms page fills from the code).
- Pinned: src/navigation/__tests__/linkingConfig.test.js:401-412 (intent filter and AASA /c/*), :370-375 (the poster and website URLs reach the route); src/lib/challenges/__tests__/landingPage.test.js:21 and :57-135; src/screens/__tests__/ChallengeJoinScreen.test.js:181-186; src/__tests__/challengeTermsPage.guard.test.js:30.

**/challenge-terms/: APP-DEPENDS**
- The app opens it: src/screens/ChallengeScreen.js:106-112 (openTerms calls Linking.openURL on termsLink(challenge)). The terms URL comes from the challenge's terms_url.
- DB default: supabase/migrate_201_gym_challenges.sql:933 builds https://volyume.app/challenge-terms/?c=CODE. docs/gym-challenge-2026-10-19/sql-test/test.sql:18 uses the same form.
- Linked from c/index.html (terms anchor set from the RPC row).
- Pinned: src/__tests__/challengeTermsPage.guard.test.js:29-30 and :54-200; src/screens/__tests__/ChallengeScreen.test.js:68 and :311; src/lib/challenges/__tests__/display.test.js:113-114.

**/g/ (group invite): APP-DEPENDS**
- app.json:166-180 (pathPrefix /g/, autoVerify). AASA /g/*.
- src/lib/community/links.js:127-129 (groupUrl) and :142-145 (groupInviteUrl, builds /g/?id=&t=). Shared through src/components/community/GroupInviteSheet.js.
- Pinned: src/lib/community/__tests__/links.test.js:101-111 and :171-180; src/__tests__/community.earlyDays.guard.test.js:21-48; src/screens/__tests__/CommunityGroup.test.js:82-83.

**/u/ (profile): APP-DEPENDS**
- app.json:121-135 (pathPrefix /u, autoVerify). AASA /u/*.
- src/lib/community/links.js:107-109 (profileUrl). The invite message is pinned at src/lib/community/__tests__/earlyDays.test.js:21-26 ("Join me on Volyume. ... https://volyume.app/u/?h=...").
- Pinned: src/lib/community/__tests__/links.test.js:28, :54, :58-60, :74; src/screens/__tests__/CommunityProfile.discipline.test.js:73.

**/s/ (story): APP-DEPENDS**
- app.json:151-165 (pathPrefix /s, autoVerify). AASA /s/*.
- src/lib/community/links.js:112-115 (storyUrl).
- Pinned: src/navigation/__tests__/linkingConfig.test.js:198; src/lib/community/__tests__/links.test.js:29.

**/p/ (retired programme page): APP-DEPENDS (legacy links route to Community)**
- app.json:136-150 (pathPrefix /p, autoVerify). AASA /p/*.
- src/lib/community/links.js:100 (PATHS.programme = 'p') and :207 (parses to kind 'hub'). A /p link opens the Community hub, not a programme.
- s/index.html:168 and u/index.html:179 still build /p/?id= links for programme cards.
- Pinned: src/lib/community/__tests__/links.test.js:58-60; src/__tests__/community.earlyDays.guard.test.js:95-100.
- Indexable: no robots tag.

**/partner/ (legacy invite codes): APP-DEPENDS (legacy)**
- app.json:106-120 (pathPrefix /partner, autoVerify). AASA /partner/*. 404.html forwards /partner/CODE.
- src/navigation/RootNavigator.js:978-980 (legacy comment): old codes route to Community with no code.
- Codes already out in share messages are the reason the page and filter still exist.
- Pinned: src/navigation/__tests__/linkingConfig.test.js:149-180; src/lib/community/__tests__/links.test.js:78 (a /partner path is not a community link); src/__tests__/community.earlyDays.guard.test.js:82-84.

**/members/ (+ members.js): EMAIL-DEPENDS, INTERNAL-ONLY**
- supabase/functions/_shared/memberEmail.ts:212-213 (adminLoginUrl builds /members/?login=NONCE), used for the sign-in email.
- supabase/functions/_shared/memberEmailServer.ts:132-133 (team email text and link "Open the members page").
- supabase/functions/member-email-admin/index.ts:5 (spec comment).
- Pinned: src/__tests__/memberEmailWebsite.guard.test.js:22-148 (see 4.1); :61 (members page loads only members.js), :140 (index.html must not mention /members).

**/survey/: EMAIL-DEPENDS**
- supabase/functions/_shared/memberEmail.ts:208 (surveyUrl builds /survey/?id=...&t=...), used in news emails.
- members/members.js:2234 (admin "Copy link" shows https://volyume.app/survey/?id=). The link is public and not tied to a member.
- marketing/hq/playbooks/retention-email-loop.md:63 (legacy /survey/?u=&k= form, planned loop). supabase/migrate_123_retention_email_loop.sql:174 names the public survey page as an anon-insert path.
- Pinned: src/__tests__/memberEmailWebsite.guard.test.js:30, :173-183, :222-236; supabase/functions/_shared/memberEmailV2_test.ts:151 (fixture).

**/email/preferences/: EMAIL-DEPENDS**
- supabase/functions/_shared/memberEmail.ts:203-205 (preferencesPageUrl). The unsubscribe page links to it (email/unsubscribe/index.html, JS line near 156, and static link line 108).
- Pinned: src/__tests__/memberEmailWebsite.guard.test.js:32, :199-220.

**/email/unsubscribe/: EMAIL-DEPENDS**
- supabase/functions/_shared/memberEmail.ts:196 (unsubscribePageUrl, used in the email footer). memberEmail.ts:199-201 is the RFC 8058 one-click URL, which posts straight to the function and needs no page.
- supabase/functions/_shared/memberEmail_test.ts:136-139 (footer fixture). supabase/migrate_124_marketing_email_optout_anon_insert.sql:3 (names the public unsubscribe page).
- Pinned: src/__tests__/memberEmailWebsite.guard.test.js:31, :213-219.

**/404.html: INTERNAL-ONLY (Pages fallback)**
- Served for unmatched paths; no page links it. Its forwards are what make the /partner/CODE and /c/CODE poster and invite paths land for people without the app (404.html comment; src/navigation/__tests__/linkingConfig.test.js:370-375 relies on the forwarded form).
- Not pinned by any test.

**/CNAME: INTERNAL-ONLY**
- .github/workflows/deploy-pages.yml:59 (custom domain comes back from public/CNAME). DOMAIN_SETUP.md:3-4 (Namecheap DNS to GitHub Pages).
- Not pinned by any test.

**/.nojekyll: INTERNAL-ONLY (build marker)**
- Not referenced by any test or workflow. See section 6.

**/.well-known/apple-app-site-association: APP-DEPENDS (prepared; no shipped iOS build uses it)**
- Used by iOS Universal Links only when the Associated Domains entitlement is on. It is off (app.json has no associatedDomains; campaign7 test at :59-62).
- Deploy gate: .github/workflows/deploy-pages.yml:126-133 (fails on any REPLACE_WITH).
- Pinned: src/__tests__/universalLinksPreparation.test.js:10-27 (appID and 8 paths); src/__tests__/campaign7.releaseConfig.test.js:59-62; src/navigation/__tests__/linkingConfig.test.js:410-411; src/__tests__/community.earlyDays.guard.test.js:34-38.
- Also referenced by .github/workflows/build-ios.yml:26-27 (comment), docs/release-readiness-2026-08-11/IOS-BUILD-CONTRACT.md, and the UNIVERSAL-LINKS-ROLLOUT.md above.

**/.well-known/assetlinks.json: APP-DEPENDS (Android App Links verification)**
- app.json:92-190 (autoVerify on every https intent filter).
- The repo file holds the placeholders. .github/workflows/deploy-pages.yml:77-111 injects the fingerprints at deploy from PLAY_APP_SIGNING_SHA256 and the upload keystore (the upload SHA-256 is derived with keytool, :84-90). The gate at :120-133 fails the deploy if a placeholder survives.
- No test reads assetlinks.json. Its only guard is the deploy step.

**/.well-known/README.md: ORPHAN (publicly served internal note)**
- Not linked. Excluded from the deploy's placeholder grep by design (deploy-pages.yml:123-124). Not pinned. Contains four em dashes.

**/favicon.png: INTERNAL-ONLY (asset)**
- Tab icon on 22 HTML pages (not auth/callback). Used as og:image in docs/web/index.html (docs only).
- Not pinned.

**/volyume-wordmark.png: INTERNAL-ONLY + EMAIL-DEPENDS**
- Header logo on 22 pages.
- supabase/functions/_shared/memberEmail.ts:36 (WORDMARK_URL = https://volyume.app/volyume-wordmark.png). Member-email HTML embeds it. supabase/functions/_shared/memberEmail_test.ts:138 asserts it.
- The public file itself is not pinned. (The app's own wordmark lives in assets/, not public/.)

**/volyume-v.png: INTERNAL-ONLY (social preview)**
- og:image and twitter:image on c, g, get, p, s, u.
- Not pinned as a file.

**/screenshots/*.jpg (4): INTERNAL-ONLY**
- index.html:173, :220, :229, :238 and get/index.html:121-124.
- Not the store listing screenshots. Those are separate uploads (scripts/paper-render/paper-render.test.js:613-614).
- Not pinned.

**/members/members.js: INTERNAL-ONLY** (loaded only by /members/).

**/auth/confirm/security.js: EMAIL-DEPENDS** (loaded only by /auth/confirm/; see 3.1).

### 3.2 Other repo references to the site (summary)

| Source | Reference | Pages it covers |
|---|---|---|
| app.json:92-190 | Intent filters: custom scheme volyume; https volyume.app pathPrefix /partner, /u, /p, /s, /g/, /c/ | partner, u, p, s, g, c (all autoVerify) |
| src/navigation/RootNavigator.js:1023 | linking prefixes 'volyume://' and 'https://volyume.app' | all app-link pages |
| src/navigation/RootNavigator.js:1069-1071 | message push uses volyume://m/?id= (CommunityConversation) | none (no /m page; see section 6) |
| src/lib/community/links.js:100-145 | builds /u/?h=, /s/?id=, /g/?id=&t= and parses /p/ as hub | u, s, g, p |
| src/lib/supabase.js:387, 448, 477 | OAUTH_REDIRECT_URL = volyume:// for auth | auth/callback, auth/confirm |
| supabase/email-templates/confirm-signup.html:121, :159 | /auth/confirm/ link | auth/confirm |
| supabase/functions/_shared/memberEmail.ts:34-36, 196-213, 1274 | SITE_ORIGIN, FROM_ADDRESS (news@volyume.app), WORDMARK_URL, unsubscribe, preferences, survey, admin login, allowed link hosts (includes www.volyume.app) | email/unsubscribe, email/preferences, survey, members, wordmark |
| supabase/functions/community-public/index.ts:4-5, 24-27 | comment and kinds: programme (returns notFound), post, profile, group | s, u |
| supabase/functions/member-email-admin/index.ts:5 | comment naming /members/ | members |
| supabase/migrate_124_marketing_email_optout_anon_insert.sql:3 | public unsubscribe page | email/unsubscribe |
| supabase/migrate_123_retention_email_loop.sql:174 | public survey page anon insert | survey |
| supabase/migrate_201_gym_challenges.sql:933 | default terms URL | challenge-terms |
| supabase/migrate_198_member_email.sql:4 | members page comment | members |
| supabase/README.md:851, 861 | poster QR https://volyume.app/c/CODE; terms page | c, challenge-terms |
| docs/APP_STORE_CONNECT_LISTING.md:32-34 | Support, Marketing, Privacy URLs | /support/, /, /privacy/ |
| docs/PLAY_STORE_LISTING.md:102 | Privacy Policy URL | /privacy/ |
| docs/release-readiness-2026-08-11/PLATFORM-REQUIREMENTS-2026-08-11.md:71 | account-deletion web link (open founder action, e.g. /delete-account) | none in public/ |
| docs/release/SIGN-IN-SETUP.md:38, :47-48 | Supabase redirect allow-list uses volyume:// | auth/callback (not used) |
| marketing/hq/GROWTH-LEDGER.md:10 | 2026-07-12 decision to host on Vercel; DNS repoint only after assetlinks.json, /privacy/ and /support/ are verified on Vercel | all |
| marketing/hq/copy-library/community/quora-answers.md:32, :131 | /articles/when-to-change-your-calories/ | articles |
| marketing/hq/playbooks/retention-email-loop.md:63 | /survey/?u=&k= | survey |
| marketing/hq/site-staging/ (index.html, survey/index.html, articles/*) | staging copies, not deployed. Articles identical to public/; index and survey differ | n/a |
| src/lib/__tests__/attribution.test.js:47-48 | /get?src= parsing | get |

---

## 4. Tests that read public/ (and what they pin)

Line numbers are from the current tree at 078f174.

### 4.1 Direct reads of public/ files

| Test file | Lines | Reads | Pins (constraint on the rebuild) |
|---|---|---|---|
| src/navigation/__tests__/linkingConfig.test.js | 401-412 | app.json, AASA (:410) | /c/ is in the Android intent filter (autoVerify, host volyume.app) and the AASA contains /c/* |
| src/__tests__/universalLinksPreparation.test.js | 5 | auth/confirm/security.js | the parser admits only the two Volyume callback endpoints or the legacy volyume://auth-callback; rejects other hosts, fragments and extra params (:28-49) |
| same | 10-27 | AASA (:12) | AASA appID ends app.volyume; exactly 8 paths, including /partner/*, /auth/callback, /auth/callback/, /u/*, /p/*, /s/*, /g/*, /c/* (:22, :27) |
| same | 51-57 | security.js | duplicate token or redirect_to is refused; type must be signup or recovery |
| same | 59-62 | app.json | Associated Domains stays absent until the signed profile carries it |
| src/__tests__/campaign7.releaseConfig.test.js | 56-62 | AASA (:61) | iOS Universal Links entitlement off; AASA appID ends app.volyume |
| same | 65-76 | app.json | Android https pathPrefixes are exactly ['/c/', '/g/', '/p', '/partner', '/s', '/u'] (:76). The Android set must not drift from the AASA |
| src/__tests__/community.earlyDays.guard.test.js | 21-32 | app.json | /u, /p, /s, /g/ are in the Android filter; bare /g is not (:27-28) |
| same | 34-38 | AASA | paths include /u/*, /p/*, /s/*, /g/* |
| same | 40-48 | g/index.html | the group page contains the exact volyume://g/?id= and &t= builders; fetches nothing; both store links; noindex |
| same | 68-77 | every public html | no REPLACE_WITH_APP_STORE_ID anywhere under public/ |
| same | 80-86 | get, u, s, p, partner, g | each carries the App Store link for id6777083702 |
| same | 95-100 | p/index.html | fetches nothing and never names community-public |
| src/lib/community/__tests__/links.test.js | 101-125 | g, u, s index.html | page code contains the exact builder strings: 'volyume://g/?id=' + encodeURIComponent(id), '&t=' + ..., 'volyume://u/?h=' and 'volyume://s/?id=' prefixes; g fetches nothing |
| src/lib/challenges/__tests__/landingPage.test.js | 21, 57-135 | c/index.html (its script is run in a DOM harness) | prizes, scoring, free-for-life line, terms href, store links with referrer=challenge=CODE, finished states (ended, closed, cancelled), og title and description with no "everyone who scores", no entrant count, no em dash in og (:130) |
| src/screens/__tests__/ChallengeJoinScreen.test.js | 181-186 | c/index.html | the free-for-life sentence verbatim in the page |
| src/__tests__/challengeTermsPage.guard.test.js | 29-30 | challenge-terms, c | ten numbered sections (:54-70); promoter Volyume and support@volyume.app (:111-122); postal line hidden unless set (:124-131); scoring table rows match c/ and the 80/20 split (:141-157); same rpc and anon constants (:160-168); exactly one fetch (:170-172); no tracking and one inline script (:188-197); no em dash (:188-190); lang en-GB (:199-201) |
| src/__tests__/marketingClaimsGuard.test.js | 60-75 | get/index.html | no R2 blacklist or population-claim terms in marketing copy |
| src/__tests__/memberEmailWebsite.guard.test.js | 28-32 | members, survey, unsubscribe, preferences, index.html | source reads for the next blocks |
| same | 59-70 | members, survey, unsubscribe, preferences | no external script or stylesheet; no cdn, googleapis, jsdelivr or unpkg; members.js has no import(), eval or Function |
| same | 73-82 | members.js | exactly one fetch (to member-email-admin); no XHR, beacon or WebSocket; no /rest/v1 or /auth/v1; inline script empty; no apikey or anon key |
| same | 84-111 | members.js | actions used must be documented by the admin function; ?action=upload_asset |
| same | 114-133 | members.js | admin structure and lint gating copy; Europe/London; send gated by audience, topic and test-send confirmations |
| same | 135-141 | members page; index.html (:140) | members page noindex; sessionStorage only (no localStorage, cookie or indexedDB); replaceState on login; index.html must not mention /members |
| same | 143-148 | members.js | server text via textContent only; preview in a sandboxed srcdoc with sandbox="" and no allow-scripts or allow-same-origin |
| same | 150-170 | members.js | send copy repeats the live count; em dash check in campaign text; People section copy; forbids "ED flag", "eating" and "calm mode is on for" in members.js |
| same | 173-183 | survey, unsubscribe | call only member-email-public plus their legacy REST endpoint |
| same | 185-197 | all four pages | every URL is on the allow-list: the Supabase project, volyume.app, play.google.com, example.com |
| same | 199-211 | preferences | calls only member-email-public; four topics; noindex |
| same | 213-220 | unsubscribe | four reasons; action unsubscribe_reason |
| same | 222-236 | survey | legacy form posts q_overall to q_more to REST marketing_survey_responses with Prefer return=minimal; #survey-form; legacy and generic containers |
| same | 284-289 | privacy/index.html (:287), docs/web/privacy.html (:288) | byte parity with public/privacy.html |
| src/__tests__/gymChallengePrivacy.guard.test.js | 19-22, 25-26 | app privacy screen, public privacy.html, privacy/index.html, docs/web/privacy.html, privacy-policy.md | each copy discloses gym challenges (adults only, no food or weight, shown only to the challenge's people) |
| src/__tests__/usageDataDisclosure.guard.test.js | 21-24, 26 | the same five copies | usage-data wording (counts only, six-month retention, improvement only) |
| src/screens/__tests__/privacyTruth.guard.test.js | 84-107 | privacy.html, privacy/index.html, privacy-policy.md, support/index.html | no stale export, food or billing claims; must contain "Settings &rarr; Your data" and "Volyume Score analysis metadata"; must not contain "Physique Scan metadata", "Download my data", "RevenueCat" and similar (:95-106) |
| same | 109-128 | all copies including docs/web/privacy.html (:115) | default-on Community sharing disclosed in every copy; htmlIndex equals html (:127); docsWeb equals html (:128) |
| same | 150-168 | all copies incl. docs/web and docs/PRIVACY_CONSENT_LOCKED.md | workout videos disclosed as device-only, never uploaded, deleted with the workout |
| same | 76 | PrivacyPolicyScreen.js | the in-app policy uses the branded support address |
| src/screens/__tests__/publicNoBilling.guard.test.js | 10-38 | every .html, .md, .txt, .xml, .json, .js and .css under public/, dot-folders included (so .well-known/assetlinks.json and README.md are walked) | no "£", "Pro plan", "free trial", "14 days free", "paywall", "per month" anywhere; no public/app-map directory (:23) |
| src/__tests__/workflowTrustBoundary.guard.test.js | 28, 34-38, 46 | .github/workflows/deploy-pages.yml | third-party actions pinned to 40-hex SHAs; no push trigger; the deploy job runs only on refs/heads/main |

### 4.2 Tests that name public/ pages through strings (no file read)

- src/navigation/__tests__/linkingConfig.test.js:370-375: the URLs the poster and the website hand to the OS, including the 404 forward https://volyume.app/c/?code=....
- src/lib/community/__tests__/links.test.js:54-80: parseCommunityLink accepts /u, /s, /g and /p (hub); rejects /partner and lookalike hosts.
- src/lib/__tests__/attribution.test.js:47-48: /get?src= and ?utm_source= parsing.
- supabase/functions/_shared/memberEmail_test.ts:136-139 and memberEmailV2_test.ts:44-45, :151 (fixtures).

### 4.3 Files with no test reading them

404.html, CNAME, .nojekyll, all articles/* files, auth/callback/index.html, get/index.html (only the copy and App Store pins above), index.html (only the negative /members check), volyume-v.png, volyume-wordmark.png (public copy), favicon.png, the four screenshots, .well-known/README.md, .well-known/assetlinks.json (only the deploy step), docs/web/index.html, docs/web/volyume-v.png, docs/web/volyume-wordmark.png.

---

## 5. docs/web/ (the mirror)

| File | Bytes | Identical to public/? | Keeping it in parity | Notes |
|---|---|---|---|---|
| docs/web/index.html | 17499 | No (public/index.html is 17386) | No test. Not deployed (deploy-pages.yml uploads public/ only) | Different <title> ("Volyume — Your plan adjusts to what you log."), no robots or canonical tag, og:image is favicon.png, leading UTF-8 BOM. DOMAIN_SETUP.md:6-7 calls it the shelved landing, not served |
| docs/web/privacy.html | 20080 | Yes (md5 3f1205ea2c577df9f521a8ee0b8e0511, same as public/privacy.html and public/privacy/index.html) | Strict byte parity: src/__tests__/memberEmailWebsite.guard.test.js:288; src/screens/__tests__/privacyTruth.guard.test.js:128 (copies.docsWeb toBe copies.html). Content pins: privacyTruth.guard.test.js:115, :156; src/__tests__/usageDataDisclosure.guard.test.js:23; src/__tests__/gymChallengePrivacy.guard.test.js:21 | The only docs/web file with a parity pin |
| docs/web/volyume-v.png | 634791 | Yes | None | Same bytes as public/volyume-v.png |
| docs/web/volyume-wordmark.png | 114676 | Yes | None | Same bytes as public/volyume-wordmark.png |

Net: parity is enforced for the privacy page only. The landing page mirror has drifted from public/index.html and nothing checks it.

---

## 6. .nojekyll, the deploy path, and the AASA

Facts:
- public/.nojekyll exists (0 bytes).
- .github/workflows/deploy-pages.yml is workflow_dispatch only (lines 8-9) and the deploy job runs only on refs/heads/main (line 27).
- The publish path is the Actions artifact path: actions/upload-pages-artifact with path ./public (lines 135-138), then actions/deploy-pages (lines 140-142). Not the branch-based "Deploy from a branch" source.
- The 2026-08-25 incident (deploy-pages.yml:36-59): GitHub unpublished the Pages site when the repo went private and back to public. Re-enabling needs a repo admin to set Settings, Pages, Source = GitHub Actions. The workflow cannot do it.

What that means:
- Jekyll does not run on the Actions artifact path, so .nojekyll is not needed for this deploy. It matters only if the Pages source is ever switched to a branch build. Jekyll would then skip dot-folders such as .well-known unless .nojekyll is present. Expected GitHub behaviour, not re-run here.
- The artifact is the directory as-is, so .well-known/ and .nojekyll are included. Expected from the action's packaging, not verified by a run.
- Serving /.well-known/apple-app-site-association:
  - The file has no extension, so Pages picks its Content-Type from a generic fallback. The rollout doc (docs/security/daybreak-blue-2026-08-28/UNIVERSAL-LINKS-ROLLOUT.md:34-36) requires application/json, served directly with no redirect. The live header was not checked in this read-only pass.
  - GitHub Pages has no per-repo header configuration, and nothing in public/ or the workflow sets headers (there is no _headers file). So the repo cannot make the Content-Type requirement true on the current host.
  - The deploy gate (deploy-pages.yml:120-133) checks only the file's content for REPLACE_WITH. It does not check headers or redirects.
  - Vercel, the planned host in marketing/hq/GROWTH-LEDGER.md:10, supports header rules in vercel.json. web/apps/web/vercel.json has none today. This is a capability note, not a verified setup.

---

## 7. Findings and constraints for the rebuild

1. Deploy gate. Deploy is manual and main-only. It fails unless the Android keystore secrets and PLAY_APP_SIGNING_SHA256 are set (deploy-pages.yml:77-133). Any rebuild that touches assetlinks handling must keep this fail-closed step.
2. Host decision pending. marketing/hq/GROWTH-LEDGER.md:10 (2026-07-12) records a decision to host everything on Vercel from web/, with DNS repointed only after assetlinks.json, /privacy/ and /support/ are verified identical there, and Pages retired after cut-over. Today's deploy still ships public/ to GitHub Pages.
3. web/ has no routes for the public pages. web/apps/web/src/app contains (app) routes for account, coaching, dashboard, marketing, plan, progress and settings, plus (auth)/sign-in, auth/callback/route.ts, and a root landing page. It has no route for /privacy, /support, /articles, /c, /g, /u, /s, /p, /partner, /email, /survey, /members or /challenge-terms. Inference from the route tree: a cut-over to web/ alone would leave these routes unserved.
4. Pinned behaviour (section 4). Keep the exact builder strings in g, u, s and c, the free-for-life sentence on c/, the Android prefix set and the 8-path AASA, and the three privacy copies byte-equal (privacy.html, privacy/index.html and docs/web/privacy.html). Keep index.html free of any /members reference.
5. Copy rules. Every public text file must avoid "£", "Pro plan", "free trial", "14 days free", "paywall" and "per month" (publicNoBilling.guard.test.js:26-33). The constitution asks for British English and no em dash in user-facing copy, but ESLint ignores public/** (eslint.config.js:108) and no test checks em dashes across public/. Visible em dashes exist at support/index.html:83 (intro paragraph), partner/index.html:7 (meta description), partner/index.html:87 (empty code placeholder) and auth/confirm/index.html:7 (title). Other em dashes sit inside HTML comments (index.html:323, s/index.html:22, u/index.html:22, and the three article pages).
6. Beat signposting. support/index.html:109 links beateatingdisorders.org.uk. CLAUDE.md section 2 makes Beat UK signposting inviolable (never remove or gate). Any rebuilt support page must keep it.
7. Internal material in served HTML. Comments visible to anyone who views source name internal documents: index.html:322-346 ("CLAIMS TABLE" citing PRODUCT-FACTS.md, with the three article pages at about lines 172-186); s/index.html:22 and u/index.html:22 (40-DECISIONS.md, blueprint section 8); c/index.html:22 (docs/gym-challenge-2026-10-19/SPEC.md); members/members.js:3 (docs/member-email-2026-10-17/PLAN-V2.md). .well-known/README.md is published in full.
8. Waitlist form missing. supabase/migrate_120_marketing_waitlist.sql:46-65 grants anon INSERT on marketing_waitlist. marketing/hq/DATA-SCHEMA.md:17-19 describes "the volyume.app waitlist signup form" writing with the anon key. No page in public/ or web/ contains a waitlist form (grep for "waitlist" finds none in either). Inference: the form is absent from this repo.
9. Account deletion web link. docs/release-readiness-2026-08-11/PLATFORM-REQUIREMENTS-2026-08-11.md:71 records an open founder action to confirm a public deletion-request page (for example /delete-account). public/ has no such page.
10. Store contact. docs/PLAY_STORE_LISTING.md:101 lists a personal Gmail address as the contact email. The site and the in-app policy use support@volyume.app (privacyTruth.guard.test.js:76).
11. Stale doc. DOMAIN_SETUP.md:3-8 (apex redirect, shelved landing) and :138-139 (/privacy-policy route) no longer match the tree. DOMAIN_SETUP.md:3-6 says the apex redirects to /privacy/; observed, public/index.html has no redirect.
12. www host. supabase/functions/_shared/memberEmail.ts:1274 allows links to www.volyume.app, but public/CNAME is the apex only and the repo has no www handling. Not verifiable from the repo.
13. /m/ route. src/navigation/RootNavigator.js:1023 accepts https://volyume.app prefixes, and the linking config maps 'm' to CommunityConversation (:1069-1071). app.json has no /m intent filter and public/ has no /m/ page, so an https /m/ link would fall through to 404.html. The message push hands the OS volyume://m/?id= instead (RootNavigator.js:1069-1071). Tests at src/navigation/__tests__/linkingConfig.test.js:301 use the https form.
14. Indexable pages with no robots tag. get/index.html and p/index.html. p is a retired notice still linked from s and u pages.
15. Legacy direct REST writes. The survey legacy form writes to marketing_survey_responses and the unsubscribe ?u= path writes to marketing_email_optout, both with the anon key (memberEmailWebsite.guard.test.js:222-236; supabase/migrate_123 and migrate_124). The test comments say these legacy paths must keep working, so old emails depend on them.
16. Anon key. The same anon JWT literal appears on c, challenge-terms, survey and email/unsubscribe. Supabase anon keys are public by design. Noted only so the rebuild keeps them consistent.
17. Lint. eslint.config.js:108 ignores public/**, so no lint rule covers this site (only the pinned tests in section 4).

---

## Method and limits

- Read: .github/workflows/deploy-pages.yml in full; every file in public/ (inline scripts read in full for every page with script; members.js read by targeted grep and its header, endpoints and storage paths); app.json intent filters; src/navigation and src/lib/community link code; src/lib/supabase.js redirect constants; supabase/email-templates and supabase/functions link builders; supabase migrations for URL comments; docs and marketing references; web/apps/web route tree.
- Not done: no live HTTP requests (live headers, Pages redirects and the live AASA Content-Type are not verified); no workflow run; no test execution. Line numbers are from the current tree.
- The scratch folder already contained other files (FACTS.md, render/, store.html). They were not read or changed.
