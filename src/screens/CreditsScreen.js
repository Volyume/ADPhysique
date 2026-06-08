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
import { colors, spacing, fontSize, type } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';

function openUrl(url) {
  Linking.openURL(url).catch(() => {});
}

export default function CreditsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title="Credits" />

      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.intro}>
          The data and media Volyume uses come from open datasets and APIs published by the people and organisations below. Where their licence calls for it, the required attribution is shown verbatim.
        </Text>

        {/* OpenFoodFacts */}
        <Card borderless style={styles.card}>
          <Text style={styles.cardTitle}>OpenFoodFacts</Text>
          <Text style={styles.body}>
            Branded UK food data, both bundled (weekly snapshot) and live (barcode misses fall through to OFF's API).
          </Text>
          <Text style={styles.attribution}>
            Data licensed under the Open Database License (ODbL) 1.0. Derivative works are licensed under the same terms.
          </Text>
          <TouchableOpacity onPress={() => openUrl('https://world.openfoodfacts.org/')} accessibilityRole="link" accessibilityLabel="Open Food Facts website">
            <Text style={styles.link}>world.openfoodfacts.org</Text>
          </TouchableOpacity>
        </Card>

        {/* CoFID */}
        <Card borderless style={styles.card}>
          <Text style={styles.cardTitle}>McCance and Widdowson's Composition of Foods (CoFID)</Text>
          <Text style={styles.body}>
            Generic UK foods (raw chicken breast, plain oats, etc.) bundled into Volyume from the 7th edition (2021) dataset published by Public Health England / OHID.
          </Text>
          <Text style={styles.attribution}>
            Contains public sector information licensed under the Open Government Licence v3.0.
          </Text>
          <TouchableOpacity onPress={() => openUrl('https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid')} accessibilityRole="link" accessibilityLabel="CoFID dataset on gov.uk">
            <Text style={styles.link}>gov.uk · CoFID</Text>
          </TouchableOpacity>
        </Card>

        {/* USDA */}
        <Card borderless style={styles.card}>
          <Text style={styles.cardTitle}>USDA FoodData Central</Text>
          <Text style={styles.body}>
            North-American food data, hit only when both the bundled snapshot and OpenFoodFacts miss. Used for imported items and occasional UK gaps.
          </Text>
          <Text style={styles.attribution}>
            Public domain data published by the U.S. Department of Agriculture, Agricultural Research Service.
          </Text>
          <TouchableOpacity onPress={() => openUrl('https://fdc.nal.usda.gov/')} accessibilityRole="link" accessibilityLabel="USDA FoodData Central website">
            <Text style={styles.link}>fdc.nal.usda.gov</Text>
          </TouchableOpacity>
        </Card>

        {/* Exercise demonstrations */}
        <Card borderless style={styles.card}>
          <Text style={styles.cardTitle}>Exercise demonstrations</Text>
          <Text style={styles.body}>
            Animated exercise demonstrations shown on exercise pages, self-hosted by Volyume.
          </Text>
          <Text style={styles.attribution}>
            Exercise demonstration media sourced via WorkoutX. Underlying animations derive from the Everkinetic exercise library, licensed under the Creative Commons Attribution-ShareAlike 3.0 licence; redistributed under the same terms.
          </Text>
          <TouchableOpacity onPress={() => openUrl('https://creativecommons.org/licenses/by-sa/3.0/')} accessibilityRole="link" accessibilityLabel="Creative Commons Attribution-ShareAlike 3.0 licence">
            <Text style={styles.link}>creativecommons.org · CC BY-SA 3.0</Text>
          </TouchableOpacity>
        </Card>

        <Text style={styles.footnote}>
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
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  attribution: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  link: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  footnote: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
