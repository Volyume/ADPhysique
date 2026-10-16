/**
 * ClipPrimerSheet - the one privacy line before the first camera open
 * (D229 addendum 5; docs/audit/video-shares-2026-10-15/02-UX-RESEARCH.md
 * section 6.1).
 *
 * Shown ONCE PER DEVICE, the first time a person taps Film and chooses to
 * open the camera (the seen flag is `@volyume_clip_primer_seen`, written by
 * useClipRecorder, not here). It is the only explanation a person ever sees:
 * it says that a video is silent, how long it can be, where to find it, that
 * it never leaves the phone and how long it is kept. The keep sentences follow
 * the person's own setting, read when the sheet opens (primerBody in
 * rules.js). The OS camera prompt, if one is needed, follows "Open camera".
 *
 * Android guidance asks for a way out, so "Not now" is always there; swiping
 * the sheet away or tapping outside counts as "Not now".
 *
 * Built from named house parts only: BottomSheet, Text, Button.
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import Text from '../Text';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import useTheme from '../../hooks/useTheme';
import { colors, type } from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLIP_STRINGS, KEEP_DAYS_KEY, parseKeepDays, primerBody } from '../../lib/clips/rules';
import { logError } from '../../lib/errorLog';

export default function ClipPrimerSheet({ visible, onOpenCamera, onNotNow }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  // The keep window in the person's own setting (the default reads 7), read
  // each time the sheet opens so a change in Settings shows here.
  const [keepDays, setKeepDays] = useState(parseKeepDays(null));
  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    AsyncStorage.getItem(KEEP_DAYS_KEY)
      .then((raw) => { if (alive) setKeepDays(parseKeepDays(raw)); })
      .catch((e) => { logError('ClipPrimerSheet.keepRead', e); });
    return () => { alive = false; };
  }, [visible]);
  return (
    <BottomSheet
      visible={!!visible}
      onClose={onNotNow}
      accessibilityLabel={CLIP_STRINGS.primerTitle}
    >
      <Text style={[styles.title, live.title]}>{CLIP_STRINGS.primerTitle}</Text>
      <Text style={[styles.body, live.body]}>{primerBody(keepDays)}</Text>
      <Button
        title={CLIP_STRINGS.primerOpen}
        variant="primary"
        icon="videocam-outline"
        onPress={onOpenCamera}
        accessibilityLabel={CLIP_STRINGS.primerOpen}
      />
      <Button
        title={CLIP_STRINGS.primerNotNow}
        variant="tertiary"
        onPress={onNotNow}
        accessibilityLabel={CLIP_STRINGS.primerNotNow}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.textPrimary },
  body: { ...type.bodySm, color: colors.textSecondary },
});

// Frozen styles above, live colour and type mirrors here (the CP-10 pattern).
function buildLiveStyles(t) {
  return {
    title: { ...t.type.title, color: t.colors.textPrimary },
    body: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
