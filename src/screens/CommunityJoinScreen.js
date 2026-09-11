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
 */

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import TextField from '../components/TextField';
import SectionLabel from '../components/SectionLabel';
import Chip from '../components/Chip';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
import PrivacyReceipt from '../components/community/PrivacyReceipt';
import GymPicker from '../components/community/GymPicker';
import GymDetailSheet from '../components/community/GymDetailSheet';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing, type, iconSize, withAlpha, alpha } from '../styles/theme';
import { AVATAR_PRESETS } from '../lib/profileAvatarPresets';
import { setGyms, venueLine } from '../lib/gyms';
import {
  isValidHandle, checkHandle, upsertProfile, DISPLAY_NAME_MAX,
  COMMUNITY_RULES_VERSION, currentUserId,
  TP_DEFAULT_SHARE, loadTrainingProfile, readShareSettings, writeShareSettings,
  syncTrainingProfile, publishConsistency, publishSharingSettings, shareablePayload, previewLine,
  SESSIONS_AUDIENCE_VALUES, SESSIONS_AUDIENCE_LABELS,
  COMMUNITY_DISCIPLINE_KEYS, COMMUNITY_DISCIPLINE_LABELS, MAX_DISCIPLINES_PER_PROFILE,
  listMyGroups, COMMUNITY_RULES_SUMMARY,
  suggestHandle, readOnboardingChoice, clearOnboardingChoice, readPendingJoin, clearPendingJoin,
} from '../lib/community';
import { bandRows, NOT_ENOUGH_LINE, NOTHING_SHARED_LINE } from './CommunityTrainingProfileScreen';

// Same debounce the food search uses, for the same reason: a live check
// per keystroke is a request per keystroke.
const HANDLE_DEBOUNCE_MS = 250;

// 30-IMPLEMENTATION.md 1.2: "Add another gym you train at" (up to three,
// same finder as the main gym), the same cap CommunityEditProfileScreen
// uses for the identical field.
const MAX_OTHER_GYMS = 3;

const HANDLE_HINT = 'Use 3 to 20 letters, numbers or underscores.';
export const HANDLE_OFFLINE_HINT = 'Could not check that handle. You are offline.';
export const HANDLE_UNAVAILABLE_HINT = 'Could not check that handle just now. Try again.';

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  handle_taken: 'That handle is taken. Try another.',
  handle_invalid: HANDLE_HINT,
  content_not_allowed: 'That wording is not allowed here. Try different words.',
  rate_limited: 'That is a lot of changes for one day. Try again tomorrow.',
  invalid_input: 'Check the handle and name, then try again.',
};

