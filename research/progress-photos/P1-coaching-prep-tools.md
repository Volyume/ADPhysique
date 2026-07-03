# P1 — Progress Photos in Coaching & Contest-Prep Platforms

**Scope.** How the serious-coaching and bodybuilding contest-prep tools handle
client progress photos: capture, dating, labelling, organisation, comparison,
consistency aids, privacy, monetisation, and what real users say. These are the
tools working physique coaches and prep athletes actually use, so they define
the *expectation* a VOLYUME user brings across. VOLYUME is different in kind
(calm, premium, ED-safe, **on-device**, single-user — no coach on the other
end), so the value here is as much about what to **avoid** as what to steal.

**Evidence tags.** `[OBSERVED]` = behaviour described from product use / reviews
/ demos; `[DOCUMENTED]` = stated in a vendor help page or store listing;
`[INFERRED]` = reasoning by the author. URLs inline; full list at end.

**Confidence caveat.** Every app here is a **coach↔client** platform. The
photo is a *deliverable a client sends a coach for judgement*. That framing —
photo as evidence submitted for external evaluation — is the exact opposite of
VOLYUME's "private observation tool for yourself." Read every "what works"
below through that lens. `[INFERRED]`

---

## 1. TRAINERIZE (ABC Trainerize)

The category's largest coaching platform; progress photos are a headline
feature and a marketing tool for coaches.

