// COMP-006 — "How Precision Coaching works".
//
// A static, offline, copy-only trust surface: six sections, the first always
// open, the rest collapsible. No data dependencies, no Supabase reads, no
// personalised state, so it renders identically for every user (including with
// an ED-pattern flag open — it describes the safety system in general terms and
// names no individual state). Reached from the You tab, from the coach-output
// WhyBlock, and from the held-decisions card.
//
// FOUNDER COPY GATE: every string here is reviewed before ship and is kept
// truthful against the engine. The §11 (2026-06-11) corrections are applied:
//   - the two-week cooldown carries its safety exception (rapid loss + low
//     energy can raise calories sooner — weeklyCoach.js:292),
//   - volume moves by -2..+3 sets (weeklyCoach.js:169), described as "removes
//     up to 2 or adds up to 3",
//   - the fat-free-mass floor figure (30 kcal/kg) is published; the absolute
//     calorie floor stays qualitative (no 1,200/1,500 numbers).
// This page is a living document: if the engine maths change, the copy must be
// re-reviewed against weeklyCoach.js / nutritionEngine.js.

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, radius, type } from '../styles/theme';

// The always-open opener.
const INTRO =
  'Every week, Precision Coaching reads your weight trend, your check-in and ' +
  'your training. It compares what happened to what was expected. That ' +
  'comparison drives the decision. Nothing is random. Everything can be explained.';

// Sections 2–6: collapsible. Each opens with the rule and closes with the
// mechanism (the "why the rule works", not just what it is).
const SECTIONS = [
  {
    key: 'cooldown',
    title: 'Why changes wait',
    body:
      'Your calorie target normally changes at most once every two weeks, so the ' +
      'weight trend has time to settle. Acting faster than that just chases noise. ' +
      'The one exception is safety: if your weight is dropping faster than it should ' +
      'and your energy is low, Precision Coaching can raise your calories straight ' +
      'away, without waiting for the two weeks.',
  },
  {
    key: 'holds',
    title: 'Why holds happen',
    body:
      'When the trend is on target, when there is not enough data yet, when ' +
      'recovery is low, or when a safety signal fires, Precision Coaching holds ' +
      'rather than acts. The held-decision card on your weekly review shows exactly ' +
      'which of these applied. A held week is the system working, not the system asleep.',
  },
  {
    key: 'training',
    title: 'Training signals',
    body:
      'Volume changes by removing up to 2 sets or adding up to 3 sets per muscle ' +
      'each week, based on how your energy, soreness and completed sessions scored ' +
      'together. If recovery is low, volume holds or drops. If recovery is strong ' +
      'and you hit your sessions, it adds. The same scoring runs every week.',
  },
  {
    key: 'safety',
    title: 'Safety floors',
    body:
      'Precision Coaching will not suggest a calorie cut if your average intake over ' +
      'the last seven days is already at or below the energy floor for your fat-free ' +
      'mass. That floor is 30 calories per kilogram of fat-free mass a day, taken ' +
      'from sports-medicine guidance on energy availability. Below it, the body ' +
      'starts breaking down muscle to fuel itself. There is also a fixed minimum ' +
      'below which we never suggest cutting, whatever the maths says. These checks ' +
      'are there by design. They are not bugs.',
  },
  {
    key: 'limits',
    title: 'What Precision Coaching cannot do',
    body:
      'It cannot see food you did not log. It cannot read how you feel, only what ' +
      'you scored. It cannot override your choices. Its adjustments are suggestions ' +
      'until you apply them.',
  },
];

function CollapsibleSection({ title, body, open, onToggle }) {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {open ? <Text style={styles.sectionBody}>{body}</Text> : null}
    </View>
  );
}

export default function MethodologyScreen() {
  // First collapsible section starts open so the page never reads as a wall of
  // closed rows; the rest are tap-to-open. Set is keyed by section key.
  const [openKeys, setOpenKeys] = useState({ [SECTIONS[0].key]: true });
  const toggle = (key) => setOpenKeys(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{INTRO}</Text>

        {SECTIONS.map(s => (
          <CollapsibleSection
            key={s.key}
            title={s.title}
            body={s.body}
            open={!!openKeys[s.key]}
            onToggle={() => toggle(s.key)}
          />
        ))}

        <Text style={styles.credentialNote}>
          Built on published training and sports-medicine science. Every change has
          a reason. Every non-change has a reason too.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  intro: { fontSize: fontSize.md, color: colors.textPrimary, lineHeight: 24, marginBottom: spacing.sm },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...type.bodyStrong, color: colors.textPrimary, flex: 1, paddingRight: spacing.md },
  sectionBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22, marginTop: spacing.md },
  credentialNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
