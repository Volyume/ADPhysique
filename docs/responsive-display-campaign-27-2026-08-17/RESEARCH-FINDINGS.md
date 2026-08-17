# Campaign 27 — industry responsive-type research (sonnet agent, 2026-08-17)

External research via WebSearch/WebFetch; lead-reviewed. Evidence for
PROPOSAL.md. Sources named per finding; primary docs preferred.

## Q1 - How mainstream/fitness apps handle OS font scaling
- NO public engineering writing exists from Strava, MyFitnessPal, Hevy,
  Strong, Whoop or MacroFactor on font-scaling policy - a genuine gap.
  Strava's community forum carries USER COMPLAINTS that it does not
  follow OS scaling (communityhub.strava.com threads).
- ~25% of Android users raise their font size (Eevis Panula, mobile
  accessibility engineer, eevis.codes 2024-02-02) - larger than many
  locale user bases; not a niche.
- Real-world norm: honour scaling on reading content; cap or fix on
  dense chrome (tab bars, stat tiles, badges). Nobody documented goes
  fully-capped or fully-uncapped end to end.

## Q2 - RN best practice 2024-2026
- Governing props: allowFontScaling (default true) and
  maxFontSizeMultiplier (undefined = uncapped; >=1 caps) - RN Text docs.
- Convention: caps 1.2-1.3 on constrained UI; below 1.2 "significantly
  impacts accessibility"; prefer LOWERING base size over aggressive
  caps (OneUpTime, Jan 2026).
- Android 14+ applies NON-LINEAR font scaling at OS level (200% max,
  curve tempers large text) - RN inherits it automatically; Google
  still instructs manual testing at max accessibility size (Android 14
  features doc; Flutter migration doc).
- WCAG 1.4.4 (200% resize) is web-zoom in origin; W3C has NOT settled
  its mapping onto native font-scale caps (w3c/wcag2ict issue #4).
- Apple's actual bar (App Store Connect, Larger Text evaluation
  criteria): enlarge to at minimum 200%, "scale as large as possible
  while still retaining reasonable usability" - a usability-bounded
  cap is Apple's own wording; the label is self-declared, not a review
  rejection trigger. No evidence of Play rejections for caps either.

## Q3 - Width adaptation
- react-native-size-matters moderateScale (375dp baseline, damping
  factor 0.5) is the common continuous-scaling library; damping exists
  precisely because linear scaling runs away on large/small screens.
- useWindowDimensions is the sanctioned reactive source; common
  breakpoints 320/375/480/768 - a 384dp S22+ sits AT the small-phone
  boundary these systems flag for tighter type/padding.
- adjustsFontSizeToFit + minimumFontScale: shrink-to-fit for genuinely
  single-line constrained text; conflicts with flex/fixed dims on the
  same node.
- Flex/percentage-first layout + wrapping containers is the FIRST-LINE
  fix in every 2026 source; scaling formulas are secondary tools.
- Pitfalls: padding must scale with fontScale deliberately (Panula);
  rigid single-row layouts break under the narrow-width + large-font
  COMPOUND case - exactly the S22+ scenario.

## Q4 - Type-token approaches
- Apple HIG: named text styles on a DISCRETE Dynamic Type step table
  (UIFontMetrics for custom fonts). Material 3: window size classes
  (compact/medium/expanded) - phones are all "compact", so M3's system
  does not address phone-vs-phone variance.
- Both platform vendors use discrete token ramps, never continuous
  formulas, for the type scale itself. Continuous scaling is a
  community-layer addition.
- No source endorses ad hoc per-token dp tweaking as a named pattern;
  the platform-aligned equivalent is a small discrete device-class
  bucket.

## Q5 - Testing text overflow
- Maestro: RN/Expo-native flows + built-in visual screenshot diffing
  (maestro.dev blog "Introducing Visual Testing"); works with EAS.
- Percy pairing (Mission Lane engineering blog) and react-native-owl
  (Formidable) are heavier alternatives.
- Lightest solo-founder setup: Maestro alone against a fixed matrix -
  ~360-384dp Android profile with elevated system font size, plus a
  large iPhone - inside an EAS Workflow.
- Both Apple and Google instruct a MANUAL max-accessibility-size pass
  as first-class QA regardless of tooling.

## Convergent practice (8 bullets)
1. Per-surface capping is the norm: generous/uncapped reading text,
   ~1.2-1.3 caps on dense chrome.
2. A usability-bounded cap is compatible with Apple's and Google's
   actual review bars; WCAG 200% is directional, not a native-app
   bright line.
3. Android 14+ non-linear scaling already tempers the top end for us.
4. Fix the layout before the font: flex/wrap-first is the primary
   defence; scaling/shrink tools are targeted secondaries.
5. Platform design systems use discrete token ramps, not continuous
   formulas.
6. Padding/spacing must scale alongside text deliberately.
7. Fitness-app peers publish nothing on this: it is implementation
   hygiene, not a playbook to copy - and at least one big peer
   (Strava) gets complaints for ignoring OS scaling.
8. Maestro visual testing on a small fixed device matrix is the
   lightest adequate regression net.
