import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'BuildWorkoutScreen.js'), 'utf8');

describe('BuildWorkoutScreen travel equipment sheet guard', () => {
  test('uses shared BottomSheet and Chip controls for travel mode equipment', () => {
    expect(source).toMatch(/import BottomSheet from '\.\.\/components\/BottomSheet';/);
    expect(source).toMatch(/import Chip from '\.\.\/components\/Chip';/);
    expect(source).toMatch(
      /<BottomSheet[\s\S]*visible=\{showTravelModal\}[\s\S]*onClose=\{\(\) => setShowTravelModal\(false\)\}[\s\S]*accessibilityLabel="Travel or hotel gym equipment picker"/,
    );
    expect(source).toMatch(
      /<Chip[\s\S]*selected=\{travelEquipment === opt\.id\}[\s\S]*accessibilityRole="radio"[\s\S]*onPress=\{\(\) => setTravelEquipment\(opt\.id\)\}/,
    );
    expect(source).not.toMatch(/styles\.travelOverlay/);
    expect(source).not.toMatch(/styles\.travelOpt[\],)]/);
  });

  test('keeps travel and empty-search actions neutral rather than amber text links', () => {
    expect(source).toMatch(/<Ionicons name="airplane-outline" size=\{15\} color=\{colors\.textSecondary\} \/>/);
    expect(source).toMatch(/travelChip: \{[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface/);
    expect(source).toContain('travelChipText: { ...type.label, color: colors.textPrimary, flex: 1 }');
    expect(source).toContain('pickerEmptyBtnText: { ...type.label, color: colors.textPrimary }');
    expect(source).not.toMatch(/travelChipText: \{[\s\S]*color: colors\.primary/);
  });
});
