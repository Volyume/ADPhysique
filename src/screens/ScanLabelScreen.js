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
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking, AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, radius, type } from '../styles/theme';
import Button from '../components/Button';
import { isOcrConfigured, recogniseText, recogniseBlocks } from '../lib/food/ocr';
import { parseNutritionLabel } from '../lib/food/ocrParser';
import { pickProductName } from '../lib/food/labelName';
import { queueContribution, getConsent } from '../lib/food/writeback';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export default function ScanLabelScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? todayLocalKey();
  const prefillBarcode = route?.params?.prefillBarcode ?? null;

  const [permission, setPermission] = useState(Camera.getCameraPermissionStatus());
  const [busy, setBusy] = useState(false);
  // Two-step capture: 'front' reads the product name, 'nutrition' reads the
  // panel. productName carries the read name across to the nutrition step.
  const [step, setStep] = useState('front');
  const [productName, setProductName] = useState('');
  const [torch, setTorch] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [focused, setFocused] = useState(true);
  const cameraRef = useRef(null);
  const device = useCameraDevice('back');
  const ocrAvailable = isOcrConfigured();

  useFocusEffect(useCallback(() => {
    setFocused(true);
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

      // Queue OFF contribution if the user opted in AND we have a
      // barcode to attach. Fires now; the parsed macros are what
      // the user is about to confirm in AddCustomFood. We could
      // wait for the save to fire, but queuing on capture is simpler
      // and the user can abort the save if the OCR was nonsense.
      if (prefillBarcode && (await getConsent())) {
        await queueContribution(userId, {
          barcode: prefillBarcode,
          kcal100g: macros.kcal100g, protein100g: macros.protein100g,
          carbs100g: macros.carbs100g, fat100g: macros.fat100g,
          fibre100g: macros.fibre100g, servingG: macros.servingG,
        });
      }

      navigation.replace('AddCustomFood', {
        mealSlot, entryDate, prefillBarcode, prefillMacros: macros, prefillName: nameParam,
      });
    } catch {
      if (step === 'front') {
        setStep('nutrition');
        setBusy(false);
        return;
      }
      navigation.replace('AddCustomFood', {
        mealSlot, entryDate, prefillBarcode, prefillName: productName || undefined,
      });
    }
  }, [busy, navigation, mealSlot, entryDate, prefillBarcode, userId, torch, step, productName]);

  // Skip the name step and go straight to the nutrition panel.
  const skipName = () => {
    if (busy) return;
    setStep('nutrition');
  };

  const gotoManual = () => {
    navigation.replace('AddCustomFood', {
      mealSlot, entryDate, prefillBarcode, prefillName: productName || undefined,
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Snap label</Text>
          <View style={{ width: 24 }} />
        </View>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Snap label</Text>
          <View style={{ width: 24 }} />
        </View>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Snap label</Text>
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
            <Text style={styles.missTitle}>Barcode {prefillBarcode} not in our database</Text>
            <Text style={styles.missBody}>
              {!ocrAvailable
                ? 'Type the macros in, we’ll keep the barcode on the saved food so the next scan hits.'
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
                {/* eslint-disable-next-line no-restricted-syntax -- spinner sits on the white camera capture button */}
                {busy ? <ActivityIndicator color="#000" /> : <View style={styles.captureInner} />}
              </TouchableOpacity>
              {onFront && !busy ? (
                <TouchableOpacity onPress={skipName} hitSlop={12} style={styles.skipBtn}>
                  <Text style={styles.skipText}>Skip name</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Button title="Type it in" variant="tertiary" onPress={gotoManual} />
          )}
        </View>
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
  headerTitle: { ...type.title, color: colors.textPrimary },
  // eslint-disable-next-line no-restricted-syntax -- camera viewport is true black behind the live preview
  cameraWrap: { flex: 1, backgroundColor: '#000' },
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
    color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20,
  },
  captureRow: {
    position: 'absolute', bottom: spacing.xl, left: 0, right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    // eslint-disable-next-line no-restricted-syntax -- white capture-ring is camera-UI convention, sits over the live preview
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)',
  },
  captureBtnDisabled: { opacity: 0.6 },
  skipBtn: { marginTop: spacing.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  skipText: { ...type.body, color: colors.textPrimary, backgroundColor: colors.scrim, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm },
  // eslint-disable-next-line no-restricted-syntax -- camera capture-button inner dot, black-on-white is the shutter convention
  captureInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#000' },
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
