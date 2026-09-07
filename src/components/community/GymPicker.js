/**
 * GymPicker: the gym finder (gym database blueprint
 * `docs/gym-database-2026-09-06/20-BLUEPRINT.md`, GD-09, GD-11, GD-13;
 * community product audit 2026-09-07,
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.2; `20-JUDGEMENT.md` section 7, LJ-01).
 *
 * A typed postcode or town resolves to a place centroid server-side
 * (`search()`'s `centroid`); once a centroid is known (typed, or from
 * "Use my location"), an always-visible mile-band Chip row ("5 · 10 · 25
 * · 50 miles", default 5) runs a separate `near()` at that radius,
 * merged with the text matches from `search()` and re-ranked
 * (`rankVenues`). Text matches are never filtered by the band: a typed
 * name still appears whatever the radius, so knowing the name is never
 * blocked by distance.
 *
 * "Use my location" only ever appears when `deviceLocation.isAvailable()`
 * is true (founder decision 2026-09-07, "yes to both": `expo-location`
 * armed for exactly this one use). The coordinate it returns is held in
 * this component's own state for the session only: it is never read from
 * or written to any storage, and this file names no location API
 * directly (`deviceLocation.js` is the ONLY file allowed to). A refused
 * permission (`code: 'denied'`) withdraws the button and shows the calm
 * line instead of re-prompting; the search route stays available either
 * way.
 *
 * A venue still waiting on its second confirmation carries a "Pending"
 * badge (`GymRow`); a venue whose operator has not confirmed it still
 * shows (`rank.js` gives it a small penalty, never a filter). "Can't find
 * your gym? Add it" (list end and empty state) opens
 * `CommunityGymAddScreen` with this picker's own `onSelect`, so a venue
 * added there is selected here the moment it is submitted.
 *
 * Props:
 *   navigation    for "Can't find your gym? Add it" -> CommunityGymAdd
 *   onSelect      (venue) a result (or a newly added venue) was picked
 *   placeholder, accessibilityLabel
 *   header        when true, renders the finder's own "Where do you
 *                 train?" header and sub line (Join's primary-gym slot
 *                 only; every other caller keeps its own section label,
 *                 same as before this campaign).
 */

import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
// E8 (founder decision 2026-07-02): every list in the app renders through
// FlashList, never an unrecycled FlatList.
import { FlashList } from '@shopify/flash-list';
import SearchBar from '../SearchBar';
import Chip from '../Chip';
import Button from '../Button';
import EmptyState from '../EmptyState';
import SectionLabel from '../SectionLabel';
import GymRow from './GymRow';
import useTheme from '../../hooks/useTheme';
import { spacing, type } from '../../styles/theme';
import {
  search as searchGyms, near as nearGyms, rankVenues,
  isPostcodeLike, recognisePostcode, milesToMetres,
} from '../../lib/gyms';
import * as deviceLocation from '../../lib/deviceLocation';

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;
const NEAR_LIMIT = 40;
export const DISTANCE_BANDS_MILES = [5, 10, 25, 50];
const DEFAULT_BAND_MILES = DISTANCE_BANDS_MILES[0];

/** Text matches (already ranked by `search()`) are never dropped for
 * being outside the chosen band; `near()`'s own candidates fill in a
 * `distance_m` a text match may not have carried on its own. Used only
 * when there is no active name filter (see `hasNameFilter` below): an
 * empty query (plain "browse nearby") or a recognised postcode/place,
 * where "everything within the chosen band" is exactly the point. */
function mergeVenues(nearVenues, textVenues) {
  const byId = new Map();
  for (const v of nearVenues) byId.set(v.id, v);
  for (const v of textVenues) {
    const existing = byId.get(v.id);
    byId.set(v.id, existing ? { ...v, distance_m: v.distance_m ?? existing.distance_m } : v);
  }
  return Array.from(byId.values());
}

/** A typed NAME must only ever show what the name actually matched.
 * Founder device report 2026-09-07: with a centroid already known (from
 * "Use my location" or an earlier place search), typing a plain name
 * like "volt" still showed a page of unrelated nearby gyms ahead of the
 * real Volt-named venues, because `mergeVenues` above unions in the
 * ENTIRE near-list regardless of whether it has anything to do with what
 * was typed. This keeps only the venues the text search itself matched,
 * backfilling `distance_m` from the near-list where the same venue also
 * happens to appear there - never adding an id the text search did not
 * return. */
function withNearDistance(textVenues, nearVenues) {
  const nearById = new Map(nearVenues.map((v) => [v.id, v]));
  return textVenues.map((v) => {
    const nearMatch = nearById.get(v.id);
    return nearMatch ? { ...v, distance_m: v.distance_m ?? nearMatch.distance_m } : v;
  });
}