**1. Capture.** In-app camera or camera roll. The mobile app lets users "quickly
snap front, side, and back photos." `[DOCUMENTED]`
(https://www.trainerize.com/blog/simple-collaborative-photo-friendly-trainerize/)
Coaches can also upload client photos themselves during a consultation.
`[DOCUMENTED]` (same)

**2. Auto-dating.** Photos are timestamped and slotted chronologically; coaches
can "Set Photo Milestones And Schedule Photo Dates," e.g. request monthly shots
or shots at plan start/end. `[DOCUMENTED]` (same) The date is how the timeline
reads; no explicit "date badge" styling documented. `[INFERRED]`

**3. Labelling / metadata.** Rigid **three-pose model**: front / side / back —
not free tags. Notably, on a platform migration, "Existing photos are retained
but will not show on the new mobile app until they've been tagged into one of
the 3 new poses." `[DOCUMENTED]` (same) Body-weight and body stats live in a
*separate* metrics area, not stamped on the photo. `[OBSERVED]`
(https://www.trainerize.com/blog/story/motivate-clients-using-photos-body-stats-video/)

**4. Organisation.** Chronological gallery grouped by the 3 poses; each client
"gets a profile with progress photos (front/side/back comparison)." `[OBSERVED]`
(https://www.ptpioneer.com/personal-training/tools/trainerize-review/)

**5. COMPARISON.** Side-by-side on **mobile only**: "Tilt your phone and swipe
through your photos side by side," then download the composed comparison image
directly. `[DOCUMENTED]` (blog, above) On **desktop** there is no built-in
compare — "you have to view each individually or download them to put them side
by side," a long-standing coach complaint on the idea forum. `[OBSERVED]`
(https://ideas.trainerize.com/forums/167887-coach-trainer-abc-trainerize/suggestions/37696717)
The interaction is *pick two → juxtapose → export*, explicitly framed as
"your next marketing image." `[DOCUMENTED]`

**6. Consistency aids.** **Guiding lines** overlaid at capture so photos align
for comparison — but "Guiding lines only available on iOS devices."
`[DOCUMENTED]` (blog) No ghost-of-previous-photo overlay documented.

**7. Privacy model.** **Cloud** (Trainerize is "cloud-based," accessible
"anytime, anywhere"). `[DOCUMENTED]` Trainerize positions itself as a **data
processor**; the gym/trainer is the controller of client data. `[DOCUMENTED]`
(https://www.trainerize.com/privacy/) GDPR-compliant for EEA/UK users, but
**progress photos have no documented self-serve export** and structured export
is among the most limited of the majors. `[OBSERVED]`
(https://assistantcoach.fit/blog/data-portability-fitness-coaching-software/)
Card data is AES-256 on Stripe; **no published encryption standard for the
progress photos themselves.** `[OBSERVED]` (search of security docs)

**8. WHAT WORKS vs WHAT DOESN'T.**
- Works: one-tap side-by-side + export; guiding lines genuinely help alignment;
  scheduled photo milestones drive the habit; front/side/back is a clean mental
  model. `[OBSERVED]`
- Doesn't: iOS-only guiding lines; no desktop compare; a display bug where "the
  phone displays 30 progress photos even if there is only 3"; dated/cluttered
  UI; sluggish loading and freezes. `[OBSERVED]`
  (https://www.softwareadvice.com/fitness/trainerize-profile/reviews/,
  justuseapp.com)

**9. RETAIN vs CHURN.** Coaches retain for the all-in-one profile ("love the
ability to track workouts, body stats, and progress photos"). `[OBSERVED]`
Churn drivers around photos: the phantom-photo bug, no desktop compare, and
**privacy discomfort** (see 11). `[OBSERVED]`

**10. WHAT USERS VALUE MOST.** "Being able to see the body composition side by
side photos" and downloading that comparison in one step. `[OBSERVED]`
(ptpioneer review)

**11. Body-image / ED complaints.** The most instructive finding in this whole
report is a Trainerize idea-forum thread, *"disable trainers ability to see
clients progress photos."* Verbatim: it is *"very intrusive [to] get access to
the private pictures of the students,"* *"many students don't post their
progress pictures"* because of it, *"a female client would just forgo using the
progress photos option because of her insecurity with the situation,"* and it
should be *"made more clear to clients that trainers can see the photos they
post... an incredibly important privacy issue."* Trainerize marked it **"Not
Right Now."** `[OBSERVED]`
(https://ideas.trainerize.com/forums/167887-coach-trainer-abc-trainerize/suggestions/39112192)
The whole design assumes an evaluating audience, and users feel it.

**12. Monetisation / gating.** Photos ship on the base subscription; the
*nutrition* layer is the paywall (Advanced Nutrition $20–45/mo by client tier).
`[OBSERVED]` (https://www.quickcoach.fit/trainerize-pricing-2026.html) Photos
are a retention/marketing lever, not a direct paywall.

**13. Verdict (confidence: HIGH).** The reference implementation for "snap 3
poses → align with guides → swipe side-by-side → export before/after." Mature
and habit-driving, but built entirely around **coach surveillance and
transformation-marketing** — the forum thread is a flashing warning light for
an ED-safe app. Steal the guided-capture and the pose model; reject the
audience, the export-as-marketing framing, and the "before/after" language.

---

## 2. TRUECOACH (Xplor TrueCoach)

Premium 1:1 coaching platform, strong on video/form review.

**1. Capture.** Client goes Account tab → Progress Pictures → camera icon →
"select a photo from your camera roll or take a photo from directly within the
app." `[DOCUMENTED]`
(https://help.truecoach.co/en/articles/6812443-client-uploading-progress-pictures)

**2. Auto-dating.** A **calendar/date section** lets clients "upload any
previous progress pictures" and "swipe left or right to navigate back and forth
between the months." **One set per calendar day** — "Once you have uploaded a
progress photo set for the day, you will not be able to upload another... for
the same date." `[DOCUMENTED]` (same)

**3. Labelling / metadata.** Three poses per set: front / side / back. No
free-form tags or on-photo bodyweight documented; metrics live separately.
`[DOCUMENTED]` (same)

**4. Organisation.** Grouped into dated **sets**; toggle between the aggregate
comparison view and per-set view via "the arrow icon in the top right-hand
corner to change to the set view." `[DOCUMENTED]` (same)

**5. COMPARISON.** A **"'then' and 'now' view which displays the awesome
progress you've been making"** once multiple sets exist. `[DOCUMENTED]` (same)
So: two-endpoint then/now, plus a per-set browser. The copy ("awesome
progress") is celebratory/transformation-framed. `[OBSERVED]`

**6. Consistency aids.** **None documented** — no guiding lines or ghost
overlay at capture. Consistency is left to the client. `[INFERRED]`

**7. Privacy model.** Cloud; photos are explicitly *"for your coach to
review."* `[DOCUMENTED]` Apple's label note: privacy practices "may include
handling of data... not been verified by [Apple]." `[OBSERVED]`
(https://apps.apple.com/us/app/truecoach/id1439127794) No client-facing
private/hidden-photo control documented.

**8. WHAT WORKS vs WHAT DOESN'T.**
- Works: clean date calendar with backdating; one-set-per-day prevents
  clutter; then/now is dead simple; strong video-review culture around the
  same media pipeline. `[OBSERVED]`
- Doesn't: no capture guides; recent redesign "flooding the user with stimuli,
  buttons and options," clients "confused about how to read or navigate";
  video-upload glitches and crashes. `[OBSERVED]`
  (https://www.ptpioneer.com/personal-training/tools/truecoach-review/)

**9. RETAIN vs CHURN.** Retains coaches who value async video+photo review in
one profile. `[OBSERVED]` Churn: post-redesign complexity and reliability.
`[OBSERVED]`

**10. WHAT USERS VALUE MOST.** The single client profile combining "body
metrics, progress photos, workout completion... and compliance rates" —
everything in one place. `[OBSERVED]` (promealplan review)

**11. Body-image / ED complaints.** No TrueCoach-specific ED thread surfaced,
but the same structural risk applies: photo = evidence submitted for a coach's
judgement, with no private mode. `[INFERRED]`

**12. Monetisation / gating.** Photos are part of the core coach subscription
(priced per client), not separately gated. `[OBSERVED]`

**13. Verdict (confidence: MEDIUM-HIGH).** Cleanest *dating* model in the set
(calendar + one-set-per-day + backdate). Steal the calendar/backdate and the
per-day dedupe. Avoid the "awesome progress" celebration copy and the
no-private-mode assumption.

---

## 3. EVERFIT

Fast-moving coaching platform; the most flexible *tagging + metric* model here.

**1. Capture.** "+ Add" in the Progress Photo section; drag-drop or file pick;
**up to 10 photos at once**. Clients "have the same function so [they] submit
photos directly through the app." `[DOCUMENTED]`
(https://help.everfit.io/en/articles/2836175-progress-photos)

**2. Auto-dating.** "Select the date it was taken from the calendar." Stored
chronologically. `[DOCUMENTED]` (same)

**3. Labelling / metadata.** **Four tags** — "front," "left," "right," "back"
(note the left/right split, richer than the usual single "side"). Tags editable
from mobile. Per-batch **Weight and Body Fat** entry, displayed "top right
corner" on view; "Any edited value will be applied to all photos uploaded
within the same batch." `[DOCUMENTED]` (same)

**4. Organisation.** Chronological with tag-based sorting; weight/BF shown
alongside. `[DOCUMENTED]` (same)

**5. COMPARISON.** Manual side-by-side: pick two, **"easily drag and drop them
to arrange"**, hover for a **zoom** control, "adjust the photo ratio and move
the photo around when it's zoomed in." `[DOCUMENTED]` (same) More manual and
tactile than Trainerize's swipe; no aligned overlay. Competitors note Everfit
"doesn't match" Kahunas' layered overlay. `[OBSERVED]`
(https://hevycoach.com/compare/everfit/)

**6. Consistency aids.** **None documented** at capture (no guides/ghost).
`[INFERRED]`

**7. Privacy model.** Cloud; both coach and client access. No documented
client-side private mode or photo-specific encryption. `[OBSERVED]`

**8. WHAT WORKS vs WHAT DOESN'T.**
- Works: left/right tag granularity; batch weight/BF; zoom-and-reposition in
  compare; bulk upload; frequent updates praised by coaches. `[OBSERVED]`
- Doesn't: messenger "stuck" messages; "crashes frequently, almost every time";
  slow login; no capture guidance. `[OBSERVED]`
  (https://apps.apple.com/us/app/everfit-for-coach/id1485827117?see-all=reviews)

**9. RETAIN vs CHURN.** Retains on breadth + responsive devs; churns on
messenger bugs and crashes. `[OBSERVED]`

**10. WHAT USERS VALUE MOST.** All-in-one convenience — "workouts, guidance,
progress tracking, communication... looks great and is simple to use."
`[OBSERVED]` (search of client reviews)

**11. Body-image / ED complaints.** None Everfit-specific surfaced; structural
risk identical (photo-for-coach). `[INFERRED]`

**12. Monetisation / gating.** Coach subscription tiers; photos included, not a
standalone paywall. `[OBSERVED]`

**13. Verdict (confidence: MEDIUM-HIGH).** Best **metadata** model: left/right
tags and per-photo weight/BF. For VOLYUME, the *left/right* granularity is worth
stealing (physique users care about asymmetry); the batch weight/BF-on-photo is
a **direct conflict** with the share-card rule and must never be burned into an
exportable image.

---

## 4. KAHUNAS

Coaching platform popular with bodybuilders/physique coaches (14,000+ coaches,
750k+ end users claimed); the only mainstream one with a true **aligned
overlay**. `[DOCUMENTED]` (https://kahunas.io/)

**1. Capture.** Clients upload photos **inside a check-in form** (if the coach
added an upload field) or send them "directly through the chat in the app."
`[DOCUMENTED]`
(https://help.kahunas.io/en/articles/76-how-can-clients-share-progress-photos-on-kahunas)

**2. Auto-dating.** Tied to the check-in date; clients (or coaches, via client
view) can **backdate** by attaching previous photos to an earlier check-in.
`[DOCUMENTED]`
(https://help.kahunas.io/en/articles/79-is-it-possible-to-add-in-progress-pictures-clients-have-sent-previously)

**3. Labelling / metadata.** Front and side views feed the overlay; check-in
form carries the surrounding metrics (weight, notes). `[DOCUMENTED]`

**4. Organisation.** Organised by **check-in**, not a standalone gallery — the
photo is one field in a weekly check-in record. `[OBSERVED]`
(https://help.kahunas.io/en/articles/240)

**5. COMPARISON — the standout.** **Progress Overlay**: "compare client photos
instantly... with just a click," with **"front and side views layered on top of
each other to show change over time."** `[DOCUMENTED]`
(https://www.promealplan.com/en/blog/kahunas-review-2026,
https://hevycoach.com/compare/everfit/) This is the one **aligned-overlay /
onion-skin** interaction in the mainstream set — genuinely different from
juxtaposed side-by-side, and the feature reviewers single out as Kahunas' edge.

**6. Consistency aids.** The overlay itself doubles as an *alignment aid at
review*; no documented ghost-guide *at capture*. `[INFERRED]`

**7. Privacy model.** Cloud, branded coach app; photos flow to the coach via
check-ins/chat. No client private mode documented. `[OBSERVED]`

**8. WHAT WORKS vs WHAT DOESN'T.**
- Works: the layered overlay is the most legible way to see subtle physique
  change; check-in integration keeps photo + weight + notes together.
  `[OBSERVED]`
- Doesn't: photos are buried inside check-in forms (no clean standalone
  timeline); weak meal-planning side of the app; overlay needs reasonably
  aligned inputs to read well. `[OBSERVED]`
  (https://www.promealplan.com/en/blog/kahunas-review-2026)

**9. RETAIN vs CHURN.** Physique coaches retain specifically for the overlay +
check-in workflow. `[OBSERVED]` Churn on breadth gaps (nutrition). `[OBSERVED]`

**10. WHAT USERS VALUE MOST.** The instant overlay transformation view —
"highlighting every milestone and keeping your clients motivated." `[DOCUMENTED]`

**11. Body-image / ED complaints.** None Kahunas-specific surfaced. The overlay
is powerful and therefore double-edged: an aligned overlay makes *tiny* changes
vivid, which for a vulnerable user can intensify scrutiny. `[INFERRED]`

**12. Monetisation / gating.** Coach SaaS; overlay is a platform feature, not a
per-feature paywall. `[OBSERVED]`

**13. Verdict (confidence: MEDIUM).** The **interaction to steal is the aligned
overlay** — the single most physique-legible comparison in the mainstream set,
and closest to VOLYUME's "calm observe two shots" ideal (no juxtaposed
before/after drama, just one body fading to a later self). Implement it calmly:
neutral "earlier/later + date," opt-in, private. Avoid the check-in-form
burial and the "motivation/milestone" framing.

---

## 5. PT DISTINCTION

Long-standing UK coaching platform, deep customisation.

**1. Capture.** Clients upload progress photos and circumference measurements in
the **logbook**; coaches can show/hide the Progress Photos module per client.
`[DOCUMENTED]`
(https://www.ptdistinction.com/learning-centre/ptd-flow/how-to-add-or-remove-the-food-diary-and-progress-photos)

**2. Auto-dating.** Logbook-dated entries; chronological. `[OBSERVED]`
(https://www.ptdistinction.com/features)

**3. Labelling / metadata.** Photos sit alongside measurements and body-fat %
in the same tracking record. `[DOCUMENTED]` No rigid pose taxonomy documented.
`[INFERRED]`

**4. Organisation.** Per-client progress record combining photos, measurements,
body-fat. `[OBSERVED]`

**5. COMPARISON.** "Use the compare feature to see the ones you want side by
side" — coach-selected, juxtaposed. `[OBSERVED]`
(https://mypersonaltrainerwebsite.com/blog/pt-distinction-review) No overlay or
slider documented.

**6. Consistency aids.** None documented. `[INFERRED]`

**7. Privacy model.** Cloud; UK-based vendor; per-client module visibility toggle
is a mild privacy/control lever (coach can *hide* the module) but not a client
private mode. `[OBSERVED]`

**8. WHAT WORKS vs WHAT DOESN'T.**
- Works: deep customisation; module can be switched off entirely; photos +
  measurements + body-fat in one record. `[OBSERVED]`
- Doesn't: dated UI; comparison is basic juxtaposition; no capture guidance.
  `[OBSERVED]` (institute/ptpioneer reviews)

**9. RETAIN vs CHURN.** Retains power-user coaches for flexibility; churns on
UX modernity. `[OBSERVED]`

**10. WHAT USERS VALUE MOST.** Configurability — turn features on/off per
client. `[OBSERVED]`

**11. Body-image / ED complaints.** None specific surfaced. `[INFERRED]`

**12. Monetisation / gating.** Coach SaaS tiers; photos included. `[OBSERVED]`

**13. Verdict (confidence: LOW-MEDIUM).** Documentation-thin on the photo
interaction. The one transferable idea: **the module can be fully switched off**
— i.e. photos as *optional*, not assumed. VOLYUME should make photos entirely
opt-in in the same spirit (but as a *user* choice, not a coach's).

---

## 6. MY PT HUB

Large UK coaching platform; strong check-in comparison and the best public
guidance on **capture consistency**.

**1. Capture.** Client → Progress Photos → Upload; also flows in via automated
Check-Ins. `[DOCUMENTED]`
(https://support.mypthub.net/hc/en-us/articles/360031104974)

**2. Auto-dating.** Dated on upload; auto-synced from check-ins so "no data
gets lost." `[DOCUMENTED]` (https://www.mypthub.net/features/automated-client-check-ins/)

**3. Labelling / metadata.** Front / side / back guidance; photos stored under
**"Results"** alongside measurements, which "are automatically saved to the
client's main measurements and progress photo areas." `[DOCUMENTED]`

**4. Organisation.** Central "Results" area per client; check-in submissions
merge into it automatically. `[DOCUMENTED]`

**5. COMPARISON.** **Side-by-side check-in comparison**: "compare any two
check-ins... week-over-week, month-over-month, year-over-year," or "when your
client started versus where they're at now." `[DOCUMENTED]` Two-entry
juxtaposition keyed on time windows. `[OBSERVED]`

**6. Consistency aids — best-documented in the set (as *guidance*, not UI).**
My PT Hub publishes explicit capture rules: **same time of day** ("Morning is
ideal... body isn't affected by food or water intake"), **natural daylight**
("Stand facing a window... avoid shadows"), **camera at chest level and
perpendicular** ("to prevent distortions"), **full body head-to-toe, no
cropping**, **same fitted clothing every session**, and "Avoid flexing unless
taking dedicated flexed photos." `[DOCUMENTED]`
(https://www.mypthub.net/blog/the-ultimate-guide-to-progress-pics/) These are
*written tips*, **not** an in-app ghost overlay — a gap VOLYUME can beat.

**7. Privacy model.** Cloud; photos stored under client profile for coach
review; no client private mode documented. `[OBSERVED]`

**8. WHAT WORKS vs WHAT DOESN'T.**
- Works: flexible date-range comparison; auto-merge of check-in photos into one
  Results area; genuinely good consistency guidance. `[OBSERVED]`
- Doesn't: guidance is prose the client must remember, not enforced at capture;
  standard cloud/coach-review privacy posture. `[INFERRED]`

**9. RETAIN vs CHURN.** Retains on check-in automation; general platform churn
drivers. `[OBSERVED]`

**10. WHAT USERS VALUE MOST.** "Compare... week-over-week... day one versus now"
in the coaching conversation. `[DOCUMENTED]`

**11. Body-image / ED complaints.** None specific surfaced. The "day one vs now"
framing is transformation-centric. `[INFERRED]`

**12. Monetisation / gating.** Coach SaaS; photos included. `[OBSERVED]`

**13. Verdict (confidence: MEDIUM).** Steal the **consistency checklist** and,
crucially, **turn its prose into a capture-time aid** (ghost overlay + chest-
level guide + same-time reminder) that these platforms only *describe*. Steal
the flexible time-range pairing; keep the copy neutral ("earlier / later"), not
"day one vs now."

---

## 7. COACHRX (by OPEX Fitness)

Coaching platform with a "beyond the numbers" philosophy.

**1. Capture.** Clients "upload progress pictures for your coach to review"
inside the client app profile. `[DOCUMENTED]`
(https://www.coachrx.app/articles/coachrx-client-mobile-app-walkthrough...)

**2. Auto-dating.** Stored in the personal profile/hub with metrics; dating
implied, not detailed. `[INFERRED]`

**3. Labelling / metadata.** Photos pair with metrics for "a holistic view";
**no documented pose taxonomy, dating badges, or on-photo bodyweight.**
`[DOCUMENTED]` (walkthrough is explicit that it "doesn't detail specific
features for pose standardization, dating stamps, labeling systems, or
before-and-after comparison tools")

**4. Organisation.** Under the profile "See All → metrics, progress pictures,
and more." `[DOCUMENTED]`

**5. COMPARISON.** **No dedicated before/after or overlay tool documented.**
Photos support the metric/check-in narrative rather than a comparison UI.
`[DOCUMENTED]`

**6. Consistency aids.** None documented. `[INFERRED]`

**7. Privacy model.** Cloud; "for your coach to review." Walkthrough explicitly
"doesn't address privacy settings, data retention... or whether progress photos
are encrypted." `[DOCUMENTED]`

**8. WHAT WORKS vs WHAT DOESN'T.**
- Works: photos framed as *context* for a coaching dialogue, not a
  scoreboard — "Numbers don't always tell the full story"; weekly check-ins
  reinforce conversation. `[DOCUMENTED]`
- Doesn't: thin photo tooling (no compare, no poses, no guides); privacy
  unspecified. `[OBSERVED]`

**9. RETAIN vs CHURN.** Retains OPEX-aligned coaches for the coaching
philosophy; photo tooling is not a differentiator. `[OBSERVED]`

**10. WHAT USERS VALUE MOST.** The holistic, conversation-first framing.
`[DOCUMENTED]`

**11. Body-image / ED complaints.** None specific; the *de-emphasised,
context-not-scoreboard* framing is the most ED-adjacent-friendly posture in
this set. `[INFERRED]`

**12. Monetisation / gating.** Coach SaaS; photos included. `[OBSERVED]`

**13. Verdict (confidence: LOW-MEDIUM).** Thin on features but philosophically
the closest to calm — **photo as one input among many, not the trophy.**
That *framing* is worth stealing even though the tooling isn't.

---

## 8. COMPETITION-PREP TOOLS (cluster: StageLab, PosePro, Bodybuilding AI, plus custom prep-coach apps)

Purpose-built for physique competitors. This cluster is where photos get the
most *clinical* ("conditioning check") and the most *high-stakes* (peak week,
stage-ready judgement) — the emotional intensity is highest here, so it is the
single most important cluster for ED-safety cautionary lessons. **Note the AI
dependence: these tools lean heavily on AI analysis, which VOLYUME's
constitution forbids outright.** `[INFERRED]`

### 8a. StageLab
**Capture/Comparison.** "AI-powered competition prep coach"; users "Submit
visual check-ins," get **"Visual check-in analysis," "Historical progress
comparisons," and trend tracking**, all **"division-aware"** (bodybuilding,
classic/men's physique, bikini, wellness, figure). `[DOCUMENTED]`
(https://apps.apple.com/us/app/stagelab-competition-prep/id6764351799)
**Privacy.** Email is linked to identity; "Fitness" and "Photos or Videos" are
collected **"not linked to your identity"** for analytics/personalisation — i.e.
**cloud + AI processing of physique photos.** `[DOCUMENTED]`
**Monetisation.** Athlete Pro $12.99/mo or $99/yr; Coach Pro $49/mo or $449/yr.
`[DOCUMENTED]` **Reviews.** Only "1 Rating," 5.0 — too new to judge. `[OBSERVED]`

### 8b. PosePro
The world's-first **posing** app (not primarily a photo gallery): all 8
mandatory poses + quarter turns, **voice callouts** simulating a competition,
user-set hold intervals, division-specific (BB/Figure/Bikini/Men's Physique),
and **AI-generated session summaries with corrections**. `[DOCUMENTED]`
(http://www.poseproapp.com/, https://www.posepro.app/) **Relevance to VOLYUME:**
this is the *consistency-of-pose* problem solved from the other direction —
teaching the pose itself. The **transferable, AI-free idea is a reference-pose
overlay / posing guide at capture**, minus the AI critique. `[INFERRED]`

### 8c. Bodybuilding AI: Coach
"Set targets for measurements, body composition, or competition dates and track
progress with **photos and metrics**"; plus AI video form analysis and an AI
chat coach ("Coach Arnold"). Weekly / yearly / lifetime IAP. `[DOCUMENTED]`
(https://apps.apple.com/us/app/bodybuilding-ai-coach/id6760506099) Photos are a
**goal-tracking substrate feeding an AI**, not a calm gallery. `[INFERRED]`

### 8d. Custom prep-coach apps (Trainerize/Kahunas white-label + bespoke)
Most pro contest-prep coaches run weekly **photo + weight + posing-video**
check-ins through Trainerize or Kahunas branded apps, or bespoke software, with
**coach video/photo feedback** on mandatory poses. `[OBSERVED]`
(julielohre.com, proprepcoaching.com, various prep-coach sites) So the prep
world mostly inherits §1/§4's tooling, wrapped in a higher-stakes weekly
judgement ritual.

**Cluster teardown (shared).**
- **Auto-dating/organisation:** by check-in week / countdown-to-show; timeline
  reads as "weeks out." `[OBSERVED]`
- **Labelling:** division-aware pose sets (front double-bi, side chest, back,
  quarter turns) — richer than 3-pose. `[DOCUMENTED]`
- **Consistency aids:** posing apps enforce *the pose*; photo apps still rarely
  offer capture ghosting. `[INFERRED]`
- **Privacy:** cloud + increasingly **AI analysis of physique photos** —
  the most sensitive data handled the least conservatively. `[DOCUMENTED]`
- **What works:** division-specific pose logic; countdown framing suits an
  event; posing simulation is genuinely useful. `[OBSERVED]`
- **What doesn't / ED risk:** peak-week photo scrutiny is *inherently*
  high-anxiety; AI "conditioning analysis" turns your body into a scored
  object; contest-prep populations have documented elevated ED/body-dysmorphia
  risk. `[INFERRED]` (and see general literature in §Patterns)
- **Monetisation:** athlete subscriptions ($10–13/mo typical) + coach tiers.
  `[DOCUMENTED]`
- **Verdict (confidence: MEDIUM):** Steal the **division-aware pose sets** and
  the **reference-pose overlay** idea. Reject wholesale: AI physique scoring
  (constitutionally banned), countdown/"weeks out" urgency, and any
  "conditioning grade." This cluster is the clearest picture of what an
  ED-safe app must *not* become.

---

## PATTERNS ACROSS THIS SET

1. **Photo = evidence for an evaluator.** Every mainstream tool assumes a coach
   on the other end. The photo's job is to be *judged*. VOLYUME has no coach —
   so it can (must) reframe the photo as a **private observation**, which is a
   genuine, defensible product difference, not a missing feature. `[INFERRED]`

2. **Three poses is the near-universal taxonomy** (front/side/back), Everfit's
   front/left/right/back being the useful richer variant, prep apps going
   division-specific. A small fixed pose set is the right primitive. `[OBSERVED]`

3. **Comparison converges on juxtaposed side-by-side + export.** Only **Kahunas
   offers a true aligned overlay**; TrueCoach's "then/now" is the two-endpoint
   pattern. Sliders are absent here (they live in the consumer apps of file M1).
   The overlay is the most physique-legible *and* the calmest — no
   "before→after" reveal, just one body dissolving into a later self.
   `[OBSERVED]`

4. **Consistency is documentation, not tooling.** My PT Hub writes an excellent
   checklist (same time, daylight, chest-level, same clothing); Trainerize's
   iOS guiding lines are the only in-capture aid; **nobody ships a ghost/onion-
   skin alignment overlay at capture.** This is the biggest open craft gap and
   VOLYUME's clearest opportunity to lead. `[OBSERVED]`

5. **Privacy is an afterthought, and users notice.** Cloud storage, coach
   visibility by default, **no documented photo encryption**, limited/absent
   export, and no client "private mode." The Trainerize forum thread proves real
   users — especially women — *silently opt out* over exactly this. On-device +
   private-by-default is a real, felt differentiator. `[OBSERVED]`

6. **Framing skews to "transformation/marketing."** "Your next marketing
   image," "awesome progress," "day one vs now," milestone motivation. This is
   the exact tone the ED-safety constitution forbids. `[OBSERVED]`

7. **The literature backs the caution.** Diet/fitness apps are associated with
   disordered-eating symptoms and body-image concerns, especially when used for
   body-image reasons and when they *gamify* the body; guilt/shame from red
   "over budget" cues and self-competition are documented harms. Photos are the
   most body-focused surface of all. `[DOCUMENTED]`
   (https://pmc.ncbi.nlm.nih.gov/articles/PMC8485346/,
   https://www.center4research.org/fitness-tracking-apps-eating-disorders/,
   https://news.flinders.edu.au/blog/2025/02/22/fitness-apps-fuelling-disordered-eating/)

8. **Photos are rarely the paywall; they're the retention hook.** Nutrition/
   advanced modules are gated; photos ship in the base coach product because
   they drive engagement and marketing. `[OBSERVED]`

---

## STEAL / AVOID — for a calm, ED-safe, on-device app

**STEAL**
- **Aligned overlay comparison (Kahunas)** as the *primary* calm interaction:
  one body fading into a later self, labelled neutrally ("earlier / later +
  date"), never "before → after." Physique-legible without the reveal-drama.
- **A small fixed pose set**, front/side/back with **left/right split (Everfit)**
  for asymmetry-aware users — as gentle *slots*, not required fields.
- **A clean date model (TrueCoach):** calendar, backdating, **one set per day**
  to prevent obsessive re-shooting.
- **My PT Hub's consistency checklist turned into in-capture tooling** that no
  one ships: **ghost/onion-skin overlay of the last shot**, a chest-level /
  perpendicular framing guide, and a gentle "same time of day, similar light"
  reminder. This is the open lead.
- **CoachRx's framing:** photo as *one context input, not the trophy* —
  de-emphasised, optional, never a score.
- **PT Distinction's "module can be fully switched off":** photos entirely
  opt-in; the feature is invisible unless the user chooses it.
- **Prep apps' division-aware reference poses** — but only as an **AI-free**
  static reference-pose overlay/guide, never AI critique.

**AVOID**
- **Any coach/audience/surveillance framing.** No "submit for review," no
  "share your transformation." The user is the only viewer. (Trainerize forum
  thread is the cautionary tale.)
- **"Before/after," "day one vs now," "awesome progress," milestone/motivation,
  countdown/"weeks out"** copy — all transformation-hype the constitution bans.
- **Bodyweight / body-fat / measurements burned onto the photo** (Everfit does
  this) — direct conflict with the share-card rule; never on an exportable
  image.
- **Export-as-marketing-image** as a first-class action. Sharing is a distant,
  stripped, opt-in secondary at most.
- **AI physique analysis / "conditioning grading" / pose critique** (StageLab,
  Bodybuilding AI, PosePro) — constitutionally forbidden (no AI, ever) *and* an
  ED-risk pattern (body-as-scored-object).
- **Cloud-by-default with coach visibility and no private mode.** VOLYUME's
  on-device SQLCipher store is the opposite and the selling point; photos must
  stay on-device, encrypted, single-viewer, with no silent upload.
- **Streaks/scores/gamification on photos**, red/negative visualisations, and
  any nudge that turns the body into a target to beat.

---

## SOURCES

Trainerize
- https://www.trainerize.com/blog/simple-collaborative-photo-friendly-trainerize/
- https://www.trainerize.com/blog/story/motivate-clients-using-photos-body-stats-video/
- https://ideas.trainerize.com/forums/167887-coach-trainer-abc-trainerize/suggestions/39112192-disable-trainers-ability-to-see-clients-progress-p
- https://ideas.trainerize.com/forums/167887-coach-trainer-abc-trainerize/suggestions/37696717
- https://www.trainerize.com/privacy/
- https://www.ptpioneer.com/personal-training/tools/trainerize-review/
- https://www.softwareadvice.com/fitness/trainerize-profile/reviews/
- https://www.quickcoach.fit/trainerize-pricing-2026.html
- https://assistantcoach.fit/blog/data-portability-fitness-coaching-software/

TrueCoach
- https://help.truecoach.co/en/articles/6812443-client-uploading-progress-pictures
- https://truecoach.co/features/progress-tracking/
- https://www.ptpioneer.com/personal-training/tools/truecoach-review/
- https://www.promealplan.com/en/blog/truecoach-review-2026
- https://apps.apple.com/us/app/truecoach/id1439127794

Everfit
- https://help.everfit.io/en/articles/2836175-progress-photos
- https://hevycoach.com/compare/everfit/
- https://apps.apple.com/us/app/everfit-for-coach/id1485827117?see-all=reviews
- https://www.promealplan.com/en/blog/everfit-review-2026

Kahunas
- https://kahunas.io/
- https://help.kahunas.io/en/articles/76-how-can-clients-share-progress-photos-on-kahunas
- https://help.kahunas.io/en/articles/79-is-it-possible-to-add-in-progress-pictures-clients-have-sent-previously
- https://help.kahunas.io/en/articles/240-how-to-navigate-the-new-check-in-dashboard
- https://www.promealplan.com/en/blog/kahunas-review-2026

PT Distinction
- https://www.ptdistinction.com/learning-centre/ptd-flow/how-to-add-or-remove-the-food-diary-and-progress-photos
- https://www.ptdistinction.com/features
- https://mypersonaltrainerwebsite.com/blog/pt-distinction-review

My PT Hub
- https://support.mypthub.net/hc/en-us/articles/360031104974-Client-Update-view-Progress-photos
- https://www.mypthub.net/features/automated-client-check-ins/
- https://www.mypthub.net/blog/the-ultimate-guide-to-progress-pics/

CoachRx
- https://www.coachrx.app/articles/coachrx-client-mobile-app-walkthrough-a-complete-guide-for-you-your-clientscoachrx-client-mobile-app-walkthrough-a-complete-guide-for-you-your-clients
- https://apps.apple.com/us/app/coachrx-by-opex-fitness/id1544150077

Competition-prep tools
- https://apps.apple.com/us/app/stagelab-competition-prep/id6764351799
- http://www.poseproapp.com/
- https://www.posepro.app/
- https://apps.apple.com/us/app/bodybuilding-ai-coach/id6760506099
- https://julielohre.com/figure-competition-and-bikini-competition-training/
- https://proprepcoaching.com/

Body-image / ED literature
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8485346/
- https://www.center4research.org/fitness-tracking-apps-eating-disorders/
- https://www.sciencedirect.com/science/article/pii/S174014452400158X
- https://news.flinders.edu.au/blog/2025/02/22/fitness-apps-fuelling-disordered-eating/
