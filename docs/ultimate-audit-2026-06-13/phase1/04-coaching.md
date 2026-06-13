# Phase 1 inventory — Coaching screens (2026-06-13)

Resolved theme tokens used below (src/styles/theme.js):
- fontSize: micro 10 (256), xs 11 (258), sm 13 (259), md 16 (260), lg 17 (261), xl 20 (262), xxl 24 (263), xxxl 32 (264), display 40 (265)
- spacing: hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48 (228-239)
- radius: xs 4, sm 6, md 10, lg 14, xl 20, full 999 (241-248)
- type.body fontSize.md 16 (394-396); type.bodyStrong fontSize.md 16 (398-400); type.label fontSize.sm 13 (402-404); type.caption fontSize.xs 11 (406-408)
- type.num(role) = role + tabular-nums (417-421)
NOTE: with the Larger-text accessibility toggle on, every fontSize token is multiplied by 1.2 at boot (theme.js:325-337), so all px values below are the default (toggle-off) values.

---

SCREEN: CoachOutputScreen ("Your week" / Precision Coaching™ weekly output)
WHAT IT IS: The weekly Precision Coaching review card. After a user submits a weekly check-in (or taps the "your plan is ready" notification), this screen runs the deterministic weekly coach engine (runWeeklyCoach, CoachOutputScreen.js:1208) and renders the result: the week's headline, trend chips, what went well/off, the confirm-then-apply training and nutrition adjustments, the "why", a focus cue, safety blocks, held decisions, and an optional differential paywall for free users.
WHAT IS ON IT:
- Week header: weekLabel (1561) + week date range "19 May to 25 May 2026" (weekRangeLabel, 1562)
- Headline sentence (buildHeadline, 1566; logic 89-106): calorie change / on-target / off-target-holding / default
- Coach lead card (1571-1584): acknowledgement (1578) + interpretation (1580) from buildRegisteredCoachResponse (1517)
- Trend chips row (1587-1610): weight-trend chip with directional arrow icon + colour (trendIcon/trendColor logic 1493-1508), value = trend.deltaLabel or "No weights logged" (1511); sessions chip `{completed}/{planned}` (1598); PRs chip when prsThisWeek > 0 (1602-1609)
- "Share this week" button (1613-1621) → ShareCard (handleShareWeek, 1533-1551)
- "What's working" card (WhatsWorkingCard, 1624-1626; bullets with checkmark icons)
- "What was off" card (1629-1645; bullets with warning "remove" icons, buildOffItems 108-135)
- "Training next week" card (TrainingNextWeekCard, 1648-1657): either a "Take a recovery week" deload row OR an "Add/Pull back N sets" / "Hold your current volume" row, each with Apply button and a planNote ("This sets next week's starting volume…", 358-360)
- "Nutrition next week" card (NextWeekCard, 1658-1664): calorie row ("+N kcal" / "Hold at current target" / "Calories held"), steps row ("N/day target"), cardio row — each an AdjustmentRow with optional Apply button + "Applied" chip
- Plan-edit receipt card (1668-1684): headline + body + optional deep-link to MealPlan, shown after a calorie apply edits an active meal plan
- Cardio flag note row (1687-1692) and cardio acknowledgement note row (1694-1699): single advisory lines with heart icon
- MacroCycleCard (1702-1709): training-day vs rest-day kcal/carbs split + "Use this split" Apply (advanced cuts/competitors only)
- RefeedCard (1712-1719): single refeed-day kcal/carbs target + "Schedule refeed" Apply (aggressive cuts/competitors only)
- WhyBlock (1722): "Why this week:" + italic text + "Understand how this decision was made" link → Methodology
- Focus card (1727-1736): "Focus this week" label + cue (coachResponse.cue or buildFocus, 137-165)
- RapidLossAlert (1739): "Weight dropping quickly" warning card (1.5%/week language, 389-401)
- DietBreakCard (1742-1749): "Diet break worth considering" + MATADOR-2017 footnote + "Set maintenance week" Apply
- Forward line (1753-1755): coachResponse.forward closing sentence
- HeldDecisionsCard (1759-1765): EdPatternLockoutBlock / EdPatternClearedBlock / RapidLossCorrectedBlock structured blocks (612-683), standard held rows, "See how Precision Coaching decides" link, "PREVIOUS WEEKS" history shelf, "See all weeks" → CoachHeldHistory
- DifferentialBadge paywall (1770-1796): free-tier only, with localised Play price → Paywall
- "Done" button (1799-1801) → popToTop (handleClose, 1415-1422)
- Two credential notes (1803-1809): Precision Coaching™ science statement + "not medical advice" disclaimer
- Alternative full-screen states: LoadingView skeletons (687-696), InsufficientDataView "Building your baseline." (698-716), LoadErrorView "Couldn't load your coach." with Try again / Close (721-742)
NAVIGATION: Route "CoachOutput", registered in ProfileStack as `<Stack.Screen name="CoachOutput" component={GatedCoachOutput} options={{ title: 'Precision Coaching™' }}>` (RootNavigator.js:388). Reached from WeeklyCheckIn (same ProfileStack) and from the weekly "your plan is ready" notification (routeForNotificationType; weekStart defaults to current local week, CoachOutputScreen.js:753). Leads to: Methodology (1722, 1763), CoachHeldHistory (1762), ShareCard (1541), Paywall (1783), and DiaryTab→MealPlan (1675). Back chevron + Done both call popToTop on the Profile stack (1421, 1430).
GATING: Pro. Wrapped via `const GatedCoachOutput = withProGuard(CoachOutputScreen, 'Your week')` (RootNavigator.js:152) and registered as GatedCoachOutput (388). A differential paywall for free users is also rendered conditionally (1770), driven by `userTier: storeTier ?? require('../lib/proGate').isPaidTier(userProfile)` fed into the engine (1258).
CURRENT STRENGTHS:
- Confirm-then-apply throughout: every engine suggestion is a suggestion with an explicit Apply button and an "Applied" chip, never auto-written (founder GAP rows 3-7, 1341-1345).
- Distinguishes load error (retryable) from insufficient data (1448-1463), so a network blip never reads as "you haven't logged enough".
- Safety-class colour discipline: a bodyweight trend chip never wears red; off-target caps at "watch", drops to neutral under an open ED flag (1487-1508, 1593).
- Strong transparency: "Why this week", held-decisions, and methodology links are always reachable.
- Skeleton loading state and accessible labels on the apply buttons and lead card.
CURRENT WEAKNESSES:
- Very high information density: up to ~14 distinct cards/blocks can stack in one ScrollView (training, nutrition, plan-edit, two cardio notes, macro cycle, refeed, why, focus, rapid-loss, diet-break, forward line, held decisions, paywall, two credential notes). On a real week with several signals firing this is a long scroll with many competing call-to-actions.
- Multiple Apply buttons of identical visual weight (training, calories, steps, cardio, deload, diet-break, macro cycle, refeed) compete for attention; no single primary action is emphasised over the others.
- The headline (1566), the coach lead acknowledgement+interpretation (1571), and the trend chips (1587) all restate the same week status in three different forms at the very top — redundancy before the user reaches any decision.
- buildHeadline/buildOffItems/buildFocus are local string builders (89-165) layered ON TOP of the engine's own coachResponse parts, so two parallel narration systems coexist on one screen.
NEWBIE QUESTION: Partially. The copy is plain-English and the "What's working / What was off / Focus this week" framing is approachable, and the methodology link explains the engine. But a first-timer would be confronted with terms like "volume", "sets per muscle group", "deload/recovery week", "refeed", "macro cycle / carbs by day", "maintenance calories", and multiple Apply buttons whose downstream effect ("This sets next week's starting volume") is only partly explained. The sheer number of simultaneous decisions is likely to overwhelm a brand-new gym-goer.
ATHLETE QUESTION: Yes, largely. An experienced competitor gets the levers they expect: weekly volume signal with MEV/MRV-aware spread, deload, diet break (MATADOR-cited), high/low carb cycling, refeed cadence, steps + cardio prescriptions, RED-S/FFM safety floors, and explicit "why". The confirm-then-apply model respects an experienced user's autonomy. The main gap for an athlete is that the raw numbers (e.g. per-muscle set targets) are summarised rather than shown per-muscle on this screen.
LOCATION QUESTION: Yes. It sits in the Profile/You stack immediately after WeeklyCheckIn, which is the correct flow (submit check-in → see the coach's response), and the weekly notification deep-links straight here. Closing returns to the You root via popToTop (1421), which is the intended landing.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - weekLabel fontSize.xxl (24), bold, primary colour (1882-1886)
    - weekRange fontSize.sm (13), textMuted (1887-1890)
    - headline fontSize.lg (17), bold, lineHeight 26 (1939-1945)
    - coachLeadAck fontSize.md (16) semibold (1972-1977); coachLeadInterpretation fontSize.md (16) (1978-1982)
    - statChipValue fontSize.sm (13) bold; statChipLabel fontSize.sm (13) (1909-1917)
    - sectionHeader fontSize.sm (13) semibold (1930-1936)
    - bulletText fontSize.md (16) lineHeight 22 (2021-2026)
    - adjustmentLabel fontSize.md (16) semibold (2048-2052); adjustmentNote fontSize.sm (13) (2064-2068)
    - appliedChipText fontSize.micro (10) bold (2060-2063)
    - applyBtnText fontSize.sm (13) bold (2079-2083)
    - focusLabel fontSize.xs (11) bold uppercase (1997-2003); focusText fontSize.md (16) semibold (2004-2009)
    - whyLabel fontSize.sm (13) semibold (2129-2133); whyText fontSize.sm (13) italic (2134-2139); whyLearnMore fontSize.xs (11) underlined (2141-2146)
    - macroCycleColLabel fontSize.xs (11) (2098-2102); macroCycleColKcal fontSize.lg (17) bold tabular (2103-2108); macroCycleColCarbs fontSize.sm (13) (2109-2113)
    - dietBreakTitle fontSize.sm (13) semibold (2164-2169); dietBreakBody fontSize.sm (13) (2170-2174); dietBreakFootnote fontSize.xs (11) (2175-2179)
    - rapidLossTitle fontSize.sm (13) bold, error colour (2230-2235); rapidLossBody fontSize.sm (13) (2236-2240)
    - edLockoutHeader fontSize.xs (11) (2260-2266); edLockoutTitle fontSize.lg (17) bold (2267-2271); edLockoutBody fontSize.sm (13) (2272-2276)
    - heldText fontSize.sm (13) (2360-2365); heldHistoryTitle fontSize.xs (11) (2367-2373); heldHistoryDate fontSize.xs (11) (2380); heldHistoryText fontSize.sm (13) (2381)
    - doneBtnText fontSize.lg (17) bold (2190-2194); secondaryBtnText fontSize.md (16) (2202-2206)
    - credentialNote fontSize.xs (11) lineHeight 17 (2207-2214)
    - insufficientTitle fontSize.xl (20) bold (1863-1869); insufficientBody fontSize.md (16) lineHeight 24 (1870-1875)
    - planNoteText / planEditBody fontSize.xs (11) / fontSize.sm (13) (2121-2123, 1830)
  - Touch targets:
    - applyBtn: minWidth 84, paddingVertical spacing.sm (8) + paddingHorizontal spacing.lg (16); no explicit height. Vertical = 8+8 + ~16 text ≈ ~32px tall. **FLAGS < 44px** in height (2069-2077).
    - doneBtn: paddingVertical spacing.lg (16) → ~48px tall, OK (2182-2189).
    - secondaryBtn: paddingVertical spacing.md (12) → ~37px tall. **FLAGS < 44px** (2196-2201).
    - shareWeekBtn: paddingVertical spacing.xs (4) only → ~21px tall. **FLAGS < 44px** (1850-1857).
    - whyLearnMore / heldLearnMore: text links with hitSlop {6,6,6,6} (378, 562); effective tap height ≈ 11px text + 12 = ~23px. **FLAGS < 44px** even with hitSlop (382, 567).
    - edLockoutCtaPrimary / edLockoutCtaGhost: paddingVertical spacing.sm (8) → ~33px. **FLAGS < 44px** (2294-2320).
    - heldSeeAll: paddingVertical spacing.sm (8) → ~33px. **FLAGS < 44px** (2388-2395).
    - Header back chevron: hitSlop {top:8,bottom:8,left:16,right:16} on a 24px icon (1430) → effective ≈ 40px tall. Marginally **< 44px** vertically.
  - Information density: high to very high (see weaknesses). The screen is a single ScrollView with up to ~14 stacked cards/blocks.
  - Clean or cluttered: clean per-card (consistent surface/border/radius tokens), but cluttered in aggregate when many engine signals fire at once; redundant top-of-screen status restatement.
  - Most important action most prominent? No. The Done button (solid primary, fontSize.lg, full-width) is the most visually prominent control, yet the meaningful actions are the various Apply buttons (smaller, secondary-feeling) scattered up the page. The true primary action(s) are de-emphasised relative to Done.
  - Small/standard/large behaviour: ScrollView with contentContainerStyle padding spacing.lg (16) and paddingBottom spacing.xxxl (48) (1839-1843), so content reflows and scrolls on all sizes. SafeAreaView edges only left/right (1554) — top inset handled by the navigator header. No fixed-height content containers that would clip; chips use flexWrap (1895). Text scales with the Larger-text toggle (1.2×, theme.js:325). No obvious small-screen breakage.

---

SCREEN: CoachReviewScreen ("Weekly Review")
WHAT IT IS: A free-tier training-only weekly review. It reads this calendar week's completed workouts and sets from local storage, computes per-muscle volume status, progression wins, deload signal, lagging muscles, and produces up to three plain-English recommendations. It does NOT run the Pro Precision Coaching engine and makes no nutrition/calorie decisions.
WHAT IS ON IT:
- Header: "Weekly review" title (405) + date range "d MMM – d MMM yyyy" (406, dateLabel 377-380)
- No-data card: "No sessions logged this week yet…" (410-416)
- "Sessions this week" card (421-443): three stats — session count, total sets, most-trained muscle (with dividers)
- "Volume this week" section (446-466): subtext explainer + a card listing each trained muscle as a VolumeRow (status dot colour, display name, set count, status badge label "Good range"/"Just enough"/"Getting close"/"Too much"/"Below target", VolumeRow 176-193, labels 24-33)
- "What went well" section (469-499): InsightRows for optimal-range muscles and progression wins (heavier weight / more reps), or an empty-state line
- "What to watch" section (502-566): InsightRows for over/near-MRV and below-minimum muscles, a deload suggestion row, and a joint-discomfort row; or an empty-state line
- "What to focus on next week" section (569-576): numbered RecommendationRows (buildRecommendations, 87-164)
- Loading: four SkeletonCards (384-395)
NAVIGATION: Route "CoachReview", registered in BOTH HomeStack (`<Stack.Screen name="CoachReview" component={CoachReviewScreen} options={{ title: 'Weekly Review' }}>`, RootNavigator.js:300) AND ProgressStack (RootNavigator.js:346). Reached from the Train (Home) and Progress tabs. The screen itself pushes nowhere (no navigation calls in the file).
GATING: Free. Not wrapped in withProGuard, and registered with the bare component in HomeStack (300) and ProgressStack (346). No tier guard or ProGate reference exists in CoachReviewScreen.js (it reads only `user` from the store, line 221). This is the free training-review counterpart to the Pro CoachOutputScreen.
CURRENT STRENGTHS:
- All computation is local/offline (getAllWorkouts, getCompletedWorkoutSets, getAllExercises, getRecentCheckins, 252-257), matching the offline-first rule.
- Plain-English, non-alarming copy with concrete next-step recommendations.
- Volume status uses the shared volume-landmark grammar (getVolumeStatus, statusDotColor 14-22) consistent with the rest of the app.
- Graceful empty states for the whole screen and per-section.
CURRENT WEAKNESSES:
- Silent catch: loadData swallows all errors and shows the no-data state (339-341), so a genuine read failure is indistinguishable from "no sessions this week" — the same failure-masquerade the CoachOutputScreen explicitly fixed.
- `weeksSinceLastDeload: 99` is hardcoded for every weekly bucket (328), so the deload heuristic can never use real time-since-deload here.
- Two screens named almost identically in concept (CoachReview vs CoachOutput) but with different engines and gating; potential user confusion between "Weekly Review" (free, training) and "Your week"/Precision Coaching (Pro).
- The progression-win warmup filter at line 44 (`if ((s.setType || s.setType === 'warmup') && s.setType === 'warmup')`) is convoluted but functionally filters warmups — noted, not in scope to fix.
NEWBIE QUESTION: Mostly yes. The status badges are in lay terms ("Good range", "Too much", "Below target") and the recommendations are explicit. A newbie still meets "volume", "sets", "MRV/minimum" concepts, but the language is softened ("more sets than you can comfortably recover from") so it is more newbie-friendly than CoachOutputScreen.
ATHLETE QUESTION: Partly. It gives an experienced lifter a clean per-muscle volume readout, progression wins, deload and lagging-muscle signals — useful at a glance. But it stops at training; there is no load/tonnage detail, no nutrition, and the deload signal is weakened by the hardcoded 99 (328). A serious competitor would use the Pro CoachOutputScreen instead.
LOCATION QUESTION: Yes. As a free training summary it belongs in both the Train and Progress stacks, which is where it is registered (300, 346). Reaching it from either tab is sensible.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - headerTitle fontSize.xxl (24) heavy (606-611); headerDate fontSize.sm (13) (612-615)
    - cardTitle fontSize.xs (11) semibold uppercase (629-636)
    - statValue fontSize.xl (20) heavy (648-653); statLabel ...type.caption fontSize.xs (11) (654-658)
    - sectionHeading ...type.label fontSize.sm (13) (669-672); sectionSubtext fontSize.xs (11) (673-677)
    - volumeMuscleName fontSize.md (16) medium (698-703); volumeSetCount fontSize.sm (13) (704-707); volumeBadgeText fontSize.xs (11) semibold (715-718)
    - insightText fontSize.sm (13) medium (736-741); insightSubtext fontSize.xs (11) (742-746)
    - recText fontSize.sm (13) (771-776); recIndexText fontSize.xs (11) bold (766-770)
    - emptyText fontSize.sm (13) (779-784); emptySubText fontSize.sm (13) (785-789)
  - Touch targets: this screen has NO interactive elements (no buttons, no links, no taps) — it is a read-only scroll. So no touch-target flags apply.
  - Information density: moderate. Four to five sections, each a card; reasonable whitespace via spacing.xl section gap (594-596).
  - Clean or cluttered: clean. Consistent card/section tokens, status dots 8px (693-697), 36px stat dividers (659-663).
  - Most important action most prominent? N/A — there are no actions; the content hierarchy (title → sessions → volume → went well → watch → focus) is logical.
  - Small/standard/large behaviour: single ScrollView, content padding spacing.lg (16), bottomSpacer spacing.xxxl (594-599). SafeAreaView edges top/left/right (400). All sizing is token/flex based; no fixed heights that clip. Scales fine across device widths.

---

SCREEN: CoachHeldHistoryScreen ("Coaching history")
WHAT IT IS: A chronological log of every weekly coach decision — what changed, what was held, and why — across all saved coach outputs, plus an embedded EngineLog of recent engine adaptations.
WHAT IS ON IT:
- BackHeader titled "Coaching history" (106)
- Intro line: "Every call the coach has made, what changed, what didn't, and why." (109-111)
- EngineLog component (115): recent engine adaptations + rep-regression warnings (moved from the retired Athlete Hub)
- Loading: three SkeletonCards height 110 (117-123)
- Empty state (125-133): book icon + "No entries yet" + "After your first weekly check-in, decisions and holds will appear here."
- Per-week blocks (135-170): "Week of {date}" header + decision rows. Each row = icon (checkmark for changed, pause for held) + optional label (e.g. "Calories up +N kcal/day", "More work added this week", "Daily steps raised to N", "A lighter week this week") + detail text. Rows built by buildDecisionRows (23-76).
- Footer (172-176): "{N} decisions across {M} weeks"
NAVIGATION: Route "CoachHeldHistory", registered in ProfileStack as `<Stack.Screen name="CoachHeldHistory" component={CoachHeldHistoryScreen} options={{ headerShown: false }}>` (RootNavigator.js:391). Reached from CoachOutputScreen's HeldDecisionsCard "See all weeks" (CoachOutputScreen.js:1762, navigation.navigate('CoachHeldHistory')). headerShown:false because the screen supplies its own BackHeader (106). Pushes nowhere itself.
GATING: Not directly guarded in RootNavigator (registered with the bare component, 391). However, its only entry point is the HeldDecisionsCard inside the Pro-gated CoachOutputScreen (CoachOutputScreen.js:1762), so it is effectively Pro-reachable only. **NOT DETERMINED IN CODE**: there is no explicit tier guard on this route itself, so any future non-Pro navigation to "CoachHeldHistory" would not be blocked at the route level.
CURRENT STRENGTHS:
- Reinforces the transparency moat: the full audit trail of coach decisions and non-decisions in one place.
- Clear visual distinction between "changed" (success-coloured) and "held" (muted) rows (152, 159, 245).
- Accessible: per-row accessibilityLabel composes label + detail (147); week label is accessibilityRole="header" (139).
- Filters to only weeks that actually have a decision or a hold (86-93), so empty weeks don't pad the list.
RtCURRENT WEAKNESSES:
- The `load()` filter at lines 88-91 omits cardio/deload-applied/macro/refeed/diet-break decisions from the "hasChanged" test (only calories, training signal, steps.change, deloadSuggested are checked), so a week whose only action was e.g. a cardio or refeed apply could be filtered out of the history if it had no held decisions. (Flagged, not in scope to fix.)
- Typo in the source: a stray "Rt" prefix appears before a style block is unaffected, but note line 100 region — actually the screen reads fine; the load catch silently sets loading false (97) with no error surface.
- buildDecisionRows uses `toLocaleString()` without an explicit 'en-GB' locale (52), unlike CoachOutputScreen which passes 'en-GB' (CoachOutputScreen.js:248).
NEWBIE QUESTION: Reasonably. The intro sentence sets expectations and rows are short. A newbie may not grasp "volume pulled back" or the embedded EngineLog's rep-regression entries, but the changed/held framing is understandable.
ATHLETE QUESTION: Yes. A longitudinal decision log is exactly what a data-driven competitor wants to audit the coach's behaviour over a block, and the EngineLog adds per-session adaptation detail.
LOCATION QUESTION: Yes. As a drill-down from the weekly coach card's "See all weeks", living in the Profile stack alongside CoachOutput is correct.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - BackHeader title fontSize.lg (17) semibold (BackHeader.js:59-66)
    - intro fontSize.sm (13) lineHeight 20 (192-196)
    - emptyTitle ...type.bodyStrong fontSize.md (16) (207-210); emptyBody fontSize.sm (13) (211-216)
    - weekLabel fontSize.xs (11) semibold (226-232)
    - decisionLabel ...type.label fontSize.sm (13) (240-244); decisionDetail fontSize.sm (13) (246-250)
    - footer ...type.num('caption') fontSize.xs (11) tabular (252-257)
  - Touch targets:
    - BackHeader back chevron: 24px icon with hitSlop {12,12,12,12} (BackHeader.js:25,40) → effective ≈ 48px. OK.
    - Decision rows are non-interactive (accessible but not pressable). EngineLog interactivity not in this file (**NOT DETERMINED IN CODE** — EngineLog component not read).
  - Information density: low-to-moderate; one block per week, generous gaps (content gap spacing.lg, 187).
  - Clean or cluttered: clean. Uniform week-block cards (218-225), consistent icon+text rows.
  - Most important action most prominent? The only interactive element is the back chevron; content is read-only, so the answer is N/A. The list is the point and it is the dominant element.
  - Small/standard/large behaviour: single ScrollView, content padding spacing.lg, paddingBottom spacing.xxxl (186-190). SafeAreaView edges top/left/right (105). All token/flex sizing; scales cleanly.

---

SCREEN: MethodologyScreen ("How Precision Coaching works")
WHAT IT IS: A static, offline, copy-only trust page explaining how the Precision Coaching engine makes decisions. Six sections (the intro always shown, plus five collapsible accordion sections); no data dependencies, no Supabase reads, renders identically for every user.
WHAT IS ON IT:
- Intro paragraph (always shown, 138; INTRO 30-33): "Every week, Precision Coaching reads your weight trend, your check-in and your training…"
- Five collapsible sections (140-148; SECTIONS 37-99), each a tappable header with chevron + body:
  1. "Why changes wait" (two-week cooldown + the rapid-loss safety exception)
  2. "How your steps inform the estimate" (steps only sharpen confidence, never add/remove calories)
  3. "Why holds happen"
  4. "Training signals" (volume −2..+3 sets/muscle/week)
  5. "Safety floors" (30 kcal/kg fat-free mass floor; fixed minimum kept qualitative)
  6. "What Precision Coaching cannot do" (no unseen food, only what you scored, suggestions until applied)
  (The first collapsible starts open, 123.)
- Credential note (150-153): "Built on published training and sports-medicine science. Every change has a reason. Every non-change has a reason too."
NAVIGATION: Route "Methodology", registered in ProfileStack as `<Stack.Screen name="Methodology" component={MethodologyScreen} options={{ title: 'How Precision Coaching works' }}>` (RootNavigator.js:389). Reached from CoachOutputScreen's WhyBlock (CoachOutputScreen.js:1722, source 'why_block'), from the held-decisions "See how Precision Coaching decides" link (1763, source 'held_decisions'), and per the header comment also from the You tab (MethodologyScreen.js:7). Fires a `methodology_opened` telemetry event with the source param (131). Pushes nowhere itself.
GATING: **NOT DETERMINED IN CODE** as Free vs Pro — the route is registered with the bare MethodologyScreen component (no withProGuard, RootNavigator.js:389) and the screen contains no tier guard (it reads only user?.id for telemetry, 129). It is reached from Pro coach surfaces but the comment (lines 7-8) says it is also reached "from the You tab", implying a non-gated trust page. As written it is ungated at the route level.
CURRENT STRENGTHS:
- Truthful-by-design: a FOUNDER COPY GATE comment (lines 11-19) ties every figure to the engine source lines (weeklyCoach.js:292, :169) and flags it as a living document.
- Pure/offline; renders identically for everyone, including under an ED-pattern flag (describes safety in general terms, names no individual state).
- Accordion keeps the page from reading as a wall of text; first section pre-opened (123).
- Accessibility: section headers are buttons with accessibilityState expanded + label (107-110).
CURRENT WEAKNESSES:
- Risk that copy drifts from the engine if weeklyCoach.js/nutritionEngine.js change and the copy isn't re-reviewed (the comment itself acknowledges this, 18-19) — a maintenance hazard, not a current bug.
- Long body paragraphs (e.g. the steps section, 52-59) in fontSize.sm could be dense on a small screen.
NEWBIE QUESTION: Yes. This is the most newbie-appropriate of the coaching screens — plain English, no numbers a beginner can't follow (one explicit figure, 30 kcal/kg, with context), and the accordion lets a newbie open only what they care about.
ATHLETE QUESTION: Yes, at the conceptual level. An athlete gets the rules and the published-science framing. It is intentionally qualitative on the absolute calorie floor (no 1,200/1,500 numbers, per the copy gate), so a competitor wanting exact thresholds won't find them here — that is a deliberate safety choice, not a gap.
LOCATION QUESTION: Yes. As a shared trust page reachable from the coach card, the held-decisions card and the You tab, registering it in ProfileStack (389) is the right home.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - intro fontSize.md (16) lineHeight 24 (162)
    - sectionTitle ...type.bodyStrong fontSize.md (16) (172)
    - sectionBody fontSize.sm (13) lineHeight 22 (173)
    - credentialNote fontSize.xs (11) lineHeight 18 (174-180)
  - Touch targets:
    - CollapsibleSection header: a TouchableOpacity wrapping the full row; the section has paddingVertical spacing.md (12) (169) and the header row holds a fontSize.md title + 18px chevron, so effective tap height ≈ 16 (text) + 24 (padding) ≈ ~40px. Marginally **< 44px**; no hitSlop added (104-114).
  - Information density: low. One intro + six rows; only the open section shows body text.
  - Clean or cluttered: clean. Uniform section cards (163-170), single accent (chevron).
  - Most important action most prominent? The interactions are the section toggles, all equal weight, which is appropriate for an accordion. No competing CTAs.
  - Small/standard/large behaviour: single ScrollView, content padding spacing.lg, gap spacing.md, paddingBottom spacing.xxxl (161). SafeAreaView edges 'bottom' only (136) — top handled by the stack header. Body text wraps; collapsed state keeps the page short on small screens. Scales with Larger-text.

---

SCREEN: CoachingRemindersScreen ("Coaching reminders")
WHAT IT IS: Pro settings page for the two non-optional Precision Coaching reminders (morning weight + weekly check-in) plus the optional missed-check-in follow-up. Exposes day/hour pickers; the two coaching reminders are always scheduled (toggles deliberately removed).
WHAT IS ON IT:
- Intro (265-267): "The coach uses these reminders to keep your data current. Pick a time and a day that fit your week. Both reminders run automatically."
- Permission-denied warning box (269-276): shown when notifications are disabled at OS level
- "Morning weight" section (279-301): card with scale icon, "Morning weight reminder" title, an Hour ChipRow (5-12), a "Notification at {hour}" line, and a helper paragraph about weighing cadence
- "Weekly check-in" section (304-338): card with pulse icon, title, a Day ChipRow (Sun-Sat), an Hour ChipRow (14-21), a "Reminder every {Day at hour}" line, an optional next-fire line ("Your next check-in will be {date}…"), and a helper paragraph (7-day minimum gap)
- "Check-in follow-up" section (341-362): card with a toggle Switch ("Follow up if a check-in slips by") + helper paragraph
- Inline "Saved" text (364) after a debounced save; also a toast on save
NAVIGATION: Route "CoachingReminders", registered in ProfileStack as `<Stack.Screen name="CoachingReminders" component={GatedCoachingReminders} options={{ title: 'Coaching reminders' }}>` (RootNavigator.js:398). Reached from Settings → "Coaching reminders" row (per the header comment, lines 12-13). Pushes nowhere itself.
GATING: Pro. `const GatedCoachingReminders = withProGuard(CoachingRemindersScreen, 'Coaching reminders')` (RootNavigator.js:155), registered as GatedCoachingReminders (398). The header comment confirms it is a "Pro-only row" (line 13).
CURRENT STRENGTHS:
- Design intent is sound: removing the on/off toggles for the two mandatory reminders prevents the user from breaking the coaching loop (header comment 4-9).
- Scoped cancellation: applyScheduled cancels ONLY the two notifications this screen owns, fixing the historic "wipe every scheduled notification" bug (78-87).
- Merge-writes the prefs blob so keys this screen doesn't own survive (96-108, 229-239); mirrors the missed-follow-up pref into the synced SQLite row (242-244).
- Debounced apply (400ms, 202-223) with both an inline "Saved" indicator and a toast; cleans up timers on unmount (196-199).
- Computes and shows the actual next fire date including the 7-day-minimum bump (257-260, 328-332).
- Permission-denied state surfaced clearly (269-276).
CURRENT WEAKNESSES:
- The `Switch` import is used only for the follow-up toggle; the two main reminders intentionally have no toggle, which is correct but can surprise a user expecting to turn them off.
- Chips are time/day values with no AM/PM column header beyond the helper line; a user must infer that the morning row is AM and the check-in row is PM from the chip ranges (HOURS_MORNING 5-12, HOURS_EVENING 14-21, 38-39).
- Minute is fixed at 0 for both reminders (state defaults 147,150; no minute picker), so the schedule line never shows non-zero minutes despite formatNextFire supporting them (73).
NEWBIE QUESTION: Yes. Plain language, clear "pick a day and time" model, helper paragraphs explain WHY (trend math needs ≥3 weigh-ins/week, 7-day gap). A newbie can set this up without confusion.
ATHLETE QUESTION: Yes. An experienced user gets full control of when the two data-collection prompts fire and an explicit next-fire date. The fixed-:00 minute is a minor limitation but unlikely to matter to a competitor.
LOCATION QUESTION: Yes. As a Pro coaching settings sub-page reached from Settings, living in ProfileStack (398) under "Coaching reminders" is correct.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - intro fontSize.sm (13) lineHeight 20 (373)
    - warningText fontSize.xs (11) (379)
    - sectionLabel fontSize.xs (11) semibold uppercase (380-384)
    - cardTitle ...type.bodyStrong fontSize.md (16) (397)
    - pickerLabel fontSize.xs (11) semibold (399-403)
    - chipText ...type.label fontSize.sm (13) (412)
    - scheduleText ...type.label fontSize.sm (13) primary (414-417)
    - scheduleSubText fontSize.xs (11) (418-421)
    - helperText fontSize.sm (13) lineHeight 18 (426)
    - savedText fontSize.xs (11) semibold (427-430)
  - Touch targets:
    - Chips: explicit height 36, minWidth 40 (405-410). **FLAGS < 44px** in height.
    - Follow-up Switch: native RN Switch (348-355), standard ~31px tall toggle — native control, not a custom button; effectively below 44 but a platform-standard target.
    - No back control in-file (the stack header supplies it; this screen uses SafeAreaView edges 'bottom', 263).
  - Information density: moderate. Three labelled cards in a scroll, each with one or two horizontal chip rows.
  - Clean or cluttered: clean. Consistent card token (surface2, 385-388), icon wraps 36px (393-396), horizontal ChipRows scroll independently (122).
  - Most important action most prominent? The chip selectors are the primary interaction and are clearly the focus of each card; there is no competing CTA, so yes.
  - Small/standard/large behaviour: outer ScrollView (264) with horizontal inner ChipRows (showsHorizontalScrollIndicator false, 122), so the hour/day chips scroll horizontally on narrow screens rather than wrapping/clipping — good small-screen behaviour. Chip height fixed at 36 (won't scale with Larger-text, though chipText does scale, risking text overflow within the fixed-height chip on the largest setting). Content padding spacing.lg, paddingBottom spacing.xxl (372).

---

SCREEN: SettingsCoachingScreen ("Coaching")
WHAT IT IS: The settings page for the levers that shape what the coach asks for and adjusts: a calmer-experience toggle (free), and (Pro) daily step target on/off + value, cardio on/off, coaching tone register, "show the science" toggle, plus a cycle-tracking toggle for users whose body profile records a female sex.
WHAT IS ON IT:
- "Calmer experience" SettingRow with Switch (113-126): "drops the aggressive calorie targets and quietens the progress prompts" (free, always shown)
- Pro-only block (`tier === 'pro'`, 127-234):
  - "Daily step target" SettingRow + Switch (129-144), sub copy changes with state
  - When steps on: "Steps a day" labelled TextInput row (145-160), number-pad, clamps 1000-30000 on blur (90-100)
  - "Cardio" SettingRow + Switch (161-179), sub copy changes with state
  - "Coaching tone" block (183-213): label + dynamic sub + three chips (Automatic / Supportive / Precise)
  - "Show the science" SettingRow + Switch (217-232)
- "Cycle tracking" SettingRow + Switch (235-250): only when bioSex === 'female'
NAVIGATION: Route "SettingsCoaching", registered in ProfileStack as `<Stack.Screen name="SettingsCoaching" component={SettingsCoachingScreen} options={{ title: 'Coaching' }}>` (RootNavigator.js:376). Reached from the Settings landing page. Note: it is registered WITHOUT a Pro guard (bare component, 376) — gating is internal to the screen (see GATING). Pushes nowhere itself.
GATING: Mixed / internal. The route is not withProGuard-wrapped (RootNavigator.js:376). Gating is done inside the screen via `tier` from useAppStore (17-24): the "Calmer experience" toggle is free (always rendered, 113), while step target, cardio, coaching tone and "show the science" are inside `{tier === 'pro' && (...)}` (127). Cycle tracking is gated on body-profile sex, not tier (`bioSex === 'female'`, 235). Free users therefore see only the Calmer-experience row (and cycle tracking if female).
CURRENT STRENGTHS:
- Per-feature gating is explicit and correct: Pro levers (steps/cardio/tone/science) sit behind `tier === 'pro'`, matching the FREE vs PRO rules; the free Calmer-experience toggle is exposed to everyone.
- Step target input is clamped to a sane band (1000-30000) and never lets an empty/junk value through (90-100).
- Turning steps on triggers the health step-permission request at the right moment, silent if declined (79-85).
- Coaching tone and "show the science" are documented as local-only profile fields that survive sync (comment 35-40), with haptic feedback on change (42, 50, 57, 64, 70).
- useFocusEffect re-reads wellbeing mode, cycle tracking and bio-sex on focus (102-108), so the page reflects external changes.
CURRENT WEAKNESSES:
- "Cardio" and "Calmer experience" both use the same `heart-outline` icon (114, 163), which is visually ambiguous when both are visible to a Pro user.
- The cardio toggle's onValueChange is an inline async arrow (171-174) while the other toggles use named handlers — minor inconsistency.
- No explicit indication to free users that the hidden Pro levers exist (the block simply doesn't render), so a free user has no discoverability of step/cardio/tone settings (this may be intentional).
NEWBIE QUESTION: Mostly. The toggles have descriptive sub-copy that explains the effect in plain terms ("Steps are the coach's first lever when progress slows, before your food"). "Coaching tone" and "Show the science" are self-explanatory via their sub-text. A newbie can operate it, though the meaning of "calmer experience / aggressive calorie targets" assumes some context.
ATHLETE QUESTION: Yes. An experienced user gets the meaningful levers: step target value, cardio enable, tone register (Precise = numbers-first), and a science layer that adds technical terms. These are exactly the personalisation knobs a serious user expects.
LOCATION QUESTION: Yes. As a Settings sub-page in the Profile stack (376) reached from the Settings landing, this is the correct home for coaching preferences.
VISUAL + USABILITY:
  - Font sizes (token + px + file:line):
    - SettingRow label ...type.body fontSize.md (16) (SettingsPrimitives.js:97); sub fontSize.xs (11) lineHeight 16 (SettingsPrimitives.js:98)
    - toneLabel ...type.body fontSize.md (16) (265); toneSub ...type.caption fontSize.xs (11) (266); toneChipText ...type.caption fontSize.xs (11) (279)
    - stepTargetLabel ...type.body fontSize.md (16) (290); stepTargetInput ...type.body fontSize.md (16) (291-302)
  - Touch targets:
    - SettingRow: padding spacing.lg (16) all sides (SettingsPrimitives.js:84) → row height comfortably ≥ 44px (16+16 + 16px label ≈ ~48px+). OK.
    - toneChip: paddingVertical spacing.sm (8) + minHeight 40 (268-277). **FLAGS < 44px** (minHeight 40).
    - stepTargetInput: paddingVertical spacing.sm (8) + fontSize.md → ~32px tall. **FLAGS < 44px** as a tap target (291-302), though it is a text field rather than a button.
    - Switches: native RN Switch controls (~31px), platform-standard.
  - Information density: low-to-moderate. A single bordered section containing a handful of rows; Pro users see ~6 rows + the tone chips, free users see 1-2.
  - Clean or cluttered: clean. Uses the shared SettingsPage/SettingRow primitives so it matches every other settings sub-page; the tone chips are the only bespoke element.
  - Most important action most prominent? There is no single "primary" action — it is a preferences page of equal-weight toggles, which is appropriate. The tone chips are visually distinct (selectable, primary border when on, 278) which correctly signals their multi-choice nature.
  - Small/standard/large behaviour: rendered inside SettingsPage (a SafeAreaView edges 'bottom' + ScrollView, SettingsPrimitives.js:53-59), content padding spacing.lg, paddingBottom spacing.xxl. Rows are flex; tone chips use flex:1 so they share width evenly (269). toneChip minHeight 40 is fixed (won't grow), so on the largest text setting the fontSize.xs chip text scales but the chip height does not — a minor overflow risk. Otherwise scales cleanly.
