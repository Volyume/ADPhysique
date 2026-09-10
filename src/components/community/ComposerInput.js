/**
 * ComposerInput (lead visual review 2026-09-06, ruling V17)
 *
 * The one multiline text field Community writes into: a story caption, a
 * moderation note, a comment or a message. Wraps
 * the shared `TextField` in `multiline` mode on `surface2` (`TextField`'s
 * own default) with `radius.md` (`TextField`'s own field radius), so every
 * one of those fields stops hand-rolling its own bordered `<TextInput>`.
 *
 * Props:
 *   value             the field's text
 *   onChangeText       (text) => void
 *   placeholder        prompt shown when empty
 *   maxLength          character ceiling
 *   minHeight          the field's minimum height; defaults to TextField's
 *                      own multiline minimum when omitted
 *   accessibilityLabel spoken label
 *   autoFocus          optional, focuses the field on mount
 *
 * Any other native TextInput prop a caller still needs (an existing
 * `editable`, say) passes straight through to `TextField` unchanged.
 */

import { StyleSheet } from 'react-native';
import TextField from '../TextField';

export default function ComposerInput({
  value,
  onChangeText,
  placeholder,
  maxLength,
  minHeight,
  accessibilityLabel,
  autoFocus = false,
  ...rest
}) {
  return (
    <TextField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      maxLength={maxLength}
      accessibilityLabel={accessibilityLabel}
      autoFocus={autoFocus}
      multiline
      surface="surface2"
      inputStyle={[styles.input, minHeight ? { minHeight } : null]}
      {...rest}
    />
  );
}

// The field's own cap on how tall it grows before scrolling internally; not
// a prop, since every Community composer wants the same ceiling.
const styles = StyleSheet.create({
  input: { maxHeight: 120 },
});
