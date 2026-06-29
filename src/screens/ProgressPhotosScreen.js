import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { appAlert } from '../components/AppAlert';
import { colors, spacing, radius, fontSize, fontWeight, type } from '../styles/theme';
import { useToast } from '../components/Toast';
import { getWellbeingMode, isCalm } from '../lib/wellbeing';
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
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [calm, setCalm] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, mode] = await Promise.all([listProgressPhotos(), getWellbeingMode()]);
      setPhotos(rows);
      setCalm(isCalm(mode));
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

  const size = (Dimensions.get('window').width - spacing.lg * 2 - GAP * (COLS - 1)) / COLS;

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
          keyExtractor={(item) => item.name}
          numColumns={COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onPressPhoto(item)}
              accessibilityRole="button"
              accessibilityLabel={`Photo from ${formatDay(item.ts)}. Tap to remove.`}
            >
              <Image source={{ uri: item.uri }} style={{ width: size, height: size, borderRadius: radius.md }} />
            </TouchableOpacity>
          )}
        />
      )}
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
    color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 18,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: fontWeight.medium },
});
