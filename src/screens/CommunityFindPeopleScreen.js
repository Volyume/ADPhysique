/**
 * CommunityFindPeopleScreen (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 4,
 * 5 and 9; SD-23, SD-24, SD-28)
 *
 * Six doors and a search field. At my gym, near me, train like me,
 * open to training together, people you might know.
 *
 * Every door is honest (SD-28). One that can work says how many are
 * behind it. One that has nobody behind it yet says exactly that and what
 * changes it. One that cannot work yet says what would make it work
 * ("Add your gym to see who trains there") and opens the screen that
 * fixes it. Nothing is hidden behind a density threshold, because a door
 * that vanishes when the network is small is a door nobody can be the
 * first through.
 *
 * No percentages anywhere (SD-24): a count is a fact, a match score is
 * not, and the reasons on each row are the explanation.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
// E8 (founder decision 2026-07-02): every list in the app renders
// through FlashList, never an unrecycled FlatList.
import { FlashList } from '@shopify/flash-list';
import BackHeader from '../components/BackHeader';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import SkeletonPersonRow from '../components/community/SkeletonPersonRow';
import EntryRow from '../components/community/EntryRow';
import Band, { BandGap } from '../components/community/Band';
import useTheme from '../hooks/useTheme';
import useCommunityMe from '../hooks/useCommunityMe';
import { colors, spacing } from '../styles/theme';
import {
  doorsFor, doorLine, doorZeroState, findPeople, hasProfile, COMMUNITY_DISCIPLINE_LABELS,
} from '../lib/community';

/** The glyph for each door, in the language the rest of Community uses. */
const GLYPH = {
  gym: 'business-outline',
  area: 'location-outline',
  like_me: 'barbell-outline',
  // Task 8: same ribbon the discipline cohort rows use.
  same_discipline: 'ribbon-outline',
  partners: 'people-outline',
  might_know: 'git-network-outline',
};

/**
 * Where a door that cannot work yet sends you. Gym and area are typed on
 * the profile editor; same_discipline too (task 8: the discipline picker
 * lives on the same screen).
 */
const REQUIREMENT_ROUTE = {
  gym: 'CommunityEditProfile',
  area: 'CommunityEditProfile',
  same_discipline: 'CommunityEditProfile',
};

/**
 * The line under a door's label: the requirement when it cannot work, the
 * honest zero state when nobody is behind it, otherwise the count.
 */
export function lineFor(door, count) {
  if (!door?.available) return door?.requirement ?? '';
  const n = count !== null && typeof count === 'object' ? count.count : count;
  const scope = count !== null && typeof count === 'object' ? count.scope : null;
  if (n === 0) return doorZeroState(door);
  return doorLine(door, n, scope);
}

/**
 * The gym door's own label (gym database blueprint
 * `docs/gym-database-2026-09-06/20-BLUEPRINT.md`, GD-14). Every other
 * door keeps its fixed name ("Near me", "Train like me"...); the gym door
 * reads the venue's own display name once one is set (`door.key`, which
 * `findPeople.js` already fills from the profile's `gym_label` -- a
 * server-derived display name once GD-14 links a directory venue, or a
 * legacy free-typed label for an older profile), so the row says
 * "PureGym Motherwell" rather than a generic "At my gym" beside a
 * subtitle repeating the same name.
 */
function doorTitle(door) {
  if (door.mode === 'gym' && door.available && door.key) return door.key;
  // Task 8: same pattern as the gym door above -- the tile shows the
  // caller's own chosen discipline ("Bodybuilding") rather than the
  // generic door name, while the PAGE it opens keeps the generic label
  // (CommunityPeopleListScreen's route param, unchanged) exactly the way
  // the gym door's own page title stays "At my gym".
  if (door.mode === 'same_discipline' && door.available && door.key) {
    return COMMUNITY_DISCIPLINE_LABELS[door.key] ?? door.label;
  }
  return door.label;
}

/**
 * One door, as a large entry row in a band (D221 law V3): 88 dp, a 44 dp
 * icon tile in `surface2`, the title at `type.title`, the line at
 * `type.bodySm`, a chevron and a hairline across the band. The line is not
 * truncated: a door that cannot work yet answers with a whole sentence
 * ("Add your gym to see who trains there") and hiding a requirement hides
 * the one thing that opens the door.
 */
