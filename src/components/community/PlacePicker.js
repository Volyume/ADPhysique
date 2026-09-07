/**
 * PlacePicker: choose a Community "place" (community product audit
 * 2026-09-07, `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md`
 * section 1.2; `20-JUDGEMENT.md` section 7, LJ-01). A place is a town or
 * a postcode district, resolved server-side from typed text ONLY: never
 * the device's own coordinate. Shown to other people as "In Motherwell",
 * never a distance and never the postcode itself.
 *
 * This previews a place with the read-only `placeCentroid()` (never
 * mutates anything on its own) and hands the resolved place back through
 * `onChange`; the CALLER commits it (`setPlace`, `src/lib/community`) at
 * its own save time, the same "picker proposes, screen saves" shape
 * `GymPicker`'s `onSelect` + `setGyms` already uses.
 *
 * Props:
 *   label            the currently-saved place label, or null
 *   onChange         ({kind, label, lat, lng} | null) => void; null means
 *                    "clear the place" (the caller sends `setPlace('')`)
 *   gymTown          optional: the caller's main gym's town, for the
 *                    "Use my gym's town" shortcut
 *   accessibilityLabel
 */

import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../Card';
import Button from '../Button';
import TextField from '../TextField';
import useTheme from '../../hooks/useTheme';
import { spacing, type } from '../../styles/theme';
import { placeCentroid } from '../../lib/gyms';

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

const HINT = "Shown as 'In Motherwell'. Used to find people near you. Never your exact location.";

export default function PlacePicker({
  label = null,
  onChange,
  gymTown = null,
  accessibilityLabel = 'Place',
}) {
  const t = useTheme();
  const [editing, setEditing] = useState(!label);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(null); // {kind, label, lat, lng} | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!editing) return undefined;
    const text = query.trim();
    if (text.length < MIN_QUERY) {
      setPreview(null);
      setLoading(false);
      setError(null);
      return undefined;
    }
    setLoading(true);
    const seq = seqRef.current + 1;
    seqRef.current = seq;
    const timer = setTimeout(async () => {
      try {
        const out = await placeCentroid(text);
        if (seqRef.current !== seq) return;
        setPreview(out.kind === 'none' ? null : out);
        setError(null);
      } catch (e) {
        if (seqRef.current !== seq) return;
        setPreview(null);
        setError(e?.code ?? 'unavailable');
      } finally {
        if (seqRef.current === seq) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, editing]);

  function useThisPlace() {
    if (!preview) return;
    onChange?.(preview);
    setEditing(false);
    setQuery('');
    setPreview(null);
  }

  function clearPlace() {
    onChange?.(null);
    setEditing(true);
    setQuery('');
    setPreview(null);
  }

  return (
    <View style={styles.wrap}>
      {editing ? (
        <>
          <TextField
            label="Place"
            value={query}
            onChangeText={setQuery}
            size="sm"
            placeholder="Town or postcode district"
            accessibilityLabel={accessibilityLabel}
          />
          {gymTown ? (
            <Button
              variant="tertiary"
              size="sm"
              fullWidth={false}
              title="Use my gym's town"
              onPress={() => setQuery(gymTown)}
              accessibilityLabel="Use my gym's town"
            />
          ) : null}
          {error ? (
            <Text style={[styles.error, { ...t.type.bodySm, color: t.colors.error }]}>
              {error === 'offline'
                ? 'You are offline. Try again when you have a connection.'
                : 'Could not check that just now. Try again.'}
            </Text>
          ) : null}
          {!error && preview ? (
            <Card padding="md" radius="md" style={styles.previewRow}>
              <Text style={[styles.previewLabel, { ...t.type.body, color: t.colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                {`In ${preview.label}`}
              </Text>
              <Button
                variant="primary"
                size="sm"
                fullWidth={false}
                title="Use this place"
                loading={loading}
                onPress={useThisPlace}
                accessibilityLabel="Use this place"
              />
            </Card>
          ) : null}
          {!error && !preview && query.trim().length >= MIN_QUERY && !loading ? (
            <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
              Not recognised as a town or postcode district yet.
            </Text>
          ) : null}
        </>
      ) : (
        <Card padding="md" radius="md" style={styles.previewRow}>
          <Text style={[styles.previewLabel, { ...t.type.body, color: t.colors.textPrimary, flex: 1 }]} numberOfLines={1}>
            {`In ${label}`}
          </Text>
          <Button
            variant="tertiary"
            size="sm"
            fullWidth={false}
            title="Change"
            onPress={() => setEditing(true)}
            accessibilityLabel="Change place"
          />
        </Card>
      )}
      <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>{HINT}</Text>
      {!editing && label ? (
        <Button
          variant="tertiary"
          size="sm"
          fullWidth={false}
          title="Clear place"
          onPress={clearPlace}
          accessibilityLabel="Clear place"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  error: { ...type.bodySm },
  hint: { ...type.caption },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  previewLabel: { ...type.body },
});
