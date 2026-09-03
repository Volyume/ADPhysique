/**
 * capability/addFlow.js - the add flow's pure core (flow audit 2026-09-03,
 * ruling D133).
 *
 * "How you train" used to stage its add flow as a card that replaced its
 * own button mid-page: no title, no step count, no Back on eight of nine
 * stages, no Cancel, a readback that restated only the rule labels, and a
 * plan decision that arrived afterwards as a modal nobody had been told
 * was coming. The audit (docs/how-you-train-usability-audit-2026-09-03/
 * AUDIT.md, section 1.1) traced all of it. This module holds everything
 * about that flow that is a FACT rather than a pixel, so the wizard screen
 * (HowYouTrainAddScreen) renders it and a test can walk it without a
 * device:
 *
 *  - the ordered steps for a given draft (planSteps), so "Step 3 of 6"
 *    is computed, never hand-counted, and shrinks honestly when an
 *    answer removes a stage;
 *  - what each answer means in the person's words (summaryLines), so
 *    the check step restates EVERY decision - what, permanent or
 *    temporary, since when, how long, which side, who asked - not just
 *    the rule labels (ARCHITECTURE section 33.16: one sentence plus
 *    details, never a recitation);
 *  - the rows a draft writes (draftRows), byte-equivalent to the rows
 *    the old inline writeDraft built, so persistence is unchanged;
 *  - the sentence Volyume says on save and what happens next
 *    (savedSentence, whatHappensNext), so the Done step and the card's
 *    status line speak the same words.
 *
 * Laws kept: role is always asked, never inferred (a directory preselect
 * SUGGESTS a role, GC-D1); an allowance is always the user's own call
 * and always baseline; nothing here reads the clock or touches I/O
 * (nowMs and ids are passed in); no diagnosis vocabulary - only the
 * user's own functional words come back out (phrase.js's law).
 */
import { familyLabel } from '../exercise/movementFamily';
import {
  CONSTRAINT_ROLE, CONSTRAINT_SOURCE, CONSTRAINT_RULE_KIND, LATERALITY, demandLabel,
} from './model';
import { isSideCarveable } from './resolve';
import { draftSubjectPhrase, sideBodyPart, sidedRuleLabel } from './phrase';

const DAY_MS = 24 * 60 * 60 * 1000;

export const ADD_STEP = Object.freeze({
  WHAT: 'what',       // which KIND of thing (movement/position, pattern, exercise, always-fine)
  WHICH: 'which',     // the rule content for that kind
  SIDE: 'side',       // only when a chosen demand axis carves by side
  WHEN: 'when',       // how I train generally (baseline) vs temporary (episode)
  SINCE: 'since',     // episode only
  UNTIL: 'until',     // episode only
  CHECK: 'check',     // the full readback; Save lives here
  CONSENT: 'consent', // first save only (Article 9)
  PLAN: 'plan',       // post-save: the current plan's proposed diff, when there is one
  DONE: 'done',       // post-save: what was saved and what happens next
});

export const ADD_KIND = Object.freeze({
  DEMAND: 'demand',
  FAMILY: 'family',
  EXERCISE: 'exercise',
  ALLOW: 'allow',
});

// The kinds offered on the WHAT step, in the order a person meets them.
// Labels are the app's established vocabulary (pinned across the lane by
// capabilityGuards.test.js: "A movement pattern", "A specific exercise",
// "always fine for me"); the details say what each one means in plain words.
export const KIND_OPTIONS = Object.freeze([
  { kind: ADD_KIND.DEMAND, icon: 'body-outline', label: 'A movement or position', detail: 'Standing work, overhead positions, gripping a bar, and so on.' },
  { kind: ADD_KIND.FAMILY, icon: 'repeat-outline', label: 'A movement pattern', detail: 'A whole pattern, like overhead pressing or squatting.' },
  { kind: ADD_KIND.EXERCISE, icon: 'barbell-outline', label: 'A specific exercise', detail: 'Volyume builds around that one exercise.' },
  { kind: ADD_KIND.ALLOW, icon: 'checkmark-circle-outline', label: 'An exercise that is always fine for me', detail: 'Keep it in, even where your other answers would leave it out.' },
]);

