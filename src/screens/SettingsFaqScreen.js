import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { SettingsPage } from '../components/SettingsPrimitives';
import CollapsibleSection from '../components/CollapsibleSection';

// CP-9 (design-usability audit 2026-07-09, coverage-06-competitive-hps.md;
// ruled D16 in docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md):
// "Help & FAQ" was entirely missing from Settings > About - no FAQ, no help
// path, while every competitor (Hevy, MyFitnessPal, Cronometer) carries one.
// This is a static, offline, copy-only trust surface, the same idiom as
// MethodologyScreen: no data dependencies, no personalised state, so it
// renders identically for every user. Every answer is written tier-neutral
// (it never describes a Pro feature as something the reader already has),
// since Help must stay reachable from Free.
//
// Every claim in FAQS is verified against the live code before being
// written; see the FAQ build notes for the file/line checked per entry.
// Reuses the app's existing collapsible idiom (CollapsibleSection, lifted
// out of MethodologyScreen) rather than inventing a new one. Multiple
// entries can be open at once, matching MethodologyScreen's openKeys shape.
export const FAQS = [
  {
    key: 'first-plan',
    q: 'How do I get my first training plan?',
    a: 'Answer a few quick questions about your experience, training days, equipment and goal, and Volyume builds a starting plan for you. If you would rather build your own from scratch, use the Plan Library or the manual builder instead. Either way, you can start logging straight away.',
  },
  {
    key: 'log-workout',
    q: 'How do I log a workout?',
    a: 'Start a session from Home, then log each set as you go: weight, reps, and done. You can tap any logged set afterwards to edit or delete it, so a mistyped number is never stuck. Your personal records and progress stats update automatically from what you log.',
  },
  {
    key: 'rest-timer',
    q: 'How does the rest timer work?',
    a: 'The rest timer starts on its own after you log a set, counting down to your chosen rest period. You can adjust it by 15 seconds either way or skip it outright. Set your own default rest time, and switch auto-start on or off, from Settings > Workout & units.',
  },
  {
    key: 'weekly-coach',
    q: 'How does Precision Coaching decide what changes each week?',
    a: 'Precision Coaching follows clear, fixed rules, never a guess. Each week it reads your logged training, your weight trend, your food data if you use the food diary, and your weekly check-in answers, then decides what should change, what should hold, and explains why. A held week is Precision Coaching working, not doing nothing. "How Precision Coaching works" has the full explanation, reachable from any coaching decision.',
  },
  {
    key: 'free-vs-pro',
    q: "What's free, and what needs Pro?",
    a: 'Free covers the Plan Library, the workout builder, workout logging, the exercise library, personal records and progress stats. Pro adds everything nutrition and coaching related: the food diary, barcode and label scanning, meal suggestions, calorie and macro targets, cardio logging, weekly check-ins, Precision Coaching, and division-style plans.',
  },
  {
    key: 'food-diary',
    q: 'How do I use the food diary, and mark meals as eaten?',
    a: "Log food by searching, scanning a barcode, or adding your own foods and meals. If you've built a meal plan, tick each planned meal off as you eat it, or mark everything eaten at once from the bottom of the day. Either way works; pick whichever fits how your day goes.",
  },
  {
    key: 'dietary-needs',
    q: 'Can Volyume work around allergies or foods I want to avoid?',
    a: 'Yes. Set your diet type and the FSA allergen categories you need to avoid in Settings > Dietary needs, and every suggestion respects them. If a specific food keeps turning up in a meal plan you do not want, choose "never show this again" on it directly, and it is added to your avoid list from then on.',
  },
  {
    key: 'barcode-scan',
    q: 'How does barcode and label scanning work?',
    a: "Point the camera at a barcode to look it up automatically, or scan a nutrition label when there's no barcode or the lookup misses. A miss on the barcode scan hands you straight into the label scan with the barcode already filled in, so you are not starting over.",
  },
  {
    key: 'photo-privacy',
    q: 'Are my progress photos private?',
    a: "Yes. Progress photos are private on this device: they are never uploaded anywhere. A full data backup includes your photo metadata but not the image files themselves, so photos only ever leave your device if you choose to share or export them yourself.",
  },
  {
    key: 'data-privacy',
    q: 'Where is my data stored, and can I export or back it up?',
    a: 'Your data lives on your device first, and syncs to a European (Dublin) server so it follows you across devices. From Settings > Your data you can export your workout log as a CSV, create a full backup file, or restore a safety snapshot from before a recent app update.',
  },
  {
    key: 'delete-account',
    q: 'How do I delete my account?',
    a: 'Go to Settings > Account > Delete account. This permanently removes your account and app data, both on your device and in the cloud, and cannot be undone.',
  },
  {
    key: 'subscription',
    q: 'How do I manage my subscription or restore a purchase?',
    a: 'Open Settings > Account > Subscription to see your plan, manage billing, or restore a previous purchase if a new device or a reinstall does not show your Pro access straight away.',
  },
  {
    key: 'notifications',
    q: 'How do notifications and quiet hours work?',
    a: 'Volyume can remind you about training, meals and weekly check-ins; choose what you want from Settings > Notifications and reminders. Quiet hours set a window where none of these land, whatever else is due.',
  },
  {
    key: 'widgets',
    q: 'Are there home screen widgets?',
    a: 'Yes. Volyume offers widgets for your next session and this week\'s consistency, plus a lock screen widget on iOS. See Settings > Home screen widget for exact add-to-home-screen steps for your device.',
  },
  {
    key: 'app-lock',
    q: 'Can I lock the app with Face ID or a fingerprint?',
    a: "Yes, if you want an extra layer on a shared or borrowed phone. Turn on App lock in Settings > Privacy and Volyume asks for your device's Face ID, fingerprint or passcode every time you open it or return to it. It's off by default and needs a biometric or passcode already set up on your device.",
  },
  {
    key: 'calmer-coaching',
    q: 'Can I make the coaching feel gentler?',
    a: 'Yes. Turn on Calmer coaching in Settings > Coaching for safer calorie floors and quieter progress prompts. It sits alongside the safety checks Precision Coaching always runs, and you can turn it off again any time.',
  },
];

export default function SettingsFaqScreen() {
  const [openKeys, setOpenKeys] = useState({});
  const toggle = (key) => setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  // CP-10 batch F (2026-07-11): live theme (src/hooks/useTheme.js). This
  // screen renders its FAQ list via .map() inside a plain ScrollView
  // (SettingsPage's own chrome, no FlatList/FlashList/SectionList), so an
  // unmemoised call matches AddCustomFoodScreen's/MealPlanScreen's own
  // precedent (batch D/E).
  const t = useTheme();
  const live = buildLiveStyles(t);

  return (
    <SettingsPage title="Help & FAQ">
      <Text style={[styles.intro, live.intro]}>
        Answers to what people ask most. Nothing here needs a connection, and it works the same whether you are on Free or Pro.
      </Text>
      <View style={styles.list}>
        {FAQS.map((item) => (
          <CollapsibleSection
            key={item.key}
            title={item.q}
            body={item.a}
            open={!!openKeys[item.key]}
            onToggle={() => toggle(item.key)}
          />
        ))}
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  intro: { ...type.body, color: colors.textPrimary, lineHeight: 22, marginBottom: spacing.md },
  list: { gap: spacing.sm },
});

// CP-10 batch F (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values. `list`
// is a pure layout key (gap only, no token) and is correctly omitted -- there
// is nothing to unfreeze for it. Same pattern as AddCustomFoodScreen.js's
// buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    intro: { ...t.type.body, color: t.colors.textPrimary },
  };
}
