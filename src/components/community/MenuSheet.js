/**
 * MenuSheet (lead visual review 2026-09-06, ruling V16)
 *
 * One shared menu chrome for Community: a `BottomSheet` with the standard
 * `ModalHeader` (title, close) and rows in the `SettingRow` shape. Replaces
 * the three hand-rolled menus the visual inventory found (ProfileMenuSheet,
 * ConnectButton's own menu, the conversation menu) so a menu row stops being
 * redrawn per file.
 *
 * `ModalHeader` carries its own horizontal padding; the sheet's content
 * already pads every child by `spacing.lg`, so the header is wrapped in a
 * negative-margin bleed here to sit flush against the sheet edges exactly as
 * it does on every other modal in the app, with no change to either shared
 * primitive.
 *
 * D221 lane 2B (V3, V7): the rows are `EntryRow`s, 56 dp (64 with a `sub`),
 * a 32 dp `surface2` mark with a `textPrimary` glyph, never amber, each a
 * 48 dp target; the sheet's own `spacing.lg` gutter is taken back so the
 * hairlines span the sheet. A row with `disabled: true` is dimmed to
 * `textMuted`, its press does nothing and it reports the `disabled`
 * accessibility state.
 *
 * Props:
 *   visible  controlled, like every sheet in the app
 *   onClose  close the sheet
 *   title    the sheet's title, read by ModalHeader
 *   rows     [{icon, label, sub?, tone?: 'default'|'destructive', onPress,
 *             disabled?, accessibilityLabel?}]. `tone: 'destructive'` maps to
 *             EntryRow's `destructive`.
 */

import { View, StyleSheet } from 'react-native';
import BottomSheet from '../BottomSheet';
import ModalHeader from '../ModalHeader';
import EntryRow from './EntryRow';
import { spacing } from '../../styles/theme';

/** One row of the menu: an `EntryRow` with no chevron (a menu row acts at
 * once). It keeps the `label` / `sub` / `tone` names the menu's callers use. */
function MenuRow({
  icon, label, sub, tone, disabled, onPress, accessibilityLabel,
}) {
  return (
    <EntryRow
      icon={icon}
      title={label}
      subtitle={sub}
      destructive={tone === 'destructive'}
      disabled={disabled}
      onPress={onPress}
      trailing={null}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export default function MenuSheet({ visible, onClose, title, rows = [] }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel={title}>
      <View style={styles.headerBleed}>
        <ModalHeader title={title} onClose={onClose} />
      </View>
      <View style={styles.rows}>
        {rows.map((row, i) => (
          <MenuRow
            key={row.label ? `${row.label}-${i}` : i}
            icon={row.icon}
            label={row.label}
            sub={row.sub}
            tone={row.tone}
            disabled={!!row.disabled}
            onPress={row.onPress}
            accessibilityLabel={row.accessibilityLabel}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerBleed: { marginHorizontal: -spacing.lg, marginBottom: spacing.xs },
  // The sheet pads its children by `spacing.lg`; the rows carry the gutter
  // themselves, so the bleed lets their hairlines span the sheet.
  rows: { marginHorizontal: -spacing.lg, paddingBottom: spacing.sm },
});
