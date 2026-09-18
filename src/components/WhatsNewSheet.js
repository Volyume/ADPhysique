/**
 * WhatsNewSheet, the v3 programme's "lightweight What's new" sharpener.
 * One dismissible sheet, shown ONCE on the first launch after an update,
 * never on first install (a brand-new user has no update to hear about)
 * and never again for the same version. No nagging: dismissing is final
 * for that version, and a version with no entry shows nothing.
 *
 * Content lives in the WHATS_NEW map below: user-facing lines only, calm
 * register, British English, no celebration. Adding a release means adding
 * one entry; stale versions can be pruned freely (the sheet only ever
 * reads the current version's entry).
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomSheet from './BottomSheet';
import Button from './Button';
import { colors, spacing, fontSize, fontWeight, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

const LAST_SEEN_KEY = '@volyume_whats_new_last_seen';

// Per-version release notes. Keys are the marketing version
// (Application.nativeApplicationVersion). Keep each list short: three to
// five lines a user would actually notice.
export const WHATS_NEW = {
  '1.2.0': [
    { icon: 'timer-outline', text: 'Rest alerts can now land to the second. Allow exact alarms when asked, or from Settings.' },
    { icon: 'play-circle-outline', text: 'A live session bar keeps your workout in view on every tab. Tap it to jump back in.' },
    { icon: 'search-outline', text: 'Food search is much better now, whether you type a brand, half a word, or several words at once.' },
    { icon: 'speedometer-outline', text: 'Long lists scroll smoother across the app.' },
    { icon: 'apps-outline', text: 'A home screen widget shows your next session or weekly consistency (Android). Add it from Settings.' },
  ],
  // 1.2.1 clears the backlog L04-10 (design audit 2026-07-09) recorded here.
  // That note could not add a key because it could not know the next version
  // string, and several releases then shipped under the unchanged 1.2.0 key,
  // so this sheet never fired for them and none of that work was ever
  // announced. The lines below are chosen from that backlog plus the work
  // since, on one rule: a user would notice it without being told where to
  // look. Everything else stays unannounced rather than padding the list.
  '1.2.1': [
    { icon: 'barbell-outline', text: 'Updating your plan now respects the equipment you have. Change it to machines and cables and barbell work is replaced, not carried over.' },
    { icon: 'volume-medium-outline', text: 'Rest countdown cues now sound with the app minimised, on any rest length.' },
    { icon: 'create-outline', text: 'Tap any logged set to edit or delete it, so a mistyped number is never stuck.' },
    { icon: 'medkit-outline', text: 'Movements you need to avoid can be set for a few days, the rest of the block, or indefinitely.' },
    { icon: 'image-outline', text: 'Share cards have been rebuilt, with your own photo, four formats and a sticker export.' },
  ],
  // 1.3.0 is a minor bump because the capability lane shipped whole in it:
  // naming what to train around, the condition and injury directory, per-side
  // restrictions, and the adapted setup notes. Five lines chosen on the same
  // one rule as 1.2.1, that a user would notice the change without being told
  // where to look. The plain-English copy pass and the record-detection fixes
  // are felt rather than announced, so only the record one earns a line.
  '1.3.0': [
    { icon: 'medkit-outline', text: 'You can tell Volyume about injuries, pain, conditions or disabilities, and which side they affect. Coach tab or Settings, then Injuries & limitations.' },
    { icon: 'search-outline', text: 'Looking for a specific condition or injury finds better questions to ask you. You never need a name to get the same support.' },
    { icon: 'body-outline', text: 'Where an exercise is set up differently for you, the setup notes now say how instead of assuming one way of doing it.' },
    { icon: 'trophy-outline', text: 'Personal records show every time you beat your best, including the first time you meet an exercise.' },
    { icon: 'stats-chart-outline', text: 'Your weekly volume targets come from your own plan and profile, not a general starting table.' },
  ],
};

export default function WhatsNewSheet() {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState([]);
  const version = Application.nativeApplicationVersion;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!version) return;
        const lastSeen = await AsyncStorage.getItem(LAST_SEEN_KEY);
        if (!lastSeen) {
          // First install (or the feature's own first ship): record and
          // stay silent. There is no update to announce.
          await AsyncStorage.setItem(LAST_SEEN_KEY, version);
          return;
        }
        if (lastSeen === version) return;
        // An update landed. Mark seen FIRST so a crash mid-show can never
        // turn the sheet into a nag loop, then show if we have copy for it.
        await AsyncStorage.setItem(LAST_SEEN_KEY, version);
        const entry = WHATS_NEW[version];
        if (active && entry?.length) {
          setItems(entry);
          setVisible(true);
        }
      } catch (_) { /* never block launch over release notes */ }
    })();
    return () => { active = false; };
  }, [version]);

  // Bug fix (D36b aside, taskboard verify pass, 2026-07-10): this used to
  // `if (!visible) return null` here, which unmounted <BottomSheet> itself
  // the instant `visible` flipped false, before BottomSheet ever saw a
  // visible={false} render. That skipped BottomSheet's own dismiss()-driven
  // close animation entirely (see BottomSheet.js's effect at the top of the
  // file: dismiss() only fires on a visible prop transition while mounted).
  // Every other BottomSheet consumer (QuickAddSheet, FoodDetailSheet,
  // FeedbackSheet, PeekMenu) always renders <BottomSheet visible={...}>
  // unconditionally and lets BottomSheet own its own present/dismiss
  // lifecycle; this now matches that pattern. `items` is never cleared on
  // close (only ever set by the effect above), so the content stays intact
  // through the close animation exactly like FeedbackSheet's `config`.
  // Reduce Motion still collapses the animation to instant (BottomSheet's
  // own REDUCE_MOTION_CONFIG), unaffected by this change.
  return (
    <BottomSheet visible={visible} onClose={() => setVisible(false)} accessibilityLabel="What's new">
      <Text style={[styles.title, live.title]}>What&apos;s new</Text>
      <Text style={[styles.sub, live.sub]}>Version {version}</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.text} style={styles.row}>
            <Ionicons name={item.icon} size={18} color={t.colors.primary} style={styles.rowIcon} />
            <Text style={[styles.rowText, live.rowText]}>{item.text}</Text>
          </View>
        ))}
      </View>
      <Button title="Nice one" onPress={() => setVisible(false)} style={styles.btn} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h2, color: colors.textPrimary },
  sub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xxs },
  list: { marginTop: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowIcon: { marginTop: 1 },
  rowText: { ...type.body, color: colors.textSecondary, flex: 1, fontWeight: fontWeight.regular },
  btn: { marginTop: spacing.xl },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    title: { ...t.type.h2, color: t.colors.textPrimary },
    sub: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    rowText: { ...t.type.body, color: t.colors.textSecondary },
  };
}
