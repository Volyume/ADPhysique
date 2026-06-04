# Deep Feature Audit — Item 11: You tab (YouScreen)

**Document:** deep-audit-12-you-tab.md
**Item:** 11 of master inventory (Group 2 — tab landings; `ProfileTab` / title "You")
**File:** `src/screens/YouScreen.js` (214 lines), components `PressableCard`, `ProBadge`, `ScreenHeader`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approved"). Added a muted app-version line to the About footer, read from expo-application (hidden when the native value is unavailable). Added a jest manual mock `__mocks__/expo-application.js` so the now-mounted import transforms in tests. Row icons and the longer subs kept (flags). No behaviour change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The root of the You tab: "the place you manage yourself, your plan and your
settings". A profile card (avatar initial, name, training age, completed-session
count), then sectioned nav rows: a "Go Pro" row for free users; a "Coaching"
section for Pro (Weekly check-in, Precision Coaching, Update your plan, Nutrition
targets, Goal lock); a "Preferences" section (Wellbeing check for Pro, Settings);
and an About footer with the brand line. Each row is a `PressableCard` with an
amber icon well, label, sub, and chevron. Session count loads on focus.

### Findings
1. **Clean and research-aligned.** No dead styles (verified 0 orphans), eslint
   clean, a11y correct (`PressableCard` defaults `accessibilityRole="button"`
   and each row passes a label). The structure (avatar + name at top, grouped
   categories, icons alongside labels) matches profile/settings best practice
   almost point for point (Step B).
2. **Icon-well on every row — a noted tension, but keep.** CLAUDE.md's design-
   fingerprint rule cautions against "generic Ionicons used as decoration on
   every list item … decorative icons next to every row dilute" the amber brand.
   Here, though, the icons are *functional* navigation glyphs (pulse = check-in,
   flag = plan, nutrition = targets, shield = goal lock) in a settings list, and
   the UX research is explicit that icons-alongside-labels in a profile menu aid
   recognition and scanning. This is the defensible, conventional pattern, not
   decoration. Recommendation: keep. Flagged only so the call is conscious.
3. **No app version shown.** The About footer shows the brand line ("Less
   thinking. More lifting. · Private by design", `:165`) in a style literally
   named `aboutVersion`, but there is no actual version/build string anywhere on
   the screen. A version line is a small, conventional support aid (so a user can
   say "I'm on 1.4.2" when reporting an issue). `expo-application` is already a
   dependency used elsewhere (Article 9 consent). The one concrete, low-risk add.
4. **A couple of nav subs run long.** "Precision Coaching" (`:119`) and "Update
   your plan" (`:125`) subs are two sentences. They describe consequential
   destinations, so the detail is mostly earned, but they are the rows most
   exposed to footnote-creep. Borderline; my lean is keep. Flagged for the call.
5. **Copy is on-voice.** No em dashes (uses ·), British, no AI tells, no unearned
   encouragement. The brand line is punchy and on-identity. Nothing to rewrite.

### Design assessment (values cited)
- On-system: `surface` cards, amber `primaryBg` icon wells + `primary` avatar
  ring, scale tokens, `ProBadge` for the Pro marker. Calm, scannable, grouped.
  The profile card leads with identity; sections are labelled; About closes it.
  Reads as a real product's account hub, not a template.

### Flow / integration assessment
- Rows route to the right destinations (WeeklyCheckIn, CoachOutput, ProGoalSetup,
  NutritionTargets, GoalLockConsent with editMode, WellbeingCheck, Settings,
  ProUpgrade). Tier gates the Coaching section and the Go-Pro / Wellbeing rows.
  Session count is a focus-load with an alive guard. Clean.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Avatar + name at top, grouped categories.** A photo/avatar with name for
  quick identification, settings grouped into logical categories, is the named
  pattern. Volyume does both (avatar + name + Pro badge; Coaching / Preferences
  groups). [Eleken; Toptal]
- **Icons alongside labels aid navigation.** "Incorporating icons alongside text
  in your profile menu creates a more intuitive experience … instant
  recognition." This directly supports keeping Volyume's row icons (finding 2).
  [Atheros]
- **Clear, concise labels; logical categories (account, notifications, privacy,
  preferences).** Volyume's Settings row bundles these one level down, with the
  high-value coaching shortcuts surfaced on the hub. [Toptal; Eleken]

---

## STEP C — COMPARISON

### Where Volyume leads
- A focused account hub that surfaces the high-value coaching actions (check-in,
  coach output, plan rebuild, nutrition, goal lock) directly rather than burying
  everything under "Settings", while still grouping cleanly. Identity-first,
  research-aligned, on the locked dark/amber system. [Eleken; Atheros]

### Where Volyume lags
- No app version on the hub (finding 3) — minor support nicety.
- Two nav subs lean long (finding 4) — borderline, defensible.

### Critical gaps
- None. This is a clean, well-built screen; the only concrete item is the
  version line.

---

## STEP D — PROPOSAL

### Summary
This screen is strong and research-aligned; the honest proposal is light. One
small concrete add (an app version string in About), and two conscious "keep"
flags (the row icons and the longer subs).

### Specific changes — one by one

**1. Add an app version line to About. [Low] — `:163-166`**
- What: show the version (and optionally build number) under the brand line,
  read from `expo-application` (`nativeApplicationVersion` /
  `nativeBuildVersion`), reusing the existing dependency. A muted single line,
  e.g. "Version 1.4.2 (123)". Helps support and is the conventional hub footer.

**2. (Flag — keep) Row icons.** Note the CLAUDE.md tension but keep: these are
functional nav glyphs and the UX research backs icons-alongside-labels. No
change unless you want them stripped.

**3. (Flag — keep, your call) Two longer nav subs.** "Precision Coaching" and
"Update your plan" run two sentences. Defensible (consequential destinations); I
can tighten them to one line if you'd prefer leaner rows. No change proposed.

### COPY CHANGES
None proposed. (If change 1 lands, the only new copy is the version line, which
is data, not voice.)

### What to keep (with evidence)
- Identity-first profile card, grouped Coaching/Preferences sections, the
  surfaced coaching shortcuts, the functional row icons, the brand About line,
  and the tier gating. [Eleken; Atheros; Toptal]

### IMPACT / EFFORT
- **Impact: Low** (a support nicety on an already-strong screen).
- **Effort: Low.** One muted line reading an existing dependency; no behaviour,
  data, or navigation change.

### SOURCES
- Eleken — Profile page design examples:
  https://www.eleken.co/blog-posts/profile-page-design
- Toptal — How to improve app settings UX:
  https://www.toptal.com/designers/ux/settings-ux
- Atheros — How to design a better app profile menu:
  https://learning.atheros.ai/blog/how-to-a-design-better-app-profile-menu
