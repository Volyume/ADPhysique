import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';
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
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
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
            style={[styles.button, live.button, selected && [styles.buttonActive, live.buttonActive]]}
            onPress={() => onChange(period)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={accessibilityLabel}
          >
            {isAnnual ? (
              <View style={[styles.saveBadge, live.saveBadge]}>
                <Text style={[styles.saveBadgeText, live.saveBadgeText]}>Save {savingsPct}%</Text>
              </View>
            ) : null}
            <Text style={[styles.label, live.label, selected && [styles.textActive, live.textActive]]}>{label}</Text>
            <Text style={[styles.price, live.price, selected && [styles.textActive, live.textActive]]}>{price}</Text>
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

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. `row` has no colour tokens.
function buildLiveStyles(t) {
  return {
    button: { borderColor: t.colors.border, backgroundColor: t.colors.surface },
    buttonActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryBg },
    label: { color: t.colors.textSecondary },
    price: { color: t.colors.textPrimary },
    textActive: { color: t.colors.primary },
    saveBadge: { backgroundColor: t.colors.primaryFill },
    saveBadgeText: { color: t.colors.onPrimary },
  };
}
