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
    const fn = screen.match(/const proposeEffectiveDiff = async[\s\S]{0,9500}?\n  };/)?.[0] ?? '';
    expect(fn).toContain('computePlanEffectiveSummary(userId, createdIds)');
    expect(fn).toContain("parts.push(`${summary.substituted} exercise${summary.substituted === 1 ? '' : 's'} swapped for something that works now`)");
    expect(fn).toContain("parts.push(`${summary.omitted} left out with nothing forced in their place`)");
    // Never a fixed "swapped" promise regardless of what was found.
    expect(fn).not.toMatch(/your sessions would show \$\{summary\.affected\}/);
  });
});

describe('T2-23 - per-line Apply/Decline and the standing revisit surface', () => {
  test('the whole-group alert gains a third "Choose per exercise" action, primary flow untouched', () => {
    const fn = screen.match(/const proposeEffectiveDiff = async[\s\S]{0,9500}?\n  };/)?.[0] ?? '';
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

  test('dismissal (no choice) still records nothing - only named paths write a choice', () => {
    const fn = screen.match(/const proposeEffectiveDiff = async[\s\S]{0,9500}?\n  };/)?.[0] ?? '';
    // Exactly four recordEffectiveChoice sites: Not now's declineNow,
    // Apply's inline loop, (R2-5) the vacuous 'applied' when the
    // proposal finds NOTHING affected - a rule with no decision to make
    // must not sit undecided forever behind a permanent Home ask-row -
    // and (R7-4) the fail-safe path's 'applied', written only AFTER its
    // informational alert has told the user their sessions stay as they
    // are. "Choose per exercise" still opens the list and writes
    // nothing until saveLineReview runs, and dismissing writes nothing.
    const writes = fn.match(/recordEffectiveChoice\(/g) ?? [];
    expect(writes.length).toBe(4);
    expect(fn).toContain("await recordEffectiveChoice(userId, id, 'applied').catch(() => {});");
  });

  test('the standing revisit row: exact copy, and visible only when there is something to revisit', () => {
    expect(screen).toContain('icon="list-outline"');
    expect(screen).toContain('label="Your plan and how you train"');
    expect(screen).toContain('sub="Review what Volyume works around in your current plan."');
    expect(screen).toContain('onPress={revisitCapabilityPlan}');
    expect(screen).toContain('{canRevisit ? (');
  });

  test('the revisit tap: undecided first, then EVERY conversation gathered, then exactly one opened', () => {
    const fn = screen.match(/const revisitCapabilityPlan = async[\s\S]{0,9000}?\n  };/)?.[0] ?? '';
    expect(fn).toContain('undecidedEpisodeRuleIds(state.episodes)');
    expect(fn).toContain('proposeEffectiveDiff(ids, null)');
    // Round 5 (Q-3/J4): one conversation per tap - a surfaced undecided
    // proposal ends the tap, and the rewrite is a chooser entry, never
    // an unconditional second dialogue stacked on the first's result.
    expect(fn).toContain('if (r.surfaced) return;');
    expect(fn).not.toMatch(/surfaced = !!\(await proposeCapabilityPlanRewrite/);
    // Round 4 (F-1): applied rules are revisited per GROUP through the
    // dedicated dialogue, never as a flat union through the apply
    // proposal - the round-3 shape let one cancel-styled tap decline
    // every applied episode at once.
    expect(fn).toContain('reviewAppliedGroup(g.ep, g.appliedIds, g.lines, g.failSafeCount)');
    expect(fn).not.toMatch(/proposeEffectiveDiff\(applied/);
    // Round 5 (R5-6): EVERY group with lines is gathered - the round-4
    // loop broke on the first, and its true no-op cancel meant no tap
    // sequence ever reached the second group. The chooser lists each
    // group and the rewrite. Round 6 (C1): its cancel carries the F-1
    // no-op wording, never "Not now" - which is this same screen's
    // DECLINE on the apply proposal, one state apart.
    expect(fn).toContain('groupChoices.push({ ep, appliedIds, lines, failSafeCount });');
    expect(fn).not.toMatch(/if \(surfaced\) break;/);
    expect(fn).toContain("buttons.push({ text: 'Leave it as it is', style: 'cancel' });");
    expect(fn).not.toContain("buttons.push({ text: 'Not now'");
    expect(fn).toContain('More than one thing to look at');
    // Round 6 (R6-3): the group dialogue speaks in the indicative, so
    // its lines come from serve-gate mode - what serve is DOING, never
    // what applying would do.
    expect(fn).toContain("computePlanEffectiveLines(userId, appliedIds, { serveGate: true })");
    // Round 6 (J4): colliding chooser labels are distinguished by the
    // group's start date - identity in text.
    expect(fn).toContain('const labelCounts = new Map();');
    expect(fn).toContain("toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })");
    // Round 5 (R5-9): the terminal toast tells the truth about failed
    // reads - "could not read" is never spoken as "nothing needs a
    // decision", and a completed quiet check keeps the honest line.
    expect(fn).toContain('? COULD_NOT_READ_TOAST');
    expect(fn).toContain(": 'Nothing in your current plan needs a decision right now.');");
    expect(fn).toContain('if (!checked) { couldNotRead = true; continue; }');
    expect(fn).toContain('if (!rw.checked) couldNotRead = true;');
  });

  test('R6-6: the per-line review\'s empty answer branches on checked - never "nothing to review" off a failed read', () => {
    // One tap after the alert stated "2 exercises swapped...", a failed
    // read used to answer "Nothing to review right now." - a silent
    // fail-open on the copy layer (A15). Both terminal messages share
    // one module constant so the two sites cannot drift.
    expect(screen).toContain("const COULD_NOT_READ_TOAST = 'Volyume could not read your plan just now. Nothing has changed. Try again in a moment.';");
    expect(screen).toContain("toast.show(checked ? 'Nothing to review right now.' : COULD_NOT_READ_TOAST);");
    expect(screen).not.toMatch(/const \{ lines \} = await computePlanEffectiveLines\(userId, createdIds\)/);
  });

  test('R5-9: the focus detector back-off key is stamped only on a COMPLETED check', () => {
    const fn = screen.match(/const proposeEffectiveDiff = async[\s\S]{0,2400}/)?.[0] ?? '';
    // The stamp lives AFTER the summary read, gated on summary.checked -
    // stamped before the read, a failed read blocked the passive
    // detector from retrying the same undecided set for the life of the
    // mounted screen.
    expect(fn).toContain('if (summary.checked) {');
    expect(fn).toContain("lastAutoProposedKeyRef.current = (Array.isArray(createdIds) ? createdIds : []).slice().sort().join(',');");
    const stampIdx = fn.indexOf('lastAutoProposedKeyRef.current =');
    const readIdx = fn.indexOf('computePlanEffectiveSummary(userId, createdIds)');
    expect(readIdx).toBeGreaterThan(-1);
    expect(stampIdx).toBeGreaterThan(readIdx);
    // And the helper reports { surfaced, checked }, never a bare boolean,
    // so the revisit row can tell silence from failure.
    expect(screen).toContain('return { surfaced: false, checked: summary.checked };');
    expect(screen).toContain('return { surfaced: true, checked: true };');
  });

  test('F-1: the applied-group review dialogue - cancel is a TRUE no-op, stopping is explicit and group-scoped', () => {
    const fn = screen.match(/const reviewAppliedGroup = async[\s\S]{0,4200}?\n  };/)?.[0] ?? '';
    expect(fn).toContain("{ text: 'Leave it as it is', style: 'cancel' },");
    // The cancel button carries no onPress at all - looking is not
    // deciding.
    expect(fn).not.toMatch(/'Leave it as it is', style: 'cancel', onPress/);
    expect(fn).toContain("text: 'Stop working around it',");
    expect(fn).toContain("if (clinicianIds.size) { confirmClinicianDecline(subject, stopNow, 'stop'); return; }");
    // Group-scoped: the decline loop runs over appliedIds (this group's
    // own ids), never a cross-episode union.
    expect(fn).toContain('for (const id of appliedIds) {');
    expect(fn).toContain('Keep working around');
    expect(fn).toContain("text: 'Choose per exercise',");
  });

  test('Q-2: the clinician confirm speaks the frame it was reached from - never decline words on a stop or keep', () => {
    // One gate, three frames. Reached from the revisit dialogue's "Stop
    // working around it" it must not answer with "Declining means..." /
    // "Decline anyway" / a "Keep it out" cancel readable as "keep the
    // rule out"; reached from the per-line review's Keep, likewise.
    expect(screen).toContain("const confirmClinicianDecline = (subject, onDeclineAnyway, frame = 'decline') => {");
    expect(screen).toContain("consequence: 'Declining means your sessions keep showing it.',");
    expect(screen).toContain("consequence: 'Stopping means your sessions show it again.',");
    expect(screen).toContain("consequence: 'Keeping it in means your sessions keep showing it.',");
    expect(screen).toContain("cancel: 'Keep working around it',");
    expect(screen).toContain("confirm: 'Stop anyway',");
    expect(screen).toContain("cancel: 'Go back',");
    expect(screen).toContain("confirm: 'Keep it in anyway',");
    // Each caller names its frame: the group review stops, the per-line
    // save keeps, the apply proposal's decline stays the default.
    expect(screen).toContain("confirmClinicianDecline(subject, stopNow, 'stop')");
    expect(screen).toContain("confirmClinicianDecline(review.subject, commit, 'keep')");
    expect(screen).toContain('confirmClinicianDecline(subject, declineNow);');
  });

  test('R7-4/R8-2: the fail-safe case is TOLD everywhere - standalone, MIXED, and on the group review', () => {
    // Round 7 told the case only when nothing else was affected; round
    // 8 made the sentence first-class: one shared, outcome-phrased
    // constant (a fail-safed session's emptiness can be several rules'
    // doing, so it states what happens, never which rule "affects
    // every exercise"), appended to the ordinary proposal and the
    // ordinary group body whenever a fail-safed routine exists, with
    // the dedicated dialogue kept for a group that has ONLY that.
    expect(screen).toContain('const failSafeSentence = (n) => (n === 1');
    expect(screen).toContain("'One of your sessions has nothing left that fits, so it runs as it is, with a quiet note on each affected exercise.'");
    expect(screen).toContain("'Your sessions stay as they are',");
    expect(screen).toContain('if (summary.checked && (summary.failSafeRoutines ?? 0) > 0) {');
    expect(screen).toContain('return { surfaced: true, checked: true };');
    // The MIXED proposal appends the sentence to the ordinary body.
    expect(screen).toContain("${(summary.failSafeRoutines ?? 0) > 0 ? ` ${failSafeSentence(summary.failSafeRoutines)}` : ''}");
    // The group review carries the count whether or not lines exist,
    // and its dedicated fail-safe frame presupposes nothing false.
    expect(screen).toContain('const failSafe = !lines.length && failSafeCount > 0;');
    expect(screen).toContain("? (subject ? `Keep ${subject} applied?` : 'Keep this applied?')");
    expect(screen).toContain("text: 'Stop applying it',");
    expect(screen).toContain("Your plan itself is unchanged.${failSafeCount > 0 ? ` ${failSafeSentence(failSafeCount)}` : ''}");
    // No branch states an attribution the probe disproved.
    expect(screen).not.toContain('this affects every exercise in');
  });

  test('R8-3/R9: no capability-rewrite surface wears "Not now" on a no-op - recursive and write-side-triggered', () => {
    // R7-5's guard read HowYouTrainScreen only, and the identical
    // rewrite alert on PlansScreen kept the decline's word on a cancel
    // that writes nothing. Round 8 swept the two directories; round 9
    // (C1/I6) closed the sweep's own two gaps: it now RECURSES into
    // subdirectories (components/auth, components/food and friends were
    // outside the flat readdir, so a surface moved or created in a
    // folder silently left the sweep) and triggers on the WRITE-side
    // identifiers too (applyCapabilityPlanRewrite, recordEffectiveChoice)
    // so a surface that skips the compute helpers but writes the choice
    // is still swept. __tests__ folders are excluded: pins legitimately
    // quote both the trigger names and the button literal.
    const fs2 = require('fs');
    const path2 = require('path');
    const TRIGGERS = [
      'computeCapabilityPlanRewrite',
      'proposeEffectiveDiff',
      'applyCapabilityPlanRewrite',
      'recordEffectiveChoice',
    ];
    const files = [];
    const walk = (dir) => {
      for (const entry of fs2.readdirSync(dir, { withFileTypes: true })) {
        const full = path2.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') continue;
          walk(full);
        } else if (entry.name.endsWith('.js')) {
          files.push(full);
        }
      }
    };
    walk(path2.join(__dirname, '..', '..', 'screens'));
    walk(path2.join(__dirname, '..', '..', 'components'));
    // The walk really walked: the tree holds 200+ product files today,
    // so a broken path resolving to a near-empty list must fail loudly.
    expect(files.length).toBeGreaterThan(150);
    let sweptAny = false;
    for (const f of files) {
      const src = fs2.readFileSync(f, 'utf8');
      if (!TRIGGERS.some((t) => src.includes(t))) continue;
      sweptAny = true;
      const rel = path2.relative(path2.join(__dirname, '..', '..'), f);
      let idx = src.indexOf("text: 'Not now'");
      while (idx !== -1) {
        const window = src.slice(idx, idx + 500);
        expect({ file: rel, reachesDecline: window.includes('declineNow') })
          .toEqual({ file: rel, reachesDecline: true });
        idx = src.indexOf("text: 'Not now'", idx + 1);
      }
    }
    // The triggers still match real surfaces (a rename that emptied the
    // sweep would otherwise pass vacuously).
    expect(sweptAny).toBe(true);
  });

  test('R7-5: "Not now" appears ONLY on the button that declines - one phrase per meaning', () => {
    // On this screen 'Not now' writes 'declined' against every created
    // rule (the apply proposal). Every other no-op cancel carries the
    // F-1 wording. The plan-rewrite alert's cancel wore the decline's
    // word while writing nothing - the exact blur round 6 renamed the
    // chooser to remove, one alert short.
    const hits = screen.match(/text: 'Not now'/g) ?? [];
    expect(hits).toHaveLength(1);
    const declineIdx = screen.indexOf("text: 'Not now'");
    const declineBlock = screen.slice(declineIdx, declineIdx + 400);
    expect(declineBlock).toContain('declineNow');
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
  test('exact copy: title, body template and the decline frame\'s exact words (round 5, Q-2: frames)', () => {
    const fn = screen.match(/const confirmClinicianDecline = \([\s\S]{0,700}?\n  };/)?.[0] ?? '';
    expect(fn).toContain("'A clinician asked for this one'");
    expect(fn).toContain('You told Volyume a clinician asked you to keep ${subject ?? \'this\'} out. ${words.consequence} Volyume will not suggest it elsewhere.');
    expect(fn).toContain("{ text: words.cancel, style: 'cancel' }");
    expect(fn).toContain("{ text: words.confirm, style: 'destructive', onPress: onDeclineAnyway }");
    // The decline frame keeps its original words verbatim.
    expect(screen).toContain("consequence: 'Declining means your sessions keep showing it.',");
    expect(screen).toContain("cancel: 'Keep it out',");
    expect(screen).toContain("confirm: 'Decline anyway',");
  });

  test('the cancel button carries no onPress at all - nothing is recorded on that path', () => {
    // A bare { text, style: 'cancel' } object with no onPress key: AppAlert
    // treats a missing onPress as a no-op dismiss (components/AppAlert.js
    // dismiss() only calls onPress if one was supplied).
    expect(screen).toMatch(/\{ text: words\.cancel, style: 'cancel' \},\s*\n\s*\{ text: words\.confirm/);
  });

  test('gates the whole-group "Not now" decline', () => {
    const fn = screen.match(/const proposeEffectiveDiff = async[\s\S]{0,9500}?\n  };/)?.[0] ?? '';
    expect(fn).toContain('clinicianSourcedIds(userId, createdIds)');
    expect(fn).toContain('if (clinicianIds.size) { confirmClinicianDecline(subject, declineNow); return; }');
  });

  test('gates the per-line "Keep" save path too, not only the whole-group flow', () => {
    const fn = screen.match(/const saveLineReview = async[\s\S]{0,4200}?\n  };/)?.[0] ?? '';
    expect(fn).toContain('const keptClinician = review.lines.some((l) => !l.apply && l.clinician);');
    expect(fn).toContain("if (keptClinician) { confirmClinicianDecline(review.subject, commit, 'keep'); return; }");
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
