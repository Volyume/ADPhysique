import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { annualSavingsPct } from '../lib/payments/catalogue';

const DEFAULT_ORDER = ['annual', 'monthly'];
const PRICE_LOADING = '\u2026';

export default function BillingPeriodSelector({
  value,
  onChange,
  monthlyPrice,
  annualPrice,
  disabled = false,
  order = DEFAULT_ORDER,
  style,
}) {
  const savingsPct = annualSavingsPct();
  const prices = { annual: annualPrice, monthly: monthlyPrice };

  return (
    <View style={[styles.row, style]}>
      {order.map((period) => {
        const selected = value === period;
        const isAnnual = period === 'annual';
        const label = isAnnual ? 'Annual' : 'Monthly';
        const price = prices[period] ?? PRICE_LOADING;
        const accessibilityLabel = isAnnual
          ? (annualPrice ? `Annual, ${annualPrice}, save ${savingsPct} per cent` : `Annual, save ${savingsPct} per cent`)
          : (monthlyPrice ? `Monthly, ${monthlyPrice}` : 'Monthly');
        return (
          <TouchableOpacity
            key={period}
            style={[styles.button, selected && styles.buttonActive]}
            onPress={() => onChange(period)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={accessibilityLabel}
          >
            {isAnnual ? (
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save {savingsPct}%</Text>
              </View>
            ) : null}
            <Text style={[styles.label, selected && styles.textActive]}>{label}</Text>
            <Text style={[styles.price, selected && styles.textActive]}>{price}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  button: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  buttonActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  price: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  textActive: { color: colors.primary },
  saveBadge: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    backgroundColor: colors.primaryFill,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  saveBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.onPrimary },
});
