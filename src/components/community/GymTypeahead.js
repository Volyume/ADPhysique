/**
 * GymTypeahead (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 8;
 * SD-27)
 *
 * The gym field on the profile editor, with the labels already used in
 * the same area offered as you type.
 *
 * The whole point is de-duplication: "PureGym Leeds" chosen once and then
 * chosen again, rather than retyped into four near misses that never join
 * up into one gym page. Typing anything else is still allowed, which is
 * what "Use what I typed" says out loud, because a gym nobody has listed
 * yet has to be able to exist.
 *
 * There is no map, no radius and no verification behind this (SD-10):
 * these are labels other people typed, in the same area label, and
 * nothing more.
 *
 * WHY THE RPC IS CALLED HERE. `community_gym_suggest(_area_key, _prefix)`
 * reads the CALLER's own area when `_area_key` is null, which is exactly
 * this screen's case: the profile card carries `area_label`, never
 * `area_key`, so the client has no key to pass. The landed helper
 * `gymSuggest(areaKey, prefix)` answers an empty list without one, so
 * this calls the same RPC through the same transport (the one place the
 * consent, session and sign-out gates live) with the key left null.
 *
 * Props:
 *   value         the typed label
 *   onChangeText  (text) the field changed
 *   onSelect      (label) a suggestion was chosen
 *   areaKey       optional; null means "the area on my own profile"
 *   maxLength     clamp for the label
 *   label, hint   field label and the line beneath it
 */

import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import TextField from '../TextField';
import PressableCard from '../PressableCard';
import { spacing, type, colors, iconSize } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { callCommunity } from '../../lib/community';

// The same debounce the handle check and the food search use, for the
// same reason: a live read per keystroke is a request per keystroke.
const DEBOUNCE_MS = 250;
const MIN_PREFIX = 2;
const MAX_SUGGESTIONS = 6;

export const USE_TYPED_LABEL = 'Use what I typed';

/** The rows a payload carries, in the shape the list renders. */
export function suggestionsFrom(data) {
  const rows = Array.isArray(data?.gyms) ? data.gyms : (Array.isArray(data) ? data : []);
  return rows
    .map((row) => (typeof row === 'string'
      ? { label: row, count: 0 }
      : { label: row?.label ?? null, count: Number(row?.count ?? 0) }))
    .filter((row) => !!row.label)
    .slice(0, MAX_SUGGESTIONS);
}

export default function GymTypeahead({
  value,
  onChangeText,
  onSelect,
  areaKey = null,
  maxLength,
  label = 'Trains at',
  hint = 'Only the name you type. Never your location.',
}) {
  const t = useTheme();
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const seqRef = useRef(0);

  useEffect(() => {
    const text = String(value ?? '').trim();
    if (text.length < MIN_PREFIX) { setSuggestions([]); return undefined; }
    const seq = seqRef.current + 1;
    seqRef.current = seq;
    const timer = setTimeout(async () => {
      try {
        const data = await callCommunity('community_gym_suggest', {
          _area_key: areaKey, _prefix: text,
        });
        // Request-id guard: a slower earlier read must never overwrite a
        // newer answer (the food search's own pattern).
        if (seqRef.current !== seq) return;
        const rows = suggestionsFrom(data).filter(
          (row) => row.label.toLowerCase() !== text.toLowerCase(),
        );
        setSuggestions(rows);
        setOpen(rows.length > 0);
      } catch (_e) {
        // A suggestion list is a convenience. Losing it leaves a plain
        // field that still works, so nothing is said about it.
        if (seqRef.current !== seq) return;
        setSuggestions([]);
        setOpen(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, areaKey]);

  return (
    <View style={styles.field}>
      <TextField
        label={label}
        value={value}
        onChangeText={(v) => onChangeText?.(maxLength ? v.slice(0, maxLength) : v)}
        accessibilityLabel="Gym you train at"
      />
      {open && suggestions.length ? (
        <View style={styles.list}>
          {suggestions.map((row) => (
            <PressableCard
              key={row.label}
              onPress={() => {
                onSelect?.(row.label);
                onChangeText?.(row.label);
                setOpen(false);
              }}
              style={styles.row}
              accessibilityLabel={`Use ${row.label}`}
            >
              <Ionicons name="business-outline" size={iconSize.sm} color={t.colors.textSecondary} />
              <Text
                style={[styles.rowLabel, { ...t.type.bodySm, color: t.colors.textPrimary }]}
                numberOfLines={1}
              >
                {row.count > 0 ? `${row.label} · ${row.count}` : row.label}
              </Text>
            </PressableCard>
          ))}
          <PressableCard
            onPress={() => setOpen(false)}
            style={styles.row}
            accessibilityLabel="Use the gym name I typed"
          >
            <Ionicons name="create-outline" size={iconSize.sm} color={t.colors.textSecondary} />
            <Text style={[styles.rowLabel, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
              {USE_TYPED_LABEL}
            </Text>
          </PressableCard>
        </View>
      ) : null}
      {hint ? (
        <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  list: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowLabel: { ...type.bodySm, color: colors.textPrimary, flex: 1 },
  hint: { ...type.caption, color: colors.textMuted },
});
