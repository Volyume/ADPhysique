# r-05 — Exercise Library & Demos: best-in-class external research

> ULTIMATE-APP MANDATE, Phase 2, Area 05. Research agent r-05.
> Aimed at audit `a-05-exercise-library-demos.md` (Volyume: 449 curated
> exercises, 0 visual demos, no browse surface, name-substring-only search,
> rich `ExerciseDetailScreen` unreachable pre-logging, 37.4% form-tip coverage,
> per-exercise difficulty computed but unused).
> Verified base re-used, not re-fetched: `docs/deep-audit-2026-06-12/validation/
> val-ext-01-02.md` (Hevy Trainer, Gymshark 700+/video-on-every-one, Caliber
> 500+, Boostcamp tiers, MoveKit ~$99 lead all carried verbatim from there).
> British English throughout. **Not committed.**

---

## STEP 0 — TOOLING PROVEN (verbatim quote + URL)

WebFetch end-to-end succeeded against the WorkoutX exercise-database round-up,
returning structured content (not chrome). Verbatim, the page reports per
vendor — e.g. **"MuscleWiki | 300+ | images | Unlimited [free tier]"** and
**"BodyBuilding.com | 2,000+ | video demonstrations | Requires license"** —
[workoutxapp.com/blog/top-10-exercise-databases-fitness-apps.html](https://workoutxapp.com/blog/top-10-exercise-databases-fitness-apps.html).

A second clean fetch (MoveKit pricing) returned the verbatim line **"All
animations are delivered as high-quality MP4 files in HD resolution"** —
[movekit.com/pricing](https://movekit.com/pricing). Tooling is live; proceeding.

**Fetch-failure log (per-URL, bot-walls / 404s — expected, all corroborated via
search or alternates):**
- `hevyapp.com/exercises/` — bot check ("Please wait while your request is being
  verified"). Same wall noted in val-ext-01-02. Hevy claims sourced via secondaries.
- `musclewiki.com/` and `musclewiki.com/about` — HTTP 403. Sourced via WebSearch
  of musclewiki.com/about + app-store listings.
- `exrx.net/Lists/Directory` — HTTP 403. Sourced via the WorkoutX round-up.
- `gymshark.com/blog/article/how-to-use-the-gymshark-training-app` — 404 (wrong
  slug); real Gymshark support/blog pages fetched fine via search.
- `en.wikipedia.org/wiki/MuscleWiki` — 404 (no such article).
- `fitbod.me/about-fitbod-exercises/` — first call 403, **second call succeeded**
  (counted as 1 failure, claim VERIFIED on the retry).

**Total distinct fetch failures: 5** (hevy, musclewiki ×1 host, exrx, gymshark
slug, wikipedia slug). None load-bearing — every blocked claim is carried by an
independent fetched or searched source below.

---

## 1. Per-app teardown

Columns: **Size** = library count; **Media** = demo type + human vs generated;
**Browse** = anatomy/muscle/equipment/pattern model; **Search** = forgiveness;
**Beginner** = curation/difficulty; **Reachable from** = where info opens;
**Custom** = custom-exercise support; **Media production** = how media is made/licensed.

### Hevy
- **Size / media:** Large built-in library; demos are short looping clips. Free
  tier caps **7 custom exercises** (val-ext-01-02 #5, fetched push-pull.app).
- **Browse:** muscle + equipment filters; exercise picker is the primary surface.
- **Beginner:** Hevy **Trainer** (launched 18 Feb 2026) is the curated on-ramp,
  but it is **Pro-gated at $23.99/yr** (val-ext-01-02 #1–3, VERIFIED).
- **Custom:** yes (capped at 7 on free).
- Source: carried from val-ext-01-02 (host bot-walled this pass too — consistent).

### Strong
- **Size:** "**over 200 built-in exercises … including Instructions and Videos**";
  a second source says "**300+ exercises with basic animated demonstrations**".
- **Media:** "**a growing library of animated videos**" — animation, not filmed.
- **Custom:** "**If you can't find a particular exercise, you can also easily
  create your own … This can also be done during a live workout**" — created from
  the Exercises tab via "New" (iPhone) / three-dots → Create (Android). Fields not
  documented. [help.strongapp.io/article/97](https://help.strongapp.io/article/97-create-custom-exercises) (fetched), search of strong.app.
- Free tier historically limits **3 custom routines** (val-ext-01-02 #47, CORRECTED).

### Fitbod
- **Size:** "**over 1600 exercises**" (fetched [fitbod.me/about-fitbod-exercises](https://fitbod.me/about-fitbod-exercises/), retry); review corroboration "1,600+ movements, 1,000+ with video demos".
- **Media:** "**professionally filmed personal trainers using over 80 different
  pieces of equipment**" (fetched, verbatim) — **filmed humans**, "some even from
  multiple angles" (review). This is the gold standard for produced, owned media.
- **Browse / search:** filter by category (weighted, cardio, bodyweight, stretching,
  pregnancy-friendly), by available **equipment**, and "**search exercises by muscle
  group, equipment type or keyword**" (review of fitbod.me/exercises).
- **Beginner:** algorithm builds the session so the user rarely browses raw; but
  cold-starts ~10–15 workouts (val-ext-01-02 #20–22). 3 free workouts then paywall $15.99/mo.
- Sources: fetched fitbod.me; WebSearch of fitbod.me/exercises + reviews.

### Alpha Progression
- **Size:** ~**620–690 exercises**, "**690 exercise videos**" / "550+ … each with
  video and instructions" (review variance).
- **Media:** "**The demonstration is done by a real human, as opposed to a graphic
  illustration**" — filmed human, explicitly contrasted with illustration apps.
- **Browse:** "**filter the list of exercises based on equipment, muscles, type
  (cardio, stability, small to large exercises), or custom exercises**" — searchable
  + filterable by equipment / muscle / type / custom, with sorting.
- **Beginner:** steep learning curve; generator is **Pro-only** (val-ext-01-02 #23).
- **Custom:** yes (appears as a filterable type).
- Source: WebSearch of alphaprogression.com + hotelgyms/fitnessdrum reviews.

### JuggernautAI
- **Size:** "**over 300 movements with detailed video demonstrations and written
  cues**" (some sources 250+).
- **Media:** filmed demos; "**multiple camera angles and slow motion breakdowns
  for complex exercises**", plus "**common mistakes to avoid, and variations for
  different equipment setups**".
- **Swap:** "**swap in exercises each day or for an entire block based on what you
  have handy**" — equipment-aware substitution.
- Source: WebSearch of juggernautai.app + reviews (techfixai, declom).

### Boostcamp
- **Size (standalone exercise guides):** "**30+ exercises**" / "**30+ Exercise
  Guides**" — note this is the *reference-guide* surface, distinct from its
  **12,196-programme** library (val-ext-01-02 #12).
- **Media:** "**Step-by-step guides, muscle diagrams, and video demos for every
  movement**" (fetched [boostcamp.app/exercises](https://www.boostcamp.app/exercises)).
- **Browse:** by **6 equipment types** (Barbell, Dumbbell, Kettlebell, Machine,
  Bodyweight, Cable) and by **muscle group** on browsable cards with thumbnails.
- **Swap:** "**tap the swap exercise icon to see alternatives suggested by your
  coach … tap the exercise name to see a demonstration video, your past
  performance, and personal records**" — and exercise alternatives are **free**
  (val-ext-01-02 #18 corrected the old paywall claim).
- Source: fetched boostcamp.app/exercises; WebSearch of boostcamp tips pages.

### Gymshark Training
- **Size / media:** "**over 700 exercises, and every exercise includes a detailed
  video guide – perfect for all ability levels, from beginner to advanced**".
  100% free (val-ext-01-02 #42, VERIFIED).
- **Browse:** "**filter by type, duration, equipment, or target muscle group**";
  "**browse individual exercises and set your own workout**" from the 700-movement
  library — i.e. a real **browse-as-catalogue** surface, not just a picker.
- Source: WebSearch of row.gymshark.com blog + support.gymshark.com.

### Nike Training Club
- **Size:** **185+ free workouts** (val-ext-01-02 #48 corrected the stale "487").
  Class/programme model, not a raw exercise catalogue.
- **Media:** in-workout, "**the demo video plays in real-time … you can peek at the
  athlete demonstrating each exercise to check your form**"; a per-item drop-down
  "**opens up a demo video of the selected exercise**".
- **Browse:** "**browse and filter a workout by muscle groups, activity level,
  intensity, equipment, duration, or the athlete demonstrating**".
- Source: WebSearch of nike.com/ntc-app + reviewed.com/makeuseof.

### Lyfta
- **Size:** vendor/marketing says "**over 5000 exercises**" / "**4000+ Exercise
  Profiles**".
- **Media (IMPORTANT — corrects the 3D assumption):** the fetched library page
  serves **static demonstration PNGs** (asset paths `exercises/00251101.png`), not
  3D animation or video on web; app shows clips behind a "?" tap. So Lyfta's *web*
  catalogue is illustration-grade, not the 3D it is sometimes credited with.
- **Browse:** muscle-group filter chips ("Cardio, Chest, Back, Biceps, Triceps,
  Quadriceps, Hamstrings, Shoulders, Hips, Waist, Upper Arms, Calves, Forearms,
  Neck") + equipment.
- Source: fetched [lyfta.app/exercises](https://www.lyfta.app/exercises); WebSearch.

### JEFIT
- **Size:** marketing "**1400+ exercises**"; the live web DB returned "**1295
  EXERCISES FOUND**" / "1200+" (per WorkoutX). HD video + audio cues claimed;
  the **web** DB shows demonstration **images** ("Cable Lat Pulldown … Demonstration").
- **Browse:** by **muscle group** (Abs, Back, Biceps, Cardio, Chest, Forearms,
  Glutes, Shoulders, Triceps, Upper/Lower Legs) and **equipment** (Body Weight,
  Bands, Barbell, Bench, Dumbbell, Exercise Ball, EZ Curl Bar, Kettlebell, Cardio
  Machine, Strength Machine, Pullup Bar, Weight Plate) with multi-select Apply.
- **Search:** muscle-group pick → magnifying-glass keyword search within group.
- **Custom:** yes ("How Can I Create Custom Exercises" support topic).
- Source: fetched jefit.com/exercises; WebSearch of support.jefit.com.

### MuscleWiki / Workout Cool (anatomical-browser archetype)
- **MuscleWiki size/media:** "**2000+ free exercise videos**" (about page), "over
  **1,700 exercises** filmed, meticulously labeled and mapped"; the WorkoutX
  round-up lists it conservatively as "**300+ | images | Unlimited**" (the public
  API vs the consumer app differ). **Filmed human videos / GIFs.**
- **Browse (the defining pattern):** "**click any muscle to see targeted exercises**"
  from an **interactive front/back body map** — select a muscle → exercises with
  GIF/video. 100% free, no registration, **core features work offline**, 2.8M
  downloads, 4.42★/18k. Source: WebSearch of musclewiki.com/about + app listings
  (host 403 on direct fetch).
- **Workout Cool (open-source):** "**1200+ exercises (with videos, attributes,
  translations)**"; creator rebuilt the dataset "**from scratch with a partner to
  avoid any licensing ambiguity (especially with videos)**"; current clips are
  "**'watermarked' and come from a partner app that granted permission**". Crucial
  beginner admission: "**the current flow assumes a bit too much knowledge up
  front**", planned fix = "**Optional muscle selection (or skipping it entirely)**"
  + "**Beginner-friendly presets like 'Full Body', 'Upper Body'**". Source: fetched
  [github.com/Snouzy/workout-cool](https://github.com/Snouzy/workout-cool) +
  [news.ycombinator.com/item?id=44309320](https://news.ycombinator.com/item?id=44309320).

### Exercise.com-style coach platforms / ExRx-style directories
- **ExRx.net:** "**1,000+ | None [media] specified | Free**" — a muscle/equipment
  **directory** (text + small illustration), the canonical "browse by body region"
  reference (WorkoutX round-up; direct fetch 403).
- **Exercise.com / NASM-style:** licensed coach platforms; NASM library "**600+ |
  images | Licensed**" (WorkoutX). These prove the *coach-platform* pattern licenses
  media rather than filming it.

### Sweat (Kayla) demo approach
- **Media:** "**Each exercise has a video demo, plus a written description that
  includes form and technique cues**"; in-workout the clip runs under a "highly
  visible countdown clock" with Next/Pause, also on Apple Watch.
- **Beginner:** explicitly "**works well whether you're just starting out and need
  support with … proper form, or … more experienced**"; optional beginner weeks
  (val-ext-01-02 #68 corrected the "mandatory 4 weeks").
- Source: WebSearch of sweat.com + Tom's Guide.

### Peloton Strength+ (Peloton Gym)
- **Media:** "**full-screen vertical video demos with optional in-ear coaching**";
  "**movement breakdowns at the start of each block and … coach-led demos during
  every exercise**". Filmed coaches.
- **Reachable from:** demos are surfaced **in-flow at the start of each block** and
  during each movement — info is push-delivered, not hunted for.
- **Pricing:** free for All-Access/App+ members, else $9.99/mo US.
- Source: WebSearch of onepeloton.com/strength-plus-app + Retail Dive.

### Caliber
- **Size / media:** "**more than 500 exercise demo videos … step-by-step written
  instructions, … primary and secondary muscle groups, and your history**".
  High-quality video, "**breaking down movements into phases**". **Free, ad-free.**
- **Browse:** "**access the library in full … alphabetized and searchable … filter
  by muscle group and equipment**" — a genuine full-catalogue browse, mid-session.
- Source: WebSearch of barbend.com + garagegymreviews + caliberstrong.com (carried
  from val-ext-01-02 #26 VERIFIED).

### Dr. Muscle
- AI auto-regulating coach; ~bodybuilding library with video demos and equipment
  swaps. Trust issues are subscription/cancellation-related, not library-related
  (val-ext-01-02 #37). Not a library leader; included for completeness.

### Media-production vendors (how the field gets media at scale)
| Vendor | Size | Media type | Price (verbatim) |
|---|---|---|---|
| **MoveKit** | "200+ exercises" | 3D mannequin animation | $4.99 per clip; packs "From $29 per pack" up to the full 200+ library; **[CORRECTED at spot-check 2026-06-12: the "$99 full library" figure inherited from NEW-001 (tainted 06-10 window) does NOT appear on the live pricing page — full-library price unconfirmed, requires vendor contact]**; "**delivered as high-quality MP4 files in HD resolution**", "**No SDK, no proprietary player**", muscle-highlight variants, commercial licence included |
| **GymVisual** | "8,000+ assets" | 2D illustrations | "$3–10/asset" |
| **ExerciseAnimatic** | "2,300+ videos" | 3D realistic video | "$1.00/clip or ~$329 bundle" |
| **Gym-Animations** | "7,000+ animations" | 3D realistic | "$199–$599 bundle-only" |
| **Hyperhuman** | "2,000+ stock exercise videos" | Real video / AI | SaaS subscription |
| **ExerciseDB** | "1,200+" | images / GIFs | free tier 100/day |
| **Your Move (ymove)** | white-label HD exercise videos | filmed video | quote |

Source: fetched [movekit.com/pricing](https://movekit.com/pricing) +
[movekit.com/blog/best-exercise-animation-libraries-2026](https://movekit.com/blog/best-exercise-animation-libraries-2026)
+ WorkoutX round-up. **Self-serving caveat:** the comparison table is hosted by
MoveKit, so its framing favours MoveKit; the *prices and sizes* are corroborated
by the independent WorkoutX page for overlapping vendors (ExerciseDB, MuscleWiki).

---

## 2. SYNTHESIS

### (a) Repeating winner patterns (apps + URLs)

1. **A visual demo on EVERY exercise is table stakes.** Gymshark "**every exercise
   includes a detailed video guide**" (700), Fitbod (1,600, filmed), Caliber (500+,
   free), MuscleWiki (1,700+ filmed), JuggernautAI (300+, multi-angle), Sweat,
   Peloton, Strong (animated). Volyume's **0/449 is the single biggest outlier in
   the entire set.** [row.gymshark.com](https://row.gymshark.com/blog/article/the-gymshark-training-app-for-ios-and-android),
   [fitbod.me/about-fitbod-exercises](https://fitbod.me/about-fitbod-exercises/),
   [barbend.com/caliber-fitness-app-review](https://barbend.com/caliber-fitness-app-review/).
2. **The anatomical body-map / muscle-tap browse is the discovery winner for
   beginners.** MuscleWiki's "**click any muscle**" front/back map is the archetype
   the whole category imitates; Fitbod/Caliber/JEFIT/Boostcamp/Alpha all expose
   **muscle + equipment filters** as first-class browse. [musclewiki.com/about](https://musclewiki.com/about).
3. **A standalone, always-on browsable Exercise Library tab** (catalogue, not just
   an add-to-plan picker) is universal: Gymshark, Caliber ("access the library in
   full … alphabetized and searchable"), JEFIT, Boostcamp, MuscleWiki. Info is
   reachable **before** you ever log the lift — the exact inversion of Volyume's gate.
4. **Filter forgiveness:** equipment + muscle + type filters mean a user who can't
   name the move still finds it. Alpha "**filter … based on equipment, muscles,
   type … or custom**"; Fitbod "**search … by muscle group, equipment type or
   keyword**". Nobody relies on name-substring alone.
5. **In-flow demo delivery** (Peloton "movement breakdowns at the start of each
   block", NTC real-time athlete demo, Boostcamp swap → demo video) — the demo
   comes to the user mid-session, not via a buried overflow menu.
6. **Media is bought/licensed, not hand-built**, and the cheap tier is well-mapped:
   MoveKit (clips $4.99, packs from $29; full-library price UNCONFIRMED — the prior "$99" figure failed the live-page spot-check) is the leading indie path; the
   open-source workout.cool saga proves *video licensing is the thing that kills
   these projects* — "**exercise video licensing costs were prohibitively
   expensive**". [movekit.com/pricing](https://movekit.com/pricing),
   [github.com/Snouzy/workout-cool](https://github.com/Snouzy/workout-cool).
7. **Equipment-aware swap** (JuggernautAI "based on what you have handy", Boostcamp
   coach-suggested alternatives) — Volyume already has the engine for this.

### (b) Where Volyume already leads, honestly

- **449 curated, deduplicated seeds with deep bodybuilding metadata.** That beats
  Strong (~200–300), JuggernautAI (300), Alpha (~620 but video-first), and is
  comparable to Caliber (500) — and Volyume's *metadata richness* (subregion tags
  like glute activator/stretcher/pumper, quad sweep/mass; SFR; fatigue; laterality;
  plate-loaded vs selectorised) exceeds the public structure of every competitor
  checked. Most rivals win on **count + media**, not on **data model**.
- **Per-exercise difficulty computed for all 449** — the data MuscleWiki/Workout
  Cool *wish* they had (workout.cool's #1 planned fix is beginner presets because
  "**the current flow assumes a bit too much knowledge up front**"). Volyume has the
  ingredient already; it just isn't surfaced.
- **Deterministic, explainable similarity for swaps** (muscle→subregion→pattern→
  equipment→compound→fatigue→SFR with a plain-English "Why this?"). Competitors
  either don't explain swaps or lean on AI; Volyume's is transparent and offline —
  a genuine, defensible edge that fits the no-LLM rule.
- **Offline-first** — only MuscleWiki among the leaders advertises offline core; for
  the rest, demos and library are network-bound.

### (c) Ranked pick-ups vs a-05's 5 frictions — for Besa (newbie) & Eddie (athlete)

**Friction map (a-05): F1 no browse surface · F2 rich detail gated behind logging ·
F3 zero visual demos · F4 name-substring-only search · F6 difficulty computed but
unused** (plus dead PlateCalculator, bare custom stubs).

1. **Ungate `ExerciseDetailScreen` + add a Library browse entry (kills F1 + F2 at
   once — the cheapest high-value win).** The rich screen already exists and renders
   from seed metadata; today it is only reachable from logged-lift rows. Routing the
   picker rows (and a new Library tab/section) into `ExerciseDetailScreen` for *any*
   exercise turns the existing asset into the catalogue every competitor has —
   **little new UI, mostly routing.** Besa can finally read "Romanian Deadlift"
   before doing it; Eddie can inspect an unfamiliar machine's detail pre-swap.
   Pattern source: Caliber/JEFIT/Gymshark full-library browse.
2. **Add muscle + equipment + difficulty filter chips to the browse list (kills F4 +
   F6).** The chips already exist inside the *create-custom* form; reuse them as
   *browse* filters. Surfacing the already-computed `difficulty` as a Beginner /
   Intermediate / Advanced filter gives Besa a safe starter view and Eddie a fast
   path to advanced variations — zero new data, just wiring. This is the MuscleWiki/
   Alpha/Fitbod pattern. Add muscle-name aliasing so "shoulders/legs/abs" resolve.
3. **Visual demos via licensed media — start with MoveKit, full-library price to be confirmed (kills
   F3, the biggest outlier).** Validated, no-SDK, plain MP4s drop into the existing
   detail layout's missing media slot; commercial licence included. Map the 200 to
   Volyume's highest-traffic compounds first (covers most beginner sessions). The
   workout.cool cautionary tale says: **own/licence cleanly, never scrape** — MoveKit
   satisfies that. Offline-first means bundling clips as assets, not streaming.
4. **Interactive body-map browse (Besa-facing delight, medium build).** A tappable
   front/back muscle map → filtered detail list is the single most beginner-friendly
   discovery pattern in the category (MuscleWiki). Can be a fast-follow once the
   filtered list (#2) exists, since it's just a graphical front-end to the same query.
5. **Equipment filter on the in-workout swap sheet (Eddie-facing, tiny).** a-05 notes
   the swap engine *supports* an `equipment` option but the in-workout call passes
   `{ equipment: [] }`. Competitors (JuggernautAI, Boostcamp) make equipment-aware
   swap a headline. Passing the user's equipment through is near-trivial and serves
   the "what I have handy" use case directly.

**Cheapest path to a browse surface (explicit, per the brief):** #1 + #2 together —
because `ExerciseDetailScreen` already exists and the filter chips already exist in
the custom-create form, a credible Library = *(existing picker list) + (reused chips
as filters) + (route taps into the existing detail screen)*. No new screen has to be
designed from scratch; the work is routing + filter wiring + a tab/entry point. Demos
(#3) and the body-map (#4) then layer onto that spine.

### (d) What everyone has that we lack

1. **A visual demo on every exercise** — universal; Volyume 0/449. *(F3)*
2. **A browsable Exercise Library destination** reachable any time, pre-logging —
   universal; Volyume has none. *(F1/F2)*
3. **Muscle + equipment filtering of the library** — universal; Volyume filters
   only inside custom-create, never for browse. *(F4)*
4. **Demo-on-the-swap-screen** so alternatives can be compared by sight (Boostcamp
   swap→video) — Volyume's swap is text-only.
5. **A beginner/difficulty curated view** — Gymshark "all ability levels", Sweat
   beginner weeks, workout.cool's planned presets; Volyume computes difficulty and
   discards it at the UI. *(F6)*
6. **Interactive anatomy/body-map discovery** (MuscleWiki) — absent in Volyume.
7. **A working in-app plate calculator surfaced to users** — Strong/Boostcamp ship
   one; Volyume's `PlateCalculator` exists but is dead code (orphaned, 0 importers).

---

## 3. Source ledger (load-bearing claims have 2+ where marked)

- Tooling proof / vendor table: workoutxapp.com round-up (fetched), movekit.com/pricing
  (fetched), movekit.com blog (fetched).
- Fitbod: fitbod.me/about-fitbod-exercises (fetched, retry) + fitbod.me/exercises &
  reviews (search) — **2 sources**.
- Gymshark: row.gymshark.com + support.gymshark.com (search) + val-ext-01-02 #42
  (prior fetched) — **2+ sources**.
- Caliber: barbend + garagegymreviews + caliberstrong (search) + val-ext-01-02 #26
  (prior fetched) — **2+ sources**.
- MuscleWiki: musclewiki.com/about (search) + app-store listings + WorkoutX table —
  **2+ sources** (direct host 403).
- Workout Cool: github.com/Snouzy/workout-cool (fetched) + HN thread (fetched) —
  **2 sources**, creator's own words.
- Boostcamp: boostcamp.app/exercises (fetched) + tips pages (search) + val-ext-01-02
  #12/#18 (prior fetched) — **2+ sources**.
- Strong: help.strongapp.io (fetched) + strong.app/reviews (search) + val-ext-01-02
  #47 — **2+ sources**.
- Alpha, JEFIT, JuggernautAI, NTC, Sweat, Peloton Strength+: jefit.com/exercises
  fetched; others via WebSearch of vendor pages + reviews (single-pass, flagged as
  such). NTC count carried from val-ext-01-02 #48 (CORRECTED to 185+).

**UNVERIFIABLE / not re-fetched this pass:** exact Lyfta in-app 3D vs web-PNG split
(web is PNG, confirmed; in-app media not directly inspected); MuscleWiki's true
in-app count (2000+ marketing vs 1700+ filmed vs 300+ API — all real for different
surfaces); Hevy's exact library size (host bot-walled both audits). None is
load-bearing for the pick-ups.
