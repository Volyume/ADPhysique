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
 * say different things about what would be shared. "Show which
 * programmes I use" (SD-26) is shown here too, because it decides who can
 * find this person from a programme page from the moment the profile
 * exists.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import TextField from '../components/TextField';
import SectionLabel from '../components/SectionLabel';
import SegmentedControl from '../components/SegmentedControl';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
import PrivacyReceipt from '../components/community/PrivacyReceipt';
import GymPicker from '../components/community/GymPicker';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing, type, withAlpha, alpha } from '../styles/theme';
import { AVATAR_PRESETS } from '../lib/profileAvatarPresets';
import { setGyms, venueLine } from '../lib/gyms';
import {
  isValidHandle, checkHandle, upsertProfile, DISPLAY_NAME_MAX,
  COMMUNITY_RULES_VERSION, currentUserId,
  TP_DEFAULT_SHARE, loadTrainingProfile, readShareSettings, writeShareSettings,
  syncTrainingProfile, shareablePayload, previewLine, setShowProgrammes,
} from '../lib/community';
import { bandRows, NOT_ENOUGH_LINE, NOTHING_SHARED_LINE } from './CommunityTrainingProfileScreen';

// Same debounce the food search uses, for the same reason: a live check
// per keystroke is a request per keystroke.
const HANDLE_DEBOUNCE_MS = 250;

const RULES = [
  'Training talk only.',
  'Be decent to people.',
  'No body-shaming, no diet or calorie talk.',
  'Report what breaks this.',
];

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
  const { me, refresh } = useCommunityMe();
  const next = route?.params?.next ?? null;

  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [preset, setPreset] = useState(AVATAR_PRESETS[0].key);
  const [visibility, setVisibility] = useState('public');
  // The gym picker (gym database blueprint 20-BLUEPRINT.md, GD-14):
  // optional here, never a blocker on creating the profile. `editingGym`
  // starts true (there is nothing selected yet at join time) and flips
  // to a summary row + "Change" once a venue is picked, same pattern as
  // the profile editor.
  const [primaryGym, setPrimaryGym] = useState(null);
  const [editingGym, setEditingGym] = useState(true);
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
  // from (sessions, staple lifts, experience and programme on; days, time
  // bands and age band off).
  const [tpBands, setTpBands] = useState(null);
  const [tpShare, setTpShare] = useState(TP_DEFAULT_SHARE);
  const [tpLoading, setTpLoading] = useState(true);
  const [showProgrammes, setShowProgrammesLocal] = useState(true);
  const uid = currentUserId();

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
        // Passed explicitly as well as by the client library: creating the
        // profile IS the consent record, so the version being accepted is
        // stated at the call site rather than only inside the transport.
        accept_rules_version: COMMUNITY_RULES_VERSION,
      });
      // Best effort, and after the profile exists: "Show which programmes
      // I use" is its own RPC, and the training profile bands are sent
      // through the same sync the Training profile screen uses, forced so
      // the choices made on this step take immediately rather than
      // waiting for tomorrow's throttle window.
      setShowProgrammes(showProgrammes).catch(() => { /* the default already matches */ });
      syncTrainingProfile(uid, { force: true }).catch(() => { /* best effort */ });
      // Optional (GD-14), and best effort the same way: the profile itself
      // is already created, and a gym can always be added later from the
      // profile editor.
      if (primaryGym?.id) {
        setGyms(primaryGym.id, []).catch(() => { /* can be added later */ });
      }
      await refresh(true);
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
    showProgrammes, uid, primaryGym,
  ]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Join Community" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.block}>
          <Text style={[styles.blockTitle, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
            Four rules
          </Text>
          {RULES.map((line) => (
            <Text key={line} style={[styles.rule, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              {line}
            </Text>
          ))}
        </Card>

        <PrivacyReceipt />

        <View style={styles.field}>
          <TextField
            label="Handle"
            value={handle}
            onChangeText={(v) => setHandle(v.replace(/\s/g, '').toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Handle"
          />
          <Text style={[styles.hint, { ...t.type.caption, color: handleTone }]}>{handleLine}</Text>
        </View>

        <TextField
          label="Name"
          value={displayName}
          onChangeText={(v) => setDisplayName(v.slice(0, DISPLAY_NAME_MAX))}
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
                  size={48}
                  selected={preset === p.key}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <SectionLabel>Trains at (optional)</SectionLabel>
          {editingGym ? (
            <GymPicker
              navigation={navigation}
              onSelect={(venue) => { setPrimaryGym(venue); setEditingGym(false); }}
            />
          ) : (
            <Card style={styles.gymRow}>
              <Text
                style={[styles.tpLabel, { ...t.type.bodyStrong, color: t.colors.textPrimary, flex: 1 }]}
                numberOfLines={1}
              >
                {venueLine(primaryGym).primary}
              </Text>
              <Pressable
                onPress={() => setEditingGym(true)}
                accessibilityRole="button"
                accessibilityLabel="Change gym"
              >
                <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.primary }]}>Change</Text>
              </Pressable>
            </Card>
          )}
          <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
            Only the gym you choose. Never your location. Can be added later from Edit profile.
          </Text>
        </View>

        <View style={styles.field}>
          <SectionLabel>Who can follow you</SectionLabel>
          {/* An under-18 profile is followers-only, server-side. A control
              that cannot change anything is not offered: the note carries
              the reason instead (product review 2026-09-06). */}
          {isMinor ? null : (
            <SegmentedControl
              options={[
                { label: 'Anyone', value: 'public' },
                { label: 'People I approve', value: 'followers' },
              ]}
              value={visibility}
              onChange={setVisibility}
              accessibilityLabel="Who can follow you"
            />
          )}
          <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
            {visibility === 'public' && !isMinor
              ? 'Anyone signed in can follow you and see what you post.'
              : 'You approve every follower before they see what you post.'}
          </Text>
          {isMinor ? (
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
            .filter((row) => !(isMinor && row.key === 'age_band'))
            .map((row) => (
              <View key={row.key} style={styles.tpRow}>
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
            ))}

          <View style={styles.tpRow}>
            <View style={styles.tpBody}>
              <Text style={[styles.tpLabel, { ...t.type.body, color: t.colors.textPrimary }]}>
                Show which programmes I use
              </Text>
              <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                Lets people find you on the "People on this programme" list for programmes you use or publish.
              </Text>
            </View>
            <Switch
              value={showProgrammes}
              onValueChange={setShowProgrammesLocal}
              accessibilityLabel="Show which programmes I use"
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
              thumbColor={t.colors.primary}
              ios_backgroundColor={t.colors.surface2}
            />
          </View>
        </View>

        <Button
          variant="emphatic"
          title="Create profile"
          disabled={!canCreate}
          loading={busy}
          onPress={create}
          accessibilityLabel="Create my Community profile"
        />

        <Button
          variant="tertiary"
          title="Community rules and contact"
          onPress={() => navigation.navigate('CommunityRules')}
          accessibilityLabel="Read the Community rules and contact"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  block: { gap: spacing.xs },
  blockTitle: { ...type.bodyStrong, color: colors.textPrimary },
  rule: { ...type.bodySm, color: colors.textSecondary },
  field: { gap: spacing.sm },
  hint: { ...type.caption, color: colors.textMuted },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  tpPreview: { gap: spacing.xxs },
  tpPreviewLabel: { ...type.caption, color: colors.textMuted },
  tpPreviewLine: { ...type.body, color: colors.textPrimary },
  tpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tpBody: { flex: 1, gap: spacing.xxs },
  tpLabel: { ...type.body, color: colors.textPrimary },
});
