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
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, hitSlop } from '../styles/theme';

function openUrl(url) {
  Linking.openURL(url).catch(() => {});
}

export default function CreditsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} hitSlop={hitSlop}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credits</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.intro}>
          The food data Volyume uses comes from open datasets and APIs published by the people and organisations below. Where their licence calls for it, the required attribution is shown verbatim.
        </Text>

        {/* OpenFoodFacts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>OpenFoodFacts</Text>
          <Text style={styles.body}>
            Branded UK food data, both bundled (weekly snapshot) and live (barcode misses fall through to OFF's API).
          </Text>
          <Text style={styles.attribution}>
            Data licensed under the Open Database License (ODbL) 1.0. Derivative works are licensed under the same terms.
          </Text>
          <TouchableOpacity onPress={() => openUrl('https://world.openfoodfacts.org/')}>
            <Text style={styles.link}>world.openfoodfacts.org</Text>
          </TouchableOpacity>
        </View>

        {/* CoFID */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>McCance and Widdowson's Composition of Foods (CoFID)</Text>
          <Text style={styles.body}>
            Generic UK foods (raw chicken breast, plain oats, etc.) bundled into Volyume from the 7th edition (2021) dataset published by Public Health England / OHID.
          </Text>
          <Text style={styles.attribution}>
            Contains public sector information licensed under the Open Government Licence v3.0.
          </Text>
          <TouchableOpacity onPress={() => openUrl('https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid')}>
            <Text style={styles.link}>gov.uk · CoFID</Text>
          </TouchableOpacity>
        </View>

        {/* USDA */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>USDA FoodData Central</Text>
          <Text style={styles.body}>
            North-American food data, hit only when both the bundled snapshot and OpenFoodFacts miss. Used for imported items and occasional UK gaps.
          </Text>
          <Text style={styles.attribution}>
            Public domain data published by the U.S. Department of Agriculture, Agricultural Research Service.
          </Text>
          <TouchableOpacity onPress={() => openUrl('https://fdc.nal.usda.gov/')}>
            <Text style={styles.link}>fdc.nal.usda.gov</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>
          Research, design, and code by the Volyume team. Bug reports and missing-product reports are welcome at support@volyume.app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.tabBarBorder,
  },
  headerTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  intro: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
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
