/**
 * capability/demands.js - the exercise-demand ontology (CC27; ARCHITECTURE
 * sections 8, 5.4). ONE closed vocabulary shared verbatim between exercise
 * metadata (what a movement asks of the body) and capability constraint
 * rules (what the user asked Volyume to build around), so resolution is set
 * intersection and explanations are mechanical (CAP-18, H4).
 *
 * Pure and dependency-free, in the exerciseMetadata.js mould: derived from
 * what each exercise already carries (name, equipment, movement pattern,
 * muscle), with curated override maps for the judgement calls. HIGH-
 * PRECISION RULES ONLY (section 8.3): anything a rule cannot classify with
 * confidence stays NULL, and NULL means UNKNOWN - never a guess. Automatic
 * surfaces treat NULL on a constrained axis as ineligible with its own
 * reason (CAP-8); manual use never needs any of this.
 *
 * The nine axes and their closed value sets are section 8.2's table
 * verbatim. The four movement-family vocabularies are NOT extended or
 * renamed by any of this - demands are a new orthogonal axis set.
 */

// ── Closed value domains (section 8.2) ──────────────────────────────────

export const DEMAND_POSITION = Object.freeze({
  STANDING: 'standing',
  SEATED: 'seated',
  LYING: 'lying',
  KNEELING: 'kneeling',
  MIXED: 'mixed',
});

export const DEMAND_GRIP = Object.freeze({
  NONE: 'none',
  SUPPORTIVE: 'supportive',
  BAR: 'bar',
});

export const DEMAND_BALANCE = Object.freeze({
  SUPPORTED: 'supported',
  STABLE: 'stable',
  HIGH: 'high',
});

/** The demand columns (position carries the enum). Order is the storage
 *  order in database.js and migrate_148; weightBearingHands appends last
 *  (gap-closure Phase C, MOVEMENT-PATH-AUDIT.md; cloud migrate_151). */
export const DEMAND_FIELDS = Object.freeze([
  'position', 'floorAccess', 'overheadPosition', 'gripDemand',
  'unilateralLoadable', 'bilateralUpper', 'bilateralLower',
  'axialLoad', 'impact', 'balanceDemand', 'weightBearingHands',
]);

const POSITION_VALUES = new Set(Object.values(DEMAND_POSITION));
const GRIP_VALUES = new Set(Object.values(DEMAND_GRIP));
const BALANCE_VALUES = new Set(Object.values(DEMAND_BALANCE));

// ── Name-rule tables ────────────────────────────────────────────────────
// Every regex here is a HIGH-PRECISION claim: it must be true of every
// library name it matches. Broad guesses belong in CURATED_DEMANDS or
// nowhere.

// Position. Explicit words first; then families whose position is intrinsic.
// SEED NAMING CONVENTION (relied on and pinned by the invariants suite):
// positional qualifiers are explicit in this library - 'Seated Dumbbell
// Curl' vs 'Dumbbell Curl', 'Lying Leg Curl' vs 'Leg Curl (Cable)'. An
// UNQUALIFIED free-weight/cable/band movement is its standing form; the
// seated/lying forms are separate rows. That convention is what lets the
// rules below classify unqualified names with confidence.
const NAME_SEATED = /\bseated\b|\bpreacher\b/i;
const NAME_LYING = /\blying\b|\bbench press\b|\bfloor press\b|\bskull ?crusher|\bpullover\b|\bhip thrust\b|\bglute bridge\b|\bnordic\b|\bdead bug\b|\bcrunch\b|\bsit-?up\b|\bleg raise\b(?!.*captain)|\bhollow\b|\bprone\b|\bchest-?supported\b|\bseal row\b|\bsp[iy]der curl\b|\breverse hyper|\bfrog pump\b|\bswiss ball\b|\bslider\b|\bdragon flag\b|\bv-up\b|\bwindmill\b/i;
const NAME_KNEELING = /\bkneeling\b|\bbird dog\b|\bdonkey kick\b(?!back \(machine\))|\bbear crawl\b|\bstir the pot\b/i;
const NAME_STANDING_FAMILY = /\bsquat\b(?!.*pistol)|\bdeadlift\b|\brdl\b|\bromanian\b|\bgood morning\b|\blunge\b|\bstep-?up\b|\bcarry\b|\bfarmer|\bshrug\b|\bcalf raise\b(?!.*(seated|donkey))|\bupright row\b|\bclean\b|\bsnatch\b|\bjerk\b|\bswing\b|\bsled\b|\btyre\b|\bstanding\b|\bprowler\b|\bpistol\b|\bwalk\b|\bwall sit\b|\bjefferson\b/i;
// Hanging / bar-suspended work: none of the four ground positions.
const NAME_SUSPENDED = /\bpull-?up\b|\bchin-?up\b|\bdip\b(?!.*machine)|\bhanging\b|\bdead hang\b|\btoe-to-bar\b|\bmuscle-?up\b|\bl-sit\b|\bdip machine\b|\bassisted dip\b/i;
// Seated by construction: the station has a seat.
const NAME_SEATED_STATION = /\bpulldown\b|\bcable row\b|\bhigh row\b|\blow row\b|\bleg press\b|\bleg extension\b|\bpec deck\b|\bmachine rear delt\b|\breverse pec deck\b|\bseated rear delt\b|\bassisted pull-?up\b|\bmachine (chest|shoulder) press\b|\bmachine (row|curl|crunch|lateral raise|tricep|y-raise)\b|\bplate-loaded (chest|incline|decline|shoulder|overhead|row|high row|low row|lat|rear delt)\b|\biso-lateral\b|\bhammer strength\b|\bchest press machine\b|\blateral raise machine\b|\btriceps extension machine\b|\bneck (machine|flexion \(machine\)|extension \(machine\))|\bneck machine\b|\bhip (abduction|adduction)\b|\babduction machine\b|\bhip adduction machine\b|\bcycling\b|\bassault bike\b|\bviking press\b|\bhand gripper\b/i;
// Standing free-weight/cable movements whose unqualified form is standing
// by the naming convention above.
const NAME_STANDING_CONVENTION = /\bcurl\b|\bpushdown\b|\bface pull\b|\blateral raise\b|\bfront raise\b|\by-raise\b(?!.*prone)|\bw-raise\b|\bytw\b|\bcrossover\b|\bcable fly\b|\bwoodchop\b|\btwist\b|\brotation\b|\bpull-?through\b|\bpull-apart\b|\bkickback\b|\boverhead.*extension\b|\btate press\b|\bsvend press\b|\bpallof\b|\bserratus punch\b|\bbattle ropes\b|\bwrist\b|\broller\b|\bplate pinch\b|\bside bend\b|\bband (row|lat pulldown|chest press|shoulder press|leg curl|tibialis)\b|\btibialis raise\b|\bstraight-arm pulldown\b|\brack pull\b|\bhip extension \(cable\)\b|\bcable (hip abduction|hip adduction|donkey kickback)\b|\bpress\b(?=.*landmine)|\brow\b/i;

