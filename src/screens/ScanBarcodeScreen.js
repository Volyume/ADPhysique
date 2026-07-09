/**
 * ScanBarcodeScreen (Move #1.5 phase 2, vision-camera build).
 *
 * Live camera barcode scan -> waterfall lookup -> route to detail
 * sheet (hit) or ScanLabel with the barcode prefilled (miss). Uses
 * react-native-vision-camera,
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
 *     is unfocused. Saves battery and avoids holding the camera
 *     resource captive when the user navigates away.
 *   - Torch toggle in the header.
 *
 * Voice rules from CLAUDE.md: short sentences, no AI tells, no
 * encouragement.
 */
import { todayLocalKey } from '../lib/dayKey';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking, AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera, useCameraDevice, useCodeScanner,
} from 'react-native-vision-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';
import { planReady as hapticScanSuccess } from '../lib/haptics';
import { colors, fontSize, spacing, radius, type } from '../styles/theme';
import { resolveBarcode } from '../lib/food/waterfall';
import { logError, logInfo } from '../lib/errorLog';
import { audit } from '../lib/observability';
import { useToast } from '../components/Toast';
import ModalHeader from '../components/ModalHeader';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';
import TextField from '../components/TextField';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

// L05-SB2 (2026-07-09 design audit): a barcode that's damaged or too
// curved for the camera to read still has a printed number underneath
// it. Digits-only, 8-14 long covers EAN-8/EAN-13/UPC-A/UPC-E/GS1-128
// without accepting obvious junk. Exported for the colocated test.
export function isValidManualBarcode(value) {
  return /^\d{8,14}$/.test(String(value ?? '').trim());
}

// Supported barcode types: the common supermarket formats. Code-128
// is included for some UK weighed-deli labels. QR / DataMatrix
// excluded: food products almost never use them and adding them
// slows the detector.
const CODE_TYPES = ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128'];

