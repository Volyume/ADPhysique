# r-18 — Wellbeing & Safety UX (PRESENTATION-ONLY research)

ULTIMATE-APP MANDATE, Phase 2, Area 18 (FINAL research area). Pairs with
`audit/a-18-safety-systems.md`. **HARD CONSTRAINT honoured throughout:** this
report informs the PRESENTATION of safety — copy, signpost placement, calm UX —
and proposes NOTHING that changes any floor, threshold, suppression rule or
detector. Every pick-up below is marked **FOUNDER-GATE** (safety-adjacent: needs
explicit founder sign-off before any build).

Today: 2026-06-12. Working internet. British English.

---

## STEP 0 — tooling proven (verbatim quote + URL)

Gentler Streak (fetched end-to-end), verbatim:

> "Streaks that celebrate rest. Gentler Streak rewards consistency over
> perfection, so taking a break never means starting over." … "No guilt, no
> punishment. The app keeps you moving for months and years, not just days."

— https://gentlerstories.com/gentlerstreak/ (reached via 301 from
gentlerstreak.com → gentlerstories.com/gentlerstreak/)

Tooling end-to-end confirmed: WebSearch live, WebFetch live (the Oura blog 301-chained
into an image asset, so its quote was sourced from Oura's own support article and
Pulse blog instead — logged below).

---

## 1. PRESENTATION PATTERNS — per source, with verbatim where load-bearing

### 1a. Oura Rest Mode — the calm-pause benchmark
How reduced functionality is EXPLAINED (not silent). Oura support, verbatim:

> "your Activity Progress Goal, Activity Score, and all activity-related
> contributors will be disabled. Your Readiness and Sleep insights will also be
> adjusted to help you prioritize rest and recovery." … Rest Mode is "a unique
> mode in the Oura App, designed for days when your body and mind need time to
> rest," emphasising that "you're proactively taking time to recover."

— https://support.ouraring.com/hc/en-us/articles/360057065433-Rest-Mode
Corroborated by Pulse blog summary (https://ouraring.com/blog/ouras-new-rest-mode-helps-optimize-your-recovery/
via WebSearch): Rest Mode "disables your Activity Score, activity goals, and all
related contributors to remove any pressure to be active," can auto-activate on
elevated body temperature, and on exit "your Oura App and any insights will
gradually return to normal … for a period lasting as long as Rest Mode was on, or
a maximum of seven days."

Lessons for PRESENTATION:
- **The reduction is NAMED and FRAMED, never silent.** The user is told exactly
  which numbers are paused and WHY ("to remove any pressure"). This is the direct
  benchmark for a-18's GAP-2 (silent suppression with no in-context signpost).
- **Auto-entry is explained, not sprung.** When the system enters the calm state
  on its own, it tells the user it has done so and why.
- **The exit is a gentle ramp with copy**, never a snap back to full numbers —
  mirrors Volyume's already-good `EdPatternClearedBlock` ("standard coaching
  resumes next week").
- Help resources: Oura's is a recovery framing, not a crisis one — not a
  one-to-one with ED, but the *explain-the-pause* pattern transfers cleanly.

### 1b. Gentler Streak — anti-shame language
Verbatim (above) plus:

> "Staying active for life isn't about pushing harder. It's about moving smarter,
> listening to your body, and never feeling judged for where you are." …
> "Go Gentler keeps you building fitness without ever tipping into overtraining."

— https://gentlerstories.com/gentlerstreak/

Lessons:
- **Rest is a first-class streak state, not a failure.** "taking a break never
  means starting over" — exactly Volyume's "resting" week (`streak.js`), but
  Gentler Streak *says it out loud* as a positive, where Volyume's is silent-by-
  design (deliberately indistinguishable from a deload for privacy — a-18 §3).
- **No-guilt vocabulary** ("no guilt, no punishment", "never feeling judged") is
  the tone register to benchmark Volyume's calm copy against.
