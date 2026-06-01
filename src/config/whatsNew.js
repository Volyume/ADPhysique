// What's New items, shown once per release by WhatsNewSheet (mounted in
// RootNavigator). Edit this list each release, then bump SEEN_KEY in
// src/components/WhatsNewSheet.js so the new batch shows exactly once.
//
// Keep it a small batch (about three), each one icon + headline + a single
// line, no marketing voice. List only features that ship in this build.
//
// Provisional copy, pending founder review before the next release: these
// three all have shipping UI on the branch (Frequents in food search, per-side
// logging in the active workout, steps from the platform health source).
export const WHATS_NEW_ITEMS = [
  {
    icon: 'repeat-outline',
    headline: 'Frequents',
    body: 'Your most-logged foods, ready to add in one tap.',
  },
  {
    icon: 'swap-horizontal-outline',
    headline: 'Log left and right',
    body: 'Single-arm and single-leg work can record each side on its own.',
  },
  {
    icon: 'footsteps-outline',
    headline: 'Daily steps',
    body: 'Steps from Apple Health or Health Connect sit alongside your training.',
  },
];
