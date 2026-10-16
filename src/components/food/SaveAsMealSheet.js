/**
 * SaveAsMealSheet: "Save as meal" for the Diary's selected entries, moved
 * out of DiaryScreen.js as a named component (D230 R4, 4.7) with the same
 * behaviour: the caller captured the items before this opened, the name is
 * typed here, Save is disabled until there is one. The title is a heading
 * (D230 R16); the line under it is a full sentence (D230 R15).
 */
import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import BottomSheet from '../BottomSheet';
import SectionLabel from '../SectionLabel';
import TextField from '../TextField';
import Button from '../Button';
import { colors, spacing, radius, type, fontSize } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

// "{n} entries saved together. Give the meal a name."
export function saveMealHint(count) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? 'entry' : 'entries'} saved together. Give the meal a name.`;
}

export default function SaveAsMealSheet({
  visible, count = 0, name = '', onChangeName, onClose, onSave,
}) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const canSave = !!name.trim();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      keyboardAvoiding
      accessibilityLabel="Save as meal"
    >
      <SectionLabel heading style={styles.title}>Save as meal</SectionLabel>
      <Text style={[styles.hint, live.hint]}>{saveMealHint(count)}</Text>
      <TextField
        fieldStyle={styles.inputField}
        inputStyle={[styles.input, live.input]}
        value={name}
        onChangeText={onChangeName}
        placeholder="e.g. My breakfast"
        placeholderTextColor={t.colors.textMuted}
        accessibilityLabel="Meal name"
        autoFocus
        maxLength={60}
        returnKeyType="done"
        onSubmitEditing={onSave}
      />
      <View style={styles.actions}>
        <Button
          title="Cancel"
          variant="secondary"
          size="sm"
          fullWidth={false}
          style={styles.btn}
          textStyle={[styles.btnText, live.btnText]}
          onPress={onClose}
          accessibilityLabel="Cancel"
        />
        <Button
          title="Save"
          size="sm"
          fullWidth={false}
          style={styles.btn}
          textStyle={[styles.btnTextPrimary, live.btnTextPrimary]}
          onPress={onSave}
          disabled={!canSave}
          accessibilityLabel="Save meal"
          accessibilityState={{ disabled: !canSave }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.sm,
  },
  hint: {
    ...type.bodySm, color: colors.textMuted,
    paddingHorizontal: spacing.sm, paddingBottom: spacing.md,
  },
  inputField: { borderRadius: radius.md, marginHorizontal: spacing.sm },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  actions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: spacing.md, gap: spacing.sm,
  },
  btn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  btnText: { ...type.body, color: colors.textPrimary },
  btnTextPrimary: { ...type.label, color: colors.textPrimary },
});

// The tree's frozen-plus-live pattern: colour- and type-bearing keys only.
function buildLiveStyles(t) {
  return {
    hint: { ...t.type.bodySm, color: t.colors.textMuted },
    input: { fontSize: t.fontSize.md },
    btnText: { ...t.type.body, color: t.colors.textPrimary },
    btnTextPrimary: { ...t.type.label, color: t.colors.textPrimary },
  };
}