// Floor access: getting DOWN TO or UP FROM the floor is part of the
// exercise. Bench-lying work is deliberately NOT here (a bench is not the
// floor).
const NAME_FLOOR = /\bfloor\b|\bpush-?up\b|\bplank\b|\bcrunch\b|\bsit-?up\b|\bdead bug\b|\bbird dog\b|\bglute bridge\b|\bhip thrust\b|\bmountain climber\b|\brussian twist\b|\bnordic\b|\bhollow\b|\bsuperman\b|\bcopenhagen\b|\blying leg raise\b|\bab wheel|\brollout\b|\bside plank\b|\bpallof.*kneel|\bturkish get-?up\b/i;

// Overhead: load or hands travel above the head. Pulldowns/pull-ups reach
// overhead even though the load moves down - the shoulder position is what
// the constraint is about (the canonical shoulder case, section 8.2).
const NAME_OVERHEAD = /\boverhead\b|\bshoulder press\b|\bmilitary\b|\bpush press\b|\barnold\b|\bpull-?up\b|\bchin-?up\b|\bpulldown\b|\bpullover\b|\bsnatch\b|\bjerk\b|\bhandstand\b|\blandmine press\b|\by-raise\b|\bwall ?ball\b|\bviking press\b|\bbehind[- ]the[- ]neck\b/i;

// Impact: airborne / repeated landing.
const NAME_IMPACT = /\bjump\b|\bhop\b|\bbound\b|\bsprint\b|\bplyo|\bbroad jump\b|\bbox jump\b|\bstair running\b|\bskater\b|\bburpee\b/i;

// Weight borne through the palms with extended wrists (the push-up /
// quadruped class). DEFINITION (gap-closure Phase C): the hand is a flat
// or near-flat weight-bearing surface. Gripped implements are NOT this
// axis (the grip axis owns that interface); forearm-supported planks are
// NOT this axis (load is through the forearm). Front-rack catches and
// floor-support catch phases are curated by name below.
const NAME_WEIGHT_BEARING_HANDS = /\bpush-?up\b|\bhandstand\b|\bmountain climber\b|\bcrawl\b|\bburpee\b|\bget-?up\b|\bbird dog\b|\binchworm\b|\bwalkout\b/i;

// High balance: single-leg stance or an unstable base is the point.
const NAME_BALANCE_HIGH = /\bsingle-?leg\b|\bone-?leg\b|\bpistol\b|\blunge\b|\bstep-?up\b|\bbulgarian\b|\bsplit squat\b|\bcurtsy\b|\bcossack\b|\bskater\b|\bshrimp\b|\bb-stance\b|\bwalking\b|\bturkish get-?up\b|\boverhead squat\b/i;

// Grip-free bodyweight work (palms flat or no hand involvement at all).
const NAME_GRIP_NONE = /\bpush-?up\b|\bplank\b|\bcrunch\b|\bsit-?up\b|\bdead bug\b|\bbird dog\b|\bglute bridge\b|\bhip thrust\b|\bmountain climber\b|\bnordic\b|\bhollow\b|\bsuperman\b|\bcopenhagen\b|\bleg raise\b|\bcalf raise\b(?=.*(bodyweight|single-leg))|\bback extension\b|\breverse hyper|\bneck\b|\bwall sit\b|\bhandstand\b/i;

// Hanging / heavy-pulling work where a full closed grip carries the load.
const NAME_GRIP_BAR_BODYWEIGHT = /\bpull-?up\b|\bchin-?up\b|\bdip\b|\bhanging\b|\binverted row\b|\bmuscle-?up\b|\brope climb\b|\bab wheel|\brollout\b/i;

// Machines where the load path needs no hand grip (handles are optional
// support): the lower-body selectorised family.
const NAME_MACHINE_SUPPORTIVE = /\bleg press\b|\bleg extension\b|\bleg curl\b|\bcalf (press|raise).*(machine|leg press)|\bhack squat\b|\bhip (abduction|adduction)\b|\babduction machine\b|\babductor\b|\badductor machine\b|\bmachine calf raise\b|\bseated calf raise\b|\bglute kickback machine\b|\bpec deck\b|\bmachine crunch\b|\bab crunch machine\b|\bback extension\b|\breverse hyper|\bbelt squat\b|\bneck (machine|harness)/i;

// Squat/hinge family = meaningful spinal compression when externally
// loaded. (Pattern strings come from the seed's own vocabulary.)
const AXIAL_PATTERNS = new Set(['squat', 'hinge', 'carry']);
const NAME_AXIAL = /\bsquat\b|\bdeadlift\b|\brdl\b|\bromanian\b|\bgood morning\b|\bshrug\b|\bcarry\b|\bfarmer|\blunge\b|\bstep-?up\b|\bclean\b|\bsnatch\b|\bjerk\b|\byoke\b|\bbent over\b|\bpendlay\b|\bt-bar row\b|\bmeadows\b|\bkroc\b|\bjefferson\b|\brack pull\b/i;
// Loaded standing presses compress the spine too.
const NAME_AXIAL_PRESS = /\b(standing|push|military|overhead|viking).*(press)\b|\bpress\b(?=.*standing)/i;

// Both-arms-required bodyweight upper work.
const NAME_BILATERAL_UPPER_BW = /\bpush-?up\b|\bpull-?up\b|\bchin-?up\b|\bdip\b|\bmuscle-?up\b|\binverted row\b|\bab wheel|\brollout\b|\bhandstand\b/i;

