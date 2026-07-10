import { SettingsPage } from '../components/SettingsPrimitives';
import DietaryPreferencesEditor from '../components/food/DietaryPreferencesEditor';

// Dietary needs: diet preference, the FSA-14 allergen excludes, and the list
// of individual foods a user has flagged from a meal plan. Split out of
// SettingsProfileScreen (2026-07-09) so the profile screen stays a short
// "about you" page and this owns the food-filtering surface on its own.
//
// The selection UI itself was extracted (founder ask 2026-07-10) into
// DietaryPreferencesEditor (src/components/food/DietaryPreferencesEditor.js)
// so the meal builder's inline dietary sheet can render the exact same
// component -- one source of truth, no duplicated state. This screen now
// supplies only its own chrome (the BackHeader via SettingsPage).
export default function SettingsDietaryScreen() {
  return (
    <SettingsPage title="Dietary needs">
      <DietaryPreferencesEditor />
    </SettingsPage>
  );
}
