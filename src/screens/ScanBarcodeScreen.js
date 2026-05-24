/**
 * ScanBarcodeScreen (Move #1.5 phase 2).
 *
 * Live camera barcode scan -> waterfall lookup -> route to detail
 * sheet (hit) or AddCustomFood (miss). Uses expo-camera which has
 * built-in barcode detection across EAN/UPC formats; no MLKit
 * native lib needed at this phase.
 *
 * Behaviour:
 *   - Permission denied: shows the settings deep-link, nothing else
 *     fires.
 *   - First successful scan locks scanning, runs resolveBarcode, then
 *     navigates. The lock prevents a second scan from firing while
 *     the user is mid-navigation.
 *   - Cache-hit performance target: under 250ms scan-to-detail. The
 *     waterfall handles that; this screen just blocks further scans
 *     and dispatches.
 *
 * Voice rules from CLAUDE.md: short sentences, no AI tells, no
 * encouragement.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { resolveBarcode } from '../lib/food/waterfall';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

// Supported barcode types: the common supermarket formats. Adding
// QR / DataMatrix would slow the detector for no gain on a food
// scanner.
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'];

export default function ScanBarcodeScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? new Date().toISOString().slice(0, 10);

  const [permission, requestPermission] = useCameraPermissions();
  const [resolving, setResolving] = useState(false);
  const scanLock = useRef(false);

  const onBarcodeScanned = useCallback(async ({ data }) => {
    if (scanLock.current) return;
    if (!data) return;
    scanLock.current = true;
    setResolving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const food = await resolveBarcode(data, userId);
      if (food) {
        // Hit. Navigate to FoodSearch with the scanned food so the
        // detail sheet opens against it. Replace (not push) so the
        // back stack goes Diary -> FoodSearch, not Diary -> Scan ->
        // FoodSearch.
        navigation.replace('FoodSearch', {
          mealSlot, entryDate, scannedFood: food,
        });
      } else {
        // Miss. Route to ScanLabel: it offers OCR if configured, or
        // falls through to AddCustomFood manually otherwise. Always
        // carries the scanned barcode forward so a follow-up save
        // persists it on the new custom food.
        navigation.replace('ScanLabel', {
          mealSlot, entryDate, prefillBarcode: data,
        });
      }
    } catch {
      scanLock.current = false;
      setResolving(false);
    }
  }, [navigation, userId, mealSlot, entryDate]);

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.permissionWrap}>
          <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            Volyume uses the camera to scan barcodes. Turn it on in Settings.
          </Text>
          {permission.canAskAgain ? (
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Allow camera</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.permissionBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.permissionBtnText}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan barcode</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={resolving ? undefined : onBarcodeScanned}
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.reticle} />
          <Text style={styles.hint}>
            {resolving ? 'Looking it up' : 'Point at a barcode'}
          </Text>
        </View>
        {resolving ? (
          <View style={styles.resolvingBadge}>
            <ActivityIndicator size="small" color={colors.textPrimary} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reticle: {
    width: 240, height: 160, borderWidth: 2, borderColor: colors.primary,
    borderRadius: radius.md, backgroundColor: 'transparent',
  },
  hint: {
    marginTop: spacing.lg, color: colors.textPrimary, fontSize: fontSize.md,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: radius.sm,
  },
  resolvingBadge: {
    position: 'absolute', top: spacing.lg, right: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: spacing.sm, borderRadius: radius.sm,
  },
  permissionWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  permissionTitle: {
    color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold,
    marginTop: spacing.lg,
  },
  permissionBody: {
    color: colors.textMuted, fontSize: fontSize.md, textAlign: 'center',
    marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, borderRadius: radius.md,
  },
  permissionBtnText: { color: '#000', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