// Lower-body-loading families (for bilateral_lower reasoning).
const LOWER_PATTERNS = new Set(['squat', 'hinge']);
const LOWER_MUSCLES = new Set(['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'tibialis']);

// Single-implement equipment: one hand/side can hold the whole load, so
// the movement is one-side loadable by construction.
const SINGLE_IMPLEMENT = new Set(['dumbbell', 'kettlebell', 'cable', 'band']);
// Two-hands-on-one-implement equipment: cannot be split.
const FIXED_IMPLEMENT = new Set(['barbell', 'smith_machine', 'landmine', 'trap_bar']);

// ── Curated overrides ───────────────────────────────────────────────────
// Exact seed names whose classification a rule cannot carry with
// confidence. Reviewed as the section 8.3 curation pass; every entry is a
// deliberate judgement, and absence means the rules (or NULL) stand.
// Partial objects: only the named axes are overridden.
export const CURATED_DEMANDS = Object.freeze({
  // Rack pull: a deadlift from pins - axial, bar grip, standing.
  'Rack Pull': { position: 'standing', axialLoad: true, gripDemand: 'bar', bilateralUpper: true, bilateralLower: true, overheadPosition: false },
  // Hip thrust variants sit AGAINST a bench but set up from the floor.
  'Barbell Hip Thrust': { position: 'lying', floorAccess: true, gripDemand: 'supportive', bilateralLower: true, axialLoad: false },
  'Dumbbell Hip Thrust': { position: 'lying', floorAccess: true, gripDemand: 'supportive', bilateralLower: true, axialLoad: false },
  // Cable crossovers/raises are performed standing in every seed variant.
  'Cable Crossover (High to Low)': { position: 'standing', overheadPosition: true },
  'Cable Fly (Low to High)': { position: 'standing' },
  // Face pull: standing cable pull at face height - no overhead reach.
  'Face Pull': { position: 'standing', overheadPosition: false },
  // Back extension apparatus: no grip needed, trunk supported.
  'Back Extension (45-degree)': { position: 'mixed', gripDemand: 'none', balanceDemand: 'supported', floorAccess: false },
  // Captain's chair knee raise: forearms on pads.
  "Captain's Chair Leg Raise": { position: 'mixed', gripDemand: 'supportive', floorAccess: false, overheadPosition: false },
  // Wall sit: standing profile against support, no floor, no grip.
  'Wall Sit': { position: 'standing', balanceDemand: 'supported', floorAccess: false, gripDemand: 'none', bilateralLower: true },
  // Turkish get-up: floor-to-standing BY DESIGN - mixed position, high
  // balance, floor access, one-side load.
  'Turkish Get-Up': { position: 'mixed', floorAccess: true, balanceDemand: 'high', unilateralLoadable: true, bilateralUpper: false, overheadPosition: true },
  // B-stance hip thrust: lying against the bench, floor set-up, supported.
  'B-Stance Hip Thrust': { position: 'lying', floorAccess: true, balanceDemand: 'supported', gripDemand: 'none', bilateralLower: true, axialLoad: false },
  // Renegade row: plank on dumbbells - floor work, both arms load-bearing.
  'Renegade Row': { position: 'lying', floorAccess: true, bilateralUpper: true, unilateralLoadable: false, balanceDemand: 'stable', overheadPosition: false, axialLoad: false },
  // Kroc / Meadows / Helms rows: standing hinge braced on a bench/bar.
  'Kroc Row': { position: 'standing', balanceDemand: 'supported', bilateralUpper: false },
  'Meadows Row': { position: 'standing', balanceDemand: 'supported', bilateralUpper: false },
  'Helms Row': { position: 'standing', balanceDemand: 'supported', bilateralUpper: false, unilateralLoadable: true, axialLoad: false },
  'Batwing Row': { position: 'lying', balanceDemand: 'supported', bilateralUpper: false, unilateralLoadable: true, axialLoad: false },
  // Jefferson curl: standing loaded spinal flexion - axial by intent.
  'Jefferson Curl': { position: 'standing', axialLoad: true, bilateralUpper: true, unilateralLoadable: false, balanceDemand: 'stable', overheadPosition: false, floorAccess: false },
  // Neck work off the machine: lying on a bench with a plate, or floor
  // bridging. Manual-resistance rows are position-flexible: seated works.
  'Neck Bridge': { position: 'lying', floorAccess: true, gripDemand: 'none', balanceDemand: 'supported' },
  'Plate Neck Curl': { position: 'lying', floorAccess: false, gripDemand: 'supportive', balanceDemand: 'supported', overheadPosition: false },
  'Plate Neck Extension': { position: 'lying', floorAccess: false, gripDemand: 'supportive', balanceDemand: 'supported', overheadPosition: false },
  'Plate Neck Lateral Flexion': { position: 'lying', floorAccess: false, gripDemand: 'supportive', balanceDemand: 'supported', overheadPosition: false },
  'Neck Curl': { position: 'lying', floorAccess: true, gripDemand: 'none', balanceDemand: 'supported' },
  'Neck Lateral Flexion': { position: 'lying', floorAccess: true, gripDemand: 'none', balanceDemand: 'supported' },
  'Manual Resistance Neck Flexion': { position: 'seated', floorAccess: false, gripDemand: 'none', balanceDemand: 'supported', overheadPosition: false },
  'Manual Resistance Neck Extension': { position: 'seated', floorAccess: false, gripDemand: 'none', balanceDemand: 'supported', overheadPosition: false },
  'Neck Rotation (Resistance)': { position: 'seated', floorAccess: false, gripDemand: 'none', balanceDemand: 'supported', overheadPosition: false },
  'Neck Harness Flexion': { position: 'seated', floorAccess: false, gripDemand: 'none', balanceDemand: 'supported', overheadPosition: false },
  'Neck Harness Extension': { position: 'seated', floorAccess: false, gripDemand: 'none', balanceDemand: 'supported', overheadPosition: false },
  // Bench dip: hands on a bench behind the back, feet on floor.
  'Bench Dip': { position: 'mixed', floorAccess: false, gripDemand: 'supportive', bilateralUpper: true, unilateralLoadable: false, balanceDemand: 'supported', overheadPosition: false },
  // Svend press: standing plate squeeze.
  'Svend Press': { position: 'standing', overheadPosition: false, balanceDemand: 'stable' },
  // Landmine chest press: standing press at chest height.
  'Landmine Press': { position: 'standing', overheadPosition: true, balanceDemand: 'stable', axialLoad: true },
  'Landmine Chest Press (Single-Arm)': { position: 'standing', overheadPosition: false, balanceDemand: 'stable', axialLoad: true },
  // Weighted dips carry the same demands as the bodyweight movement.
  'Weighted Dips (Chest)': { position: 'mixed', gripDemand: 'bar', bilateralUpper: true, unilateralLoadable: false, balanceDemand: 'supported', overheadPosition: false, floorAccess: false },
  'Weighted Dips (Triceps)': { position: 'mixed', gripDemand: 'bar', bilateralUpper: true, unilateralLoadable: false, balanceDemand: 'supported', overheadPosition: false, floorAccess: false },
  // Glute ham raise: knees on the pad, trunk hinging - kneeling profile.
  'Glute Ham Raise': { position: 'kneeling', floorAccess: false, gripDemand: 'none', balanceDemand: 'supported' },
  'Glute-Ham Raise Machine': { position: 'kneeling', floorAccess: false, gripDemand: 'none', balanceDemand: 'supported' },
  'Nordic Hamstring Curl': { position: 'kneeling', floorAccess: true, gripDemand: 'none', balanceDemand: 'supported', weightBearingHands: true },
  // Terminal knee extension: standing with a band at a rack.
  'Terminal Knee Extension': { position: 'standing', floorAccess: false, gripDemand: 'none', balanceDemand: 'supported', bilateralLower: false, overheadPosition: false },
  // Swiss ball / slider leg curls: lying floor work.
  'Swiss Ball Leg Curl': { position: 'lying', floorAccess: true, gripDemand: 'none', balanceDemand: 'supported' },
  // Rice bucket and grippers: seated grip work.
  'Rice Bucket': { position: 'seated', floorAccess: false, overheadPosition: false, bilateralUpper: false, unilateralLoadable: true },
  'Hand Gripper': { position: 'seated', floorAccess: false, overheadPosition: false, bilateralUpper: false, unilateralLoadable: true },
  'Gripper Walks': { position: 'standing', overheadPosition: false, bilateralUpper: false, unilateralLoadable: true, balanceDemand: 'stable', floorAccess: false },
  'Dumbbell Pronation/Supination': { position: 'seated', floorAccess: false, overheadPosition: false, balanceDemand: 'supported' },
  'Plate Pinch': { position: 'standing', overheadPosition: false, balanceDemand: 'stable', floorAccess: false },
  // Cycling / assault bike / battle ropes: seated or standing conditioning
  // with supportive interfaces.
  'Cycling (Stationary)': { position: 'seated', gripDemand: 'supportive', overheadPosition: false, bilateralUpper: false, balanceDemand: 'supported', floorAccess: false },
  'Assault Bike': { position: 'seated', gripDemand: 'supportive', overheadPosition: false, bilateralUpper: true, balanceDemand: 'supported', floorAccess: false },
  'Battle Ropes': { position: 'standing', gripDemand: 'bar', overheadPosition: false, bilateralUpper: true, unilateralLoadable: false, balanceDemand: 'stable', floorAccess: false },
  'Prowler Drag': { position: 'standing', gripDemand: 'bar', overheadPosition: false, balanceDemand: 'stable', floorAccess: false },
  // Frog pump / glute squeeze: floor work, no grip.
  'Frog Pump': { position: 'lying', floorAccess: true, gripDemand: 'none', balanceDemand: 'supported', overheadPosition: false },
  'Weighted Frog Pump': { position: 'lying', floorAccess: true, gripDemand: 'supportive', balanceDemand: 'supported', overheadPosition: false },
  'Glute Squeeze Hold': { position: 'standing', floorAccess: false, gripDemand: 'none', balanceDemand: 'stable', bilateralLower: true, overheadPosition: false },
  // 45-degree back/hip extensions: braced apparatus.
  '45-Degree Hip Extension': { position: 'mixed', floorAccess: false, gripDemand: 'none', balanceDemand: 'supported', overheadPosition: false, bilateralLower: true },
  'Hyperextension (Back Extension)': { position: 'mixed', floorAccess: false, gripDemand: 'none', balanceDemand: 'supported', overheadPosition: false, bilateralLower: true },
  'Back Extension (Weighted)': { position: 'mixed', floorAccess: false, gripDemand: 'supportive', balanceDemand: 'supported', overheadPosition: false, bilateralLower: true },
  'Reverse Hyperextension': { position: 'lying', floorAccess: false, gripDemand: 'supportive', balanceDemand: 'supported', overheadPosition: false, bilateralLower: true },
  'Reverse Hyperextension (Glute)': { position: 'lying', floorAccess: false, gripDemand: 'supportive', balanceDemand: 'supported', overheadPosition: false, bilateralLower: true },
  // Inverted/TRX rows: suspended pulls, both hands, no floor sitting.
  'Inverted Row': { position: 'mixed', floorAccess: false, gripDemand: 'bar', bilateralUpper: true, unilateralLoadable: false, balanceDemand: 'supported', overheadPosition: false },
  'TRX Row': { position: 'mixed', floorAccess: false, gripDemand: 'bar', bilateralUpper: true, unilateralLoadable: false, balanceDemand: 'supported', overheadPosition: false },
  'TRX Curl': { position: 'mixed', floorAccess: false, gripDemand: 'bar', bilateralUpper: true, unilateralLoadable: false, balanceDemand: 'supported', overheadPosition: false },
  // Bench-pressing variants without 'bench' in the name.
  'Dumbbell Squeeze Press': { position: 'lying', axialLoad: false },
  'JM Press': { position: 'lying', axialLoad: false },
  'Board Press': { position: 'lying', axialLoad: false },
  'Guillotine Press': { position: 'lying', axialLoad: false },
  'Smith Machine Close-Grip Press': { position: 'lying', axialLoad: false },
  // Z-press: seated ON THE FLOOR - both floor access and seated.
  'Z-Press': { position: 'seated', floorAccess: true, balanceDemand: 'stable', axialLoad: true },
  // Standing cable/landmine arm work without a convention keyword.
  'Single Arm Cable Extension': { position: 'standing', balanceDemand: 'stable' },
  'Cross-Body Cable Tricep Extension': { position: 'standing', balanceDemand: 'stable' },
  'Landmine Tricep Extension': { position: 'standing', balanceDemand: 'stable' },
  'Landmine Press (Abs)': { position: 'standing', balanceDemand: 'stable', overheadPosition: false },
  'Hip Extension (Cable)': { position: 'standing', balanceDemand: 'stable' },
  // Kick-back machines kneel/lean on a pad.
  'Glute Kickback Machine': { position: 'kneeling', balanceDemand: 'supported', floorAccess: false },
  'Donkey Kickback (Machine)': { position: 'kneeling', balanceDemand: 'supported', floorAccess: false },
  'Adductor Squeeze (Ball)': { position: 'seated', balanceDemand: 'supported', floorAccess: false, overheadPosition: false },
  'Tib Bar Raise (Machine)': { position: 'seated', balanceDemand: 'supported', floorAccess: false, gripDemand: 'supportive' },
  // Family-thin muscle leftovers (section 33.3 priority closure).
  'Cuban Press': { position: 'standing', floorAccess: false, balanceDemand: 'stable', axialLoad: true },
  'Bradford Press': { position: 'standing', floorAccess: false, balanceDemand: 'stable', axialLoad: true },
  'Single-Arm Dumbbell Press': { position: 'standing', floorAccess: false, balanceDemand: 'stable', axialLoad: true },
  'Power Clean': { overheadPosition: false, weightBearingHands: true }, // racked at the shoulders, never overhead; the rack catch extends the wrists under load

  // Weight-bearing-hands curation (gap-closure Phase C). The name rule
  // covers the push-up/quadruped class; these are the judgement rows:
  // catch phases and front-rack positions load extended wrists even
  // though the grip axis reads them as gripped or grip-free.
  'Nordic Curl': { weightBearingHands: true }, // press-up catch at the bottom
  'Nordic Glute Curl': { weightBearingHands: true }, // same catch
  'L-Sit Hold': { weightBearingHands: true, overheadPosition: false }, // palms pressing the surface
  'Reverse Plank': { weightBearingHands: true }, // hands under shoulders, palms down
  'Barbell Front Squat': { weightBearingHands: true }, // clean-grip rack extends the wrists under the bar
  'Smith Machine Front Squat': { weightBearingHands: true }, // same rack position
  'Clean Pull': { overheadPosition: false },
  'Rack Pull (Traps)': { overheadPosition: false },
  'Cossack Squat': { gripDemand: 'none', axialLoad: false }, // bodyweight lateral squat
  'Side-Lying Adduction': { gripDemand: 'none', overheadPosition: false },
  'Adductor Rock-Back (Kneeling)': { gripDemand: 'none', overheadPosition: false },
  'Dead Hang': { gripDemand: 'bar', overheadPosition: true },

  // Gap-closure Phase C lead curation: the two judgement axes'
  // NULL worklists (overhead = shoulder-elevated position, axial =
  // spinal compression under load). Rationale per class in
  // MOVEMENT-PATH-AUDIT.md section 4.2.
  'Ab Rollout': { overheadPosition: true },
  'Abduction Machine': { overheadPosition: false },
  'Arnold Press': { axialLoad: true },
  'Band Deadlift': { axialLoad: true },
  'Band Good Morning': { overheadPosition: false, axialLoad: true },
  'Band Squat': { axialLoad: true },
  'Barbell Good Morning': { overheadPosition: false },
  'Barbell Row (Supinated)': { axialLoad: true },
  'Barbell Skull Crusher': { overheadPosition: true },
  'Bear Crawl': { overheadPosition: false },
  'Bodyweight Bulgarian Split Squat': { axialLoad: false },
  'Bodyweight Single-Leg RDL': { axialLoad: false },
  'Cable Iron Cross': { overheadPosition: false },
  'Decline Skull Crusher': { overheadPosition: true },
  'Donkey Kick': { overheadPosition: false },
  'Dragon Flag': { overheadPosition: true },
  'Dumbbell Floor Skull Crusher': { overheadPosition: true },
  'Dumbbell Row': { axialLoad: false },
  'Dumbbell Shoulder Press': { axialLoad: true },
  'Dumbbell Side-Lying Rear Delt': { overheadPosition: false },
  'Dumbbell Skull Crusher': { overheadPosition: true },
  'EZ Bar Skull Crusher': { overheadPosition: true },
  'Good Morning': { overheadPosition: false },
  'Good Morning (Barbell)': { overheadPosition: false },
  'Half-Kneeling Shoulder Press': { axialLoad: true },
  'Jump Squat': { axialLoad: false },
  'Kneeling Ab Rollout': { overheadPosition: true },
  'Kneeling Dumbbell Press': { axialLoad: true },
  'Landmine Row': { axialLoad: true },
  'Plate-Loaded Rear Delt': { overheadPosition: false },
  'Reverse Cable Crossover': { overheadPosition: false },
  'Seated Dumbbell Press': { axialLoad: true },
  'Seated Rear Delt Machine': { overheadPosition: false },
  'Single-Arm Landmine Row': { axialLoad: true },
  'Sissy Squat': { axialLoad: false },
  'Skater Squat': { axialLoad: false },
  'Smith Machine Row': { axialLoad: true },
  'Spanish Squat': { axialLoad: false },
  'Stir the Pot': { overheadPosition: false },
  'Tyre Flip': { overheadPosition: false },
  'Windmill': { overheadPosition: true },
  'YTW': { overheadPosition: true },
});

// ── Derivation ──────────────────────────────────────────────────────────

function isUpperBodyMuscle(muscle) {
  return !LOWER_MUSCLES.has(muscle);
}

/**
 * Derive the ten demand fields for one exercise. Null = UNKNOWN, and
 * unknown is a meaningful, honest state (CAP-8) - never "fine".
 *
 * @param {{name?: string, equipment?: string, movementPattern?: string,
 *          compoundIsolation?: string, primaryMuscle?: string,
 *          subregion?: string|null}} ex
 * @returns {{position: string|null, floorAccess: boolean|null,
 *           overheadPosition: boolean|null, gripDemand: string|null,
 *           unilateralLoadable: boolean|null, bilateralUpper: boolean|null,
 *           bilateralLower: boolean|null, axialLoad: boolean|null,
 *           impact: boolean|null, balanceDemand: string|null,
 *           weightBearingHands: boolean|null}}
 */
export function deriveDemandMetadata(ex = {}) {
  const name = String(ex.name || '');
  const equipment = ex.equipment || null;
  const pattern = ex.movementPattern || null;
  const muscle = ex.primaryMuscle || null;

  const out = {
    position: null,
    floorAccess: null,
    overheadPosition: null,
    gripDemand: null,
    unilateralLoadable: null,
    bilateralUpper: null,
    bilateralLower: null,
    axialLoad: null,
    impact: null,
    balanceDemand: null,
    weightBearingHands: null,
  };

  // ── impact (cheap, total) ─────────────────────────────────────────────
  out.impact = NAME_IMPACT.test(name) || pattern === 'plyometric';
  if (out.impact === true) {
    // Jump/landing work: two-leg unless the name says otherwise, arms
    // free, nothing overhead.
    const singleLegImpact = /single-leg|one-leg|\bhop\b|skater/i.test(name);
    out.bilateralLower = !singleLegImpact;
    if (equipment === 'bodyweight') out.gripDemand = DEMAND_GRIP.NONE;
    out.overheadPosition = /\bwall ?ball\b/i.test(name);
  }

  // ── position (precedence: explicit word > floor/kneel > lying class >
  //    suspended > seated station > standing family > standing convention)
  if (NAME_SEATED.test(name)) out.position = DEMAND_POSITION.SEATED;
  else if (NAME_KNEELING.test(name)) out.position = DEMAND_POSITION.KNEELING;
  else if (NAME_LYING.test(name) || (NAME_FLOOR.test(name) && !NAME_SUSPENDED.test(name))) out.position = DEMAND_POSITION.LYING;
  else if (NAME_SUSPENDED.test(name)) out.position = DEMAND_POSITION.MIXED;
  else if (/\b(incline|decline)\b.*\bpress\b/i.test(name) && (equipment === 'machine')) out.position = DEMAND_POSITION.SEATED;
  else if (/\b(incline|decline)\b.*\b(press|fly|curl|raise)\b/i.test(name)) out.position = DEMAND_POSITION.LYING;
  else if (NAME_SEATED_STATION.test(name)) out.position = DEMAND_POSITION.SEATED;
  else if (NAME_STANDING_FAMILY.test(name) || out.impact === true) out.position = DEMAND_POSITION.STANDING;
  else if (/\bfly\b/i.test(name) && (equipment === 'dumbbell')) out.position = DEMAND_POSITION.LYING;
  else if (/\brear delt fly\b|\biron cross\b/i.test(name) && equipment !== 'machine') out.position = DEMAND_POSITION.STANDING;
  else if (NAME_OVERHEAD.test(name) && (equipment === 'barbell' || equipment === 'dumbbell' || equipment === 'kettlebell' || equipment === 'cable')) out.position = DEMAND_POSITION.STANDING;
  else if (equipment === 'machine' && /\bpress\b|\bfly\b/i.test(name)) out.position = DEMAND_POSITION.SEATED;
  else if (NAME_STANDING_CONVENTION.test(name)
    && (equipment !== 'machine' || /\brow\b|\bwrist\b/i.test(name) === false)) {
    // The unqualified free-weight/cable/band form is standing by the seed's
    // naming convention. Machine rows/presses were caught above.
    out.position = equipment === 'machine' ? null : DEMAND_POSITION.STANDING;
  }

  // ── floor access ──────────────────────────────────────────────────────
  if (NAME_FLOOR.test(name)) out.floorAccess = true;
  else if (out.position != null) out.floorAccess = false; // classified off-floor above
  else if (equipment === 'machine' || equipment === 'smith_machine' || equipment === 'cable') out.floorAccess = false;

  // ── overhead ──────────────────────────────────────────────────────────
  if (NAME_OVERHEAD.test(name) || /\bhanging\b|\btoe-to-bar\b/i.test(name)) out.overheadPosition = true;
  else if (/\brow\b|\bcurl\b|\bpress\b|\bpush-?up\b|\bfly\b|\bpushdown\b|\bkickback\b|\bshrug\b|\bsquat\b|\bdeadlift\b|\brdl\b|\bleg (press|extension|curl)\b|\bcalf\b|\bcrunch\b|\bsit-?up\b|\bplank\b|\bhip\b|\bglute\b|\blateral raise\b|\bfront raise\b|\bface pull\b|\bwrist\b|\bneck\b|\bback extension\b|\bpec deck\b|\bdip\b|\bpull-?through\b|\bpull-apart\b|\bwoodchop\b|\btwist\b|\brotation\b|\bside bend\b|\bcarry\b|\bfarmer|\bwalk\b|\bextension\b(?!.*overhead)|\braise\b(?!.*(overhead|y-raise))|\bpinch\b|\bgripper\b|\brice bucket\b|\broller\b|\bab wheel|\bdead bug\b|\bbird dog\b|\bbridge\b|\bthrust\b|\bnordic\b|\bhollow\b|\bsuperman\b|\bcopenhagen\b|\bpallof\b|\bserratus\b|\bbattle ropes\b|\bsled\b|\bprowler\b|\bcycling\b|\bassault bike\b|\bwall sit\b|\blunge\b|\bstep-?up\b|\bswing\b|\bpistol\b|\bv-up\b|\bmountain climber\b|\brussian twist\b|\bdrag\b|\bbench dip\b/i.test(name)) {
    out.overheadPosition = false;
  }

  // ── grip ──────────────────────────────────────────────────────────────
  if (NAME_GRIP_NONE.test(name) && !NAME_GRIP_BAR_BODYWEIGHT.test(name) && !/\bband\b/i.test(name)) {
    out.gripDemand = DEMAND_GRIP.NONE;
  } else if (NAME_GRIP_BAR_BODYWEIGHT.test(name) || /\btrx\b|\btowel\b|\brice bucket\b|\bgripper\b/i.test(name)) {
    out.gripDemand = DEMAND_GRIP.BAR;
  } else if (NAME_MACHINE_SUPPORTIVE.test(name)) {
    out.gripDemand = DEMAND_GRIP.SUPPORTIVE;
  } else if (/\bband(ed)? (lateral walk|monster)|\bmonster walk\b|\bbanded lateral walk\b|\bheel walk\b|\btoe walk\b|\btibialis raise\b|\badductor squeeze\b|\bneck\b(?!.*harness)|\bglute squeeze\b|\bbear crawl\b|\bstir the pot\b|\bdonkey kick\b(?!back)/i.test(name)) {
    out.gripDemand = DEMAND_GRIP.NONE;
  } else if (equipment && (SINGLE_IMPLEMENT.has(equipment) || FIXED_IMPLEMENT.has(equipment) || equipment === 'ez_bar')) {
    // Holding the implement IS the interface: a closed working grip.
    out.gripDemand = DEMAND_GRIP.BAR;
  } else if (equipment === 'bodyweight' && /\bband\b/i.test(name)) {
    out.gripDemand = DEMAND_GRIP.BAR; // band held in the hands
  } else if (equipment === 'machine'
    && /\bpress\b|\brow\b|\bpulldown\b|\bcurl\b|\bextension\b|\bpushdown\b|\bviking\b|\by-raise\b|\bshrug\b|\bdip\b|\bpull-?up\b|\bglute ham\b|\bgripper\b/i.test(name)) {
    out.gripDemand = DEMAND_GRIP.BAR; // loaded through gripped handles
  } else if (equipment === 'machine' && /\blateral raise\b|\bpec deck\b|\brear delt\b/i.test(name)) {
    out.gripDemand = DEMAND_GRIP.SUPPORTIVE; // pad-driven, handles optional
  }

  // ── unilateral loadable / bilateral requirements ─────────────────────
  const unilateralByName = /single-arm|single-leg|one-arm|one-leg|bulgarian|split squat|\blunge\b|pistol|b-stance|concentration|kickback|step-up|curtsy|single arm|single leg|cossack|skater|shrimp|\biso-?lateral\b|\bkroc\b|\bmeadows\b|\bleaning\b/i.test(name);
  // Cable/machine attachments gripped with BOTH hands as seeded (the
  // single-arm forms are their own rows in this library).
  const twoHandAttachment = /\bpulldown\b|\bcable row\b|\bhigh row\b|\blow row\b|\bwide-grip\b|\bv-bar\b|\bface pull\b|\bpull-?through\b|\bpull-apart\b|\bstraight-arm\b|\brope\b|\bbar\)\b|\bstraight bar\b|\bwoodchop\b|\btwist\b(?!.*russian)|\brotation\b|\bpallof\b|\bmachine row\b|\bplate-loaded (row|high row|low row|lat)\b|\bband (row|lat pulldown|pull-apart|face pull|chest press|shoulder press)\b|\bbattle ropes\b|\bwrist roller\b|\bhand gripper\b/i.test(name) && !unilateralByName;

  if (unilateralByName) {
    out.unilateralLoadable = true;
  } else if (NAME_BILATERAL_UPPER_BW.test(name)) {
    out.unilateralLoadable = false; // one-arm push-up/pull-up is not a reasonable ask
  } else if (twoHandAttachment) {
    out.unilateralLoadable = false; // this VARIANT is two-handed; one-arm forms are separate rows
  } else if (equipment && SINGLE_IMPLEMENT.has(equipment)) {
    // One implement per side by construction: the movement can be loaded
    // one side at a time even when usually done with a pair.
    out.unilateralLoadable = true;
  } else if (equipment === 'bodyweight' && !/\bband\b/i.test(name)) {
    out.unilateralLoadable = false;
  } else if (equipment && (FIXED_IMPLEMENT.has(equipment) || equipment === 'ez_bar')) {
    out.unilateralLoadable = false;
  } else if (equipment === 'bodyweight' && /\bband\b/i.test(name)) {
    out.unilateralLoadable = true; // a band can always be worked one side
  }

  if (muscle && isUpperBodyMuscle(muscle)) {
    if (equipment && (FIXED_IMPLEMENT.has(equipment) || equipment === 'ez_bar')) {
      out.bilateralUpper = true; // two hands on one bar
    } else if (NAME_BILATERAL_UPPER_BW.test(name) || twoHandAttachment) {
      out.bilateralUpper = true;
    } else if (unilateralByName || (equipment && SINGLE_IMPLEMENT.has(equipment))) {
      out.bilateralUpper = false; // one-side use is always available
    } else if (equipment === 'machine' && /\bpress\b|\bcurl\b|\bextension\b|\bdip\b|\bpull-?up\b/i.test(name)) {
      out.bilateralUpper = true; // two-handed machine as seeded
    } else if (equipment === 'machine' && /\bpec deck\b|\blateral raise\b|\brear delt\b/i.test(name)) {
      out.bilateralUpper = true; // both arms on the pads as seeded
    } else if (NAME_GRIP_NONE.test(name) || /\bneck\b/i.test(name)) {
      out.bilateralUpper = false;
    } else if (equipment === 'bodyweight' && /\bband\b/i.test(name)) {
      out.bilateralUpper = twoHandAttachment;
    }
    // Lower involvement of upper-muscle moves: standing posture is the
    // position axis's job, but a loaded hinge/squat/carry filed under an
    // upper muscle (deadlift under back, carries under traps/forearms)
    // still WORKS both legs.
    out.bilateralLower = (AXIAL_PATTERNS.has(pattern) && !unilateralByName)
      || /\bdeadlift\b|\brack pull\b|\bclean\b|\bsnatch\b|\bcarry\b|\bfarmer|\byoke\b|\bgood morning\b/i.test(name);
  } else if (muscle) {
    // Lower-body movement. Both-hands-on-bar variants still demand both
    // arms for the hold.
    if (equipment && (FIXED_IMPLEMENT.has(equipment) || equipment === 'ez_bar')) out.bilateralUpper = true;
    else if (NAME_GRIP_NONE.test(name) || NAME_MACHINE_SUPPORTIVE.test(name) || out.gripDemand === DEMAND_GRIP.NONE) out.bilateralUpper = false;
    else if (equipment && SINGLE_IMPLEMENT.has(equipment)) out.bilateralUpper = false;
    else if (equipment === 'machine' || equipment === 'bodyweight') out.bilateralUpper = false;

    if (unilateralByName) {
      // Single-leg by name: the working demand is one-sided. Split
      // stances still place both legs; the loaded demand is per side and
      // section 33.8's side-scoping happens in the resolver.
      out.bilateralLower = /\blunge\b|bulgarian|split squat|curtsy|cossack|step-?up|skater|shrimp/i.test(name);
    } else if (/\bkickback\b|\bdonkey kick\b|\babduction\b|\badduction\b|\bhip extension \(cable\)|\btibialis\b|\bheel walk\b|\btoe walk\b/i.test(name)) {
      out.bilateralLower = false; // one leg works at a time by construction
    } else if (LOWER_PATTERNS.has(pattern) || NAME_STANDING_FAMILY.test(name)
      || NAME_MACHINE_SUPPORTIVE.test(name) || /\bleg (press|extension|curl)\b|\bcalf\b|\bcycling\b|\bassault bike\b|\bglute ham\b|\bnordic\b|\bbridge\b|\bthrust\b|\bfrog pump\b/i.test(name)) {
      // Standard two-leg execution as seeded; single-leg use is its own
      // variant or an allowance.
      out.bilateralLower = true;
    }
  }

  // ── axial load ────────────────────────────────────────────────────────
  const loaded = equipment && equipment !== 'bodyweight' && equipment !== 'machine' && equipment !== 'cable';
  if (AXIAL_PATTERNS.has(pattern) && loaded) out.axialLoad = true;
  else if (NAME_AXIAL.test(name) && loaded) out.axialLoad = true;
  else if (NAME_AXIAL_PRESS.test(name) && loaded && out.position !== DEMAND_POSITION.SEATED) out.axialLoad = true;
  else if (equipment === 'machine' || equipment === 'cable' || out.position === DEMAND_POSITION.LYING
    || (ex.compoundIsolation === 'isolation' && !NAME_AXIAL.test(name))) {
    out.axialLoad = false;
  } else if (equipment === 'bodyweight' && !NAME_AXIAL.test(name)) {
    out.axialLoad = false;
  }

  // ── balance ───────────────────────────────────────────────────────────
  if (NAME_BALANCE_HIGH.test(name)) out.balanceDemand = DEMAND_BALANCE.HIGH;
  else if (equipment === 'machine' || equipment === 'smith_machine'
    || NAME_MACHINE_SUPPORTIVE.test(name)
    || out.position === DEMAND_POSITION.LYING
    || out.position === DEMAND_POSITION.SEATED
    || out.position === DEMAND_POSITION.MIXED) {
    // Machines, seats, benches, the floor and fixed bars all provide the
    // support; hanging work is grip-limited, not balance-limited.
    out.balanceDemand = DEMAND_BALANCE.SUPPORTED;
  } else if (out.position === DEMAND_POSITION.STANDING || out.position === DEMAND_POSITION.KNEELING) {
    out.balanceDemand = DEMAND_BALANCE.STABLE;
  }

  // ── weight bearing through the hands (gap-closure Phase C) ────────────
  // Order matters: the TRUE name class first (push-ups carry gripDemand
  // 'none', so the grip-derived FALSE branches would otherwise claim
  // them); then any resolved grip interface means the hands are gripping
  // or free, not palm-bearing. Unresolved grip stays NULL here too.
  if (NAME_WEIGHT_BEARING_HANDS.test(name)) out.weightBearingHands = true;
  else if (out.gripDemand != null) out.weightBearingHands = false;

  // ── curated overrides win over every rule ─────────────────────────────
  const curated = CURATED_DEMANDS[name];
  return curated ? { ...out, ...curated } : out;
}

// ── Validation (section 8.5) ────────────────────────────────────────────

/**
 * Closed-domain + contradiction check for one derived/stored set. Returns
 * a list of violation strings (empty = valid). The invariants suite runs
 * this over the whole seed derivation.
 */
export function validateDemandMetadata(meta = {}) {
  const errs = [];
  const boolOrNull = (v) => v === null || v === undefined || v === true || v === false;
  if (!(meta.position == null || POSITION_VALUES.has(meta.position))) errs.push(`position:${meta.position}`);
  if (!(meta.gripDemand == null || GRIP_VALUES.has(meta.gripDemand))) errs.push(`gripDemand:${meta.gripDemand}`);
  if (!(meta.balanceDemand == null || BALANCE_VALUES.has(meta.balanceDemand))) errs.push(`balanceDemand:${meta.balanceDemand}`);
  for (const f of ['floorAccess', 'overheadPosition', 'unilateralLoadable', 'bilateralUpper', 'bilateralLower', 'axialLoad', 'impact', 'weightBearingHands']) {
    if (!boolOrNull(meta[f])) errs.push(`${f}:${meta[f]}`);
  }
  // Contradictions (the legal-combination table): impact needs a standing
  // base; a standing movement cannot REQUIRE floor access; lying/seated
  // cannot be a high-balance demand. (Standing + supported IS legal -
  // support rails exist.)
  if (meta.impact === true && (meta.position === DEMAND_POSITION.SEATED || meta.position === DEMAND_POSITION.LYING)) {
    errs.push('impact_while_seated_or_lying');
  }
  if (meta.floorAccess === true && meta.position === DEMAND_POSITION.STANDING) {
    errs.push('floor_access_while_standing');
  }
  if (meta.balanceDemand === DEMAND_BALANCE.HIGH
    && (meta.position === DEMAND_POSITION.LYING || meta.position === DEMAND_POSITION.SEATED)) {
    errs.push('high_balance_while_lying_or_seated');
  }
  return errs;
}
