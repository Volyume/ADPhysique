import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { appAlert } from '../components/AppAlert';
import Button from '../components/Button';
import { colors, spacing, radius, fontSize, fontWeight, type, iconSize } from '../styles/theme';
import { useToast } from '../components/Toast';
import useAppStore from '../store/useAppStore';
import { getWellbeingMode, isCalm } from '../lib/wellbeing';
import { logError } from '../lib/errorLog';
import {
  listProgressPhotos, saveProgressPhoto, deleteProgressPhoto,
} from '../lib/progressPhotos';

// expo-image-picker is a native module; lazy-require so the screen imports in
// the node test env (mirrors ShareCardScreen).
let ImagePicker;
try { ImagePicker = require('expo-image-picker'); } catch (_) { ImagePicker = null; }

const COLS = 3;
const GAP = spacing.xs;

function formatDay(ts) {
  try { return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch (_) { return ''; }
}

export default function ProgressPhotosScreen({ navigation }) {
  const toast = useToast();
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [calm, setCalm] = useState(false);
  // Compare (enhancement B6): pick exactly two photos, view them side by side.
  // Local-only like the rest of the screen; the comparison shows dates and the
  // photos themselves, nothing else (no deltas, measurements or judgements —
  // this surface is body-image adjacent, see CLAUDE.md ED-safety rules).
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]); // photo names, in tap order, max two
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLoadFailed, setCompareLoadFailed] = useState({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, mode] = await Promise.all([listProgressPhotos(), getWellbeingMode()]);
      setPhotos(rows);
      setCalm(isCalm(mode));
      // A selection must never point at a photo that no longer exists.
      setSelected((prev) => prev.filter((name) => rows.some((r) => r.name === name)));
    } catch (_) { /* tolerate */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function pickFrom(source) {
    if (!ImagePicker) { toast.show('Photos need a rebuild on this device.', { variant: 'warning' }); return; }
    setBusy(true);
    try {
      const opts = { mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images', quality: 0.7 };
      let perm; let result;
      if (source === 'camera') {
        perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm?.granted) { toast.show('Camera permission is needed to take a photo.', { variant: 'warning' }); return; }
        result = await ImagePicker.launchCameraAsync(opts);
      } else {
        perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm?.granted) { toast.show('Photo library permission is needed.', { variant: 'warning' }); return; }
        result = await ImagePicker.launchImageLibraryAsync(opts);
      }
      if (result?.canceled) return;
      const uri = result?.assets?.[0]?.uri;
      if (!uri) return;
      await saveProgressPhoto(uri);
      await refresh();
    } catch (_) {
      toast.show('Could not add the photo. Try again.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function onAdd() {
    appAlert('Add a photo', 'Stored only on this device.', [
      { text: 'Take photo', onPress: () => pickFrom('camera') },
      { text: 'Choose from library', onPress: () => pickFrom('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function onPressPhoto(item) {
    appAlert(formatDay(item.ts), 'Remove this photo from your device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => { await deleteProgressPhoto(item.uri); await refresh(); },
      },
    ]);
  }

  // Selection: tapping a chosen photo unchooses it; with two already chosen,
  // a tap on a third photo replaces the EARLIEST choice, so the tap always
  // responds (calmer than refusing it silently). Pinned by the compare tests.
  function toggleSelect(item) {
    setSelected((prev) => {
      if (prev.includes(item.name)) return prev.filter((n) => n !== item.name);
      if (prev.length < 2) return [...prev, item.name];
      return [prev[1], item.name];
    });
  }

  function exitSelection() {
    setSelecting(false);
    setSelected([]);
  }

  // Older photo on the left, newer on the right, whatever the tap order was.
  const selectedItems = selected
    .map((name) => photos.find((p) => p.name === name))
    .filter(Boolean);
  const pair = [...selectedItems].sort((a, b) => a.ts - b.ts);
  const pairReady = pair.length === 2;

  function openCompare() {
    if (!pairReady) return;
    setCompareLoadFailed({});
    setCompareOpen(true);
  }

  function closeCompare() {
    // Keep the selection so the user can swap one photo and compare again.
    setCompareOpen(false);
  }

  function onCompareImageError(item) {
    logError('ProgressPhotos.compare', new Error('Compare photo failed to load'), { name: item.name });
    setCompareLoadFailed((prev) => ({ ...prev, [item.name]: true }));
  }

  const win = Dimensions.get('window');
  const size = (win.width - spacing.lg * 2 - GAP * (COLS - 1)) / COLS;
  // Compare panes: two half-width, portrait-leaning frames. Explicit bounded
  // dimensions plus resizeMethod="resize" keep the decode at roughly view size
  // on Android, never the full-resolution photo (the audit's named memory risk
  // for this feature).
  const paneW = (win.width - spacing.lg * 2 - spacing.sm) / 2;
  const paneH = Math.min(Math.round(paneW * (4 / 3)), Math.round(win.height * 0.6));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Progress photos</Text>
        <TouchableOpacity onPress={onAdd} disabled={busy} hitSlop={12} accessibilityRole="button" accessibilityLabel="Add a photo">
          {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="add" size={26} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>
        {calm
          ? 'Private to this device. Not synced, not shared. Use these only if they help you, and skip them if they do not.'
          : 'Private to this device. Not synced, not shared.'}
      </Text>

      {!loading && (selecting || photos.length >= 2) && (
        <View style={styles.compareBar}>
          {selecting ? (
            <>
              <Text style={styles.compareHint}>
                {pairReady ? 'Two photos chosen.' : 'Choose two photos.'}
              </Text>
              <Button
                title="Cancel"
                variant="tertiary"
                size="sm"
                fullWidth={false}
                onPress={exitSelection}
                accessibilityLabel="Cancel comparing"
                textStyle={{ color: colors.textMuted }}
              />
              <Button
                title="Compare"
                size="sm"
                fullWidth={false}
                disabled={!pairReady}
                onPress={openCompare}
                accessibilityLabel="Compare the chosen photos"
              />
            </>
          ) : (
            <Button
              title="Compare"
              variant="tertiary"
              size="sm"
              fullWidth={false}
              icon="images-outline"
              onPress={() => setSelecting(true)}
              accessibilityLabel="Compare two photos"
            />
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
      ) : photos.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>No photos yet. Tap + to add one.</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          extraData={{ selecting, selected }}
          keyExtractor={(item) => item.name}
          numColumns={COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.name);
            return (
              <TouchableOpacity
                onPress={() => (selecting ? toggleSelect(item) : onPressPhoto(item))}
                accessibilityRole="button"
                accessibilityState={selecting ? { selected: isSelected } : undefined}
                accessibilityLabel={selecting
                  ? `Photo from ${formatDay(item.ts)}. Tap to choose it for the comparison.`
                  : `Photo from ${formatDay(item.ts)}. Tap to remove.`}
              >
                <Image source={{ uri: item.uri }} style={{ width: size, height: size, borderRadius: radius.md }} />
                {selecting && isSelected && (
                  <>
                    <View pointerEvents="none" style={[styles.thumbSelectedEdge, { width: size, height: size }]} />
                    <View pointerEvents="none" style={styles.thumbCheckWrap}>
                      <Ionicons name="checkmark-circle" size={iconSize.lg} color={colors.primary} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Side-by-side comparison. Dates and photos only: no deltas, no
          measurements, no judgement copy (body-image-adjacent surface). */}
      <Modal
        visible={compareOpen && pairReady}
        animationType={reduceMotion ? 'none' : 'fade'}
        onRequestClose={closeCompare}
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Compare</Text>
            <TouchableOpacity onPress={closeCompare} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close compare">
              <Ionicons name="close" size={26} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.comparePanes}>
            {pair.map((item, i) => {
              const when = i === 0 ? 'Earlier' : 'Later';
              return (
                <View key={item.name} style={styles.comparePane}>
                  {compareLoadFailed[item.name] ? (
                    <View style={[styles.compareImage, styles.compareFallback, { width: paneW, height: paneH }]}>
                      <Text style={styles.compareFallbackText}>Could not load this photo.</Text>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: item.uri }}
                      style={[styles.compareImage, { width: paneW, height: paneH }]}
                      resizeMode="contain"
                      resizeMethod="resize"
                      accessible
                      accessibilityLabel={`${when} photo, ${formatDay(item.ts)}`}
                      onError={() => onCompareImageError(item)}
                    />
                  )}
                  <Text style={styles.paneWhen}>{when}</Text>
                  <Text style={styles.paneDate}>{formatDay(item.ts)}</Text>
                </View>
              );
            })}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  title: { ...type.h3, color: colors.textPrimary },
  note: {
    ...type.bodySm,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  compareBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  compareHint: { ...type.bodySm, color: colors.textMuted, flex: 1 },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  thumbSelectedEdge: {
    position: 'absolute', top: 0, left: 0,
    borderRadius: radius.md, borderWidth: 2, borderColor: colors.primary,
  },
  thumbCheckWrap: {
    position: 'absolute', top: spacing.xs, right: spacing.xs,
    backgroundColor: colors.background, borderRadius: radius.full,
  },
  comparePanes: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, marginTop: spacing.md,
  },
  comparePane: { flex: 1, alignItems: 'center' },
  compareImage: { borderRadius: radius.md, backgroundColor: colors.surface },
  compareFallback: { alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  compareFallbackText: { ...type.bodySm, color: colors.textMuted, textAlign: 'center' },
  paneWhen: { ...type.label, color: colors.textMuted, marginTop: spacing.sm },
  paneDate: { ...type.bodyStrong, color: colors.textPrimary, marginTop: spacing.xxs },
});