export const ROLE_OPTIONS = Object.freeze([
  { role: CONSTRAINT_ROLE.BASELINE, icon: 'body-outline', label: 'How I train generally', detail: 'Part of your normal setup. Full progression and coaching, no special labels.' },
  { role: CONSTRAINT_ROLE.EPISODE, icon: 'time-outline', label: 'Temporary, for now', detail: 'Volyume takes it as a passing change and helps you build back up when it ends.' },
]);

export const START_CHOICES = Object.freeze([
  { key: 'today', label: 'Today', days: 0 },
  { key: 'week', label: 'About a week ago', days: 7 },
  { key: 'fortnight', label: 'About two weeks ago', days: 14 },
]);

export const END_CHOICES = Object.freeze([
  { key: 'open', label: 'Until I end it', detail: 'Volyume keeps working around it until you say it has passed.', days: null },
  { key: 'week', label: 'About a week', detail: 'Volyume checks with you around then.', days: 7 },
  { key: 'fortnight', label: 'About two weeks', detail: 'Volyume checks with you around then.', days: 14 },
  { key: 'month', label: 'About a month', detail: 'Volyume checks with you around then.', days: 30 },
]);

/** A fresh draft. `preselect` is the GC-D1 suggestion shape
 *  ({ kind, axes, families, exerciseNames, from }); exercise names are
 *  resolved by the screen against the library (applyPreselect). */
export function emptyDraft(preselect = null) {
  return {
    kind: preselect?.kind ?? null,
    axes: [...(preselect?.axes ?? [])],
    families: [...(preselect?.families ?? [])],
    exercises: [],
    side: null,
    // Always asked (GC-D1). A directory profile's kind is only a suggestion,
    // carried on `from` so the WHEN step can pre-select it, never skip it.
    role: null,
    startDays: 0,
    endDays: null,
    clinician: false,
    from: preselect?.from ?? null,
    preselected: !!(preselect && preselect.kind),
  };
}

/**
 * D133 slice D: a draft rebuilt from the live rows of a permanent rule or
 * an episode group, so "Change this" opens the wizard on the check step
 * with every line filled in and changeable. The full path stays on the
 * plan (preselected: false) so a Change link lands on a numbered step.
 * `nameOf(exerciseId)` resolves exercise names from the library; a row
 * whose name cannot be resolved is still carried, labelled by the screen.
 */
export function draftFromRows(rows = [], { nowMs, nameOf = () => null, groupId = null } = {}) {
  const live = rows.filter((r) => !r.state || r.state === 'active');
  const first = live[0] ?? null;
  const kindOf = (rk) => (rk === CONSTRAINT_RULE_KIND.DEMAND ? ADD_KIND.DEMAND
    : rk === CONSTRAINT_RULE_KIND.FAMILY ? ADD_KIND.FAMILY
      : rk === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW ? ADD_KIND.ALLOW : ADD_KIND.EXERCISE);
  const kind = first ? kindOf(first.ruleKind) : null;
  const axes = live.filter((r) => r.ruleKind === CONSTRAINT_RULE_KIND.DEMAND).map((r) => r.ruleValue);
  const families = live.filter((r) => r.ruleKind === CONSTRAINT_RULE_KIND.FAMILY).map((r) => r.ruleValue);
  const exercises = live
    .filter((r) => r.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE || r.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW)
    .map((r) => ({ id: r.ruleValue, name: nameOf(r.ruleValue) ?? 'An exercise' }));
  const sided = live.find((r) => r.laterality);
  const carves = axes.some((a) => isSideCarveable(CONSTRAINT_RULE_KIND.DEMAND, a));
  const side = sided ? sided.laterality : (carves ? 'both' : null);
  const role = kind === ADD_KIND.ALLOW ? CONSTRAINT_ROLE.BASELINE : (first?.role ?? null);
  const starts = live.map((r) => r.startsAt).filter(Number.isFinite);
  const ends = live.map((r) => r.endsAt).filter(Number.isFinite);
  const startDays = starts.length && Number.isFinite(nowMs) ? Math.max(0, Math.round((nowMs - Math.min(...starts)) / DAY_MS)) : 0;
  const endsAt = ends.length ? Math.max(...ends) : null;
  const endDays = endsAt != null && Number.isFinite(nowMs) && endsAt > nowMs ? Math.max(1, Math.round((endsAt - nowMs) / DAY_MS)) : null;
  return {
    kind, axes, families, exercises, side, role, startDays, endDays,
    clinician: live.some((r) => r.source === CONSTRAINT_SOURCE.CLINICIAN_REPORTED),
    from: null,
    preselected: false,
    editing: { ids: live.map((r) => r.id), groupId },
  };
}

