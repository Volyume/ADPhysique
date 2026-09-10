/**
 * CommunityEditProfileScreen (blueprint section 6; SD-05; discovery
 * blueprint `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md`
 * section 8; SD-27)
 *
 * Every fact on a Community profile is typed here. Nothing is read from
 * onboarding, the body profile or the engine: the styles, goal, setting,
 * area and gym are choices the user makes for Community and nowhere
 * else.
 *
 * The gym field is a picker over the gym directory (gym database
 * blueprint `docs/gym-database-2026-09-06/20-BLUEPRINT.md`, GD-14), which
 * replaced the old free-text typeahead: "PureGym Motherwell" is the same
 * row every time, never a near-miss retype. A profile from before this
 * campaign that only ever had a typed label (no linked gym_id) still
 * shows that label read-only until the picker replaces it. Up to three
 * "other gyms" can be added alongside the primary one. GD-13: this is
 * still a chosen fact, never a place: the device's own location is never
 * read or stored here.
 *
 * "Training profile" links out to its own screen (bands, toggles, the
 * training partner section) rather than living here: it is a bigger
 * decision than the rest of this form, and it is worth its own screen so
 * the preview line has room to be read before anything is shared.
 *
 * Leaving Community is here too, as the destructive action it is: it
 * withdraws the consent and deletes everything the user authored.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Chip from '../components/Chip';
import TextField from '../components/TextField';
import SectionLabel from '../components/SectionLabel';
import { SkeletonCard, SkeletonRow } from '../components/Skeleton';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
import GymPicker from '../components/community/GymPicker';
import GymDetailSheet from '../components/community/GymDetailSheet';
import PlacePicker from '../components/community/PlacePicker';
import { appAlert } from '../components/AppAlert';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing, type, iconSize, circle } from '../styles/theme';
import { AVATAR_PRESETS } from '../lib/profileAvatarPresets';
import { get as getGym, setGyms, venueLine } from '../lib/gyms';
import {
  upsertProfile, leaveCommunity, COMMUNITY_STYLE_KEYS, COMMUNITY_GOALS,
  COMMUNITY_SETTINGS, MAX_STYLES_PER_PROFILE, DISPLAY_NAME_MAX, BIO_MAX,
  setPlace,
} from '../lib/community';

const MAX_OTHER_GYMS = 3;

const REFUSALS = {
  offline: 'You are offline. Try again when you have a connection.',
  handle_taken: 'That handle is taken. Try another.',
  handle_invalid: 'Use 3 to 20 letters, numbers or underscores.',
  content_not_allowed: 'That wording is not allowed here. Try different words.',
  rate_limited: 'That is a lot of changes for one day. Try again tomorrow.',
  invalid_input: 'Check what you have typed, then try again.',
};

export default function CommunityEditProfileScreen({ navigation }) {
  const t = useTheme();
  const toast = useToast();
  const { me, loading: meLoading, refresh } = useCommunityMe();
  const profile = me?.profile ?? null;

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [preset, setPreset] = useState(AVATAR_PRESETS[0].key);
  const [styleKeys, setStyleKeys] = useState([]);
  const [goal, setGoal] = useState(null);
  const [setting, setSetting] = useState(null);
  // 30-IMPLEMENTATION.md 1.1 B / 1.2: the old "Area" free-text box is
  // replaced by a place PICKER, resolved server-side from text (never a
  // device coordinate). `placeLabel` is what PlacePicker shows;
  // `placeDirty`/`placeQuery` track whether the person changed it THIS
  // session, so Save only calls `setPlace` when there is actually a
  // change to make (its own RPC, same shape as `setGyms` below rather
  // than a field on `upsertProfile`).
  const [placeLabel, setPlaceLabel] = useState(null);
  const [placeDirty, setPlaceDirty] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  // GD-14: the free-text gym label is replaced by a picker over the
  // directory. `primaryGym`/`otherGyms` hold the venue objects the picker
  // returns (at least {id, display_name}); a LEGACY profile (gym_key not
  // starting "gym:") has no gym_id at all, only the free-text
  // `gym_label` it was saved with before this campaign, which is shown
  // read-only via `legacyGymLabel` until the picker replaces it.
  const [primaryGym, setPrimaryGym] = useState(null);
  const [otherGyms, setOtherGyms] = useState([]);
  const [legacyGymLabel, setLegacyGymLabel] = useState(null);
  const [editingPrimaryGym, setEditingPrimaryGym] = useState(false);
  const [addingOtherGym, setAddingOtherGym] = useState(false);
  // Community product audit 2026-09-07 (gym finder brief): every tapped
  // gym row opens GymDetailSheet before it is ever selected (same pattern
  // as CommunityJoinScreen); `pendingGym.commit` is the one thing that
  // differs between the primary-gym picker and the other-gyms picker.
  const [pendingGym, setPendingGym] = useState(null); // { venue, commit } | null
  function requestGymConfirm(venue, commit) { setPendingGym({ venue, commit }); }
  const [visibility, setVisibility] = useState('public');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  // Prefill once the cached profile arrives, and only once: re-running it
  // on every payload refresh would overwrite what the user is typing.
  useEffect(() => {
    if (ready || !profile) return;
    setDisplayName(profile.display_name ?? '');
    setBio(profile.bio ?? '');
    setPreset(profile.avatar_preset ?? AVATAR_PRESETS[0].key);
    setStyleKeys(Array.isArray(profile.styles) ? profile.styles : []);
    setGoal(profile.goal ?? null);
    setSetting(profile.setting ?? null);
    setPlaceLabel(profile.place_label ?? profile.area_label ?? null);
    if (profile.gym_id) {
      setPrimaryGym({ id: profile.gym_id, display_name: profile.gym_label ?? '' });
      setLegacyGymLabel(null);
    } else {
      setPrimaryGym(null);
      setLegacyGymLabel(profile.gym_label ?? null);
    }
    setVisibility(profile.visibility ?? 'public');
    setReady(true);
  }, [profile, ready]);

  // The other gyms are stored as bare ids on the profile; a display name
  // needs its own read, best effort (a gym that fails to load is simply
  // left off the list rather than failing the whole screen).
  useEffect(() => {
    if (!ready) return undefined;
    let alive = true;
    const ids = Array.isArray(profile?.other_gym_ids) ? profile.other_gym_ids : [];
    if (!ids.length) { setOtherGyms([]); return undefined; }
    (async () => {
      const rows = await Promise.all(ids.map((id) => getGym(id).catch(() => null)));
      if (alive) setOtherGyms(rows.filter(Boolean));
    })();
    return () => { alive = false; };
  }, [ready, profile]);

  // The prefill above only carries `{id, display_name}` for the PRIMARY
  // gym (the profile's own stored shape has no town); PlacePicker's "Use
  // my gym's town" shortcut (30-IMPLEMENTATION.md 1.2) needs one. A
  // freshly picked gym (GymPicker's own `onSelect`) already carries the
  // full venue with a `town` key (string or null, never absent), so the
  // guard below only ever runs once, for a gym that came from the
  // profile itself, and best effort: a failed read simply leaves the
  // shortcut absent rather than failing the whole screen.
  useEffect(() => {
    if (!ready || !primaryGym?.id || primaryGym.town !== undefined) return undefined;
    let alive = true;
    getGym(primaryGym.id).then((full) => {
      if (alive && full) {
        setPrimaryGym((prev) => (prev?.id === full.id ? { ...prev, town: full.town } : prev));
      }
    }).catch(() => { /* the shortcut simply stays absent */ });
    return () => { alive = false; };
  }, [ready, primaryGym]);

  function removeOtherGym(id) {
    setOtherGyms((prev) => prev.filter((g) => g.id !== id));
  }

  function toggleStyle(key) {
    setStyleKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_STYLES_PER_PROFILE) return prev;
      return [...prev, key];
    });
  }

  const save = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await upsertProfile({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        avatar_preset: preset,
        styles: styleKeys,
        goal,
        setting,
        visibility,
      });
      // GD-14: the gym is saved through community_set_gyms, not the old
      // area/label gym field above.
      await setGyms(primaryGym?.id ?? null, otherGyms.map((g) => g.id));
      // 30-IMPLEMENTATION.md 1.1 B: the place is its own RPC too, and it
      // already mirrors onto area_label/area_key server-side, so
      // upsertProfile above never carries area_label any more. Only
      // called when the person actually changed it this session.
      if (placeDirty) {
        await setPlace(placeQuery);
      }
      await refresh(true);
      toast.show('Profile saved');
      navigation.goBack();
    } catch (e) {
      toast.show(REFUSALS[e?.code] ?? 'Could not save your profile just now.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [
    busy, displayName, bio, preset, styleKeys, goal, setting, visibility,
    primaryGym, otherGyms, placeDirty, placeQuery, refresh, toast, navigation,
  ]);

  function confirmLeave() {
    appAlert(
      'Leave Community?',
      'Your profile, posts and follows are deleted. Your training, plans and food diary are not touched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCommunity();
              await refresh(true);
              toast.show('You have left Community');
              navigation.popToTop?.();
            } catch (e) {
              toast.show(REFUSALS[e?.code] ?? 'Could not do that just now.', { variant: 'error' });
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Edit profile" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {meLoading ? (
          // First paint: nothing below can render honestly until `me`
          // resolves (the form otherwise flashes its empty defaults,
          // then pops to the real values) -- the real shape is a field
          // stack, so that is what previews it
          // (`docs/rules/styling.md`, "Loading states").
          <View style={styles.skeletonStack}>
            <SkeletonRow />
            {[0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} height={56} />)}
          </View>
        ) : (
          <>
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

        <TextField
          label="Name"
          value={displayName}
          onChangeText={(v) => setDisplayName(v.slice(0, DISPLAY_NAME_MAX))}
          size="sm"
          accessibilityLabel="Display name"
        />

        <TextField
          label="Bio"
          value={bio}
          onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
          multiline
          size="sm"
          accessibilityLabel="Bio"
        />

        <View style={styles.field}>
          <SectionLabel>Training styles</SectionLabel>
          <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
            {`Up to ${MAX_STYLES_PER_PROFILE}.`}
          </Text>
          <View style={styles.chips}>
            {Object.entries(COMMUNITY_STYLE_KEYS).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={styleKeys.includes(key)}
                onPress={() => toggleStyle(key)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <SectionLabel>Goal</SectionLabel>
          <View style={styles.chips}>
            {Object.entries(COMMUNITY_GOALS).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={goal === key}
                accessibilityRole="radio"
                onPress={() => setGoal(goal === key ? null : key)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <SectionLabel>Where you train</SectionLabel>
          <View style={styles.chips}>
            {Object.entries(COMMUNITY_SETTINGS).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={setting === key}
                accessibilityRole="radio"
                onPress={() => setSetting(setting === key ? null : key)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <SectionLabel>Place</SectionLabel>
          <PlacePicker
            label={placeLabel}
            gymTown={primaryGym?.town ?? null}
            onChange={(place) => {
              setPlaceLabel(place?.label ?? null);
              setPlaceQuery(place ? place.label : '');
              setPlaceDirty(true);
            }}
          />
        </View>

        <View style={styles.field}>
          <SectionLabel>Trains at</SectionLabel>
          {editingPrimaryGym || (!primaryGym && !legacyGymLabel) ? (
            <GymPicker
              navigation={navigation}
              onSelect={(venue) => requestGymConfirm(venue, (v) => {
                setPrimaryGym(v); setLegacyGymLabel(null); setEditingPrimaryGym(false);
              })}
            />
          ) : (
            <Card padding="md" radius="md" style={styles.gymRow}>
              <View style={[styles.gymGlyph, { backgroundColor: t.colors.surface2 }]}>
                <Ionicons name="business-outline" size={iconSize.sm} color={t.colors.textSecondary} />
              </View>
              <View style={styles.gymBody}>
                <Text style={[styles.linkLabel, { ...t.type.body, color: t.colors.textPrimary }]} numberOfLines={1}>
                  {primaryGym ? venueLine(primaryGym).primary : legacyGymLabel}
                </Text>
                {!primaryGym && legacyGymLabel ? (
                  <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]} numberOfLines={1}>
                    Not yet linked to the directory.
                  </Text>
                ) : null}
              </View>
              <Button
                variant="tertiary"
                size="sm"
                fullWidth={false}
                title="Change"
                onPress={() => setEditingPrimaryGym(true)}
                accessibilityLabel="Change gym"
              />
            </Card>
          )}
          <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
            Only the gym you choose. Never your location.
          </Text>
        </View>

        <View style={styles.field}>
          <SectionLabel>Other gyms</SectionLabel>
          <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
            {`Up to ${MAX_OTHER_GYMS} more gyms you train at.`}
          </Text>
          {otherGyms.map((venue) => (
            <Card key={venue.id} padding="md" radius="md" style={styles.gymRow}>
              <View style={[styles.gymGlyph, { backgroundColor: t.colors.surface2 }]}>
                <Ionicons name="business-outline" size={iconSize.sm} color={t.colors.textSecondary} />
              </View>
              <Text style={[styles.linkLabel, { ...t.type.body, color: t.colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                {venueLine(venue).primary}
              </Text>
              <Pressable
                onPress={() => removeOtherGym(venue.id)}
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
                title="Add another gym"
                onPress={() => setAddingOtherGym(true)}
                accessibilityLabel="Add another gym"
              />
            )
          ) : null}
        </View>

        <Card
          onPress={() => navigation.navigate('CommunityTrainingProfile')}
          style={styles.linkRow}
          accessibilityLabel="Training profile"
        >
          <View style={styles.linkBody}>
            <Text style={[styles.linkLabel, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
              Training profile
            </Text>
            <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              The bands worked out from your training, and what you share of them.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </Card>

        <View style={styles.field}>
          <SectionLabel>Who can follow you</SectionLabel>
          <View style={styles.chips} accessibilityLabel="Who can follow you">
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
          <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
            {visibility === 'public'
              ? 'Anyone signed in can follow you and see what you post.'
              : 'You approve every follower before they see what you post.'}
          </Text>
        </View>

        <Button
          variant="primary"
          title="Save"
          loading={busy}
          onPress={save}
          accessibilityLabel="Save profile"
        />

        <Button
          variant="destructive"
          size="sm"
          fullWidth={false}
          title="Leave Community"
          onPress={confirmLeave}
          accessibilityLabel="Leave Community"
        />
          </>
        )}
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
  skeletonStack: { gap: spacing.md },
  field: { gap: spacing.sm },
  hint: { ...type.caption, color: colors.textMuted },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gymGlyph: {
    width: 36,
    height: 36,
    borderRadius: circle(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymBody: { flex: 1, gap: spacing.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  linkBody: { flex: 1, gap: spacing.xxs },
  linkLabel: { ...type.bodyStrong, color: colors.textPrimary },
});
