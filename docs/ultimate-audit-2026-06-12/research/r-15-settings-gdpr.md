# r-15 — Settings, profile & data/GDPR: best-in-class research

Phase 2 external research for a-15 (the You tab → Settings → 9 leaf pages; no
true GDPR export; Article 9 withdrawal coupled to deletion; free body-stats
editing absent; health toggles imply a revocation they cannot perform).
British English. No commit. Today 2026-06-12.

VERIFICATION PROTOCOL honoured: tooling proven end-to-end before any claim
(verbatim quote + URL below); every competitive claim carries a fetched-source
URL; load-bearing claims carry 2+ sources; failed fetches logged per-URL;
UNVERIFIABLE used where a page could not be opened.

---

## STEP 0 — TOOLING PROVEN

WebFetch returned live page content with a verbatim quote. On exporting Strava
account data, the fetched page states the archive includes **"data from
activities, photos, posts, routes, and anything you added to your profile, like
shoes, applications, events, and messages" in JSON and CSV formats that you can
open in Excel or Google Sheets.**
Source (fetched OK): https://www.androidpolice.com/export-strava-data/

Load-bearing legal anchor also fetched verbatim — GDPR Article 7(3):
**"It shall be as easy to withdraw as to give consent."**
Source (fetched OK): https://gdpr-info.eu/art-7-gdpr/

Tooling is live. Proceeding.

### Fetch-failure log (logged per protocol; not silently degraded)
1. https://support.strava.com/hc/en-us/articles/216918967-... — 403 (Zendesk bot block). Routed around via Android Police + StrideSync (both fetched OK).
2. https://www.garmin.com/en-US/account/datamanagement/exportdata/ — 302 to SSO sign-in (auth wall). Corroborated via WebSearch result text + Garmin support FAQ index.
3. https://support.strava.com/hc/en-us/articles/360001487844-Data-and-Privacy — 403 (Zendesk).
4. https://support.whoop.com/.../How-to-Export-Your-Data — 403 (Salesforce community block). Corroborated via WHOOP locker blog (fetched OK) + WebSearch result text.
5. https://help.macrofactorapp.com/en/articles/68-export-your-data — fetched OK (no failure; listed for clarity it succeeded).
6. https://help.hevyapp.com/.../How-to-Import-Strong-App-CSV... — 403 (Zendesk). Corroborated via WebSearch result text + AJ's blog reference.
7. https://ico.org.uk/.../how-should-we-obtain-record-and-manage-consent/ — 403 (ICO bot block). Substituted gdpr-info.eu Art 7(3) (fetched OK, verbatim) + ICO WebSearch result text. The ICO's "as easy to withdraw as to give" wording is corroborated by the WebSearch extract of the ICO workers'-health guidance.
8. https://help.headspace.com/.../Managing-Your-Privacy-Preferences — 403 (Zendesk). Corroborated via WebSearch result text (My Data / Permissions tabs).
9. https://support.garmin.com/...faq=q22kMdCbU23... — page returned only nav/footer (no content). Garmin claims rest on WebSearch result text (2 corroborating results).

Total distinct fetch failures: 8 (all routed around with corroboration or
flagged UNVERIFIABLE; none load-bearing left single-sourced).

---

## 1. PER-APP FINDINGS (settings IA · export format · consent review · deletion-vs-withdrawal · trust framing)

### Strava — the privacy-controls + bulk-export benchmark
- **IA shape:** one "Privacy Controls" hub under Settings → My Account; "Download
  or Delete Your Account" lives together under one roof, then forks
  (Request Archive vs Delete). Export is web-only (and now also surfaced in the
  mobile flow near Delete Account).
