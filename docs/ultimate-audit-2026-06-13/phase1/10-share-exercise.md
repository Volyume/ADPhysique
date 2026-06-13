# Phase 1 inventory — Share Card + Exercise Detail (2026-06-13)

Source files read in full:
- `src/screens/ShareCardScreen.js` (1–1619)
- `src/screens/ExerciseDetailScreen.js` (1–1153)
- `src/styles/theme.js` (1–538, for token resolution)
- `src/navigation/RootNavigator.js` (route registration lines only)
- `src/lib/formTips.js` (1–60, to confirm FORM_TIPS content type)

Token values used below (theme.js):
- `fontSize.xs (11)` theme.js:258, `fontSize.sm (13)` theme.js:259, `fontSize.md (16)` theme.js:260, `fontSize.lg (17)` theme.js:261, `fontSize.xl (20)` theme.js:262, `fontSize.xxl (24)` theme.js:263.
- `type.label` → `fontSize.sm (13)` / medium theme.js:402-405; `type.caption` → `fontSize.xs (11)` theme.js:406-409; `type.title` → `fontSize.lg (17)` theme.js:390-393; `type.bodyStrong` → `fontSize.md (16)` theme.js:398-401; `type.num('title')` → `fontSize.lg (17)` tabular theme.js:417-420 + 390-393; `type.num('bodyStrong')` → `fontSize.md (16)`; `type.num('caption')` → `fontSize.xs (11)`.
- spacing: `xxs 2, xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48` theme.js:228-239. radius: `xs 4, sm 6, md 10, lg 14, xl 20, full 999` theme.js:241-248.

---

