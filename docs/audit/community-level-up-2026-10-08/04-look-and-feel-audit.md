# 04: Community look and feel audit (read-only, 2026-10-08)

Authority: founder order 2026-10-08, verbatim: "a serious improvement of the look, feel and design in line with the best loggers out there but also in our own theme look and feel of all other areas of the app."

Method and labels. OBSERVED = read in source at HEAD or grepped (file:line given). INFERRED = a conclusion from observed code, not a rendered pixel. No screenshot of HEAD was taken (no render mechanism; `01-current-picture.md` 5.5), so every "looks like" statement is INFERRED. Competitor visuals are UNVERIFIED (`02-competitors.md` header). Screen scorecard rows marked (grep) were classified by import and JSX counts plus targeted reads, not read end to end.

Inputs read: `01-current-picture.md` section 5; `02-competitors.md` 2c; `docs/rules/styling.md`; `src/styles/theme.js` (tokens); `src/styles/layout.js`; `12-BUILD-SPEC.md` section 2 (visual spec); D220 and D163 and D188 in `DECISIONS-2026-07-09.md`; `docs/communities-revamp-2026-09-10/27-LOOK-AND-FEEL-PASS.md` and `20-BLUEPRINT.md` section 9 (CR-09 presentation law); `src/components/workout/session/*` (ExerciseSection, SessionHeader, SetTable); all `src/components/community/*` headers or bodies for the row, post and identity components; `src/screens/Community*.js` by grep and targeted read. `11-boostcamp-study.md` was not opened; the near-black grammar is taken from the build spec (it names the study as source).

---

## 0. Headline findings (all OBSERVED unless marked)