/** Resolve a preselect's exercise names against the library, by name,
 *  exactly as the old inline effect did. Unknown names are dropped. */
export function applyPreselect(draft, preselect, library = []) {
  if (!preselect) return draft;
  const exercises = (preselect.exerciseNames ?? [])
    .map((n) => library.find((e) => e.name === n))
    .filter(Boolean)
    .map((e) => ({ id: e.id, name: e.name }));
  return { ...draft, exercises };
}

/** The demand axes in the draft whose resolution a side actually changes. */
export function sidedAxes(draft) {
  return (draft?.axes ?? []).filter((a) => isSideCarveable(CONSTRAINT_RULE_KIND.DEMAND, a));
}

/** Has the WHICH step got an answer for the draft's kind? */
export function whichAnswered(draft) {
  if (!draft?.kind) return false;
  if (draft.kind === ADD_KIND.DEMAND) return draft.axes.length > 0;
  if (draft.kind === ADD_KIND.FAMILY) return draft.families.length > 0;
  return draft.exercises.length > 0;
}

/**
 * The ordered steps for THIS draft, up to and including the last pre-save
 * step. Post-save steps (PLAN, DONE) are appended by the screen once it
 * knows whether the current plan is affected.
 *
 * While the role is still unanswered the longer (temporary) path is
 * assumed, so the count only ever SHRINKS as answers arrive - "Step 3 of
 * 6" becoming "of 4" reads as good news; growing reads as a trap.
 */
export function planSteps(draft, { consented = true } = {}) {
  const steps = [];
  if (!draft.preselected) steps.push(ADD_STEP.WHAT);
  if (!(draft.preselected && whichAnswered(draft))) steps.push(ADD_STEP.WHICH);
  if (sidedAxes(draft).length) steps.push(ADD_STEP.SIDE);
  const allow = draft.kind === ADD_KIND.ALLOW;
  if (!allow) steps.push(ADD_STEP.WHEN);
  const maybeEpisode = !allow && (draft.role === CONSTRAINT_ROLE.EPISODE || draft.role == null);
  if (maybeEpisode) steps.push(ADD_STEP.SINCE, ADD_STEP.UNTIL);
  steps.push(ADD_STEP.CHECK);
  if (!consented) steps.push(ADD_STEP.CONSENT);
  return steps;
}

/** 1-based position of `step` in the draft's plan, with the total. */
export function stepPosition(draft, step, ctx) {
  const steps = planSteps(draft, ctx);
  const index = steps.indexOf(step);
  return { index: index === -1 ? null : index + 1, total: steps.length };
}

export function nextStep(draft, step, ctx) {
  const steps = planSteps(draft, ctx);
  const i = steps.indexOf(step);
  return i === -1 || i === steps.length - 1 ? null : steps[i + 1];
}

export function prevStep(draft, step, ctx) {
  const steps = planSteps(draft, ctx);
  const i = steps.indexOf(step);
  return i <= 0 ? null : steps[i - 1];
}

/** May the person leave this step? (What Continue is gated on.) */
export function canContinue(draft, step) {
  switch (step) {
    case ADD_STEP.WHAT: return !!draft.kind;
    case ADD_STEP.WHICH: return whichAnswered(draft);
    case ADD_STEP.SIDE: return draft.side === LATERALITY.LEFT || draft.side === LATERALITY.RIGHT || draft.side === 'both';
    case ADD_STEP.WHEN: return !!draft.role;
    case ADD_STEP.SINCE: return Number.isFinite(draft.startDays);
    case ADD_STEP.UNTIL: return draft.endDays === null || Number.isFinite(draft.endDays);
    default: return true;
  }
}

/** Has the person changed anything from an empty draft? (Cancel confirm.) */
export function draftTouched(draft) {
  if (!draft) return false;
  return !!(draft.kind || draft.axes.length || draft.families.length || draft.exercises.length
    || draft.side || draft.role || draft.clinician || draft.startDays || draft.endDays != null);
}