export default function CommunityJoinScreen({ navigation, route }) {
  const t = useTheme();
  const toast = useToast();
  // F12 fix: `loading` (renamed `meLoading`) gates the "Under 18" copy
  // below -- `emptyMe()` now defaults `is_minor` to true (unknown means
  // minor until the server says otherwise), so an adult's FIRST render,
  // before this resolves, must not show minor-specific copy about them.
  const { me, loading: meLoading, refresh } = useCommunityMe();
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
  const [tpLoading, setTpLoading] = useState(true);
  const uid = currentUserId();

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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mine = await listMyGroups();
        if (alive) setHasGroups(mine.length > 0);
      } catch (_e) {
        if (alive) setHasGroups(true);
      }
    })();
    return () => { alive = false; };
  }, []);

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
    setTpShare(settings);
    await writeShareSettings(uid, settings);
  }

  const tpPreview = previewLine(shareablePayload(tpBands ?? {}, tpShare));

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
    && displayName.trim().length > 0 && !busy;

  const create = useCallback(async () => {
    if (!canCreate) return;
    setBusy(true);
    try {
      await upsertProfile({
        handle: handle.trim().toLowerCase(),
        display_name: displayName.trim(),
        avatar_preset: preset,
        visibility,
        discipline_keys: disciplineKeys,
        // Passed explicitly as well as by the client library: creating the
        // profile IS the consent record, so the version being accepted is
        // stated at the call site rather than only inside the transport.
        accept_rules_version: COMMUNITY_RULES_VERSION,
      });
      // Best effort: the training profile bands (and, if switched on here,
      // the consistency counters) are sent through the same publish paths
      // the Training profile screen uses, forced/computed so the choices
      // made on this step take immediately rather than waiting for
      // tomorrow's throttle window or the next foreground trigger.
      syncTrainingProfile(uid, { force: true }).catch(() => { /* best effort */ });
      if (tpShare.consistency) publishConsistency(uid).catch(() => { /* best effort */ });
      // Phase 3: "Share what I did" and its audience, chosen on this same
      // step, go through the separate community_upsert_profile call
      // (publishSharingSettings) rather than syncTrainingProfile above.
      // Belt and braces: a minor never gets an audience beyond followers
      // (the Chip row is never shown to one, so this is unreachable via
      // the UI, but the server-side force is not the only guard).
      if (tpShare.share_sessions) {
        const sharing = isMinor ? { ...tpShare, sessions_audience: 'followers' } : tpShare;
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
    uid, primaryGym, otherGyms, tpShare, disciplineKeys, isMinor,
  ]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Join Community" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PrivacyReceipt />

        <View style={styles.field}>
          <TextField
            label="Handle"
            value={handle}
            onChangeText={(v) => setHandle(v.replace(/\s/g, '').toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            size="sm"
            accessibilityLabel="Handle"
          />
          <Text style={[styles.hint, { ...t.type.caption, color: handleTone }]}>{handleLine}</Text>
        </View>

        <TextField
          label="Name"
          value={displayName}
          onChangeText={(v) => setDisplayName(v.slice(0, DISPLAY_NAME_MAX))}
          size="sm"
          accessibilityLabel="Display name"
        />

        <View style={styles.field}>
          <SectionLabel>Avatar</SectionLabel>
          <View style={styles.presets}>
            {AVATAR_PRESETS.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => setPreset(p.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: preset === p.key }}
                accessibilityLabel={p.label}
              >
                <ProfileAvatarMark
                  presetKey={p.key}
                  displayName={displayName || 'Athlete'}
                  size={40}
                  selected={preset === p.key}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          {gymStep === 'picking' ? (
            <>
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
            </>
          ) : gymStep === 'skipped' ? (
            <>
              <SectionLabel>Where do you train?</SectionLabel>
              <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
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
            </>
          ) : (
            <>
              {/* Founder brief (gym finder): "Your main gym", gym name, town
                  and outward code, small "Change gym" - the user never
                  wonders whether it saved. */}
              <SectionLabel>Your main gym</SectionLabel>
              <Card style={styles.gymRow}>
                <View style={styles.gymBody}>
                  <Text
                    style={[styles.tpLabel, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {venueLine(primaryGym).primary}
                  </Text>
                  {[primaryGym.town, primaryGym.outward].filter(Boolean).join(' · ') ? (
                    <Text
                      style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {[primaryGym.town, primaryGym.outward].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <Button
                  variant="tertiary"
                  size="sm"
                  fullWidth={false}
                  title="Change gym"
                  onPress={() => setGymStep('picking')}
                  accessibilityLabel="Change gym"
                />
              </Card>
              <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
                Only the gym you choose. Never your location. Can be added later from Edit profile.
              </Text>

              <SectionLabel>Other gyms</SectionLabel>
              <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
                {`Up to ${MAX_OTHER_GYMS} more gyms you train at.`}
              </Text>
              {otherGyms.map((venue) => (
                <Card key={venue.id} style={styles.gymRow}>
                  <Text
                    style={[styles.tpLabel, { ...t.type.body, color: t.colors.textPrimary, flex: 1 }]}
                    numberOfLines={1}
                  >
                    {venueLine(venue).primary}
                  </Text>
                  <Pressable
                    onPress={() => setOtherGyms((prev) => prev.filter((g) => g.id !== venue.id))}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${venueLine(venue).primary}`}
                  >
                    <Ionicons name="close" size={iconSize.sm} color={t.colors.textMuted} />
                  </Pressable>
                </Card>
              ))}
              {otherGyms.length < MAX_OTHER_GYMS ? (
                addingOtherGym ? (
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
                )
              ) : null}
            </>
          )}
        </View>

        <View style={styles.field}>
          <SectionLabel>What do you train for?</SectionLabel>
          <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
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
        </View>

        <View style={styles.field}>
          <SectionLabel>Who can follow you</SectionLabel>
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
          <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
            {visibility === 'public' && !isMinor
              ? 'Anyone signed in can follow you and see what you post.'
              : 'You approve every follower before they see what you post.'}
          </Text>
          {/* F12 fix: never shown until `me` has genuinely loaded --
              `isMinor` alone defaults true (unknown means minor) and
              would otherwise flash this at an adult on first render. */}
          {!meLoading && isMinor ? (
            <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textSecondary }]}>
              Under 18: your profile is followers-only and does not appear in search.
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <SectionLabel>Your training profile</SectionLabel>
          <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            Worked out on your phone from your last twelve weeks of finished sessions. Only the ones you switch on are shared, and never anything more detailed than a band.
          </Text>

          <Card style={styles.tpPreview}>
            <Text style={[styles.tpPreviewLabel, { ...t.type.caption, color: t.colors.textMuted }]}>
              What other people would see
            </Text>
            <Text style={[styles.tpPreviewLine, { ...t.type.body, color: t.colors.textPrimary }]}>
              {tpPreview || NOTHING_SHARED_LINE}
            </Text>
          </Card>

          {bandRows(tpBands, me)
            .filter((row) => !(isMinor && (row.key === 'age_band' || row.key === 'consistency')))
            .map((row) => {
              const isShareSessions = row.key === 'share_sessions';
              return (
                <Fragment key={row.key}>
                  <View style={styles.tpRow}>
                    <View style={styles.tpBody}>
                      <Text style={[styles.tpLabel, { ...t.type.body, color: t.colors.textPrimary }]}>
                        {row.label}
                      </Text>
                      <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                        {row.value || row.empty || NOT_ENOUGH_LINE}
                      </Text>
                    </View>
                    <Switch
                      value={!!tpShare[row.key]}
                      onValueChange={(next) => toggleBand(row.key, next)}
                      disabled={tpLoading}
                      accessibilityLabel={`Share ${row.label.toLowerCase()}`}
                      trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
                      thumbColor={t.colors.primary}
                      ios_backgroundColor={t.colors.surface2}
                    />
                  </View>
                  {/* Nothing exists to remove yet at Join (the profile is
                      not created until "Create profile" below), so
                      turning this off here is a plain local toggle --
                      the Remove/Keep confirm belongs to the Training
                      profile screen, which is the only place the toggle
                      can ever be switched off with items already shared
                      behind it. */}
                  {isShareSessions && tpShare.share_sessions ? (
                    isMinor ? (
                      <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
                        Shared with people who follow you.
                      </Text>
                    ) : (
                      <>
                        <View style={styles.chipRow} accessibilityLabel="Who sees what you did">
                          {SESSIONS_AUDIENCE_VALUES.map((value) => (
                            <Chip
                              key={value}
                              label={SESSIONS_AUDIENCE_LABELS[value]}
                              selected={tpShare.sessions_audience === value}
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
                          <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.textMuted }]}>
                            You are not in any groups yet.
                          </Text>
                        )}
                      </>
                    )
                  ) : null}
                </Fragment>
              );
            })}
        </View>

        <Button
          variant="emphatic"
          title="Create profile"
          disabled={!canCreate}
          loading={busy}
          onPress={create}
          accessibilityLabel="Create my Community profile"
        />

        <Card surface="surface2" radius="md" padding="md" style={styles.block}>
          <Text style={[styles.blockTitle, { ...t.type.captionStrong, color: t.colors.textPrimary }]}>
            Four rules
          </Text>
          {COMMUNITY_RULES_SUMMARY.map((line) => (
            <Text key={line} style={[styles.rule, { ...t.type.caption, color: t.colors.textSecondary }]}>
              {line}
            </Text>
          ))}
        </Card>

        <Button
          variant="secondary"
          size="sm"
          fullWidth={false}
          title="Community rules and contact"
          onPress={() => navigation.navigate('CommunityRules')}
          accessibilityLabel="Read the Community rules and contact"
        />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  block: { gap: spacing.xs },
  blockTitle: { ...type.captionStrong, color: colors.textPrimary },
  rule: { ...type.caption, color: colors.textSecondary },
  field: { gap: spacing.sm },
  hint: { ...type.caption, color: colors.textMuted },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  gymBody: { flex: 1, gap: spacing.xxs },
  tpPreview: { gap: spacing.xxs },
  tpPreviewLabel: { ...type.caption, color: colors.textMuted },
  tpPreviewLine: { ...type.body, color: colors.textPrimary },
  tpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tpBody: { flex: 1, gap: spacing.xxs },
  tpLabel: { ...type.body, color: colors.textPrimary },
});
