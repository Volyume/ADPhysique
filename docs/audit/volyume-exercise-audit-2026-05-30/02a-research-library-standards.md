# Research: what makes a complete, well-structured exercise library

Audit date: 2026-05-30. Scope: live web research into what a
hypertrophy-focused training app needs in its exercise library:
size, coverage, taxonomy, per-subregion exercise selection, and a
full commercial-gym machine inventory. Every claim has a source URL
inline or grouped at the end of its section.

---

## 1. Library size and coverage in leading apps

How big the catalogues actually are, and what each one does to make
the library usable rather than just large.

### Hevy

- Hevy ships a curated library of 400+ built-in exercises, plus
  unlimited custom exercises that users add themselves.
  https://www.hevyapp.com/features/exercise-library/
  https://help.hevyapp.com/hc/en-us/articles/35688251991575-Hevy-Exercise-Library-400-Exercises-and-Custom-Exercises
- The library is filterable by two primary axes: equipment and
  muscle target, plus a free-text search. You add results straight
  into a routine (a reusable template) or a live workout.
  https://www.hevyapp.com/features/exercise-library/
- Each exercise carries category tags (muscle group, equipment,
  movement type) and short instructional notes, which is what makes
  400 entries navigable rather than a flat list.
  https://www.hevyapp.com/features/exercise-library/

Takeaway: Hevy proves that ~400 well-tagged movements plus a custom
slot is enough for a general tracker. The number is less important
than the two-axis filter (muscle x equipment) and per-exercise
attributes.

### Strong

- Strong markets a "massive library" with categorised browsing
  (thumbnail tiles), supersets, auto rest timers, and user-added
  custom exercises that you can categorise yourself.
  https://www.strong.app/
  https://help.strongapp.io/category/96-exercises
- Equipment association per exercise (barbell, dumbbell, machine,
  bodyweight, etc.) is the organising attribute, same pattern as
  Hevy.
  https://help.strongapp.io/category/96-exercises

### RP Hypertrophy

- RP is a programming app first, library second. It ships 250+
  technique videos for its built-in movements and lets you swap in
  custom exercises, though user-added ones lack the demo video and
  the per-exercise "feel" data the native ones have.
  https://rpstrength.com/pages/hypertrophy-app
  https://dr-muscle.com/rp-hypertrophy-app-critique/
- The library is wired to the Meso Builder: you tell it which
  muscle groups to prioritise and it assembles the programme from
  the tagged catalogue, so every exercise must carry a clean
  primary-muscle tag for the auto-builder to work.
  https://rpstrength.com/pages/hypertrophy-app
- 45+ premade plans plus a custom meso builder sit on top of the
  library, letting users target upper, lower, or specific muscles.
  https://rpstrength.com/pages/hypertrophy-app

Takeaway: RP shows that if the app auto-programmes, the library's
muscle-group and equipment tags become load-bearing data, not just
search filters.

### Boostcamp

- Boostcamp is programme-led: 130+ coach programmes and 11,000+
  community programmes, but a deliberately small native exercise
  guide set (30+ guides with muscle diagrams and video demos).
  https://www.boostcamp.app/
  https://www.boostcamp.app/free-workout-app
  https://www.boostcamp.app/exercises
- Custom exercises exist but free accounts are capped (around 3
  custom additions) until Pro.
  https://play.google.com/store/apps/details?id=com.bpmhealth.boostcamp

Takeaway: Boostcamp is the counter-example: a thin native library
works only because the value is in the programmes, not the catalogue.
A hypertrophy app that lets users build their own training cannot
rely on this model.

### ExRx.net (the reference standard)

- ExRx.net is the long-standing professional reference (online since
  1999) and carries over 2,100 exercises, each with a demo image or
  video, instructions, and metadata (force type, mechanics,
  apparatus).
  https://exrx.net/Lists/Directory
- The directory is organised by body region: Shoulders, Upper Arms,
  Forearms, Back, Chest, Waist, Hips, Thighs, Calves, with
  muscle-specific subfolders under each.
  https://exrx.net/Lists/Directory

Takeaway: ExRx is the ceiling. 2,100 entries is overkill for an app,
but its region -> muscle -> exercise hierarchy and its formal
classification system (next section) are the model to copy.

### What "comprehensive and well-structured" means in practice

