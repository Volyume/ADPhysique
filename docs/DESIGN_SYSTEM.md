# Volyume Design System

**Status:** Governing document — approved direction for all future UI work.
**Do not implement visual overhaul yet.** This document governs future decisions.
Use existing theme tokens. Hold custom fonts until tracker is functionally stable.

---

## What Volyume Is Not

- Not a generic AI-generated fitness app
- Not a dark SaaS dashboard template
- Not a gym-bro hype product
- Not a wellness/lifestyle brand
- Not a social-first platform
- Not a supplement company aesthetic
- Not RP Hypertrophy with different colours

Volyume is a serious, private, precision instrument for people who treat training as a craft.

---

## Product Feeling

| Quality | Expression |
|---|---|
| Elite | Nothing decorative that doesn't earn its place |
| Serious | No filler text, no emoji in UI copy, no celebrations for ordinary actions |
| Precise | Numbers are the hero — sized large, legible at a glance |
| Scientific | Explainable recommendations, not magic |
| Premium | Restraint over decoration |
| Fast | Performance is a design value — no heavy effects on Android mid-range |
| Minimalist but not bland | Hierarchy through contrast, not through complexity |
| Bodybuilding-specific | Terminology, defaults, and data models reflect the sport |
| Private and purposeful | No social feed, no leaderboard, no public profiles |

---

## Colour Palette

### Base

| Token | Value | Use |
|---|---|---|
| `background` | `#0A0A0A` | App base — true near-black (current theme uses `#0D0D0D`, align on visual pass) |
| `surface` | `#111111` | Cards, bottom sheets |
| `surface2` | `#1A1A1A` | Input fields, secondary cards |
| `surface3` | `#242424` | Badges, tags, chips |
| `border` | `#2A2A2A` | Dividers, card edges |

### Accent

| Token | Value | Use |
|---|---|---|
| `primary` | `#2979FF` | Primary action only — one accent, used sparingly |
| `primaryBg` | `rgba(41,121,255,0.12)` | Soft accent fills, active chip backgrounds |

### Semantic

| Token | Value | Use |
|---|---|---|
| `success` | `#00C853` | Completion, PRs, volume in optimal range, Finish Workout |
| `successBg` | `rgba(0,200,83,0.12)` | Soft success fills |
| `warning` | `#FFB300` | Near-MRV, caution states |
| `warningBg` | `rgba(255,179,0,0.12)` | Soft warning fills |
| `error` | `#FF3D00` | Over-MRV, destructive actions, crash states |
| `errorBg` | `rgba(255,61,0,0.12)` | Soft error fills |

### Text

| Token | Value | Use |
|---|---|---|
| `textPrimary` | `#F5F5F5` | Headlines, data values |
| `textSecondary` | `#9E9E9E` | Labels, metadata |
| `textMuted` | `#616161` | Placeholders, timestamps, disabled |

### Accent Discipline

The electric blue (`primary`) is the **only** non-achromatic colour in the interface outside semantic states. Use it only on:
- Primary action buttons
- Active navigation states
- Key data values (e.g. PR highlight, volume progress)

Every other surface is achromatic. One accent, used sparingly.

**No decorative gradients.** Gradients are permitted only as functional indicators (e.g. volume bar: green → amber → red). Never as background decoration.

---

## Typography

### Approach

Use the platform system font at Stage 1 (San Francisco on iOS, Roboto on Android).
Do not import custom fonts until the tracker is functionally stable and launch is proven reliable.

**Future consideration (hold until Stage 2+ visual pass):**
- Body/UI: `Inter` — clean, legible, neutral, premium
- Numeric displays: `DM Mono` or `Inter` tabular-nums variant
- Confirm before implementing — custom fonts add startup surface area

### Weight Discipline

| Weight | Usage |
|---|---|
| `900 / Black` | Workout timer, big number displays only |
| `700 / Bold` | Section headers, button labels, exercise names |
| `600 / SemiBold` | Card titles, primary data points |
| `500 / Medium` | Secondary labels, navigation |
| `400 / Regular` | Body copy, metadata |

### Numbers Are Content

Weight values, reps, timers, and set counts are the actual product. Size them larger than you think is needed. A lifter glancing between a bar and their phone must read `120kg × 8` in under one second.

Priority sizing: data value > label > context text.

---

## Surface and Card Style

- **Background:** `surface` token (`#111111`)
- **Border:** `1px` solid `border` token (`#2A2A2A`)
- **Radius:** `12px` (`radius.lg`)
- **No drop shadows** — depth comes from layered backgrounds, not shadows
- **No background blur** — performance cost on mid-range Android
- **Active state:** border shifts to `primary`, background shifts to `#181818`
- **Pressed state:** opacity `0.7` or slight background darken — no bounce/spring animations

