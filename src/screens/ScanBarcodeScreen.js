/**
 * ScanBarcodeScreen (Move #1.5 phase 2, vision-camera build).
 *
 * Live camera barcode scan -> waterfall lookup -> route to detail
 * sheet (hit) or AddCustomFood (miss). Uses react-native-vision-camera,
 * the same library family MFP and Cronometer use. Better detection
 * quality + integrated torch + future-proofs the MLKit OCR path as
 * a frame processor.
 *
 * Behaviour:
 *   - Permission denied: shows a settings deep-link, nothing else
 *     fires.
 *   - First successful scan locks scanning, runs resolveBarcode,
 *     then navigates. The lock prevents a second scan from firing
 *     while the user is mid-navigation.
 *   - Re-arms on focus (so back-swipe from a hit/miss landing
 *     resumes scanning without an app restart).
 *   - Pauses the camera while the app is backgrounded or the screen
 *     is unfocused -- saves battery and avoids holding the camera
 *     resource captive when the user navigates away.
 *   - Torch toggle in the header.
 *
 * Voice rules from CLAUDE.md: short sentences, no AI tells, no
 * encouragement.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking, AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera, useCameraDevice, useCodeScanner,
} from 'react-native-vision-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { resolveBarcode } from '../lib/food/waterfall';
import { logError, logInfo } from '../lib/errorLog';
import { audit } from '../lib/observability';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

// Supported barcode types: the common supermarket formats. Code-128
// is included for some UK weighed-deli labels. QR / DataMatrix
// excluded -- food products almost never use them and adding them
// slows the detector.
const CODE_TYPES = ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128'];

export default function ScanBarcodeScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? new Date().toISOString().slice(0, 10);

  const [permission, setPermission] = useState(Camera.getCameraPermissionStatus());
  const [resolving, setResolving] = useState(false);
  const [torch, setTorch] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [focused, setFocused] = useState(true);
  const scanLock = useRef(false);
  const device = useCameraDevice('back');

  useFocusEffect(useCallback(() => {
    setFocused(true);
    scanLock.current = false;
    setResolving(false);
    return () => setFocused(false);
  }, []));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const requestPermission = useCallback(async () => {
    const next = await Camera.requestCameraPermission();
    setPermission(next);
  }, []);

  // First-time arrivals get an in-app OS permission prompt
  // automatically. Previously the screen sat on a spinner forever
  // while in 'not-determined' state, forcing users into Settings
  // even though the OS would happily prompt the first time. The
  // requestCameraPermission call below triggers the native dialog;
  // the user's choice updates `permission` and the right branch
  // below renders.
  useEffect(() => {
    if (permission === 'not-determined') {
      requestPermission().catch(() => {});
    }
  }, [permission, requestPermission]);

  const onCodeScanned = useCallback(async (codes) => {
    if (scanLock.current) return;
    const value = codes?.[0]?.value;
    if (!value) return;
    scanLock.current = true;
    setResolving(true);
    audit('food.barcode.scan', { codeType: codes[0]?.type ?? 'unknown' });
    logInfo('ScanBarcode.detect', `data=${value} type=${codes[0]?.type}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const food = await resolveBarcode(value, userId);
      if (food) {
        audit('food.barcode.resolved', { source: food.source ?? 'unknown' });
        logInfo('ScanBarcode.hit', `data=${value} food_ref=${food.food_ref}`);
        navigation.replace('FoodSearch', {
          mealSlot, entryDate, scannedFood: food,
        });
      } else {
        logInfo('ScanBarcode.miss', `data=${value}`);
        navigation.replace('ScanLabel', {
          mealSlot, entryDate, prefillBarcode: value,
        });
      }
    } catch (e) {
      logError('ScanBarcode.resolveThrew', e, { data: value, message: e?.message });
      scanLock.current = false;
      setResolving(false);
    }
  }, [navigation, userId, mealSlot, entryDate]);

  const codeScanner = useCodeScanner({
    codeTypes: CODE_TYPES,
    onCodeScanned,
  });

  if (permission === 'not-determined') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  if (permission !== 'granted') {
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
          {permission === 'denied' ? (
            <TouchableOpacity style={styles.permissionBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.permissionBtnText}>Open Settings</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Allow camera</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
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
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.permissionTitle}>No camera available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = focused && appActive && !resolving;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan barcode</Text>
        <TouchableOpacity onPress={() => setTorch(v => !v)} hitSlop={12}>
          <Ionicons
            name={torch ? 'flashlight' : 'flashlight-outline'}
            size={22}
            color={torch ? colors.primary : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraWrap}>
        <Camera
          style={StyleSheet.absoluteFillObject}
          device={device}
          isActive={isActive}
          codeScanner={codeScanner}
          torch={torch ? 'on' : 'off'}
          enableZoomGesture
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