```
SCREEN: Share Card (ShareCardScreen)
WHAT IT IS: A composer that turns a finished workout, a single PR, or a milestone into a branded shareable image (square 1:1 or story 9:16) plus an optional one-page PDF summary. It shows a live in-app preview, privacy toggles for what to include, then renders the real export off-screen in a hidden WebView canvas and hands it to the OS share sheet. (ShareCardScreen.js:759, 1017)

WHAT IS ON IT:
  - Card-type segmented control: shows only the buttons matching the data the screen was opened with — "Session", "New PR", "Milestone" (ShareCardScreen.js:1022-1032). Buttons render conditionally on sessionData / prData / milestoneData (1023, 1026, 1029).
  - "Format" section title + segmented control: "Story 9:16" (phone-portrait-outline icon) and "Square 1:1" (square-outline icon) (ShareCardScreen.js:1035-1051). Icon size 15 (1042, 1048).
  - "Preview" section title (ShareCardScreen.js:1055) + live preview card. Renders MilestonePreview / SessionPreview / PRPreview depending on cardType (ShareCardScreen.js:1057-1083). Preview itself shows (per card type): top amber accent bar, brand wordmark image + date, plan label, hero session/exercise name, hero stat number + label, intensity badge (SOLID/TOUGH/EPIC SESSION), 2–3 stat boxes (Sets / Time / Exercises or Total kg), top-lift card (story only), exercise chips (story only), and a branded footer (wordmark + "SMARTER  TRAINING" tagline + "volyume.app" + amber accent) (SessionPreview 1256-1322; PRPreview PR badge "★ PERSONAL RECORD ★", exercise name, weight×reps, previous best 1331-1365; MilestonePreview eyebrow/title/hero value/unit/caption/stats 1367-1411).
  - "What to include" section title (ShareCardScreen.js:1089) + a toggles card. Always: "Date" toggle (1091). Session adds: "Plan name", "Total weight lifted", "Exercise names" (1094-1096). PR adds: "PR weight", "Previous best" (1101-1102). Each is a RN Switch (ToggleRow 1427-1439).
  - Privacy note text: "Name, bodyweight, measurements and private notes are never included." (ShareCardScreen.js:1106-1108).
  - Primary "Share …" button (label "Share Session Card" / "Share PR Card" / "Share Card") with share-outline icon, shows ActivityIndicator while sharing (ShareCardScreen.js:1112-1127).
  - Secondary "Save as PDF" button with document-text-outline icon, ActivityIndicator while exporting (ShareCardScreen.js:1130-1145).
  - Hidden off-screen WebView (1×1 px, opacity 0) that actually renders the export PNG (ShareCardScreen.js:1148-1158, style hiddenWebView 1617).
  - Toasts for: missing packages (878, 997), not-ready (882), couldn't generate (895, 909, 922), sharing unavailable (916, 1005), couldn't make PDF (1011).
  - Exported image content (drawn on canvas, not RN): vertical gradient bg, top amber bar, date top-right, plan label, hero session name (up to 2 lines), hero stat (PR count OR total kg OR working sets), intensity badge, support stat pills, top-lift card, exercise chips (up to 5, "+N more"), motivational closer line (tough/epic only), branded footer with real wordmark image / "SMARTER  TRAINING" / "volyume.app" (drawSession 386-516; drawPR 518-597; drawMilestone 603-705).

NAVIGATION: Route "ShareCard", component ShareCardScreen, title "Share Card". Registered in THREE stacks in RootNavigator.js — line 299, line 354, and line 390 (import at RootNavigator.js:63). Reached by navigating to "ShareCard" with route.params carrying sessionData / prData / milestoneData (ShareCardScreen.js:761-765). It does not push to any other screen; its terminal action is the OS share sheet via Sharing.shareAsync (917, 1006). The exact upstream callers were NOT TRACED in the files read (out of scope of the two target screens).

GATING: NOT DETERMINED IN CODE within ShareCardScreen.js — the file contains no withProGuard, no ProGate, and no useAppStore tier/Pro check (no import of useAppStore at all). Whether the route is gated is decided by the caller / navigator config not present in this file. Per CLAUDE.md the Plan Library / workout logging / personal bests that feed these cards are Free features, but the guard itself is NOT DETERMINED IN CODE here.

CURRENT STRENGTHS:
  - Strong privacy posture: explicit per-field include toggles plus a written guarantee that name/bodyweight/measurements/notes are never shared (1091-1108).
  - Live WYSIWYG preview matched deliberately to the canvas export (comments at 1182-1184, 1199-1211 confirm preview mirrors the export).
  - Robust failure handling: 10s capture failsafe timer (891-896), 2s logo-decode watchdog inside the WebView (749), try/catch around draw with error postback (725-728, 897-900), vector wordmark fallback if the image never decodes (221-231).
  - Defensive optional-require of native modules (16-21) with user-facing "needs a rebuild" toasts rather than a crash (877-879, 996-998).
  - Two export formats (PNG card + crisp text PDF) from one data set (buildParams 832-874 feeds both).

CURRENT WEAKNESSES:
  - Very long single file (1619 lines) mixing the giant inline WEBVIEW_HTML canvas string (39-757), the screen, four preview components, and two stylesheets — hard to scan.
  - The canvas withAlpha helper (70-92) is duplicated from theme.js withAlpha (204-226) and must be kept in sync by hand (comment 68-69 documents a past production bug from drift).
  - Brand palette is hand-copied into the WebView `B` object (52-61) rather than read from theme tokens, so a theme change does not propagate to exports (comment 48-51 acknowledges this).
  - Many canvas font sizes are hard-coded px on a fixed 1080-wide canvas (e.g. 22, 46, 52, 220) — fine for the fixed export, but the in-app preview uses fixed px too (see VISUAL section) which will not scale with the Larger Text accessibility setting.
  - No on-screen explanation of where the shared image goes after the share sheet, and no "saved to gallery" affordance (only the share sheet).

NEWBIE QUESTION: Mostly yes. The segmented controls, preview, and plain-language toggles ("Date", "Plan name", "Total weight lifted") are self-explanatory, and the privacy note reassures. A first-timer may not know what "Story 9:16" vs "Square 1:1" means in posting terms, and "Milestone"/"intensity tier" labels (SOLID/TOUGH/EPIC) are app-defined with no inline explanation.

ATHLETE QUESTION: Largely yes for sharing. A competitor gets top lift, tonnage, PR count, est-max-adjacent stats and a clean brand. Gaps: no control over which stat is the hero (it is auto-chosen 429-441), no per-exercise breakdown on the image card (only the PDF table has exercise/sets rows 937-948), and units are hard-defaulted to "kg" in several canvas paths (310, 498) rather than always honouring a user lb preference (PR path does pass p.units 578).

LOCATION QUESTION: Reasonable. It is a leaf/terminal utility reached contextually from a finished session, a PR, or a milestone, and registered in the three stacks that own those flows (RootNavigator.js:299, 354, 390). It correctly has no further navigation. Whether it should also be reachable as a standalone "share my stats" entry point is a product question, NOT DETERMINED IN CODE.

VISUAL + USABILITY:
  - Font size of each text element (in-app chrome, not the fixed canvas export):
    - sectionTitle ("Format" / "Preview" / "What to include"): `fontSize.xs (11)`, black weight, letterSpacing 1.5 — ShareCardScreen.js:1576-1578.
    - segment button text: `fontSize.sm (13)` — ShareCardScreen.js:1589.
    - toggle row label: `fontSize.sm (13)` — ShareCardScreen.js:1602.
    - privacy note: `fontSize.xs (11)`, lineHeight 16 — ShareCardScreen.js:1603.
    - share button text: `fontSize.md (16)` bold — ShareCardScreen.js:1610.
    - PDF button text: `fontSize.md (16)` bold — ShareCardScreen.js:1616.
    - Preview internal text uses FIXED px literals, NOT tokens, e.g. heroNumber 48/72 (1277), heroLabel 8/10 (1280), planLabel 8 (1457), statValue 14/16 (1289), statLabel 6 (1491), chipText 6.5 (1513), footerTagline 7/9 (1206), footerUrl 6.5 (1530), topLiftLabel 5.5 (1501), prBadgeText 7.5 (1543), msStatLabel 6 (1569). Many are far below a legible body size, but they are a scaled-down representation of the export, not interactive copy.
  - Touch targets:
    - Segment buttons: paddingVertical `spacing.sm + 1 (9)` + text line, inside a row; height is roughly text(13)+18 ≈ 31px — BELOW 44px (segment style 1584-1587). Flag.
    - ToggleRow: paddingVertical `spacing.md (12)` each side around a Switch → ≈ Switch height + 24 ≥ 44px (1597-1598). OK.
    - Share button: paddingVertical `spacing.lg (16)` → ≈ 16+16+text ≈ 48px. OK (1607).
    - PDF button: paddingVertical `spacing.lg (16)` → ≈ 48px. OK (1613).
    - SegmentBtn has no hitSlop and no accessibilityRole (1415-1425); the PDF and share buttons set accessibility props (1134-1135) but the format/type segments do not.
  - Information density: Moderate and well-sectioned — five stacked sections (type, format, preview, toggles, two buttons) inside a ScrollView with `gap: spacing.xl (24)` (content style 1574). The preview card itself is dense but is meant to be.
  - Clean or cluttered: Clean. Consistent surface/border tokens, clear section headers. The fixed-size preview (square 280×280 / story 175×311, 1448-1449) is centred (previewOuter 1591).
  - Most important action most prominent? Yes — the amber-filled "Share …" button is the only filled primary control (1604-1610); "Save as PDF" is correctly a lower-emphasis outlined secondary (1611-1615).
  - Small/standard/large device behaviour: The whole screen is a ScrollView (1019) so it scrolls on short screens. BUT the preview card is a FIXED pixel size (square 280×280, story 175×311 — 1448-1449) and all preview internal type is fixed px, so it will neither grow on a 6.7" device nor shrink/reflow on a 5.4"; on the smallest width 280px is still comfortably within the content padding (`spacing.lg (16)` each side). The export canvas is always 1080×1920 / 1080×1080 (710) independent of device. Larger-Text accessibility scales only the chrome tokens (xs/sm/md), not the fixed-px preview or canvas.
```