export default function GymPicker({
  navigation,
  onSelect,
  placeholder = 'Gym, town or postcode',
  accessibilityLabel = 'Gym, town or postcode',
  header = false,
}) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [textVenues, setTextVenues] = useState([]);
  const [nearVenues, setNearVenues] = useState([]);
  // {kind, label, lat, lng} once a place is known; label is null for a
  // device fix (GD-13: a coordinate is never turned into a shown place).
  const [centroid, setCentroid] = useState(null);
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_BAND_MILES);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nearLoading, setNearLoading] = useState(false);
  const [error, setError] = useState(null);
  // Mirrors `error` for the near-list effect specifically (GD-13 fix,
  // founder device report 2026-09-07): the two effects run independently
  // (a typed query and an active centroid can both be live at once), so a
  // shared `error` would let one effect's success silently clear the
  // other's genuine failure. A separate flag for each keeps them honest.
  const [nearError, setNearError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(null);
  // Did the MOST RECENT search() response resolve a place (a postcode or
  // a recognised town), rather than a plain name/brand? Founder device
  // report 2026-09-07: `postcodeHit` alone is not enough to tell a place
  // query from a name query, because a recognised TOWN name resolves a
  // centroid server-side too without being postcode-shaped. This is what
  // `hasNameFilter` below actually needs: reset the moment a search comes
  // back with no centroid, even if an OLDER centroid (from an earlier
  // place search, or "Use my location") is still sitting in `centroid`.
  const [textResolvedPlace, setTextResolvedPlace] = useState(false);
  const seqRef = useRef(0);
  const nearSeqRef = useRef(0);
  const centroidKeyRef = useRef(null);

  const locationAvailable = deviceLocation.isAvailable();
  const postcodeHit = isPostcodeLike(query) ? recognisePostcode(query) : null;

  // Text search, debounced (unchanged trigger shape from before this
  // campaign): a query under the minimum length never reaches the network.
  useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_QUERY) {
      setTextVenues([]);
      setLoading(false);
      setError(null);
      setTextResolvedPlace(false);
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
        setTextVenues(out.venues);
        setError(null);
        setTextResolvedPlace(!!out.centroid);
        if (out.centroid) setCentroid(out.centroid);
      } catch (e) {
        if (seqRef.current !== seq) return;
        setTextVenues([]);
        setError(e?.code ?? 'unavailable');
        setTextResolvedPlace(false);
      } finally {
        if (seqRef.current === seq) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // The band resets to 5 miles whenever the centroid ITSELF changes (a
  // new postcode, town or device fix), never merely on a re-render.
  useEffect(() => {
    const key = centroid ? `${centroid.lat},${centroid.lng}` : null;
    if (key !== centroidKeyRef.current) {
      centroidKeyRef.current = key;
      setRadiusMiles(DEFAULT_BAND_MILES);
    }
  }, [centroid]);

  // The near-list, whenever the centroid or the chosen band changes.
  useEffect(() => {
    if (!centroid || centroid.lat == null || centroid.lng == null) {
      setNearVenues([]);
      setTruncated(false);
      return undefined;
    }
    let alive = true;
    setNearLoading(true);
    setNearError(null);
    const seq = nearSeqRef.current + 1;
    nearSeqRef.current = seq;
    (async () => {
      try {
        const out = await nearGyms(centroid.lat, centroid.lng, {
          radiusM: milesToMetres(radiusMiles), limit: NEAR_LIMIT,
        });
        if (!alive || nearSeqRef.current !== seq) return;
        setNearVenues(out.venues);
        setTruncated(out.truncated);
      } catch (e) {
        if (!alive || nearSeqRef.current !== seq) return;
        // Founder device report 2026-09-07: this catch silently discarded
        // every failure (auth, network, rate limit) and left `nearVenues`
        // at its empty default, which `showEmpty` then read as an honest
        // "no gyms near you" - a real RPC failure rendered as a false
        // negative rather than the retry state every other failure in
        // this screen gets. Never again: the near list gets the same
        // error surface the text search already has.
        setNearVenues([]);
        setTruncated(false);
        setNearError(e?.code ?? 'unavailable');
      } finally {
        if (alive && nearSeqRef.current === seq) setNearLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [centroid, radiusMiles]);

  // 'denied' | 'timeout' | 'unavailable' | null. Once 'denied', the
  // button itself is withdrawn (see the render below) rather than left
  // to be tapped again: neither platform re-prompts after a refusal
  // without a trip to Settings this screen does not offer, so a second
  // tap could only ever fail the same way - "never re-prompt
  // automatically" (founder decision 2026-09-07).
  async function useMyLocation() {
    setLocating(true);
    setLocateError(null);
    try {
      const { lat, lng } = await deviceLocation.getApproximatePosition();
      // Held in THIS component's state only, for this session: never
      // written to storage, the profile, or the server as anything other
      // than the near() argument below (GD-13, LJ-01).
      setCentroid({ kind: 'device', label: null, lat, lng });
    } catch (e) {
      setLocateError(e?.code === 'denied' ? 'denied' : (e?.code === 'timeout' ? 'timeout' : 'unavailable'));
    } finally {
      setLocating(false);
    }
  }

  function addGym() {
    navigation?.navigate?.('CommunityGymAdd', { typed: query.trim(), onSelect });
  }

  const trimmed = query.trim();
  // A typed name filters to what it actually matched; an empty query or a
  // resolved place (postcode, or a town this exact search resolved) keeps
  // the full near-list, since "everything within the band" is the point
  // there (see the two merge helpers above). `postcodeHit` catches a
  // postcode being typed before its debounced search has answered yet;
  // `textResolvedPlace` catches the settled answer for both postcodes and
  // towns.
  const hasNameFilter = trimmed.length >= MIN_QUERY && !postcodeHit && !textResolvedPlace;
  const candidates = hasNameFilter
    ? withNearDistance(textVenues, nearVenues)
    : mergeVenues(nearVenues, textVenues);
  const results = rankVenues(candidates, query);
  const knownCentroid = !!(centroid && centroid.lat != null && centroid.lng != null);
  const hasSearched = trimmed.length >= MIN_QUERY || knownCentroid;
  const showEmpty = !loading && !nearLoading && !error && !nearError && hasSearched && results.length === 0;
  // The "nearest 40" wording describes the near-list specifically: once a
  // name filter has taken over `candidates` (above), `truncated` is still
  // reporting the near-list's own state and must not be shown against a
  // results set the near-list no longer determines.
  const showFooter = !showEmpty && results.length > 0 && knownCentroid && truncated && !hasNameFilter;

  return (
    <View style={styles.wrap}>
      {header ? (
        <View style={styles.header}>
          {/* V19: section titles inside Community content stay
              SectionLabel, never h1/h2/h3 - "Where do you train?" reads
              as a field-group title, not a hero. */}
          <SectionLabel>Where do you train?</SectionLabel>
          <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            Choose your main gym so you can find people who train there and discover relevant local
            connections.
          </Text>
        </View>
      ) : null}

      {locationAvailable && locateError !== 'denied' ? (
        <Button
          variant="secondary"
          size="sm"
          icon="navigate-outline"
          title="Use my location"
          loading={locating}
          onPress={useMyLocation}
          accessibilityLabel="Use my location"
        />
      ) : null}
      {locateError === 'denied' ? (
        <Text style={[styles.hint, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          Location is off for Volyume. Search by gym, town or postcode instead.
        </Text>
      ) : locateError ? (
        <Text style={[styles.error, { ...t.type.bodySm, color: t.colors.error }]}>
          {locateError === 'timeout'
            ? 'Could not find your location in time. Try again, or search instead.'
            : 'Could not find your location just now. Search by gym, town or postcode instead.'}
        </Text>
      ) : null}

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

      {knownCentroid ? (
        <View style={styles.bandRow} accessibilityLabel="Search radius">
          {DISTANCE_BANDS_MILES.map((mi) => (
            <Chip
              key={mi}
              label={`${mi} miles`}
              selected={radiusMiles === mi}
              onPress={() => setRadiusMiles(mi)}
              accessibilityRole="radio"
            />
          ))}
        </View>
      ) : null}

      {error || nearError ? (
        <Text style={[styles.error, { ...t.type.bodySm, color: t.colors.error }]}>
          {(error ?? nearError) === 'offline'
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
              title="Can't find your gym?"
              text={knownCentroid
                ? `No gyms within ${radiusMiles} miles${centroid.label ? ` of ${centroid.label}` : ''} yet. Try a wider distance, or add yours.`
                : 'It shows for everyone once a second person confirms it.'}
              actionLabel="Add your gym"
              onAction={addGym}
              actionAccessibilityLabel="Add your gym"
              compact
            />
          ) : null}
          ListFooterComponent={(!showEmpty && results.length > 0) ? (
            <View style={styles.footer}>
              {showFooter ? (
                <Text style={[styles.hint, { ...t.type.caption, color: t.colors.textMuted }]}>
                  {`Showing the nearest ${NEAR_LIMIT}. Type the gym's name to narrow it down.`}
                </Text>
              ) : null}
              <Button
                variant="tertiary"
                size="sm"
                fullWidth={false}
                title="Can't find your gym? Add it"
                onPress={addGym}
                accessibilityLabel="Add your gym"
              />
            </View>
          ) : null}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  header: { gap: spacing.xxs },
  list: { minHeight: 1 },
  error: { ...type.bodySm },
  hint: { ...type.caption },
  bandRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2 },
  footer: { gap: spacing.sm, paddingTop: spacing.xs, alignItems: 'flex-start' },
});
