/**
 * Training considerations - the optional condition and injury discovery
 * surface (gap-closure order sections 17 and 25; rulings GC-D1/D2/D4/D5).
 *
 * A person can find support for a named issue by searching for it, and
 * can get identical support without naming anything (the OTHER path and
 * the ordinary How you train flow). Selecting a profile is STATELESS:
 * this screen stores nothing, emits nothing, and never writes - each
 * question routes into the existing consent-gated add flow with the
 * question's functional content preselected, where the user still walks
 * durability, dates, consent and readback themselves.
 *
 * Free tier by law (CAP-19): registered unguarded; pinned by
 * capabilityDirectoryDiscovery.test.js. Condition names are permitted
 * on this surface alone (GC-D4); function/benefit vocabulary is banned
 * by the directory schema validator over every profile string.
 *
 * VISUAL (restyle 2026-09-02): this screen had grown its own parallel
 * design system - hand-rolled bordered rectangles, a hand-rolled search
 * input and no icons - so it read as a different app from Today, Train
 * and Progress. It now composes from the same shared primitives every
 * other list surface uses: `settingsStyles.section` groups holding
 * `SettingRow`s, the shared `TextField`, `Card` for quiet notes and
 * `EmptyState` for no-results. Those primitives also carry the capability
 * lane's 48dp touch-target rule by construction (SettingRow pads to ~56,
 * TextField's md size to 50), which is what capabilityTouchTargets.guard
 * exists to protect. No logic, routing, copy law or persistence changed.
 */
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import { type, spacing, iconSize } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import PressableCard from '../components/PressableCard';
import Card from '../components/Card';
import TextField from '../components/TextField';
import EmptyState from '../components/EmptyState';
import * as haptics from '../lib/haptics';
import {
  SettingsPage, SettingRow, SectionHeader, settingsStyles, useSettingsStyles,
} from '../components/SettingsPrimitives';
import {
  searchProfiles, profileById, OTHER_PROFILE,
} from '../lib/capability/directory';
import { PROFILE_KIND, QUESTION_KIND } from '../lib/capability/directory/schema';

const kindChip = (p) => (p.kind === PROFILE_KIND.INJURY ? 'Injury' : 'Long-term');

// Icon per profile kind, from the vocabulary already used elsewhere in the
// app. The OTHER route is not a condition, so it never wears a condition icon.
const profileIcon = (p) => {
  if (p.id === OTHER_PROFILE.id) return 'ellipsis-horizontal-circle-outline';
  return p.kind === PROFILE_KIND.INJURY ? 'medkit-outline' : 'body-outline';
};

// The question's functional content, shaped for the How you train add
// flow's preselect contract (GC-D1: a suggestion, never a write).
function preselectFor(question) {
  switch (question.kind) {
    case QUESTION_KIND.DEMAND:
      return { kind: 'demand', axes: [question.demandId] };
    case QUESTION_KIND.FAMILY:
      return { kind: 'family', families: question.familyKeys };
    case QUESTION_KIND.EXERCISE_LIST:
      return { kind: 'exercise', exerciseNames: question.exerciseNames };
    default:
      return null;
  }
}

