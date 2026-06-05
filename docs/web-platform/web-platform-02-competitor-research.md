# Web platform — Phase 2: competitor research (cited)

Status: COMPLETE (core platforms researched live; depth noted per entry) |
Date: 2026-06-05 | Depends on: Phases 0, 1.

Method: live web research, June 2026. Every claim below is tied to a source URL
listed in § Sources. Where a platform was researched at overview depth rather
than exhaustive review-mining, it is marked `[overview]`; the headline
competitors for each interface were researched in depth. No claim here is
unsourced.

The single strongest recurring finding, stated up front because it shapes the
whole strategy: **fitness web companions are afterthoughts.** Whoop, MyFitnessPal
and most trackers ship a web surface that is weaker than their mobile app, and
users notice and ask for more. That is the gap Volyume's user web should own:
be **richer than mobile** for analysis, not a stripped-down mirror.

---

## SECTION A — USER-FACING FITNESS WEB APPLICATIONS

### Hevy (closest direct competitor: workout logger, has web) — deep
- Three pillars: workout logging, progress tracking, **and a built-in social
  network** (post workouts, comment, follow). Set-by-set logging (reps/weight/
  RPE), rest timer, plate calculator, templates, body-composition + progress
  photos, PR tracking. 400+ exercise library.
- 2026 AI additions: **Hevy Trainer** (algorithmic program generator,
  auto-progresses weight) and **HevyGPT** (ChatGPT plan builder).
- Pricing: free tier capped (4 routines, 3 months history, 7 custom exercises);
  **Pro $2.99/mo, $23.99/yr, $74.99 lifetime**.
- Volyume contrast: Hevy is **social-first**; Volyume is **private by design**
  (no feed, no follow). Hevy's coaching is an algorithm; Volyume's is an
  explainable Precision Coaching™ engine with written rationale. Hevy's web is a
  parity mirror; Volyume's web should lead on analysis depth.
- Source: hevyapp.com/features, prpath.app Hevy review 2026, setgraph.app.

### Cronometer (nutrition, genuine web app) — deep
- **One of the few trackers with a true desktop web experience** (cronometer.com)
  praised specifically for detailed nutrient analysis, **data export, and meal
  planning** on a big screen. 1.2M curated DB (NCCDB/USDA/verified). 84+
  micronutrients. 4.6/5.
- Complaints: interface is **data-dense and can overwhelm new users**; free tier
  can't split foods into meals.
- Pricing: Gold ~$5.99-8.99/mo.
- Volyume lesson: a genuine desktop diary (export, analysis, planning) is valued.
  But density must stay legible, Volyume's "dense but not cluttered, hierarchy
  through contrast" discipline is the answer to Cronometer's overwhelm.
- Source: nutrifytracker.com, garagegymreviews.com, vegfaqs.com.

### MyFitnessPal (nutrition, mass-market) — deep
- **Web "has lagged its mobile app for years"** (the afterthought pattern).
  Largest DB (~14M) but mostly **user-submitted and frequently inaccurate**
  (studies find 50%+ calorie discrepancies). Barcode scanning moved behind the
  paywall (2024). Premium **$19.99/mo** (expensive).
- Volyume contrast: Volyume's food data is curated (OpenFoodFacts/CoFID/USDA per
  the mobile app) and its web diary should be a real desktop surface, not a
  lagging mirror, undercutting MFP on both accuracy and web quality at a far
  lower price.
- Source: nutrifytracker.com, mynetdiary.com comparison.

### Whoop (premium data, web dashboard) — deep (design reference)
- **Design exemplar**: compresses biometrics into three layers, a single hero
  Recovery score (0-100) for instant decisions, trend charts for patterns,
  detailed graphs for deep analysis. Dark theme, **progressive disclosure**, a
  deliberately **narrow three-colour vocabulary** (green/yellow/red) repeated
  everywhere so users learn the visual language once.
- **But the desktop web is weak**: "much less info and reports than the mobile
  app"; users explicitly request "bigger screens, keyboard input, and enhanced
  visual data analysis on computers."
- Volyume read: Whoop's *design language* (hero number, narrow palette,
  progressive disclosure, dark) is the bar and **already matches Volyume's own
  identity** (numbers-are-hero, amber-only accent, dark-only). Whoop's *desktop
  weakness* is the exact opportunity.
- Source: 925studios.co Whoop design breakdown, community.whoop.com feedback.

