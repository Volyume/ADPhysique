/**
 * GymPicker (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## App"; GD-09, GD-11, GD-13).
 *
 * The search bar over the gym directory: 250ms debounce (same as the
 * handle check and the food search), a recognised-postcode chip while
 * the typed text looks like one, results as "display name" / "town ·
 * outward · distance", ranked client-side. A venue still waiting on its
 * second confirmation carries a "Pending" badge (`GymRow`). Nobody's
 * gym is found here yet: "Can't find your gym? Add it" opens
 * `CommunityGymAddScreen` carrying whatever was typed.
 *
 * GD-13: nothing here reads or stores the device's own location. A
 * postcode chip only reflects what was TYPED; the distance a row shows,
 * when it shows one, comes back from the server's own search (a
 * postcode or town resolves to its ONSPD fallback coordinate there,
 * GD-08), never from a permission this screen asks for.
 *
 * Props:
 *   navigation    for "Can't find your gym? Add it" -> CommunityGymAdd
 *   onSelect      (venue) a result was picked
 *   placeholder, accessibilityLabel
 */

import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
// E8 (founder decision 2026-07-02): every list in the app renders through
// FlashList, never an unrecycled FlatList.
import { FlashList } from '@shopify/flash-list';
import SearchBar from '../SearchBar';
import Chip from '../Chip';
import EmptyState from '../EmptyState';
import GymRow from './GymRow';
import useTheme from '../../hooks/useTheme';
import { spacing, type } from '../../styles/theme';
import { search as searchGyms, isPostcodeLike, recognisePostcode } from '../../lib/gyms';

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

export default function GymPicker({
  navigation,
  onSelect,
  placeholder = 'Search for your gym',
  accessibilityLabel = 'Search for your gym',
}) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const seqRef = useRef(0);

  const postcodeHit = isPostcodeLike(query) ? recognisePostcode(query) : null;

  useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      setError(null);
      return undefined;
    }
    setLoading(true);
    const seq = seqRef.current + 1;
    seqRef.current = seq;
    const timer = setTimeout(async () => {
      try {
        const out = await searchGyms(text);
        // Request-id guard: a slower earlier search must never overwrite a
        // newer answer (the food search's own pattern).
        if (seqRef.current !== seq) return;
        setResults(out.venues);
        setError(null);
      } catch (e) {
        if (seqRef.current !== seq) return;
        setResults([]);
        setError(e?.code ?? 'unavailable');
      } finally {
        if (seqRef.current === seq) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = query.trim();
  const showEmpty = !loading && !error && trimmed.length >= MIN_QUERY && results.length === 0;

  return (
    <View style={styles.wrap}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        loading={loading}
      />
      {postcodeHit && postcodeHit.kind !== 'none' ? (
        <Chip
          label={postcodeHit.kind === 'full'
            ? `Postcode ${postcodeHit.normalised}`
            : `Postcode area ${postcodeHit.outward}`}
          selected
          accessibilityLabel="Recognised as a postcode"
        />
      ) : null}
      {error ? (
        <Text style={[styles.error, { ...t.type.bodySm, color: t.colors.error }]}>
          {error === 'offline'
            ? 'You are offline. Try again when you have a connection.'
            : 'Could not search just now. Try again in a moment.'}
        </Text>
      ) : null}
      <View style={styles.list}>
        <FlashList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GymRow venue={item} onPress={() => onSelect?.(item)} />
          )}
          ListEmptyComponent={showEmpty ? (
            <EmptyState
              icon="business-outline"
              title="No gyms match yet"
              text="It shows for everyone once a second person confirms it."
              actionLabel="Can't find your gym? Add it"
              onAction={() => navigation?.navigate?.('CommunityGymAdd', { typed: trimmed })}
              actionAccessibilityLabel="Add your gym"
              compact
            />
          ) : null}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  list: { minHeight: 1 },
  error: { ...type.bodySm },
});
