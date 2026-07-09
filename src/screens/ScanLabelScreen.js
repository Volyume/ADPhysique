/**
 * ScanLabelScreen (Move #1.5 phase 3, vision-camera build).
 *
 * Two-step food capture, the way Cronometer does it: first the front of
 * pack (to read the product name), then the nutrition panel (to read the
 * macros). Takes each photo via react-native-vision-camera, runs the
 * on-device MLKit text recogniser (@react-native-ml-kit/text-recognition),
 * picks the name from the front-of-pack blocks and parses macros from the
 * panel, then navigates to AddCustomFood with the name + macros prefilled
 * and the original image queued for OFF write-back (if the user opted in).
 * The name step can be skipped, and the whole thing degrades to manual
 * entry when OCR isn't in the binary.
 *
 * Two entry contexts:
 *   - With prefillBarcode (from a ScanBarcode miss): top banner
 *     surfaces "Barcode {ean} not in our database" + guidance.
 *   - Without prefillBarcode (direct "snap a label" entry): default
 *     "Frame the nutrition panel" hint.
 *
 * If the MLKit native module isn't present in the running binary
 * (e.g. Expo Go without the dev client), the capture button hides
 * and the screen surfaces a "Type it in" CTA that routes straight
 * to AddCustomFood. EAS dev-client builds with the package in
 * dependencies pick it up via autolinking.
 *
 * Voice rules: short, no encouragement, no AI tells.
 */
import { todayLocalKey } from '../lib/dayKey';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking, AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, spacing, radius, type, circle } from '../styles/theme';
import Button from '../components/Button';
import ModalHeader from '../components/ModalHeader';
import NetInfo from '@react-native-community/netinfo';
import { isOcrConfigured, recogniseText, recogniseBlocks } from '../lib/food/ocr';
import { parseNutritionLabel } from '../lib/food/ocrParser';
import { pickProductName } from '../lib/food/labelName';

// C8 (Wave A): remembers a "skip the name step" choice across scans, so a
// user who never bothers with front-of-pack photos isn't asked every time.
// Set-only from the UI (skipName below); the per-scan "Add a name" link only
// affects that one scan. L05-SL1 (design audit 2026-07-09): the global reset
// lives in SettingsDataScreen.js as a two-way Switch reading/writing this
// same key (hardcoded there, matching the '@volyume_*' key convention rather
// than importing this screen's module) - toggling it off clears the flag, so
// the next scan asks for a name again.
export const SKIP_NAME_KEY = '@volyume_scan_skip_name';

// Pure: the step to open on given the persisted flag's raw AsyncStorage
// value ('true' / null / anything else). Exported for the colocated test.
export function getInitialStep(flagValue) {
  return flagValue === 'true' ? 'nutrition' : 'front';
}

// Pure: whether the quiet "Add a name" link should show on the nutrition
// step. Only offered when this scan's name step was skipped (this session's
// tap, or the remembered flag auto-skipping on arrival) and never while busy
// capturing/processing a photo.
export function shouldOfferAddNameLink({ step, skipRemembered, busy }) {
  return step === 'nutrition' && !!skipRemembered && !busy;
}

