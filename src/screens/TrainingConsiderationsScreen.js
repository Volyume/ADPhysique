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
 */
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, AccessibilityInfo } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useTheme from '../hooks/useTheme';
import { type, spacing, radius } from '../styles/theme';
import PressableCard from '../components/PressableCard';
import * as haptics from '../lib/haptics';
import { SettingsPage, SectionHeader } from '../components/SettingsPrimitives';
import {
  searchProfiles, profileById, OTHER_PROFILE,
} from '../lib/capability/directory';
import { PROFILE_KIND, QUESTION_KIND } from '../lib/capability/directory/schema';

const kindChip = (p) => (p.kind === PROFILE_KIND.INJURY ? 'Injury' : 'Long-term');

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
    const notes = open.kind === PROFILE_KIND.INJURY
      ? (open.education ?? []).map(e => ({ text: e.text, source: open.evidence?.[e.evidenceIndex] }))
      : [
        ...(open.generalisable ?? []).map(text => ({ text, source: open.evidence?.[0] })),
        ...(open.setupConsiderations ?? []).map(text => ({ text, source: null })),
      ];
    return (
      <SettingsPage title={open.canonicalName}>
        <PressableCard
          accessibilityRole="button"
          accessibilityLabel="Back to all training considerations"
          onPress={() => { haptics.selection(); setOpenId(null); }}
          style={styles.backRow}
        >
          <Text style={[styles.hint, { color: t.colors.primary }]}>All considerations</Text>
        </PressableCard>
        <Text style={[styles.body, { color: t.colors.textSecondary }]}>{open.variability}</Text>
        <View style={[styles.proNote, { backgroundColor: t.colors.inputBg, borderColor: t.colors.border }]}>
          <Text style={[styles.body, { color: t.colors.textPrimary }]}>{open.professionalNote}</Text>
        </View>
        {open.clinicianBoundary ? (
          <View style={[styles.proNote, { backgroundColor: t.colors.inputBg, borderColor: t.colors.border }]}>
            <Text style={[styles.body, { color: t.colors.textPrimary }]}>{open.clinicianBoundary}</Text>
          </View>
        ) : null}

        <SectionHeader title="Set up what applies to you" />
        <Text style={[styles.hint, { color: t.colors.textSecondary }]}>
          People differ, so nothing is assumed. Each of these opens How you train with the choice ready to confirm, change or skip.
        </Text>
        {(questions ?? []).map(q => (
          <PressableCard
            key={q.id}
            accessibilityRole="button"
            accessibilityLabel={q.wording}
            accessibilityHint="Opens How you train with this ready to confirm"
            onPress={() => goToAddFlow(preselectFor(q))}
            style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
          >
            <Text style={[styles.cardTitle, { color: t.colors.textPrimary }]}>{q.wording}</Text>
            <Text style={[styles.cardWhy, { color: t.colors.textSecondary }]}>{q.whyAsked}</Text>
          </PressableCard>
        ))}
        <PressableCard
          accessibilityRole="button"
          accessibilityLabel="Something else about how you train"
          onPress={() => goToAddFlow(null)}
          style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
        >
          <Text style={[styles.cardTitle, { color: t.colors.textPrimary }]}>Something else</Text>
          <Text style={[styles.cardWhy, { color: t.colors.textSecondary }]}>
            The full How you train flow covers anything these do not.
          </Text>
        </PressableCard>

        {notes.length ? <SectionHeader title="Worth knowing" /> : null}
        {notes.map((n, i) => (
          <View key={`n${i}`} style={styles.note}>
            <Text style={[styles.body, { color: t.colors.textPrimary }]}>{n.text}</Text>
            {n.source ? (
              <Text style={[styles.source, { color: t.colors.textSecondary }]}>
                Source: {n.source.source}, {n.source.year}
              </Text>
            ) : null}
          </View>
        ))}

        {open.familyRelevance?.length ? (
          <View style={styles.note}>
            <Text style={[styles.hint, { color: t.colors.textSecondary }]}>
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
      <Text style={[styles.body, { color: t.colors.textSecondary }]}>
        Entirely optional. If a condition or an injury shapes how you train, finding it here selects better questions. You never need a name: describing how you train under How you train gives the same support.
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search, for example MS, shoulder, wheelchair"
        placeholderTextColor={t.colors.textSecondary}
        accessibilityLabel="Search conditions and injuries"
        style={[styles.search, {
          backgroundColor: t.colors.surface, borderColor: t.colors.border, color: t.colors.textPrimary,
        }]}
      />
      {results.map(p => (
        <PressableCard
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={p.id === OTHER_PROFILE.id ? `${p.canonicalName}. Opens the ordinary flow` : `${p.canonicalName}, ${kindChip(p)}`}
          onPress={() => openProfile(p)}
          style={[styles.row, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
        >
          <Text style={[styles.rowTitle, { color: t.colors.textPrimary }]}>{p.canonicalName}</Text>
          {p.id === OTHER_PROFILE.id
            ? <Text style={[styles.cardWhy, { color: t.colors.textSecondary }]}>{p.routeNote}</Text>
            : <Text style={[styles.chip, { color: t.colors.textSecondary }]}>{kindChip(p)}</Text>}
        </PressableCard>
      ))}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, marginBottom: spacing.md },
  hint: { ...type.bodySm, marginBottom: spacing.sm },
  search: {
    ...type.body, borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md,
    minHeight: 44,
  },
  row: {
    borderWidth: 1, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, minHeight: 44,
  },
  rowTitle: { ...type.bodyStrong },
  chip: { ...type.caption, marginTop: 2 },
  card: {
    borderWidth: 1, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, minHeight: 44,
  },
  cardTitle: { ...type.bodyStrong, marginBottom: 2 },
  cardWhy: { ...type.bodySm },
  note: { marginBottom: spacing.md },
  source: { ...type.caption, marginTop: 2 },
  proNote: {
    borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  backRow: { minHeight: 44, justifyContent: 'center', marginBottom: spacing.sm },
});
