/**
 * ScanLabelScreen (Move #1.5 phase 3).
 *
 * Nutrition-label OCR capture. Takes a photo of the label, runs the
 * on-device MLKit text recogniser (@react-native-ml-kit/text-recognition),
 * parses macros, navigates to AddCustomFood with the macros prefilled
 * and the original image queued for OFF write-back (if the user has
 * opted in).
 *
 * If the MLKit native module isn't present in the running binary
 * (e.g. Expo Go without the dev client), the capture button is
 * hidden and the screen surfaces a "Type it in instead" CTA that
 * routes straight to AddCustomFood. EAS dev-client builds with the
 * package in dependencies pick it up automatically via autolinking.
 *
 * Voice rules: short, no encouragement, no AI tells.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { isOcrConfigured, recogniseText } from '../lib/food/ocr';
import { parseNutritionLabel } from '../lib/food/ocrParser';
import { queueContribution, getConsent } from '../lib/food/writeback';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export default function ScanLabelScreen({ navigation, route }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;

  const mealSlot = route?.params?.mealSlot ?? 'snack';
  const entryDate = route?.params?.entryDate ?? new Date().toISOString().slice(0, 10);
  const prefillBarcode = route?.params?.prefillBarcode ?? null;

  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef(null);
  const ocrAvailable = isOcrConfigured();

  const onCapture = useCallback(async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7, skipProcessing: true,
      });
      if (!photo?.uri) {
        navigation.replace('AddCustomFood', {
          mealSlot, entryDate, prefillBarcode,
        });
        return;
      }
      const text = await recogniseText(photo.uri);
      const parsed = text ? parseNutritionLabel(text) : null;
      const macros = parsed?.fields || {};

      // Queue OFF contribution if user is opted in + there's a
      // barcode to attach. Fires now; the parsed macros are what
      // the user is about to confirm in AddCustomFood, so the
      // contribution reflects their (eventual) review. We could
      // wait until the AddCustomFood save fires, but the simpler
      // path is to queue on capture and trust the user to abort
      // the save if the OCR was nonsense.
      if (prefillBarcode && (await getConsent())) {
        await queueContribution(userId, {
          barcode: prefillBarcode,
          kcal100g: macros.kcal100g, protein100g: macros.protein100g,
          carbs100g: macros.carbs100g, fat100g: macros.fat100g,
          fibre100g: macros.fibre100g, servingG: macros.servingG,
        });
      }

      navigation.replace('AddCustomFood', {
        mealSlot, entryDate, prefillBarcode, prefillMacros: macros,
      });
    } catch {
      navigation.replace('AddCustomFood', {
        mealSlot, entryDate, prefillBarcode,
      });
    }
  }, [busy, navigation, mealSlot, entryDate, prefillBarcode, userId]);

  const gotoManual = () => {
    navigation.replace('AddCustomFood', {
      mealSlot, entryDate, prefillBarcode,
    });
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={colors.textMuted} /></View>
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
          <Text style={styles.headerTitle}>Snap label</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.fallbackWrap}>
          <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
          <Text style={styles.fallbackTitle}>Camera access needed</Text>
          <Text style={styles.fallbackBody}>
            Volyume uses the camera to read nutrition labels.
          </Text>
          {permission.canAskAgain ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
              <Text style={styles.primaryBtnText}>Allow camera</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.primaryBtnText}>Open Settings</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryBtn} onPress={gotoManual}>
            <Text style={styles.secondaryBtnText}>Type it in instead</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Snap label</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
        />
        {prefillBarcode ? (
          <View style={styles.missBanner} pointerEvents="none">
            <Text style={styles.missTitle}>Barcode {prefillBarcode} not in our database</Text>
            <Text style={styles.missBody}>
              {ocrAvailable
                ? 'Frame the nutrition panel and tap the shutter, or type it in.'
                : 'Type the macros in — we’ll keep the barcode on the saved food so the next scan hits.'}
            </Text>
          </View>
        ) : (
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.frame} />
            <Text style={styles.hint}>
              {busy ? 'Reading' : 'Frame the nutrition panel'}
            </Text>
          </View>
        )}
        <View style={styles.captureRow}>
          {ocrAvailable ? (
            <TouchableOpacity
              style={[styles.captureBtn, busy && styles.captureBtnDisabled]}
              onPress={onCapture}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#000" /> : <View style={styles.captureInner} />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryBtn} onPress={gotoManual}>
              <Text style={styles.secondaryBtnText}>Type it in</Text>
            </TouchableOpacity>
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
  headerTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 280, height: 360, borderWidth: 2, borderColor: colors.primary,
    borderRadius: radius.md, backgroundColor: 'transparent',
  },
  hint: {
    marginTop: spacing.lg, color: colors.textPrimary, fontSize: fontSize.md,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: radius.sm,
  },
  missBanner: {
    position: 'absolute', top: spacing.lg, left: spacing.lg, right: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.78)', borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.xs,
  },
  missTitle: {
    color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold,
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
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)',
  },
  captureBtnDisabled: { opacity: 0.6 },
  captureInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#000' },
  fallbackWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  fallbackTitle: {
    color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold,
    marginTop: spacing.lg,
  },
  fallbackBody: {
    color: colors.textMuted, fontSize: fontSize.md, textAlign: 'center',
    marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, borderRadius: radius.md,
  },
  primaryBtnText: { color: '#000', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  secondaryBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.md,
  },
  secondaryBtnText: { color: colors.primary, fontSize: fontSize.md },
});
