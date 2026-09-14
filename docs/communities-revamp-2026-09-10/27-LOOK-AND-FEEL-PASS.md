# 27 — LOOK AND FEEL PASS: Community rejoins the app (lead, 2026-09-14)

Authority: founder, in chat 2026-09-14, on two live Android screenshots of
the Community Hub and a profile: "I looks shit. Look at the alignment of
the lines and the graph which isn't even under what it I think is meant",
then "Do some proper quality look and feel work on the entire function.
The whole thing is it is meant to jot look AI and is meant to look like.
The rest of the app. It looks ruvvish". Ruled by the lead under D33
(CR-17; register D163). Evidence: a read-only audit of every Community
surface against the non-Community screens, `20-BLUEPRINT.md` section 9,
and `src/__tests__/community.presentation.guard.test.js`.

## 1. What was actually wrong

The founder was right twice over, and the second point is the cause of the
first. Community had drifted into a visual language of its own, and then
implemented it only halfway, so it read as neither this app nor a coherent
alternative.

**A. Two competing left edges on every screen.** The house rule, on every
non-Community screen, is that the scroll container pays the gutter ONCE
(`padding: spacing.lg`, e.g. `HomeScreen.js` `content`, `PlansScreen.js`
`content`, `SettingsPrimitives.js` `content`) and nothing inside it pays
again. Community's pages paid it, and then `PersonRow`, `CohortRow` and
`ActivityItemRow` each paid it a SECOND time, so avatars sat at 32 dp
while the eyebrow directly above them sat at 16 dp. Four text edges
existed on the Hub at once.

**B. The wireframe divider.** All three rows drew a separate hairline in
`colors.border`, the bright control-edge grey, INSET past the avatar.
`src/components/SettingsPrimitives.js` names this exact mistake in its own
comment: a `border` rule between rows "drew a bright grey outline around
every group and a bright rule between every row. That is the wireframe
look." The app draws separators in `borderSubtle`, spanning the
container. `CohortRow`'s inset was worse still: computed from the number
of sample avatars, so two neighbouring cohort rows drew their lines up to
56 dp apart.

**C. The eight-week bars belonged to nothing.** `ProgressStrip` centred a
row of fixed 10 dp columns under a three-cell flex row, so eight weeks of
history sat under the MIDDLE cell and read as "weeks streak"'s chart. A
zero week drew at `hairlineWidth` in `borderSubtle` on a `surface2`
ground: invisible, so eight weeks showed as five bars.

**D. A 24 dp avatar was a blob.** `ProfileAvatarMark` floored both its
glyph and its preset badge at 20 dp, so a 24 dp avatar in a cohort stack
drew a 20 dp glyph AND a 20 dp badge inside a 24 dp disc with a 2 dp ring.

**E. First load changed shape.** Every Community list used the shared
`SkeletonRow`: a 36 dp SQUARE at radius 6 behind 8 dp of its own padding,
text column at 56. The real row is a 32 dp circle with its text at 44. So
every screen jumped sideways the moment data landed.

**F. Sections were not siblings.** The Hub's PEOPLE section ended in a
bare "Find people" text row that read as a second heading, while GROUPS
carried its action in the eyebrow; the Hub's last eyebrow had the header's
own `marginBottom` stacked under it, so ACTIVITY sat 20 dp above its
content while PEOPLE and GROUPS sat 8.

**G. A section with nothing in it was a poster.** An empty ACTIVITY
rendered the shared `EmptyState`: a bordered box, a 52 dp amber circle, a
title, a paragraph and a "Find people" button repeating the row two
sections above it. Blueprint rule 9 says one line and one action.

## 2. The house rules Community now follows

Taken from the non-Community screens, stated so a future change can be
checked against them (guarded by `src/__tests__/community.layout.guard.test.js`).

