import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, type, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import Card from '../components/Card';
import ModalHeader from '../components/ModalHeader';
import ExercisePickerModal from '../components/ExercisePickerModal';
import { appAlert } from '../components/AppAlert';
import { clearExerciseIntent } from '../lib/database';

/**
 * ExerciseConflictSheet — Campaign 9 closeout, items 2 and 3.
 *
 * Two situations, one interaction, because they are the same problem seen
 * from different sides:
 *
 *   mode 'blocked'  a generated plan could not fill a slot, because
 *                   everything valid for it is set aside. The slot is
 *                   EMPTY. Doing nothing leaves it empty; that is honest,
 *                   and better than quietly reinstating an exercise the
 *                   user asked Volyume not to suggest.
 *
 *   mode 'plan'     the user chose a published plan that happens to
 *                   contain something they set aside. The exercise is
 *                   PRESENT. They chose this plan by name, so keeping it
 *                   is legitimate - but so is their earlier instruction,
 *                   and neither may be quietly overruled.
 *
 * THE LAW THIS COMPONENT EXISTS TO KEEP
 *
 * Choosing "Keep it in this plan" does NOT touch the global exclusion. It
 * needs no new state at all: an exclusion governs what Volyume SUGGESTS,
 * and an exercise sitting in a plan the user deliberately picked is not a
 * suggestion. So the exercise stays here, future generation still avoids
 * it, and the swap sheet still hides it. The only thing that clears an
 * exclusion is the user explicitly choosing to allow it again.
 *
 * If the user picks a set-aside exercise as the REPLACEMENT, that
 * contradiction is put to them plainly rather than resolved silently in
 * either direction.
 */