function DoorRow({ door, count, onPress }) {
  const line = lineFor(door, count);
  const title = doorTitle(door);

  return (
    <EntryRow
      big
      icon={GLYPH[door.mode] ?? 'people-outline'}
      title={title}
      subtitle={line}
      onPress={onPress}
      accessibilityLabel={`${title}. ${line}`}
    />
  );
}

/** L6 (D221): Follow and Connect, explained once, here. */
export const FOLLOW_CONNECT_EXPLAINER =
  'Follow to see their training. Connect to message each other.';

export default function CommunityFindPeopleScreen({ navigation }) {
  const t = useTheme();
  const { me, loading: meLoading } = useCommunityMe();
  const joined = hasProfile(me);

  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const doors = doorsFor(me);

  /**
   * One count per door that can work. Read together rather than one after
   * another, and a door whose count will not read keeps `null`, which
   * `doorLine` renders as its plain subtitle rather than as a zero
   * (SD-28): each row is already meaningful the moment it renders, so
   * there is no separate loading affordance for the counts themselves.
   */
  const load = useCallback(async () => {
    if (!joined) return;
    const open = doorsFor(me).filter((d) => d.available);
    const results = await Promise.all(open.map(async (door) => {
      try {
        // Task 8: same_discipline rides 'like_me' with the discipline
        // hard filter (see findPeople.js) -- only this door's own key
        // ever travels as `discipline`, so no other door's count is
        // narrowed by it.
        const page = await findPeople(door.mode, {
          limit: 1, discipline: door.mode === 'same_discipline' ? door.key : null,
        });
        return [door.mode, { count: page.count, scope: page.label ?? null }];
      } catch (_e) {
        return [door.mode, null];
      }
    }));
    setCounts(Object.fromEntries(results));
    // `me` is the payload the doors are derived from; a new identity per
    // refresh is what should re-read the counts.
  }, [joined, me]);

  useEffect(() => { load(); }, [load]);

  function openDoor(door) {
    if (!door.available) {
      const route = REQUIREMENT_ROUTE[door.mode];
      if (route) navigation.navigate(route);
      return;
    }
    navigation.navigate('CommunityPeopleList', {
      mode: door.mode, key: door.key, label: door.label,
    });
  }

  const header = (
    <View>
      <Band style={styles.header}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or username"
        accessibilityLabel="Search for people"
        onSubmitEditing={() => {
          const q = query.trim();
          if (q) navigation.navigate('CommunitySearch', { q });
        }}
      />
      </Band>
      <BandGap />
    </View>
  );

  // First paint: the doors themselves render the moment `me` resolves
  // (`lineFor` already answers a still-loading count with the door's
  // plain subtitle, never a blank or a spinner -- SD-28), so the only
  // true first-load gap is not yet knowing whether a profile exists at
  // all. Six rows, the true row shape (`docs/rules/styling.md`,
  // "Loading states").
  const empty = meLoading ? (
    <Band style={styles.skeletonStack}>
      {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonPersonRow key={i} />)}
    </Band>
  ) : (
    <EmptyState
      icon="people-outline"
      title="Create your profile first"
      text="Finding people needs a profile of your own, so they can find you back."
      actionLabel="Create my profile"
      onAction={() => navigation.navigate('CommunityJoin')}
      actionAccessibilityLabel="Create my Community profile"
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top']}>
      <BackHeader title="Find people" />
      <FlashList
        data={joined ? doors : []}
        keyExtractor={(item) => item.mode}
        renderItem={({ item }) => (
          <Band>
            <DoorRow
              door={item}
              count={counts[item.mode] ?? null}
              onPress={() => openDoor(item)}
            />
          </Band>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={joined ? (
          <Text style={[styles.explain, t.type.caption, { color: t.colors.textMuted }]}>
            {FOLLOW_CONNECT_EXPLAINER}
          </Text>
        ) : null}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.4}
        onEndReached={() => { /* six doors; there is no second page */ }}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try { await load(); } finally { setRefreshing(false); }
            }}
            tintColor={t.colors.textMuted}
            colors={[t.colors.primary]}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  skeletonStack: { paddingHorizontal: spacing.lg },
  explain: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
});
