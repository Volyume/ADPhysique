// Themed, in-app replacement for React Native's `Alert.alert`. The native
// dialog renders as a white system sheet that looks out of place on Volyume's
// dark theme; this draws the same dialog in the app's own style (dark card,
// amber primary action, muted cancel, red destructive) with an identical call
// signature so every `Alert.alert(...)` site swaps to `appAlert(...)` with no
// other change.
//
// Signature: appAlert(title, message?, buttons?, options?)
//   buttons: [{ text, onPress?, style?: 'default' | 'cancel' | 'destructive' }]
//   options: { cancelable?: boolean }   // tap-outside dismiss, default true
//
// It is a module-level singleton so it can be called from anywhere, including
// non-component code (lib/*), exactly like Alert.alert. Mount <AppAlertHost />
// once near the app root.
import { useEffect, useState, useRef, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import useAppStore from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight } from '../styles/theme';
import useTheme from '../hooks/useTheme';

let _enqueue = null;
const _queue = [];

export function appAlert(title, message, buttons, options) {
  const req = {
    title: title ?? '',
    message: message ?? '',
    buttons: Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK' }],
    options: options ?? {},
  };
  if (_enqueue) _enqueue(req);
  else _queue.push(req);
}

export function AppAlertHost() {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const [current, setCurrent] = useState(null);
  const queueRef = useRef([]);
  const showingRef = useRef(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      showingRef.current = false;
      setCurrent(null);
      return;
    }
    showingRef.current = true;
    setCurrent(queueRef.current.shift());
  }, []);

  const enqueue = useCallback((req) => {
    queueRef.current.push(req);
    if (!showingRef.current) showNext();
  }, [showNext]);

  useEffect(() => {
    _enqueue = enqueue;
    // Drain anything queued before the host mounted.
    if (_queue.length) _queue.splice(0, _queue.length).forEach(enqueue);
    return () => { if (_enqueue === enqueue) _enqueue = null; };
  }, [enqueue]);

  const dismiss = useCallback((onPress) => {
    if (typeof onPress === 'function') {
      // Defer so the modal close animation is not blocked by the handler.
      setTimeout(() => { try { onPress(); } catch (_) { /* swallow */ } }, 0);
    }
    showNext();
  }, [showNext]);

  if (!current) return null;

  const { title, message, buttons, options } = current;
  const cancelable = options.cancelable !== false;
  const onBackdrop = () => {
    if (!cancelable) return;
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    dismiss(cancelBtn?.onPress);
  };
  // Row layout for the common 1-2 button case (matches the native dialog's
  // bottom-aligned actions); stack when there are more.
  const stacked = buttons.length > 2;

  return (
    <Modal transparent animationType={reduceMotion ? 'none' : 'fade'} statusBarTranslucent onRequestClose={onBackdrop}>
      <TouchableOpacity
        style={[styles.backdrop, live.backdrop]}
        activeOpacity={1}
        onPress={onBackdrop}
        // AX-3: when cancelable, name the backdrop so a screen reader
        // announces tap-to-dismiss instead of landing on a blank control.
        // When not cancelable the tap is already a no-op, so it stays
        // roleless/unlabelled rather than announcing a dead "Close".
        accessibilityRole={cancelable ? 'button' : undefined}
        accessibilityLabel={cancelable ? 'Close' : undefined}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.card, live.card]}
          onPress={() => {}}
          // accessible={false} stops the backdrop's "Close" label from
          // swallowing the card's own content into one opaque node; the
          // title/message/buttons below stay individually reachable.
          // accessibilityViewIsModal traps screen-reader navigation to
          // the dialog while it's open (same pattern as BottomSheet.js).
          accessible={false}
          accessibilityViewIsModal
        >
          {/* D42 (founder defect, 2026-07-11): title/message are the only
              unbounded-length part of the card, so they alone sit inside the
              scroll region (styles.card caps maxHeight and clips overflow,
              see that style's comment for the full geometry evidence). The
              action row below stays a SIBLING, outside this ScrollView, so
              the buttons are never carried off-screen inside scrollable
              content and are always reachable without scrolling first --
              the same "footer stays put, body scrolls" shape as the
              sup-modal/BottomSheet convention. */}
          <ScrollView style={styles.cardScroll} showsVerticalScrollIndicator={false}>
            {!!title && <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]} accessibilityRole="header">{title}</Text>}
            {!!message && <Text maxFontSizeMultiplier={1.3} style={[styles.message, live.message]}>{message}</Text>}
          </ScrollView>
          <View style={[styles.actions, stacked ? styles.actionsStacked : styles.actionsRow]}>
            {buttons.map((b, i) => {
              const isCancel = b.style === 'cancel';
              const isDestructive = b.style === 'destructive';
              const isPrimary = !isCancel && !isDestructive;
              return (
                <TouchableOpacity
                  key={`${b.text}-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={b.text}
                  onPress={() => dismiss(b.onPress)}
                  style={[
                    styles.btn,
                    stacked && styles.btnStacked,
                    isPrimary && [styles.btnPrimary, live.btnPrimary],
                    isDestructive && styles.btnDestructive,
                    isCancel && styles.btnCancel,
                  ]}
                >
                  <Text maxFontSizeMultiplier={1.3}
                    style={[
                      styles.btnText,
                      isPrimary && [styles.btnTextPrimary, live.btnTextPrimary],
                      isDestructive && [styles.btnTextDestructive, live.btnTextDestructive],
                      isCancel && [styles.btnTextCancel, live.btnTextCancel],
                    ]}
                  >
                    {b.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  // D42 (founder defect report, 2026-07-11): the card had no height cap and
  // no scroll, so a long alert (title + message + a stacked multi-button
  // row -- the reported case was the recurring unilateral one-side-at-a-time
  // confirm) could be taller than the viewport with the actions rendered
  // off-screen and unreachable, on both platforms. maxHeight: '88%' (the
  // same cap ActiveWorkoutScreen's supSheet uses, see git 60ebbd9) plus
  // overflow: 'hidden' (clips scrolled content to the rounded corners) fixes
  // that: the card can never exceed the viewport, and cardScroll below makes
  // the excess scroll instead of clip.
  //
  // Bottom safe-area inset: NOT applied here, by evidence, not omission.
  // The sup-modal Math.max(token, insets.bottom + token) contract (D36a)
  // exists because those sheets are flush to the physical bottom edge
  // (supOverlay: justifyContent: 'flex-end') with zero built-in clearance.
  // This card is centred (backdrop: justifyContent: 'center', padding:
  // spacing.xl on every edge) with two independent layers of clearance the
  // flush sheets don't have: (1) centring itself guarantees at least half of
  // whatever headroom the 88% cap leaves is free on EACH side (a card at the
  // cap on a 411dp-tall short/landscape viewport still leaves ~46dp between
  // the card's own edge and the screen edge, before backdrop padding); (2)
  // the actions row is a further spacing.xl (24dp) inboard of the card's own
  // bottom edge (this card style's padding applies to the actions row too).
  // Stacking both layers keeps the actions comfortably clear (~70dp in that
  // worked example) of even a 48dp three-button nav bar in the shortest
  // realistic viewports; a centred dialog's geometry structurally cannot
  // reproduce the flush-sheet failure mode. Revisit only if AppAlert is ever
  // re-anchored to an edge instead of centred.
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: colors.surfaceElevated ?? colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  // Scroll wrapper for the title/message region only (see the D42 comment
  // above the JSX for why the actions stay outside this). Same
  // flexShrink/minHeight shape as ActiveWorkoutScreen's supSheetScroll: lets
  // the ScrollView shrink to whatever the capped card leaves it, instead of
  // forcing its own natural (unbounded) content height onto the card.
  cardScroll: { flexShrink: 1, minHeight: 0 },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  actions: { gap: spacing.sm },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionsStacked: { flexDirection: 'column' },
  btn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnStacked: { width: '100%' },
  btnPrimary: { backgroundColor: colors.primaryFill },
  btnDestructive: { backgroundColor: 'transparent' },
  btnCancel: { backgroundColor: 'transparent' },
  btnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  btnTextPrimary: { color: colors.onPrimary, fontWeight: fontWeight.bold },
  btnTextDestructive: { color: colors.error },
  btnTextCancel: { color: colors.textMuted },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    backdrop: { backgroundColor: t.colors.scrim },
    card: { backgroundColor: t.colors.surfaceElevated ?? t.colors.surface, borderColor: t.colors.border },
    title: { color: t.colors.textPrimary },
    message: { color: t.colors.textSecondary },
    btnPrimary: { backgroundColor: t.colors.primaryFill },
    btnTextPrimary: { color: t.colors.onPrimary },
    btnTextDestructive: { color: t.colors.error },
    btnTextCancel: { color: t.colors.textMuted },
  };
}