/** The side question, in the person's words, for the draft's first
 *  side-carveable axis. Null when no side applies. */
export function sideQuestion(draft) {
  const axis = sidedAxes(draft)[0];
  const part = axis ? sideBodyPart(axis) : null;
  if (!part) return null;
  return {
    question: `Which ${part}?`,
    left: `Left ${part}`,
    right: `Right ${part}`,
    both: `Both ${part}s`,
  };
}

// ── Labels ─────────────────────────────────────────────────────────────

export function whichLabel(draft) {
  if (draft.kind === ADD_KIND.DEMAND) {
    return draft.axes.map((a) => {
      const sided = draft.side && draft.side !== 'both' && isSideCarveable(CONSTRAINT_RULE_KIND.DEMAND, a)
        ? sidedRuleLabel({ ruleValue: a, laterality: draft.side }) : null;
      return sided ?? demandLabel(a);
    }).join(', ');
  }
  if (draft.kind === ADD_KIND.FAMILY) return draft.families.map((f) => familyLabel(f)).join(', ');
  return draft.exercises.map((e) => e.name).join(', ');
}

export function roleLabel(draft) {
  if (draft.kind === ADD_KIND.ALLOW) return 'Always fine for you';
  return draft.role === CONSTRAINT_ROLE.EPISODE ? 'Temporary, for now' : 'How you train generally';
}

export function sinceLabel(days) {
  const c = START_CHOICES.find((x) => x.days === days);
  return c ? c.label : `About ${days} days ago`;
}

export function untilLabel(days) {
  const c = END_CHOICES.find((x) => x.days === days);
  return c ? c.label : `About ${days} days`;
}

