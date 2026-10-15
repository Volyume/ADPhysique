/**
 * ClipPrimerSheet - the one privacy line before the first camera open
 * (D229 addendum 5; docs/audit/video-shares-2026-10-15/02-UX-RESEARCH.md
 * section 6.1).
 *
 * Shown ONCE PER DEVICE, the first time a person taps "Record a clip" and
 * chooses to open the camera (the seen flag is `@volyume_clip_primer_seen`,
 * written by useClipRecorder, not here). It is the only explanation a person
 * ever sees: it says what a clip is, that it is silent, that it never leaves
 * the phone and that it goes with the workout. The OS camera prompt, if one is
 * needed, follows "Open camera".
 *
 * Android guidance asks for a way out, so "Not now" is always there; swiping
 * the sheet away or tapping outside counts as "Not now".
 *
 * Built from named house parts only: BottomSheet, Text, Button.
 */
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Text from '../Text';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import useTheme from '../../hooks/useTheme';
import { colors, type } from '../../styles/theme';
import { CLIP_STRINGS } from '../../lib/clips/rules';

export default function ClipPrimerSheet({ visible, onOpenCamera, onNotNow }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  return (
    <BottomSheet
      visible={!!visible}
      onClose={onNotNow}
      accessibilityLabel={CLIP_STRINGS.primerTitle}
    >
      <Text style={[styles.title, live.title]}>{CLIP_STRINGS.primerTitle}</Text>
      <Text style={[styles.body, live.body]}>{CLIP_STRINGS.primerBody}</Text>
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
