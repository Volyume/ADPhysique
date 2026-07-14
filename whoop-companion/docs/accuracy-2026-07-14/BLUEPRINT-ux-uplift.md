# VOLYUME Pulse — World-class UX uplift (2026-07-14)

Founder direction: level up the UX to world-class with the best Expo-managed
dependencies (full approval to add them). Constraint: Expo SDK 54 managed
workflow, new architecture, never eject — native modules via config plugins /
autolinking only. Added dependencies (all MIT / Expo-licensed, SDK 54-compatible
via `expo install`): expo-haptics, expo-blur, @shopify/react-native-skia. Each
`src/` edit quotes the normative lines here via `.claude/edit-gate`. Every change
is verified against the GitHub Actions Android APK build (the branch builds green
as a baseline), since native modules cannot be runtime-rendered in this session.

## Change HAP — Tactile feedback layer (`src/ui/haptics.ts` + pressable components)

**Spec (normative):**

- A single haptics helper wraps expo-haptics and fails safe (never throws) so a
  platform without haptics simply does nothing.
- Primary interactive surfaces (cards, tiles, nav rows, the action button and the
  metric dials) trigger a light selection haptic when pressed.

## Change TOK — Design tokens for elevation and motion (`src/ui/theme.ts`)

**Spec (normative):**

- The theme exposes reusable elevation (shadow) presets and motion timing tokens
  so surfaces and animations are consistent across the app.

## Change RING — Premium Skia glow ring (`src/ui/GlowRing.tsx`, hero screens)

**Spec (normative):**

- A Skia-rendered progress ring draws the metric arc with a colour gradient and a
  soft outer glow, animating its sweep from empty to the current value.
- The glow ring replaces the plain SVG ring on the Recovery, Sleep and Strain
  hero cards, keeping the same centre label, value and sub-label.
- When the value is unavailable the ring shows an empty track and the em-dash
  centre, never a fabricated arc.

## Change GLASS — Elevated, pressable surfaces (`src/ui/components.tsx`)

**Spec (normative):**

- Card gains an optional elevated variant with a subtle shadow and a press-scale
  animation for hero surfaces.

(A frosted/blur variant via expo-blur is deferred until it can be verified on a
device render; expo-blur was removed to keep the dependency set to what is used.)

## Verification

`npm run typecheck`, the full Pulse test suite (unchanged logic), and a green
GitHub Actions Android APK build confirming the native modules link. British
English; commits carry no attribution.