1. **Three grammars live in the app, not two.** (a) Cards on the page: Today `HomeScreen.js` (6 `Card`/`PressableCard` uses, 4 `SectionLabel`), Train `PlansScreen.js` (8 and 2), Nutrition `DiaryScreen.js` (1 and 4). (b) Near-black full-bleed bands: the logger (`ExerciseSection.js:219` `section: { backgroundColor: t.colors.surface }`, `:359` `marginTop: BAND` with `BAND = 10` at `:66`; `SessionHeader.js:33` `wrap: { backgroundColor: t.colors.surface }`). (c) Flat rows straight on `colors.background`: Community Hub, Dimension, Group, Profile (`Eyebrow` imported by exactly those four). A fourth, old form-and-card grammar covers 11 Community screens (`SectionLabel` + `Card`). So Community is the only area in the app that is neither cards nor bands. INFERRED consequence: the founder's "look and feel of all other areas of the app" has two valid targets (card tabs, band logger) and Community currently matches neither.
2. **The feed post has two anatomies.** The feed row is `ActivityItemRow.js` (flat, heart glyph, no card). The detail screen and the Compose preview render `PostCard.js` (a `Card`, thumbs-up glyph with the word "Respect N", different amber rules). `CommunityPostScreen.js:234`, `CommunityComposeScreen.js:261`.
3. **D188 (origin-aware transition for Community) is recorded as ruled but is not in the code at HEAD.** `grep -rln "__heroOrigin\|onPressWithLayout" src` returns only `PressableCard.js`, `Card.js`, `RootNavigator.js`, `LiftProgressScreen.js`, `ExerciseDetailScreen.js` and one test. No `src/components/community/*` or `src/screens/Community*.js` file passes `onPressWithLayout` or reads `__heroOrigin`, and the 25 Community registrations (`RootNavigator.js:505-530` and following) are plain `options={{ headerShown: false }}`; `heroZoomOptions` is used only for `ExerciseDetail` (`:555`, `:600`). The D188 text says "A guard pins every threaded call site" (`DECISIONS...md` ~8880); no such guard was found by this grep. Either it was never built or it was reverted; this audit does not know which (INFERRED).
4. **The Hub has no compose door once you are joined and have posts.** `CommunityCompose` is navigated to from `CommunityHubScreen.js` only inside the empty ACTIVITY line ("Say hello", Hub ~`:828-841`), from `CommunityProfileScreen.js:574` (empty-state), `CommunityGroupScreen.js:182`, and `WorkoutSummaryScreen.js:1390,1735,1739` (grep `'CommunityCompose'`). Posting a note is therefore invisible to anyone whose feed is not empty (OBSERVED by grep; the product consequence is INFERRED).
5. **Nine list screens still show the 36 dp square skeleton D163 item 5 says was fixed.** `SkeletonRow` (shared) at Followers `:135`, Connections `:146`, Conversations `:115`, Search `:120`, PeopleList `:228`, FindPeople `:222`, Activity `:245`, Board `:221`, GroupMembers `:192`; they render `PersonRow` (32 dp circle). Only Hub, Dimension, Group, Profile use `SkeletonPersonRow`. First load jumps sideways on those nine (INFERRED from D163 item 5's own diagnosis, same mismatch).
6. **The Hub header carries five circular controls.** Avatar 30 dp (`Hub:~490-497`), search, activity, messages, privacy at 34 dp (`Hub:905-906` `headerBtn`), each with an amber (`colors.primary`) glyph on `surface2` with a `colors.border` rim (`Hub:502,512,526,551`). `20-BLUEPRINT.md` section 9 describes three right glyphs and lists amber's sanctioned uses (rule 7: ring dot, given Respect, PR mark, selected chip, one emphatic button); a permanently amber header glyph is not on that list. Five controls plus a centred title in a `BackHeader` (side slot width `touchTarget.minimum` = 48, `BackHeader.js:35`, right slot `minWidth` only, `:100`): the right group is about 198 dp wide (30 + 4 x 34 + 4 x 8), so on a 360 dp phone it will push into the centred title (INFERRED arithmetic; not rendered).
7. **`Eyebrow` is not a heading to a screen reader.** `Eyebrow.js` has no `accessibilityRole="header"` (grep empty), whereas `SectionLabel` supports it via a `heading` prop (`SectionLabel.js:25`). Section navigation by headings is unavailable on the four screens that use `Eyebrow`.

---

## 1. Per-screen scorecard

Legend. Grammar: F = flat rows on `background` (Eyebrow); C = Card + SectionLabel form/card; M = mixed. Severity vs the founder order: H = visibly off-house or defective, M = noticeable drift, L = minor.

| Screen (file) | Grammar | Deviations (evidence) | Sev |
|---|---|---|---|
| Hub `CommunityHubScreen.js` | F | `BackHeader` with 5 round controls, amber glyphs (`:502-560`, styles `:899-906`). Legacy "Partner invites" `Card` (`:601`) and not-joined hero `Card` (`:647`) with `h3` (`:650`). `statusNotice` is a bordered box (`:564,586`, style `:893-895`, `borderRadius: radius.lg`). No compose door (finding 4). ACTIVITY has no time stamp for 4 of 5 kinds (section 2, ActivityItemRow). Empty is one muted line (good, `:818-845`); failure uses `EmptyState` (`:802`, correct per D163 6). Initial load: 3 `SkeletonPersonRow` (`:795-797`) for a feed whose rows are 2-3 lines tall. | H |
| Dimension `CommunityDimensionScreen.js` (801 lines) | F | Eyebrow at `:625`; `SkeletonPersonRow` (`:631`); a `ModalHeader` report modal (`:220`). Largest screen; not read end to end (grep). | L |
| Group `CommunityGroupScreen.js` | F | Eyebrows (`:469,494`), `PersonRow`, `ActivityItemRow` (`:395`), `SkeletonPersonRow` (`:350-388`). Three-dots glyph 22 dp (`:297`) vs Profile's 18 dp (`CommunityProfileScreen.js:297`). | L |
| Profile `CommunityProfileScreen.js` | F | Hero avatar 56 (`:307`), `ProgressStrip` on `surface2` with `radius.lg` (`ProgressStrip.js:113,132`) is a card inside a flat page. Six `EmptyState`s (`:507-542`, screen-level, allowed). `ModalHeader` modal (`:643`). Eyebrow ACTIVITY `:478`. | M |
| Post detail `CommunityPostScreen.js` | M | `PostCard` (a `Card`, `:234`) above `SectionLabel` Comments (`:245`); `SkeletonCard`/`SkeletonRow` (`:276-278`) not the person skeleton. Different thumbs-up/"Respect N" affordance from the feed's heart. | H |
| Compose `CommunityComposeScreen.js` | C | Preview via `PostCard` (`:261`), `SectionLabel`s (`:259,267,290`), `ComposerInput` on `surface2` (TextField), `Chip`s for audience, one `variant="emphatic"` Post button (`:312`). Form grammar of the older app; no well/hairline treatment from the logger. | M |
| Join `CommunityJoinScreen.js` (734) | C | 7 `SectionLabel` (`:403-595`), `Card` rows for gyms (`:465,500`) and preview (`:600`), `Card surface2` block (`:685`). Onboarding form; no Eyebrow. | M |
| Edit profile `CommunityEditProfileScreen.js` (672) | C | 9 `SectionLabel`, 3 `Card` (`:491,526,582`). Same as Join. | M |
| Training profile `CommunityTrainingProfileScreen.js` | C | `Card` preview (`:354`) with nested `SectionLabel` (`:355`), `SectionLabel`s (`:362,445,452`). | M |
| Privacy `CommunityPrivacyScreen.js` | C | `SectionLabel` x4 (`:230,255,319,350`); `PrivacyReceipt` card. | L |
| Rules `CommunityRulesScreen.js` | C | `Card`s (`:222,232,257`), `SectionLabel` (`:271-303`). Long-form reading; cards acceptable. | L |
| Moderation `CommunityModerationScreen.js` | C | `Card` per report (`:325,387,450`); staff surface. | L |
| Gym add `CommunityGymAddScreen.js` | C | `Card` form (`:107`). | L |
| Group create `CommunityGroupCreateScreen.js` | C | `SectionLabel` (`:116`); short form. | L |
| Group members `CommunityGroupMembersScreen.js` | M | `SectionLabel` Members in list header (`:230`) while Group page uses Eyebrow for the same list; `SkeletonRow` (`:192`); `EmptyState` with empty `text=""` (`:209`). | M |
| Board `CommunityBoardScreen.js` | M | Ranked `PersonRow`s under `SectionLabel` (`:179`); `SkeletonRow` (`:221`); `EmptyState` (`:228,239`). | M |
| Activity (inbox) `CommunityActivityScreen.js` | M | Three `SectionLabel`s (`:186,203,239`) over flat rows; `SkeletonRow` (`:245`). | M |
| Find people `CommunityFindPeopleScreen.js` | F-ish (grep) | `SkeletonRow` x5 (`:222`); `EmptyState` (`:225`); no Eyebrow. | M |
| People list `CommunityPeopleListScreen.js` | F-ish (grep) | `SkeletonRow` (`:228`); three `EmptyState`s (`:234,245,254`). | M |
| Search `CommunitySearchScreen.js` | F-ish (grep) | `SkeletonRow` (`:120`); four `EmptyState`s (`:126-173`). | M |
| Followers `CommunityFollowersScreen.js` | F-ish (grep) | `SkeletonRow` (`:135`); `EmptyState` x2 (`:141,150`). | M |
| Connections `CommunityConnectionsScreen.js` | F-ish (grep) | `SkeletonRow` (`:146`); `EmptyState` x2. | M |
| Conversations `CommunityConversationsScreen.js` | F-ish (grep) | `SkeletonRow` (`:115`); `EmptyState` x2 (`:121,130`); `ConversationRow` 64 dp with unread dot. | M |
| Conversation `CommunityConversationScreen.js` | bespoke | Bubble skeletons (`:452-455`) in the true shape (good); `MessageBubble` on `surface`/`surfaceElevated` with `radius.lg` (`MessageBubble.js:136,159`). | L |
| Join/browse states | - | Not-joined hero is the only `h3` and the only primary-coloured CTA card on the Hub (`:647-681`). | L |

Counts that matter (OBSERVED, import plus JSX): `SectionLabel` heads 11 screens, `Eyebrow` heads 4; 21 of 24 screens import `EmptyState`; 9 screens use the wrong skeleton; 4 use the right one.

Comparison with the main tabs (OBSERVED headers, grep): Today, Train, Nutrition use `ScreenHeader` with an `h1` page title (`HomeScreen.js:2588`, `PlansScreen.js:1241`, `DiaryScreen.js:1450`); Today carries the Community entry as `CommunityHeaderAction` (a `people-outline` amber glyph with the word "Community", `CommunityHeaderAction.js:40,61`). Community itself uses `BackHeader` (centred `title` 17). That is correct for a pushed screen but means Community has no page-title weight of its own.

| Does the tab do this | Today/Train/Nutrition | Community | Verdict |
|---|---|---|---|
| Page title as `h1` in `ScreenHeader` | yes | no (`BackHeader` title) | acceptable (pushed screen) |
| Content in `Card`s on `background` | yes | no (flat rows) | Community differs |
| Full-bleed `surface` bands | no | no | only the logger |
| `SkeletonCard`/`SkeletonRow` in true slots | yes (`styling.md`) | partly (`SkeletonPersonRow` on 4 screens, 9 wrong) | gap |
| `AnimatedEntrance` for first paint | Nutrition yes (`DiaryScreen.js` 1 use) | Hub only (`Hub:562`) | gap on 23 screens |
| Pull-to-refresh | yes | yes on lists | ok |
| `type.num` tabular figures | yes | `ActivityItemRow:206`, `PersonRow` metric, `ProgressStrip:51` | partial (feed counts are `caption`, not `num`) |
| Single emphatic CTA | yes | Post, Create profile, Accept rules | ok |
| Progress tab (`ProgressStack`, `RootNavigator.js:579`) | Not opened in this audit; no grammar claim made. | - | - |

---

## 2. Component inventory (39 files in `src/components/community/`; consumer counts by import grep, tests excluded)

Rows and identity
| Component | Consumers | What it is | Keep / unify / retire |
|---|---|---|---|
| `ActivityItemRow.js` | 4 screens | Feed row: avatar 32 + ring dot, name plus headline, `num('label')` figures, note, trailing heart + count, comment glyph only if >0, hairline. `minHeight: 64`. | KEEP as the single post row; UNIFY PostCard into it (below). Add time, 48 dp targets. |
| `PostCard.js` | 3 (Post, Compose, siblings) | Card: avatar 32, name, `@handle - day`, eyebrow, hero, facts, line, caption, thumbs-up "Respect N", comment glyph, optional Message. | UNIFY: retire the Card shell; keep `postDayLabel` (`:61`), `bodyForKind` content, Message action. Its CR-09 blueprint note says "PostCard stays for the detail header until phase 3 retires it" (`ActivityItemRow.js` header). |
| `PersonRow.js` | 4 screens + `ProfileCard` | 64 dp, avatar 32, name `bodyStrong`, DayDots or caption, metric `num`, `trailing`, hairline. | KEEP. Tokens to promote into the law. |
| `CohortRow.js`, `GroupRow.js` | 1 and 2 | Avatar stack 24 + name + line. | KEEP; fold the stack and chevron treatment into the law. |
| `ProfileCard.js` | 7 screens | Composes a person for `PersonRow`. | KEEP (wrapper). |
| `ConversationRow.js`, `ConnectRequestRow.js`, `ActivityRow.js`, `CommentRow.js` | 1 each | Specialised rows, 64 dp where seen (`ConversationRow:108`). `CommentRow` avatar 32. | KEEP; audit them against the new row anatomy. |
| `AvatarStack.js` | via CohortRow/GroupRow | 24 dp avatars overlapping by `spacing.sm` (8) so `size - 8` pitch = 16 (`AvatarStack.js:30-33,51`), max 3, "+N". | KEEP. |
| `DayDots.js` | PersonRow | 6 dp dots (`:152`), 12 dp cell variant (`:153`), `border`-coloured empty dots. | KEEP; the 6 dp dot is decoration with an accessibility label on the row, acceptable. |
| `ProgressStrip.js` | Profile | `surface2` card, `radius.lg`, eight-week bars (`:113,132`). | UNIFY: becomes a band section (no radius) in the band directions. |
| `SkeletonPersonRow.js` | 4 screens | 32 dp circle, text at 44, no gutter. | KEEP and ADOPT on the other nine screens; add a `SkeletonPostRow` for the feed. |

Chrome, sheets, inputs
| Component | Consumers | Note | Verdict |
|---|---|---|---|
| `Eyebrow.js` | 4 screens | `type.caption` + `letterSpacing.overline`, uppercase, `textMuted` (`:55-77`); `paddingTop: spacing.xl`, `paddingBottom: spacing.sm`; trailing action `type.label` `textSecondary`, hitSlop 12. No header role. | UNIFY with `SectionLabel` into one section header (11 vs 4 screens, D163 item 9 left this open). |
| `CommunityHeaderAction.js` | 1 (Today) | Amber `people-outline` plus word, unread dot/badge. | KEEP. |
| `MenuSheet`, `ProfileMenuSheet`, `ReportSheet`, `ConnectSheet`, `SessionSheet`, `GroupInviteSheet`, `PeopleFiltersSheet`, `GymDetailSheet` | 1-5 | `BottomSheet` family. | KEEP (shared primitive). |
| `ComposerInput.js` | 3 | `TextField` multiline on `surface2`. | UNIFY to the logger "well" (fill `background`, 1 dp `borderSubtle`, `radius.md`) in band directions. |
| `MessageBubble.js`, `MessageComposer.js` | 1 each | Bubbles `radius.lg`, composer. | KEEP; leave chat grammar alone in every direction. |
| `PrivacyReceipt.js` | 4 | Card summarising what is shown. | KEEP; it is a trust surface. |
| `JoinToInteractRow`, `RespectAllRow`, `TrainingProfileLine`, `GymSummary`, `GymPicker`, `PlacePicker`, `FollowButton`, `ConnectButton` | 1-3 each | Task-specific. | KEEP; check button heights against 48 dp. |

Dead or near-dead (OBSERVED, import grep)
- `DimensionRow.js`: zero consumers anywhere (also noted `27-LOOK-AND-FEEL-PASS.md` 4). RETIRE.
- `GymWeekBoard.js`: zero consumers (no screen or component imports it). RETIRE (INFERRED: confirm no dynamic require).
- `GymRow.js`: used only by a sibling component (`PlacePicker`/`GymPicker`); no screen. Keep only if the picker keeps it.

Duplicated chrome to extract: the 34 dp round header button is hand-copied in Hub (`:899-906`), Profile (`:699-701`), Dimension (`:794`), EditProfile (`:660`) (`01-current-picture.md` 5.1). Extract one `CommunityHeaderButton` at `touchTarget.minimum` (48 dp) with no container (the logger removed header containers, `layout.js` `workoutLoggerSize.headerActionTarget` comment, "NO container at all").

### Feed row anatomy as built (ActivityItemRow, OBSERVED)
- Avatar 32 + 10 dp amber ring dot when `isToday(post)` (`:175-179`, `RING = 10`).
- Line 1 (`numberOfLines={1}`): name `bodyStrong`, then ` - headline` in `body` `textSecondary` (`:182-188`). Headline is "new best" (pr), the session name, plan name, milestone title or "note".
- Line 2: `type.num('label')` `textMuted`, one line; amber "PR " lead on pr kind (`:194-203`). Figures: pr = lift and weight x reps and "was"; session = tonnage, minutes, sets, PR count, weekday; block = weeks and sessions; milestone = its caption (`:99-135`).
- Line 3: the author's note, `bodySm`, 3 lines max.
- Trailing column: heart 20 dp (`iconSize.md`) with hitSlop 12 => effective 44 dp (below the 48 dp law, `styling.md`: "every interactive element >=48dp effective"), count `caption`, and a comment glyph 16 dp plus count only when comments exist (`:206-224`).
- Time: only a weekday, and only on session rows (`weekdayShort(p.date ?? created_at)`, `:99-135`). A pr, block, milestone or note row carries NO day at all, and "Tue" cannot be told from a week ago. PostCard by contrast prints "Today / Yesterday / n days ago / 12 Oct" (`PostCard.js:61-68`). This is the biggest hierarchy gap versus Hevy and Strava, whose cards lead with time (UNVERIFIED visually).
- Hierarchy (INFERRED): the author name is the most prominent thing, the achievement (the thing a lifter scrolls for) is `label` 13 dp muted. In the logger the exercise name and the set numbers are the weight-bearing type (`type.num('bodyStrong')`, build spec section 2). The feed row is inverted relative to that logic.

### Avatar and identity (OBSERVED)
- Six preset icons (`lib/profileAvatarPresets.js:2-7`): Strength `barbell-outline` (tone `primary`), Physique `body-outline` (`macroFat`), Consistency `calendar-outline` (`success`), Progress `trending-up-outline` (`macroCarb`), Power `flash-outline` (`warning`), Conditioning `pulse-outline` (`error`). Tint is `withAlpha(accent, alpha.tint)` (.12), ring is neutral `border` at `alpha.edge` when unselected (`ProfileAvatarMark.js:29-41,106`).
- Three observations. (1) Tone names borrow semantic status colours: Conditioning is `error` red, Power is `warning` yellow, Consistency is `success` green, Physique and Progress borrow macro hues (`macroFat`, `macroCarb`), so a person's avatar can read as a status or a nutrition category (INFERRED; contradicts `styling.md` "macro hues are category hues, never adherence"). Under the CVD palette those tokens are re-keyed, so the six may collapse (INFERRED, not checked). (2) The `volyume_physique` preset has badge `camera-outline` (`:3`) which implies photos; the rules (`CommunityRulesScreen`/01 section 4) say Progress Scan and photos are never shown. Not a leak, but the word "Physique" on an identity token sits near the body-image line. Flag for the lead, no change proposed here. (3) At size >= 40 a preset badge is drawn (`showBadge = selected || editable || size >= 40`, `ProfileAvatarMark.js:55`), so a 40 dp feed avatar would carry a picker badge it should not; sizes 36 and below are clean.
- Sizes in use: 24 (stacks), 30 (Hub header), 32 (every row, comments), 56 (profile hero). Fixed by CR-09 rule 4.
- The ring dot (trained today) appears on `PersonRow` and `ActivityItemRow` (both `RING = 10`, duplicated constants).

---

## 3. Proposed "Community visual law" (draft, aligned to D220 and the house tokens)

Status: DRAFT for the lead; none of it is applied. Items marked [A] apply in every direction, [band] only if the logger-band direction is chosen. Supersession note: [band] items would change CR-09 rule 2/3 and D163 rule 1 (one gutter paid by the page) and the layout guard `src/__tests__/community.layout.guard.test.js`; they need a recorded ruling and a re-pin, as D220 did for the logger.

**L1 Page tone [A].** Page `colors.background` (#0D0D0D). Never pure black. Light, higher-contrast and CVD palettes come free via tokens; no hex.
**L2 Sections [band].** Section = `colors.surface` full bleed, no radius, no border, separated by a 10 dp strip of page colour (`BAND = 10` as `ExerciseSection.js:66`). Rows inside carry their own `spacing.lg` inline padding (the band, not the page, then owns the gutter; today's page-level gutter would be removed). Sections [A, flat variant]: unchanged `Eyebrow` with the heading role added.
**L3 Section header [A].** One component replacing Eyebrow and SectionLabel: `accessibilityRole="header"`, title `type.bodyStrong` `textPrimary` in band mode (56 dp tall, as the logger's section header) or `type.caption` + `letterSpacing.overline` `textMuted` uppercase in flat mode (today's Eyebrow). One trailing action at `type.label`, `textSecondary`, hit area 48 dp. No amber.
**L4 Row [A].** 64 dp two-line row (`minHeight: 64`), 56 dp one-line. Hairline `StyleSheet.hairlineWidth` in `colors.borderSubtle` spanning the row. Press feedback via `PressableCard`.
**L5 Post row anatomy [A], 3 to 4 lines, in this order:**
 1. Identity line: avatar 36 (no picker badge, see Section 2) or 32; name `type.bodyStrong` `textPrimary`; right-aligned time `type.caption` `textMuted` using one shared relative-time helper (extend `postDayLabel`, `PostCard.js:61`: "Today", "Yesterday", "Tue", "12 Oct"; never a clock time, matching `PostCard` comment "a story is a day's work").
 2. Achievement line (the lead of the post): kind headline `type.num('bodyStrong')` `textPrimary` (session name, "Squat 140 kg x 5", plan name, milestone title). A pr row keeps the amber "PR" mark (sanctioned, CR-09 rule 7), 11 to 13 dp.
 3. Stats line: `type.num('label')` `textSecondary` (minutes, sets, tonnage, PR count). Tonnage is lift volume, allowed (`PostCard.js` header: "the lift is training performance the user chose to share").
 4. Note (if any): `type.bodySm` `textPrimary`, 3 lines.
 5. Reaction bar: heart (filled `colors.primary` only once given, else `textMuted`) with count in `type.num('label')`; comment `chatbubble-outline` with count, shown always in the detail view and when >0 in the feed; each target 48 dp (`touchTarget.minimum`). Retire the thumbs-up and the "Respect N" text so the feed and detail say the same thing (`ActivityItemRow:206-224` vs `PostCard.js:157-168`). A visible word ("Respect") helps comprehension; the lead may keep it as the accessibility label only (already the label).
**L6 Identity [A].** Avatar sizes 24 (stacks), 32 or 36 (rows), 56 (profile hero), no others. The ring dot is the only presence mark. Preset tones: lead decides on the status-colour reuse (Section 2); the law proposes presets tint with `textSecondary` at `alpha.soft` for the unselected state and `colors.primary` only for the selected one, but this changes six users' avatars and is flagged as an option, not a given.
**L7 States [A].**
 - First load: skeletons in the true shape. Add `SkeletonPostRow` for the feed (avatar circle, name bar, figure bar, note bar) and switch the nine wrong screens to `SkeletonPersonRow`.
 - Section empty: one `type.bodySm` `textMuted` line plus at most one tertiary action (existing law, D163 6).
 - Screen empty and every error/offline/private/blocked: the house `EmptyState` with retry. Keep.
 - Paging: `ActivityIndicator` in the list footer is acceptable (indeterminate, `styling.md`).
**L8 Density [A].** Feed row 64 dp minimum, naturally 88 to 112 dp with a note. Rosters 64 dp. Keep `spacing.md` (12) vertical row padding and `spacing.xxs` (2) between text lines; stay on the scale (`spacing.hair..xxxl`).
**L9 Header and compose [A].** Header glyphs: icon only, no container, 48 dp target, `colors.textPrimary` (not amber); reserve amber for the unseen dot and the badge. Cap visible controls at three on the Hub (search, activity, messages); move Privacy and the profile avatar into the profile menu (INFERRED product choice; the avatar is 30 dp and the privacy shield is a rarely used destination; both are reachable elsewhere: Privacy from Settings per founder order 2026-09-22 item 2 wording in the Hub header comment). A compose affordance: one "Write a post" row at the top of ACTIVITY (a well styled like the logger's, fill `background`, 1 dp `borderSubtle`, `radius.md`, placeholder "Share something from your training", opens `CommunityCompose` kind `note`), not a floating action button. This is the only compose door change.
**L10 Motion [A].** `AnimatedEntrance` once per screen, first paint only; press feedback through `PressableCard` (`motion.springs.press`); list-to-detail via the origin-aware zoom as D188 ruled (thread `onPressWithLayout` through `PersonRow`, `CohortRow`, `GroupRow`, `ActivityItemRow` and register `heroZoomOptions` on `CommunityProfile`, `CommunityGroup`, `CommunityPost`); Reduce Motion = cross-fade (law 5, `styling.md`), already app-wide through `useStackMotionOverride` (`RootNavigator.js:392-395`). Reaction tap: `motion.micro` (120 ms) scale, no confetti, no burst (law "No glow", D173/D174).
**L11 Amber [A].** Sanctioned uses only (CR-09 rule 7): ring dot, given Respect, PR mark, selected chip, one emphatic button per journey, plus the unseen dot and unread badge. Remove amber from the four header glyphs. No amber body text.
**L12 Type roles [A].** Names `bodyStrong`, headline `body`, figures `type.num('label')` (promote to `num('bodyStrong')` for the achievement line in band mode), time and counts `caption`, notes `bodySm`. No `h1` to `h3` on lists (CR-09 rule 1) except the not-joined hero.
**L13 Inputs [band].** Wells: fill `colors.background`, 1 dp `colors.borderSubtle`, `radius.md`; focused: 1 dp `colors.primary`.
**L14 Accessibility [A].** Section headers have the header role; every target >=48 dp (`touchTarget.minimum`); row labels as built (`ActivityItemRow:151-157`); text must survive the x1.2 larger-text scale: rows must not be `numberOfLines={1}` on both name and figures simultaneously without a second line allowance (see Section 6).

---

## 4. Three directions for the founder

### Direction 1: "Logger grammar carried over" (near-black bands, one accent, dense rows)
What it is. Every Community list becomes a stack of full-bleed `colors.surface` bands on `colors.background`, 10 dp gaps, 56 dp section headers in `bodyStrong`, 64 dp rows, hairlines in `borderSubtle`, wells for inputs, tabular `num` figures, one amber accent. The feed is one band of dense rows, each post a 3-line row with a 48 dp reaction bar docked to the row.
Per screen
- Hub: header reduced to three icon-only controls; YOU row as a band; PEOPLE, GROUPS, ACTIVITY as three bands; "Write a post" well at the top of ACTIVITY; first-run hero card becomes the first band, not a card.
- Dimension, Group, Profile: same band stack; Profile's `ProgressStrip` becomes a band section (no radius).
- Post detail: the post is the top band, comments a second band, the comment composer docked as a well.
- Compose, Join, EditProfile, TrainingProfile, GroupCreate, Privacy: sections become bands, `Card`s and `SectionLabel`s retire, inputs become wells. This is the largest churn (7 form screens, 36 `SectionLabel`/`Card` sites by the counts above).
- Board, Activity, Followers, Connections, Conversations, Search, PeopleList, FindPeople: band per section; skeleton fixed.
- Rules, Moderation, GymAdd: Rules stays text; Moderation/GymAdd cards may remain (staff surfaces).
Risk. (a) It reverses D163 rule 1 (one gutter paid by the page) and CR-09 rules 2 and 3; `community.layout.guard.test.js` and `community.presentation.guard.test.js` must be re-pinned (the logger rebuild re-pinned its own guards at stage B, D220 addendum 4). (b) The logger is a task screen with a keypad; bands on a social feed could feel heavy and "settings-like" (INFERRED). (c) Bands separate content that the founder previously wanted flat ("not look AI", D163), so a device walk is mandatory before the form screens are converted. (d) It matches the logger but not Today/Train/Nutrition, which stay on cards (finding 1): Community would be a second band-grammar island beside the logger.

### Direction 2: "Warmer social register" (larger identity, cards, reaction chips)
What it is. Posts become cards (`Card`, `radius.lg`, `surface`), avatar 40 to 44 dp, achievement as a hero figure (`num('title')`), reaction chips (a pill with heart and count, a pill with comment and count, `Chip`-like) and a visible time. People rosters as cards. Matches the Today/Train card language, and the best-known feeds (Strava activity card, Peloton; UNVERIFIED visually).
Per screen
- Hub: post cards in the feed; cohort and group rows as cards; hero stays a card. PostCard becomes the one post component and ActivityItemRow retires.
- Profile: ProgressStrip as is; roster rows in cards.
- All form screens: unchanged (already Cards).
Risk. (a) It contradicts CR-09 rule 2 ("No `Card` for people, groups, cohorts or activity") and is close to what the founder rejected on 2026-09-14 ("It looks ruvvish", D163): the cause was a card/flat hybrid with stepped edges, but the visual verdict was on the card-heavy Hub (INFERRED). (b) 44 dp avatars would trigger the preset picker badge (`ProfileAvatarMark.js:55`) unless the rule is changed. (c) Cards with nested cards (a Card inside a post for a PR) breach the "no nested container" rule. (d) Cards raise vertical cost per post from about 90 dp to about 170 dp, halving feed density; the logger direction runs the opposite way.

### Direction 3: "Hybrid" (band structure, social post rows)
What it is. Logger structure for the page (full-bleed `surface` bands, 56 dp section headers, wells, 48 dp targets, one accent), but the post row keeps a larger social anatomy inside its band: avatar 36, time at the top right, achievement as the lead line in `num('bodyStrong')`, a PR mark, a 48 dp reaction bar with heart and comment as quiet glyphs (no chips, no cards). Rosters stay 64 dp `PersonRow`s inside bands. Forms (Join, EditProfile, TrainingProfile, Compose) adopt wells and bands only for the sections that are lists; short cards remain where content is reading text (Rules, Privacy receipt).
Per screen
- Hub, Dimension, Group, Profile, Post, Activity, Board and the nine list screens: as Direction 1.
- Compose, Join, EditProfile, TrainingProfile: wells replace `ComposerInput` and `Input`; `SectionLabel` becomes the unified section header; gym `Card` rows stay `Card` (they are objects).
- Rules, Moderation, GymAdd: unchanged.
Risk. (a) Same guard re-pin as Direction 1 but a smaller blast radius (forms keep cards). (b) Two vocabularies on the form screens until the lead decides the card gym rows; mitigate by listing which `Card`s are objects. (c) Needs a feed row spec check at x1.2 text (post row grows). (d) Lowest regret path if the founder's order is read literally ("in line with the best loggers" plus "our own theme look and feel of all other areas"): it takes the logger's structure and keeps Today/Train/Nutrition's card use where an object is shown (INFERRED reading of the order). Offered as the auditor's lean, not a ruling.

---

## 5. Wireframes (Hub feed and one post row per direction; widths are schematic, dp in brackets)

### Direction 1: bands
```
 <  Community              [search][bell][chat]      <- icon only, 48 dp, textPrimary
+------------------------------------------------+  page: background
| (o) You    3 sessions this week        6 wks   |  band: surface, row 64
+------------------------------------------------+
 ........................... 10 dp page colour
+------------------------------------------------+
| PEOPLE                            Find people  |  header 56, bodyStrong
|------------------------------------------------|
| (o)(o)(o)  Your gym           4 trained today >|
|------------------------------------------------|
| (o)(o)     Strength           2 trained today >|
+------------------------------------------------+
 ........................... 10 dp
+------------------------------------------------+
| ACTIVITY                                       |
| [ Share something from your training       ]   |  well
|------------------------------------------------|
| (o)  Sam                              Today    |  name | time
|      Upper body A                              |  num bodyStrong
|      52 min  18 sets  4,200 kg  2 PRs          |  num label
|      Heart 7        Comment 2                  |  48 dp targets
|------------------------------------------------|
| (o)  Priya                          Yesterday  |
|      PR  Squat 140 kg x 5   was 135 kg         |
|      Heart 12                                  |
+------------------------------------------------+
```
Post row (dp): padding V 12, avatar 36, text column gap 2, reaction bar 48 tall, hairline `borderSubtle`.

### Direction 2: cards
```
 <  Community              [search][bell][chat][..]
 (o) You  3 sessions this week                6 wks
 PEOPLE                                  Find people
 +--------------------------------------------+
 | (o)(o)(o)  Your gym     4 trained today  > |   card, radius 16
 +--------------------------------------------+
 ACTIVITY
 +--------------------------------------------+
 | (O) Sam  @sam                      Today   |   avatar 44
 |                                            |
 |   Upper body A                             |   num title
 |   52 min . 18 sets . 4,200 kg . 2 PRs      |
 |                                            |
 |  ( Heart 7 )  ( Comment 2 )                |   chips
 +--------------------------------------------+
```
Post row: card padding 16, gap 12, about 170 dp per post.

### Direction 3: hybrid
```
 <  Community              [search][bell][chat]
+------------------------------------------------+
| (o) You    3 sessions this week        6 wks   |
+------------------------------------------------+
 ........ 10 dp
+------------------------------------------------+
| PEOPLE                            Find people  |
| (o)(o)(o)  Your gym           4 trained today >|
+------------------------------------------------+
 ........ 10 dp
+------------------------------------------------+
| ACTIVITY                                       |
| [ Share something from your training       ]   |
|------------------------------------------------|
| (O)  Sam                              Today    |  avatar 36
|      Upper body A                              |
|      52 min  18 sets  4,200 kg  2 PRs          |
|      "Back to it."                             |  note bodySm
|      Heart 7     Comment 2         Message     |  quiet, 48 dp
|------------------------------------------------|
```
Post row: as Direction 1, plus note and the optional Message action (connected viewers only, `PostCard.js` onMessageAuthor rule).

---

## 6. Accessibility and ED-safety constraints that bind every direction

Accessibility (OBSERVED unless marked)
- Contrast: `textMuted` #9C9C9C is 7.08:1 on #0D0D0D and at least 4.54:1 on every surface (`theme.js:123`); `textSecondary` 7.25:1; `textDisabled` 4.04:1 is disabled-only (`:124`). So muted text on `surface` bands passes AA; do not use `textDisabled` for any text a person must read (placeholder in a well is the logger's choice and acceptable). Light, HC and CVD tables exist (`theme.js:223-330`); never write a hex.
- Size, not contrast, is the weak point: the section heading is 11 dp caption (`Eyebrow.js:60-66`), the handle, time and counts are 11 dp. Under the x1.2 setting 11 becomes about 13. INFERRED risk: `numberOfLines={1}` on both the name line and the figures line of `ActivityItemRow` (`:182,194`) truncates long names and PR lines at large text; allow two lines on the achievement line.
- Touch targets (law 48 dp, `layout.js:12-15`): Hub header glyphs 34 dp visual (hit area 50 with slop 8, but the 8 dp gaps overlap neighbours' slop), avatar 30 dp; Respect heart 20 dp + hitSlop 12 = 44; comment glyph 16 + 24 = 40; `PostCard` actions about 40 tall; `Eyebrow` trailing action about 42 tall. All below 48.
- Roles and labels: rows have labelled button roles (`ActivityItemRow:151-157` assembles a full spoken sentence, good). Missing: header role on `Eyebrow`; the skeletons correctly hide themselves (`SkeletonPersonRow.js` `importantForAccessibility="no-hide-descendants"`).
- Reduce Motion: stack transitions go through `useStackMotionOverride` (`RootNavigator.js:392-395`) which returns `animationEnabled: false` when on; `styling.md` law 5 and D182 say motion is replaced by a cross-fade, not removed. The two sources disagree about what that override does; this audit did not run it (INFERRED conflict; check before claiming "cross-fade").
- Colour is never the only carrier: the ring dot and the "PR" word are paired with labels; keep it so. The six avatar tones must not be the only way to tell two people apart (initials/name are present).
- Dynamic type: use `type.*` roles only; no fixed row heights above `minHeight`; rows must grow.

ED-safety and data (binding, from `CLAUDE.md` Section 2 and `COMMUNITY-RULES`, `01-current-picture.md` section 4)
- Never on a social surface (feed row, post, profile, share, preview, group, board, push): bodyweight, measurements, calories, food, Progress Scan, photos, injuries, coach output, check-ins; name only as the person chose, no date of birth, email, height or age. The progress-photos before/after card exception (CLAUDE.md, 2026-07-03) is a share card, not a Community surface, and is withheld under calm mode or an open ED flag.
- `PostCard`/`ActivityItemRow` read only allow-listed keys (`POST_PAYLOAD_KEYS`, `PostCard.js` header; `ActivityItemRow.js` header). Any new post anatomy (time, tonnage, a "volume" chip) must read named fields only, never a spread. Tonnage and PR weights are lifts, allowed; a bodyweight-based exercise name must not render a body weight.
- Do not add streak-pressure, leaderboard shame, "you missed" or comparison-of-body language to any new row, chip or empty state. Rankings: `Board` and `Dimension` are rosters of training activity, not bodies; keep that. Voice: calm, no guilt (`COACHING_VOICE_SYNTHESIS_LOCKED.md`), British English, no em dash in copy.
- Calm mode and an open ED flag: Beat UK signposting and calm mode "never remove or gate"; weight/food-adjacent notifications suppress under an open flag; the 24 h first-look target for ED-content reports stays. Any visual direction must keep the report entry points (`ReportSheet`, the flag glyph in `CommentRow`) reachable and unhidden by the band rework. INFERRED: a celebration or confetti on Respect must remain off (D173/D174 law) and any PR mark remains effort-framed.
- Amber and glow rules: no medal tiers (D173), no glow (D174), no confetti palette; celebration is a mark, not an animation.
- Guards to keep green or re-pin deliberately: `community.layout.guard`, `community.presentation.guard`, `rows.amber.guard.test.js` (zero `c.primary` in Eyebrow, three in ActivityItemRow), `rewardProps.guard.test.js`, the privacy guard (rows never import `lib/database`).
- Payments and tier: no price, trial or gating language in any new component (D137).
- Builds: this audit triggers none. Any implementation lands on a branch and is merged to main when green; a device checklist for Android EAS is required with each change (CLAUDE.md Section 4).

---

## 7. Open points for the lead (not resolved here)
1. Which direction (Section 4); the lean is Direction 3 but the founder chooses.
2. Is D188 to be built or was it reverted (finding 3)? Check the git history for its landing before assigning work.
3. Retire `DimensionRow` and `GymWeekBoard` (zero consumers).
4. One section header: Eyebrow or SectionLabel (D163 item 9 left it open).
5. Compose door: a "Write a post" well at the head of ACTIVITY versus the empty-state-only door.
6. Avatar tone semantics (status colours reused for identity) and the "Physique" label.
7. Whether Progress, Coach and Nutrition screens should be opened for a like-for-like comparison before the founder sees the options (this audit sampled counts only).

---

## 8. Addendum 2026-10-08 (founder focus): sizes, structure, partition

Founder, verbatim: "Look at sizes of areas boxes, graphs, texts, and everything. At the moment its seeming very unstructured and groups, age groups feeds are all lumped together, no filtering if any sort either." Heights below are computed from tokens and `minHeight` values in source (OBSERVED inputs, INFERRED arithmetic; nothing rendered). Text heights use `lineHeight` snug 1.35 for caption (11 -> about 15) and the role table in `theme.js`.

### 8.1 Structure finding: the Hub is one undifferentiated scroll (OBSERVED)
- One `FlashList` (`CommunityHubScreen.js:855-880`) whose `ListHeaderComponent` (`header`, `:561-791`) holds, in order: moderation notice (`:563`), rules notice (`:585`), legacy partner card (`:600`), browsing row (`:620`), not-joined hero card (`:646`), YOU `PersonRow` (`:683-692`), `Eyebrow` PEOPLE (`:695`) with up to 6 cohort rows, `Eyebrow` GROUPS (`:739`), optional `Eyebrow` HOST (`:764`), offline caption (`:781`), `Eyebrow` ACTIVITY (`:790`); the feed rows are the list items. Nothing partitions these: no segmented control, tabs, sticky header, collapse, or "see all".
- Cohorts of four unlike kinds share one section: gym, discipline (up to three), age band, area (`COHORT_KIND_ORDER = { gym: 0, discipline: 1, age_band: 2, area: 3 }`, `:112`; sorted at `:428-434`). Each renders with the same `CohortRow` (`:705-717`), so "Your gym", "Strength", "25 to 34" and "Near you" read identically (INFERRED: the founder's "age groups lumped together"). The age-band row is a demographic filter presented as a place to go.
- Groups are a second list of the identical `CohortRow` shape through `GroupRow` (`GroupRow.js` is a one-line wrapper over `CohortRow`), so cohorts and groups differ only by an eyebrow.
- The feed has no controls. The scope is hard-coded: `loadHub(joined ? 'following' : 'discover', ...)` (`:263`, with the comment "No Chip segment any more", `:261-262`). No filter (Following, Gym, Group, Everyone), no sort (recency is the only order), no search-in-feed. The server also exposes `community_discover_posts` and `community_feed` (`lib/community/feed.js:153-160`); whether a gym-scoped or group-scoped feed read exists server side is UNVERIFIED here (a `_group_ids` argument was seen only in the compose path, `feed.js:259`).
- Consequence for scroll depth (INFERRED, 360 x 800 dp): header 48 + YOU 64 + PEOPLE (about 47 + 6 x 64 = 431 at the maximum, 175 for a gym only) + GROUPS (47 + 64 per group) + ACTIVITY eyebrow 47 = 48 + 64 + 431 + 47 + 47 = 637 dp before the first post for a member with six cohorts and no groups, and 64 dp more per group. The usable height is about 700 dp, so the first post is below the fold for most joined users with more than one group. The thing people post for (the feed) is the last thing on the screen; this is the "unstructured" reading.

### 8.2 Measured size census: Hub (joined user), top to bottom
| Element | Height or size (dp) | Type role | Source |
|---|---|---|---|
| `BackHeader` | 48 side slots (`touchTarget.minimum`) | title `type.title` 17 | `BackHeader.js:35,65` |
| Header avatar | 30 | initials/glyph | `Hub:~494-497` |
| Header round buttons x4 | 34 x 34, border `hairlineWidth`, glyph 18 | n/a | `Hub:899-906`, glyph `:508` |
| Unseen dot / unread badge | 8 / 16 min | badge text `fontSize.micro` 10 bold (`:927`, chart-axis-only token, `styling.md`) | `Hub:907-925` |
| Notices (`statusNotice`) | padding 12, radius 16, bordered, text `bodySm` | `bodySm`, link `captionStrong` | `Hub:893-895` |
| Not-joined hero `Card` | padding 16 (Card default), `h3` 20 | `h3`, `bodySm`, Button sm | `Hub:647-681` |
| YOU `PersonRow` | min 64; avatar 32; metric `num('title')` 17 | `bodyStrong`, `num` | `PersonRow.js:79-81`, Hub `:683` |
| `Eyebrow` | about 47 (paddingTop 24, line about 15, paddingBottom 8) | `caption` 11, overline spacing | `Eyebrow.js:60-66` |
| `CohortRow` / `GroupRow` | min 64; avatar stack 24 with 16 dp pitch, max 3 (width up to 56); chevron 16 | title `bodyStrong`, line `bodySm` | `CohortRow.js:79-83`, `AvatarStack.js:30-33` |
| First-here block | `bodySm` + tertiary sm button, padding 8 | `bodySm` | `Hub:~720-735`, style `:954` |
| Feed row (`ActivityItemRow`) | min 64, padding V 12, natural about 82 (name 24 + figures 18 + gaps) to 130 with a 3-line note; avatar 32; heart 20, comment 16 | `bodyStrong`, `body`, `num('label')`, `bodySm`, `caption` | `ActivityItemRow.js:231-235` |
| Section empty line | `bodySm` + padding V 8 | `bodySm` | `Hub:911` |
| List padding | 16 all round, bottom 32 | n/a | `Hub:889` |

### 8.3 Measured size census: Profile (own or other)
| Element | Size (dp) | Type role | Source |
|---|---|---|---|
| Hero avatar | 56 | n/a | `CommunityProfileScreen.js:307` |
| Hero name / handle / bio | name `bodyStrong`; handle `bodySm` muted; bio `bodySm` max 3 lines | | `:687-689`, `:315-340` |
| `ProgressStrip` | `surface2`, `radius.lg` (16); 3 or 4 equal cells, cell padding V 12, H 4; value `num('title')` for the lead cell else `num('label')`; label `caption` | | `ProgressStrip.js:48-52,127-141` |
| Weeks-history footer | hairline, padding H 12, top 8, bottom 12, caption, then 8 equal columns, bar max height 24, column gap 4 | `caption` | `ProgressStrip.js:40,144-159` |
| Follower counts row | `bodySm` text, gap 16, no 48 dp target stated | `bodySm` | `:696-697` |
| Action buttons | `Button` sm or md, wrap, gap 8 | | `:421-470`, `:698` |
| ACTIVITY | `Eyebrow` 47 then feed rows | | `:478` |
| `DayDots` (rows) | 6 dp dots, gap 4, today ringed; initials variant 12 dp cells, gap 8 | `captionTight` | `DayDots.js:151-157` |
| `AvatarStack` | 24 dp avatars | | `AvatarStack.js:36` |

### 8.4 Judgement: which sizes are wrong, and relative to what
1. **Section heading is the smallest type on the screen yet the only structure.** `Eyebrow` is 11 dp `caption` muted (`Eyebrow.js:60-66`); the logger's section header is 56 dp tall carrying a 17 dp semibold title (`12-BUILD-SPEC.md` section 2, "section header 56"; exercise name `type.w(type.title,'semibold')`). Hub sections therefore read as footnotes and 64 dp rows dominate them. WRONG relative to the logger.
2. **Same row, different meaning.** Cohort, group, person and (visually) feed row are all 64 dp with a 32 or 24 dp leading mark. No size or weight difference separates "somewhere to go" (cohort, group) from "someone" (person) from "something that happened" (post). WRONG for structure.
3. **The feed row is smaller than its job.** 32 dp avatar, achievement in 13 dp muted `num('label')`, comment glyph 16 dp, heart 20 dp. The logger gives its working numbers `num('bodyStrong')` at a 64 dp row with 32 dp checks and 48 dp targets (spec table). Feed figures are one step too quiet and the reaction targets (44 and 40) are below the 48 dp law.
4. **The ProgressStrip is a `surface2` card with `radius.lg` in a page of flat rows.** It is the only rounded filled block on Profile; 8-week bars at 24 dp max height with 4 dp gaps are about 15 dp wide each on 360 dp (310 / 8 minus gaps): legible as a shape, not as data (INFERRED; labels are in the accessibility string only). The strip's lead cell uses `num('title')` 17, the same size as the header title and the YOU metric: three 17 dp elements compete.
5. **DayDots 6 dp** is below any readable mark (iconSize.sm is 16); fine as decoration with the row's spoken label, wrong as the only visible record of the week. The 12 dp initials variant exists but is not what the roster uses.
6. **Header controls**: 34 visual vs 48 target (Hub `:905`) and 5 controls; the logger's header action is a bare 48 dp glyph (`layout.js` `headerActionTarget`).
7. **Inconsistent heights on equal things**: Group menu glyph 22 vs Profile 18 (`Group:297`, `Profile:297`); header buttons 34 on Hub/Profile/EditProfile and Dimension sets its own `:794`; `RING = 10` and `AVATAR = 32` re-declared in `PersonRow.js:35-36` and `ActivityItemRow.js:76-77`.
8. **What is right.** One gutter (16) on the page, 64 dp row, hairline `borderSubtle`, `spacing` tokens only, avatar 32/24/56 ladder: consistent and worth keeping as the size system's skeleton.

### 8.5 The size system proposed for every direction (draft; tokens exact)
| Role | Size | Token |
|---|---|---|
| Page gutter | 16 | `spacing.lg` (page in Direction 2; row padding inside bands in 1 and 3) |
| Band gap | 10 | logger `BAND` (Directions 1, 3) |
| Segment bar | 48 tall | `touchTarget.minimum` |
| Filter chip row | chips 36 tall visual, 48 dp hit via hitSlop; gap 8 | `Chip` sm, `spacing.sm` |
| Section header | 56 (bands) / 47 (flat) | title `type.bodyStrong` / `caption` overline |
| Roster row | 64 (two lines), 56 (one line) | CR-09 rule 4 |
| Post row | minimum 88, natural to 130; no fixed max | |
| Avatar | 24 / 32 or 36 / 56 | no 40 to 48 without suppressing the picker badge |
| Primary figure | `num('bodyStrong')` 16 | achievement line, metric |
| Secondary figure | `num('label')` 13 | stats |
| Meta | `caption` 11 | time, counts, handle |
| Chart (ProgressStrip bars) | 32 tall, 8 columns, 4 gap, caption axis | `radius.hair` caps; keep in a band, not a card |
| Dots (DayDots) | 8 dp dots in rows (from 6), 12 dp cells on Profile | add the weekday initials on Profile |
| Targets | 48 x 48 | `touchTarget.minimum` |
Judgement call for the lead: the 6 to 8 dp dot change and the 24 to 32 dp bar height are proposals (INFERRED legibility); a device check decides.

### 8.6 Hub partition per direction (segments, filters, sort)
Shared proposal for all three, labelled INFERRED product design (the founder asks for filtering; the data behind each segment is OBSERVED to exist in `loadHub`/summary except where noted):
- Top-level segments (a 48 dp segment bar directly under the header, `Chip` radio style, `accessibilityRole="radio"`, as `styling.md` requires for single-select): **Feed | People | Groups | You**. Feed is the default landing segment so the first post sits under the header.
- Feed filters (chip row under the segment bar): **Following | Gym | Group | Everyone**, sort **Recent** (default) with an optional **Top (Respect)** later. Following uses the existing `following` hub segment (`Hub:263`); Everyone uses `discover` (exists, `feed.js:158`); Gym and Group scopes need a server read that is UNVERIFIED, so ship Following and Everyone first and list Gym and Group as a flagged dependency (a migration needs the founder's exact "run against production" phrase).
- People segment: cohort rows grouped under four sub-headers (Your gym, Disciplines, Age group, Near you) with an age-group row demoted to a filter chip on Find people (`PeopleFiltersSheet` exists) rather than a destination; Find people becomes the first row.
- Groups segment: My groups, then invites, then "New group".
- You segment: the YOU row, the ProgressStrip, counts, host and privacy shortcuts (this is where the privacy shield and avatar leave the header).

Direction 1 (bands), Hub:
```
 <  Community                         [search][bell][chat]
+--------------------------------------------------------+
| [Feed]  [People]  [Groups]  [You]                      |  48 dp radio segments
+--------------------------------------------------------+
 .............. 10 dp
+--------------------------------------------------------+
| ( Following ) ( Gym ) ( Group ) ( Everyone )   Recent v|  chips 36/48, sort label
|--------------------------------------------------------|
| [ Share something from your training               ]   |  well
|--------------------------------------------------------|
| (o) Sam                                      Today     |
|     Upper body A                                       |
|     52 min  18 sets  4,200 kg  2 PRs                   |
|     Heart 7    Comment 2                               |
+--------------------------------------------------------+
```
Direction 2 (cards): same segment bar as pill tabs on the page, filter chips below, then the card feed from section 5; People segment is a list of cohort cards grouped by sub-header. Highest vertical cost.
```
 <  Community                    [search][bell][chat][..]
 ( Feed )  People   Groups   You               <- pill tabs
 [Following] [Gym] [Group] [Everyone]      Recent
 +------------------------------------------+
 | (O) Sam                          Today   |
 |  Upper body A    52 min . 18 sets        |
 |  ( Heart 7 ) ( Comment 2 )               |
 +------------------------------------------+
```
Direction 3 (hybrid): segment bar and filter chips on the page-colour strip above the first band (chips are not in a band; bands begin at the content), people and group rosters as bands under sub-headers, feed rows as in Direction 3. Wireframe equals Direction 1 with the chip row sitting on `colors.background` above the ACTIVITY band instead of inside it.
Risks added by partition. (a) A four-segment bar replaces the "one list, one scroll" the blueprint chose (`20-BLUEPRINT.md` section 9 Hub, "No Following/Discover segment"); the founder's 2026-10-08 words override but it must be recorded as a superseding ruling. (b) Feed filters beyond Following/Everyone need server work and a migration. (c) Three tab-like layers (stack tab bar, segment bar, filter chips) risk nesting depth; keep chips only on the Feed segment. (d) Segment state should persist per session only (`localStorage` is not available in RN; use AsyncStorage as a per-viewer convenience, not store state).