1. **One gutter, paid once, by the page.** `spacing.lg` on the scroll
   container. A row carries no horizontal padding of its own. A row that
   needs to bleed (the reader's own tinted row) uses a negative margin of
   exactly the gutter and pays it back as padding, so its content stays on
   the one left edge.
2. **Separators are `borderSubtle` hairlines spanning the row.** Never
   `border`, never inset past a leading glyph, never a variable inset.
3. **A skeleton stands in the true shape of the row it replaces.**
   Community uses `SkeletonPersonRow` (32 dp circle, text at 44, no
   gutter), not the shared 36 dp square.
4. **A mark scales.** A glyph or badge floor that does not scale turns a
   small avatar into a blob; the preset badge is a picker affordance and
   renders only at 40 dp and above, or when selected or editable.
5. **Sections are siblings.** Every section is an eyebrow, and a section's
   one action is the eyebrow's trailing action, never a loose row beneath
   it. No container adds rhythm on top of the eyebrow's own.
6. **An empty SECTION is one quiet line; an empty SCREEN keeps the house
   `EmptyState`.** This is the lead's ruling on the one fork the audit
   refused to decide (below).
7. **A chart is named and spans its block.** The eight-week bars are a
   footer band of the whole strip: a hairline above, a "Last 8 weeks"
   caption, eight equal columns edge to edge, a visible 2 dp floor for a
   zero week, and an accessibility label that says the bars are there.
8. **The app's own words.** The strip says "weeks in a row", which is what
   the Hub's own You line calls the same figure, and spells its windows
   out ("consistent in 12 weeks", "PRs in 4 weeks") instead of "(12w)".

## 3. The one fork, ruled

The audit stopped rather than interpret, correctly: blueprint rule 9 ("one
line and one action, never a paragraph") and the shared `EmptyState`
primitive cannot both be satisfied, and the primitive is the house
component on about 40 non-Community screens.

**RULED (CR-17):** the shared `EmptyState` stays, unchanged, for a
SCREEN-level empty: the screen has nothing else on it, or the state is an
error, an offline read, a private profile or a blocked person, all of
which carry a retry or an explanation. A SECTION-level empty, inside a
screen that has other content, is one quiet `bodySm` `textMuted` line with
no control of its own. Rationale: the founder's instruction is that
Community must look like the rest of the app, so the primitive is not
Community's to redefine; and a bordered poster inside a populated list is
exactly what made the Hub look generic. Neither the primitive nor its 40
call sites outside Community were touched.

## 4. Not done, and why

- **People still render as cards on the remaining Community surfaces**
  (Find people, People list, Followers, Connections, Search, Activity,
  Conversations) through wrapper components the `<Card` grep in the
  presentation guard cannot see. Converting them to the flat row language
  runs as its own lane; it is presentation only and touches no behaviour.
- **`SectionLabel` still heads eleven Community screens** while the four
  revamped ones use `Eyebrow`, which is one font weight lighter than the
  app's own heading. That is a law-vs-house conflict in blueprint rule 3
  and needs one decision for the whole product, not a patch per screen.
- **The presentation guard covers three of ten rules on four of
  twenty-four screens.** The new layout guard covers the rules in section
  2 above; rules 4, 6, 7, 8 and 10 of the blueprint remain unguarded.

## 5. Device checklist (Android EAS build from main)

1. Community > Hub: every avatar, every eyebrow and every line of copy
   starts on ONE left edge down the whole screen. Expect no step in or out
   at any row.
2. The You row is a tinted band reaching both screen edges, with its
   avatar on that same left edge, and no hairline inside it.
3. The cohort row's hairline runs the full width of the content, in the
   same faint grey the settings rows use, with no inset.
4. Volt Gym row: the small avatars read as people, not discs.
5. Pull to refresh: the placeholder rows are the same shape as the rows
   that replace them. Expect no sideways jump.
6. PEOPLE and GROUPS both carry their action in the heading ("Find
   people", "New group"); there is no loose "Find people" row.
7. With nothing followed, ACTIVITY is one quiet line, not a box.
8. Your own profile: the name, handle and the two fact lines all start on
   one left edge beside the avatar. The strip's eight bars span the whole
   strip under a "Last 8 weeks" caption, with eight bars visible even in a
   quiet eight weeks.
ED-safety: nothing here reads or writes weight, food or notifications; the
consistency gate, the calm-mode and ED withholds and the minor rules are
untouched.
