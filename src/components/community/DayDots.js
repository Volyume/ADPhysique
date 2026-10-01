/**
 * DayDots (communities revamp 2026-09-10: `docs/communities-revamp-
 * 2026-09-10/21-PHASE1-SPEC.md` section 1, "DayDots"; `20-BLUEPRINT.md`
 * section 9 rule 5: "Trained days are seven 6 dp dots on the row's second
 * line").
 *
 * Seven 6 dp dots, Monday first: filled `primary` for a trained day,
 * `border` for not; today gets a 1 dp `primary` ring when it has not been
 * trained yet (spec: "today ringed 1 dp primary when not yet trained").
 * Pure presentation, no text of its own; the whole group collapses to one
 * accessibility node carrying the composed label ("Trained Mon, Wed,
 * Fri"), the same wording `daysLabel` already gives `GymWeekBoard`'s
 * caption line, so the two read identically.
 *
 * Rules obeyed (section 1 preamble; `docs/rules/styling.md`): function
 * component, `useTheme`, tokens only (`circle(6)` for the dots,
 * `spacing.xs` gap, `colors.primary`/`colors.border`, no raw hex/spacing/
 * font-size literals), `StyleSheet.create` at the bottom. `c.primary`
 * appears only for a trained dot's fill and the not-yet-trained-today
 * ring (pinned by `rows.amber.guard.test.js`). Never imports
 * `../../lib/database` (privacy guard, section 6d).
 *
 * Props:
 *   days      string[] of trained day keys ('mon'..'sun', the vocabulary
 *             `src/lib/community/boards.js`'s `trainedDays`/`daysLabel`
 *             already use), any order/subset
 *   todayKey  today's day key in the same vocabulary, or omitted when
 *             there is no "today" to ring (a past week's board)
 *   tone      'accent' (the default, Community's own look, exactly as
 *             above) or 'ink' (D214, Q5 = A: the Progress root and
 *             Consistency draw their seven-day cells through this
 *             component): a trained day is a filled `textSecondary` dot, an
 *             untrained day a HOLLOW ring in `border` (the fact is carried
 *             by shape, not by lightness alone: the two fills were 1.9:1
 *             apart in the dark palette, lane 1 review S1), and today is
 *             ALWAYS marked by a `textPrimary` ring, trained or not (plan
 *             7.1, "today outlined in ink"; the training-days grid marks
 *             today the same way, review S2); a trained today keeps its
 *             fill inside the ring behind a gap of card ground. No amber
 *             anywhere, because on a progress surface a trained day is a
 *             fact, never the thing to do (the plan's rule 3). The dots,
 *             the gaps and the spoken label are the same in both tones.
 *   size      'dot' (the default, 6 dp, Community's row line) or 'cell'
 *             (12 dp with `spacing.sm` gaps: the plan-week card on the
 *             Progress root and Consistency, D214 Q5 = A, where the seven
 *             days are the card's object rather than a row's second line)
 *   initials  false (the default) or true: the weekday initial M T W T F S S
 *             under each dot in `captionTight` (today's in `textPrimary`,
 *             the rest `textMuted`), so a row of cells reads as a week at a
 *             glance. The initials are decoration for sighted readers: the
 *             group's one spoken label is unchanged and they are hidden from
 *             assistive tech.
 */

import { View, Text, StyleSheet } from 'react-native';
import { spacing, colors, circle } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { daysLabel } from '../../lib/community';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_INITIALS = { mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S' };

/**
 * Today's short day key ('mon'..'sun'), the local-device weekday in
 * `boards.js`'s vocabulary. No existing helper produces this form
 * (`dayKey.js` keys by calendar date, not weekday, for a different job);
 * named and kept here since DayDots owns this vocabulary and `PersonRow`
 * (the only other caller that needs "today") already imports from this
 * file.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function currentDayKey(now = new Date()) {
  return WEEKDAY_KEYS[now.getDay()];
}

export default function DayDots({ days, todayKey, tone = 'accent', size = 'dot', initials = false }) {
  const t = useTheme();
  const ink = tone === 'ink';
  const cell = size === 'cell';
  const dotStyle = cell ? styles.cellDot : styles.dot;
  const trainedFill = ink ? t.colors.textSecondary : t.colors.primary;
  const ringColour = ink ? t.colors.textPrimary : t.colors.primary;
  const trained = new Set(Array.isArray(days) ? days : []);
  const label = trained.size
    ? `Trained ${daysLabel(DAY_ORDER.filter((k) => trained.has(k)))}`
    : 'Not trained yet this week';

  return (
    <View
      style={cell ? styles.cellRow : styles.row}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {DAY_ORDER.map((key) => {
        const isTrained = trained.has(key);
        const isToday = key === todayKey;
        // Accent: Community's look, byte for byte (a filled dot, the ring
        // only on a not-yet-trained today). Ink: filled when trained, hollow
        // when not, today always ringed; a trained today is the ring, a gap
        // and the fill inside.
        const ringToday = ink ? isToday : (isToday && !isTrained);
        const inkInnerFill = ink && isToday && isTrained;
        const dot = (
          <View
            key={initials ? undefined : key}
            testID={`day-dot-${key}`}
            style={[
              dotStyle,
              inkInnerFill ? styles.ringWithFill : null,
              {
                backgroundColor: isTrained && !inkInnerFill ? trainedFill : (ink ? 'transparent' : t.colors.border),
                borderColor: ringToday ? ringColour : (ink && !isTrained ? t.colors.border : 'transparent'),
                borderWidth: ringToday || (ink && !isTrained) ? 1 : 0,
              },
            ]}
          >
            {inkInnerFill ? (
              <View
                testID={`day-dot-fill-${key}`}
                style={[cell ? styles.cellInner : styles.dotInner, { backgroundColor: trainedFill }]}
              />
            ) : null}
          </View>
        );
        if (!initials) return dot;
        return (
          <View key={key} style={styles.column} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {dot}
            <Text
              style={[t.type.captionTight, { color: key === todayKey ? t.colors.textPrimary : t.colors.textMuted }]}
              testID={`day-initial-${key}`}
            >
              {DAY_INITIALS[key]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cellRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  column: { alignItems: 'center', gap: spacing.xxs },
  dot: { width: 6, height: 6, borderRadius: circle(6), backgroundColor: colors.border },
  cellDot: { width: 12, height: 12, borderRadius: circle(12), backgroundColor: colors.border },
  // A trained today in the ink tone: the ring, a 1 dp gap of card ground, the fill.
  ringWithFill: { alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 2, height: 2, borderRadius: circle(2) },
  cellInner: { width: 8, height: 8, borderRadius: circle(8) },
});