---

## Button Style

| Type | Style |
|---|---|
| **Primary** | Filled `primary`, bold white label, `radius.lg`, `paddingVertical: 16px` |
| **Completion** | Filled `success`, bold dark label — Finish Workout, Complete Set variants |
| **Destructive** | Filled `error`, bold white label |
| **Secondary** | Outlined `1.5px` `primary` border, `primary` label |
| **Ghost / Tertiary** | No border, `textSecondary` label, `surface` background |

**COMPLETE SET is always the largest button on the active workout screen.** It is the primary action. All other buttons are visually subordinate.

**Minimum tap target: 48px height** on all interactive elements.

---

## Icon Style

Use `@expo/vector-icons` Ionicons exclusively at Stage 1.

- **Outline variant** → available action, navigation, utility
- **Filled variant** → completed state, active state only

Consistency rule: if an icon appears in two states, outline = available, filled = done/active.

No custom icon sets at Stage 1. If bodybuilding-specific icons are needed later (muscle group diagrams, movement patterns), they should be flat/line style — not illustrated or 3D.

---

## Spacing Tokens

All spacing must use theme tokens. No arbitrary pixel values in screen files.

| Token | Value | Use |
|---|---|---|
| `xs` | 4px | Tight gaps, icon-to-text |
| `sm` | 8px | Between related items |
| `md` | 12px | Default gap |
| `lg` | 16px | Card padding, section gaps |
| `xl` | 24px | Between sections |
| `xxl` | 32px | Major section breaks |
| `xxxl` | 48px | Hero spacing |

---

## Microcopy Tone

**Direct. Precise. No fluff.**

| Avoid | Use instead |
|---|---|
| "You did it! 🎉 Wrap up your session" | "Finish Workout" |
| "Oops! Something went wrong." | "Set not saved — try again" |
| "Log This Set ✓" | "COMPLETE SET" |
| "Great job today!" | (nothing — let the data speak) |
| "Three Sets for 8 to 12 Repetitions" | "3 sets · 8–12 reps" |

Rules:
- Data before description — show the number first
- No motivational filler text in UI copy
- Error messages state the problem plainly
- Celebrations reserved for genuine PRs — executed precisely, not constantly
- No emoji in functional UI copy

---

## App Icon Direction

- **Shape:** Standard rounded square (iOS) / adaptive icon (Android)
- **Concept:** Single strong letterform `V`, or a minimal glyph representing controlled load
- **Background:** `#0A0A0A` (black)
- **Mark:** `#2979FF` (electric blue) — nothing else
- **Feel:** Swiss-style precision. Reference: Bloomberg terminal, not MyFitnessPal
- **Avoid:** Dumbbells, flames, lightning bolts, muscle silhouettes, generic fitness iconography, gradients on the icon

---

## Wordmark / Logo Direction

- `VOLYUME` — geometric sans-serif, slightly wide tracking, all caps
- No tagline on the mark
- Electric blue or white on dark background only
- No logo gradients
- No drop shadow on wordmark

---

## Imagery and Mood (Future Marketing)

- **Photography:** Training environment, controlled lighting, athlete focused — not gym selfie, not supplement ad
- **No stock photography** of generic models smiling in gyms
- **Illustration, if used:** Diagrammatic, anatomical, scientific — muscle group maps, force vectors, not cartoon characters
- **Motion/video:** Slow, deliberate — loading a barbell, chalk, stillness before a heavy lift. Not fast-cut social media energy.

---

## Distinctive Product Principles

1. **Data density without clutter** — more information visible at a glance than competitors, with nothing wasted
2. **Numbers are the hero** — the interface frames data, not the reverse
3. **No gamification noise** — no streaks on fire, no XP bars, no confetti on every set. Celebrations reserved for genuine PRs, executed precisely
4. **Precision tool feeling** — closer to a heart-rate monitor or analytical instrument than a social app
5. **Silence is deliberate** — white space, muted secondary text, and minimal colour usage make primary data legible instantly

---

## Implementation Rules

1. **All colours from theme tokens.** Never hardcode hex values in screen or component files.
2. **All spacing from spacing tokens.** Never hardcode pixel values.
3. **Typography weights from `fontWeight` tokens.** Never use numeric weight values directly.
4. **Check this document before adding any new UI.** If a proposed element conflicts with this system, resolve it at design level before writing code.
5. **No exceptions for "temporary" styles.** Temporary hardcoded values become permanent.

---

## Deferred Until Visual Polish Pass (Stage 2+)

- Custom font (`Inter` / `DM Mono`)
- Background shift from `#0D0D0D` to `#0A0A0A`
- Full theme audit against this palette
- App icon production
- Wordmark production
- Marketing imagery
