# Community visual inventory (recon, read-only)

Authority: `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`
D148 (~line 5967, "Amber is accent, not this is a button", five Button
tiers) and `docs/social-discovery-2026-09-06/30-BLUEPRINT.md` section 13
(~line 692, lead visual review rulings 2026-09-06). No recommendations
below; evidence and file:line only.

Screen count observed: **21** `src/screens/Community*.js` files (brief
estimated 22). Component count observed: **23** files in
`src/components/community/*.js`, plus `HomeCommunityIntroCard.js`. Note:
`CommunityHeaderAction.js` lives at `src/components/community/
CommunityHeaderAction.js`, not `src/components/CommunityHeaderAction.js`
as the brief's path assumed.

## PART A — design system

### A1. Shared primitives

| Component | File | Contract |
|---|---|---|
| Button | `src/components/Button.js:61-79` | variants `emphatic\|primary\|secondary\|outline\|tertiary\|destructive` (`buildVariants`, L61); sizes `sm\|md\|lg` (L81-87); `fullWidth` default `true` (L109); `iconFg` per-variant (L65-77); haptic tick only on `primary`/`emphatic` (L200-202); disabled = `opacity:0.5` (L309) |
| Card | `src/components/Card.js:21-59` | `padding` token key, default `'lg'` (L43); `radius` token key, default `'lg'` (L39); `surface` override `surface\|surfaceElevated\|surface2\|surface3` (L31,77-82); `elevated` bool shortcut for `surfaceElevated` (L27); `tone` accent border `primary\|success\|warning\|error\|gold` (L23,66-73); `onPress` promotes to `PressableCard` (L111) |
| Chip | `src/components/Chip.js:17-40` | `selected` → `primaryBg` fill + `primary` border + `primary` label (L58,77); unselected → `surface2`/`border`/`textSecondary` (L57,75); `accessibilityRole` `button\|radio` (L25) |
| EmptyState | `src/components/EmptyState.js:33-47` | `icon/title/text`; `actionLabel+onAction` → `Button` default variant (primary, L94-101); `secondaryLabel+onSecondary` → `Button variant="secondary"` (L104-111); `ghost`/`compact`/`busy` modes (L43-46) |
| BottomSheet | `src/components/BottomSheet.js:74-88` | controlled `visible`/`onClose` (L75-76); `showHandle`, `keyboardAvoiding`, `scroll` (L79-83); no built-in title/action-row chrome — callers render their own `Text` + rows inside |
| ModalHeader | `src/components/ModalHeader.js:21` | `title`, `onClose`, `closePosition`, `rightAccessory`; centred title + close X; **not used by any Community file** (all Community sheets render a bare title `Text` instead, see B3) |
| BackHeader | `src/components/BackHeader.js:37` | chevron-back + centred title + optional `right`; used by every pushed Community screen |
| ScreenHeader | `src/components/ScreenHeader.js:49` | tab-root header, `h1` title + brand V; not used inside Community (Community is not a tab root) |
| SegmentedControl | `src/components/SegmentedControl.js:18` | equal/content-width track; selected segment → `primaryFill` bg + `onPrimary` text (L66-68); `error` prop reddens the border only |
| SearchBar | `src/components/SearchBar.js:18` | `inputBg`/`border` field, leading search glyph, trailing clear/spinner (L44-70) |
| TextField | `src/components/TextField.js:42-96` | `surface` default `'surface2'` (L56); sizes `sm\|md\|lg` (L22-30); focus border `withAlpha(primary, alpha.strong)` (L147); `error` reddens border + `FieldError` line (L148,182) |
| ProfileAvatarMark | `src/components/ProfileAvatarMark.js:14-22` | `avatarUri` photo / `presetKey` icon-preset / initials fallback; `size`, `editable` (camera badge), `selected` (primary-ring + checkmark badge, L29,66-72) |
| Settings row | `src/components/SettingsPrimitives.js:17` (`SettingRow`) | icon chip (`primaryBg` bg, `primary`/`error` glyph, L36-42), label+sub, trailing value/switch/chevron; **not used anywhere in Community** — Community's own menu rows are hand-rolled (see B3) |

### A2. Theme tokens (`src/styles/theme.js`, dark set)

`surface #191917` (L48) · `surfaceElevated #222220` (L49) · `surface2
#2A2A27` (L50) · `surface3 #343431` (L51) · `border #6E6E6E` (L52) ·
`borderSubtle #2E2E2C` (L54) · `primary #F5A623` (L60) · `primaryFill
#E08C0B` (L61) · `primaryBg rgba(245,166,35,0.12)` (L63) · `onPrimary
#0D0D0D` (L71) · `errorFill #C62828`/`onError #FFFFFF` (L80,103) ·
`textPrimary #FFFFFF` (L121) · `textSecondary #9E9E9E` (L122) ·
`textMuted #9C9C9C` (L123) · `inputBg #1E1E1E` (L129) · `scrim
rgba(0,0,0,0.55)` (L189). Spacing `xxs2/xs4/sm8/md12/lg16/xl24/xxl32`
(L382-389). Radius `xs4/sm6/md10/lg16/xl20` (L395-399).

