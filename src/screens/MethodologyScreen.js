// COMP-006, "How Precision Coaching works".
//
// A static, offline, copy-only trust surface: the first section starts open
// and the rest are collapsible. No data dependencies, no Supabase reads, no
// personalised state, so it renders identically for every user (including with
// an ED-pattern flag open, it describes the safety system in general terms and
// names no individual state). Reached from the Coach tab, from the coach-output
// WhyBlock, and from the held-decisions card.
//
// FOUNDER COPY GATE: every string here is reviewed before ship and is kept
// truthful against the engine. The §11 (2026-06-11) corrections are applied:
//   - the two-week cooldown carries its safety exception (rapid loss + low
//     energy can raise calories sooner, weeklyCoach.js:292),
//   - volume moves by -2..+3 sets (weeklyCoach.js:169), described as "removes
//     up to 2 or adds up to 3",
//   - the fat-free-mass floor figure (30 kcal/kg) is published; the absolute
//     calorie floor stays qualitative (no 1,200/1,500 numbers).
// This page is a living document: if the engine maths change, the copy must be
// re-reviewed against weeklyCoach.js / nutritionEngine.js.

import { useState, useEffect } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, type } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { track } from '../lib/engineTelemetry';
import CollapsibleSection from '../components/CollapsibleSection';
import BackHeader from '../components/BackHeader';

// The always-open opener.
const INTRO =
  'Precision Coaching is a rules-based system, not a chat bot. Each week it ' +
  'reads your logged training, your morning-weight trend, your food data when ' +
  'you use Eat, and your weekly check-in answers. It then decides what should ' +
  'change, what should hold, and why.';

// Collapsible sections. Each opens with the rule and closes with the
// mechanism (the "why the rule works", not just what it is).
const SECTIONS = [
  {
    key: 'inputs',
    title: 'What the coach reads',
    body:
      'The main signals are your completed sessions, your morning-weight trend, ' +
      'your nutrition target and diary data if you use Eat, and the weekly ' +
      'check-in. The check-in is where you add the context numbers cannot see: ' +
      'energy, soreness, sleep, stress, joint pain, illness, travel and anything ' +
      'else that affected the week. Volyume uses those inputs together; one ' +
      'noisy number on its own should not move the plan.',
  },
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
      'which of these applied. A held week is Precision Coaching working, not asleep.',
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
    // Locked Pattern 10 (COACHING_VOICE_SYNTHESIS_LOCKED.md): plain-mechanism
    // language, "lean mass", never "fat-free mass"/"FFM". The 30 kcal/kg
    // number and mechanism are unchanged.
    body:
      'Precision Coaching will not suggest a calorie cut if your average intake over ' +
      'the last seven days is already at or below the energy floor for your lean ' +
      'mass. That floor is 30 calories per kilogram of lean mass a day, taken ' +
      'from sports-medicine guidance on energy availability. Below it, the body ' +
      'starts breaking down muscle to fuel itself. There is also a fixed minimum ' +
      'below which Precision Coaching never suggests cutting, whatever the maths says. These checks ' +
      'are there by design. They are not bugs.',
  },
  {
    key: 'limits',
    title: 'What Precision Coaching cannot do',
    body:
      'It cannot see food you did not log. It cannot know how a set felt unless ' +
      'you log it or tell the check-in. It cannot diagnose injury, illness or body ' +
      'composition. It cannot override your choices. Its adjustments are suggestions ' +
      'until you apply them.',
  },
];

// Wave A B2: land the reader on the section their entry point is about,
// instead of always defaulting to the cooldown section. Falls back to the
// first section for unknown sources so the page never opens fully closed.
const SOURCE_SECTION = {
  held_decisions: 'holds',
  why_block: 'inputs',
  paywall: 'safety',
  goal_lock: 'safety',
  plan_reveal: 'training',
  trial_banner: 'inputs',
  setup_complete: 'inputs',
};

export default function MethodologyScreen({ route }) {
  // One collapsible section starts open so the page never reads as a wall of
  // closed rows; which one depends on where the reader came from.
  const initialKey = SOURCE_SECTION[route?.params?.source] ?? SECTIONS[0].key;
  const [openKeys, setOpenKeys] = useState({ [initialKey]: true });
  const toggle = (key) => setOpenKeys(prev => ({ ...prev, [key]: !prev[key] }));

  // COMP-006: one-time trust-formation signal. source distinguishes the entry
  // point (why_block / held_decisions / you_tab / paywall); no PII.
  useEffect(() => {
    const userId = useAppStore.getState().user?.id;
    if (!userId) return;
    track(userId, 'methodology_opened', { source: route?.params?.source ?? 'unknown' })?.catch?.(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="How Precision Coaching works" />
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
  intro: { ...type.body, color: colors.textPrimary, lineHeight: 24, marginBottom: spacing.sm },
  credentialNote: {
    ...type.caption,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