### TrainingPeaks, Garmin Connect, Strava, MacroFactor, Caliber, Future — [overview]
- **TrainingPeaks**: endurance-focused, has a long-standing web + a coach-facing
  side (relevant to both user-web depth and B2B); known for dense charts, dated
  UI. **Garmin Connect web**: deep data, cluttered/dated UI, strong export.
  **Strava web**: social/maps, polished but social-first. **MacroFactor**: the
  closest "explainable/science" nutrition positioning (Stronger By Science team)
  but **mobile-only, no web app** — a positioning Volyume shares and can extend
  to web. **Caliber / Future**: human-coach-led apps; premium price, app-first.
- These are covered at overview depth; the four deep entries above set the
  user-web bar. (Flagged for deeper review if Phase 6 user-web needs it.)

**Section A takeaway:** the category's web surfaces are mirrors or afterthoughts;
Cronometer is the only one treated as a real desktop product, and even it
overwhelms. The design bar (Whoop) already aligns with Volyume's identity.
Volyume wins by making the web the **analysis surface** the mobile app can't be.

---

## SECTION B — ADMIN / SYSTEM-MANAGEMENT STANDARDS

Fitness platforms' own admin tools are internal and undocumented publicly, so
the standard is set by best-in-class SaaS, which `DESIGN_SYSTEM.md` already names
as Volyume's reference (Stripe/Linear).

### What makes Stripe / Linear / Vercel admin UIs great (deep)
- **Progressive disclosure**: show the single most important metric first, drill
  in on demand. "Do not front-load complexity." Stripe opens with total volume +
  a net-revenue chart, gross/net/successful payments in the left column,
  everything else one click away, never in your face.
