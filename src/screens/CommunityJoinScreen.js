/**
 * CommunityJoinScreen (blueprint sections 2, 6; SD-04, SD-05; discovery
 * blueprint `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md`
 * section 3; SD-22, SD-26)
 *
 * Nobody is in Community until they choose a handle and accept the
 * Community rules here. Creating the profile is what records the
 * `community_visibility` consent row, so the rules and the privacy
 * receipt are both on this screen, above the one committing action.
 *
 * The handle check is live: valid shape first (nothing is asked of the
 * server until the shape is right), then availability. A check that could
 * not RUN says so and leaves Create available, so joining offline ends in
 * a refusal that names the reason rather than a button that never lights
 * up. Under 18, the
 * server forces followers-only and keeps the profile out of search and
 * suggestions; the note says so before anyone commits.
 *
 * The training profile step (SD-22): the bands derived from the person's
 * own last twelve weeks of training are shown with their toggles and a
 * preview line before "Create profile", so sharing any of it is an
 * explicit act rather than something the profile inherits by default. The
 * toggles reuse `bandRows` from the Training profile screen, which is
 * also where the SAME preview line is built, so the two screens can never
 * say different things about what would be shared.
 *
 * The person's age (D228 addendum Q3-A): an unknown age is treated as under
 * 18 (D212), and that stays. What changed is that the unknown is no longer
 * silent. While `me` has not answered, or the body profile (which carries the
 * date of birth) has not reached the server, the screen says "Loading your
 * details" in place of the follow choice and the sharing rows and holds
 * "Create profile". If the age could not be put on the server, or read back
 * from it (or the wait runs out), the screen says that, in one line, and
 * keeps the safe defaults: sharing off, followers only. A person the server
 * has read as under 18 from a date it was just sent sees what they always
 * did.
 *
 * Nothing here reads the date of birth: no Community file may (the privacy
 * guard names it). The server computes `is_minor` from the cloud copy of the
 * body profile, so the screen sends that row (`ensureBodyProfilePushed`, the
 * same push every profile write already makes) and asks `me` again; the push
 * landing and the read succeeding is what lets an answer of "under 18" be
 * believed.
 */

import { Fragment, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import TextField from '../components/TextField';
import Chip from '../components/Chip';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
import PrivacyReceipt from '../components/community/PrivacyReceipt';
import Band, { BandGap, BandBody } from '../components/community/Band';
import SectionHeader from '../components/community/SectionHeader';
import EntryRow from '../components/community/EntryRow';
import SwitchRow from '../components/community/SwitchRow';
import GymPicker from '../components/community/GymPicker';
import GymDetailSheet from '../components/community/GymDetailSheet';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { spacing, iconSize } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import { AVATAR_PRESETS } from '../lib/profileAvatarPresets';
import { setGyms, venueLine } from '../lib/gyms';
import {
  isValidHandle, checkHandle, upsertProfile, DISPLAY_NAME_MAX,
  COMMUNITY_RULES_VERSION, currentUserId, hasProfile,
  TP_DEFAULT_SHARE, loadTrainingProfile, readShareSettings, writeShareSettings,
  syncTrainingProfile, publishConsistency, publishSharingSettings, shareablePayload, previewLine,
  SESSIONS_AUDIENCE_VALUES, SESSIONS_AUDIENCE_LABELS,
  COMMUNITY_DISCIPLINE_KEYS, COMMUNITY_DISCIPLINE_LABELS, MAX_DISCIPLINES_PER_PROFILE,
  listMyGroups, COMMUNITY_RULES_SUMMARY,
  suggestHandle, readOnboardingChoice, clearOnboardingChoice, readPendingJoin, clearPendingJoin,
  ensureBodyProfilePushed,
} from '../lib/community';
import { bandRows, NOT_ENOUGH_LINE, NOTHING_SHARED_LINE } from './CommunityTrainingProfileScreen';
import { RESTRICTION_REFUSALS } from '../lib/community/restriction';

// Same debounce the food search uses, for the same reason: a live check
// per keystroke is a request per keystroke.
const HANDLE_DEBOUNCE_MS = 250;

// 30-IMPLEMENTATION.md 1.2: "Add another gym you train at" (up to three,
// same finder as the main gym), the same cap CommunityEditProfileScreen
// uses for the identical field.
const MAX_OTHER_GYMS = 3;

const HANDLE_HINT = 'Use 3 to 20 letters, numbers or underscores.';
export const HANDLE_OFFLINE_HINT = 'Could not check that username. You are offline.';
export const HANDLE_UNAVAILABLE_HINT = 'Could not check that username just now. Try again.';

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  ...RESTRICTION_REFUSALS,
  handle_taken: 'That username is taken. Try another.',
  handle_invalid: HANDLE_HINT,
  content_not_allowed: 'That wording is not allowed here. Try different words.',
  rate_limited: 'That is a lot of changes for one day. Try again tomorrow.',
  invalid_input: 'Check the username and name, then try again.',
};