export default function ExerciseConflictSheet({
  visible,
  mode = 'plan',
  conflicts = [],
  userId = null,
  intentState = null,
  onChooseReplacement,
  onKeep,
  onDone,
  onClose,
}) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const [pickerFor, setPickerFor] = useState(null);
  const [resolved, setResolved] = useState({});

  const blocked = mode === 'blocked';
  const remaining = conflicts.filter((c) => !resolved[c.exerciseId]);
  // CC28 (A section 11.8): install-time conflicts now arrive from BOTH
  // lanes. When any capability conflict is present the heading widens;
  // the per-row caption below names each row's own lane, so the two are
  // never conflated (the section 4.4 equipment/exclusion separation
  // pattern applied to copy).
  const hasCapability = conflicts.some((c) => String(c?.reason ?? '').startsWith('capability'));
  const reasonCaption = (c) => {
    const r = String(c?.reason ?? '');
    if (r === 'capability_clinician') return 'You told Volyume a clinician asked you to leave this one out';
    if (r === 'capability_declared') return "Clashes with an injury or limitation you've set";
    if (r === 'capability_unknown') return "Volyume couldn't check this against your limitations yet";
    return null; // the intent lane keeps its existing wording below
  };

  function markResolved(conflict, how) {
    setResolved((prev) => ({ ...prev, [conflict.exerciseId]: how }));
  }

  async function handlePicked(conflict, picked) {
    setPickerFor(null);
    if (!picked?.id) return;
    const stillSetAside = intentState?.intents?.get?.(picked.id) ?? null;
    if (stillSetAside) {
      // The user has picked something they previously set aside. Say so and
      // make them choose; never clear an exclusion as a side effect of a
      // selection made on a conflict screen.
      appAlert(
        `${picked.name} is one you set aside`,
        'Allow Volyume to suggest it again, or pick something else.',
        [
          { text: 'Pick something else', style: 'cancel', onPress: () => setPickerFor(conflict) },
          {
            text: 'Allow again',
            onPress: async () => {
              try { await clearExerciseIntent(userId, picked.id); } catch (_) { /* best effort */ }
              onChooseReplacement?.(conflict, picked);
              markResolved(conflict, 'replaced');
            },
          },
        ],
      );
      return;
    }
    onChooseReplacement?.(conflict, picked);
    markResolved(conflict, 'replaced');
  }

  return (
    <>
      <Modal
        visible={visible && !pickerFor}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
        <SafeAreaView style={[styles.sheet, live.sheet]} edges={['bottom']} accessibilityViewIsModal>
          <ModalHeader
            title={blocked
              ? 'These slots need your choice'
              : hasCapability
                ? 'This plan includes movements to check'
                : 'This plan includes exercises you set aside'}
            onClose={onClose}
          />
          <Text style={[styles.intro, live.intro]}>
            {blocked
              ? 'Everything that would normally fit here is set aside, so Volyume has left these slots empty rather than putting back something you asked it not to suggest.'
              : hasCapability
                ? 'You chose this plan, and some of it clashes with your injuries or limitations, or is set aside. Both facts stand, so each row below is your call.'
                : 'You chose this plan, and Volyume also remembers what you asked it to stop suggesting. Both still stand, so this is your call.'}
          </Text>
          <ScrollView contentContainerStyle={styles.list}>
            {conflicts.map((c) => {
              const state = resolved[c.exerciseId];
              return (
                <Card key={c.exerciseId} radius="md" style={styles.row}>
                  <Text style={[styles.name, live.name]}>{c.exerciseName}</Text>
                  {reasonCaption(c) ? (
                    <Text style={[styles.intro, live.intro]}>{reasonCaption(c)}</Text>
                  ) : null}
                  {c.workoutName ? (
                    <Text style={[styles.where, live.where]}>{c.workoutName}</Text>
                  ) : null}
                  {state ? (
                    <Text style={[styles.done, live.done]}>
                      {state === 'replaced' ? 'Replaced' : 'Kept in this plan'}
                    </Text>
                  ) : (
                    <View style={styles.actions}>
                      <Button
                        title={blocked ? 'Choose an exercise' : 'Choose replacement'}
                        size="sm"
                        style={styles.actionBtn}
                        onPress={() => setPickerFor(c)}
                        accessibilityLabel={`Choose a replacement for ${c.exerciseName}`}
                      />
                      {!blocked && String(c?.reason ?? '') === 'capability_clinician' ? (
                        // Red-team finding 3 (bundle): keeping a row here is
                        // a manual override, and a clinician-reported
                        // restriction cannot be silently overridden (CAP-7).
                        // Same route as the picker's confirm flow: update
                        // the restriction first, then the plan follows.
                        <Button
                          title="Open Injuries & limitations"
                          size="sm"
                          style={styles.actionBtn}
                          variant="secondary"
                          onPress={() => {
                            onClose?.();
                            try {
                              // Lazy: importing the navigator statically
                              // would create an import cycle (navigator ->
                              // screens -> this sheet).
                              // eslint-disable-next-line global-require
                              const { navigationRef } = require('../navigation/RootNavigator');
                              if (navigationRef.isReady()) navigationRef.navigate('HowYouTrain');
                            } catch (_e) { /* best effort */ }
                          }}
                          accessibilityLabel={`Open Injuries & limitations for ${c.exerciseName}`}
                        />
                      ) : !blocked ? (
                        <Button
                          title="Keep it in this plan"
                          size="sm"
                          style={styles.actionBtn}
                          variant="secondary"
                          onPress={() => { onKeep?.(c); markResolved(c, 'kept'); }}
                          accessibilityLabel={`Keep ${c.exerciseName} in this plan`}
                        />
                      ) : null}
                    </View>
                  )}
                </Card>
              );
            })}
          </ScrollView>
          {!blocked ? (
            <Text style={[styles.footnote, live.footnote]}>
              Keeping one here does not change what Volyume suggests elsewhere. It stays out of suggestions until you allow it again under Injuries & limitations.
            </Text>
          ) : null}
          <Button
            title={remaining.length === 0 ? 'Done' : 'Finish later'}
            onPress={onDone}
            style={styles.doneBtn}
            accessibilityLabel={remaining.length === 0 ? 'Done' : 'Finish later'}
          />
        </SafeAreaView>
        </View>
      </Modal>
      <ExercisePickerModal
        visible={!!pickerFor}
        userId={userId}
        buttonLabel="Choose"
        onClose={() => setPickerFor(null)}
        onSelect={(ex) => handlePicked(pickerFor, ex)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // colors.scrim is the app's single backdrop for every dimmed surface.
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
    paddingBottom: spacing.lg,
  },
  intro: { ...type.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  row: { padding: spacing.md, gap: spacing.xs },
  name: { ...type.body, color: colors.textPrimary },
  where: { ...type.captionTight, color: colors.textMuted },
  done: { ...type.captionTight, color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', paddingTop: spacing.xs },
  // Round 17 (J2): the sm button is ~34dp effective with no hitSlop -
  // under the styling law's 48 minimum, on the lane's own install-
  // conflict surface. The floor rides on the buttons themselves so a
  // wrapped row keeps every control at full height.
  actionBtn: { minHeight: spacing.xxxl },
  footnote: { ...type.captionTight, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  // Round 18 (J2): the md button is ~46dp effective (12+22+12) with no
  // hitSlop - 2dp under the styling law's 48 minimum, on the very sheet
  // round 17 floored. Same per-call-site floor as the sm actions above.
  doneBtn: { marginHorizontal: spacing.lg, marginTop: spacing.md, minHeight: spacing.xxxl },
});

function buildLiveStyles(t) {
  return StyleSheet.create({
    sheet: { backgroundColor: t.colors.surface },
    backdrop: { backgroundColor: t.colors.scrim },
    intro: { ...t.type.caption, color: t.colors.textMuted },
    name: { ...t.type.body, color: t.colors.textPrimary },
    where: { ...t.type.captionTight, color: t.colors.textMuted },
    done: { ...t.type.captionTight, color: t.colors.primary },
    footnote: { ...t.type.captionTight, color: t.colors.textMuted },
  });
}
