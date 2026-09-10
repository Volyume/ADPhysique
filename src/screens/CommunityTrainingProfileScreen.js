/**
 * CommunityTrainingProfileScreen (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 3
 * and 6; SD-22, SD-25, SD-30, SD-31)
 *
 * The bands derived from your own training, each with its own toggle, and
 * the one line that says exactly what other people would see.
 *
 * Volyume already knows how you actually train. That history stays on the
 * device. What may leave it is these coarse bands, and only the ones
 * switched on here: the payload is built from the toggles, and the server
 * NULLS anything not sent, so switching one off is an erasure rather than
 * a stale row left behind.
 *
 * Days, time bands and the age band start OFF (SD-22): they are the three
 * that say most about where a person is and when, so they are switched on
 * deliberately or not at all.
 *
 * SD-30: nothing about the body, food, Progress Scan, injuries, coaching
 * or check-ins is read anywhere in this campaign. The derivation reads
 * completed-workout timestamps and exercise ids, and that is all.
 *
 * The partner section is opt in (SD-25). Off means nothing anywhere says
 * you were ever looking.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Chip from '../components/Chip';
import SectionLabel from '../components/SectionLabel';
import { SkeletonCard, SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing, type, withAlpha, alpha } from '../styles/theme';
import {
  TP_DAYS, TP_TIME_BANDS, TP_SESSIONS_BANDS, TP_EXPERIENCE_BANDS, TP_AGE_BANDS,
  TP_DEFAULT_SHARE, dayListLabel, timeBandsLabel, previewLine, shareablePayload,
  loadTrainingProfile, readShareSettings, writeShareSettings, syncTrainingProfile,
  publishConsistency,
  setPartner,
} from '../lib/community';

/** What a band says when there is not enough training behind it yet. */
export const NOT_ENOUGH_LINE = 'Not enough sessions yet';
export const NOTHING_SHARED_LINE = 'Nothing from your training is shared just now.';
export const PARTNER_SAFETY_LINE = 'If you arrange to train with someone, meet at the gym and tell someone.';

/**
 * Time bands as chips. The keys are the client library's closed set; the
 * words are the ones that read as a chip rather than as a sentence
 * fragment ("Evenings", not "evenings" mid-phrase).
 */
const PARTNER_TIME_LABELS = Object.freeze({
  morning: 'Mornings',
  midday: 'Midday',
  afternoon: 'Afternoons',
  evening: 'Evenings',
  late: 'Late',
});

/**
 * The six toggles, in the order the screen reads them, each with the
 * value it is offering to share.
 */
export function bandRows(bands, me) {
  const staples = Array.isArray(bands?.tp_staple_lifts) ? bands.tp_staple_lifts.length : 0;
  return [
    { key: 'days', label: 'Days you usually train', value: dayListLabel(bands?.tp_days) },
    { key: 'time_bands', label: 'When you usually train', value: timeBandsLabel(bands?.tp_time_bands) },
    { key: 'sessions', label: 'Sessions a week', value: TP_SESSIONS_BANDS[bands?.tp_sessions_band] ?? '' },
    {
      key: 'staple_lifts',
      label: 'Lifts you train most',
      value: staples ? `${staples} ${staples === 1 ? 'lift' : 'lifts'}` : '',
    },
    { key: 'experience', label: 'Experience', value: TP_EXPERIENCE_BANDS[bands?.tp_experience_band] ?? '' },
    {
      key: 'age_band',
      label: 'Age band',
      value: TP_AGE_BANDS[me?.tp_age_band] ?? '',
      empty: 'Worked out from your date of birth when this is on',
    },
    {
      key: 'consistency',
      label: 'Share my consistency',
      value: '',
      empty: 'Your sessions this week, this month and your weeks in a row. Never your weight or food.',
    },
  ];
}

