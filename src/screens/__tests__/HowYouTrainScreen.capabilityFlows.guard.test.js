/**
 * CC33 W4 D112 R4/R6 - source-level regression guards for HowYouTrainScreen's
 * capability-flow wave (repo convention: fs.readFileSync + regex/string
 * assertions - no screen in this codebase renders via React Testing
 * Library; see capabilityW5.suspensionAndReview.test.js and
 * capabilityPlanRewrite.test.js's own "source wiring" blocks for the same
 * pattern this suite follows).
 *
 * What this pins, one describe block per audit finding:
 *  - T2-05: the Apply preview stays wired to the fixed computation and
 *    keeps the honest substituted/omitted copy pattern (the DATA fix
 *    itself lives in sessionEffective.planEffectiveSummary.test.js).
 *  - T2-23: the third "Choose per exercise" action, the per-line list
 *    format, the rule-vs-line AND semantics, and the standing revisit
 *    row's exact copy and visibility wiring.
 *  - T1-05: a flare restart proposes again with its own createdIds.
 *  - T1-06: the refresh/focus sync-arrival detector, guarded so it never
 *    double-fires against an explicit proposal.
 *  - T1-04/T1-26: the clinician decline confirm gates BOTH the
 *    whole-group decline and the per-line save, and "Keep it out"
 *    records nothing.
 *  - T2-27: the session-length row's honest copy, no em dash.
 *  - A blanket em-dash scan of both files in this wave's lane - the
 *    eslint no-em-dash rule (eslint.config.js) only matches Literal and
 *    JSXText AST nodes, not TemplateElement, so an em dash inside a
 *    template-literal string would NOT be caught by lint; this closes
 *    that specific gap for the two files this wave touched.
 */
const fs = require('fs');
const path = require('path');

const SCREEN_PATH = path.join(__dirname, '..', 'HowYouTrainScreen.js');
const ENGINE_PATH = path.join(__dirname, '..', '..', 'lib', 'sessionEffective.js');
const screen = fs.readFileSync(SCREEN_PATH, 'utf8');

describe('T2-05 - the Apply preview stays wired to the real computation', () => {
  test('proposeEffectiveDiff calls computePlanEffectiveSummary and keeps the honest parts pattern', () => {
    const fn = screen.match(/const proposeEffectiveDiff = async[\s\S]{0,7200}?\n  };/)?.[0] ?? '';
    expect(fn).toContain('computePlanEffectiveSummary(userId, createdIds)');
    expect(fn).toContain("parts.push(`${summary.substituted} exercise${summary.substituted === 1 ? '' : 's'} swapped for something that works now`)");
    expect(fn).toContain("parts.push(`${summary.omitted} left out with nothing forced in their place`)");
    // Never a fixed "swapped" promise regardless of what was found.
    expect(fn).not.toMatch(/your sessions would show \$\{summary\.affected\}/);
  });
});