- The overtraining-protection framing ("without ever tipping into overtraining")
  is a model for explaining an upward-only protective hold WITHOUT pathologising
  the user — relevant to how rapid-loss compression (Move #3) is described.

### 1c. Apple Fitness — rest-day handling (watchOS 11)
Via WebSearch (Wareable, MacRumors, TechRadar; multi-source):
- watchOS 11 lets users **pause Activity Rings for up to 90 days** (illness,
  vacation, injury) **without losing a streak**, and **set different Move goals
  on different days of the week**.
— https://www.wareable.com/apple/how-to-view-earn-apple-watch-awards-challenges-badges-achievements,
https://www.macrumors.com/2024/11/20/apple-watch-all-rings-closed-awards/

Lessons:
- **User-controlled pause with no streak penalty** is now table stakes at the top
  of the field. Volyume's streak already "freezes benignly," but Apple gives the
  user the *agency and the explanation*; Volyume's freeze is involuntary and
  silent under flag (correct for ED privacy, but the contrast is instructive for
  the *voluntary* calm-mode case).
- Per-day-of-week goals = explicit permission to vary. A presentation cue for
  framing held/softened weeks as legitimate, not lapses.

### 1d. Headspace / Calm — crisis-resource surfacing
Headspace, verbatim:

> "Please do not attempt to access emergency care through Headspace Products and
> Services."

— https://www.headspace.com/mental-health-resources (a dedicated, persistent
"Mental Health Resources / Crisis / Emergency Resources" hub:
https://help.headspace.com/hc/en-us/categories/19787419210651-Mental-Health-Resources-Crisis-Emergency-Resources
— note: the help-centre category URL returned HTTP 403 to WebFetch; content
sourced from the indexed WebSearch summary instead, logged below).
Calm: positioned as "unsuitable for people experiencing severe symptoms … and
those in a mental health crisis"
(https://www.medicalnewstoday.com/articles/calm-app).

Lessons:
- **A persistent, always-reachable resources hub** sits *alongside* the app, not
  only behind a triggered state. Volyume currently surfaces Beat only on
  triggered surfaces (CoachOutput lockout, food HeldDecisionCard, BodyMetrics
  confirm, SCOFF≥2 alert — a-18 §2). The always-visible hub is the field pattern
  for the "help should not be only behind a screen the user may not visit"
  problem (GAP-2).
- **Clear scope-limit disclaimer** ("not for emergencies; here is who is") is
  standard and non-alarming. Volyume's signposts are charity-specific and warmer,
  which is good — the gap is *reachability*, not tone.

### 1e. Instagram / TikTok — ED-adjacent redirects (and their criticisms)
Instagram, verbatim:

> "when someone tries searching for terms related to disordered eating, we'll
> share these resources first before showing the search results" … resources
> include "contacts for local eating disorders hotlines in certain countries,
> such as Beat in the UK, National Eating Disorder Information Centre in Canada
> and Butterfly Foundation in Australia, as well as new advice on how to build
> body confidence" (built with NEDA).

— https://about.instagram.com/blog/announcements/how-were-supporting-people-affected-by-eating-disorders-and-negative-body-image

TikTok: searching "anorexia" shows a "You're not alone" interstitial with a
resources button and a direct-call button to the National Alliance for Eating
Disorders; "skinnytok" was later blocked outright (WebSearch; the BBC article URL
404'd — logged). Both built their guides with NEDA.

Criticism (the part to learn from): interventions "may redirect the small portion
of individuals who are willing to seek help," but users "can still find harmful
pro-eating disorder content despite these measures"
(https://about.instagram.com/... + Slate
https://slate.com/technology/2021/10/instagram-social-media-eating-disorder-trigger.html).

Lessons:
- **Locale-aware charity routing** (Beat UK / NEDIC / Butterfly) — Volyume
  ALREADY does this via `getEdSupportLink(locale)` in `EdPatternLockoutBlock`
  (a-18 §2.3). Volyume is *at parity or ahead* here.
- **Interstitial-before-content** (resources shown *first*) is the placement
  model for the silent-suppression gap: present the help in-context at the moment
  of the softened surface, not only on a screen the user must navigate to.
- Criticism takeaway: a redirect on its own is weak if the underlying mechanism
  still permits harm. Volyume's strength is the opposite — the *mechanism*
  (deterministic suppression + hard floors) does the protecting, and the copy is
  the secondary layer. We must not over-index on copy as if it were the safeguard.

### 1f. Noom — criticised patterns (what NOT to do)
Multi-source (Femestella, BUST, Outside via WebSearch; Outside's article body was
behind an OIDC auth redirect — logged):
- **Red/yellow/green food colouring** implies "good/bad foods," "creates
  subconscious rules and restrictions," and coaches reportedly messaged users for
  eating "too many red foods" — guilt despite a "no bad foods" claim.
- **No ED screening**; the intake "doesn't ask about eating-disorder history or
  relationship with food" — psychologist Alexis Conason: clients "find that it's
  incredibly triggering."
— https://www.femestella.com/noom-reviews-horror-stories-eating-disorders/

REJECT list (see §4). Note Volyume has the *opposite* posture: SCOFF screen +
ED-history-sensitive gating exist; no colour-coded "bad food" guilt system was
found in the food audit work.

### 1g. NEDA "Tessa" chatbot — the field's cautionary tale
Verbatim, the activist who broke the story:

> "Every single thing Tessa suggested were things that led to the development of
> my eating disorder. This robot causes harm." — Sharon Maxwell

Tessa advised "count calories and strive for a deficit of up to 1,000 calories per
day," recommended skin calipers and where to buy them; former helpline staff
warned "a chatbot is no substitute for human empathy." NEDA pulled it within hours
of the screenshots after an AI layer was added without approval.

— https://www.cbsnews.com/news/eating-disorder-helpline-chatbot-disabled/ ;
corroborated by NPR
https://www.npr.org/2023/06/08/1181131532/eating-disorder-helpline-takes-down-chatbot-after-it-gave-weight-loss-advice

Lesson: **this is the single strongest external vindication of CLAUDE.md's
no-AI-in-the-coaching-engine rule.** The harm came precisely from a non-
deterministic layer generating advice. Volyume's deterministic engine + hard
floors structurally cannot do what Tessa did. Keep it that way.

### 1h. BEAT UK / charity guidance + academic/clinical UX on calorie display
Beat (Tom Quin), verbatim:

> "Many people with eating disorders count calories or track weight loss to the
> point of obsession, and such apps can facilitate or exacerbate such behaviours
> and make recovery harder." … "The apps should ensure people are directed to
> discuss their purchase or use with a medical professional if they have a history
> of an eating disorder."

— https://www.diabetes.co.uk/news/2019/jul/calorie-counting-apps-accused-of-encouraging-eating-disorders-97800493.html

Academic / clinical UX — the load-bearing source (qualitative study, BJPsych
Open / "Effects of diet and fitness apps on eating disorder behaviours"), verbatim
findings:
- "fixation on numbers" core harm; users see "protein/fat/carbs instead of … a
  chicken breast."
- **Numeric/colour feedback triggers distress**: "That red number would scare me
  a lot because I'd be like, 'Well, now I can't eat anything…'"
- **Gamification**: "a game to beat the calories … the more you don't eat, it's
  like, 'Oh, I beat the app!'"
- **Safety/warning messages BACKFIRE**: weight-projection messages ("you would
  weigh this amount") became "a motivation" for restriction rather than a deterrent.
- Design recommendations: move "beyond numbers," reduce calorie/weight emphasis,
  redesign colour-coded feedback, **encourage breaks rather than consistent daily
  logging**, involve ED survivors in design.

— https://pmc.ncbi.nlm.nih.gov/articles/PMC8485346/ ; second host (Cambridge Core)
corroborating the warning-backfire finding:
https://www.cambridge.org/core/journals/bjpsych-open/article/effects-of-diet-and-fitness-apps-on-eating-disorder-behaviours-qualitative-study/2D1EE739D97AB3EFC6573835E4C527BD

**Critical implication for Volyume:** the "warning backfires" finding is a direct
clinical endorsement of Volyume's existing design — under an open flag the weight
card already drops to **direction-only copy, no rate, no projection, no dot**
(a-18 §2, `weightTrend.js:94-116`). Volyume does NOT show the projection-style
warning the study found harmful. This is a place Volyume is *ahead of the
literature's warning*, not behind it.

---

## 2. WHERE VOLYUME ALREADY LEADS (likely ahead of the entire field)

Cross-referenced to a-18 evidence:
1. **Deterministic suppression breadth.** 21 suppression surfaces wired to one
   central read (`getOpenEdPatternFlag`) — coach, weight card, streak, partner,
   widgets, all push schedulers, recaps, milestones. No surveyed consumer app
   suppresses across this many surfaces from a single safety flag. The field
   redirects *search*; Volyume reshapes the *whole product surface*.
2. **Hard, non-negotiable floors** (1,500 male / 1,200 female; 1.5%/wk gate;
   FFM/RED-S 30 kcal/kg). The field *warns*; Volyume *clamps*. Noom and
   MyFitnessPal famously do neither.
3. **No AI in the advice path.** The Tessa disaster (§1g) is the field's proof
   that generative advice in this space is dangerous. Volyume's deterministic
   engine is the structural answer.
4. **No projection-style "warning" copy under flag.** The exact feature the
   clinical study (§1h) found backfires is absent under an open flag; Volyume
   shows direction-only copy. Ahead of the literature's caution.
5. **Locale-aware charity routing already shipped** (`getEdSupportLink(locale)`),
   matching Instagram/TikTok's locale routing — and never dead-ends
   (`HeldDecisionCard.js:21-23`).
6. **Privacy-preserving freeze** (resting week indistinguishable from a deload)
   — a deliberate dignity choice most platforms don't make; their interventions
   are conspicuous and can feel accusatory.

Volyume's safety *mechanism* is plausibly best-in-field. The gaps below are
PRESENTATION reachability only.

---

## 3. RANKED PRESENTATION-ONLY PICK-UPS (all FOUNDER-GATE, mechanisms untouched)

Each leaves every floor/threshold/suppression rule/detector byte-for-byte
unchanged; each adds or relocates COPY/SIGNPOST only.

**P1 (highest) — In-context calm signpost on silent surfaces (a-18 GAP-2).**
FOUNDER-GATE. The Oura/Instagram pattern: when a surface is softened/frozen under
an open flag, present a small, calm, in-context line + the existing Beat link
*at that surface*, so a user who never opens the weekly coach screen still has a
route to support. Decision the founder must make:
  (a) Show an in-context signpost on softened surfaces? — RISK: it partially
      defeats the deliberate privacy of the indistinguishable freeze (a-18 §3).
  (b) Or keep surfaces silent but add ONE persistent, always-reachable "Support &
      wellbeing" entry (Headspace/Calm hub model) in Settings/You, independent of
      flag state, so help is always one tap away without ever signalling "we think
      you have an ED" on a public surface? — preserves privacy, fixes
      reachability. **This (b) is the lower-risk reading and the recommended
      default to put to the founder.**
  Mechanism untouched either way — copy/navigation only.

**P2 — Name the pause where it is voluntary (calm mode), Oura-style.** FOUNDER-GATE.
Calm mode is user-chosen and not secret (a-18 §1). For calm-mode (NOT flag)
surfaces, adopt Oura/Gentler-Streak explicit framing: a short "you've chosen a
gentler view; figures are softened" note, so softened copy reads as *chosen*, not
broken. Does not touch the flag path. Copy only.

**P3 — Explicit "rest is not a lapse" copy on the voluntary resting streak.**
FOUNDER-GATE. Gentler Streak / Apple model. ONLY for the non-flag resting case
(deload/chosen rest), state positively that rest preserves the streak. Must NOT be
shown on the flag-driven freeze (that must stay indistinguishable for privacy).
Requires care to gate by cause; copy only, no streak-logic change.

**P4 — Resolve the two suppression vocabularies as a PRESENTATION decision only
(a-18 GAP-3).** FOUNDER-GATE, and explicitly a *documentation/copy* question, not
a rule change: the asymmetry (some surfaces suppress on `scoffScore≥2`, others on
flag only) is a mechanism question the audit flags — present it to the founder as
"is the user-visible behaviour intended to differ?" Do NOT alter either gate;
surface the decision. (If the founder wants uniformity, that is a mechanism change
needing its own sign-off and tests — out of presentation scope.)

**P5 — Calm-mode coverage as a copy-review checklist, not a code change
(a-18 GAP-4).** FOUNDER-GATE-lite. Add a presentation-layer checklist item:
"any new user-facing numeric surface must read calm mode." This is process/doc,
touches no mechanism. (Central enforcement = a mechanism change, out of scope.)

Ordering rationale: P1 fixes the only gap with a real user-can-miss-help risk;
P2/P3 are warmth wins on the voluntary path with no privacy cost; P4/P5 are
decision-surfacing, not builds.

---

## 4. CONSCIOUSLY REJECT (field does it; Volyume should not)

1. **Generative/AI advice in the coaching path** — the Tessa disaster (§1g).
   CLAUDE.md already forbids it; this report is external proof. REJECT permanently.
2. **Red/yellow/green "good/bad food" colour guilt** (Noom, §1f) and coach
   guilt-messaging for "too many red foods." REJECT — the clinical study (§1h)
   shows colour feedback directly triggers distress.
3. **Projection-style warnings** ("you would weigh X") as a safety nudge — the
   study (§1h) shows they BACKFIRE into restriction. Volyume already avoids this;
   never add it.
4. **Conspicuous, accusatory interventions** that publicly signal "we think you
   have a disorder." The platform interstitials work for search but would violate
   Volyume's dignity-preserving silent freeze. REJECT the loud version; keep the
   private one (this is the tension behind P1's recommended option (b)).
5. **Treating a redirect/signpost as the safeguard** (the platform criticism in
   §1e). Copy is the secondary layer; the deterministic mechanism is the
   safeguard. REJECT any proposal that softens a mechanism on the premise that
   "the signpost covers it."

---

## 5. SOURCES & FETCH LOG

Fetched (load-bearing claims carry 2+ where noted):
- Gentler Streak — gentlerstories.com/gentlerstreak/ (WebFetch OK, verbatim)
- Oura Rest Mode — support.ouraring.com/.../360057065433-Rest-Mode (WebFetch OK,
  verbatim) + ouraring.com/blog/ouras-new-rest-mode-... (WebSearch corroboration)
- Apple Fitness rest days — Wareable + MacRumors (WebSearch, multi-source)
- Headspace resources — headspace.com/mental-health-resources +
  medicalnewstoday.com/articles/calm-app (WebSearch; help-centre URL 403'd)
- Instagram ED interventions — about.instagram.com blog (WebFetch OK, verbatim)
- TikTok interventions — WebSearch (Yahoo/TechCrunch); BBC skinnytok URL 404'd
- Noom criticism — femestella.com (WebSearch, multi-source w/ BUST)
- NEDA Tessa — cbsnews.com (WebFetch OK, verbatim) + npr.org (corroboration)
- Clinical UX — pmc.ncbi.nlm.nih.gov/articles/PMC8485346 (WebFetch OK, verbatim)
  + cambridge.org BJPsych Open (WebSearch corroboration, warning-backfire)
- Beat UK guidance — diabetes.co.uk 2019 (WebFetch OK, Tom Quin verbatim)

Fetch FAILURES logged (6 distinct URLs/chains):
1. ouraring.com/blog/rest-mode/ — 301-chained into a .png asset; routed around
   via support article + Pulse blog summary.
2. calm.com/blog/crisis-resources — 404.
3. help.headspace.com/.../19787419210651-... — 403; used WebSearch indexed summary.
4. feeds.bbci.co.uk/news/articles/c4gr6q6256do (skinnytok) — 404; TikTok facts
   sourced from WebSearch summary instead.
5. outsideonline.com/.../noom-app-diet-trend — OIDC auth redirect; used
   Femestella/BUST instead.
6. beateatingdisorders.org.uk/.../types — page had no app/calorie guidance; Beat's
   app stance sourced from the diabetes.co.uk Tom Quin quote instead.

UNVERIFIABLE noted inline where exact in-app copy could not be quoted (Instagram's
precise interstitial wording; TikTok's exact button strings) — described, not
invented.

NO code was read for modification. NO floor, threshold, signpost or suppression
rule is changed or proposed to change. All §3 pick-ups are FOUNDER-GATE.
