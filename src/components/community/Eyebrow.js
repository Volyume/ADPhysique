/**
 * Eyebrow (communities revamp 2026-09-10: `docs/communities-revamp-
 * 2026-09-10/21-PHASE1-SPEC.md` section 1, "Eyebrow"; `20-BLUEPRINT.md`
 * section 9 rule 3: "Sections are uppercase eyebrow labels (`caption`,
 * `letterSpacing.overline`, `textMuted`) with `spacing.xl` above and
 * `spacing.sm` below; no boxed section, no nested container").
 *
 * Replaces `SectionLabel` on the four revamped Community screens
 * (`SectionLabel` stays as-is for every other screen; section 6c guards
 * those four screens never import it again). The label takes `type.
 * caption`'s shape (fontFamily/fontSize/lineHeight) but with letterSpacing
 * overridden to the named `letterSpacing.overline` token and an uppercase
 * transform, exactly as the spec's own field list gives it; that is a
 * deliberate, lighter-weight look than `type.overline` (which carries a
 * medium font weight this spec does not ask for), so the two type roles
 * are not interchangeable here.
 *
 * Rules obeyed (section 1 preamble; `docs/rules/styling.md`): function
 * component, `useTheme`, tokens only, `StyleSheet.create` at the bottom,
 * effective target 48 dp (`hitSlop`) and an `accessibilityRole` + label on
 * the one interactive element. No amber anywhere in this file (pinned by
 * `rows.amber.guard.test.js`, zero `c.primary` uses: an eyebrow is
 * structure, never the emphatic thing on the screen). Never imports
 * `../../lib/database` (privacy guard, section 6d).
 *
 * Props:
 *   children  the label text (rendered uppercase by the style, so pass it
 *             in normal case)
 *   trailing  optional { label, onPress } for a single quiet trailing
 *             action ("New group", "See all"); omit for a plain section
 *             label
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing, type, colors, letterSpacing, hitSlop } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

export default function Eyebrow({ children, trailing }) {
  const t = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: t.colors.textMuted }]} numberOfLines={1}>
        {children}
      </Text>
      {trailing ? (
        <Pressable
          onPress={trailing.onPress}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel={trailing.label}
        >
          <Text style={[styles.trailing, { color: t.colors.textSecondary }]} numberOfLines={1}>
            {trailing.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  label: {
    ...type.caption,
    letterSpacing: letterSpacing.overline,
    textTransform: 'uppercase',
    color: colors.textMuted,
    flexShrink: 1,
  },
  trailing: { ...type.label, color: colors.textSecondary, marginLeft: spacing.md },
});