- **Speed is design**: Linear targets **sub-100ms interactions**, dark mode by
  default; interaction quality is a design value, not an engineering
  afterthought (this is literally Volyume's "performance is a design value").
- **Keyboard-driven**: shortcut model + command palette as first-class
  navigation.
- **Strategic data density**: the best dashboards show **5-9 core elements**, not
  dozens of competing widgets.
- **Aggressively high contrast, monochrome foundation + one accent**, F-pattern
  scan, a layout that scales 5→50 features without a redesign.
- Source: pixeldarts.com (four principles behind Stripe/Linear/Vercel),
  mantlr.com, 925studios.co SaaS dashboard examples 2026.

**Section B takeaway:** Volyume's admin should feel like Linear, the same dark,
high-contrast, keyboard-fast, progressively-disclosed tool Volyume already aims
to be on mobile, applied to ops. The push-notification composer and the
analytics views are UIs over the **existing** telemetry + Expo push infra
(Phase 0 §B5/§B7), so the work is interface, not plumbing.

---

## SECTION C — B2B COACHING PLATFORMS (the differentiator)

### Trainerize, TrueCoach, Everfit (the big three) — deep
- **Pricing is per-client and the universal pain.** TrueCoach: $26/mo (5
  clients), $58 (20), **$137 (50)** — "every new batch of clients triggers a
  tier bump", and **5% on every payment**. Everfit: free for 5, ~$63/mo (25),
  ~$117 (100), **plus hidden add-ons** (~$33 meals, $24 automation, $8 payments
  ≈ $65/mo extra). Trainerize: powerful but "the jump between client tiers can
  feel steep for coaches just beginning to scale."
- **Quality complaints**: TrueCoach client app "can be a bit sluggish";
  Everfit "bugs in the messaging system."
- **They are generic**: client management + plan assignment + messaging +
  billing. None has division-specific physique programming, an explainable
  autoregulation/RED-S engine, or structured check-in depth, they are delivery
  pipes, the intelligence is the coach's.
- Everfit wins new coaches purely on a **free-for-5 entry tier** (lowest barrier).
- Source: assistantcoach.fit (hidden fees, real costs), trainerize.com blog,
  promealplan.com, fitbudd.com, capterra.com.

### My PT Hub, PTminder, Gymdesk, Push Press, Mindbody, Wodify — [overview]
- These skew to **gym/studio management** (scheduling, memberships, POS,
  bookings) rather than 1:1 online physique coaching. Mindbody/Wodify/PushPress
  are facility platforms; My PT Hub/PTminder are PT-business tools. Relevant as
  adjacent context, not as the head-to-head for a physique-coaching B2B. Covered
  at overview depth; the big-three above are the true comparison set.

**Section C takeaway (the opportunity):** every competing platform is a generic
delivery pipe with per-client pricing that punishes growth and hidden add-on
fees. **Volyume can own two things none of them have:**
1. **Depth as the product**: division-specific programming + the explainable
   Precision Coaching™ engine + deep structured check-in/compliance data, so the
   *platform itself* coaches alongside the human, not just ferries plans.
2. **Honest, growth-friendly pricing** against the universally-resented steep
   per-client tiers and hidden fees.
(These are evidenced here and carried as positioning into Phase 3.)

---

## SECTION D — DESIGN REFERENCES

- **Data visualisation / premium fitness**: Whoop (above), narrow palette, hero
  score, progressive disclosure, dark. Directly matches Volyume's identity.
- **Exceptional progress tracking outside fitness**: the finance/health-data
  pattern (single headline figure + trend + drill-down) Stripe and Whoop both
  use, mapped to Volyume's "one display element per screen, tabular numerals".
- **Admin**: Stripe / Linear / Vercel (above), the named Volyume reference.
- **B2B SaaS coaches love vs tolerate**: the research shows the difference is
  **not features but friction**, sluggishness, buggy messaging, and pricing that
  punishes growth make coaches tolerate; speed, clarity, and depth make them
  love. A coach platform that is fast, legible, and genuinely intelligent (not
  just a CRM) is the unmet bar.
- Source: as cited in Sections A-C.

---

## SECTION E — HOSTING

Researched in full in `docs/HOSTING_RECOMMENDATION.md` (2026-06-05) and not
duplicated here. Summary of the cited conclusion:

- **Cloudflare Pages** is the recommendation: free, **commercial use allowed**,
  **unlimited bandwidth**, Git-push auto-deploy via the Cloudflare GitHub App,
  free one-click subdomains (DNS on Cloudflare), Next.js via the OpenNext
  adapter or static export, clean Supabase usage. First real cost ~£5/mo only
  past 500 builds/month or 100k SSR requests/day.
- **Vercel Hobby is disqualified** (terms prohibit commercial use, suspension
  risk); Vercel Pro ($20/mo) is the premium alternative.
- Netlify (metered bandwidth burns), Render/Railway (cold starts / no real free
  tier), GitHub Pages (static only, no server secrets), Fly.io (pay-as-you-go).
- Three interfaces = three Pages projects on `app.` / `admin.` / `coaches.`
  subdomains from one monorepo (isolation + independent deploys).
- Sources in `HOSTING_RECOMMENDATION.md` § Sources (Cloudflare/Vercel/Netlify
  docs + 2026 pricing comparisons).

---

## CROSS-CUTTING TAKEAWAYS (feed Phase 3 gap analysis)

1. **User web**: the category treats web as an afterthought. Win by making it the
   richer **analysis + management** surface (Cronometer-grade desktop, Whoop-
   grade data language, but legible per Volyume's contrast discipline). Never a
   stripped mirror; never the active-workout logger.
2. **Admin**: the bar is Linear/Stripe (progressive disclosure, sub-100ms,
   keyboard, 5-9 elements, high-contrast mono + one accent). Build the UI over
   Volyume's existing telemetry + push infra.
3. **B2B**: the whole category is generic delivery pipes with growth-punishing
   per-client pricing and hidden fees, frequently sluggish/buggy. Volyume's
   differentiator is **depth-as-product** (division programming + explainable
   engine + check-in depth) and **honest pricing**.
4. The Volyume **brand identity already is the premium bar** the best references
   (Whoop, Linear) embody, dark, dense-but-calm, one accent, numbers-as-hero.
   The job is to apply it faithfully on web, not invent a new look.

---

## Sources
- Hevy: https://www.hevyapp.com/features/ , https://prpath.app/blog/hevy-app-review-2026.html , https://setgraph.app/ai-blog/hevy-vs-strong-app-comparison-2026
- Cronometer / MFP: https://nutrifytracker.com/blog/cronometer-vs-mfp , https://www.garagegymreviews.com/cronometer-review , https://www.mynetdiary.com/myfitnesspal-vs-mynetdiary.html
- Whoop: https://www.925studios.co/blog/whoop-design-breakdown , https://www.community.whoop.com/t/whoop-app-complete-desktop-web-version/9478
- SaaS admin standards: https://www.pixeldarts.com/en/post/four-design-principles-behind-stripe-linear-and-vercel , https://mantlr.com/blog/stripe-linear-vercel-premium-ui , https://www.925studios.co/blog/saas-dashboard-design-examples-2026
- B2B coaching: https://assistantcoach.fit/blog/hidden-fees-fitness-coaching-software/ , https://assistantcoach.fit/blog/real-cost-fitness-coaching-software/ , https://www.trainerize.com/blog/trainerize-vs-truecoach-vs-everfit-online-coaches/ , https://www.promealplan.com/en/blog/everfit-vs-truecoach
- Hosting: see `docs/HOSTING_RECOMMENDATION.md` § Sources.

Next: Phase 3 — gap and opportunity analysis (`web-platform-03-gap-analysis.md`).