Across all five, the comprehensiveness comes from structure, not raw
count:

1. Two-axis filtering: muscle target x equipment (every app does
   this).
2. Per-exercise attributes: primary/secondary muscle, equipment,
   movement type/mechanics, force direction, plus a demo and short
   instructions.
3. A region -> muscle -> subregion hierarchy so a user can drill from
   "back" to "lats" to a specific vertical pull.
4. A custom-exercise escape hatch, because no fixed list covers every
   gym's machines.

A practical target for a hypertrophy app: roughly 400-600 native,
well-tagged movements (Hevy/Strong territory) covering every muscle
subregion across every common equipment type, plus custom exercises.
That is enough to never leave a subregion or a machine uncovered
without bloating the picker.

Section sources:
https://www.hevyapp.com/features/exercise-library/ ,
https://help.hevyapp.com/hc/en-us/articles/35688251991575-Hevy-Exercise-Library-400-Exercises-and-Custom-Exercises ,
https://www.strong.app/ , https://help.strongapp.io/category/96-exercises ,
https://rpstrength.com/pages/hypertrophy-app ,
https://dr-muscle.com/rp-hypertrophy-app-critique/ ,
https://www.boostcamp.app/free-workout-app ,
https://www.boostcamp.app/exercises ,
https://exrx.net/Lists/Directory

---

## 2. Standard exercise taxonomy used by coaches and scientists

Two classification systems coexist. A hypertrophy app needs both: the
ExRx-style attribute model for tagging, and the movement-pattern model
for balance and programme structure.

### 2a. The ExRx classification model (attribute-based)

ExRx classifies every exercise on six independent axes:

- Utility: the exercise's role, e.g. Basic (compound, foundational),
  Auxiliary (isolation/assistance), plus Stretch and Plyometric
  categories.
- Mechanics: Compound (multi-joint) vs Isolation (single-joint).
- Force: Push, Pull, or Static.
- Lateral pattern: bilateral vs unilateral / lateral movement.
- Target muscle group (the body-region hierarchy).
- Apparatus: the equipment used.

Bodybuilding, physique and physical-therapy work tend to be
muscle-group focused (the main ExRx directory). Sports and functional
training tend to be movement-pattern focused. A hypertrophy app sits
in the first camp but should still carry the movement-pattern tag.
https://exrx.net/Questions/ExerciseClassAnalyses

### 2b. Movement-pattern classification (coach model)

The widely taught set of fundamental human movement patterns, used for
programme balance and to avoid over/under-training a pattern:

- Squat (knee-dominant): squat, leg press, hack squat.
- Hip hinge (hip-dominant): deadlift, Romanian deadlift, kettlebell
  swing, hip thrust.
- Lunge (single-leg): lunge, split squat, step-up.
- Horizontal push: bench press, push-up, machine chest press.
- Vertical push: overhead press, machine shoulder press.
- Horizontal pull: row (barbell, dumbbell, cable, machine).
- Vertical pull: pull-up, chin-up, lat pulldown.
- Carry (loaded carry): farmer's carry, suitcase carry.
- Rotation / anti-rotation (core): chops, Pallof press.

Sources commonly list 6-8 patterns; the push and pull each split into
horizontal and vertical, and isolation work sits outside the pattern
set as single-joint accessory movement.
https://www.jefit.com/wp/exercise-tips/the-movement-patterns-that-build-strength/ ,
https://barpathfitness.com/blog/eight-foundational-movement-patterns-to-include-in-your-training/ ,
https://strengthmatters.com/seven-fundamental-human-movements/

### 2c. Equipment categories

The full apparatus taxonomy a complete library should tag against,
combining ExRx's apparatus list with what commercial gyms actually
stock:

- Barbell (straight, EZ, trap/hex)
- Dumbbell
- Cable (single stack, dual / crossover, functional trainer)
- Machine, selectorised (pin-loaded weight stack)
- Machine, plate-loaded / iso-lateral (Hammer Strength style,
  independent left/right arms)
- Smith machine (fixed vertical/angled bar path)
- Bodyweight (and assisted-bodyweight via machine)
- Resistance bands
- Kettlebell
- Landmine (barbell anchored at one end)
- Plus minor: medicine ball, suspension trainer, sled.

