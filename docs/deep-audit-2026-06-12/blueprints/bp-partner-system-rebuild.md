# Training-partner system rebuild — research + blueprint (2026-06-12)

Founder device-walk verdict on NEW-002 as shipped: buried under You →
Consistency as one row, the sheet rendered black-on-black (fixed, phantom
token), and the whole thing read as "a half done attempt". This is the
deep-research pass and the rebuild blueprint, founder-commissioned.

## 1. What the evidence says

**Paired accountability works, and the PAIR (not the feed) is the right
model.**
- Duolingo's Friend Streak (Aug 2024) is the strongest product evidence in
  any habit app: mutual accountability with ONE named person ("not letting a
  specific person down") proved a more durable re-engagement driver than
  anonymous leaderboards; the social cost of breaking a shared streak is a
  relationship, not a number. Shipped alongside Friends Quests (weekly paired
  challenges), these social mechanics rode the run from ~5M to 40M+ DAU.
  [Duolingo product lessons](https://blog.duolingo.com/product-lessons-friend-streak/), [Friends Quests](https://blog.duolingo.com/friends-quests/), [case study](https://trophy.so/blog/duolingo-gamification-case-study)
- Academic adherence literature: social support consistently predicts
  exercise adherence across populations; women with high social support were
  ~2x as likely to train 30min+ on 5+ days/week than those with low support.
  [PMC9517627](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9517627/), [Bryant honors study](https://digitalcommons.bryant.edu/cgi/viewcontent.cgi?article=1011&context=honors_appliedpsychology)
  (The oft-quoted "95% with an accountability partner" stat is weakly
  sourced; do not use it in copy.)
- Category contrast: Hevy/Strava monetise a full social FEED (workouts,
  comments, leaderboards); Gentler Streak proves the opposite pole (no
  social, privacy-first) also commands loyalty. Volyume's locked position —
  derived signals only, no raw data, never a fail word — is genuinely
  differentiated: the duo-accountability of Duolingo with the privacy of
  Gentler Streak. The concept is right; the EXECUTION under-delivered.
  [Hevy social](https://www.hevyapp.com/features/social-features/), [Gentler Streak](https://gentler.app/)

**Diagnosis of the shipped v1:** concept sound, surface starved.
1. No discovery story (one row inside a second-level screen).
2. No life: the pair never appears at the moments that matter (finishing a
   workout, the partner training, a cheer arriving).
3. No dedicated home (a modal sheet instead of a screen).
4. Visual bug made it look abandoned (fixed: phantom tokens + guard test).

## 2. Rebuild blueprint

Keep (locked, already built and correct): derived signals only (ticks like
"3 of 4", shared streak in weeks, resting state, one-tap daily cheer), the
privacy receipt copy, either-side unpair with delete, free 1 partner / Pro 3,
the pair-scoped sync layer, ED-suppression behaviour.

### 2.1 A dedicated PartnerScreen (the deep home)
Replace the modal-sheet-from-a-row with a proper screen (house style:
section cards, type tokens):
- **Paired state:** both sides of the week (you "3 of 4" · them "2 of 3"),
  the shared-streak chip with its repair/resting forgiveness visible, the
  cheer button (+ "cheered you" receipt), pause note when resting, and the
  quiet manage row (end partnership).
- **Empty state:** the pitch (one card, three lines), the privacy receipt
  (the existing copy, now properly styled), create-invite (share sheet) and
  enter-code — the current flows, re-set as a screen.
- Entry points: a row on You ("Training partner"), the existing section on
  Consistency (slimmed to a status row that opens the screen).

### 2.2 Make the pair ALIVE at the moments that matter
- **WorkoutSummary beat:** when you finish a session and have a partner, a
  quiet row: "That's 3 of 4 this week. [Partner] has trained 2 of 3." with
  the cheer button inline — the natural cheer moment, zero extra navigation.
- **Cheer received:** an in-app moment (Home/summary toast-level, calm) and
  optionally a push within the existing notification budget.
- **Partner trained today** (derived, no detail): optional, budget-capped.
All beats inherit calm/ED suppression (a suppressed user's partner surface
already freezes benignly via the resting state).

### 2.3 Notifications (inside NOTIFICATIONS_LOCKED budget)
Two candidate pushes, both opt-in-by-default OFF until founder approves:
cheer received; weekly shared-streak kept. Never "partner is beating you",
never a miss/shame framing (the resting state is indistinguishable from a
planned recovery week by design).

### 2.4 Explicitly NOT building (scope fence)
No feed, no comments, no leaderboards, no workout detail sharing, no
partner-finding/matching (stranger discovery is a different, riskier
product), no group chat. One-to-one pairs only.

## 3. Founder decisions needed
1. Day-to-day presence: should the paired state get a small Home chip, or
   live only on Consistency + WorkoutSummary beats?
2. Push notifications for cheer received / weekly streak kept: in or out (in-app only)?

## 4. Build order (each step reviewed + tested)
1. PartnerScreen (house style) + nav entries (You row, Consistency slim row).
2. WorkoutSummary partner beat (with cheer inline).
3. Notification beats (pending decision 2, inside the budget).
4. Invariant tests: signals stay derived-only (no raw metric ever crosses the
   pair boundary — extend the existing partner sync tests), suppression
   freeze, cheer once-per-day.
