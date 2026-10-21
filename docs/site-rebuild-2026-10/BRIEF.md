# Owner's brief and stage 1 answers (2026-10-21), binding for stage 2

Transcribed from the owner's messages. Where the brief and CLAUDE.md or
docs/rules disagree, the rules win and the conflict goes to the owner.

## Hosting and links
- volyume.app is GitHub Pages, published from main by
  `.github/workflows/deploy-pages.yml` (manual dispatch). It stays there.
- iPhone universal links are ON HOLD (they need Expo/native work that breaks
  EAS builds). The site only LINKS to the App Store:
  https://apps.apple.com/gb/app/volyume/id6777083702 . Google Play:
  https://play.google.com/store/apps/details?id=app.volyume . Never touch
  app.json or any native file in this work.
- `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association`
  stay byte for byte (assetlinks is filled from secrets at deploy).
  `.nojekyll` stays. The paths the app opens keep working: /partner, /u, /p,
  /s, /g/, /c/ (and 404.html's forwarding of /partner/CODE and /c/CODE).

## Content rules
- Cover everything the app does in 3.3.0, from the code: FEATURES.md and
  FACTS.md in this folder (respect wording cautions C1 to C17 and the "do not
  mention" list).
- NO claims about price or cost anywhere: no "free", "all free", "no card",
  "no time limit", "no ads" or similar. Exceptions: the free-for-life line on
  the challenge pages and terms, exactly "Completing a challenge with a final
  score of 50 or more earns free for life."; and in /challenge-terms/ only,
  the legal free-entry sentence "Entry is free, and you can leave at any
  time." (owner answer).
- British English (colour, personalised, organise, programme; dates like 21
  October 2026; £; kg, with stone and lb only where the app offers them,
  which is body weight only; gym weights are kg only).
- No jargon. Write for someone who has never used a training or food app.
  Explain a product name the first time it appears ("Volyume Score",
  "Precision Coaching" sparingly). Never use internal terms (ED flag, safety
  state, telemetry, sync engine, Supabase, archetype, ...). Plain
  replacements: hypertrophy = building muscle; deload = a lighter recovery
  week; mesocycle/block = a few weeks of training ending with a lighter week;
  progressive overload = adding weight or reps over time; volume = how many
  hard sets each muscle gets in a week; TDEE/BMR/maintenance = the calories
  your body uses in a day; macros = protein, carbs and fat; RIR/RPE = how hard
  a set felt, reps left in the tank; AMRAP/myo-reps/rest-pause = explained in
  a line or left out; offline-first/sync = works without signal, saved on
  your phone and backed up to your account; V-taper/X-frame = a short plain
  description of the shape.
- Short sentences, no em dashes, the app's calm voice
  (docs/COACHING_VOICE_SYNTHESIS_LOCKED.md, docs/rules/plain-english.md).
- No AI tells: no "unlock", "elevate", "empower", "seamless", "game-changer",
  "journey", "level up", "take your training to the next level", "whether
  you're A or B", "it's not just X, it's Y", "say goodbye to", "look no
  further", "designed with you in mind"; no fragment slogans ("Train. Eat.
  Grow."); no lists that always come in threes; no exclamation marks, emoji
  or sparkle icons; no bold scattered through sentences.
- Reuse the app's wording: "Your progress photos and workout videos stay on
  this phone, unless you choose to share them." "Your coach isn't an AI
  chatbot. It follows fixed rules." The Volyume Score is a score from your
  own photos, not a body-fat measurement.
- ED safety and CAP Code 13: no weight-loss promises, no "lose X kg", no
  before-and-after body images, no "shred"/"cut fast", no testimonials or
  reviews, no result numbers. Body weight is never the headline (C1).
- iPhone is in the App Store (page live 2026-10-21): say iPhone and Android.
- Support contact shown on the site: allansdouglas1983@gmail.com (owner
  answer). Legal texts (privacy policy, challenge terms) keep their own
  wording.

## Design
- Complete redesign in the app's own style. Keep nothing of the old look.
- Colours, fonts, text sizes, spacing and radii from `src/styles/theme.js`
  (and `src/styles/fontFamily.js`); card, button and list styles from the
  shared components; Ionicons (the app's icon set). CSS variables GENERATED
  from theme.js by a build step so the site follows the app.
- Dark by default; light follows the device (prefers-color-scheme) using the
  app's light palette. Amber for actions and highlights only.
- No pills: no capsule badges, tags, chips or buttons. Buttons are the app's
  rounded rectangle (radius 16), never 999.
- No gradient text, glows, colour blobs, glass; no tilted or floating phone
  mock-ups (real screens, flat and straight); no auto-playing animation or
  carousels; no "New" badges, logo walls, ticking counters; no rows of
  identical icon cards.
- No clipped text: nothing cut off at 360 px, at 200% zoom or at the largest
  text size; no text-overflow: ellipsis, line-clamp or nowrap on text that
  might not fit; buttons and cards grow to fit.
- No horizontal scroll at 360 px; header and the store button fit at 360 px;
  tap targets at least 44 px.
- No third-party scripts, analytics, cookies or fonts; fonts and images
  served from the site; images sized and compressed.
- Title, description and share image on every page; sitemap.xml and
  robots.txt; challenge pages noindex.

## Facts from code
- A build step reads the repo and writes the site's numbers (exercises,
  plans, foods, curated meals, anything else stated as a number); a guard test
  fails if a page states a number the code does not support.
- Extend privacyTruth.guard.test.js (or add a test) to cover the site's
  privacy claims.

## Stage 1 answers
- Pages: keep home, get, support, privacy, articles, challenge pages; ADD
  /features/ and /how-the-coach-works/.
- Articles: keep and update all three (new layout, both store links, jargon
  explained or replaced, facts checked). URLs unchanged.
- "Entry is free" kept in /challenge-terms/ only.
- Privacy section 6 corrected (text below); everything else in the privacy
  policy word for word; "Last updated" becomes 21 October 2026.
- /privacy.html becomes a redirect to /privacy/ (one copy of the text). The
  docs/web parity test moves to the single copy.
- Share image: made from the current wordmark and V mark, 1200 by 630, on the
  app's dark background, compressed.
- No Lighthouse.
- Every URL that exists today keeps working or redirects to its replacement.

## Privacy policy section 6 replacement (exact)

Heading: `6 Health apps`

> Volyume does not connect to Apple Health or Health Connect. It does not read
> from or write to any health app on your phone.

(Replaces the Health Connect section, in public/privacy/index.html and
public/privacy-policy.md. Reason: the link was removed on 30 June 2026,
`src/screens/ProOnboardingScreen.js:2052`, and no health-app module is
installed.)
