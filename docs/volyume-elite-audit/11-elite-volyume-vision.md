# 11 · The Elite Volyume Vision

**Author:** Fable (main loop). **Date:** 2026-07-04.
**Status:** product direction, not a build order. The roadmap (`10`) sequences
it; this document says what "elite" *feels* like so every build decision has a
north star to check against.

---

## The sentence

**Volyume is the calm, private coach that witnesses your effort over time,
tells you the truth without shame, and never sells your attention or your
body back to you.**

Every word is load-bearing and every word is *already true in the code* — the
work is to make the whole product express it as clearly as the best screens
already do.

- **Calm** — no manufactured urgency, no streak-loss panic, no hype. (Voice
  locked; O3 confirms it holds; O8 names Gentler Streak as the soul.)
- **Private** — offline-first, encrypted, photos never leave the device, EU
  residency, no PII to anyone. (Locks; a genuine moat per O7.)
- **Coach that witnesses over time** — the deterministic weekly engine, the
  photo timeline, the partner who knows you showed up. Three forms of one idea.
- **Truth without shame** — deterministic, explainable, no AI black box; rest
  is a valid state; a missed week is acknowledged, never punished.
- **Never sells your attention** — no ads, no dark patterns, no bait-and-switch
  paywall, honest binary free/pro.

No competitor in the O7 set holds this whole position. It is Volyume's to own —
but only if the product *feels* it end to end, not just on its best screens.

---

## The three core loops

An elite product has a small number of loops that each complete
(trigger → action → reward) and reinforce each other. Volyume has one great loop
today and three that are half-open. The vision closes all four into a system.

### Loop 1 — The daily loop (already strong): **train → log → felt progress**
Open the app, see today's session already answered, log it, feel the set-logged
haptic and the PR moment. This is the app's spine and it is 8/10 today. The
elevation is *polish, not rebuild*: the same haptic/motion care the core has,
extended to the surfaces that are currently silent (O1 F2).

