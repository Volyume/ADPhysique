# impl-COMP-022 — The self-healing barcode-miss chain (scan → label → custom food, one path)

> Round-2 implementation blueprint per `impl-00-shared-brief.md`. No code
> changes in this document. Approved spec seed:
> `../competitive-audit-03-master-proposals.md` COMP-022 (impact 6, effort 2).
>
> **Fetch note:** direct WebFetch of support.cronometer.com, cronometer.com/blog
> and help.yuka.io returned HTTP 403 during this research; evidence from those
> sources is search-extract-only and flagged `[SE]` below.

## 0. Code ground truth (verified 2026-06-10, this branch)

The chain is **further along than the round-1 docs say**. Verified hop by hop:

| Hop | Status | Evidence |
|---|---|---|
| Scan → miss routes to label scanner with barcode | **EXISTS** | `src/screens/ScanBarcodeScreen.js:121-125` — `navigation.replace('ScanLabel', { mealSlot, entryDate, prefillBarcode })` |
| Label OCR → AddCustomFood prefill (name, macros, confidence, barcode) | **EXISTS** | `src/screens/ScanLabelScreen.js:145-148`; two-step front-of-pack + nutrition panel capture |
| Saved custom food stores the barcode | **EXISTS** | `src/screens/AddCustomFoodScreen.js:83` (`barcodeEan: prefillBarcode`) → `insertCustomFood` writes `barcode_ean` (`src/lib/food/db.js:195-218`); migration 023 added column + partial index (`src/lib/database.js:1039-1040`) |
| Next scan resolves locally, custom first | **EXISTS** | `findLocalByBarcode` checks `custom_foods.barcode_ean` before `foods` (`src/lib/food/sources/localCache.js:67-79`); waterfall step 1 (`src/lib/food/waterfall.js:148-152`) |
| OCR-unavailable binary fallback | **EXISTS** | `isOcrConfigured()` (`src/lib/food/ocr.js:43-45`); ScanLabel shows "Type it in" CTA when false |
| OFF write-back opt-in | **EXISTS** | `src/lib/food/writeback.js` (consent default off, queue + retry); toggle in `src/screens/SettingsPrivacyScreen.js:55-58` |

So COMP-022 is **not** plumbing — it is the missing experience layer plus four
defects in the existing plumbing:

1. **No decision moment.** A miss dumps the user straight into the label
   camera. When OCR is available there is **no "Type it in" path at all** on
   ScanLabelScreen (`captureRow` renders only shutter + "Skip name",
   lines 283-305); the only exit is ✕ back to the Diary — the barcode is lost
   and the miss is a dead end for anyone unwilling to photograph packaging.
2. **The healing is invisible.** `AddCustomFoodScreen.onSave` ends in a silent
   `navigation.goBack()` (line 143). The user is never told the barcode is now
   theirs. Round-1 lens: invisible logic reads as random.
3. **OFF write-back fires before confirmation.** `ScanLabelScreen.js:136-143`
   queues the contribution **at capture**, with raw OCR macros and no
   name/brand, even if the user then corrects junk values or abandons the
   save. The Settings copy promises "the macros you confirm"
   (`SettingsPrivacyScreen.js:58`) — the code currently breaks that promise.
   This is also the only partial state an abandoned chain leaves behind.
4. **Chain completion is unmeasurable.** `custom_food_created` reads
   `route?.params?.from ?? 'manual'` (`AddCustomFoodScreen.js:110`) but
   ScanLabel never passes `from`, so chain saves are indistinguishable from
   manual ones. `food_lookup_barcode` reports `source:'local'` without
   distinguishing a healed (custom) hit.

Also noted, not fixed (per CLAUDE.md): the comment at
`AddCustomFoodScreen.js:41-43` still says barcode persistence is "a phase 3
follow-up" — it shipped; the comment is stale.

## 1. Best-in-market bar