export default function ScanBarcodeScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;
  const toast = useToast();

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? todayLocalKey();

  const [permission, setPermission] = useState(Camera.getCameraPermissionStatus());
  const [resolving, setResolving] = useState(false);
  const [torch, setTorch] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [focused, setFocused] = useState(true);
  const scanLock = useRef(false);
  const askedRef = useRef(false);
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

  // L05-SB1 (2026-07-09 design audit): matches ScanLabelScreen's escape hatch
  // so declining the camera permission (or having no camera device) never
  // traps the user — they can still add the food by hand.
  const gotoManual = useCallback(() => {
    navigation.replace('AddCustomFood', { mealSlot, entryDate, from: 'scan_manual' });
  }, [navigation, mealSlot, entryDate]);

  // First arrival: attempt the native OS permission dialog. We fire for
  // ANY non-granted status, not just 'not-determined', because on
  // Android a prior 'denied' is still re-askable, and some OS /
  // vision-camera versions report a never-asked permission as 'denied'
  // rather than 'not-determined' (Android 16 does this). Gating only on
  // 'not-determined' meant those users were dumped straight to the
  // Settings screen with no prompt. requestCameraPermission shows the
  // dialog when the OS still allows it, and is a harmless no-op (returns
  // the same status, no dialog) once the permission is permanently
  // denied, at which point the Settings fallback below takes over.
  // Guarded by a ref so it runs at most once per mount.
  useEffect(() => {
    if (permission !== 'granted' && !askedRef.current) {
      askedRef.current = true;
      requestPermission().catch(() => {});
    }
  }, [permission, requestPermission]);

  // Shared lookup + routing path for a resolved barcode value, whichever
  // way it arrived (camera detection or the L05-SB2 manual-entry sheet).
  // Both callers must go through resolveBarcode exactly once, so a typed
  // EAN gets the same waterfall, hit/miss routing and error handling as a
  // camera read.
  const lookupAndRoute = useCallback(async (value, codeType) => {
    scanLock.current = true;
    setResolving(true);
    audit('food.barcode.scan', { codeType: codeType ?? 'manual' });
    logInfo('ScanBarcode.detect', `data=${value} type=${codeType ?? 'manual'}`);
    // Single success note (planReady's signature, reused so the vocabulary's
    // reduce-motion gate covers the scan lock-on).
    hapticScanSuccess();
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
      // ST-2: a thrown lookup means the waterfall couldn't answer at all
      // (a genuine "not found" already resolves to `food === null` above
      // and routes to ScanLabel with the barcode prefilled, no exception
      // involved). Tell the user this is a reachability problem, not a
      // miss, and distinguish "you're offline" from a live-but-failing
      // lookup so re-scanning into the void doesn't look like doing
      // nothing. Mirrors ScanLabelScreen's NetInfo check.
      let offline = false;
      try {
        const state = await NetInfo.fetch();
        offline = state?.isConnected === false || state?.isInternetReachable === false;
      } catch (_) {
        // Connectivity check itself failed: fall back to the generic
        // reachability message rather than guessing offline.
      }
      toast.show(
        offline
          ? "You're offline. Check your connection and try again."
          : "Couldn't reach the food database. Try again.",
        { variant: 'error' }
      );
      scanLock.current = false;
      setResolving(false);
    }
  }, [navigation, userId, mealSlot, entryDate, toast]);

  const onCodeScanned = useCallback((codes) => {
    if (scanLock.current) return;
    const value = codes?.[0]?.value;
    if (!value) return;
    lookupAndRoute(value, codes[0]?.type ?? 'unknown');
  }, [lookupAndRoute]);

  const codeScanner = useCodeScanner({
    codeTypes: CODE_TYPES,
    onCodeScanned,
  });

  // L05-SB2: inline "enter barcode number" affordance for a barcode the
  // camera can't read (damaged, curved, poor lighting). Opens a small
  // numeric sheet whose submit feeds lookupAndRoute exactly as a camera
  // detection would.
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [manualError, setManualError] = useState('');

  const openManual = useCallback(() => {
    setManualValue('');
    setManualError('');
    setManualOpen(true);
  }, []);

  const closeManual = useCallback(() => {
    setManualOpen(false);
  }, []);

  const onManualChange = useCallback((text) => {
    setManualValue(text.replace(/[^0-9]/g, ''));
    setManualError('');
  }, []);

  const submitManual = useCallback(() => {
    if (scanLock.current) return;
    if (!isValidManualBarcode(manualValue)) {
      setManualError('Enter the number under the barcode, 8 to 14 digits.');
      return;
    }
    setManualOpen(false);
    lookupAndRoute(manualValue.trim(), 'manual');
  }, [manualValue, lookupAndRoute]);

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
        <ModalHeader title="Scan" closePosition="left" onClose={() => navigation.goBack()} />
        <View style={styles.permissionWrap}>
          <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            Volyume uses the camera to scan barcodes. Turn it on in Settings.
          </Text>
          {permission === 'denied' ? (
            <Button
              title="Open Settings"
              onPress={() => Linking.openSettings()}
              accessibilityLabel="Open Settings"
            />
          ) : (
            <Button
              title="Allow camera"
              onPress={requestPermission}
              accessibilityLabel="Allow camera"
            />
          )}
          <Button
            title="Type it in instead"
            variant="tertiary"
            onPress={gotoManual}
            accessibilityLabel="Type it in instead"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ModalHeader title="Scan" closePosition="left" onClose={() => navigation.goBack()} />
        <View style={styles.permissionWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.permissionTitle}>No camera available</Text>
          <Button
            title="Type it in instead"
            variant="tertiary"
            onPress={gotoManual}
            accessibilityLabel="Type it in instead"
          />
        </View>
      </SafeAreaView>
    );
  }

  const isActive = focused && appActive && !resolving && !manualOpen;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ModalHeader
        title="Scan barcode"
        closePosition="left"
        onClose={() => navigation.goBack()}
        rightAccessory={(
        <TouchableOpacity
          onPress={() => setTorch(v => !v)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityState={{ selected: torch }}
          accessibilityLabel={torch ? 'Torch on' : 'Torch off'}
        >
          <Ionicons
            name={torch ? 'flashlight' : 'flashlight-outline'}
            size={22}
            color={torch ? colors.primary : colors.textPrimary}
          />
        </TouchableOpacity>
        )}
      />

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
        {/* L05-SB2: escape hatch for a damaged/curved barcode the camera
            can't read. Quiet, bottom-anchored, matches ScanLabelScreen's
            equivalent capture-row links (scrim text over the live preview). */}
        {!resolving ? (
          <View style={styles.manualLinkWrap} pointerEvents="box-none">
            <TouchableOpacity
              onPress={openManual}
              hitSlop={12}
              style={styles.manualLinkBtn}
              accessibilityRole="button"
              accessibilityLabel="Enter barcode number"
            >
              <Text style={styles.manualLinkText}>Enter barcode number</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <BottomSheet
        visible={manualOpen}
        onClose={closeManual}
        keyboardAvoiding
        accessibilityLabel="Enter barcode number"
      >
        <Text style={styles.manualTitle}>Enter barcode number</Text>
        <Text style={styles.manualBody}>
          Type the number printed under the barcode, 8 to 14 digits.
        </Text>
        <TextField
          label="Barcode number"
          value={manualValue}
          onChangeText={onManualChange}
          placeholder="e.g. 5000159461122"
          keyboardType="number-pad"
          maxLength={14}
          autoFocus
          accessibilityLabel="Barcode number"
          onSubmitEditing={submitManual}
        />
        {manualError ? <Text style={styles.manualErrorText}>{manualError}</Text> : null}
        <Button
          title="Look up"
          onPress={submitManual}
          disabled={manualValue.length === 0}
          accessibilityLabel="Look up barcode number"
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cameraWrap: { flex: 1, backgroundColor: colors.background },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reticle: {
    width: 240, height: 160, borderWidth: 2, borderColor: colors.primary,
    borderRadius: radius.md, backgroundColor: 'transparent',
  },
  hint: {
    marginTop: spacing.lg, color: colors.textPrimary, ...type.body,
    backgroundColor: colors.scrim, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: radius.sm,
  },
  resolvingBadge: {
    position: 'absolute', top: spacing.lg, right: spacing.lg,
    backgroundColor: colors.scrim, padding: spacing.sm, borderRadius: radius.sm,
  },
  manualLinkWrap: {
    position: 'absolute', bottom: spacing.xl, left: 0, right: 0,
    alignItems: 'center',
  },
  manualLinkBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  manualLinkText: {
    ...type.body, color: colors.textPrimary, backgroundColor: colors.scrim,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm,
  },
  manualTitle: { ...type.title, color: colors.textPrimary },
  manualBody: { ...type.bodySm, color: colors.textSecondary },
  manualErrorText: { ...type.bodySm, color: colors.error },
  permissionWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  permissionTitle: {
    color: colors.textPrimary, ...type.title,
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
  permissionBtnText: { color: colors.onPrimary, ...type.bodyStrong },
});