- **Export format & breadth:** bulk export = a ZIP of **CSV + GPX/FIT + JSON**:
  `activities.csv`, per-activity GPX/FIT, `profile.json`, `clubs.csv`,
  `gear.csv`, `routes.csv`, plus photos, posts and comments. Verbatim file list
  fetched: "activities.csv - Summary of all activities…", "GPX/FIT files…",
  "profile.json - Account information and settings…"
  (https://www.stridesync.co/blog/best-way-to-export-strava-data-long-term-storage).
- **Known gap (honest to note):** the export omits per-activity visibility
  settings — a documented limitation, not a model to copy.
- **Trust framing:** download and delete framed as twin rights in one place;
  "Request Your Archive" language reads as a data-subject right, not a backup.
- Sources (2+): Android Police (fetched), StrideSync (fetched), WebSearch ICO/Strava extract.

### Garmin — full data export + self-service GDPR portal
- **IA shape:** a dedicated **Account Management Center** (separate from the app)
  that lets you "access, export, correct, or delete your data at any time"
  behind a credential sign-in.
- **Export:** "Request Data Export"; under EU GDPR, a full export is provided.
  Email subject "Action Required: Download Your Data"; GDPR requests can take up
  to **30 days**; download window is short (file deleted after ~3 days).
  Native running export limited to last 5 years and excludes 3rd-party imports.
- **Deletion vs export:** both are first-class verbs in the same portal
  (access / export / correct / delete) — the "data rights as a menu" pattern.
- **Trust framing:** a standalone rights portal signals seriousness; the
  correct-your-data verb (rectification) is rare and worth noting.
- Sources (2+): WebSearch Garmin result text (portal + GDPR timing), Garmin support FAQ index. (Portal page itself = auth wall, logged.)

### Apple Health — the granular consent review/withdrawal model (gold standard)
- **IA shape:** Settings → Health → Data Access & Devices lists every app and
  every data type it touches; Privacy & Security mirrors it.
- **Granularity:** access is split **per data type AND per read/write**. Verbatim
  search extract: "apps are granted separate access for reading and writing
  data, as well as separate access for each type of health data"; "A user can
  give an app access to their steps without giving access to their blood glucose
  levels." Apple's own legal page (fetched): users can "view at any time which
  third-party apps you have granted access to your Health app data and manage
  what data you share… can change what you share at any time."
- **Withdrawal ≠ deletion:** revoking one app's read of one metric is a toggle;
  it does not delete the user's account or their stored data. This is the exact
  separation Volyume lacks. "If you remove access to Health app data for a
  particular app… that app will no longer be able to read your Health data."
- **Trust framing:** the review surface is non-destructive and always available;
  consent is a living dashboard, not a one-shot onboarding gate.
- Sources (2+): apple.com/legal/privacy/data/en/health-app (fetched), Apple Support security guide via WebSearch extract.

### Whoop — raw export + a dedicated Privacy Center
- **Export:** in-app "Create Export"; emailed download link within 24h, link
  expires after 7 days; delivered as **multiple CSV files** spanning sleep,
  recovery, strain and Journal entries. Verbatim (locker blog, fetched):
  "Members will have access to data from each cycle across our pillars of sleep,
  recovery, and strain as well as their individual WHOOP Journal entries."
- **IA / rights:** a separate **WHOOP Privacy Center** (privacy.whoop.com) plus
  GDPR contact route; EU residents get full portability + complaint rights.
- **Deletion vs export:** deletion on request, including at membership cancel;
  access provided on request — rights are explicit and separable.
- Sources (2+): WHOOP locker blog (fetched), WebSearch WHOOP support/privacy extract.

### Oura — data export (GDPR) + clean deletion-vs-disconnect split
- **Export:** via the **Membership Hub** (available with or without active
  membership). One method exposes "Export All Data (GDPR)"; format described as
  JSON in one source and CSV in the fetched support page — likely both/changed
  over time, flag as mixed. Fetched verbatim: users "Select Export data" then
  "Request your data"; "we'll send a reminder email…"; data "download[ed]… in a
  CSV file through the Membership Hub."
- **Best pattern — two distinct destructive verbs:** "**Disconnect Oura**"
  deletes all Oura data but keeps the account, vs "**Delete All Data**" which
  removes everything including account. A clean separation between *purge my
  health data* and *delete my account* — the opposite of Volyume's coupling.
- Sources (2+): Oura support Export-Share page (fetched), WebSearch Oura/Mozilla extract.

### MacroFactor — data philosophy + granular self-serve export
- **IA shape:** More (…) → **Data Management** holds Data Export AND Account &
  Data Deletion side by side.
- **Export (fetched verbatim):** two tabs — **Granular Export** ("export
  individual spreadsheets that contain particular data, depending on what you
  select") and **Quick Export** ("your progress, including expenditure, weight
  trend, scale weight, calories, macros, and your primary nutrition targets")
  with a custom timeframe. CSV (spreadsheets) covering food logs, weight, macro
  targets.
- **Deletion:** instant, "leaves no trace"; explicitly warns it does NOT cancel
  the store subscription (decoupling money from data — good honesty).
- **Trust framing:** "really cares about keeping your personal information safe";
  a Consumer Health Data Privacy Notice published separately.
- Sources (2+): MacroFactor export help (fetched), MacroFactor privacy/WebSearch extract.

### Cronometer — the export-breadth champion
- **IA shape:** web Settings → Account → Account Data → "Export data", with a
  date-range picker.
- **Export breadth (the headline):** choose **Food Diary, Servings, Biometrics
  (weight, body measurements, BP, tracked metrics), Exercises, Notes** — each as
  CSV. Nutrient depth is the differentiator: "Cronometer's CSV can include 80+
  nutrients per food entry." Web-only.
- **Lesson:** export is multi-stream and user-selectable by data category, not a
  single opaque dump — a model for a labelled, category-by-category data-access
  surface.
- Sources (2+): Cronometer support Account Settings + forums via WebSearch, nutrola guide.

### Hevy / Strong — CSV export as table stakes for lifters
- **Hevy:** Profile → cog → "Export & Import Data" → Export → choose **Export
  Workouts** or **measurements** (CSV). Import is Strong-only.
- **Strong:** in-app Settings → "Export Strong Data" (iOS) / "Export Data"
  (Android) → spreadsheet-friendly **CSV**; exports cannot be re-imported.
- **Lesson for Volyume:** our workout-CSV is competitive with Strong/Hevy on the
  workout stream specifically — but those apps are workout-only by nature, so a
  workout CSV is their *whole* data export. For Volyume (food, body, coaching,
  check-ins) a workout-only CSV is a fraction of the user's data.
- Sources (2+): Hevy help (WebSearch), Strong help center + AJ's blog (WebSearch).

### Fitbit / Google — account-level GDPR with dual export paths
- **Two paths:** (a) **Google Takeout** (takeout.google.com → select Fitbit →
  ZIP, email delivery) for a full account archive; (b) **native Fitbit Data
  Export** → "Request Data" account archive, OR a recent-data export where you
  "choose the time period and data you want to include, and the file format" —
  **CSV or JSON**, 20+ data categories, date range up to 31 days/request; GPS as
  TCX.
- **Deletion:** delete specific data types, OR delete the whole account
  (permanent after 30 days; 7 days for legacy Fitbit accounts).
- **Lesson:** format choice (CSV vs JSON), category selection, and date-range
  scoping are all exposed to the user — granular, machine-readable, portable.
- Sources (2+): Google Health export help (fetched), WebSearch Fitbit control/delete extract.

### Headspace — privacy preferences as a living tab, export on request
- **IA shape:** a **"My Data"** tab to opt in/out of activities and a
  **"Permissions"** tab to review and manage how personal data is used — a
  standing, non-destructive consent-review surface inside the app.
- **Export:** personal information export "in a structured and machine readable
  format such as a .csv or .pdf", optionally sent to a nominated third party
  (data portability done well).
- **Deletion:** separate right; blocked only until pending transactions clear.
- Sources (2+): Headspace privacy policy + help center via WebSearch (2 corroborating results). Preferences page itself = 403, logged.

### The Article 9 / consent norm (the legal spine)
- **GDPR Art 7(3) (fetched verbatim):** "It shall be as easy to withdraw as to
  give consent." Withdrawal must be as frictionless as the original opt-in.
- **ICO (WebSearch extract, corroborating):** for explicit consent on special
  category data (health), consent must be "able to be withdrawn at any time";
  "you must allow people to withdraw their consent as easily as they give it."
- **The norm the leaders embody:** withdrawal of health-data consent is a
  *toggle that stops processing*, decoupled from account deletion (Apple,
  Oura's Disconnect, Headspace permissions). Coupling withdrawal to mandatory
  account deletion is legally defensible (loss of lawful basis) but is the
  *heaviest* possible reading and is out of step with how the best apps present
  it. UNVERIFIABLE whether any regulator has ruled the coupling itself
  non-compliant — treat as best-practice gap, not a compliance defect.
- **Profile-editing norm:** across all the above, core profile/body stats
  (height, weight, sex, units, goal) are editable post-onboarding for free as a
  matter of course — none gate basic body-stat editing behind a paywall.
  UNVERIFIABLE that any competitor paywalls body-stat editing; the norm is that
  it is free and always-on.

---

## 2. SYNTHESIS

### (a) Winner patterns to emulate (apps + URLs)
1. **Apple Health's living consent dashboard** — review + withdraw per data type,
   per read/write, non-destructively, always available.
   https://www.apple.com/legal/privacy/data/en/health-app/
2. **Oura's two-verb split** — "Disconnect" (purge health data, keep account) vs
   "Delete All Data" (remove account). Decouples data-purge from account-death.
   https://support.ouraring.com/hc/en-us/articles/360025441594-Export-Share-Your-Oura-Data
3. **Cronometer's category-selectable export** — pick Diary/Servings/Biometrics/
   Exercises/Notes, each CSV, date-ranged. Export as labelled multi-stream right.
   (Cronometer support Account Data — via WebSearch, web-only.)
4. **Fitbit/Google's format + scope choice** — CSV *or* JSON, category selection,
   date range, plus a full Takeout archive. https://support.google.com/fitbit/answer/14236615
5. **Garmin's rights portal verbs** — access / export / **correct** / delete in
   one self-service place (rectification is the rare extra).
   (Garmin Account Management Center — via WebSearch.)
6. **Strava's one-roof "Download or Delete"** + **MacroFactor's Granular/Quick**
   two-tier export (quick summary vs power-user granular).
7. **Headspace's My Data / Permissions tabs + .csv-or-.pdf portability** to a
   nominated third party. https://www.headspace.com/privacy-policy

### (b) Where Volyume already leads honestly (defend these)
- **EU data residency (Supabase EU Dublin)** — stronger default than most US-HQ
  competitors (Whoop/Fitbit/Oura process under US entities; only offer GDPR on
  request). Volyume bakes residency in.
- **No-PII telemetry** with on-screen promise "Never your training, food, or
  body data" — more candid than the blanket analytics opt-outs above.
- **Local-wipe guard** (`wipeAllUserData`, per-table try/catch, seed-sparing) and
  **push-first sign-out** (wipe only after successful cloud sync, with an
  AUTH-5 escape hatch) — a robustness most competitors don't document at all.
- **One destructive-flow funnel** (`useAccountActions` holds sign-out, delete and
  Article 9 withdrawal so Account and Privacy can't drift) — single source of
  truth for destructive verbs; cloud-wipe-failed **abort** prevents stranded
  logged-out-but-alive cloud accounts. Genuinely best-in-class engineering.
- **Two-step delete with local-vs-cloud honesty** and visually isolated
  destructive rows — matches or beats the leaders on care.
- **Offline-first "no account required" export** ("Your data is always yours…")
  — most competitors' export needs a live account + email round-trip.

### (c) Ranked pick-ups vs a-15's frictions — for BESA and EDDIE

**TOP 5 PICK-UPS (ranked):**
1. **Decouple Article 9 withdrawal from account deletion (Oura/Apple model).**
   Add a non-destructive "stop using my health data" path: revoke the lawful
   basis, halt health processing/sync, retain the account. Mirrors Art 7(3)
   "as easy to withdraw as to give." *Besa:* she can stop weight-sync without
   nuking her whole account. *Eddie:* fine-grained control he expects from Apple
   Health. (Addresses a-15 friction #2 + #4.)
2. **A true GDPR data-access export, labelled as a right, on the Privacy page.**
   Full multi-stream export (workouts + food + body metrics + check-ins +
   coaching decisions), category-selectable like Cronometer, CSV **and** JSON
   like Fitbit. Relabel the existing JSON "Back up everything" so it is also
   discoverable under Privacy as "Download my data". *Besa:* "download my data"
   findable where she'd look. *Eddie:* machine-readable JSON for his own
   analysis. (Addresses a-15 friction #1.)
3. **Free, always-on body-stats editor in Settings → Profile.** Height, weight,
   sex, units editable post-onboarding for free (the universal norm; no
   competitor paywalls this). *Besa:* a light user who mistyped height fixes it
   without finding the Pro plan flow. *Eddie:* changes weight class without
   hunting inside "Update your plan". (Addresses a-15 friction #3.)
4. **A non-destructive consent-review screen (Apple/Headspace model).** Read-only
   "here is exactly what you consented to, and when" surface in Privacy, sourced
   from `consent_log`, distinct from the destructive withdraw action. *Both
   personas:* trust through transparency; turns the single tri-state row into a
   living dashboard. (Addresses a-15 friction #2.)
5. **Honest health-toggle copy + (where possible) per-scope in-app revoke.** Since
   HealthKit/Health Connect expose no revoke API, reframe the "off" toggles so
   they don't imply in-app control they lack — present them explicitly as
   "Manage in system settings" affordances, and stop in-app *use* of a scope
   locally even when the OS grant persists. *Besa:* no false sense of having
   revoked. *Eddie:* understands the platform reality. (Addresses a-15 friction
   #4.)

**Runner-up:** soften the accessibility-reload wall (a-15 friction #5) — apply
larger-text/contrast live where RN allows, reserving relaunch only for what
truly needs it. Not a data-rights item but a Besa-facing friction at the
accessibility moment.

### (d) What everyone has that we lack
- **A non-destructive health-consent withdrawal** (toggle that stops processing
  but keeps the account) — Apple, Oura, Headspace all have it; Volyume couples
  withdrawal to deletion.
- **A full, labelled, multi-stream data-access export** (not workout-only) —
  Strava, Garmin, Whoop, Oura, MacroFactor, Cronometer, Fitbit all ship one.
- **Format choice (CSV and JSON)** on export — Fitbit exposes both; Volyume gives
  CSV (workout-only) or an unlabelled JSON backup, not a labelled dual-format
  rights export.
- **A standing consent/permissions review surface** — Apple "Data Access",
  Headspace "My Data"/"Permissions"; Volyume has one tri-state row whose only
  action is destructive.
- **Free post-onboarding body-stats editing** — universal; Volyume removed units
  and gates goal/body edits behind the Pro plan flow.
- **A self-service rectification verb (Garmin "correct")** — rare, but worth
  noting as an aspirational extra.

---

## 3. CONFIDENCE & CAVEATS
- Load-bearing claims (Strava export contents; Apple per-type/read-write consent;
  Oura disconnect-vs-delete; Art 7(3) wording; Fitbit CSV/JSON choice;
  Cronometer breadth) each carry 2+ sources, at least one fetched verbatim.
- UNVERIFIABLE and flagged inline: (i) whether the Article 9 coupling is a
  *compliance* defect vs merely a UX/best-practice gap; (ii) whether any
  competitor paywalls body-stat editing (none seen — treated as universal norm);
  (iii) Oura export format (sources split JSON vs CSV; treat as mixed).
- 8 distinct fetch failures, all logged above, all routed around with
  corroboration or flagged; none left a load-bearing claim single-sourced.

*End r-15. No commit, no code changes.*
