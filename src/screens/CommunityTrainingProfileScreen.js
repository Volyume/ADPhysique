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

import { Fragment, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Band, { BandGap, BandBody } from '../components/community/Band';
import SectionHeader from '../components/community/SectionHeader';
import SwitchRow from '../components/community/SwitchRow';
import SkeletonFormBand from '../components/community/SkeletonFormBand';
import { useToast } from '../components/Toast';
import { appAlert } from '../components/AppAlert';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { spacing } from '../styles/theme';
import {
  TP_DAYS, TP_TIME_BANDS, TP_SESSIONS_BANDS, TP_EXPERIENCE_BANDS, TP_AGE_BANDS,
  TP_DEFAULT_SHARE, dayListLabel, timeBandsLabel, previewLine, shareablePayload,
  loadTrainingProfile, readShareSettings, syncTrainingProfile,
  SESSIONS_AUDIENCE_VALUES, SESSIONS_AUDIENCE_LABELS, sessionsSharingSentence,
  setPartner, listMyGroups,
} from '../lib/community';
import { saveBandToggle } from '../lib/community/bandShare';
import { saveShareSessions, SHARE_OFF_TITLE, SHARE_OFF_BODY } from '../lib/community/shareSessions';

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
      label: 'Age group',
      value: TP_AGE_BANDS[me?.tp_age_band] ?? '',
      empty: 'Worked out from your date of birth when this is on',
    },
    {
      key: 'consistency',
      label: 'Share my consistency',
      value: '',
      empty: 'Your sessions this week, this month and your weeks in a row. Never your weight or food.',
    },
    {
      key: 'share_sessions',
      label: 'Share what I did',
      value: '',
      empty: "Turns each finished workout into a post for the audience you choose, automatically, with nothing to post yourself. Turn it off any time and remove what you've already shared.",
    },
  ];
}

