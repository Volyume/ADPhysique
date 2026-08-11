import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { colors, spacing, type, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import * as haptics from '../lib/haptics';
import { getUserBodyProfile } from '../lib/database';
import { getWellbeingMode, setWellbeingMode } from '../lib/wellbeing';
import { getCycleTracking, setCycleTracking } from '../lib/cyclePrefs';
import { SettingsPage, SettingRow, settingsStyles, useSettingsStyles } from '../components/SettingsPrimitives';
import Chip from '../components/Chip';

// Coaching: the levers that shape what the coach asks for and adjusts.
// Cycle tracking shows for users whose body profile records a female sex.
export default function SettingsCoachingScreen() {
  const { user, userProfile, saveLocalProfile, tier } = useAppStore(
    useShallow(s => ({
      user: s.user,
      userProfile: s.userProfile,
      saveLocalProfile: s.saveLocalProfile,
      tier: s.tier,
    })),
  );

  const [calmEnabled, setCalmEnabled] = useState(false);
  const [cycleEnabled, setCycleEnabled] = useState(false);
  const [bioSex, setBioSex] = useState(null);
  // C1/C2 (founder decision #2): coaching tone register + the opt-in science
  // layer. Both are profile fields with NO dedicated cloud column (the
  // profiles pull merge spreads local first, so they survive it). They are
  // NOT device-only: they ride @volyume_user_profile_<uid> into user_prefs
  // via the bulk pref push (sync.js:1362 shouldSyncPref, :1455
  // _pushAllUserPrefs) and come back on a pull. Never build a user-facing
  // "stays on this device" claim on this comment.
  const [coachTone, setCoachToneState] = useState(userProfile?.coachTone ?? 'automatic');
  const [showScience, setShowScience] = useState(userProfile?.showScience === true);
  // Ultimate-Audit item 11 (D16, founder ruling 2026-07-10,
  // pass3-v2-founder-decisions.md:166): named autonomy modes governing
  // apply-control (WHO confirms an adjustment), orthogonal to Coaching
  // tone above (which is voice register only). Same field pattern as
  // coachTone/showScience: no dedicated cloud column, survives the profiles
  // pull merge, still shipped inside the profile blob by pref sync. Default
  // 'collaborative' so existing users see no behaviour change.
  const [coachAutonomy, setCoachAutonomyState] = useState(userProfile?.coachAutonomy ?? 'collaborative');

  async function setTone(next) {
    haptics.selection();
    setCoachToneState(next);
    if (user?.id) {
      await saveLocalProfile(user.id, { ...(userProfile || {}), coachTone: next });
    }
  }

  async function setAutonomy(next) {
    haptics.selection();
    setCoachAutonomyState(next);
    if (user?.id) {
      await saveLocalProfile(user.id, { ...(userProfile || {}), coachAutonomy: next });
    }
  }

  async function toggleScience(value) {
    haptics.selection();
    setShowScience(value);
    if (user?.id) {
      await saveLocalProfile(user.id, { ...(userProfile || {}), showScience: value });
    }
  }

  async function toggleCalmMode(value) {
    haptics.selection();
    const mode = value ? 'calm' : 'normal';
    await setWellbeingMode(mode);
    setCalmEnabled(value);
  }

  async function toggleCycleTracking(value) {
    haptics.selection();
    await setCycleTracking(value);
    setCycleEnabled(value);
  }

  // D2 (founder decision 2026-07-03, Option A): the readiness ask before each
  // session. ON asks; OFF starts sessions immediately with no readiness
  // signal, so session adjustments never fire (absent input is never filled
  // in). Stored inverted ('@volyume_intent_prompt_off') because asking is the
  // default.
  const [readinessAsk, setReadinessAsk] = useState(true);
  async function toggleReadinessAsk(value) {
    haptics.selection();
    setReadinessAsk(value);
    try {
      if (value) await AsyncStorage.removeItem('@volyume_intent_prompt_off');
      else await AsyncStorage.setItem('@volyume_intent_prompt_off', 'true');
    } catch (_) { /* the Home start path re-reads each session */ }
  }

  useFocusEffect(
    useCallback(() => {
      getWellbeingMode().then(m => setCalmEnabled(m === 'calm'));
      getCycleTracking().then(setCycleEnabled).catch(() => {});
      AsyncStorage.getItem('@volyume_intent_prompt_off')
        .then(v => setReadinessAsk(v !== 'true')).catch(() => {});
      if (user?.id) getUserBodyProfile(user.id).then(p => setBioSex(p?.sex ?? null)).catch(() => {});
    }, [user?.id]),
  );

  // CP-10 stage 3: live theme (src/hooks/useTheme.js). `live` is the shared
  // settingsStyles override (SettingsPrimitives.js); `liveText` covers this
  // screen's own colour/type-bearing style keys the same way.
  const t = useTheme();
  const live = useSettingsStyles();
  const liveText = {
    toneBlock: { borderBottomColor: t.colors.border },
    toneLabel: { ...t.type.body, color: t.colors.textPrimary },
    toneSub: { ...t.type.caption, color: t.colors.textMuted },
  };

  return (
    <SettingsPage title="Coaching">
      <View style={[settingsStyles.section, live.section]}>
        {/* W-3 / W-4 (D96, wording only): the row was described in nine
            words for a mode that changes behaviour on a dozen surfaces, and
            "coaching never pushes for more WHILE IT'S ON" invited exactly
            the inference the Phase 4 question asks about - that the safety
            rules differ between modes. They do not: the calorie floors, the
            FFM floor, the rapid-loss gate and the ED-flag suppressions are
            mode-blind and tier-blind (proGate.js, CLAUDE.md Section 2). Two
            consequence clauses and one true statement about existing
            behaviour. No gate, no threshold, no detector text, and no
            detector mechanics exposed. */}
        <SettingRow
          icon="heart-outline"
          label="Calmer coaching"
          sub="Quieter progress prompts, and coaching never pushes for more while it's on. Celebrations, streaks and progress comparisons go quiet; your plan and your numbers do not change. The safety limits on calories and training load are always on, in both modes."
          showArrow={false}
          rightElement={
            <Switch
              value={calmEnabled}
              onValueChange={toggleCalmMode}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
              thumbColor={calmEnabled ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
        <SettingRow
          icon="pulse-outline"
          label="Session readiness check"
          sub={readinessAsk
            // Session adjustment from the answers is Pro-only
            // (ActiveWorkoutScreen readinessTweak), so the Free copy must not
            // promise it (comprehension-trust audit 2026-08-06, T16). Free
            // answers ARE kept: they write to the workout row and feed the
            // Home readiness line.
            ? (tier === 'pro'
              ? 'Asks how you are feeling before each session, so sessions can adjust to it.'
              : 'Asks how you are feeling before each session and keeps it with your training history.')
            : 'Off. Sessions start straight away.'}
          showArrow={false}
          rightElement={
            <Switch
              value={readinessAsk}
              onValueChange={toggleReadinessAsk}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
              thumbColor={readinessAsk ? t.colors.primary : t.colors.textMuted}
            />
          }
        />
        {tier === 'pro' && (
          <>
            {/* C1: coaching tone register. Same facts, same decisions, same
                honesty rules in every tone; only the prose shape changes.
                Safety copy is identical whatever is chosen. */}
            <View style={[styles.toneBlock, liveText.toneBlock]}>
              <Text style={[styles.toneLabel, liveText.toneLabel]}>Coaching tone</Text>
              <Text style={[styles.toneSub, liveText.toneSub]}>
                {coachTone === 'supportive'
                  ? 'Plainer wording with a little more explanation.'
                  : coachTone === 'precise'
                    ? 'Terser. Numbers first, no padding.'
                    : 'The coach matches its wording to your training experience.'}
              </Text>
              <View style={styles.toneChips}>
                {[
                  { key: 'automatic', label: 'Automatic' },
                  { key: 'supportive', label: 'Supportive' },
                  { key: 'precise', label: 'Precise' },
                ].map(({ key, label }) => {
                  const sel = coachTone === key;
                  return (
                    <Chip
                      key={key}
                      label={label}
                      selected={sel}
                      onPress={() => setTone(key)}
                      accessibilityRole="radio"
                      accessibilityLabel={`Coaching tone ${label}`}
                      style={styles.toneChipFlex}
                      labelStyle={styles.toneChipLabel}
                    />
                  );
                })}
              </View>
            </View>
            {/* Ultimate-Audit item 11: autonomy (apply-control). Every mode
                shows the same decision and reason; only who confirms it
                differs. A safety hold (deload, poor recovery, safety hold,
                FFM floor, ED flag, rapid loss, calm mode) always forces
                confirm-first, whatever mode is chosen (D16), so Coached is
                never a promise to bypass a hold. */}
            <View style={[styles.toneBlock, liveText.toneBlock]}>
              <Text style={[styles.toneLabel, liveText.toneLabel]}>Autonomy</Text>
              <Text style={[styles.toneSub, liveText.toneSub]}>
                {coachAutonomy === 'coached'
                  // D93 (Campaign 2, Phase 12): the D16 rule was a source
                  // comment only - a Coached user whose week reverted to
                  // confirm-first was told nothing. One honest sentence.
                  ? "The coach applies each week's changes for you. Anything safety-related still waits for your confirmation."
                  : coachAutonomy === 'manual'
                    ? 'The coach shows each change and the reason. You make the change yourself.'
                    : 'The coach suggests each change. You tap to apply it.'}
              </Text>
              <View style={styles.toneChips}>
                {[
                  { key: 'coached', label: 'Coached' },
                  { key: 'collaborative', label: 'Collaborative' },
                  { key: 'manual', label: 'Manual' },
                ].map(({ key, label }) => {
                  const sel = coachAutonomy === key;
                  return (
                    <Chip
                      key={key}
                      label={label}
                      selected={sel}
                      onPress={() => setAutonomy(key)}
                      accessibilityRole="radio"
                      accessibilityLabel={`Autonomy ${label}`}
                      style={styles.toneChipFlex}
                      labelStyle={styles.toneChipLabel}
                    />
                  );
                })}
              </View>
            </View>
            {/* C2: the opt-in science layer. Off by default; everything stays
                plain English. On adds the technical term in brackets after the
                plain one on the coach's explanation surfaces. */}
            <SettingRow
              icon="flask-outline"
              label="Show the science"
              sub={showScience
                ? 'On. Technical terms appear in brackets after the plain ones on coaching explanations.'
                : 'Off. Everything stays in plain English.'}
              showArrow={false}
              rightElement={
                <Switch
                  value={showScience}
                  onValueChange={toggleScience}
                  trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
                  thumbColor={showScience ? t.colors.primary : t.colors.textMuted}
                />
              }
            />
          </>
        )}
        {/* D94 (Campaign 3, F10): the only consumer of this flag is the
            Pro weekly check-in, so a free user's toggle was inert - it
            saved a preference nothing read. Gated to Pro like its reader;
            the sex gate is unchanged (Article 9 surface). */}
        {/* Review B finding 8: a lapsed user with the flag ON must keep
            the revocation path (Article 9 opt-in). The row therefore also
            renders whenever the flag is currently on, whatever the tier. */}
        {(tier === 'pro' || cycleEnabled) && bioSex === 'female' && (
          <SettingRow
            icon="calendar-outline"
            label="Cycle tracking"
            sub="Adds an optional weekly check-in question so the coach can steady targets around your period."
            showArrow={false}
            rightElement={
              <Switch
                value={cycleEnabled}
                onValueChange={toggleCycleTracking}
                trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
                thumbColor={cycleEnabled ? t.colors.primary : t.colors.textMuted}
              />
            }
          />
        )}
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  // C1 coaching tone selector
  toneBlock: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  toneLabel: { ...type.body, color: colors.textPrimary },
  toneSub: { ...type.caption, color: colors.textMuted },
  toneChips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  // DD10 (design-consistency-audit-2026-08-06): tone/autonomy pickers now
  // route through the shared Chip primitive; these just keep the three
  // chips flush across the row and their label centred, matching the old
  // toneChip layout geometry.
  toneChipFlex: { flex: 1, justifyContent: 'center' },
  toneChipLabel: { textAlign: 'center' },
});