1. **Cronometer — the category's best capture chain and the named reference.**
   On an unsuccessful scan the app prompts **"Create New"**, the user takes
   two photos (nutrition table first, then front of pack with brand/name/
   flavour), autofill populates the form (US labels fully auto; international
   support added), the custom food is usable in the diary immediately, and
   the user may optionally submit it to the **human curation team** for the
   public database ([Cronometer support, Mobile - Scan Food](https://support.cronometer.com/hc/en-us/articles/360020441392-Mobile-Scan-Food) `[SE]`;
   [Cronometer blog, Why Cronometer's Barcode Scanner Is The Best](https://cronometer.com/blog/best-barcode-scanner/) `[SE]`).
   What works: the miss is reframed as *creation*, the photos do the typing,
   and the user gets immediate private value with optional public good.
   Weakness Volyume can beat: the **barcode→custom link is in their cloud**;
   curation review is asynchronous and the user is never told "next time this
   scans instantly".
2. **MyFitnessPal.** Miss → "ask if you want to add this food" → manual form →
   lands in My Foods; mobile offers linking the new food to the barcode **for
   all users**, but publicly shared foods can never be deleted, and sharing
   must be decided at creation time ([MFP help: log a food not in the database](https://support.myfitnesspal.com/hc/en-us/articles/360032271992-How-do-I-log-a-food-that-is-not-in-the-database) `[SE]`).
   What works: the barcode link persists. What fails: no OCR assist (typing
   is unassisted), and the share decision is an irreversible commitment
   presented mid-task.
3. **Yuka.** Miss shows a **"Fill in the information"** button on the result
   screen; the user photographs the product and types minimal fields; data
   flows to the shared database (Yuka is OFF-backed for food)
   ([Yuka help: add an unknown product](https://help.yuka.io/l/en/article/cigfcr86v0-add-unknown-product) `[SE]`).
   What works: one obvious button at the moment of failure; contribution as
   the default mental model. What fails: when the button doesn't appear
   (unratable categories) the user hits a silent dead end.
4. **Open Food Facts (smooth-app).** Contribution is the product: redesigned
   photo-first flow (front, nutrition, ingredients), with **Robotoff** ML
   extracting nutriments from the photos server-side so "submitting photos is
   the most painless thing for your users"
   ([OFF API docs](https://openfoodfacts.github.io/openfoodfacts-server/api/),
   [Robotoff nutrition extraction](https://openfoodfacts.github.io/robotoff/references/predictions/nutrient-extraction/),
   [smooth-app changelog](https://github.com/openfoodfacts/smooth-app/blob/develop/CHANGELOG.md) `[SE]`).
   What works: photos as the unit of contribution. What fails for a diary
   app: no immediate personal payoff — it serves the commons, not tonight's
   macros.

**The single best:** Cronometer. It is the only one that chains
miss → photos → autofilled form → diary entry in one unbroken path. Volyume's
design equals the chain and beats it on three axes: the healed barcode lives
**on-device** (works offline, no curation latency), the healing is **told to
the user**, and the contribution channel (OFF) helps every app's users, not a
proprietary database.

## 2. What fails

- **The dead-end miss.** "Scanned a product and found it wasn't in the
  database" is a recurring top frustration in category reviews; apps now
  explicitly market "create a Custom Food instead of being frustrated by a
  dead-end" ([SnapCalorie category analysis](https://www.snapcalorie.com/blog/food-logging-app-with-barcode-scanner-do-you-really-need-one.html) `[SE]`).
  Anti-pattern: any miss state whose only affordance is ✕.
- **The friction cliff.** >30s per entry is the abandonment line; 73% of
  quitters in a 2023 IFIC survey cited "too time-consuming"
  ([iTWire on food-logging friction](https://itwire.com/business-it-news/business-technology/computer-vision-is-quietly-solving-a-30-year-software-problem-food-logging) `[SE]`;
  matches round-1's ">30s = 43% lower retention",
  `../competitive-audit-01-food-logging-research.md`). A miss flow that costs
  minutes *every time* for the same product is fatal; one that costs 30s
  *once* is acceptable — but only if the user knows it is once.
- **Foodvisor's overpromise.** "At least 50% of barcodes unrecognised" plus a
  capture feature that's "faulty and inaccurate" bought users' anger, not
  forgiveness ([justuseapp reviews](https://justuseapp.com/en/app/1064020872/foodvisor-calorie-counter/reviews), via round-1 research). Anti-pattern: selling the
  assisted path harder than its real success rate.
- **MFP's irreversible share-at-creation.** A permanent public commitment
  embedded mid-task teaches users to decline. Anti-pattern: bundling the
  altruism decision into the save button. (Volyume's consent is already a
  separate Settings toggle — keep it that way.)
- **Yuka's conditional button.** A contribution affordance that sometimes
  isn't there is worse than none; users can't form a habit around it.

## 3. User psychology

- **Moment of need:** the user is standing in a kitchen holding a product,
  hungry, mid-log. They want *this food in the diary now*; database altruism
  is a distant second. The flow must lead with personal payoff and make the
  commons contribution a by-product.
- **Habit loop:** cue = "Not in the database yet"; action = two photos or one
  short form; reward = **two rewards**: the entry lands in tonight's diary
  *and* the explicit promise "next time this barcode scans instantly". The
  second reward is the one that changes behaviour — it converts a failure
  memory into an investment memory (the IKEA-effect framing: the food is now
  *theirs*).
- **Effort budget:** honest arithmetic, stated up front: label path ≈ 30s
  (two photos + confirm amber fields); type-in path ≈ 45–60s (5 numbers + a
  name). Either is a one-off per product. What the feature REMOVES: every
  future search/scan for that product (repeat scans hit step 1 of the
  waterfall, <50ms).
- **Emotional safety:** a miss must never read as the user's failure or the
  app's shrug. Copy blames the database, calmly, and immediately shows the
  fix. No red, no exclamation marks. The success toast is factual, not
  celebratory — it also therefore needs no special behaviour under ED/
  wellbeing flags (it talks about a barcode, never about intake, kcal
  totals or the user's body).
- **Word-of-mouth surface:** "It didn't know my protein bar, I typed it once,
  now it scans instantly — and it asked if I wanted to fix it for everyone
  else too." The OFF contribution is the tellable pro-social moment; the
  instant repeat scan is the demonstrable one (people re-scan to show
  friends).
- **Trust mechanics:** show the working — name the barcode on screen
  (already done), state where the data will live ("saved on this phone"),
  and never upload anything unconfirmed (fix defect 3).

## 4. The Volyume implementation

### Placement — no new screen

The "miss screen" is **a state of ScanLabelScreen**, not a new surface.
`ScanBarcode` keeps its existing `navigation.replace('ScanLabel', …)` on miss;
ScanLabel gains an **arrival choice state** when `prefillBarcode` is set: the
camera stays warm behind a scrim, and a bottom card presents the decision.
One tap dismisses into the existing capture flow. This honours the
streamlining rule (enrich an existing surface), keeps the back-stack shape
unchanged (`replace` semantics: back = Diary, never a stale camera), and
costs hesitant users exactly one tap.

### The miss card (states and copy)

State A — **online miss** (waterfall confirmed `status != 1` from OFF and a
USDA miss):

> **Not in the database yet**
> Fix it once and it's yours. Scan the label, about 30 seconds, or type it
> in. The barcode is saved either way, so next time it scans instantly.
>
> [ **Scan the label** ]   primary, ≥44pt
> [ Type it in ]           secondary text button, ≥44pt

State B — **unreachable** (offline / both lookups timed out — see waterfall
note below):

> **Couldn't check the full database**
> You're offline, so only the on-device list was checked. Label scanning
> still works offline. Whatever you save is kept on this phone.

Same two buttons. The label path genuinely works offline (MLKit OCR is
on-device, `src/lib/food/ocr.js`); the OFF write-back queue already tolerates
deferred flushing. The copy must not claim "not in our database" when the
truth is "couldn't look" — currently `ScanLabelScreen.js:267` always asserts
the former.

State C — **OCR not in binary** (existing `isOcrConfigured() === false`
fallback): skip the choice, go straight to the current "Type it in" CTA with
the existing barcode-saved copy (`ScanLabelScreen.js:270`). Unchanged.

During capture (front/nutrition steps), add a persistent **"Type it in"**
text button beside "Skip name" so the user can bail at any step without
losing `prefillBarcode` — today the only mid-flow exit discards it.

### The chained state (verified hop parameters)

- `ScanBarcode` → `ScanLabel`: `{ mealSlot, entryDate, prefillBarcode }` —
  exists, unchanged.
- `ScanLabel` → `AddCustomFood`: `{ mealSlot, entryDate, prefillBarcode,
  prefillMacros, prefillConfidence, prefillName }` — exists; **add**
  `from: 'scan_chain'` (label path) / `from: 'scan_manual'` (type-in path) so
  the existing `route?.params?.from` telemetry hook finally receives a value.
- `AddCustomFood` save: already writes `barcode_ean` and logs the entry in
  one save. **Add** the duplicate guard and success toast below.

### The success moment (confirm the healing)

On save with a `barcodeEan` present, before `goBack()`:

> Toast: **"Saved. Next time this barcode scans instantly."**

Uses the existing `useToast` already imported in AddCustomFoodScreen (it
currently shows errors only). Announced to screen readers via the Toast
component's live region. No animation, Reduce Motion irrelevant. This single
string is the difference between "the app failed and I did its job" and "I
upgraded the app" — the loop-closing reward named in §3.

### OFF write-back (opt-in stays opt-in; move it to the save)

- **Move** `queueContribution` from ScanLabel capture
  (`ScanLabelScreen.js:136-143`) to AddCustomFood's `onSave`, after a
  successful `insertCustomFood`, sending the **confirmed** values plus
  `name`/`brand` (the current capture-time payload sends neither). This makes
  the code match the consent copy ("the macros you confirm"), stops
  contaminating OFF with unconfirmed OCR junk, and eliminates the only
  partial state an abandoned chain leaves (queue entry with no saved food).
  `writeback.js` itself is untouched — consent gate, queue, retries, telemetry
  all stay as built.
- **When offered:** consent is never asked mid-task. After the user's
  **first completed chain** (once ever, tracked by an AsyncStorage flag), the
  Diary shows a one-time dismissible card: "You fixed a barcode. Want fixes
  like this shared with Open Food Facts so the next person gets a hit? Off by
  default." → deep-links to the existing toggle in Settings → Privacy. Moment
  of need without MFP's irreversible mid-task commitment. If consent is
  already on (or the card was dismissed), nothing ever shows.

### Edge cases

- **Duplicate barcode on an existing custom food:** reachable when sync pulls
  a same-barcode food mid-flow or after a soft-delete/restore. On
  AddCustomFood mount with `prefillBarcode`, run `findLocalByBarcode`; if a
  custom hit exists, show an inline banner: "You've saved this barcode before
  as {name}." with a "Log that instead" action (routes through the existing
  `FoodSearch` `scannedFood` auto-open, `FoodSearchScreen.js:320-328`).
  Saving anyway is allowed (new food wins: add `ORDER BY updated_at DESC` to
  the custom branch of `findLocalByBarcode` so the newest mapping resolves —
  today `LIMIT 1` without ordering is arbitrary).
- **Offline:** see State B. Requires the waterfall to distinguish *confirmed
  miss* from *couldn't check*: `lookupBarcodeOff`/`lookupBarcodeUsda`
  currently collapse network errors and `status != 1` into the same `null`
  (`src/lib/food/sources/liveOff.js:71-80`). Add a tagged result (e.g.
  `resolveBarcode` returns `{ food, reason: 'miss' | 'unreachable' }` via a
  new detailed variant, keeping the existing signature for other callers).
  `@react-native-community/netinfo` 11.4.1 is already installed if a
  connectivity pre-check is preferred — **no new dependency either way**.
- **OCR unavailable in binary:** existing fallback (State C). Unchanged.
- **User abandons mid-chain:** with the write-back moved to save, an
  abandoned chain persists nothing — `insertCustomFood` + `logFoodEntry` only
  run inside `onSave`, and vision-camera photos are OS-managed cache files.
  Re-arming on focus (`ScanBarcodeScreen.js:68-73`) already restores the
  scanner for another attempt.
- **Sanity-check failure:** the existing "Numbers look off" alert
  (`AddCustomFoodScreen.js:92-106`) runs *before* the save, therefore before
  the write-back queue — OFF never receives values the user was warned about
  and bypassed? It can, via "Save anyway"; acceptable: the user explicitly
  owned those numbers, which is exactly OFF's contribution model.

### Accessibility

Choice-card buttons ≥44pt with `accessibilityRole="button"`; the card is the
initial focus target on arrival (the camera behind it is decorative);
barcode digits in the title are read as digits; toast announced via live
region; all states meet contrast on the scrim per `src/styles/theme.js`
tokens. No motion added.

## 5. Whole-package integration

- **The COMP-016 seam (the two halves of database trust):** COMP-016's
  verified UK layer is *prevention* — fewer misses by shipping the top SKUs
  badged and ranked first. COMP-022 is the *cure* — every residual miss
  self-heals on-device. Together they form one promise: "we checked the big
  stuff; anything we missed, you fix once and it stays fixed." Seam rules:
  (a) a healed custom food keeps the `custom` source chip
  (`SourceChip.js`) — it must **never** wear the Verified badge;
  (b) custom beats global in barcode resolution (already true,
  `localCache.js:63-79`), so a later verified import never silently
  overrides a user's own correction; (c) **constraint for COMP-016's
  data-ops:** healed barcodes cannot feed the verified-layer candidate list
  via telemetry — the HP-2 rule in `waterfall.js:145-147` deliberately never
  transmits EANs (a barcode is dietary content). Candidate SKUs must come
  from OFF popularity data or commercial sources, with opt-in OFF write-back
  as the only outbound channel.
- **COMP-002 (meal-slot memory) and frequents:** a healed food is logged via
  the standard `logFoodEntry`, so it enters recents/frequents automatically —
  the second scan is instant and the third may not need a scan at all.
- **Recipes:** RecipeBuilder's `pickMode` path reuses FoodSearch, so healed
  foods are immediately available as ingredients. No extra work.
- **Streamlining effect:** zero new screens, one new overlay state, one
  toast, one one-time Diary card. Retires nothing but removes the app's worst
  dead end. No Home involvement, so no COMP-027 interaction.
- **ED/wellbeing flags:** no behaviour change required — the flow contains no
  intake totals, streaks or body references (§3); barcode scanning is already
  Pro-gated with the diary, and gating is untouched.

## 6. Retention & word-of-mouth mechanics

The loop this feeds is the **diary habit's survival across its most common
failure**. Round-1 evidence: capture friction is the category's #1
abandonment driver and dead-ends are a stated quit trigger (§2). Every healed
barcode permanently raises that user's personal hit rate, so the app
measurably gets *better with use* — the same perceived-adaptivity quality
that earns the "elite" label on the coaching side, here applied to the food
database. The shareable beats: re-scanning the healed product in front of
someone (instant hit), and the OFF card ("a fitness app that fixes the open
database instead of hoarding corrections") — a values story UK users repeat.

## 7. Beating the benchmark

Cronometer's chain ends with a submission into a queue the user never sees
again; MFP's ends with an irreversible share decision; Yuka's with a
contribution and no diary entry. Volyume's chain is the only one where the
user is *told the consequence* ("next time this barcode scans instantly"),
where the fix is verifiably instant and local (offline included — none of the
four works fully offline), where the altruism is opt-in, reversible, asked
once at a sensible moment, and sent only after human confirmation, and where
the miss copy is honest about whether the database was even reachable. Equal
chain, better psychology, stricter honesty.

## 8. Measurement (existing allowlist; payload-level changes only)

1. **Miss rate:** `food_lookup_barcode` `source:'miss'` ÷ all — exists today
   (`waterfall.js:168`); split by new `reason` payload (`miss` vs
   `unreachable`).
2. **Chain completion:** `custom_food_created` with `source:'scan_chain'` or
   `'scan_manual'` ÷ barcode misses (needs only the `from` param, §4).
   Target: >50% of misses end in a saved food.
3. **Repeat-scan healed-hit rate:** `food_lookup_barcode` payload `source`
   extended to `'local_custom'` when the custom branch hits — the direct
   proof of self-healing. Target: rising week on week.
4. **Write-back health:** `ocr_writeback_attempted` success ratio — exists
   (`writeback.js:133-144`). No event-allowlist additions; no EANs in any
   payload (HP-2).

## 9. Build notes

- **Files:** `ScanLabelScreen.js` (choice state, offline copy, persistent
  type-in escape, remove capture-time `queueContribution`, pass `from`);
  `AddCustomFoodScreen.js` (success toast, duplicate-barcode banner,
  save-time `queueContribution` with name/brand, `from` passthrough);
  `waterfall.js` + `sources/liveOff.js`/`usda.js` (tagged miss vs
  unreachable; keep `resolveBarcode` signature for existing callers);
  `localCache.js` (ORDER BY on the custom barcode lookup); `DiaryScreen.js`
  (one-time OFF consent card); tests: extend
  `src/lib/__tests__/food.writeback.test.js` for the moved queue point.
- **DB:** none — migration 023 already shipped the column and index.
- **Dependencies:** none (NetInfo 11.4.1 already installed; OCR already
  bundled).
- **Reuse:** Toast, Button, SettingsPrivacyScreen toggle, FoodSearch
  `scannedFood` auto-open, scrim/spacing tokens.
- **Effort sanity-check:** approved score 2 **confirmed** — all five
  plumbing hops exist; the work is UI states, one queue relocation, payload
  params and a small waterfall return-shape addition. Days, not weeks.
- **Risks:** (1) *Primary risk:* the "about 30 seconds" promise vs real UK
  OCR parse quality — if amber-field corrections routinely blow the budget,
  the primary path becomes a trap (Foodvisor's failure mode). Mitigate:
  keep "Type it in" permanently visible, monitor `prefillConfidence`
  distributions before strengthening copy. (2) Waterfall return-shape change
  touches the scan hot path — gate behind a detailed variant and leave
  `resolveBarcode` callers untouched. (3) The one-time consent card must not
  stack with other Diary banners; suppress when any other card is showing.