export default function CommunityTrainingProfileScreen({ navigation }) {
  const t = useTheme();
  const toast = useToast();
  const { me, refresh } = useCommunityMe();
  const uid = me?.profile?.user_id ?? null;
  const isMinor = !!me?.is_minor;

  const [bands, setBands] = useState(null);
  const [share, setShare] = useState(TP_DEFAULT_SHARE);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerDays, setPartnerDays] = useState([]);
  const [partnerBands, setPartnerBands] = useState([]);
  const [sameGymOnly, setSameGymOnly] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [derived, settings] = await Promise.all([
        loadTrainingProfile(uid),
        readShareSettings(uid),
      ]);
      setBands(derived);
      setShare(settings);
    } catch (_e) {
      // The derivation is local reads only, so a failure here is not a
      // network story: the screen shows the empty bands and the toggles,
      // which is still the truth about what would be shared.
      setBands(null);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  // Prefill the partner section once, from the payload the server holds.
  useEffect(() => {
    if (partnerReady || !me?.profile) return;
    const prefs = me.partner_prefs ?? {};
    setPartnerOpen(!!me.open_to_partner);
    setPartnerDays(Array.isArray(prefs.days) ? prefs.days : []);
    setPartnerBands(Array.isArray(prefs.time_bands) ? prefs.time_bands : []);
    setSameGymOnly(!!prefs.same_gym_only);
    setPartnerReady(true);
  }, [me, partnerReady]);

  const shared = shareablePayload(bands ?? {}, share);
  // Spec 1.3: the preview includes the age band exactly when the toggle
  // is on (never for a minor: the server never populates `tp_age_band`
  // for one, `community_update_training_profile`'s own rule).
  const preview = previewLine(shared, share.age_band ? me?.tp_age_band : null);

  async function toggleBand(key, next) {
    const prevSettings = share;
    const settings = { ...share, [key]: next };
    setShare(settings);
    await writeShareSettings(uid, settings);
    // `force`: the person has just changed a toggle and expects it to take.
    // Flipping `consistency` itself needs `publishConsistency`, the only
    // path that actually computes and merges the counters into the call;
    // `syncTrainingProfile` alone would send `share_consistency: true`
    // with every counter null until the next natural refresh.
    const out = key === 'consistency'
      ? await publishConsistency(uid)
      : await syncTrainingProfile(uid, { force: true });
    if (out?.reason === 'rules_outdated') {
      // The rules text moved with this campaign, not the connection: the
      // toggle reverts and the person reads and accepts before it is
      // shared, rather than being told (wrongly) that it is offline.
      setShare(prevSettings);
      await writeShareSettings(uid, prevSettings);
      navigation.navigate('CommunityRules', { mustAccept: true });
    } else if (!out?.sent) {
      toast.show('Saved on this device. It will share when you are back online.');
    }
  }

  async function recalculate() {
    if (busy) return;
    setBusy(true);
    try {
      await load();
      await syncTrainingProfile(uid, { force: true });
      toast.show('Training profile updated');
    } finally {
      setBusy(false);
    }
  }

  /**
   * `revert` undoes the one optimistic change the caller just made (product
   * review 2026-09-06 finding 2/4): every path here sets local state before
   * the server confirms it, so any failure reverts it rather than leaving
   * the person believing something is saved that was refused. `rules_outdated`
   * is spoken as itself, not as "could not save" (finding 4): the fix is
   * accepting the rules, not trying again.
   */
  async function savePartner(next, revert) {
    try {
      await setPartner(next.open, {
        days: next.days,
        time_bands: next.time_bands,
        same_gym_only: next.same_gym_only,
      });
      refresh(true).catch(() => { /* the next open reads it again */ });
    } catch (e) {
      revert?.();
      if (e?.code === 'rules_outdated') {
        navigation.navigate('CommunityRules', { mustAccept: true });
      } else {
        toast.show('Could not save that just now.', { variant: 'error' });
      }
    }
  }

  function partnerState(over = {}) {
    return {
      open: partnerOpen,
      days: partnerDays,
      time_bands: partnerBands,
      same_gym_only: sameGymOnly,
      ...over,
    };
  }

  const switchColours = {
    trackColor: { false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) },
    thumbColor: t.colors.primary,
    ios_backgroundColor: t.colors.surface2,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Training profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          These are worked out on your phone from the last twelve weeks of finished sessions. Only the ones you switch on are shared, and never anything more detailed than a band.
        </Text>

        {loading ? (
          // First paint: the real shape below is a preview card and a
          // stack of band rows, so that is what previews it
          // (`docs/rules/styling.md`, "Loading states") rather than a
          // bare spinner sitting above content that has not loaded yet.
          <View style={styles.skeletonStack}>
            <SkeletonCard height={64} />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <SkeletonRow key={i} />)}
          </View>
        ) : (
          <>
            <Card style={styles.preview}>
              <SectionLabel tone="muted">What other people see</SectionLabel>
              <Text style={[styles.previewLine, { ...t.type.body, color: t.colors.textPrimary }]}>
                {preview || NOTHING_SHARED_LINE}
              </Text>
            </Card>

            <View style={styles.section}>
              <SectionLabel tone="muted">Your bands</SectionLabel>
              {/* SD-32: the age band never appears for a minor, exactly as
                  Join filters the same row (CommunityJoinScreen.js). */}
              {bandRows(bands, me)
                .filter((row) => !(isMinor && (row.key === 'age_band' || row.key === 'consistency')))
                .map((row) => (
                <View key={row.key} style={styles.bandRow}>
                  <View style={styles.bandBody}>
                    <Text style={[styles.bandLabel, { ...t.type.body, color: t.colors.textPrimary }]}>
                      {row.label}
                    </Text>
                    <Text style={[styles.bandValue, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                      {row.value || row.empty || NOT_ENOUGH_LINE}
                    </Text>
                  </View>
                  <Switch
                    value={!!share[row.key]}
                    onValueChange={(next) => toggleBand(row.key, next)}
                    accessibilityLabel={`Share ${row.label.toLowerCase()}`}
                    {...switchColours}
                  />
                </View>
              ))}
              <Button
                variant="tertiary"
                size="sm"
                fullWidth={false}
                title="Recalculate"
                loading={busy}
                onPress={recalculate}
                accessibilityLabel="Work out my training profile again"
              />
            </View>
          </>
        )}

        {isMinor ? (
          <View style={styles.section}>
            <SectionLabel tone="muted">Open to training together</SectionLabel>
            <Text style={[styles.bandValue, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              Training partner matching opens at 18.
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <SectionLabel tone="muted">Open to training together</SectionLabel>
            <View style={styles.bandRow}>
              <View style={styles.bandBody}>
                <Text style={[styles.bandLabel, { ...t.type.body, color: t.colors.textPrimary }]}>
                  Open to training together
                </Text>
                <Text style={[styles.bandValue, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
                  Your profile shows this, and you appear to people looking for someone to train with.
                </Text>
              </View>
              <Switch
                value={partnerOpen}
                onValueChange={(next) => {
                  const prev = partnerOpen;
                  setPartnerOpen(next);
                  savePartner(partnerState({ open: next }), () => setPartnerOpen(prev));
                }}
                accessibilityLabel="Open to training together"
                {...switchColours}
              />
            </View>

            {partnerOpen ? (
              <>
                <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
                  Days that suit you
                </Text>
                <View style={styles.chips}>
                  {Object.entries(TP_DAYS).map(([key, label]) => (
                    <Chip
                      key={key}
                      label={label}
                      selected={partnerDays.includes(key)}
                      onPress={() => {
                        const prev = partnerDays;
                        const next = partnerDays.includes(key)
                          ? partnerDays.filter((k) => k !== key)
                          : [...partnerDays, key];
                        setPartnerDays(next);
                        savePartner(partnerState({ days: next }), () => setPartnerDays(prev));
                      }}
                    />
                  ))}
                </View>

                <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
                  Times that suit you
                </Text>
                <View style={styles.chips}>
                  {Object.keys(TP_TIME_BANDS).map((key) => (
                    <Chip
                      key={key}
                      label={PARTNER_TIME_LABELS[key]}
                      selected={partnerBands.includes(key)}
                      onPress={() => {
                        const prev = partnerBands;
                        const next = partnerBands.includes(key)
                          ? partnerBands.filter((k) => k !== key)
                          : [...partnerBands, key];
                        setPartnerBands(next);
                        savePartner(partnerState({ time_bands: next }), () => setPartnerBands(prev));
                      }}
                    />
                  ))}
                </View>

                <View style={styles.bandRow}>
                  <View style={styles.bandBody}>
                    <Text style={[styles.bandLabel, { ...t.type.body, color: t.colors.textPrimary }]}>
                      Same gym only
                    </Text>
                  </View>
                  <Switch
                    value={sameGymOnly}
                    onValueChange={(next) => {
                      const prev = sameGymOnly;
                      setSameGymOnly(next);
                      savePartner(partnerState({ same_gym_only: next }), () => setSameGymOnly(prev));
                    }}
                    accessibilityLabel="Same gym only"
                    {...switchColours}
                  />
                </View>
              </>
            ) : null}

            <Text style={[styles.safety, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              {PARTNER_SAFETY_LINE}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  intro: { ...type.bodySm, color: colors.textSecondary },
  skeletonStack: { gap: spacing.sm },
  preview: { gap: spacing.xs },
  previewLine: { ...type.body, color: colors.textPrimary },
  section: { gap: spacing.md },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bandBody: { flex: 1, gap: spacing.xxs },
  bandLabel: { ...type.body, color: colors.textPrimary },
  bandValue: { ...type.bodySm, color: colors.textSecondary },
  hint: { ...type.caption, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
  safety: { ...type.bodySm, color: colors.textSecondary },
});