// Fixed British short months: toLocaleDateString's en-GB short month is
// "Sep" on some ICU builds and "Sept" on others, and a date a person is
// told to expect must read the same on every device and in every test.
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "17 Sep": a date the person can put in a diary. */
export function shortDate(ms) {
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

/** The exact date "about N days" from now, as the person would say it. */
export function untilDate(endDays, nowMs) {
  if (endDays == null || !Number.isFinite(nowMs)) return null;
  return shortDate(nowMs + endDays * DAY_MS);
}

/**
 * The check step's rows: every decision the person made, restated, each
 * pointing at the step that changes it. Only rows the path actually asked
 * appear (no "Side" row when no side applied).
 */
export function summaryLines(draft, { nowMs } = {}) {
  const lines = [];
  const kindOpt = KIND_OPTIONS.find((k) => k.kind === draft.kind);
  lines.push({ key: 'what', label: kindOpt ? kindOpt.label : 'What', value: whichLabel(draft) || 'Nothing chosen yet', step: draft.preselected && !draft.editing ? null : ADD_STEP.WHICH });
  if (draft.kind === ADD_KIND.ALLOW) {
    lines.push({ key: 'when', label: 'Applies', value: 'Always. It stays part of how you train.', step: null });
  } else if (draft.role === CONSTRAINT_ROLE.EPISODE) {
    const when = untilDate(draft.endDays, nowMs);
    lines.push({
      key: 'when',
      label: 'How long',
      value: draft.endDays == null
        ? 'Temporary, until you end it'
        : `Temporary, ${untilLabel(draft.endDays).toLowerCase()}${when ? ` (around ${when})` : ''}`,
      step: ADD_STEP.UNTIL,
    });
    lines.push({ key: 'since', label: 'Since', value: sinceLabel(draft.startDays), step: ADD_STEP.SINCE });
  } else {
    lines.push({ key: 'when', label: 'How long', value: 'Part of how you train generally', step: ADD_STEP.WHEN });
  }
  const sq = sideQuestion(draft);
  if (sq) {
    lines.push({
      key: 'side',
      label: 'Side',
      value: draft.side === LATERALITY.LEFT ? sq.left : draft.side === LATERALITY.RIGHT ? sq.right : sq.both,
      step: ADD_STEP.SIDE,
    });
  }
  if (draft.kind !== ADD_KIND.ALLOW) {
    lines.push({ key: 'clinician', label: 'A clinician asked for this', value: draft.clinician ? 'Yes' : 'No', step: ADD_STEP.WHICH });
  }
  return lines;
}

/** The rows the draft writes: byte-equivalent to the old inline
 *  writeDraft's mapping (one batch, one transaction, one consent door). */
export function draftRows(draft, { nowMs, groupId }) {
  const isEpisode = draft.role === CONSTRAINT_ROLE.EPISODE && draft.kind !== ADD_KIND.ALLOW;
  const startsAt = nowMs - (draft.startDays ?? 0) * DAY_MS;
  const endsAt = isEpisode && draft.endDays != null ? nowMs + draft.endDays * DAY_MS : null;
  const source = draft.clinician ? CONSTRAINT_SOURCE.CLINICIAN_REPORTED : CONSTRAINT_SOURCE.SELF;
  const role = draft.kind === ADD_KIND.ALLOW ? CONSTRAINT_ROLE.BASELINE : draft.role;
  const base = { role, source, startsAt, endsAt, episodeGroupId: isEpisode ? groupId : null };
  const side = draft.side === 'both' ? null : draft.side;
  return [
    ...(draft.axes ?? []).map((axis) => ({
      ...base,
      ruleKind: CONSTRAINT_RULE_KIND.DEMAND,
      ruleValue: axis,
      laterality: isSideCarveable(CONSTRAINT_RULE_KIND.DEMAND, axis) ? (side ?? null) : null,
    })),
    ...(draft.families ?? []).map((fam) => ({ ...base, ruleKind: CONSTRAINT_RULE_KIND.FAMILY, ruleValue: fam })),
    ...(draft.exercises ?? []).map((ex) => ({
      ...base,
      ruleKind: draft.kind === ADD_KIND.ALLOW ? CONSTRAINT_RULE_KIND.EXERCISE_ALLOW : CONSTRAINT_RULE_KIND.EXERCISE,
      ruleValue: ex.id,
      // An allowance is the user's own call, whatever prompted the rest.
      source: draft.kind === ADD_KIND.ALLOW ? CONSTRAINT_SOURCE.SELF : source,
    })),
  ];
}

/** The subject phrase for the draft, or null when no short honest name exists. */
export function draftSubject(draft) {
  return draftSubjectPhrase(draft);
}

/** What Volyume says once the draft is saved. The same words the old
 *  toast used, so the Done step and the card's status line agree. */
export function savedSentence(draft) {
  const subject = draftSubject(draft);
  const several = (draft.exercises ?? []).length > 1;
  if (draft.kind === ADD_KIND.ALLOW) {
    return subject
      ? `Volyume will keep offering ${subject}, even where your other answers would normally leave ${several ? 'them' : 'it'} out.`
      : 'Volyume will keep offering this exercise, even where your other answers would normally leave it out.';
  }
  if (draft.role === CONSTRAINT_ROLE.EPISODE) {
    return subject
      ? `Volyume will keep ${subject} out of your training for now.`
      : 'Volyume will work around this for now.';
  }
  return subject
    ? `Volyume will build your training around ${subject} from now on.`
    : 'Volyume will build your training around this from now on.';
}

/** Plain sentences for the Done step: what happens next, in order. */
export function whatHappensNext(draft, { nowMs, planDecision = null } = {}) {
  const out = [];
  if (draft.kind === ADD_KIND.ALLOW) {
    out.push('It shows up in your sessions and suggestions like any other exercise.');
    out.push('You can remove this any time under How you train.');
    return out;
  }
  if (planDecision === 'applied') out.push('Your current plan is updated for this from your next session.');
  if (planDecision === 'declined') out.push('Your current plan stays as it is. Affected exercises show a quiet note with a swap shortcut.');
  if (draft.role === CONSTRAINT_ROLE.EPISODE) {
    const when = untilDate(draft.endDays, nowMs);
    out.push(when
      ? `Around ${when}, Volyume asks whether you still need this. Nothing ends until you say so.`
      : 'Volyume keeps working around this until you end it. It never ends it for you.');
    out.push('When it has passed, end it under How you train and training builds back up to your plan.');
  } else {
    out.push('Every new plan and workout is built around this.');
    out.push('You can change or remove it any time under How you train.');
  }
  return out;
}