describe('T2-23 - per-line Apply/Decline and the standing revisit surface', () => {
  test('the whole-group alert gains a third "Choose per exercise" action, primary flow untouched', () => {
    const fn = screen.match(/const proposeEffectiveDiff = async[\s\S]{0,7200}?\n  };/)?.[0] ?? '';
    expect(fn).toContain("text: 'Not now'");
    expect(fn).toContain("text: 'Apply while it lasts'");
    expect(fn).toContain("text: 'Choose per exercise'");
    expect(fn).toContain('computePlanEffectiveLines(userId, createdIds)');
    expect(fn).toContain('setLineReview({');
  });

  test('the per-line list renders "{from} -> {to}" or an honest no-match line, no em dash', () => {
    expect(screen).toContain('{line.toName ? `${line.fromName} → ${line.toName}` : `${line.fromName}: no close match, stays with a note`}');
  });

  test('the per-line save uses the REPRESENTABLE model, not a flat AND (lead review)', () => {
    // History: the first draft recorded a rule 'applied' only if EVERY
    // line it drives was applied, which silently discarded the user's
    // Apply choices on any mixed save (one axis conflicting across
    // several exercises is the common case). The lead-ruled model:
    //  - self rule: 'applied' if ANY driven line applied (or none driven);
    //  - clinician rule: all-or-nothing (rank 2 is never allowance-carved);
    //  - each kept line whose every driver ended 'applied' mints a
    //    per-exercise allowance, so the keep genuinely holds at serve;
    //  - a failed mint is TOLD to the user, never silently absorbed.
    const fn = screen.match(/const saveLineReview = async[\s\S]{0,4200}?\n  };/)?.[0] ?? '';
    expect(fn).toContain('const driven = review.lines.filter((l) => l.constraintIds.includes(ruleId));');
    expect(fn).toContain('const applied = clinicianRules.has(ruleId)');
    expect(fn).toContain('? driven.every((l) => l.apply)');
    expect(fn).toContain(': (driven.length === 0 || driven.some((l) => l.apply));');
    expect(fn).toContain("recordEffectiveChoice(userId, ruleId, applied ? 'applied' : 'declined')");
    // The allowance mint fires ONLY where serve would otherwise swap the
    // kept line: every driver applied.
    expect(fn).toContain("l.constraintIds.every((id) => choiceFor.get(id) === 'applied');");
    // F6 (adversarial review): EPISODE-SCOPED - the allow row is minted
    // INTO each driving episode's group, so the keep lives exactly as
    // long as the change it answers, never as an unscoped permanent
    // carve that outlives the episode and switches off unrelated
    // baseline rules.
    expect(fn).toContain("role: 'episode', episodeGroupId: groupId, source: 'self',");
    expect(fn).toContain("ruleKind: CONSTRAINT_RULE_KIND.EXERCISE_ALLOW, ruleValue: l.exerciseId,");
    expect(fn).not.toContain("role: 'baseline'");
    // Honest failure: a lost mint means the keep may not hold, and the
    // toast says so instead of claiming success.
    expect(fn).toContain('could not be recorded. It may still be swapped in sessions.');
  });

  test('dismissal (no choice) still records nothing - only the two named buttons write a choice', () => {
    const fn = screen.match(/const proposeEffectiveDiff = async[\s\S]{0,7200}?\n  };/)?.[0] ?? '';
    // Exactly two onPress handlers touch recordEffectiveChoice inside the
    // whole-group alert's own buttons (Not now's declineNow, Apply's
    // inline loop); "Choose per exercise" only opens the list and writes
    // nothing until saveLineReview runs.
    const writes = fn.match(/recordEffectiveChoice\(/g) ?? [];
    expect(writes.length).toBe(2);
  });

  test('the standing revisit row: exact copy, and visible only when there is something to revisit', () => {
    expect(screen).toContain('icon="list-outline"');
    expect(screen).toContain('label="Your plan and how you train"');
    expect(screen).toContain('sub="Review what Volyume works around in your current plan."');
    expect(screen).toContain('onPress={revisitCapabilityPlan}');
    expect(screen).toContain('{canRevisit ? (');
  });

  test('the revisit tap re-runs both proposal paths: undecided episodes, then the baseline rewrite with no ids', () => {
    const fn = screen.match(/const revisitCapabilityPlan = async[\s\S]{0,1100}?\n  };/)?.[0] ?? '';
    expect(fn).toContain('undecidedEpisodeRuleIds(state.episodes)');
    expect(fn).toContain('proposeEffectiveDiff(ids, null)');
    expect(fn).toContain('proposeCapabilityPlanRewrite(null, null)');
    // Lead review: an explicit tap never ends in silence - both propose
    // paths report whether they surfaced anything, and a no-op tap gets
    // the honest line instead of nothing.
    expect(fn).toContain("if (!surfaced) toast.show('Nothing in your current plan needs a decision right now.');");
  });

  test('undecided episode ids exclude held episodes and allowance rows (D112 R8 + F6)', () => {
    const fn = screen.match(/const undecidedEpisodeRuleIds = [\s\S]{0,650}?\.map\(\(r\) => r\.id\)\);/)?.[0] ?? '';
    expect(fn).toContain("r.effectiveChoice == null");
    expect(fn).toContain("r.adaptationMode !== 'hold'");
    expect(fn).toContain('CONSTRAINT_STATE.ACTIVE');
    // F6: a minted keep is a decision already made, never re-proposed.
    expect(fn).toContain('r.ruleKind !== CONSTRAINT_RULE_KIND.EXERCISE_ALLOW');
  });
});

describe('T1-05 - a flare restart proposes again', () => {
  test('confirmRestartEpisode captures the minted createdIds and calls proposeEffectiveDiff', () => {
    const fn = screen.match(/const confirmRestartEpisode = \(row\)[\s\S]{0,3400}?\n  };/)?.[0] ?? '';
    expect(fn).toContain('const createdIds = await writeConstraintRows(rows, now);');
    expect(fn).toContain('if (Array.isArray(createdIds) && createdIds.length) {');
    expect(fn).toContain('proposeEffectiveDiff(createdIds, subject)');
  });
});

