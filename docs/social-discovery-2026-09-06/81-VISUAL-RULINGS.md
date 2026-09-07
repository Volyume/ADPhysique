# 81 Visual rulings: Community converges on the current Volyume language (lead, 2026-09-07)

Founder brief (in chat): visual refinement only; no change to IA, data,
privacy, moderation, connection or gym behaviour. Authority above this
file: D148 (the five Button tiers, amber is accent) and `30-BLUEPRINT.md`
section 13. Evidence: `80-VISUAL-INVENTORY.md` (no hex, no hand-rolled
amber fills, six emphatic uses, shared components everywhere). Observed
conclusion: the weight comes from how the system is applied, not from
the tokens. Agents build FROM this file; anything not ruled here follows
D148 and the reference screens (YouScreen, HomeScreen, PlanDetailScreen,
SettingsScreen).

## V1 One decisive amber fill per journey
Emphatic stays on exactly: Join "Create profile", Adapt "Save to my
plans", Rules "Accept the rules", Publish "Share programme", Compose
"Post". The Hub hero's "Create my profile" becomes `primary` (the
commitment happens on Join); the guard allowlist drops the Hub.

## V2 Buttons never fill a card
Inside any Card, list row, hero or sheet, a Button is `size="sm"` and
`fullWidth={false}`, laid out in a row (leading in hero cards, trailing
in list rows). Full-width buttons appear only as the last element of a
form screen (Join, Adapt, Rules, Publish, Compose, Gym add, Report).

## V3 Hub hero (no profile)
`Card` default surface, no elevation. Title `type.h3`, body `type.bodySm`
`textSecondary`, at most three lines. Action row: "Create my profile"
`primary` sm with `person-add-outline`, "Browse first" `secondary` sm.
The PrivacyReceipt sits under it in its compact form (V9). Same shape
for the intro card on Today (`HomeCommunityIntroCard`).

## V4 Join
Order: Handle, Name, Avatar, Trains at, Who can follow, sharing toggles,
Create profile, then the rules. TextField `size="sm"`. The "Four rules"
card moves under the Create button as a `Card surface="surface2"
radius="md" padding="md"` with a `captionStrong` heading and four
`caption` lines, followed by "Community rules and contact" as `tertiary`
sm, not full width. Every existing field, validation line, toggle and
accessibility label stays.

## V5 Avatar presets (ProfileAvatarMark)
Preset marks 40 px in the picker, gap `spacing.sm`. Unselected: neutral
ring (`t.colors.border` at `alpha.edge`), the preset accent stays in the
glyph and the tint. Selected: amber ring plus the existing tick badge.
This is the shared mark, so the Athlete profile picker follows too.

## V6 Pick-one controls
Community never uses `SegmentedControl`. Every pick-one control (Join
"Who can follow", Privacy follow and connect settings, Profile tabs,
Moderation filters) is a `Chip` row with `accessibilityRole="radio"`;
where the meaning matters (follow, connect, message settings) one
`caption` line under the row explains the selected option.

## V7 Relationship actions
Follow `secondary` sm; Following `secondary` sm with `checkmark`;
Connect `primary` sm with `person-add-outline`; Requested `secondary` sm
with `time-outline`; Connected `secondary` sm with `people-outline` and
the menu; Message `primary` sm with `chatbubble-outline` rendered beside
Connected (Message leaves the menu; Remove connection stays in it).
Accept `primary` sm, Decline `secondary` sm. Report, Mute, Block are
sheet rows only; Delete and Remove are `destructive` inside sheets only.

## V8 People cards (ProfileCard)
Avatar 40. Name `bodyStrong`; handle and place on one `caption` line in
`textMuted`; reasons `captionStrong` in `textPrimary`, at most two lines
(section 13.1 holds); training line `caption`. Actions trailing per V7.
`Card padding="md"`.
V8a: a list card shows ONE trailing action, never the Follow plus
Connect pair: ConnectButton alone where connect is offered (Connect,
Requested, Respond); once connected, Message alone; otherwise
FollowButton alone. The profile screen keeps the full pair (V7).

