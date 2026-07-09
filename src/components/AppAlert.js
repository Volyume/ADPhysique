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
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../styles/theme';

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
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onBackdrop}>
      <TouchableOpacity
        style={styles.backdrop}
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
          style={styles.card}
          onPress={() => {}}
          // accessible={false} stops the backdrop's "Close" label from
          // swallowing the card's own content into one opaque node; the
          // title/message/buttons below stay individually reachable.
          // accessibilityViewIsModal traps screen-reader navigation to
          // the dialog while it's open (same pattern as BottomSheet.js).
          accessible={false}
          accessibilityViewIsModal
        >
          {!!title && <Text style={styles.title} accessibilityRole="header">{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}
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
                    isPrimary && styles.btnPrimary,
                    isDestructive && styles.btnDestructive,
                    isCancel && styles.btnCancel,
                  ]}
                >
                  <Text
                    style={[
                      styles.btnText,
                      isPrimary && styles.btnTextPrimary,
                      isDestructive && styles.btnTextDestructive,
                      isCancel && styles.btnTextCancel,
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
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceElevated ?? colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
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
