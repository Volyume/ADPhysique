# Store figures and the one-time setup

Task: LOC-662. Sources: `evidence-1-store-search` sections A, E, G and OP6 on LOC-583. Where a menu name below was not re-opened on the store this run, it says so.

## What each store can and cannot tell us

**Neither store reports free installs per search phrase.** Do not write "phrase X brought N installs" in any report.

| | App Store | Google Play |
| --- | --- | --- |
| Total installs from search and from browsing | Yes, by source type | Partly: "Google Play search" and "Google Play explore" |
| Per search phrase | No. App Analytics has source types but no search-term field. Per-keyword data exists only in Apple Ads reports for bid keywords, which Volyume does not run. | Only for phrases above a volume floor the console does not publish; everything else is grouped as "Other". At Volyume's size expect nearly everything in "Other". |
| What "search" includes | "App Store Search" mixes brand and generic searches | "Google Play search" is searches for the app's name or a closely linked brand; generic keyword searches, autocomplete and category searches are counted under "Google Play explore" |
| Delay and noise | Complete within about 3 days; the last 2 to 3 days are unreliable; low counts are noised for privacy | Monthly bulk files within 3 to 7 days; low-volume values become "Other" |

## Monthly procedure for total installs (by hand, no setup needed beyond a console login)

Do this in the first three days of each month, after `node scripts/store-position-check.cjs --out docs/growth-store-2026-11` (see `03-phrases-and-monthly-check.md`).

**App Store.** App Store Connect > Apps > Volyume > Analytics > Acquisition. Set the date range to the previous calendar month and the territory to United Kingdom. Read **Impressions**, **Product Page Views** and **First-Time Downloads** (Apple's label for units; confirm the label on screen), split by **Source Type**: App Store Search, App Store Browse, App Referrer, Web Referrer. Record the four source-type rows and the total. (Apple's search page, opened for the evidence file, confirms App Analytics can filter downloads by source type; the exact menu labels were not re-opened this run.)

**Google Play.** Play Console > Volyume > Grow users > Store performance (the page is called Store listing acquisitions in some console versions; menu names as in the Play help page opened for the evidence file, confirm on screen). Set the month, the country to United Kingdom and read the acquisition channels **Google Play search** and **Google Play explore** and the all-channel total. Since mid-2026 the main metric is unique clicks on Install, Open and Pre-register rather than acquisitions; record the metric the console shows and name it. Open the **search terms** table and copy it as shown; if it says "Other" for everything, write that.

**Write the month down** in `docs/growth-store-2026-11/figures-YYYY-MM.md`: the position table, the two stores' totals by source, the date read, and one line stating which numbers are noisy or incomplete. Never turn a rank into an install estimate. With a handful of installs a month, zero is a normal reading and is not evidence about the wording.

## One-time setup needed from the founder

The lead combines these into the single setup message. Nothing below was done by this task, and no agent holds a store login. The two credentials are created by the founder and stored only as platform secrets through the platform's secret flow, never in a comment, document or file.

### A. Fix the two store labels the wording cannot reach (decision for the founder)

1. **App Store Connect:** the two in-app purchases "Volyume Annual" (£19.99) and "Volyume Pro (Monthly)" (£1.99) still show on the public page ("Free · In-App Purchases"). The app sells nothing since 3 September 2026 (D137). Removing or retiring them is a billing-adjacent change, so it is the founder's decision; `CLAUDE.md` section 2 requires explicit permission before any billing change and none was taken. D137 already listed "deactivate subscription products" as a founder follow-up.
2. **Google Play Console:** the same two products show as "In-app purchases £1.99 – £19.99". Same decision.
3. **Both consoles:** the Data Safety and privacy answers must drop cardio as a collected type (open task H4, `docs/TASKBOARD.md` section 3).

### B. Apple: analytics reading and a limited App Store Connect key

Who: the Account Holder or an Admin, in App Store Connect.

1. **Analytics reading (no key needed, do this first):** open Analytics > Acquisition once a month as above, or give a named person the **Marketing** role (it can view App Analytics and file featuring nominations; confirm the role list on the Users and Access screen).
2. **For the agents to read analytics automatically:** an **Admin** creates the ongoing "App Store Discovery and Engagement" analytics report request for Volyume (only an Admin can create it, evidence-1 section G). After that, downloading the reports needs only a key with the **Sales and Reports** role (Apple's role labels on the key screen; pick the lowest role that lists analytics or sales reports).
3. **For wording changes and featuring nominations:** Users and Access > Integrations > App Store Connect API > Team Keys > generate a key with the role **App Manager**. This is the lowest role Apple lists that can edit version metadata and file featuring nominations. Apple cannot narrow it to "wording only": App Manager can also submit versions and change pricing. The limit is therefore a rule, not a permission: the key is used only to read, to set promotional text and (with the founder's go) to upload subtitle, keywords and description; it never submits a version or touches pricing or builds.
4. Download the private key file once (Apple shows it once) and keep the Key ID and Issuer ID. The founder stores all three as one platform secret; they are not pasted anywhere else.
5. Name the keys `volyume-growth-read` and `volyume-growth-wording` so they can be revoked separately. Revoke either at any time under the same screen.

What does not need a key: reading the public page and the position check. Subtitle, keywords and description still need a build submitted by the founder to take effect; promotional text does not.

### C. Google Play: a limited login or service account

Who: the Play Console account owner.

1. In Google Cloud (free), create a project, enable the **Google Play Android Developer API** and create a **service account**; create one JSON key for it.
2. In Play Console > Users and permissions, invite the service account's email address and grant it access to **Volyume only** with exactly these permissions: **Edit and publish store listing / "Manage store presence"** (page wording; the console's exact label may read slightly differently, the evidence file marks the exact name as unverified) and **"View app information and download bulk reports (read-only)"** (reading). Grant nothing else: no release permissions, no financial data, no user management.
3. Store the JSON key as a platform secret. Revoke by removing the user or deleting the key.
4. Limits to know: listing edits through the API need no new release, still go through Play's review (hours to seven days), and the Edits API works because Volyume already has a build uploaded. Play has no public search API, so rank on Play is read by hand or not at all.

### D. Pasting the wording yourself (no setup at all)

- **Google Play (no build needed):** Play Console > Grow users > Store presence > Main store listing. Paste the title, short description and full description from `02-store-wording.md`. Decide first about the "Six training styles" bullet (see that page).
- **App Store promotional text (no build needed):** App Store Connect > the app's version page > Promotional text.
- **App Store subtitle, keywords, description (with the next build):** paste into the version being submitted for the next build.
- **Featuring nomination:** `04-apple-featuring-request.md`, at least three weeks before the release date.
