/**
 * DayToolsSheet: the Diary's "Day tools" sheet (the options button beside
 * the day pager), moved out of DiaryScreen.js as a named component (D230 R4,
 * 4.1, 4.7). Its rows are the house NavRow in one NavGroup, the anatomy the
 * Coach and Progress doors use (ink tiles, NavRow.js header), so the sheet
 * carries no amber of its own (D230 R2). The title is a heading (D230 R16).
 *
 * Rows, in order (4.1): Trends; Copy from another day; Meals (D230 R11:
 * meals per day and their names); Nutrition targets (D230 R19: the same
 * cross-tab door the no-targets state uses). The caller owns every action;
 * this sheet only lays the doors out.
 */
import { StyleSheet } from 'react-native';
import BottomSheet from '../BottomSheet';
import SectionLabel from '../SectionLabel';
import { NavRow, NavGroup } from '../NavRow';
import { spacing } from '../../styles/theme';

export default function DayToolsSheet({
  visible, onClose, onTrends, onCopyFromDay, onMeals, onNutritionTargets,
}) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      scroll
      accessibilityLabel="Diary tools"
    >
      <SectionLabel heading style={styles.title}>Day tools</SectionLabel>
      <NavGroup>
        <NavRow
          icon="analytics-outline"
          label="Trends"
          sub="Calorie, macro and consistency trends, and your diary export."
          onPress={onTrends}
        />
        <NavRow
          icon="copy-outline"
          label="Copy from another day"
          sub="Choose a recent logged day and copy its foods into this one."
          onPress={onCopyFromDay}
        />
        <NavRow
          icon="restaurant-outline"
          label="Meals"
          sub="How many meals your diary shows, and their names."
          onPress={onMeals}
        />
        <NavRow
          icon="nutrition-outline"
          label="Nutrition targets"
          sub="Your daily calorie, protein, carb and fat targets."
          onPress={onNutritionTargets}
        />
      </NavGroup>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.sm,
  },
});