export default function ScanLabelScreen({ navigation, route }) {
  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? todayLocalKey();
  const prefillBarcode = route?.params?.prefillBarcode ?? null;

  const [permission, setPermission] = useState(Camera.getCameraPermissionStatus());
  const [busy, setBusy] = useState(false);
  // Two-step capture: 'front' reads the product name, 'nutrition' reads the
  // panel. productName carries the read name across to the nutrition step.
  const [step, setStep] = useState('front');
  const [productName, setProductName] = useState('');
  // C8: true when this scan's name step was skipped (either just now via
  // "Skip name", or on arrival because the remembered flag was already set).
  // Drives the quiet "Add a name" way back on the nutrition step.
  const [skipRemembered, setSkipRemembered] = useState(false);
  const [torch, setTorch] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [focused, setFocused] = useState(true);
  const cameraRef = useRef(null);
  const device = useCameraDevice('back');
  const ocrAvailable = isOcrConfigured();

  // COMP-022 arrival choice: a barcode miss lands here. Rather than dumping the
  // user straight into the camera, present a one-tap decision (scan the label /
  // type it in). Skipped when OCR isn't in the binary (the existing type-in CTA
  // path covers that, State C). `reachable` picks honest copy: a confirmed
  // miss (online) vs "couldn't check" (offline), no waterfall hot-path change.
  const [arrivalChoice, setArrivalChoice] = useState(!!prefillBarcode && ocrAvailable);
  const [reachable, setReachable] = useState(null); // null = checking, treated as online
  useEffect(() => {
    if (!prefillBarcode) return;
    let cancelled = false;
    NetInfo.fetch()
      .then((s) => { if (!cancelled) setReachable(s?.isConnected !== false && s?.isInternetReachable !== false); })
      .catch(() => { if (!cancelled) setReachable(true); });
    return () => { cancelled = true; };
  }, [prefillBarcode]);
  const offline = reachable === false;

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  // C8: load the remembered "skip the name step" flag once on mount. If set,
  // this scan opens straight on the nutrition step, same as tapping "Skip
  // name" just now. Never overrides a step the user has already moved past.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SKIP_NAME_KEY).then((v) => {
      if (cancelled || getInitialStep(v) !== 'nutrition') return;
      setSkipRemembered(true);
      setStep('nutrition');
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const requestPermission = useCallback(async () => {
    const next = await Camera.requestCameraPermission();
    setPermission(next);
  }, []);

  // First-time arrivals get the OS permission dialog automatically
  // instead of being stranded on a spinner. Mirrors the same fix in
  // ScanBarcodeScreen.
  useEffect(() => {
    if (permission === 'not-determined') {
      requestPermission().catch(() => {});
    }
  }, [permission, requestPermission]);

  const onCapture = useCallback(async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: torch ? 'on' : 'off',
        enableShutterSound: false,
      });
      // vision-camera returns path without scheme; the recogniser
      // needs a file:// URI so MLKit's image loader can read it.
      const uri = photo?.path?.startsWith('file://') ? photo.path : `file://${photo?.path ?? ''}`;

      // Step 1: front of pack. Read the name, then move to the panel.
      // A failed or empty read just advances with no name, never blocks.
      if (step === 'front') {
        if (uri) {
          const ocr = await recogniseBlocks(uri);
          const nm = ocr ? pickProductName(ocr) : null;
          if (nm) setProductName(nm);
        }
        // A real capture attempt this scan, not a skip, so the "Add a name"
        // link has nothing to offer back to.
        setSkipRemembered(false);
        setStep('nutrition');
        setBusy(false);
        return;
      }

      // Step 2: nutrition panel. Parse macros and hand off to AddCustomFood
      // with the name (if read) and macros prefilled.
      const nameParam = productName || undefined;
      if (!uri) {
        navigation.replace('AddCustomFood', {
          mealSlot, entryDate, prefillBarcode, prefillName: nameParam,
        });
        return;
      }
      const text = await recogniseText(uri);
      const parsed = text ? parseNutritionLabel(text) : null;
      const macros = parsed?.fields || {};
      const confidence = parsed?.confidence || null;

      // OFF contribution is NOT queued here any more (COMP-022): queuing at
      // capture sent unconfirmed OCR, which contradicts the consent copy
      // ("the macros you confirm") and left an orphan queue entry if the
      // user abandoned the save. It now fires from AddCustomFood's onSave
      // with the values the user actually confirmed.
      navigation.replace('AddCustomFood', {
        mealSlot, entryDate, prefillBarcode, prefillMacros: macros,
        prefillConfidence: confidence, prefillName: nameParam,
        from: 'scan_chain',
      });
    } catch {
      if (step === 'front') {
        setSkipRemembered(false);
        setStep('nutrition');
        setBusy(false);
        return;
      }
      navigation.replace('AddCustomFood', {
        mealSlot, entryDate, prefillBarcode, prefillName: productName || undefined,
      });
    }
  }, [busy, navigation, mealSlot, entryDate, prefillBarcode, torch, step, productName]);

  // Skip the name step and go straight to the nutrition panel. C8: also
  // remembers the choice for future scans (set-only; never cleared here).
  const skipName = () => {
    if (busy) return;
    setSkipRemembered(true);
    setStep('nutrition');
    AsyncStorage.setItem(SKIP_NAME_KEY, 'true').catch(() => {});
  };

  // C8: the quiet way back from the nutrition step to the name step, for
  // this scan only. Does not clear the remembered flag, so the next scan
  // still opens on nutrition unless the user comes back here again.
  const addNameBack = () => {
    if (busy) return;
    setStep('front');
  };

  const gotoManual = () => {
    navigation.replace('AddCustomFood', {
      mealSlot, entryDate, prefillBarcode, prefillName: productName || undefined,
      from: 'scan_manual',
    });
  };

  if (permission === 'not-determined') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={colors.textMuted} /></View>
      </SafeAreaView>
    );
  }

  if (permission !== 'granted') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ModalHeader title="Snap label" closePosition="left" onClose={() => navigation.goBack()} />
        <View style={styles.fallbackWrap}>
          <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
          <Text style={styles.fallbackTitle}>Camera access needed</Text>
          <Text style={styles.fallbackBody}>
            Volyume uses the camera to read nutrition labels.
          </Text>
          {permission === 'denied' ? (
            <Button title="Open Settings" onPress={() => Linking.openSettings()} />
          ) : (
            <Button title="Allow camera" onPress={requestPermission} />
          )}
          <Button title="Type it in instead" variant="tertiary" onPress={gotoManual} />
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ModalHeader title="Snap label" closePosition="left" onClose={() => navigation.goBack()} />
        <View style={styles.fallbackWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.fallbackTitle}>No camera available</Text>
          <Button title="Type it in instead" variant="tertiary" onPress={gotoManual} />
        </View>
      </SafeAreaView>
    );
  }

  const isActive = focused && appActive;
  const onFront = step === 'front';
  const hintText = busy
    ? 'Reading'
    : onFront ? 'Front of pack (1 of 2)' : 'Nutrition panel (2 of 2)';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ModalHeader
        title="Snap label"
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
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          device={device}
          isActive={isActive}
          photo={true}
          torch={torch ? 'on' : 'off'}
          enableZoomGesture
        />
        {prefillBarcode ? (
          <View style={styles.missBanner} pointerEvents="none">
            <Text style={styles.missTitle}>
              {offline
                ? `Barcode ${prefillBarcode}`
                : `Barcode ${prefillBarcode} not in our database`}
            </Text>
            <Text style={styles.missBody}>
              {!ocrAvailable
                ? 'Enter the nutrition facts. The barcode is saved with them, so next time it scans straight away.'
                : onFront
                  ? 'Snap the front for the name, then the nutrition panel.'
                  : 'Frame the nutrition panel and tap the shutter.'}
            </Text>
          </View>
        ) : null}
        {ocrAvailable ? (
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.frame} />
            <Text style={styles.hint}>{hintText}</Text>
          </View>
        ) : null}
        <View style={styles.captureRow}>
          {ocrAvailable ? (
            <>
              <TouchableOpacity
                style={[styles.captureBtn, busy && styles.captureBtnDisabled]}
                onPress={onCapture}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={onFront ? 'Capture front of pack' : 'Capture nutrition panel'}
              >
                {busy ? <ActivityIndicator color={colors.camera} /> : <View style={styles.captureInner} />}
              </TouchableOpacity>
              {onFront && !busy ? (
                <TouchableOpacity onPress={skipName} hitSlop={12} style={styles.skipBtn} accessibilityRole="button" accessibilityLabel="Skip name">
                  <Text style={styles.skipText}>Skip name</Text>
                </TouchableOpacity>
              ) : null}
              {/* C8: quiet, discoverable way back to the name step for this
                  scan only, when the step was skipped (this time or via the
                  remembered flag). Never clears the flag. */}
              {shouldOfferAddNameLink({ step, skipRemembered, busy }) ? (
                <TouchableOpacity onPress={addNameBack} hitSlop={12} style={styles.skipBtn} accessibilityRole="button" accessibilityLabel="Add a name">
                  <Text style={styles.skipText}>Add a name</Text>
                </TouchableOpacity>
              ) : null}
              {/* COMP-022: a barcode heal must never dead-end mid-capture, a
                  persistent escape that keeps the barcode (✕ would discard it). */}
              {prefillBarcode && !busy ? (
                <TouchableOpacity onPress={gotoManual} hitSlop={12} style={styles.skipBtn} accessibilityRole="button" accessibilityLabel="Type it in">
                  <Text style={styles.skipText}>Type it in</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Button title="Type it in" variant="tertiary" onPress={gotoManual} />
          )}
        </View>
      </View>

      {/* COMP-022 arrival choice: camera warm behind the scrim, one tap in. */}
      {arrivalChoice ? (
        <View style={styles.choiceOverlay}>
          <View style={styles.choiceScrim} />
          <View style={styles.choiceCard}>
            <Text style={styles.choiceTitle}>
              {offline ? 'Couldn’t check the full database' : 'Not in the database yet'}
            </Text>
            <Text style={styles.choiceBody}>
              {offline
                ? 'You’re offline, so only the on-device list was checked. Label scanning still works offline. Whatever you save is kept on this phone.'
                : 'Fix it once and it’s yours. Scan the label, about 30 seconds, or type it in. The barcode is saved either way, so next time it scans instantly.'}
            </Text>
            <Button title="Scan the label" onPress={() => setArrivalChoice(false)} />
            <Button title="Type it in" variant="tertiary" onPress={gotoManual} />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  choiceOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  choiceScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  choiceCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, gap: spacing.md,
  },
  choiceTitle: { ...type.title, color: colors.textPrimary },
  choiceBody: { ...type.bodySm, color: colors.textSecondary },
  cameraWrap: { flex: 1, backgroundColor: colors.camera },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 280, height: 360, borderWidth: 2, borderColor: colors.primary,
    borderRadius: radius.md, backgroundColor: 'transparent',
  },
  hint: {
    ...type.body,
    marginTop: spacing.lg, color: colors.textPrimary,
    backgroundColor: colors.scrim, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: radius.sm,
  },
  missBanner: {
    position: 'absolute', top: spacing.lg, left: spacing.lg, right: spacing.lg,
    backgroundColor: colors.scrim, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.xs,
  },
  missTitle: {
    ...type.bodyStrong, color: colors.textPrimary,
  },
  missBody: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
  captureRow: {
    position: 'absolute', bottom: spacing.xl, left: 0, right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: circle(72),
    backgroundColor: colors.primaryFill,
    alignItems: 'center', justifyContent: 'center',
    // eslint-disable-next-line no-restricted-syntax -- white capture-ring is camera-UI convention, sits over the live preview
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)',
  },
  captureBtnDisabled: { opacity: 0.6 },
  skipBtn: { marginTop: spacing.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  skipText: { ...type.body, color: colors.textPrimary, backgroundColor: colors.scrim, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm },
  captureInner: { width: 48, height: 48, borderRadius: circle(48), backgroundColor: colors.camera },
  fallbackWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  fallbackTitle: {
    ...type.title, color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  fallbackBody: {
    color: colors.textMuted, fontSize: fontSize.md, textAlign: 'center',
    marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 22,
  },
});
