# Security / injection bug hunt — findings

Surface: every place external/untrusted input enters the app — SQL (food FTS,
database.js, food/db.js), SSRF/unsafe fetch (recipe import, live OFF/USDA),
deep-links / route params (partner codes, linking config), untrusted parse
(OCR, JSON-LD, barcode, backup import). READ-ONLY hunt; no edits.

**FTS injection verdict (one line):** SAFE. `toFtsMatch` tokenises on
`/[^\p{L}\p{N}]+/u`, so every FTS operator (`" * ^ - : ( ) NEAR` etc.) is a
delimiter; only letters/digits survive, each wrapped in `"…"*` and bound as a
`?` parameter. User text can never be parsed as FTS query syntax. Verified
adversarially against `name:foo`, `a OR b`, `x"* NEAR z`, `-term` — all reduce
to quoted letter/number tokens.

---

## [MAJOR][SAFE-FIX] src/lib/food/recipeImport.js:142-150 — recipe import has no response-size cap or timeout: attacker-controlled URL can OOM-crash or hang the app

**Trigger.** Pro user opens Recipe Builder → "Import from web" and pastes (or
taps a shared) `https://` URL that the attacker controls. `importRecipeFromUrl`
does `const response = await fetch(url.trim()); const html = await
response.text();` — no `AbortController`/timeout, no `Content-Length` check, no
read cap. Contrast the food sources (`liveOff.js`, `usda.js`) which DO wrap
every fetch in `_fetchWithTimeout` with an `AbortController`.

**Failure.** A URL that streams an unbounded/multi-GB body makes
`response.text()` accumulate the whole payload into a JS string → out-of-memory
crash of the app. A URL that never finishes responding hangs the import with no
timeout (the `importing` spinner in `RecipeBuilderScreen.onImportFromWeb` stays
up until the OS kills the socket). Both are reachable from a single pasted link;
the ingredient-count cap (`MAX_IMPORT_INGREDIENTS = 30`) is applied only AFTER
the full body is parsed, so it does not help here.

**Minimal fix.** Wrap the fetch in an `AbortController` timeout (mirror
`_fetchWithTimeout`), and bound the read — check `response.headers.get(
'content-length')` and/or read via a capped reader, rejecting bodies over a few
hundred KB (a JSON-LD recipe page is tiny). SAFE-FIX (ordinary defensive guard,
no engine/safety/billing surface).

---

## [MINOR][SAFE-FIX] src/lib/food/recipeImport.js:129-145 — https-only scheme gate is bypassable via redirect downgrade; host is unrestricted (SSRF-adjacent)

**Trigger.** `isAllowedRecipeUrl` only checks the INITIAL URL matches
`^https:\/\//i`. `fetch` follows redirects by default, so
`https://attacker.example` → `302 http://192.168.0.1/…` (or any internal/LAN
host) is followed even though the stated contract is "https only". The host is
deliberately the user's choice (documented), so `https://localhost:PORT` /
`https://192.168.x.x` are fetchable directly too.

**Failure.** The documented https-only promise (audit SC-8) does not hold across
a redirect chain, and the importer will issue requests to arbitrary internal/LAN
hosts reachable from the device. Impact is bounded because this is a client-side
fetch on the user's own device/network (no server-side secrets or cloud-metadata
endpoint reachable from a phone), and the response is only parsed for JSON-LD —
so this is MINOR, not a server-SSRF blocker. Still a defence-in-depth gap and it
compounds the OOM/hang above (redirect target also uncapped/untimed).

**Minimal fix.** Set `redirect: 'manual'` (or re-validate the scheme on each hop)
so an https→non-https downgrade is rejected; optionally block obvious
loopback/private hosts. SAFE-FIX.

---

## Areas checked and found SOUND (no finding)

- **Food FTS (`toFtsMatch` / `searchLocalByName` / `_searchFts`,
  localCache.js:32-96).** SAFE — see verdict above. LIKE fallback also binds
  `${q}%` / `%${q}%` as `?` parameters; user `%`/`_` act as literal LIKE
  wildcards (cosmetic over-matching only, not injection).
- **database.js dynamic SQL.** The interpolated identifiers at
  `updateWorkout` (1935), `updateWorkoutSet` (2409), `updateRoutineExercise`
  (2849), `updateCardioLog` (4576) all come from HARDCODED column allowlists
  (`fieldMap`/`allowed` object keys), never from user strings; values are always
  bound `?`. `PRAGMA user_version = ${v+1}` uses an internal integer counter.
- **Backup restore (`restoreAllTables`, database.js:4218-4244).** Table names
  are the fixed `BACKUP_TABLES` constant; columns are allowlisted from the LIVE
  schema via `PRAGMA table_info` (audit F-005 fix present); values bound `?`. No
  identifier injection possible from a crafted backup. Tier/entitlement prefs are
  filtered out on both dump and restore (`SENSITIVE_PREF`, F-002). (Note, not a
  security bug: restore does `DELETE FROM <t>` unscoped by user_id and reinserts
  the file's rows verbatim including their original `user_id` — expected on a
  single-user device, but a backup from account A imported on account B would
  seed foreign-`user_id` rows. Data-integrity edge, user-initiated file pick.)
- **food/db.js.** Every read/write is `?`-parameterised; no interpolation.
- **Live OFF / USDA (liveOff.js, usda.js).** Fixed base URLs; user
  barcode/query passed through `encodeURIComponent`; `AbortController` timeouts
  (1200/1500 ms); responses filtered (`_hasMacros`, `Array.isArray`) with
  try/catch → null/[]. USDA key sent as `X-Api-Key` header, not query string.
- **Deep-links / partner codes.** `linking` config
  (RootNavigator.js:635-672) only maps to screens inside signed-in `MainTabs`;
  Pro gates (`withProGuard`) still apply. `parseInviteCode`
  (partners/link.js:40) strips scheme/host and any trailing `/?#`, then enforces
  `^[A-Z0-9]{8,}$`; `PartnerScreen` runs `route.params.code` through it before
  the `redeem_partner_invite` RPC (`_code` bound). OAuth-style
  `volyume://#access_token=…` inputs are rejected (tested). `routine/:planId`
  reaches PlanDetail as a bound lookup value only.
- **OCR parse (ocrParser.js).** Regexes have bounded quantifiers (`{0,30}`,
  `{1,4}`); the only `new RegExp(...)` uses a HARDCODED `keyword`, never user
  text (no ReDoS via user-controlled pattern); `parseFloat` results guarded with
  `Number.isFinite`.
- **Recipe JSON-LD extractor (recipeImport.js extractRecipeJsonLd).** Per-block
  `JSON.parse` in try/catch; `findRecipe`/`normaliseIngredients`/`parseServings`
  type-check every field; consumer bounds name to 80 chars and ingredients to 30.

---

## Count by severity
- blocker: 0
- major: 1  (recipeImport.js unbounded fetch → OOM/hang)
- minor: 1  (recipeImport.js redirect downgrade / unrestricted host)
