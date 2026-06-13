# Phase 1 agent brief — Volyume Ultimate Audit (2026-06-13)

READ-ONLY. Do NOT change any code. You are producing a precise, evidence-grounded
inventory of part of the Volyume React Native app. Another session will build
from this, so accuracy is everything.

## Absolute rules (zero fabrication)
1. Every specific claim (font size, element, route, gate, touch target) MUST cite
   `file:line`. Read the actual file — do not infer from the filename.
2. Font sizes/spacing/radii: resolve the token to its real value by reading
   `src/styles/theme.js` (e.g. if a style uses `fontSize.xl`, look up `xl` and
   report `fontSize.xl (20)` with the theme.js line). Report the px value.
3. If something cannot be determined from the code, write **NOT DETERMINED IN CODE**.
   Never invent, never guess, never "probably".
4. British English. (colour, behaviour, optimise, centre, licence.)
5. Navigation: cite the actual `Stack.Screen`/`Tab.Screen` route registration in
   `src/navigation/RootNavigator.js` (route name + which stack), and where the
   screen pushes to.
6. Gating: state whether the screen is free or Pro, citing the guard
   (`withProGuard`, `useAppStore(s=>s.tier)`, `ProGate`, etc.) with file:line.

## Per-SCREEN block (one per screen, verbatim headings)
```
SCREEN: <name>
WHAT IT IS: <plain terms>
WHAT IS ON IT: <exhaustive list of every element + every piece of info shown>
NAVIGATION: <route name + stack (RootNavigator.js:line); how reached; where it leads>
GATING: <free / Pro, with the guard cited file:line>
CURRENT STRENGTHS: <what works>
CURRENT WEAKNESSES: <cluttered / unclear / missing / oversized — be critical>
NEWBIE QUESTION: <would a first-time gym-goer understand this immediately? why/why not>
ATHLETE QUESTION: <does this satisfy an experienced competitor? why/why not>
LOCATION QUESTION: <is this in the right place in the app? why/why not>
VISUAL + USABILITY:
  - Font size of each text element (token + resolved px + file:line)
  - Touch-target sizes for interactive elements (file:line; flag any < 44px)
  - Information density (how much on screen at once)
  - Clean or cluttered; any oversized/undersized/misaligned element
  - Is the most important action the most prominent element?
  - Small (5.4")/standard (6.1")/large (6.7") behaviour (note fixed sizes that
    won't scale, ScrollView vs fixed, etc.)
```

## Output
Write your section to the path the dispatcher gives you under
`docs/ultimate-audit-2026-06-13/phase1/`. `mkdir -p` first.
Return ONLY a 3-line status: (1) files read in full, (2) screens documented,
(3) any file you could not read or any area you marked NOT DETERMINED.