export default function TrainingConsiderationsScreen() {
  const t = useTheme();
  const live = useSettingsStyles();
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const results = useMemo(() => searchProfiles(query), [query]);
  const open = openId ? profileById(openId) : null;

  const goToAddFlow = (preselect) => {
    haptics.selection();
    navigation.navigate('HowYouTrain', preselect ? { preselect } : undefined);
  };

  const openProfile = (p) => {
    haptics.selection();
    if (p.id === OTHER_PROFILE.id) { goToAddFlow(null); return; }
    setOpenId(p.id);
    AccessibilityInfo.announceForAccessibility(`${p.canonicalName} opened`);
  };

  // ── Detail mode ─────────────────────────────────────────────────────
  if (open) {
    const questions = open.kind === PROFILE_KIND.INJURY ? open.movementQuestions : open.functionalQuestions;
    // Founder order 2026-08-21 (surface the hidden user value): guidance
    // written for these profiles used to sit in the data unrendered.
    // "Worth knowing" carries the training guidance in the section 9
    // order - what is generally supported, then practical setup, then the
    // profile's own extra notes on quieter weeks and one-sided training.
    // Field names never reach the user; the classification of which
    // strings render lives in DISABILITY-PROFILE-GUIDANCE-COVERAGE.md.
    const notes = open.kind === PROFILE_KIND.INJURY
      ? (open.education ?? []).map(e => ({ text: e.text, source: open.evidence?.[e.evidenceIndex] }))
      : [
        ...(open.generalisable ?? []).map(text => ({ text, source: open.evidence?.[0] })),
        ...(open.setupConsiderations ?? []).map(text => ({ text, source: null })),
        ...(open.fatigueNote ? [{ text: open.fatigueNote, source: null }] : []),
        ...(open.lateralityNote ? [{ text: open.lateralityNote, source: null }] : []),
      ];
    // App support is a different subject from training guidance, so it
    // gets its own quiet heading rather than being mixed in above. Only
    // rendered when the profile actually has something to say.
    const appNotes = open.accessibilityConsiderations ?? [];
    return (
      <SettingsPage title={open.canonicalName}>
        {/* In-screen back: the profile is local state, so the page's own
            back chevron would leave the feature entirely. */}
        <PressableCard
          accessibilityRole="button"
          accessibilityLabel="Back to all training considerations"
          onPress={() => { haptics.selection(); setOpenId(null); }}
          style={styles.backRow}
        >
          <Ionicons name="arrow-back" size={iconSize.sm} color={t.colors.primary} />
          <Text style={[styles.backLabel, { color: t.colors.primary }]}>All considerations</Text>
        </PressableCard>

        <View style={styles.intro}>
          <Text style={[styles.introBody, { color: t.colors.textSecondary }]}>{open.variability}</Text>
        </View>

        <View style={styles.block}>
          <Card>
            <Text style={[styles.noteText, { color: t.colors.textPrimary }]}>{open.professionalNote}</Text>
          </Card>
        </View>
        {open.clinicianBoundary ? (
          <View style={styles.block}>
            <Card>
              <Text style={[styles.noteText, { color: t.colors.textPrimary }]}>{open.clinicianBoundary}</Text>
            </Card>
          </View>
        ) : null}

        <SectionHeader title="Set up what applies to you" />
        <View style={styles.lead}>
          <Text style={[styles.leadText, { color: t.colors.textSecondary }]}>
            People differ, so nothing is assumed. Tapping one opens How you train with the answer filled in, ready for you to confirm, change or skip.
          </Text>
        </View>
        <View style={[settingsStyles.section, live.section]}>
          {(questions ?? []).map(q => (
            <SettingRow
              key={q.id}
              icon="help-circle-outline"
              label={q.wording}
              sub={q.whyAsked}
              accessibilityLabel={q.wording}
              accessibilityHint="Opens How you train with this ready to confirm"
              onPress={() => goToAddFlow(preselectFor(q))}
            />
          ))}
          <SettingRow
            icon="ellipsis-horizontal-circle-outline"
            label="Something else"
            sub="If none of these fit, How you train covers anything else."
            accessibilityLabel="Something else about how you train"
            onPress={() => goToAddFlow(null)}
          />
        </View>

        {notes.length ? <SectionHeader title="Worth knowing" /> : null}
        {notes.map((n, i) => (
          <View key={`n${i}`} style={styles.block}>
            <Card>
              <Text style={[styles.noteText, { color: t.colors.textPrimary }]}>{n.text}</Text>
              {n.source ? (
                <Text style={[styles.source, { color: t.colors.textMuted }]}>
                  Source: {n.source.source}, {n.source.year}
                </Text>
              ) : null}
            </Card>
          </View>
        ))}

        {appNotes.length ? <SectionHeader title="Using Volyume" /> : null}
        {appNotes.map((text, i) => (
          <View key={`a${i}`} style={styles.block}>
            <Card>
              <Text style={[styles.noteText, { color: t.colors.textPrimary }]}>{text}</Text>
            </Card>
          </View>
        ))}

        {open.familyRelevance?.length ? (
          <View style={styles.lead}>
            <Text style={[styles.leadText, { color: t.colors.textMuted }]}>
              Plans that often fit: {open.familyRelevance.join(', ')}. All plans stay open to everyone; these are starting points, not labels.
            </Text>
          </View>
        ) : null}
      </SettingsPage>
    );
  }

  // ── Search and list mode ────────────────────────────────────────────
  return (
    <SettingsPage title="Training considerations">
      <View style={styles.intro}>
        <Text style={[styles.introBody, { color: t.colors.textPrimary }]}>
          Entirely optional. If a condition or an injury shapes how you train, finding it here brings up the questions that matter for it.
        </Text>
        <Text style={[styles.introHint, { color: t.colors.textSecondary }]}>
          You never need a name: describing how you train under How you train gives you the same support.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search, for example MS, shoulder, wheelchair"
          accessibilityLabel="Search conditions and injuries"
          autoCorrect={false}
          leading={<Ionicons name="search-outline" size={iconSize.md} color={t.colors.textMuted} />}
        />
      </View>

      {results.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Nothing matches that"
          text="Try a different word, or describe how you train under How you train instead. You never need a name to get the same support."
          compact
        />
      ) : (
        <View style={[settingsStyles.section, live.section]}>
          {results.map(p => (
            <SettingRow
              key={p.id}
              icon={profileIcon(p)}
              label={p.canonicalName}
              sub={p.id === OTHER_PROFILE.id ? p.routeNote : kindChip(p)}
              accessibilityLabel={p.id === OTHER_PROFILE.id ? `${p.canonicalName}. Opens the ordinary flow` : `${p.canonicalName}, ${kindChip(p)}`}
              onPress={() => openProfile(p)}
            />
          ))}
        </View>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  // Screen-edge blocks match the Settings family's own rhythm: the shared
  // page already pads its scroll content, so these only add vertical space.
  intro: { paddingHorizontal: spacing.xs, paddingBottom: spacing.md, gap: spacing.sm },
  introBody: { ...type.body },
  introHint: { ...type.bodySm },
  lead: { paddingHorizontal: spacing.xs, paddingBottom: spacing.sm },
  leadText: { ...type.bodySm },
  searchWrap: { paddingBottom: spacing.md },
  block: { paddingBottom: spacing.sm, gap: spacing.xs },
  noteText: { ...type.bodySm },
  source: { ...type.caption, marginTop: spacing.xs },
  backRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    minHeight: touchTarget.minimum, paddingHorizontal: spacing.xs,
  },
  backLabel: { ...type.label },
});