// D228 addendum Q3-A. The longest the screen waits for the person's age
// before it stops saying "Loading" and says it could not read it. The
// `useCommunityMe` hook has no timeout of its own, so the wait is set here.
export const AGE_WAIT_MS = 8000;
export const AGE_LOADING_LINE = 'Loading your details';
export const AGE_UNKNOWN_LINE = 'Your age has not reached Community yet, so sharing starts off and your profile is followers only. You can change both once it has.';

/**
 * Which of three states the person's age is in on this screen (D228
 * addendum Q3-A). Pure. It reads no date of birth: the server's answer
 * (`is_minor`) is the only age fact, and what this adds is whether that
 * answer can be believed.
 *
 *   'known'    nothing new is shown. Either the server answered adult (it
 *              only does from a real date of birth), or it answered under
 *              18 AFTER this screen put the body profile on the cloud and
 *              read `me` back without a failure, so that answer came from a
 *              date it holds.
 *   'loading'  `me` has not answered, or the push-then-read has not finished.
 *   'unknown'  the server says under 18 but the body profile could not be
 *              confirmed on the cloud, or the read back failed, or the wait
 *              ran out: the answer may be the server's fail-closed default
 *              for an absent date, not a fact about this person. The safe
 *              defaults stay, and the screen says so.
 *
 * It never returns an adult layout without a server answer of adult.
 *
 * @param {{me: object, meLoading: boolean, meError: (string|null),
 *   settle: ({pushed: boolean}|null), expired: boolean}} input `settle` is
 *   null until the push-then-read has finished, then says whether the body
 *   profile row was confirmed on the cloud; `expired` once the wait is over.
 * @returns {'known'|'loading'|'unknown'}
 */
export function joinAgeState({ me, meLoading, meError, settle, expired }) {
  if (me?.is_minor === false) return 'known';
  if (!expired && (meLoading || !settle)) return 'loading';
  if (settle?.pushed && !meError) return 'known';
  return 'unknown';
}

