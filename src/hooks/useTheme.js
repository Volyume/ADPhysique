/**
 * useTheme — CP-10 (restart-free theming) stage 0's live theme primitive.
 *
 * docs/ux-world-class-audit-2026-07-09/CP-10-restart-free-theming-plan.md
 * section 4: the new primitive is a hook backed by the Zustand slice that
 * already holds the four raw accessibility preferences
 * (`useAppStore`'s `accessibility.theme/largerText/higherContrast/
 * colorBlindSafe` — store/useAppStore.js:1796-1827), returning a memoized
 * derived `{ colors, fontSize, shadow, resolvedTheme, type }` object
 * recomputed only when one of those four preferences changes.
 *
 * Reuses the store's EXISTING accessibility slice rather than introducing a
 * second copy of the same four preferences — there is exactly one source of
 * truth for "what the user asked for", and this hook only adds a derived,
 * reactive READ of it. `resolveTheme()` (src/styles/theme.js) is the same
 * pure function `applyAccessibility()` delegates to for the legacy
 * boot-mutated singletons every unmigrated screen still reads, so the two
 * systems can never resolve to different palettes for the same prefs.
 *
 * Call this from a MIGRATED component/screen instead of importing the
 * static `colors`/`fontSize`/`shadow`/`resolvedTheme`/`type` exports from
 * styles/theme.js directly. Unmigrated files are untouched and keep working
 * exactly as before (coexistence is the point of this stage — see the plan's
 * Stage 1 section).
 *
 * Usage:
 *   import useTheme from '../hooks/useTheme';
 *   const t = useTheme();
 *   // t.colors.surface, t.fontSize.md, t.shadow.card, t.resolvedTheme,
 *   // t.type.body — same shapes as the static exports, live instead of
 *   // frozen at import time.
 */
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { resolveTheme } from '../styles/theme';

export function useTheme() {
  // Select ONLY the four raw preferences that feed resolveTheme(), so this
  // hook re-renders when one of THEM changes and not on every unrelated
  // accessibility.* write (e.g. showFibre/showSodium toggles, energyUnit).
  const prefs = useAppStore(useShallow((s) => ({
    theme: s.accessibility?.theme,
    largerText: s.accessibility?.largerText,
    higherContrast: s.accessibility?.higherContrast,
    colorBlindSafe: s.accessibility?.colorBlindSafe,
  })));

  // Memoized on the four raw values themselves (not the `prefs` object
  // identity, which useShallow already stabilises, but being explicit here
  // means this survives even if that stabilisation ever changes) so a
  // themed-style consumer downstream can memoize on `t` without recomputing
  // on unrelated re-renders (risk register #8 in the CP-10 plan).
  return useMemo(
    () => resolveTheme(prefs),
    // Deliberately the four raw preference VALUES, not `prefs` itself: the
    // object reference already changes only when one of them does (the
    // useShallow selector above), but listing the primitives here is the
    // real reactive contract (resolveTheme only reads these four keys) and
    // survives even if that upstream stabilisation ever changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefs.theme, prefs.largerText, prefs.higherContrast, prefs.colorBlindSafe],
  );
}

export default useTheme;