### Loop 2 — The weekly loop (the retention spine): **check in → be coached → adjust**
This is the most complete loop in the app (O4) and the single most important one
to elevate, because a calm *weekly* rhythm out-retains daily nagging for this
audience (O8/WHOOP). The vision: `runWeeklyCoach` becomes **an anticipated
weekly moment** — a Sunday/Monday beat the user looks forward to, structured
headline → trends → detail, deterministic and explainable (which is itself a
trust signal AI-coach loops can't offer). Crucially, **this is where the two
orphan features plug in**: the check-in is where a photo is calmly surfaced (not
demanded), where a partner's week is witnessed, where the coach can reference the
record. One weekly moment, three threads woven through it.

### Loop 3 — The witnessing loop (Photos, currently open): **change → capture → look back**
Today: capture works beautifully, but there is no calm path back to photo #2, so
the loop never closes (O5). The vision: the photo record is **surfaced, never
demanded** — a passive "your record is here, whenever you want to look" that
appears in moments the user is *already* reflecting (the weekly check-in), tied
to competence not appearance, fully ED-suppressed. The loop closes not with a nag
but with a calm, findable invitation to witness your own change.

### Loop 4 — The accountability loop (Partners, currently open): **commit → show up → be seen**
Today: one weekly boolean and one wordless cheer — near-passive (O6). The vision:
a **mutual weekly intention** you both own ("you both aimed for four this week"),
witnessed at week close as a *shared* kept moment — relational, never evaluative,
never a number one of you beats the other on. The reward is *being seen showing
up by someone you trust*, which the research (O8) names as what actually retains
without shame.

**The unlock:** loops 3 and 4 both close *through* loop 2. Photos and Partners
stop being destinations you must remember to visit and become threads in the
weekly moment you already anticipate. That is how two bolt-ons become two organs.

---

## Design principles (the house style, made explicit)

These are extracted from what the best screens already do (O1's reference set)
plus the current-era patterns O8 verified. Any new work is checked against them.

1. **One brand, two dialects.** Hold `theme.js` tokens, the coaching voice, and
   the motion *character* constant across iOS and Android; branch the navigation,
   sheet idioms, back behaviour, and haptic mapping per platform. Never average
   into UI native to neither. (O8's governing rule.)
2. **The whole app is one material.** Every surface is a `Card`; every pushed
   screen is a `BackHeader`; every sheet is the shared sheet. The user should
   never feel a seam between features. (Closes O1 F1/F3.)
3. **Motion and haptics at moments of meaning, calm amplitude.** Spend the budget
   on set-logged, PB, check-in-saved, week-kept, shutter — and stay quiet and
   fast everywhere else. Volyume's "expressive" is *quiet confidence*, not
   playful bounce. (O8; closes O1 F2.)
4. **Rest is a first-class state; reward showing up.** Never a fragile perfect
   streak; always a weekly rhythm with automatic grace. A missed week is
   acknowledged calmly, never red, never "don't break your streak." (Gentler
   Streak, O8; already the partner-streak design.)
5. **Self-relative, never peer-relative.** Progress is always you-vs-your-past,
   never you-vs-them. No leaderboards, ever. (O8; ED-safety mandate.)
6. **Privacy is surfaced as trust, at the anxious moment.** "Never leaves your
   phone" belongs *at the camera permission*, not buried in settings. The privacy
   receipt is a feature, not fine print. (O5 F8; O6's best copy.)
7. **Latency is masked; the offline-first speed edge is exploited.** Skeletons
   shaped to content, optimistic writes, no dead blank frames. Volyume is
   structurally advantaged here (local SQLite) — use it. (O8; closes O1 F5/F6.)
8. **Truth over flattery.** Deterministic outputs, explained ("why this plan").
   A first-ever lift is honestly not faked as a record (O3 praises this). The
   coach's honesty *is* the product.
9. **Every empty/error/first-run state teaches.** These unglamorous states are
   where premium is judged (O8). Volyume's empties are already strong; the gap is
   error states, which mostly don't exist (O1 F5).

---

## Signature features (what makes Volyume unmistakably itself)

Not a build list — the identity markers an elite Volyume leans into:

1. **The deterministic weekly coach, as a ritual.** The anti-AI stance made
   tangible: a written, explainable weekly verdict you can trust *because* it
   isn't a black box. Nobody else can copy this without abandoning their AI story.
2. **Ghost-overlay progress capture.** Already best-in-class and shipped (O5); no
   coaching competitor has it. Promote it as a signature, give it the haptic and
   motion polish the rest of the capture flow deserves.
3. **The witnessed-effort partnership.** A 1:1 bond that captures Strava's
   retaining half (relational recognition) while refusing its anxiety half
   (evaluative comparison) — a combination O7 says *no one* in the market offers.
4. **Privacy as a visible product surface.** The partner privacy receipt and the
   "never leaves your phone" photo promise, surfaced proudly. In a market Google
   is now policing for health-data leaks, this is a moat you show, not hide.
5. **The calm voice, everywhere.** The thing users will describe to friends: "it
   never makes me feel bad." O3 confirms it holds; the vision is that it holds on
   *every* string, including the error states that are currently cold.

---

## What Volyume must refuse (the discipline)

Elite is as much about refusal as addition. The audit surfaced the temptations;
the brand refuses them:

- **No AI coaching.** The contrarian trust stance is the moat. (Constitution.)
- **No manufactured streak-loss anxiety, no variable-reward slot loops.** O8's
  single "refuse this" — it conflicts with the calm/ED-safe brand head-on.
- **No leaderboards, no evaluative social.** Belonging, never comparison.
- **No paywall dark patterns.** Honest timeline trial, visible terms, real
  Restore. The market resents the opposite; Volyume's honesty is the asset.
- **No photo cloud upload.** The lock is a moat. Backup, if built, is
  user-controlled local export — never a Volyume-held copy.
- **No weakening of the ED-safety system or the Article 9 gate.** Ever. These
  are not features; they are the foundation the brand stands on.

---

## The test of success

Volyume is elite when:

1. A new user cannot tell which features were built last — the seams are gone.
2. The user *anticipates* their weekly coach moment the way WHOOP users
   anticipate their assessment.
3. A user takes a second progress photo without ever being nagged to — because
   the calm path back was there when they were already reflecting.
4. Two partners feel *seen by each other* showing up, and neither ever feels
   ranked, judged, or behind.
5. The founder can answer any funnel question from data, not instinct.
6. A prospective user reads the App Store page and understands in one line why
   Volyume is different: *calm, private, honest, no AI, no shame.*
7. Every string, every empty state, every error still sounds like the same calm
   voice — even when something has gone wrong.

None of this requires a rebuild. All of it is assembly, weaving, and polish on
foundations that are already, genuinely, elite.