export default function CommunityJoinScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  // F12 fix: `loading` (renamed `meLoading`) gates the "Under 18" copy
  // below -- `emptyMe()` now defaults `is_minor` to true (unknown means
  // minor until the server says otherwise), so an adult's FIRST render,
  // before this resolves, must not show minor-specific copy about them.
  const { me, loading: meLoading, error: meError, refresh } = useCommunityMe();
  const next = route?.params?.next ?? null;

  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [preset, setPreset] = useState(AVATAR_PRESETS[0].key);
  const [visibility, setVisibility] = useState('public');
  // The gym finder (gym database blueprint 20-BLUEPRINT.md, GD-14;
  // 30-IMPLEMENTATION.md 1.2): optional here, never a blocker on creating
  // the profile. `gymStep` starts 'picking' (nothing chosen yet at join
  // time) and moves to 'picked' (summary row + Change) once a venue is
  // selected, or 'skipped' on an explicit "Not now" - distinct from
  // simply never having opened the finder, so the copy can say so rather
  // than looking like an unfinished step.
  const [primaryGym, setPrimaryGym] = useState(null);
  const [gymStep, setGymStep] = useState('picking');
  const [otherGyms, setOtherGyms] = useState([]);
  const [addingOtherGym, setAddingOtherGym] = useState(false);
  // Discipline picker (communities revamp 2026-09-10, blueprint section 3,
  // 9's Join step): optional, up to three, self-chosen, never a blocker
  // on creating the profile -- the same "optional, capped" pattern the
  // training styles picker on Edit profile already uses.
  const [disciplineKeys, setDisciplineKeys] = useState([]);
  function toggleDiscipline(key) {
    setDisciplineKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_DISCIPLINES_PER_PROFILE) return prev;
      return [...prev, key];
    });
  }
  // Community product audit 2026-09-07 (gym finder brief): every tapped
  // gym row opens GymDetailSheet before it is ever selected, whichever of
  // the two pickers below it came from; `pendingGym.commit` is the ONE
  // thing that differs between the two (set the primary gym vs. add to
  // the other-gyms list), so one sheet instance serves both.
  const [pendingGym, setPendingGym] = useState(null); // { venue, commit } | null
  function requestGymConfirm(venue, commit) { setPendingGym({ venue, commit }); }
  // 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'unknown'
  // 'unknown' is the check that could not RUN (offline, or a read that did
  // not answer). It is not a refusal: Create stays available so `create()`
  // can surface the real reason, rather than a screen that can never be
  // tapped and never says why (product review 2026-09-06, item 20).
  const [handleState, setHandleState] = useState('idle');
  const [checkFailure, setCheckFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const checkRef = useRef(0);

  const isMinor = !!me?.is_minor;

  // The training profile step (SD-22): derived once from the person's own
  // device, with the same defaults the Training profile screen starts
  // from (sessions, staple lifts and experience on; days, time bands and
  // age band off).
  const [tpBands, setTpBands] = useState(null);
  const [tpShare, setTpShare] = useState(TP_DEFAULT_SHARE);
  // D212 (ICO Children's Code standard 7, high privacy by default): for a
  // person under 18, or whose age is not known yet (`isMinor` fails closed
  // while `me` loads), "Share what I did" reads OFF until they switch it
  // on themselves. An adult keeps the founder's default, on (D194).
  const [shareChosen, setShareChosen] = useState(false);
  const [tpLoading, setTpLoading] = useState(true);
  const uid = currentUserId();

  // D228 addendum Q3-A: the age is awaited, never assumed. `ageSettle` is
  // null until the body profile has been sent and `me` read again (or found
  // not to need it), then says whether the row was confirmed on the cloud;
  // `ageWaitOver` caps the wait (AGE_WAIT_MS).
  const [ageSettle, setAgeSettle] = useState(null);
  const [ageWaitOver, setAgeWaitOver] = useState(false);
  const ageState = joinAgeState({
    me,
    // Only the first load is waited for: a later re-read (on focus) must not
    // put a settled screen back into loading.
    meLoading: meLoading && !ageSettle,
    meError,
    settle: ageSettle,
    expired: ageWaitOver,
  });
  const ageLoading = ageState === 'loading';
  const ageUnknown = ageState === 'unknown';
  const ageRun = useRef({ started: false, busy: false, mounted: true });
  const latestMe = useRef(me);
  latestMe.current = me;

  useEffect(() => {
    const run = ageRun.current;
    run.mounted = true;
    return () => { run.mounted = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setAgeWaitOver(true), AGE_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // The server reads the date of birth from the CLOUD copy of the body
  // profile (D159), so when `me` does not already say adult the row is sent
  // first and `me` is then read again from the server. Never concurrent with
  // the hook's own first load (this starts after it), so a slow first answer
  // cannot land on top of the fresh one. Failures are not errors here: what
  // the push returned and whether the read failed are the state's inputs.
  const settleAge = useCallback(async () => {
    const run = ageRun.current;
    if (run.busy) return;
    run.busy = true;
    let pushed = false;
    try {
      if (latestMe.current?.is_minor !== false) {
        try {
          pushed = !!(await ensureBodyProfilePushed(uid, { force: true }));
        } catch (_e) { pushed = false; /* never throws in practice; false is the honest answer */ }
        await refresh(true);
      }
    } catch (_e) { /* the hook reports its own failures as a code; the state copes */ } finally {
      run.busy = false;
      // A push that once landed stays landed: a later re-read (on focus,
      // perhaps offline) cannot turn a confirmed age back into "unknown".
      if (run.mounted) setAgeSettle((prev) => ({ pushed: pushed || !!prev?.pushed }));
    }
  }, [uid, refresh]);

  useEffect(() => {
    if (meLoading || ageRun.current.started) return;
    ageRun.current.started = true;
    settleAge();
  }, [meLoading, settleAge]);

  // Coming back to this screen (from the rules, the gym finder) asks again,
  // so an age that has reached the server meanwhile replaces the line without
  // a retry button. Silent: it never puts a settled screen back to loading.
  const rereadAge = useRef(null);
  rereadAge.current = () => {
    if (!ageRun.current.started) return undefined;
    return settleAge();
  };
  useEffect(() => {
    const off = navigation?.addListener?.('focus', () => { rereadAge.current?.(); });
    return typeof off === 'function' ? off : undefined;
  }, [navigation]);

  // F5 fix: same as the Training profile screen -- "My groups" is a
  // doomed, silent choice with no groups to post to. Starts enabled and
  // fails open to enabled on a read failure; only a positive empty list
  // disables it.
  const [hasGroups, setHasGroups] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [bands, settings] = await Promise.all([
          loadTrainingProfile(uid),
          readShareSettings(uid),
        ]);
        if (!alive) return;
        setTpBands(bands);
        setTpShare(settings);
      } catch (_e) {
        // The derivation reads the device only, so a failure here is not a
        // network story: the step still shows the toggles, which stay the
        // truth about what would be shared (nothing, until switched on).
        if (alive) setTpBands(null);
      } finally {
        if (alive) setTpLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [uid]);

  // A member-only read. For the ordinary visitor to this screen, a person
  // with no profile yet, the server can only answer no_profile and the
  // truthful answer is already known: no groups (a group needs a profile).
  // So the question is asked only once a profile exists (Sentry VOLYUME-36).
  const joined = hasProfile(me);
  useEffect(() => {
    let alive = true;
    if (!joined) { setHasGroups(false); return undefined; }
    (async () => {
      try {
        const mine = await listMyGroups();
        if (alive) setHasGroups(mine.length > 0);
      } catch (_e) {
        if (alive) setHasGroups(true);
      }
    })();
    return () => { alive = false; };
  }, [joined]);

  // Communities revamp 2026-09-10 (onboarding join, spec section 4.4): a
  // pending join from a failed onboarding completion pre-fills the
  // handle, name and gym here instead of anything below, and is cleared
  // the moment this screen's own "Create profile" succeeds (this screen
  // supersedes the queue). With nothing pending, a person who chose
  // "Not now" at onboarding gets their gym and name back, and an empty
  // handle is offered a server suggestion that runs through the SAME
  // live check as a typed one -- a failure here simply leaves the field
  // exactly as it was.
  useEffect(() => {
    let alive = true;
    (async () => {
      const pending = await readPendingJoin(uid);
      if (!alive) return;
      if (pending) {
        if (pending.handle) setHandle(pending.handle);
        if (pending.displayName) setDisplayName(pending.displayName);
        // Only a venue with its name pre-selects: an id alone would
        // render a nameless gym row (fresh-eyes review N3).
        if (pending.gymId && pending.gym) { setPrimaryGym(pending.gym); setGymStep('picked'); }
        return;
      }
      const choice = await readOnboardingChoice(uid);
      if (!alive) return;
      if (choice?.gym) { setPrimaryGym(choice.gym); setGymStep('picked'); }
      if (choice?.displayName) setDisplayName(choice.displayName);
      if (!handle) {
        try {
          const suggestion = await suggestHandle();
          // Functional form, deliberately: the request is in flight for a
          // moment, and a handle the person typed WHILE it was must never
          // be overwritten by a now-stale suggestion (the same guard
          // ProOnboardingScreen's identical suggestion effect uses).
          if (alive && suggestion?.handle) setHandle((h) => (h ? h : suggestion.handle));
        } catch (_e) { /* failure: unchanged behaviour, the field stays as it was */ }
      }
    })();
    return () => { alive = false; };
    // Mount only, deliberately: `handle` is read for its value AT MOUNT
    // (always '' on a fresh screen); re-running this whenever it changes
    // would fight the person's own typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function toggleBand(key, next) {
    const settings = { ...tpShare, [key]: next };
    if (key === 'share_sessions') setShareChosen(true);
    setTpShare(settings);
    await writeShareSettings(uid, settings);
  }

  // What the step shows and what "Create profile" sends (D212 above).
  const effectiveShare = useMemo(
    () => (isMinor && !shareChosen ? { ...tpShare, share_sessions: false } : tpShare),
    [isMinor, shareChosen, tpShare],
  );

  const tpPreview = previewLine(shareablePayload(tpBands ?? {}, effectiveShare));

  useEffect(() => {
    const trimmed = handle.trim().toLowerCase();
    if (!trimmed) { setCheckFailure(null); setHandleState('idle'); return undefined; }
    if (!isValidHandle(trimmed)) { setCheckFailure(null); setHandleState('invalid'); return undefined; }
    setCheckFailure(null);
    setHandleState('checking');
    const seq = checkRef.current + 1;
    checkRef.current = seq;
    const timer = setTimeout(async () => {
      try {
        const free = await checkHandle(trimmed);
        // Request-id guard: a slower earlier check must not overwrite a
        // newer answer (the food search's own pattern).
        if (checkRef.current !== seq) return;
        setCheckFailure(null);
        setHandleState(free ? 'available' : 'taken');
      } catch (e) {
        if (checkRef.current !== seq) return;
        setCheckFailure(e?.code === 'offline' ? 'offline' : 'unavailable');
        setHandleState('unknown');
      }
    }, HANDLE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [handle]);

  const handleLine = {
    idle: HANDLE_HINT,
    invalid: HANDLE_HINT,
    checking: 'Checking',
    available: 'Available',
    taken: 'Taken',
    unknown: checkFailure === 'offline' ? HANDLE_OFFLINE_HINT : HANDLE_UNAVAILABLE_HINT,
  }[handleState];

  const handleTone = handleState === 'available'
    ? t.colors.success
    : (handleState === 'taken' || handleState === 'invalid' ? t.colors.error : t.colors.textMuted);

  // A check that could not run does not block the one committing action:
  // `create()` is what knows the truth, and its refusals (REFUSALS.offline,
  // handle_taken) say what actually happened.
  const canCreate = (handleState === 'available' || handleState === 'unknown')
    && displayName.trim().length > 0 && !busy
    // D228 addendum Q3-A: nothing is sent while the person's age is still
    // being read.
    && !ageLoading;

  const create = useCallback(async () => {
    if (!canCreate) return;
    setBusy(true);
    try {
      await upsertProfile({
        handle: handle.trim().toLowerCase(),
        display_name: displayName.trim(),
        avatar_preset: preset,
        // D228 addendum Q3-A: followers only is what the server makes of a
        // minor, and of an age it does not hold; it is sent as that, never
        // as a "public" choice the person was not shown.
        visibility: isMinor ? 'followers' : visibility,
        discipline_keys: disciplineKeys,
        // Passed explicitly as well as by the client library: creating the
        // profile IS the consent record, so the version being accepted is
        // stated at the call site rather than only inside the transport.
        accept_rules_version: COMMUNITY_RULES_VERSION,
        // The person's own "Share what I did" choice travels WITH the
        // create, on or off (D212). Since migration 184 an omitted value
        // on a new profile is stored as on, so a choice of off that was
        // only ever published when on would have been overridden. The
        // chosen audience travels with it too (D228): followers for a
        // minor, never everyone, which the server refuses from one; the
        // follow-up publishSharingSettings below stays as before.
        share_sessions: !!effectiveShare.share_sessions,
        sessions_audience: isMinor ? 'followers' : effectiveShare.sessions_audience,
      });
      // Best effort: the training profile bands (and, if switched on here,
      // the consistency counters) are sent through the same publish paths
      // the Training profile screen uses, forced/computed so the choices
      // made on this step take immediately rather than waiting for
      // tomorrow's throttle window or the next foreground trigger.
      syncTrainingProfile(uid, { force: true }).catch(() => { /* best effort */ });
      if (effectiveShare.consistency) publishConsistency(uid).catch(() => { /* best effort */ });
      // Phase 3: "Share what I did" and its audience, chosen on this same
      // step, go through the separate community_upsert_profile call
      // (publishSharingSettings) rather than syncTrainingProfile above.
      // Belt and braces: a minor never gets an audience beyond followers
      // (the Chip row is never shown to one, so this is unreachable via
      // the UI, but the server-side force is not the only guard).
      if (effectiveShare.share_sessions) {
        const sharing = isMinor ? { ...effectiveShare, sessions_audience: 'followers' } : effectiveShare;
        publishSharingSettings(uid, sharing).catch(() => { /* best effort */ });
      }
      // Optional (GD-14), and best effort the same way: the profile itself
      // is already created, and a gym can always be added later from the
      // profile editor. The profile's place is populated server-side from
      // the main gym's town the moment community_set_gyms lands (1.1 B).
      if (primaryGym?.id) {
        setGyms(primaryGym.id, otherGyms.map((g) => g.id)).catch(() => { /* can be added later */ });
      }
      await refresh(true);
      // This screen supersedes any pending join once its own create has
      // won (spec section 4.4): best effort, the create itself has
      // already succeeded above.
      clearPendingJoin(uid).catch(() => { /* best effort */ });
      // And the remembered "Skip for now" choice, which has no expiry of
      // its own (fresh-eyes review N4).
      clearOnboardingChoice(uid).catch(() => { /* best effort */ });
      toast.show('Your profile is live');
      if (next?.screen) navigation.replace(next.screen, next.params ?? {});
      else navigation.goBack();
    } catch (e) {
      toast.show(REFUSALS[e?.code] ?? 'Could not create your profile just now.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [
    canCreate, handle, displayName, preset, visibility, next, navigation, refresh, toast,
    uid, primaryGym, otherGyms, effectiveShare, disciplineKeys, isMinor,
  ]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Join Community" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PrivacyReceipt inBand />
        <BandGap />

        <Band>
          <SectionHeader title="About you" />
          <BandBody>
            <TextField
              label="Username"
              value={handle}
              onChangeText={(v) => setHandle(v.replace(/\s/g, '').toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              size="sm"
              well
              accessibilityLabel="Username"
            />
            <Text style={[t.type.caption, { color: handleTone }]}>{handleLine}</Text>
            <TextField
              label="Name"
              value={displayName}
              onChangeText={(v) => setDisplayName(v.slice(0, DISPLAY_NAME_MAX))}
              size="sm"
              well
              accessibilityLabel="Display name"
            />
          </BandBody>
        </Band>
        <BandGap />

        <Band>
          <SectionHeader title="Avatar" />
          <BandBody>
            <View style={styles.presets}>
              {AVATAR_PRESETS.map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => setPreset(p.key)}
                  style={styles.preset}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: preset === p.key }}
                  accessibilityLabel={p.label}
                >
                  <ProfileAvatarMark
                    presetKey={p.key}
                    displayName={displayName || 'Athlete'}
                    size={AVATAR_PICK}
                    selected={preset === p.key}
                  />
                </Pressable>
              ))}
            </View>
          </BandBody>
        </Band>
        <BandGap />

        {gymStep === 'picking' ? (
          <Band>
            <BandBody style={styles.pickBody}>
              <GymPicker
                navigation={navigation}
                header
                onSelect={(venue) => requestGymConfirm(
                  venue,
                  (v) => { setPrimaryGym(v); setGymStep('picked'); },
                )}
              />
              <Button
                variant="tertiary"
                size="sm"
                fullWidth={false}
                title="Not now"
                onPress={() => setGymStep('skipped')}
                accessibilityLabel="Skip choosing a gym for now"
              />
            </BandBody>
          </Band>
        ) : gymStep === 'skipped' ? (
          <Band>
            <SectionHeader title="Where do you train?" />
            <BandBody>
              <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>
                Not chosen yet. You can add this any time from Edit profile.
              </Text>
              <Button
                variant="tertiary"
                size="sm"
                fullWidth={false}
                title="Choose a gym"
                onPress={() => setGymStep('picking')}
                accessibilityLabel="Choose a gym"
              />
            </BandBody>
          </Band>
        ) : (
          <>
            {/* Founder brief (gym finder): "Your main gym", gym name, town
                and outward code, small "Change gym" - the user never
                wonders whether it saved. */}
            <Band>
              <SectionHeader title="Your main gym" />
              <EntryRow
                icon="business-outline"
                title={venueLine(primaryGym).primary}
                subtitle={[primaryGym.town, primaryGym.outward].filter(Boolean).join(' · ') || undefined}
                accessibilityLabel={`Your main gym, ${venueLine(primaryGym).primary}`}
                trailing={(
                  <Button
                    variant="tertiary"
                    size="sm"
                    fullWidth={false}
                    title="Change gym"
                    onPress={() => setGymStep('picking')}
                    accessibilityLabel="Change gym"
                  />
                )}
              />
              <BandBody style={styles.noteBody}>
                <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>
                  Only the gym you choose. Never your location. Can be added later from Edit profile.
                </Text>
              </BandBody>
            </Band>
            <BandGap />

            <Band>
              <SectionHeader title="Other gyms" />
              <BandBody style={styles.noteBody}>
                <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>
                  {`Up to ${MAX_OTHER_GYMS} more gyms you train at.`}
                </Text>
              </BandBody>
              {otherGyms.map((venue) => (
                <EntryRow
                  key={venue.id}
                  icon="business-outline"
                  title={venueLine(venue).primary}
                  trailing={(
                    <Pressable
                      onPress={() => setOtherGyms((prev) => prev.filter((g) => g.id !== venue.id))}
                      style={styles.removeGym}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${venueLine(venue).primary}`}
                    >
                      <Ionicons name="close" size={iconSize.sm} color={t.colors.textMuted} />
                    </Pressable>
                  )}
                />
              ))}
              {otherGyms.length < MAX_OTHER_GYMS ? (
                <BandBody style={styles.noteBody}>
                  {addingOtherGym ? (
                    <GymPicker
                      navigation={navigation}
                      onSelect={(venue) => requestGymConfirm(venue, (v) => {
                        setOtherGyms((prev) => (prev.some((g) => g.id === v.id) ? prev : [...prev, v]));
                        setAddingOtherGym(false);
                      })}
                    />
                  ) : (
                    <Button
                      variant="tertiary"
                      size="sm"
                      fullWidth={false}
                      title="Add another gym you train at"
                      onPress={() => setAddingOtherGym(true)}
                      accessibilityLabel="Add another gym you train at"
                    />
                  )}
                </BandBody>
              ) : null}
            </Band>
          </>
        )}
        <BandGap />

        <Band>
          <SectionHeader title="What do you train for?" />
          <BandBody>
            <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>
              Optional. Helps people like you find you.
            </Text>
            <View style={styles.chipRow} accessibilityLabel="What do you train for?">
              {COMMUNITY_DISCIPLINE_KEYS.map((key) => (
                <Chip
                  key={key}
                  label={COMMUNITY_DISCIPLINE_LABELS[key]}
                  selected={disciplineKeys.includes(key)}
                  accessibilityRole="checkbox"
                  onPress={() => toggleDiscipline(key)}
                />
              ))}
            </View>
          </BandBody>
        </Band>
        <BandGap />

        <Band>
          <SectionHeader title="Who can follow you" />
          <BandBody>
            {ageLoading ? (
              /* D228 addendum Q3-A: not the under-18 layout, not the adult
                 one: the choice appears when the age is known. */
              <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>{AGE_LOADING_LINE}</Text>
            ) : (
              <>
                {/* An under-18 profile is followers-only, server-side. A control
                    that cannot change anything is not offered: the note carries
                    the reason instead (product review 2026-09-06). */}
                {isMinor ? null : (
                  <View style={styles.chipRow} accessibilityLabel="Who can follow you">
                    <Chip
                      label="Anyone"
                      selected={visibility === 'public'}
                      onPress={() => setVisibility('public')}
                      accessibilityRole="radio"
                    />
                    <Chip
                      label="People I approve"
                      selected={visibility === 'followers'}
                      onPress={() => setVisibility('followers')}
                      accessibilityRole="radio"
                    />
                  </View>
                )}
                <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>
                  {visibility === 'public' && !isMinor
                    ? 'Anyone signed in can follow you and see what you post.'
                    : 'You approve every follower before they see what you post.'}
                </Text>
                {ageUnknown ? (
                  /* D228 addendum Q3-A: the age could not be read, which is
                     not the same as being under 18, so it is not said as
                     that. One line, above the sharing rows below. */
                  <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>{AGE_UNKNOWN_LINE}</Text>
                ) : (
                  <>
                    {/* F12 fix: never shown until `me` has genuinely loaded --
                        `isMinor` alone defaults true (unknown means minor) and
                        would otherwise flash this at an adult on first render. */}
                    {!meLoading && isMinor ? (
                      <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
                        Under 18: your profile is followers-only and does not appear in search.
                      </Text>
                    ) : null}
                  </>
                )}
              </>
            )}
          </BandBody>
        </Band>
        <BandGap />

        <Band>
          <SectionHeader title="Your training profile" />
          <BandBody>
            <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
              Worked out on your phone from your last twelve weeks of finished sessions. Only the ones you switch on are shared, and never anything more detailed than a band.
            </Text>
            {ageLoading ? (
              <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>{AGE_LOADING_LINE}</Text>
            ) : (
              <View style={styles.preview}>
                <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
                  What other people would see
                </Text>
                <Text style={[t.type.body, { color: t.colors.textPrimary }]}>
                  {tpPreview || NOTHING_SHARED_LINE}
                </Text>
              </View>
            )}
          </BandBody>

          {(ageLoading ? [] : bandRows(tpBands, me))
            .filter((row) => !(isMinor && (row.key === 'age_band' || row.key === 'consistency')))
            .map((row) => {
              const isShareSessions = row.key === 'share_sessions';
              return (
                <Fragment key={row.key}>
                  <SwitchRow
                    title={row.label}
                    subtitle={row.value || row.empty || NOT_ENOUGH_LINE}
                    value={!!effectiveShare[row.key]}
                    onValueChange={(next) => toggleBand(row.key, next)}
                    disabled={tpLoading}
                    accessibilityLabel={`Share ${row.label.toLowerCase()}`}
                  />
                  {/* Nothing exists to remove yet at Join (the profile is
                      not created until "Create profile" below), so
                      turning this off here is a plain local toggle --
                      the Remove/Keep confirm belongs to the Training
                      profile screen, which is the only place the toggle
                      can ever be switched off with items already shared
                      behind it. */}
                  {isShareSessions && effectiveShare.share_sessions ? (
                    isMinor ? (
                      <BandBody style={styles.noteBody}>
                        <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>
                          Shared with people who follow you.
                        </Text>
                      </BandBody>
                    ) : (
                      <BandBody style={styles.noteBody}>
                        <View style={styles.chipRow} accessibilityLabel="Who sees what you did">
                          {SESSIONS_AUDIENCE_VALUES.map((value) => (
                            <Chip
                              key={value}
                              label={SESSIONS_AUDIENCE_LABELS[value]}
                              selected={effectiveShare.sessions_audience === value}
                              onPress={() => toggleBand('sessions_audience', value)}
                              accessibilityRole="radio"
                              disabled={value === 'groups' && !hasGroups}
                            />
                          ))}
                        </View>
                        {/* F5 fix: "My groups" with nobody to post to is
                            a doomed, silent choice -- say so rather than
                            letting it look like a working option. */}
                        {hasGroups ? null : (
                          <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>
                            You are not in any groups yet.
                          </Text>
                        )}
                      </BandBody>
                    )
                  ) : null}
                </Fragment>
              );
            })}
        </Band>
        <BandGap />

        <Band>
          <SectionHeader title="Four rules" />
          <BandBody>
            {COMMUNITY_RULES_SUMMARY.map((line) => (
              <Text key={line} style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
                {line}
              </Text>
            ))}
            <Button
              variant="secondary"
              size="sm"
              fullWidth={false}
              title="Community rules and contact"
              onPress={() => navigation.navigate('CommunityRules')}
              accessibilityLabel="Read the Community rules and contact"
            />
          </BandBody>
        </Band>
        <BandGap />

        <Band>
          <BandBody style={styles.createBody}>
            <Button
              variant="emphatic"
              title="Create profile"
              disabled={!canCreate}
              loading={busy}
              onPress={create}
              accessibilityLabel="Create my Community profile"
            />
          </BandBody>
        </Band>
      </ScrollView>

      <GymDetailSheet
        visible={!!pendingGym}
        venue={pendingGym?.venue ?? null}
        onClose={() => setPendingGym(null)}
        onConfirm={(venue) => { pendingGym?.commit?.(venue); setPendingGym(null); }}
      />
    </SafeAreaView>
  );
}

// D221 V5: the avatar picker sits at the profile hero size, with a 48 dp
// target around each mark.
const AVATAR_PICK = 56;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preset: { minHeight: touchTarget.minimum, minWidth: touchTarget.minimum, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pickBody: { paddingTop: spacing.md },
  noteBody: { paddingBottom: spacing.md, paddingTop: spacing.xs },
  createBody: { paddingTop: spacing.md },
  preview: { gap: spacing.xxs },
  removeGym: { minHeight: touchTarget.minimum, minWidth: touchTarget.minimum, alignItems: 'center', justifyContent: 'center' },
});
