import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { calculatePlates, PLATE_SETS, DEFAULT_BAR_WEIGHT } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';

export default function PlateCalculator({ targetWeight, onClose }) {
  const barWeight = useAppStore(s => s.barWeight);
  const units = useAppStore(s => s.units);
  // Gym weight is stored in the display unit, so the plate set and bar default
  // have to follow it: kg plates on a 20 kg bar, lbs plates on a 45 lb bar.
  // (A2-043: was kg plates end to end regardless of unit.)
  const plateSet = PLATE_SETS[units] || PLATE_SETS.kg;
  const defaultBar = DEFAULT_BAR_WEIGHT[units] || DEFAULT_BAR_WEIGHT.kg;
  const isLbs = units === 'lbs';
  const [weight, setWeight] = useState(String(targetWeight || (isLbs ? 135 : 60)));
  const [bar, setBar] = useState(String(barWeight || defaultBar));

  const weightNum = parseFloat(weight) || 0;
  const barNum = parseFloat(bar) || defaultBar;
  // calculatePlates returns { plates, totalWeight } when weight <= bar and
  // omits sideWeight in that branch, guard with defaults so the render
  // doesn't crash on `.toFixed`.
  const calc = calculatePlates(weightNum, barNum, plateSet) || {};
  const plates = calc.plates ?? [];
  const totalWeight = calc.totalWeight ?? barNum;
  const sideWeight = calc.sideWeight ?? 0;

  // Real-world plate colours by weight. These are physical equipment standards
  // (kg: red 25, blue 20, yellow 15, green 10, white 5; lb: blue 45, yellow 35,
  // green 25), not theme colours, so they are deliberately literal.
  /* eslint-disable no-restricted-syntax */
  const plateColors = isLbs
    ? {
        45: '#1565C0',
        35: '#F9A825',
        25: '#2E7D32',
        10: '#616161',
        5: '#FFFFFF',
        2.5: '#BDBDBD',
      }
    : {
        25: '#E53935',
        20: '#1565C0',
        15: '#F9A825',
        10: '#2E7D32',
        5: '#FFFFFF',
        2.5: '#757575',
        1.25: '#BDBDBD',
      };
  /* eslint-enable no-restricted-syntax */

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Plate Calculator</Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close plate calculator"
        >
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputs}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Target ({units})</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel={`Target weight in ${units}`}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bar ({units})</Text>
          <TextInput
            style={styles.input}
            value={bar}
            onChangeText={setBar}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel={`Bar weight in ${units}`}
          />
        </View>
      </View>

      <View style={styles.resultHeader}>
        <Text style={styles.resultTotal}>{totalWeight.toFixed(1)} {units}</Text>
        <Text style={styles.resultSide}>Each side: {sideWeight.toFixed(1)} {units}</Text>
      </View>

      <View style={styles.barVisual}>
        <View style={styles.barLine} />
        <View style={styles.platesContainer}>
          {[...plates].reverse().map((plate, i) => (
            <View
              key={i}
              style={[
                styles.plate,
                {
                  backgroundColor: plateColors[plate] || colors.surface3,
                  // Scale per unit so lbs plates (up to 45) don't tower over the bar.
                  height: Math.max(28, Math.min(58, plate * (isLbs ? 1.1 : 2))),
                  width: plate >= (isLbs ? 35 : 20) ? 22 : plate >= (isLbs ? 25 : 10) ? 18 : 14,
                },
              ]}
            >
              <Text style={[styles.plateText, plate >= 10 ? styles.plateTextLarge : null]}>
                {plate}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.collar} />
      </View>

      {plates.length === 0 && (
        <Text style={styles.emptyText}>Bar only ({barNum} {units})</Text>
      )}

      <View style={styles.plateList}>
        {Object.entries(
          plates.reduce((acc, p) => ({ ...acc, [p]: (acc[p] || 0) + 1 }), {}),
        )
          .sort(([a], [b]) => b - a)
          .map(([plate, count]) => (
            <View key={plate} style={styles.plateRow}>
              <View style={[styles.plateDot, { backgroundColor: plateColors[plate] || colors.surface3 }]} />
              <Text style={styles.plateRowText}>
                {plate} {units} × {count * 2} (each side: {count})
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  inputs: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: fontWeight.bold,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  resultTotal: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.primary,
  },
  resultSide: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  barVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    height: 60,
  },
  barLine: {
    height: 12,
    width: 40,
    backgroundColor: colors.surface3,
    borderRadius: 3,
  },
  platesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plate: {
    marginHorizontal: 1,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.black,
    color: colors.background,
    transform: [{ rotate: '90deg' }],
  },
  plateTextLarge: {
    fontSize: fontSize.micro,
  },
  collar: {
    width: 8,
    height: 18,
    backgroundColor: colors.textSecondary,
    borderRadius: 3,
    marginLeft: spacing.xxs,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  plateList: {
    gap: spacing.xs,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  plateDot: {
    width: 12,
    height: 12,
    borderRadius: radius.sm,
  },
  plateRowText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