### A3. Reference screens (newer language)

Chosen: **YouScreen** (Coach root — D148's own bar, zero `Button`s),
**HomeScreen** (Today — the only place the primary "Start workout" CTA
and a `tertiary` chip both live), **PlanDetailScreen** (the one screen
D148 names as having both `emphatic` and `secondary`+hand-migrated
cards), **SettingsScreen** (the canonical list-row chrome). All four are
named explicitly in the task brief.

| Screen | Card padding/radius | List rows | Button variants seen | Selected state | Section labels | Empty state |
|---|---|---|---|---|---|---|
| YouScreen | `Card` default (`lg`/`lg`), no overrides (`src/screens/YouScreen.js:403,426,470`) | n/a (nav/status cards, not a list) | **none** — zero `<Button>` in the file (confirms D148's "no amber-filled buttons at all") | n/a | `SectionLabel` plain, 5x (L502,517,560,597,620) | none rendered (a load-error `Card` with retry-on-press instead, L403-415) |
| HomeScreen | `Card surface="surfaceElevated"` hero cards (L2404,2458,2481); default padding | n/a (dashboard cards) | `primary` (default, "Start workout" L2414/2437 area) · `secondary` (L2565) · `tertiary` (L2439, ghost-capture) | n/a | `SectionLabel tone="muted"` (L2405,2461,2484,2848) | shared `EmptyState`, no-plan state (L2604,2624) |
| PlanDetailScreen | `Card padding="xl"` empty card (L589) · `Card padding="none"` manage list (L748) · `Card` default elsewhere (L609,657,712,731) | `Card` per workout row (L609,657) | `primary` (default, "Add to my plans" L550) · `emphatic` ("Set active" L552) · `secondary` (L565) | n/a | `SectionLabel` plain (L574,711,730,747) | `Card padding="xl"` custom empty block (L589), not shared `EmptyState` |
| SettingsScreen | n/a (no `Card`; rows only) | `SettingRow` from `src/components/SettingsPrimitives.js`, ~16 rows (L42-162) | none on this screen (rows navigate, no CTAs) | n/a | `SectionHeader`/`SettingsPage` chrome | n/a |

## PART B — Community surfaces

Global findings (checked across all 45 files below): **zero** hex-literal
colours, **zero** `rgba(...)` literals, **zero** hand-rolled amber
*fills* used as buttons (every `backgroundColor: t.colors.primary` hit is
an unseen-dot/selected-state indicator, never a CTA). Every raw
`<TextInput>` uses `radius.md`/`spacing.md`/`spacing.sm`/`touchTarget.
minimum` tokens, not magic numbers.

### B1. Screens (`src/screens/Community*.js`, 21 files)

| File | Button usage | Hand-rolled fill/hex | Custom input/selector | Avatar | Card wrapper | Empty/error/loading | Sheet/modal |
|---|---|---|---|---|---|---|---|
| CommunityActivityScreen.js | `primary` L203, `secondary` L212 | — | — | via `ActivityRow` (not direct) | — (list via `ActivityRow`'s own `Card`) | `EmptyState` L231,242; spinner `t.colors.primary` L229,276 | — |
| CommunityAdaptScreen.js | `secondary` L274, `tertiary` L283, `emphatic` L293 (allow-listed, guard test) | — | — | — | `Card` L208, `Card elevated` L214, `Card` L229 | `EmptyState` L194; spinner L191 | — |
| CommunityComposeScreen.js | `emphatic` L181 (allow-listed) | — | raw `<TextInput>` caption field, `minHeight:96, borderWidth:1, radius.md` (L158-201) | — | — | `EmptyState` L143; spinner L140 | — |
| CommunityConversationScreen.js | `secondary` L344 | — | — | `ProfileAvatarMark` L385 | — | `EmptyState` L404; spinner L401 | `BottomSheet` menu, bare `Text` title + hand-rolled `PressableCard` rows L468-490 |
| CommunityConversationsScreen.js | — | — | — | via `ConversationRow` | via `ConversationRow`'s own `Card` | `EmptyState` L106,115; spinner L104,137 | — |
| CommunityDimensionScreen.js | `primary` L131 | — | `TextField` L123 (shared, not raw) | — | — | `EmptyState` L274,285; spinner L272; `t.colors.primary` link text L237 | `BottomSheet` L104 |
| CommunityEditProfileScreen.js | `tertiary` L356, `primary` L395, `destructive` L403 | — | — | `ProfileAvatarMark` size 48, `selected` prop, raw `Pressable` wrap (L203-220) | `Card` gym rows L301,332, `Card` L365 | — | — |
| CommunityFindPeopleScreen.js | — | — | `SearchBar` L172 (shared) | — | `Card` L94 | `EmptyState` L191; spinner L183,189 | — |
| CommunityGymAddScreen.js | `primary` L115, `tertiary` L121, `primary` L182 | — | `TextField` x6 (L134-174, shared) | — | `Card` L107 | — | — |
| CommunityHubScreen.js | `primary` L325, `secondary` L333, `tertiary` L350, `emphatic` L370 (allow-listed), `secondary` L376, `outline` L433 | selected dots `backgroundColor: t.colors.primary` L292,306 (unseen indicators, not fills) | `SegmentedControl` L385 | `ProfileAvatarMark` L266 | `Card` L316, `Card elevated` L361, `Card` L394 | `EmptyState` L519,530,539; spinner L515,566 | — |
| CommunityJoinScreen.js | `emphatic` L413 (allow-listed), `tertiary` L422 | — | `TextField` L256,267; avatar preset grid raw `Pressable` (L277-293, same pattern as EditProfile) | `ProfileAvatarMark` L285 | `Card` L242,304,359 | — | — |
| CommunityModerationScreen.js | `primary`/`secondary` dynamic by action L270 | — | raw `<TextInput>` note field, `minHeight:72` (L252-297) | — | `Card` L168 | `EmptyState` L138,215 | `BottomSheet` L240 |
| CommunityPeopleListScreen.js | — | — | — | via `ProfileCard` | via `ProfileCard`'s own `Card` | `EmptyState` L129,140; spinner L127,177 | — |
| CommunityPostScreen.js | — | — | — | via `PostCard`/`CommentRow` | via child components | `EmptyState` L275; spinner L272 | — |
| CommunityPrivacyScreen.js | `secondary` x4 (L274,299,312,320,328), `destructive` L335 | — | `SegmentedControl` L190,208 | — | `Card` L244 | `EmptyState` L178; spinner L262 | uses `PrivacyReceipt` (see B2) |
| CommunityProfileScreen.js | `primary` L280, `secondary` L289, `secondary` L303 | — | `SegmentedControl` L331 | `ProfileAvatarMark` L215 | — | `EmptyState` x8 (L356-500) | `BottomSheet` follow/follower list, bare title `Text` L479-510 |
| CommunityProgrammeScreen.js | `secondary` L388, `tertiary` L401, plus one default-`primary` "Adapt for me" (no `variant=`, L376-385 — matches blueprint ruling 2 exactly: leads with default primary, secondary is "Use as-is", nothing emphatic) | — | — | — | via `ProgrammeStructure`/`ProgrammeTile` | `EmptyState` L326; spinner L323 | — |
| CommunityPublishProgrammeScreen.js | `emphatic` L297 (allow-listed), `secondary`/`tertiary` inline L306-307 | — | raw `<TextInput>` title L247, description (multiline) L262 | — | `Card elevated` L241 | `EmptyState` L231; spinner L228 | — |
| CommunityRulesScreen.js | `emphatic` L183 (allow-listed), `secondary` L247 | — | — | — | `Card` L175,196 | — | — |
| CommunitySearchScreen.js | — | — | `SearchBar` L153 (shared) | — | — | `EmptyState` x5 (L113-142) | — |
| CommunityTrainingProfileScreen.js | `tertiary` L266 | — | `Chip` x2 L312,333 (shared) | — | `Card` L238 (preview) | spinner L235 | — |

### B2. Components (`src/components/community/*.js`, 23 files + intro card)

| File | Button usage | Hand-rolled fill/hex | Custom input/selector | Avatar | Card wrapper | Empty/error/loading | Dup flag |
|---|---|---|---|---|---|---|---|
| ActivityRow.js | — | unseen dot `t.colors.primary` L93 | — | `ProfileAvatarMark` L69 | `Card` L63 | — | — |
| CommentRow.js | default `primary`, "Send" `size="sm"` L69 | — | raw `<TextInput>` composer, `minHeight: touchTarget.minimum, maxHeight:120` L57-97 | `ProfileAvatarMark` L97 | — | — | — |
| CommunityHeaderAction.js | — | unread dot `t.colors.primary` L57 | — | — | — | — | — |
| ConnectButton.js | dynamic `variant={shape.variant}` L220, maps `primary`/`secondary` only (L93-96) | — | — | — | — | — | own `BottomSheet` menu (L230) duplicates the `ProfileMenuSheet`/`ConversationScreen` hand-rolled menu-row idiom (icon+label `PressableCard`, no shared "menu sheet" component) |
| ConnectRequestRow.js | `primary` L68, `secondary` L77 | — | — | (not inspected in full) | — | — | — |
| ConnectSheet.js | `primary` L141 | — | `TextField` L127 (shared) | — | — | — | — |
| ConversationRow.js | — | unread dot `t.colors.primary` L91 | — | `ProfileAvatarMark` L63 | `Card` L55 | — | — |
| DimensionRow.js | — | — | — | — | `Card` L40 | — | — |
| FollowButton.js | dynamic `variant={state.variant}` L82, maps `primary`/`secondary` only (L28-38) | — | — | — | — | — | — |
| GymPicker.js | — | — | `SearchBar` L91 (shared) | — | — | `EmptyState` L122 | — |
| GymRow.js | — | — | — | — | — (raw `PressableCard`, not `Card`) | — | list-row idiom duplicated across `ActivityRow`/`ConversationRow`/`ProfileCard` (some wrap `Card`, this wraps `PressableCard` directly) — inconsistent base, same visual result |
| GymSummary.js | — | — | `Chip` L79 | — | `Card` L64 | — | — |
| JoinToInteractRow.js | — | — | — | — | `Card` L24 | — | — |
| MessageBubble.js | — | bubble bg `surfaceElevated`/`surface` (not primary) L60 | — | — | — (custom bubble shape, correctly not a `Card`) | — | — |
| MessageComposer.js | default `primary`, "Send" `size="sm"` L79 | — | raw `<TextInput>` L58-97, same shape as `CommentRow.js` | — | — | — | near-identical composer field to `CommentRow.js` — two copies of the same raw-TextInput recipe instead of one shared "composer input" |
| PostCard.js | — | — | — | `ProfileAvatarMark` L128 | `Card` L120 | — | — |
| PrivacyReceipt.js | — | hand-rolled card: `backgroundColor: colors.surface2, borderRadius: radius.md, borderColor: colors.borderSubtle, padding: spacing.md` (L94-99) | — | — | **none — duplicates `Card`** (`Card surface="surface2" radius="md"` would be byte-equivalent) | — | flagged: duplicates shared `Card` |
| ProfileCard.js | — | — | — | `ProfileAvatarMark` L91 | `Card` L85 | — | — |
| ProfileMenuSheet.js | — (local `MenuRow` via `PressableCard`, L47-61) | tone=`t.colors.error` for Block row (state colour, not a fill) L139 | — | — | — | — | hand-rolled menu-row idiom (see ConnectButton, CommunityConversationScreen) |
| ProgrammeStructure.js | — | circuit-repeat icon `t.colors.primary` L160 (glyph, per blueprint ruling 1) | — | — | — | — | — |
| ProgrammeTile.js | — | — | — | — | `Card` L49 | — | `Chip label="Volyume" selected` L64 matches blueprint ruling 1 exactly |
| ReportSheet.js | `primary` L94 | — | `Chip` radio group L77, `TextField` L86 (shared) | — | — | — | — |
| TrainingProfileLine.js | — | — | — | — | — | — | — |
| HomeCommunityIntroCard.js | default `primary` "Have a look" L38, `secondary` "Not now" L39 | icon chip `primaryBg` L29 (token, not hand-rolled fill) | — | — | `Card` L27 | — | — |

## PART C — Button hierarchy guard

`src/components/__tests__/Button.hierarchy.guard.test.js`, "the emphatic
set is curated" describe block (L31-57): Community files on the allowlist
(L46-52) —
`screens/CommunityJoinScreen.js`, `screens/CommunityHubScreen.js`,
`screens/CommunityPublishProgrammeScreen.js`,
`screens/CommunityComposeScreen.js`, `screens/CommunityAdaptScreen.js`,
`screens/CommunityRulesScreen.js` (6 files, comment cites blueprint
sections 6 and 13). Test asserts `emphatic.length > 10` app-wide (L56) and
that every `variant="emphatic"` hit's file is in the allowlist (L55).

Other tests pinning Community visuals (grep `emphatic|variant=|colors\.
primary` over `src/screens/__tests__` and `src/__tests__`):
- `src/screens/__tests__/CommunityAdapt.test.js:251-254` — "Save to my
  plans" must be `variant === 'emphatic'`.
- `src/screens/__tests__/CommunityProgramme.test.js:287-291` — asserts NO
  button on the programme screen is `emphatic` (blueprint ruling 2).
- `src/screens/__tests__/CommunityConnect.test.js:18` — comment cites the
  emphatic "Accept the updated rules" action (not a hard assertion in the
  grepped range).

No test asserts on `PostCard.js` reaction iconography directly, but the
`thumbs-up`/`thumbs-up-outline`/`chatbubble-outline` glyphs match blueprint
ruling 3 verbatim (`src/components/community/PostCard.js:13-14,171,187`).