export default function CommunityTrainingProfileScreen({ navigation }) {
  const t = useTheme();
  const toast = useToast();
  // F12 fix: `loading` (renamed `meLoading`) gates the "opens at 18" copy
  // below -- `emptyMe()` now defaults `is_minor` to true (unknown means
  // minor until the server says otherwise), so an adult's FIRST render,
  // before this resolves, must not show minor-specific copy about them.
  const { me, loading: meLoading, refresh } = useCommunityMe();
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

  // F5 fix: "My groups" is a doomed choice with no groups to post to
  // (`ambient.js` skips silently). Defaults to true (enabled) until the
  // fetch resolves, and fails back to true on a read failure -- a choice
  // is never blocked on a network error, only disabled once the person
  // is positively known to have no groups.
  const [hasGroups, setHasGroups] = useState(true);

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

  // F5 fix: fetch the person's groups once on mount, purely to know
  // whether "My groups" is a real choice. Never blocks the row on a
  // network error (fail open to enabled -- see `hasGroups`'s initial
  // value above).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await listMyGroups();
        if (!cancelled) setHasGroups(mine.length > 0);
      } catch (_e) {
        if (!cancelled) setHasGroups(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const shared = shareablePayload(bands ?? {}, share);
  // Spec 1.3: the preview includes the age band exactly when the toggle
  // is on (never for a minor: the server never populates `tp_age_band`
  // for one, `community_update_training_profile`'s own rule).
  const preview = previewLine(shared, share.age_band ? me?.tp_age_band : null);

  async function toggleBand(key, next) {
    const prevSettings = share;
    setShare({ ...share, [key]: next });
    // The one setter shared with the privacy panel (D221 3e).
    const out = await saveBandToggle(uid, prevSettings, key, next);
    setShare(out.settings);
    if (out.status === 'rules_outdated') {
      // The rules text moved, not the connection: read and accept first.
      navigation.navigate('CommunityRules', { mustAccept: true });
    } else if (out.status === 'queued') {
      toast.show('Saved on this device. It will share when you are back online.');
    }
  }

  /**
   * "Share what I did" and its audience (spec section 1) go through a
   * SEPARATE server call from the bands above
   * (`publishSharingSettings` -> `community_upsert_profile`, not
   * `community_update_training_profile`), so this has its own save
   * helper rather than reusing `toggleBand`. Same optimistic-then-revert
   * shape.
   */
  async function saveSharing(nextSettings, { removeShared = false } = {}) {
    const prevSettings = share;
    setShare(isMinor ? { ...nextSettings, sessions_audience: 'followers' } : nextSettings);
    // The one setter shared with the Privacy screen's mirrored row (L17).
    const out = await saveShareSessions(uid, prevSettings, nextSettings, { removeShared, isMinor });
    setShare(out.settings);
    if (out.status === 'rules_outdated') {
      navigation.navigate('CommunityRules', { mustAccept: true });
      return;
    }
    if (out.status === 'queued') {
      toast.show(out.settings.share_sessions
        ? 'Saved on this device. It will share when you are back online.'
        : 'Saved on this device. It will apply when you are back online.');
    }
  }

  function toggleShareSessions(next) {
    if (!next) {
      // Spec section 1: turning it off asks ONCE whether to remove what
      // is already shared, then stops new items either way.
      appAlert(
        SHARE_OFF_TITLE,
        SHARE_OFF_BODY,
        [
          { text: 'Keep', onPress: () => saveSharing({ ...share, share_sessions: false }) },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => saveSharing({ ...share, share_sessions: false }, { removeShared: true }),
          },
        ],
      );
      return;
    }
    saveSharing({ ...share, share_sessions: true });
  }

  function setSessionsAudience(value) {
    if (!SESSIONS_AUDIENCE_VALUES.includes(value)) return;
    saveSharing({ ...share, sessions_audience: value });
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Training profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <Band>
          <BandBody style={styles.introBody}>
            <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
              These are worked out on your phone from the last twelve weeks of finished sessions. Only the ones you switch on are shared, and never anything more detailed than a band.
            </Text>
          </BandBody>
        </Band>
        <BandGap />

        {loading ? (
          // First paint: the real shape below is a preview band and a band
          // of switch rows, so that is what previews it (D221 V10).
          <SkeletonFormBand bands={2} wells={3} />
        ) : (
          <>
            <Band>
              <SectionHeader title="What other people see" />
              <BandBody>
                <Text style={[t.type.body, { color: t.colors.textPrimary }]}>
                  {preview || NOTHING_SHARED_LINE}
                </Text>
              </BandBody>
            </Band>
            <BandGap />

            <Band>
              <SectionHeader title="Your bands" />
              {/* SD-32: the age band never appears for a minor, exactly as
                  Join filters the same row (CommunityJoinScreen.js). */}
              {bandRows(bands, me)
                .filter((row) => !(isMinor && (row.key === 'age_band' || row.key === 'consistency')))
                .map((row) => {
                  const isShareSessions = row.key === 'share_sessions';
                  return (
                    <Fragment key={row.key}>
                      <SwitchRow
                        title={row.label}
                        subtitle={isShareSessions
                          ? sessionsSharingSentence(!!share.share_sessions, share.sessions_audience)
                          : (row.value || row.empty || NOT_ENOUGH_LINE)}
                        value={!!share[row.key]}
                        onValueChange={(next) => (isShareSessions ? toggleShareSessions(next) : toggleBand(row.key, next))}
                        accessibilityLabel={`Share ${row.label.toLowerCase()}`}
                      />
                      {/* Spec section 1: the audience Chip radio row under
                          "Share what I did", only while it is on. A minor
                          never gets more than followers (HARD BOUND), so
                          the row itself never renders for one -- a single
                          calm line instead, matching the age-band row's own
                          minor treatment elsewhere on this screen. */}
                      {isShareSessions && share.share_sessions ? (
                        isMinor ? (
                          <BandBody style={styles.noteBody}>
                            <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>
                              Shared with people who follow you.
                            </Text>
                          </BandBody>
                        ) : (
                          <BandBody style={styles.noteBody}>
                            <View style={styles.chips} accessibilityLabel="Who sees what you did">
                              {SESSIONS_AUDIENCE_VALUES.map((value) => (
                                <Chip
                                  key={value}
                                  label={SESSIONS_AUDIENCE_LABELS[value]}
                                  selected={share.sessions_audience === value}
                                  onPress={() => setSessionsAudience(value)}
                                  accessibilityRole="radio"
                                  disabled={value === 'groups' && !hasGroups}
                                />
                              ))}
                            </View>
                            {/* F5 fix: "My groups" with nobody to post to
                                is a doomed, silent choice -- say so rather
                                than letting it look like a working option. */}
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
              <BandBody style={styles.noteBody}>
                <Button
                  variant="tertiary"
                  size="sm"
                  fullWidth={false}
                  title="Recalculate"
                  loading={busy}
                  onPress={recalculate}
                  accessibilityLabel="Work out my training profile again"
                />
              </BandBody>
            </Band>
          </>
        )}

        {/* F12 fix: nothing here until `me` has genuinely loaded --
            `isMinor` alone defaults true (unknown means minor) and would
            otherwise flash the "opens at 18" copy at an adult on first
            render. */}
        {meLoading ? null : isMinor ? (
          <>
            <BandGap />
            <Band>
              <SectionHeader title="Open to training together" />
              <BandBody>
                <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
                  Training partner matching opens at 18.
                </Text>
              </BandBody>
            </Band>
          </>
        ) : (
          <>
            <BandGap />
            <Band>
              <SectionHeader title="Training together" />
              <SwitchRow
                title="Open to training together"
                subtitle="Your profile shows this, and you appear to people looking for someone to train with."
                value={partnerOpen}
                onValueChange={(next) => {
                  const prev = partnerOpen;
                  setPartnerOpen(next);
                  savePartner(partnerState({ open: next }), () => setPartnerOpen(prev));
                }}
                accessibilityLabel="Open to training together"
              />

              {partnerOpen ? (
                <>
                  <BandBody style={styles.noteBody}>
                    <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
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

                    <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
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
                  </BandBody>

                  <SwitchRow
                    title="Same gym only"
                    value={sameGymOnly}
                    onValueChange={(next) => {
                      const prev = sameGymOnly;
                      setSameGymOnly(next);
                      savePartner(partnerState({ same_gym_only: next }), () => setSameGymOnly(prev));
                    }}
                    accessibilityLabel="Same gym only"
                  />
                </>
              ) : null}

              <BandBody style={styles.noteBody}>
                <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
                  {PARTNER_SAFETY_LINE}
                </Text>
              </BandBody>
            </Band>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
  introBody: { paddingTop: spacing.md },
  noteBody: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
});
