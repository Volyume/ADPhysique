// G2 — "Supplements, honestly".
//
// A static, offline, copy-only reference (deep-audit Theme G2, blueprint
// bp-supplement-guidance.md). FREE for everyone; no data dependencies, no
// Supabase reads, no personalised state. Mirrors MethodologyScreen: an
// always-open opener, then collapsible sections.
//
// The differentiator is honesty with nothing to sell: the short evidence-
// backed list, an explicit "save your money" list, and a batch-testing note
// for drug-tested competitors. NEVER: PEDs, fat burners, appetite
// suppressants, diuretics, brand/affiliate links, or any weight-loss product.
//
// SAFETY: the You-tab ROW that opens this screen is HIDDEN under an active
// ED-pattern flag (handled in YouScreen); the screen itself names no
// individual and pushes nothing, but supplement talk is suppressed entirely
// while a flag is open.
//
// FOUNDER COPY GATE: every string reviewed before ship; evidence-graded and
// kept truthful (ISSN positions, NHS vitamin D guidance, the glutamine /
// BCAA meta-analyses). British English, no em dashes.

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, radius, type } from '../styles/theme';

const INTRO =
  'We have nothing to sell you. No shop, no affiliate links, no brand deals. ' +
  'So here is the honest version: a short list of supplements with real ' +
  'evidence behind them, and a longer list that is mostly a waste of your ' +
  'money. Food and training do the heavy lifting. These are the edges.';

const SECTIONS = [
  {
    key: 'worth_it',
    title: 'Worth considering',
    body:
      'Creatine monohydrate. The most studied supplement there is, and it works ' +
      'for almost everyone. About 3 to 5 g a day, every day; no need to load. ' +
      'Around 3 to 5 pounds a month. One honest heads-up: in the first few weeks ' +
      'it pulls a little water into your muscles, so the scale may jump half a ' +
      'kilo or so. That is water, not fat, and your coach already expects it.\n\n' +
      'Vitamin D. In a British autumn and winter there is not enough sunlight to ' +
      'make what you need, so the NHS suggests 10 micrograms (400 IU) a day for ' +
      'most adults. The one most UK gym-goers genuinely benefit from.\n\n' +
      'Protein powder. Not magic, just convenient food. Useful only if you ' +
      'struggle to hit your protein target from meals. Whey or a plant blend, ' +
      'whatever you tolerate.\n\n' +
      'Caffeine. A coffee before training does most of what a forty-pound tub of ' +
      'pre-workout does, for pennies.',
  },
  {
    key: 'skip',
    title: 'Save your money',
    body:
      'These are popular and heavily marketed, and the evidence does not back ' +
      'them up for a healthy person eating enough protein:\n\n' +
      'Glutamine. A large review of athletes found no benefit to muscle, ' +
      'strength or recovery. Your food already contains plenty.\n\n' +
      'BCAAs and EAAs. Redundant once you hit your daily protein. The amino acids ' +
      'are already in your meals and your protein powder.\n\n' +
      'Pre-workout blends, test boosters and greens powders. Expensive, and not ' +
      'worth it over coffee, real food and the basics above.',
  },
  {
    key: 'tested',
    title: 'If you compete in a tested federation',
    body:
      'Up to one in ten supplements on the open market has been found ' +
      'contaminated with a banned substance, often something never on the label. ' +
      'If you are drug-tested, only use products that are batch-tested and ' +
      'certified (for example Informed Sport), where every batch is screened ' +
      'before release. It is the only way to lower the risk meaningfully.',
  },
  {
    key: 'how',
    title: 'How to think about it',
    body:
      'Spend on food first, then sleep, then training. A supplement is the last ' +
      '1 to 2 per cent, not the foundation. If a product promises more than that, ' +
      'it is selling a feeling, not a result. This page is general information, ' +
      'not medical advice; if you have a health condition or take medication, ' +
      'check with a pharmacist or doctor before starting anything.',
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

export default function SupplementGuideScreen() {
  const [openKeys, setOpenKeys] = useState({ [SECTIONS[0].key]: true });
  const toggle = (key) => setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{INTRO}</Text>

        {SECTIONS.map((s) => (
          <CollapsibleSection
            key={s.key}
            title={s.title}
            body={s.body}
            open={!!openKeys[s.key]}
            onToggle={() => toggle(s.key)}
          />
        ))}

        <Text style={styles.credentialNote}>
          Evidence-led, and we have nothing to sell you. Food and training first;
          the rest is detail.
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
