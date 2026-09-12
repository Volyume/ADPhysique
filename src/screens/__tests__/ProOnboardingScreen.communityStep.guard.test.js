/**
 * ProOnboardingScreen.communityStep.guard.test.js — Community at onboarding
 * (founder order 2026-09-11; `docs/communities-revamp-2026-09-10/
 * 25-ONBOARDING-COMMUNITY-SPEC.md` section 4.3; CR-15, D158).
 *
 * What this suite pins and why. The wizard gained step 5, "Your gym": the
 * gym as an answer (a venue or an explicit "none") and the Community
 * profile pre-filled and created by ONE explicit tap beside an equal "Skip
 * for now" ("Not now" is reserved on this screen for the capability
 * decline, R8-3/R9). Written to FAIL if:
 *  - the step disappears, moves, or the wizard's count drifts;
 *  - either answer gains a default (gymChoice / communityJoin must start
 *    null and only a tap may set them: no pre-ticked box, CLAUDE.md
 *    onboarding enforcement and ICO consent guidance);
 *  - the join runs for anything but an explicit 'join', before the plan
 *    block, or after the draft is cleared;
 *  - a minor (under 18, failing closed on an unreadable age) can reach the
 *    step, or the progress count forgets the skipped step;
 *  - the step or the join path reads the email (the handle comes from the
 *    server's own suggestion, never the client);
 *  - the two Community routes the step taps into are not registered in the
 *    onboarding stack (React Navigation drops an unregistered navigate in
 *    silence);
 *  - the copy stops being British English or gains an em dash.
 *
 * Source-level guard (the fs.readFileSync + regex pattern this repo uses for
 * founder-locked rules): the screen pulls the whole SQLite/native import
 * graph, and what needs pinning is textual and structural.
 */
import fs from 'fs';
import path from 'path';

const read = (...segs) => fs.readFileSync(path.join(__dirname, ...segs), 'utf8');
const SRC = read('..', 'ProOnboardingScreen.js');
const NAV = read('..', '..', 'navigation', 'RootNavigator.js');
const DRAFT = read('..', '..', 'lib', 'proOnboardingDraft.js');

function strip(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
const CODE = strip(SRC);
const STEP5 = SRC.slice(SRC.indexOf('  if (step === 5) {'), SRC.indexOf('// ── Step 6, Injuries & limitations'));
const COMPLETION = SRC.slice(SRC.indexOf('async function advanceFrom8'), SRC.indexOf('// ── Step 1, Create account'));

describe('the wizard has the step, in its place', () => {
  test('eight steps, "Your gym" fifth, between Training week and Injuries', () => {
    expect(SRC).toMatch(/const TOTAL_STEPS = 8;/);
    expect(SRC).toMatch(/const STEP_LABELS = \['Account', 'Baseline', 'Body composition', 'Training week', 'Your gym', 'Injuries & limitations', 'Targets', 'Check-in rhythm'\];/);
    expect(STEP5.length).toBeGreaterThan(0);
    expect(STEP5).toMatch(/title="Where do you train\?"/);
  });

  test('Training week advances into it and it advances into Injuries', () => {
    expect(SRC).toMatch(/emitStepDone\(4\);\s*\n\s*\/\/[^\n]*\n\s*setStep\(skipGymStep \? 6 : 5\);/);
    const fn = SRC.slice(SRC.indexOf('function advanceFrom5(intent)'), SRC.indexOf('// CC28 (section 11.2): the capability step is OPTIONAL'));
    expect(fn).toMatch(/emitStepDone\(5\);\s*setStep\(6\);/);
  });

  test('the draft persists the new answers and its ceiling moved with the wizard', () => {
    expect(SRC).toMatch(/gymVenue, gymChoice, communityHandle, communityDisplayName, communityJoin,\n\s*\};/);
    expect(SRC).toMatch(/str\(a\.communityHandle, setCommunityHandle\);/);
    expect(DRAFT).toMatch(/const MAX_STEP = 7;/);
  });
});