## V9 PrivacyReceipt
Composes `Card surface="surface2" radius="md" padding="md"`. Compact by
default: `shield-checkmark-outline` glyph in amber, one `caption` line
"Nothing about your body, food or coaching is ever shared.", and a
`tertiary` sm "What is shared" that expands the existing full list in
place. Nothing in the list is removed.

## V10 Programmes
`ProgrammeTile` mirrors the plan library card: title `bodyStrong`, meta
`caption`, the Volyume chip as today. Programme page action row: "Adapt
for me" `primary` sm `options-outline`, "Use as-is" `secondary` sm, side
by side; the caption under it stays (section 14.3). Share moves to the
header `right` icon; Report stays in the menu sheet.

## V11 Training stories (PostCard)
Header row: avatar 32, name `bodyStrong`, handle and day `caption`
muted. Body: the training facts lead, typeset as a compact fact block
(`captionStrong` labels, `body` values), then the caption text. Footer:
Respect and Comment as glyph plus count in `textMuted`, pressable, no
Button. Glyphs per section 13.3.

## V12 Search and filters
`SearchBar` shared; filters as a horizontal `Chip` row; no filter
buttons and no filter panels.

## V13 Settings and privacy
`SettingRow` from `SettingsPrimitives` for every row (icon chip, label,
sub, trailing value, switch or chevron); pick-one settings inline as a
Chip row (V6). The four `secondary` buttons on the Privacy screen become
rows with chevrons; Delete profile is a `SettingRow destructive` opening
the existing confirm.

## V14 Empty states
`EmptyState`, `compact` inside lists. Copy is three parts: what is empty,
why, one next action ("No connections yet. Find lifters who train like
you." with "Find people"). One action; a second only for a genuinely
different path (offline retry).

## V15 Errors and loading
Errors: `EmptyState` with Retry as `secondary` sm. Loading: the shared
spinner as today; no skeleton cards.

## V16 Sheets
Every Community sheet: `BottomSheet` with `ModalHeader` (title, close).
Menus use one shared `MenuSheet` (new, `src/components/community/
MenuSheet.js`: props `visible, onClose, title, rows: [{icon, label,
sub?, tone?: 'default'|'destructive', onPress, accessibilityLabel}]`)
rendering `SettingRow`-style rows; it replaces the three hand-rolled
menus (ProfileMenuSheet, ConnectButton's menu, the conversation menu).
Action sheets (ConnectSheet, ReportSheet, the gym report sheet) keep one
`primary` action, full width, last.

## V17 Inputs
Single-line fields are `TextField size="sm"`. Multiline text (Compose
caption, Publish description, Moderation note, comment and message
composers) uses one shared `ComposerInput` (new, `src/components/
community/ComposerInput.js`: props `value, onChangeText, placeholder,
maxLength, minHeight, accessibilityLabel, autoFocus?`; `TextField
multiline` inside, `surface2`, `radius.md`). Send buttons stay with their
owners as `primary` sm.

## V18 List rows
ActivityRow, ConversationRow, GymRow, DimensionRow and ConnectRequestRow
all sit on `Card padding="md" radius="md"` (GymRow moves off a bare
PressableCard): avatar or glyph 36, one-line title `body`, one-line sub
`caption`, trailing unread dot or chevron; no Button except the
relationship pair on ConnectRequestRow (V7).

## V19 Typography and chrome
Screen titles come from `BackHeader` only. Section labels are
`SectionLabel tone="muted"` as on Today. No `h1`/`h2` inside Community
content; hero titles are `h3`, card titles `bodyStrong`.

## V20 Where amber may appear
Glyphs on `primary` buttons, the selected Chip tint, unread and unseen
dots, the Volyume chip, the five emphatic fills in V1, the spinner, the
amber ring on the selected avatar, the receipt glyph. Nothing else. Amber
is never body text (section 13.1).