describe('T1-06 - synced-in rules and app-relaunch undecided episodes propose on focus', () => {
  test('refresh() detects undecided-and-not-held episode rules and proposes them', () => {
    const fn = screen.match(/const refresh = useCallback\(\(\) => \{[\s\S]{0,2700}?\}, \[userId\]\);/)?.[0] ?? '';
    expect(fn).toContain('const undecidedIds = undecidedEpisodeRuleIds(st.episodes);');
    expect(fn).toContain('proposeEffectiveDiff(undecidedIds, null)');
    // The shared guard: never fires while a proposal is already pending.
    expect(fn).toContain('if (!proposalPendingRef.current) {');
  });

  test('the guard is set synchronously at the top of proposeEffectiveDiff, cleared in finally', () => {
    const fn = screen.match(/const proposeEffectiveDiff = async[\s\S]{0,400}/)?.[0] ?? '';
    expect(fn).toMatch(/const proposeEffectiveDiff = async \(createdIds, subject = null\) => \{\s*\n\s*proposalPendingRef\.current = true;/);
    expect(screen).toContain('} finally {\n      proposalPendingRef.current = false;\n    }');
  });

  test('the shared recoverability mechanism with the standing revisit row (T2-23) is documented', () => {
    const fn = screen.match(/const refresh = useCallback\(\(\) => \{[\s\S]{0,2700}?\}, \[userId\]\);/)?.[0] ?? '';
    expect(fn).toMatch(/SAME recoverability the revisit row offers on demand \(T2-23\)/);
  });
});

describe('T1-04/T1-26 - the clinician decline confirm', () => {
  test('exact copy: title, body and both button labels', () => {
    const fn = screen.match(/const confirmClinicianDecline = \([\s\S]{0,700}?\n  };/)?.[0] ?? '';
    expect(fn).toContain("'A clinician asked for this one'");
    expect(fn).toContain('You told Volyume a clinician asked you to keep ${subject ?? \'this\'} out. Declining means your sessions keep showing it. Volyume will not suggest it elsewhere.');
    expect(fn).toContain("{ text: 'Keep it out', style: 'cancel' }");
    expect(fn).toContain("{ text: 'Decline anyway', style: 'destructive', onPress: onDeclineAnyway }");
  });

  test('"Keep it out" carries no onPress at all - nothing is recorded on that path', () => {
    // A bare { text, style: 'cancel' } object with no onPress key: AppAlert
    // treats a missing onPress as a no-op dismiss (components/AppAlert.js
    // dismiss() only calls onPress if one was supplied).
    expect(screen).toMatch(/\{ text: 'Keep it out', style: 'cancel' \},\s*\n\s*\{ text: 'Decline anyway'/);
  });

  test('gates the whole-group "Not now" decline', () => {
    const fn = screen.match(/const proposeEffectiveDiff = async[\s\S]{0,7200}?\n  };/)?.[0] ?? '';
    expect(fn).toContain('clinicianSourcedIds(userId, createdIds)');
    expect(fn).toContain('if (clinicianIds.size) { confirmClinicianDecline(subject, declineNow); return; }');
  });

  test('gates the per-line "Keep" save path too, not only the whole-group flow', () => {
    const fn = screen.match(/const saveLineReview = async[\s\S]{0,4200}?\n  };/)?.[0] ?? '';
    expect(fn).toContain('const keptClinician = review.lines.some((l) => !l.apply && l.clinician);');
    expect(fn).toContain('if (keptClinician) { confirmClinicianDecline(review.subject, commit); return; }');
  });

  test('suggestion filtering is untouched - no change to the resolver/picker clinician carve', () => {
    // capabilityBlockReason's un-carveable clinician rank (resolve.js) is
    // not part of this screen; this guard simply pins that this wave did
    // not introduce an inline override anywhere in the file.
    expect(screen).not.toMatch(/clinician[\s\S]{0,80}allow.{0,40}override/i);
  });
});

describe('T2-27 - the session-length row stops over-claiming', () => {
  test('exact copy, no em dash, names the next-plan-build truth', () => {
    expect(screen).toContain('sub="Two levers help here: set a session length under Workout and units, which shapes your next plan build, and add a temporary change here for a rough patch."');
    expect(screen).not.toContain('that actually fits under Workout');
  });
});

describe('T1-20 - lanes cross-reference both ways (STOP closed by the lead)', () => {
  // History: the W4A builder STOPPED here rather than adding the link,
  // because AvoidedMovements was registered in only one of the six
  // stacks that mount HowYouTrain and the tap would have silently died
  // in the other five. The lead closed it at the root: the route is now
  // registered alongside HowYouTrain in every stack (RootNavigator), the
  // reachability sweep watches 'AvoidedMovements' as a capability route,
  // and THIS screen carries the preference cross-reference row.
  test('the preference cross-reference row exists, in the lanes\' own words', () => {
    expect(screen).toContain('label="Movements you would rather not do"');
    expect(screen).toContain('sub="Preferences live under Avoided movements, so they never mix with what your body needs."');
    expect(screen).toContain("navigation.navigate('AvoidedMovements')");
  });

  test('the reachability sweep watches the route the row targets', () => {
    const sweep = fs.readFileSync(
      path.join(__dirname, '..', '..', 'navigation', '__tests__', 'capabilityRoutesReachable.test.js'), 'utf8',
    );
    expect(sweep).toContain("'AvoidedMovements'");
  });
});

describe('no em dash in the copy this wave shipped (closes the eslint TemplateElement gap)', () => {
  test.each([
    ['HowYouTrainScreen.js', SCREEN_PATH],
    ['sessionEffective.js', ENGINE_PATH],
  ])('%s contains no U+2014 em dash anywhere', (_name, file) => {
    const src = fs.readFileSync(file, 'utf8');
    expect(src).not.toMatch(/—/);
  });
});
