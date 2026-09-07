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
 * Props:
 *   visible  controlled, like every sheet in the app
 *   onClose  close the sheet
 *   title    the sheet's title, read by ModalHeader
 *   rows     [{icon, label, sub?, tone?: 'default'|'destructive', onPress,
 *             accessibilityLabel?}]. `tone: 'destructive'` maps to
 *             SettingRow's own `destructive` prop.
 */

import { View, StyleSheet } from 'react-native';
import BottomSheet from '../BottomSheet';
import ModalHeader from '../ModalHeader';
import { SettingRow } from '../SettingsPrimitives';
import { spacing } from '../../styles/theme';

export default function MenuSheet({ visible, onClose, title, rows = [] }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel={title}>
      <View style={styles.headerBleed}>
        <ModalHeader title={title} onClose={onClose} />
      </View>
      <View style={styles.rows}>
        {rows.map((row, i) => (
          <SettingRow
            key={row.label ? `${row.label}-${i}` : i}
            icon={row.icon}
            label={row.label}
            sub={row.sub}
            destructive={row.tone === 'destructive'}
            onPress={row.onPress}
            showArrow={false}
            accessibilityLabel={row.accessibilityLabel}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerBleed: { marginHorizontal: -spacing.lg, marginBottom: spacing.xs },
  rows: { paddingBottom: spacing.sm },
});
