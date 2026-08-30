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
import { Modal, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
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
    // RB-11 (D96, Review B): options.onDismiss was accepted and silently
    // ignored - two call sites pass it, and both survived only because
    // their cancel button resolves the same promise. Honour it (React
    // Native Alert parity) alongside the cancel path, so a future confirm
    // that relies on onDismiss alone cannot hang its await.
    dismiss(() => {
      try { cancelBtn?.onPress?.(); } catch (_) { /* swallow */ }
      try { options.onDismiss?.(); } catch (_) { /* swallow */ }
    });
  };
  // Row layout for the common 1-2 button case (matches the native dialog's
  // bottom-aligned actions); stack when there are more.
  // CC33 round 8 (J2/J5, the horizontal axis): a two-button ROW has no
  // wrap and no width bound, and this campaign's own long pairs ("Leave
  // it as it is" + "Stop working around it") overflow a narrow card at
  // default type - with overflow:'hidden', the leading button clipped.
  // Long pairs stack instead (full-width buttons have no horizontal
  // problem at all); the 26-character threshold keeps ordinary pairs
  // (Cancel/Delete, OK) on one row. The row style also wraps and the
  // buttons shrink as a safety net for anything the threshold misses at
  // large font scales - a wrapped or narrowed button stays fully
  // visible and tappable, where a clipped one did not.
  const combinedLabelLength = buttons.reduce((n, b) => n + String(b?.text ?? '').length, 0);
  const stacked = buttons.length > 2 || combinedLabelLength > 26;

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
              unbounded-length part of the card in the ordinary case, so
              they alone sit inside this scroll region (styles.card caps
              maxHeight and clips overflow, see that style's comment for
              the full geometry evidence). The action row below stays a
              SIBLING, outside this ScrollView, so the buttons are never
              carried off-screen inside scrollable content and are always
              reachable without scrolling first -- the same "footer stays
              put, body scrolls" shape as the sup-modal/BottomSheet
              convention. Round 6 (CC33 J5): the action region is itself
              a bounded ScrollView now, because a STACKED action list is
              also unbounded (the CC33 revisit chooser renders one button
              per conversation) - when actions alone exceed the capped
              card at large type, they used to be clipped by the card's
              overflow:'hidden' with the last buttons unreachable. Round
              7 (R7-6): the region is bounded by a maxHeight cap and
              NEVER by flexShrink - shrinkable, it competed with the
              message for the deficit at the 88% cap and a long message
              squeezed ordinary two-button rows to a sliver. Normal
              alerts render actions at full height with the message
              alone scrolling (D42's shape); only an oversized stacked
              list scrolls within its own bound. */}
          <ScrollView style={styles.cardScroll} showsVerticalScrollIndicator={false}>
            {!!title && <Text style={[styles.title, live.title]} accessibilityRole="header">{title}</Text>}
            {!!message && <Text style={[styles.message, live.message]}>{message}</Text>}
          </ScrollView>
          <ScrollView
            style={styles.actionsScroll}
            contentContainerStyle={[styles.actions, stacked ? styles.actionsStacked : styles.actionsRow]}
            showsVerticalScrollIndicator={false}
          >
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
                  <Text
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
          </ScrollView>
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
  // flexWrap (round 8, J2/J5): the row's own safety net - see the
  // `stacked` derivation for the geometry.
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap' },
  actionsStacked: { flexDirection: 'column' },
  // CC33 round 6 (J5) + round 7 (R7-6): the action region's own scroll
  // wrapper. flexGrow 0 keeps it at content height in every ordinary
  // alert; flexShrink 0 - Yoga's own default for a View, restored -
  // means it NEVER competes with the message for space (round 6's
  // flexShrink 1 made a long message at a large font scale squeeze a
  // two-button row to a ~25dp sliver, regressing D42's
  // reachable-without-scrolling guarantee); the maxHeight cap is what
  // bounds it instead, so only a genuinely oversized stacked list (the
  // revisit chooser at a large font scale) scrolls within it, while
  // cardScroll absorbs everything else exactly as D42 shipped.
  actionsScroll: { flexGrow: 0, flexShrink: 0, maxHeight: '60%' },
  btn: {
    // CC33 round 6 (J2): spacing.xxxl = 48, the styling law's minimum
    // touch target ("every interactive element >=48dp effective - gym,
    // sweaty hands"), replacing an off-scale 44 literal. Every capability
    // decision the campaign routes through alerts rides on this.
    // Round 8 (J2/J5): shrinkable on the HORIZONTAL axis - a row button
    // narrower than its text wraps the text (no numberOfLines, minHeight
    // not a fixed height), where an unshrinkable one pushed its sibling
    // off the clipped card edge.
    flexShrink: 1,
    minHeight: spacing.xxxl,
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