---

```
SCREEN: Exercise Detail (ExerciseDetailScreen)
WHAT IT IS: The per-exercise profile/analytics screen. It shows what the exercise trains (muscles, equipment, difficulty, compound/isolation, SFR quality/fatigue, rep range), the user's estimated max and personal bests, an optional strength-target goal with progress, a plateau warning, a windowed strength-trend chart, recent session history, similar-exercise swaps, a coaching cue, and written "How to do it" form guidance. (ExerciseDetailScreen.js:66, 302)

WHAT IS ON IT:
  - Loading state: three SkeletonCards (heights 120/180/92) while the DB loads (ExerciseDetailScreen.js:232-244).
  - Overview card (306-377): tag chips — primary muscle (309), subregion (311-314), equipment (315-319), compound/isolation (320-326), difficulty (327-331); "Also works:" secondary muscles list (334-344); "Estimated max: X {units}" row with trophy icon + InfoTooltip explaining est. max (346-352); SFR row of three items — "Quality" value /5 + InfoTooltip (354-361), "Fatigue" value /5 + InfoTooltip (363-369), "Rep range" min–max (371-374).
  - Personal-bests highlight card (380-425): trophy icon + "Personal bests" title; up to three stats — Est. max / Heaviest set, Best set (weight×reps), Most reps (weight×reps); "Achieved {date}" line.
  - Congratulatory banner (animated, transient): checkmark + "You've hit your target! Set a new one." shown when a goal is auto-detected achieved (427-433, showCongratsBanner 179-194).
  - Goal section: if no goal, a "Set a target weight" link with flag-outline icon (436-441); if goal set, a Target card — "Target" header with edit pencil (445-453), "Current est. max" → "Target {weight} · by {date}" two-item row with arrow (455-469), a progress bar (471-473), caption "{X}{units} to go" or "Goal reached!" (475-482).
  - Plateau banner: analytics icon + "Progress has stalled" + plateau.message, shown when detectPlateau flags it (486-494).
  - Strength-trend chart section (497-560): "Strength trend" label; WindowChips date-window selector (500-501); takeaway sentence (502); toggle "Max weight" / "Est. max" (503-526); VolyumeChart line/area chart height 96 (527-550) or "Not enough data in this window yet." (552); for e1rm mode a note "Estimated from top set using the Epley formula. Best for rep ranges 2–10." (554-558).
  - History section (563-589): "History (last N sessions)" title; per session a card with date, each set "{weight}{units} × {reps}" with "· Warm-up"/"· Drop Set" suffix, and "Est. max: ≈{x}{units}".
  - History empty state (592-599): clock icon + "You haven't logged this exercise yet. Add it to a session to start tracking your progress."
  - All-time bests list (602-625): "All-time bests" title; up to 5 rows with emoji medal (🥇/🏋️/🔁), label (Estimated max / Heaviest weight / Most reps), value, and date.
  - Similar exercises (628-661): "Similar exercises" title; horizontal scroll of cards (name + equipment/muscle) that push to ExerciseDetail for the swap (642).
  - Coaching cue card (663-670): bulb icon + exercise.cue text (only if a cue exists).
  - "How to do it" section (672-679): notes card showing `formTip ?? exercise.notes` — i.e. the FORM_TIPS text for the exact exercise name, else the exercise's own notes field.
  - Goal-setting modal bottom sheet (683-746): handle, title "Set a target weight"/"Edit target", subtitle, "Target weight ({units})" numeric input, "Target date (optional)" text input ("e.g. Dec 2025"), "Save goal" button, "Remove goal" link when editing.

NAVIGATION: Route "ExerciseDetail", component ExerciseDetailScreen, title default "Exercise" then set to the exercise name at runtime (ExerciseDetailScreen.js:115). Registered in TWO stacks in RootNavigator.js — line 323 and line 351 (import at RootNavigator.js:40). Reached with route.params.exerciseId (ExerciseDetailScreen.js:67). It pushes to itself for similar-exercise swaps: navigation.push('ExerciseDetail', { exerciseId, exerciseName }) (ExerciseDetailScreen.js:642). The originating callers were NOT TRACED here (outside the two target files).

GATING: NOT DETERMINED IN CODE within ExerciseDetailScreen.js — the file imports useAppStore (28) but uses it only for user, units, and accessibility.reduceMotion (68-69); there is no withProGuard, ProGate, or tier check. The screen surfaces exercise-library / personal-bests / progress-stats data, which CLAUDE.md lists as Free features, but the guard itself is NOT DETERMINED IN CODE here.

CURRENT STRENGTHS:
  - Genuinely deep, decision-useful data for a serious lifter: est. max, three PR types, SFR quality/fatigue, plateau detection, windowed trend with Max-weight vs Est-max toggle and a plain-language takeaway.
  - Newbie scaffolding via InfoTooltips that explain est. max, Quality, and Fatigue in lay terms (350, 359, 367).
  - Goal loop is well-built: set/edit/remove, auto-detect achievement, progress bar, transient congrats banner that respects Reduce Motion (181-188).
  - Empty and loading states are handled (skeletons 232-244; history empty 592-599; chart "not enough data" 552).
  - Self-referential navigation to swaps keeps the user in a coherent exploration loop (642).

CURRENT WEAKNESSES:
  - No visual demonstration of the exercise at all (see TECHNIQUE/FORM finding below) — text only.
  - Form guidance is only present when the exact exercise name has a FORM_TIPS entry or the row carries a notes field; otherwise the entire "How to do it" section is omitted (672) leaving no technique help.
  - Two overlapping PR surfaces: the "Personal bests" highlight card (380-425) and the "All-time bests" list (602-625) present much the same records twice on one screen.
  - A typo in state naming: setCongratusBanner / congratsBanner (87, 180, 186, 193, 428) — cosmetic, behaviour intact, flagged not fixed.
  - Long screen with many stacked sections; the most actionable items (goal, plateau, form) sit below charts and PR cards.

NEWBIE QUESTION: Partly. The tooltips, plain stat labels, and the written "How to do it" steps are beginner-friendly WHEN present. But a first-time gym-goer gets NO picture, diagram, or video to copy a movement from — text instructions like "elbows at roughly 45–75° from your torso" assume vocabulary a beginner may not have, and for any exercise lacking a FORM_TIPS entry there is no guidance at all. Terms like "Est. max", "SFR/Quality/Fatigue", "plateau", "Epley formula" lean advanced despite the tooltips.

ATHLETE QUESTION: Strongly yes for the data. Est. 1RM via Epley, heaviest/most-reps PRs, SFR quality/fatigue ratings, plateau detection, date-windowed trend with weight vs e1RM toggle, and ranked swap suggestions are exactly what an experienced competitor wants. The form section is too basic for them (and they likely do not need it). No competition-specific framing (e.g. division standards) appears on this screen.

LOCATION QUESTION: Yes. A per-exercise deep-dive reached from the exercise library / a logged set and pushing to itself for swaps (642) is the right home for this content, and registering it in the two stacks that own those flows (RootNavigator.js:323, 351) is consistent.

VISUAL + USABILITY:
  - Font size of each text element (token + resolved px + file:line):
    - tagText: `type.label` → `fontSize.sm (13)`, ExerciseDetailScreen.js:769 (+ theme.js:402-405).
    - secMuscleLabel: `type.label` → `fontSize.sm (13)`, :773. secMuscleText: `fontSize.sm (13)`, :774.
    - est1RMText: `type.bodyStrong` → `fontSize.md (16)`, :783 (+ theme.js:398-401).
    - sfrValue: `type.num('title')` → `fontSize.lg (17)` tabular, :792. sfrLabel: `type.caption` → `fontSize.xs (11)`, :793.
    - sectionTitle: `type.label` → `fontSize.sm (13)`, :836-839.
    - chartTakeaway: `fontSize.sm (13)`, lineHeight 18, :797. chartLabel: `fontSize.xs (11)`, :800. chartEmptyHint: `type.caption` → `fontSize.xs (11)`, :798. chartToggleBtnText: `fontSize.xs (11)`, :815. e1rmNote: `type.caption` → `fontSize.xs (11)`, :817.
    - historyDate: `fontSize.sm (13)` bold, :848. historySetText: `fontSize.sm (13)`, :850. historyEst: `type.num('caption')` → `fontSize.xs (11)`, :851.
    - prIcon (emoji): fixed 22 (eslint-disabled, :862-863). prLabel: `fontSize.sm (13)`, :865. prValue: `type.num('bodyStrong')` → `fontSize.md (16)`, :866. prDate: `type.num('caption')` → `fontSize.xs (11)`, :867.
    - subCardName: `fontSize.sm (13)` bold, lineHeight 17, :881-886. subCardEquipment: `type.caption` → `fontSize.xs (11)`, :892-896.
    - prHighlightTitle: `fontSize.xs (11)`, :911-917. prHighlightStatValue: `type.num('title')` → `fontSize.lg (17)`, :931-934. prHighlightStatLabel / prHighlightDate: `type.caption` → `fontSize.xs (11)`, :935-943.
    - notesText ("How to do it"): `fontSize.sm (13)`, lineHeight 20, :951.
    - cueText: `fontSize.sm (13)`, lineHeight 20, :962.
    - plateauTitle: `type.label` → `fontSize.sm (13)`, :975-978. plateauBody: `fontSize.sm (13)`, lineHeight 18, :980-984.
    - goalSetLinkText: `fontSize.sm (13)` underlined, :993-997. goalCardTitle: `fontSize.xs (11)`, :1016-1022. goalWeightValue: `type.num('title')` → `fontSize.lg (17)`, :1032-1035. goalWeightLabel: `type.caption` → `fontSize.xs (11)`, :1036-1039. goalBarCaption: `fontSize.xs (11)`, :1051-1055.
    - congratsText: `type.label` → `fontSize.sm (13)`, :1067-1071.
    - modalTitle: `type.title` → `fontSize.lg (17)`, :1097-1100. modalSubtitle: `fontSize.sm (13)`, :1101-1105. inputLabel: `type.label` → `fontSize.sm (13)`, :1106-1110. weightInput: `fontSize.xxl (24)` bold, :1118-1119. dateInput: `fontSize.md (16)`, :1130. saveGoalBtnText: `type.bodyStrong` → `fontSize.md (16)`, :1140-1143. removeGoalLinkText: `fontSize.sm (13)`, :1149-1151.
  - Touch targets (interactive elements):
    - Goal edit pencil: icon 14 with hitSlop {8,8,8,8} → ≈ 14+16 ≈ 30px effective — BELOW 44px even with hitSlop (ExerciseDetailScreen.js:450-452). Flag.
    - "Set a target weight" link: paddingVertical `spacing.xs (4)` + icon 14 → ≈ 22px — BELOW 44px (goalSetLink 986-992). Flag.
    - Chart toggle buttons: paddingVertical `spacing.xs (4)` + text 11 → ≈ 19px tall — BELOW 44px (chartToggleBtn 806-813). Flag.
    - Similar-exercise cards: fixed height 72 (subCard 873-880). OK.
    - "Save goal" button: paddingVertical `spacing.md (12)` + text 16 → ≈ 40px — marginally BELOW 44px (saveGoalBtn 1133-1139). Borderline flag.
    - "Remove goal" link: paddingVertical `spacing.xs (4)` → ≈ 21px — BELOW 44px (1144-1147). Flag.
    - WindowChips and VolyumeChart touch sizing live in those components (not in this file) — NOT DETERMINED IN CODE here.
    - Accessibility roles/labels are set on most controls (437, 450, 504-509, 645, 732-734, 740).
  - Information density: HIGH. Up to ~10 stacked sections (overview, PR highlight, congrats, goal, plateau, chart, history, all-time bests, similar, cue, how-to) in one ScrollView with `gap: spacing.xl (24)` (content 753). Two separate PR surfaces add to the load.
  - Clean or cluttered: Leans cluttered on a fully-populated exercise due to duplicated PR information and the sheer number of cards, though each card individually is tidy and token-consistent. The emoji medals in All-time bests (608-609) sit visually apart from the rest of the Ionicons-driven iconography.
  - Most important action most prominent? Mixed. For a lifter the trend chart and PRs are prominent and high up, which is right. But the goal CTA ("Set a target weight") is a small underlined text link (437-439), low-emphasis relative to its importance, and the form/"How to do it" content is last on the screen.
  - Small/standard/large device behaviour: Whole screen is a ScrollView (304) so it scrolls on any height. Chart width is computed responsively: `SCREEN_W - spacing.lg*2 - spacing.md*2` from Dimensions.get('window').width captured once at module load (SCREEN_W 64, used 531) — it adapts to device width but is captured at import time so it will not react to orientation/fold changes without remount. Similar-exercise cards are fixed 140×72 (873-875) and scroll horizontally, fine across sizes. Most type uses tokens so Larger-Text scales it; fixed exceptions are prIcon 22 (863) and the px lineHeights. No fixed-height content clips because everything is in the scroll view.

TECHNIQUE / FORM GUIDANCE — present vs absent (per dispatcher request):
  - PRESENT (textual only):
    - "How to do it" section renders `formTip ?? exercise.notes` (ExerciseDetailScreen.js:672-679). `formTip = FORM_TIPS[exercise.name]` (ExerciseDetailScreen.js:246), i.e. a multi-sentence written technique paragraph keyed by the EXACT exercise name in src/lib/formTips.js (e.g. "Barbell Bench Press" at formTips.js:3: setup, bar path, elbow angle, drive — full prose cues). If no FORM_TIPS match, it falls back to the exercise's own `notes` field.
    - A short single-line coaching cue: `coachingCue = exercise.cue` shown in the bulb-icon cue card (ExerciseDetailScreen.js:252, 663-668) — one-liner, only when a cue exists.
    - Tooltips give conceptual (not movement) guidance on est. max, Quality, Fatigue (ExerciseDetailScreen.js:350, 359, 367).
  - ABSENT:
    - The "How to do it" section is conditional on `(formTip || exercise.notes)` (ExerciseDetailScreen.js:672); for any exercise with neither a FORM_TIPS entry nor a notes value, NO form guidance renders at all.
    - No safety/contraindication or common-mistakes guidance beyond the prose tip.
  - VISUAL DEMO: NONE. There is no image, illustration, GIF, animation, or video of the exercise anywhere on the screen. ExerciseDetailScreen.js imports no Image component (imports at 1-31 cover RN primitives, Ionicons, the line chart VolyumeChart, Skeleton, AnimatedEntrance, InfoTooltip only); the only graphics are Ionicons glyphs, emoji medals (608-609), and the VolyumeChart strength-trend line chart (529-549). The exercise is described purely in words.
```

---

STATUS
1. Files read in full: src/screens/ShareCardScreen.js (1619 lines), src/screens/ExerciseDetailScreen.js (1153 lines); also read src/styles/theme.js in full for token resolution, plus RootNavigator.js route lines and src/lib/formTips.js (1-60) to verify the form-guidance content type.
2. Screens documented: 2 — Share Card (ShareCardScreen) and Exercise Detail (ExerciseDetailScreen); ExerciseDetail technique/form guidance and "no visual demo" finding cited file:line.
3. NOT DETERMINED / could-not-read: GATING for both screens marked NOT DETERMINED IN CODE (no guard inside either file; decided by an untraced caller/navigator config); upstream callers of both routes and WindowChips/VolyumeChart internal touch-target sizes left NOT DETERMINED as they live outside the two target files. No file failed to read.