ExRx's apparatus axis explicitly names Dumbbell, Barbell, Machine,
and others; the commercial-gym detail (selectorised vs plate-loaded
vs Smith vs cable) comes from the machine inventory in Section 4.
https://exrx.net/Questions/ExerciseClassAnalyses

The selectorised vs plate-loaded vs Smith vs cable distinction matters
for a hypertrophy app because they load the same movement pattern
differently (resistance curve, stabiliser demand, unilateral
capability), so they should be separate equipment tags, not merged
into one "machine" bucket.

### 2d. Anatomical subregion targeting

The convention coaches use: a muscle is not one tag. Most major
muscles have functional subregions or separate heads that respond to
different exercises and joint angles, and a complete library tags the
biased subregion per exercise (e.g. "chest - upper", "triceps - long
head", "hamstrings - distal/knee-flexion"). The evidence for each
subregion split is in Section 3.
https://exrx.net/Lists/Directory

---

## 3. Essential exercises per muscle group and subregion

For each major muscle, the subregions that need separate stimulus over
a week, the evidence they differ, and a concrete exercise list. The
recurring theme from the research: regional/head emphasis is real but
modest, so "cover each subregion with at least one biased exercise"
is the right rule, not "chase tiny isolation differences".

### Chest (pectoralis major)

Subregions: upper/clavicular, mid/sternal, lower/costal, plus
inner/outer emphasis from adduction range.

- Incline pressing raises clavicular (upper) head activation versus
  flat; EMG points to bench angles around 30-45 degrees, with ~30
  degrees giving the best blend of upper plus mid and steeper angles
  more upper-centric.
  https://mennohenselmans.com/this-is-the-perfect-press-angle-for-complete-chest-gains/ ,
  https://www.eu-opensci.org/index.php/sport/article/view/9255 ,
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7579505/
- Decline pressing biases the lower (sternocostal) head more than flat
  or incline.
  https://liftvault.com/exercises/decline-bench-press-alternatives/ ,
  https://www.barbellmedicine.com/blog/best-chest-exercises/
- Both flat and incline are needed to cover the whole muscle; one
  angle does not.
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7579505/

Recommended list:
- Upper: incline barbell/dumbbell press, incline machine press, low-to-
  high cable fly.
- Mid: flat barbell/dumbbell press, machine chest press, flat/pec-deck
  fly.
- Lower: decline press (barbell/dumbbell/machine), dip (chest-leaning),
  high-to-low cable fly.
- Inner/outer: cable crossover (full adduction for inner squeeze),
  wide-grip press and deep dumbbell fly for outer/stretch.

### Back

Subregions: lats (width, vertical pull), mid-back (rhomboids, mid
traps, thickness, horizontal pull), lower back (erectors), upper traps.

- Vertical pulls (lat pulldown, pull-up, chin-up) build lat width.
  https://megastarfitness.com/blogs/wiki/lat-pulldown-vs-seated-row-back-building ,
  https://strengthwarehouseusa.com/blogs/resources/lat-pulldown-vs-seated-row
- Horizontal rows (seated/barbell/dumbbell row) build mid-back
  thickness via rhomboids and mid traps; rows done without letting the
  scapula travel hit mid trap and rhomboid harder than pulldowns.
  https://learn.athleanx.com/articles/back-for-men/exercises-for-middle-traps ,
  https://www.onnit.com/blogs/the-edge/the-best-rhomboid-exercises-to-get-a-chiseled-back
- Face pulls bias scapular retractors (rhomboids, mid/lower traps) and
  rear delts.
  https://www.setforset.com/blogs/news/cable-back-exercises
- Both vertical and horizontal pulling are required for full back
  coverage.
  https://www.fitkituk.com/blog/seated-row-vs-lateral-pulldown-which-is-better/

Recommended list:
- Lats / width: lat pulldown (wide and neutral grip), pull-up/chin-up,
  straight-arm pulldown, single-arm dumbbell row.
- Mid-back / thickness: seated cable row, chest-supported / machine
  row, barbell or T-bar row, face pull.
- Lower back: back extension / hyperextension, Romanian deadlift,
  good morning.
- Upper traps: barbell/dumbbell shrug, cable shrug.

### Shoulders (deltoid)

Subregions: anterior (front), lateral (medial/side), posterior (rear).

- Anterior: overhead/shoulder pressing shows high anterior EMG; front
  raises isolate it.
  https://www.researchgate.net/publication/263292517_Analysis_of_anterior_middle_and_posterior_deltoid_activation_during_single_and_multijoint_exercises
- Lateral: lateral raises build the side delt; dumbbell and cable
  versions are similarly effective for lateral-delt hypertrophy.
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12277279/
- Posterior: reverse fly / bent-over lateral raise targets the rear
  delt.
  https://swolverine.com/blogs/blog/best-deltoid-exercises
- A press for front, lateral raises for side, reverse flyes for rear is
  the minimum complete set.
  https://swolverine.com/blogs/blog/best-deltoid-exercises

Recommended list:
- Anterior: overhead press (barbell/dumbbell/machine), front raise.
- Lateral: dumbbell lateral raise, cable lateral raise, lateral raise
  machine.
- Posterior: reverse pec-deck, cable/dumbbell reverse fly, face pull.

### Biceps and elbow flexors

Subregions: long head (outer), short head (inner), plus brachialis and
brachioradialis.

- Incline curls (shoulder extended, biceps lengthened) bias the long
  head / outer biceps and proximal growth; preacher curls (shoulder
  flexed) bias the short head / inner and, via greater torque at the
  stretched start, distal/brachialis growth. Overall biceps activation
  between incline, preacher, wide-grip cable and standard curls is
  similar, so the value is the regional bias, not total activation.
  https://houseofhypertrophy.com/incline-vs-preacher/ ,
  https://www.myomaxfitness.com/best-biceps-exercises-for-long-and-short-head/ ,
  https://mennohenselmans.com/the-new-science-of-how-to-maximize-biceps-growth/ ,
  https://www.researchgate.net/publication/388004281_Distinct_muscle_growth_and_strength_adaptations_after_preacher_and_incline_biceps_curl
- Hammer curls produce the lowest biceps EMG, which is why they are
  the brachialis/brachioradialis pick, not a biceps pick.
  https://www.myomaxfitness.com/best-biceps-exercises-for-long-and-short-head/

Recommended list:
- Long head / outer: incline dumbbell curl, cable curl with elbow
  behind torso, wide-grip barbell curl.
- Short head / inner: preacher curl (machine/EZ/dumbbell),
  concentration curl, close-grip curl.
- Brachialis / brachioradialis: hammer curl, reverse curl, cross-body
  hammer curl.

### Triceps

Subregions: long head, lateral head, medial head.

- Long head is best trained with the arm overhead (overhead
  extensions), because pinned-elbow movements (pushdown, kickback)
  leave it short and slack.
  https://learn.athleanx.com/articles/long-head-tricep-exercises ,
  https://coach-andrius.medium.com/why-everyone-is-wrong-about-triceps-long-head-training-b33640441f61
- Lateral head is well isolated by pushdowns (arm at side); rope
  pushdowns gave higher activation than bar in EMG.
  https://www.speediance.com/blogs/fitness/lateral-head-tricep-exercises ,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC7047337/
- Medial head is highly active across nearly all pressing and extension
  angles, so it is hard to isolate and gets trained by everything; no
  dedicated exercise needed.
  https://ca.ironbullstrength.com/blogs/training/medial-head-tricep-exercises

Recommended list:
- Long head: overhead cable/dumbbell extension, skullcrusher (EZ bar),
  overhead rope extension.
- Lateral head: rope/bar pushdown, triceps dip, close-grip bench press.
- Medial head: covered by pushdowns and any pressing; reverse-grip
  pushdown if a dedicated movement is wanted.

### Quadriceps

Subregions: rectus femoris (two-joint, hip-flexor), vastus medialis
(VMO, teardrop), vastus lateralis (outer sweep), vastus intermedius.

- The rectus femoris is two-joint, so closed-chain compounds (squat)
  grow it minimally; leg extensions grow all three regions of the
  rectus femoris, especially the proximal (near-hip) portion. Use leg
  extensions to cover rectus femoris.
  https://www.tandfonline.com/doi/full/10.1080/02640414.2024.2444713 ,
  https://www.strengthlog.com/squat-vs-leg-extension/
- Squats drive vastus lateralis growth (mid-belly) and, done deep,
  grow all quad heads.
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9737272/
- Hack squats load all four heads (lateralis, medialis, intermedius,
  rectus femoris) through knee extension.
  https://blog.myarsenalstrength.com/plate-loaded-hack-squat

Recommended list:
- Overall / vastus lateralis (sweep): back/front squat, hack squat,
  leg press, pendulum squat.
- Rectus femoris: leg extension (especially with hip extended/upright
  torso).
- VMO emphasis: full-depth squats, leg extension through full lockout,
  Spanish squat, sissy squat.
- Single-leg balance: walking lunge, Bulgarian split squat, step-up.

### Hamstrings

Subregions: proximal / hip-dominant bias vs distal / knee-flexion
bias; plus biceps femoris vs semitendinosus/semimembranosus.

- Hip hinges (stiff-leg/Romanian deadlift) and leg curls grow the
  hamstrings differently: leg curls produce much greater lower (distal)
  hamstring activation, while upper (proximal) activation is similar
  between the two.
  https://muscleevo.net/stiff-leg-deadlift/
- Nordic curls / leg curls grow the semitendinosus more; stiff-leg
  deadlifts grow the semimembranosus more; biceps femoris long head
  grows similarly from both. Both movement types are needed.
  https://www.strongerbyscience.com/exercise-selection-hamstrings/ ,
  https://pubmed.ncbi.nlm.nih.gov/40586278/

Recommended list:
- Hip-hinge / proximal: Romanian deadlift, stiff-leg deadlift, good
  morning, 45-degree back extension, glute-ham raise.
- Knee-flexion / distal: lying leg curl, seated leg curl, standing leg
  curl, Nordic curl.

### Glutes

Subregions: gluteus maximus (size/power) vs gluteus medius and minimus
(upper/side, frontal-plane stabilisers).

- Maximus: hip thrusts, squats and deadlifts; the hip thrust's range
  and bench-supported position drive high maximus activation.
  https://www.thewellnews.com/health/your-guide-to-great-glutes/
- Medius/minimus: hip-abduction work in the frontal plane (machine hip
  abduction, side-lying abduction, clamshell, lateral band walk),
  banded or wide-stance thrusts, and single-leg work via the stability
  demand.
  https://www.issaonline.com/blog/post/12-gluteus-medius-exercises-for-strength ,
  https://www.setforset.com/blogs/news/gluteus-minimus-exercises ,
  https://e3rehab.com/how-to-train-your-gluteus-medius/

Recommended list:
- Maximus: barbell/machine hip thrust, glute bridge, squat, Romanian
  deadlift, cable glute kickback, 45-degree back extension.
- Medius/minimus: hip abduction machine, cable/band standing
  abduction, lateral band walk, side-lying abduction, single-leg work
  (split squat, step-up).

### Calves

Subregions: gastrocnemius (two-joint, trained knee-straight) vs soleus
(one-joint, trained knee-bent); plus tibialis anterior (front shin).

- Straight-knee (standing) raises grow the gastrocnemius far more than
  bent-knee; one study found standing produced ~9-12% gastrocnemius
  volume growth vs ~1-2% seated.
  https://www.matassessment.com/blog/calf-raises-knee-bent-vs-knee-straight ,
  https://www.fitnesssimplified.org/training/seated-versus-straight-leg-calf-raises
- Bent-knee (seated) raises put the gastrocnemius in active
  insufficiency and isolate the soleus.
  https://www.treatmyachilles.com/post/bent-knee-calf-raises-how-to-target-the-soleus-part-of-the-achilles-tendon ,
  https://e3rehab.com/how-to-grow-your-calves/
- Both are worth including for full lower-leg development; the tibialis
  is trained by tibialis raises / toe raises (dorsiflexion).
  https://www.calfbuilder.com.au/blogs/news/calf-builder-soleus-gastrocnemius-training

Recommended list:
- Gastrocnemius: standing calf raise (machine/Smith/dumbbell), leg-
  press calf raise, donkey calf raise.
- Soleus: seated calf raise (machine or weighted), bent-knee calf
  raise.
- Tibialis: tibialis raise, banded/weighted dorsiflexion.

### Abs / core, forearms, neck

- Abs: the core is rectus abdominis, external and internal obliques,
  and transversus abdominis. Cable crunches load the rectus abdominis
  with progressive resistance; reverse crunches bias the lower rectus
  abdominis and obliques. Use a flexion movement, an anti-extension/
  brace, and a rotation/anti-rotation movement to cover the core.
  https://learn.athleanx.com/articles/abs-for-men/cable-cruches ,
  https://gymless.org/reverse-crunches/ ,
  https://nutrabio.com/blogs/blog/ab-workouts
  Recommended: cable crunch, machine ab crunch, hanging/captain's-chair
  leg raise, reverse crunch, cable/Pallof rotation, plank.
- Forearms: wrist flexion (wrist curl) and wrist extension (reverse
  wrist curl) train the flexors and extensors; reverse curls and grip
  work cover brachioradialis and grip.
  https://gunsmithfitness.com/blogs/news/the-best-exercises-for-abs-and-forearm-development
  Recommended: wrist curl, reverse wrist curl, reverse barbell curl,
  farmer's carry / grip hold.
- Neck: trained by direct flexion/extension/lateral flexion against
  load (neck harness, plate, or neck machine). A complete library
  should carry neck flexion, extension and lateral flexion entries even
  though most apps omit them.

Section note on the recurring evidence pattern: regional and per-head
differences are consistently real but modest. The library design rule
is to guarantee at least one biased exercise exists for each subregion
above, so a programme can cover the whole muscle across a week; it is
not to over-fragment the catalogue chasing small EMG gaps.

---

## 4. Commercial-gym machine inventory (machine-only viability)

A complete list of machine types a well-equipped commercial gym
carries, grouped by muscle target, with the exercise each enables.
This confirms a machine-only hypertrophy programme covers every muscle
group. Sourcing for the machine set:
https://www.fitnessgiant.com/legmachines.html ,
https://strengthwarehouseusa.com/blogs/resources/best-leg-machines-at-the-gym ,
https://strengthwarehouseusa.com/collections/plate-loaded-gym-equipment ,
https://gmwdfitness.com/products/deltoid-and-shoulder-press-machine-sp00 ,
https://www.ritkeeps.com/blogs/muscle-building/the-complete-list-100-gym-equipment

### Chest

- Seated chest press (selectorised) - flat horizontal press.
- Incline chest press machine - upper-chest press.
- Decline chest press machine - lower-chest press.
- Pec deck / pec fly machine - chest isolation (adduction).
- Iso-lateral / plate-loaded chest press (flat, incline, decline,
  Hammer-Strength style) - independent-arm pressing.
- Cable crossover / functional trainer - flies at any angle (low-to-
  high for upper, high-to-low for lower).
- Assisted dip machine - chest-leaning dip for lower chest.

### Back

- Lat pulldown (wide/neutral/close handles) - vertical pull, lat width.
- Assisted pull-up/chin machine - vertical pull, assisted bodyweight.
- Seated cable row (low row) - horizontal pull, mid-back thickness.
- Seated machine row / chest-supported row (selectorised) - horizontal
  pull with torso support.
- High row machine (iso-lateral/plate-loaded) - upper-lat horizontal
  pull.
- Low row machine (iso-lateral/plate-loaded) - lower-lat/mid-back row.
- Iso-lateral plate-loaded row (Hammer-Strength) - independent-arm row.
- Straight-arm pulldown (cable) - lat isolation.
- Back extension / 45-degree hyperextension bench - erectors, plus
  hip-hinge for hamstrings/glutes.
- Shrug machine / cable shrug - upper traps.

### Shoulders

- Shoulder press machine (selectorised and plate-loaded) - vertical
  press, anterior/lateral delt.
- Lateral raise machine - lateral delt isolation.
- Rear delt / reverse pec deck machine - posterior delt.
- Cable column - front raise, lateral raise, upright row, face pull,
  cable rear-delt fly.

### Arms

- Preacher curl machine (selectorised) - biceps, short-head bias.
- Cable column with bar/rope - cable curl (long-head bias with elbow
  back), reverse curl, hammer (rope) curl.
- Triceps press / triceps extension machine - triceps.
- Triceps dip machine (assisted or plate-loaded) - lateral head plus
  overall triceps.
- Cable pushdown (lat-pulldown stack or dedicated triceps column) -
  pushdown for lateral head; rope overhead extension for long head.

### Legs (quads, hamstrings, glutes, calves)

- Leg press (45-degree and horizontal/seated) - overall quad/glute
  compound.
- Hack squat machine - quad-dominant squat with back support.
- Pendulum squat - quad squat with a fixed arc.
- Smith machine - squats, lunges, calf raises, hip thrusts with a
  guided bar.
- Leg extension machine - quad isolation, rectus femoris.
- Lying leg curl machine - hamstring knee flexion (distal bias).
- Seated leg curl machine - hamstring knee flexion (distal bias).
- Standing single-leg curl machine - unilateral hamstring.
- Hip thrust machine (plate-loaded/selectorised glute drive) - glute
  maximus.
- Glute kickback machine / cable kickback - glute maximus isolation.
- Hip abduction machine (out) - gluteus medius/minimus.
- Hip adduction machine (in) - adductors / inner thigh.
- Standing calf raise machine - gastrocnemius.
- Seated calf raise machine - soleus.
- Leg-press calf press (on the leg press) - gastrocnemius.

### Core, forearms, neck

- Ab crunch machine (selectorised) - rectus abdominis flexion.
- Cable column (kneeling cable crunch, cable rotation, Pallof press) -
  flexion and rotation/anti-rotation.
- Captain's chair / hanging-leg-raise station - lower abs.
- Roman chair / back-extension bench - obliques (lateral flexion) and
  erectors.
- Wrist-curl support / cable column - forearm flexion/extension.
- Neck machine (four-way) or harness station - neck flexion, extension,
  lateral flexion.

### Verdict on machine-only viability

Every muscle group and every subregion mapped in Section 3 has at least
one machine or cable option:

- Chest upper/mid/lower: incline, flat, decline press machines plus
  cable fly angles.
- Back width and thickness: lat pulldown and assisted pull-up for
  vertical, seated/high/low/iso-lateral rows for horizontal, plus back
  extension for erectors.
- All three delt heads: shoulder press, lateral raise, reverse pec deck
  machines.
- Biceps heads and brachialis: preacher machine plus cable curl
  variations and rope hammer curls.
- Triceps long/lateral/medial: cable pushdowns, overhead rope
  extensions, triceps/dip machines.
- Quads incl. rectus femoris and sweep: leg press, hack/pendulum squat,
  leg extension.
- Hamstrings proximal and distal: lying/seated/standing leg curls plus
  the 45-degree back extension for the hip-hinge component.
- Glutes maximus and medius/minimus: hip thrust, kickback, plus hip
  abduction.
- Calves gastrocnemius and soleus: standing and seated calf machines.
- Core, forearms, neck: ab crunch, cable rotation, wrist curl, neck
  machine.

A machine-and-cable-only hypertrophy programme is fully viable across
every muscle group and subregion in a typical commercial gym. The only
genuine gaps in a thin gym are the hip-hinge hamstring stimulus (needs
a back-extension bench, glute-ham raise, or a free-weight RDL) and a
dedicated neck machine, both of which the better-equipped commercial
gyms still carry.
Sources: https://www.fitnessgiant.com/legmachines.html ,
https://strengthwarehouseusa.com/blogs/resources/best-leg-machines-at-the-gym ,
https://strengthwarehouseusa.com/collections/plate-loaded-gym-equipment ,
https://www.ritkeeps.com/blogs/muscle-building/the-complete-list-100-gym-equipment

---

## Design implications for the Volyume library

1. Tag every exercise on the ExRx six-axis model: primary muscle,
   secondary muscles, subregion bias, mechanics (compound/isolation),
   force (push/pull/static), and equipment. Add a movement-pattern tag
   on top for programme balance.
2. Treat equipment as a first-class filter with the full taxonomy in
   2c, keeping selectorised, plate-loaded/iso-lateral, Smith, and cable
   as separate values, not one "machine" bucket.
3. Guarantee subregion coverage: for every subregion in Section 3,
   ship at least one biased native exercise per common equipment type
   so any programme (free-weight, machine-only, or mixed) can train the
   whole muscle across a week.
4. Aim for roughly 400-600 well-tagged native movements (Hevy/Strong
   scale) plus custom exercises, not a 2,000-entry ExRx dump.
5. The machine inventory in Section 4 is the checklist: if the library
   cannot build a complete machine-only programme for every muscle
   group from its tagged catalogue, it has a coverage gap.