describe('nothing on the step is pre-decided', () => {
  test('the gym and the join decision start null and only a tap sets them', () => {
    expect(SRC).toMatch(/const \[gymChoice, setGymChoice\] = useState\(null\);/);
    expect(SRC).toMatch(/const \[communityJoin, setCommunityJoin\] = useState\(null\);/);
    // Only the step's own actions and the draft restore may set the decision.
    const setters = CODE.match(/setCommunityJoin\([^)]*\)/g) || [];
    for (const call of setters) {
      expect(call).toMatch(/setCommunityJoin\((join \? 'join' : 'later'|'existing'|a\.communityJoin)\)/);
    }
  });

  test('both actions are explicit and equal: Join Community beside Skip for now, neither disabled', () => {
    expect(STEP5).toContain('title="Join Community"');
    expect(STEP5).toContain("onPress={() => advanceFrom5('join')}");
    expect(STEP5).toContain('title="Skip for now"');
    expect(STEP5).toContain("onPress={() => advanceFrom5('later')}");
    // Reserved on this screen for the capability decline (R8-3/R9 guard).
    expect(STEP5).not.toContain('title="Not now"');
    expect(STEP5).not.toMatch(/disabled=\{/);
    expect(STEP5).not.toMatch(/Switch|checked=\{true\}|defaultChecked/);
  });

  test('the gym is optional (founder 2026-09-11): never a gap, either action proceeds without it, and an explicit "none" still exists', () => {
    expect(STEP5).toContain(`title="I don't train at a gym"`);
    expect(STEP5).toContain("onPress={() => { setGymVenue(null); setGymChoice('none'); }}");
    expect(STEP5).toContain('sub="Optional: pick your gym');
    const v = SRC.slice(SRC.indexOf('function validateStep5('), SRC.indexOf('function advanceFrom5(intent)'));
    expect(v).not.toMatch(/gymChoice|gymVenue|errs\.gym/);
    expect(SRC).not.toMatch(/errs\.gym/);
    expect(SRC).toMatch(/surfaceGaps\(errs, \['handle'\], 'group5'/);
  });

  test('the handle and the name are optional too (founder 2026-09-11, "both are optional"): only a typed handle that cannot work is a gap', () => {
    const v = SRC.slice(SRC.indexOf('function validateStep5('), SRC.indexOf('function advanceFrom5(intent)'));
    // A join with an empty handle proceeds (the server suggests one at join
    // time); an empty name proceeds (it falls back to the handle).
    expect(v).toMatch(/if \(join && communityJoin !== 'existing' && communityHandle\.trim\(\)\) \{/);
    expect(v).not.toMatch(/errs\.name|communityDisplayName|Choose a handle|checking/);
    expect(v).toContain("if (communityHandleState === 'invalid') errs.handle = HANDLE_HINT;");
    expect(v).toContain("else if (communityHandleState === 'taken') errs.handle = 'That handle is taken. Try another.';");
    // The empty field says so, and the completion hands a null handle on.
    expect(STEP5).toContain("idle: 'Leave it blank and Volyume picks one for you.',");
    expect(COMPLETION).toContain("const chosenHandle = communityHandle.trim().toLowerCase() || null;");
  });
});

describe('D160 (2026-09-12): the two review notes the lead had held, now built', () => {
  const fn = SRC.slice(SRC.indexOf('function advanceFrom5(intent)'), SRC.indexOf('// CC28 (section 11.2): the capability step is OPTIONAL'));

  test('N1: a Join tap during the live handle check waits for its answer, then gets the same validation', () => {
    expect(SRC).toContain('const [joinHeldForCheck, setJoinHeldForCheck] = useState(false);');
    // The hold comes BEFORE validation, only for a typed handle still being checked.
    const holdAt = fn.indexOf("if (join && communityJoin !== 'existing' && communityHandle.trim() && communityHandleState === 'checking') {");
    const validateAt = fn.indexOf('const errs = validateStep5({ join });');
    expect(holdAt).toBeGreaterThan(-1);
    expect(holdAt).toBeLessThan(validateAt);
    expect(fn.slice(holdAt, validateAt)).toMatch(/setJoinHeldForCheck\(true\);\s*\n\s*return;/);
    // The held tap resumes once the check settles, through the ordinary path.
    expect(SRC).toMatch(/if \(!joinHeldForCheck \|\| communityHandleState === 'checking'\) return;\s*\n\s*setJoinHeldForCheck\(false\);\s*\n\s*advanceFrom5\('join'\);/);
    // The button shows the wait; it is never disabled (the R-guard above).
    expect(STEP5).toContain('loading={joinHeldForCheck}');
    // The field's own line already says what is happening.
    expect(STEP5).toContain("checking: 'Checking that handle.',");
  });

  test('N9: the funnel event carries the wizard numbering as an integer beside the step', () => {
    expect(SRC).toMatch(/const ONBOARDING_WIZARD_VERSION = 2;/);
    expect(SRC).toContain("track(user.id, 'onboarding_step_completed', { step: n, wizard: ONBOARDING_WIZARD_VERSION })");
  });
});

describe('the join runs at completion, explicitly, and never blocks the wizard', () => {
  test('only for an explicit join, after the plan block and before the draft is cleared', () => {
    const joinAt = COMPLETION.indexOf("if (communityJoin === 'join') {");
    const performAt = COMPLETION.indexOf('await performCommunityJoin(user.id, {');
    const planAt = COMPLETION.indexOf('const libraryKit = libraryKitForEquipment(equipment);');
    const clearAt = COMPLETION.indexOf('clearDraft(user.id)');
    expect(joinAt).toBeGreaterThan(planAt);
    expect(performAt).toBeGreaterThan(joinAt);
    expect(clearAt).toBeGreaterThan(performAt);
  });

  test('inside its own try, so a refusal or a throw can never change the sequence or the alert path', () => {
    const block = COMPLETION.slice(COMPLETION.indexOf('if (user?.id && !skipGymStep) {'), COMPLETION.indexOf("logError('ProOnboardingScreen.communityJoin'"));
    expect(block).toMatch(/^\s*try \{/m);
    expect(block).toContain("} else if (communityJoin === 'later') {");
    expect(block).toContain('await rememberOnboardingChoice(user.id, {');
    // An existing member's gym answer is applied with their other gyms
    // kept, and only when they actually picked one (review F2).
    expect(block).toContain("} else if (communityJoin === 'existing' && gymChoice === 'picked' && gymVenue?.id) {");
    expect(block).toContain('await applyOnboardingGym(user.id, gymVenue.id);');
  });

  test('a gap line is rendered once per field: TextField owns it from `error`, and the gym has none', () => {
    expect(STEP5).not.toMatch(/<FieldError message=\{errors5\./);
  });

  test('the profile is created through the shared lib path (the upsert that records consent), never a private RPC', () => {
    expect(SRC).toMatch(/import \{\s*isValidHandle, checkHandle, suggestHandle, performCommunityJoin, rememberOnboardingChoice,\s*applyOnboardingGym, COMMUNITY_RULES_SUMMARY, DISPLAY_NAME_MAX,\s*\} from '\.\.\/lib\/community';/);
    expect(CODE).not.toMatch(/callCommunity|community_upsert_profile|community_set_gyms|community_handle_suggestion/);
  });
});

describe('under 18 there is no Community step', () => {
  test('the age test fails closed and gates the step, the back step, and the count', () => {
    expect(SRC).toMatch(/export function isMinorAnswer\(age\) \{\s*const n = parseInt\(age, 10\);\s*return !Number\.isFinite\(n\) \|\| n < 18;\s*\}/);
    expect(SRC).toMatch(/const skipGymStep = isMinorAnswer\(age\);/);
    expect(SRC).toMatch(/setStep\(skipGymStep \? 6 : 5\);/);
    expect(SRC).toMatch(/setStep\(s => \(s === 6 && skipGymStep \? 4 : s - 1\)\);/);
    expect(SRC).toMatch(/if \(skipGym\) return \{ n: step >= 6 \? step - 2 : step - 1, total: TOTAL_STEPS - 2 \};/);
    expect(SRC).toMatch(/const resumeStep = isMinorAnswer\(a\.age\) && draft\.step === 5 \? 4 : draft\.step;/);
  });

  test('a minor never reaches the join at completion, and the suggestion is never asked for one', () => {
    expect(COMPLETION).toContain('if (user?.id && !skipGymStep) {');
    expect(SRC).toMatch(/if \(step !== 5 \|\| skipGymStep \|\| suggestedRef\.current\) return undefined;/);
  });

  test('every header carries the skip so the visible count is right on every step', () => {
    const headers = SRC.match(/<ProOnboardingHeader\b/g) || [];
    const withSkip = SRC.match(/<ProOnboardingHeader\s*\n\s*step=\{step\} skipGym=\{skipGymStep\}/g) || [];
    expect(headers.length).toBeGreaterThan(7);
    expect(withSkip.length).toBe(headers.length); // every call site, the definition is not a tag
  });
});

describe('the email never enters the step', () => {
  test('no read of the email or the sign-in identity anywhere on the screen for Community', () => {
    expect(CODE).not.toMatch(/user\?\.email|user\.email|\.email\b/);
    expect(STEP5).not.toMatch(/email|appleIdentity|privaterelay/i);
    // The handle arrives from the server's suggestion, once.
    expect(SRC).toMatch(/suggestHandle\(firstName\.trim\(\) \|\| null\)\.then\(\(res\) => \{/);
    expect(SRC).toMatch(/if \(res\.source === 'existing'\) \{/);
  });

  test('the live handle check is the Join screen\'s own shape: shape first, then availability, never blocking', () => {
    expect(SRC).toMatch(/if \(!isValidHandle\(trimmed\)\) \{ setCommunityHandleFailure\(null\); setCommunityHandleState\('invalid'\); return undefined; \}/);
    expect(SRC).toMatch(/const free = await checkHandle\(trimmed\);/);
    expect(SRC).toMatch(/setCommunityHandleState\('unknown'\);/);
  });
});

describe('the routes the step taps into exist in the onboarding stack', () => {
  test('CommunityGymAdd and CommunityRules are registered in ProOnboardingStack', () => {
    const stack = NAV.slice(NAV.indexOf('function ProOnboardingStack()'), NAV.indexOf('</Stack.Navigator>', NAV.indexOf('function ProOnboardingStack()')));
    expect(stack).toMatch(/<Stack\.Screen name="CommunityGymAdd" component=\{CommunityGymAddScreen\}/);
    expect(stack).toMatch(/<Stack\.Screen name="CommunityRules" component=\{CommunityRulesScreen\}/);
    expect(STEP5).toContain("navigation.navigate('CommunityRules')");
  });
});

describe('copy', () => {
  test('British English, no em dash, Community\'s own voice, and the shared rules and receipt', () => {
    expect(STEP5).not.toContain('—');
    expect(STEP5).not.toMatch(/customize|optimize|sign up|automatically/i);
    expect(STEP5).toContain('<PrivacyReceipt />');
    expect(STEP5).toContain('{COMMUNITY_RULES_SUMMARY.map((line) => (');
    expect(STEP5).toContain('Only training facts are ever shared: never your body, your food or your location.');
    expect(STEP5).toContain('Only the gym you choose. Never your location.');
  });
});
