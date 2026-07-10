/**
 * CreditsScreen
 *
 * Attribution surface required by the licences of the bundled and
 * live food data sources:
 *
 *   - OpenFoodFacts: Open Database License (ODbL) 1.0, requires
 *     attribution and share-alike for derivative works.
 *   - CoFID / McCance and Widdowson's: Open Government Licence v3.0
 *    , requires the verbatim attribution string (line 81 of
 *     FOOD_DATA_STRATEGY_LOCKED.md).
 *   - USDA FoodData Central: U.S. public domain, no attribution
 *     legally required but acknowledged here as a courtesy.
 *
 * Reached from You → Credits. Locked in UI_FLOWS_LOCKED.md lines
 * 205-207.
 */
import {
  Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  colors, spacing, fontSize, type, radius, iconSize,
} from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';

function openUrl(url) {
  Linking.openURL(url).catch(() => {});
}

export default function CreditsScreen() {
  // CP-10 batch D (2026-07-10): live theme (src/hooks/useTheme.js). See
  // buildLiveStyles header comment after the frozen `styles` block below.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
      <BackHeader title="Credits" />

      <ScrollView contentContainerStyle={styles.scroll}>

        <Text maxFontSizeMultiplier={1.3} style={[styles.intro, live.intro]}>
          The food data Volyume uses comes from open datasets and APIs published by the people and organisations below. Where their licence calls for it, the required attribution is shown verbatim.
        </Text>

        {/* OpenFoodFacts */}
        <Card borderless style={styles.card}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.cardTitle, live.cardTitle]}>OpenFoodFacts</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.body, live.body]}>
            Branded UK food data, both bundled (weekly snapshot) and live (barcode misses fall through to OFF's API).
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.attribution, live.attribution]}>
            Data licensed under the Open Database License (ODbL) 1.0. Derivative works are licensed under the same terms.
          </Text>
          <TouchableOpacity style={[styles.linkButton, live.linkButton]} onPress={() => openUrl('https://world.openfoodfacts.org/')} accessibilityRole="link" accessibilityLabel="Open Food Facts website">
            <Ionicons name="open-outline" size={iconSize.sm} color={t.colors.textSecondary} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.link, live.link]}>world.openfoodfacts.org</Text>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* CoFID */}
        <Card borderless style={styles.card}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.cardTitle, live.cardTitle]}>McCance and Widdowson's Composition of Foods (CoFID)</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.body, live.body]}>
            Generic UK foods (raw chicken breast, plain oats, etc.) bundled into Volyume from the 7th edition (2021) dataset published by Public Health England / OHID.
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.attribution, live.attribution]}>
            Contains public sector information licensed under the Open Government Licence v3.0.
          </Text>
          <TouchableOpacity style={[styles.linkButton, live.linkButton]} onPress={() => openUrl('https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid')} accessibilityRole="link" accessibilityLabel="CoFID dataset on gov.uk">
            <Ionicons name="open-outline" size={iconSize.sm} color={t.colors.textSecondary} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.link, live.link]}>gov.uk - CoFID</Text>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* USDA */}
        <Card borderless style={styles.card}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.cardTitle, live.cardTitle]}>USDA FoodData Central</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.body, live.body]}>
            North-American food data, hit only when both the bundled snapshot and OpenFoodFacts miss. Used for imported items and occasional UK gaps.
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.attribution, live.attribution]}>
            Public domain data published by the U.S. Department of Agriculture, Agricultural Research Service.
          </Text>
          <TouchableOpacity style={[styles.linkButton, live.linkButton]} onPress={() => openUrl('https://fdc.nal.usda.gov/')} accessibilityRole="link" accessibilityLabel="USDA FoodData Central website">
            <Ionicons name="open-outline" size={iconSize.sm} color={t.colors.textSecondary} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.link, live.link]}>fdc.nal.usda.gov</Text>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
          </TouchableOpacity>
        </Card>

        <Text maxFontSizeMultiplier={1.3} style={[styles.footnote, live.footnote]}>
          Research, design, and code by the Volyume team. Bug reports and missing-product reports are welcome at support@volyume.app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  intro: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    ...type.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  attribution: {
    ...type.bodySm,
    color: colors.textPrimary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  link: {
    ...type.label,
    color: colors.textPrimary,
    flex: 1,
  },
  linkButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
  },
  footnote: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});

// CP-10 batch D (2026-07-10): the frozen `styles` block above stays
// byte-identical. This mirrors ONLY the colour/fontSize/type-bearing
// sub-properties of the matching frozen style, at identical rest values, so
// this screen's tokens stay live under a theme/accessibility toggle. Pure
// layout keys (flex/gap/padding/width, no token) are correctly omitted --
// there is nothing to unfreeze for them. Same pattern as
// LogCardioScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    intro: { color: t.colors.textSecondary, fontSize: t.fontSize.md },
    cardTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    body: { ...t.type.bodySm, color: t.colors.textSecondary },
    attribution: { ...t.type.bodySm, color: t.colors.textPrimary },
    link: { ...t.type.label, color: t.colors.textPrimary },
    linkButton: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    footnote: { ...t.type.bodySm, color: t.colors.textMuted },
  };
}
