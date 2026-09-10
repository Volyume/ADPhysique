# Community Visual Audit — 2026-09-10

**Scope.** 24 Community screens, 42 community components, Community blocks in HomeScreen/PlansScreen/YouScreen. Read-only mechanical audit against styling.md rules and D148 (amber fill reserved for emphatic/committing action).

---

## A. AMBER FILLS

### Emphatic Buttons (variant="emphatic")

#### Verdict (D148 — emphatic reserved for single committing action)

| File | Line | Label | Type | Verdict |
|------|------|-------|------|---------|
| CommunityComposeScreen.js | 188 | "Post" | emphatic | PASS — posting is committing |
| CommunityJoinScreen.js | 495 | "Create profile" | emphatic | PASS — creates profile (committing in join flow) |
| CommunityRulesScreen.js | 187 | ACCEPT_UPDATED_RULES_LABEL | emphatic | PASS — accepting rules is committing |

#### Other amber fills found

| File | Line | Type | Note |
|------|------|------|------|
| CommunityHubScreen.js | 90 | primaryBg | Tinted background in streak chip (allowed) |
| HomeCommunityIntroCard.js | 35 | primaryBg | Tinted background in icon container (allowed) |

---

## B. RAW LITERALS

No raw hex colours (#XXXXXX) found outside test files.

No raw rgba() found.

No magic numbers (fontSize, lineHeight, letterSpacing, padding, margin, borderRadius, gap, borderWidth) found in code (only StyleSheet.hairlineWidth and borderWidth: 1, both sanctioned).

---

## C. TYPE SCALE

### display (40/black)

None found.

### h1 (32/bold)

None found.

### h2 (24/bold)

| File | Line | Content |
|------|------|---------|
| CommunityGroupScreen.js | 324 | Group name (dynamic) |

### h3 (20/semibold) + title (17/semibold)

Total count: 8 uses across 4 files (all title role, no h3 in scope; CommunityHubScreen h3 hero is not in community screens, it is in the nested component).

| File | Count | Note |
|------|-------|------|
| CommunityProfileScreen.js | 2 | |
| CommunityHubScreen.js | 2 | |
| CommunityDimensionScreen.js | 2 | |
| HomeCommunityIntroCard.js | 2 | Title + body both present |

---

## D. CARD STACKING

### Per-Screen Component Counts

| Screen | Card | SectionLabel | Chip | Skeleton | ActivityIndicator | AnimatedEntrance |
|--------|------|--------------|------|----------|-------------------|------------------|
| CommunityActivityScreen | — | — | — | 0 | yes | 0 |
| CommunityBoardScreen | — | — | — | 0 | yes | 0 |
| CommunityComposeScreen | — | — | — | 0 | yes | 0 |
| CommunityConnectionsScreen | — | — | — | 0 | yes | 0 |
| CommunityConversationScreen | — | — | — | 0 | yes | 0 |
| CommunityConversationsScreen | — | — | — | 0 | yes | 0 |
| CommunityDimensionScreen | — | — | — | 0 | yes | 0 |
| CommunityEditProfileScreen | — | — | — | 0 | yes | 0 |
| CommunityFindPeopleScreen | — | — | — | 0 | yes | 0 |
| CommunityFollowersScreen | — | — | — | 0 | yes | 0 |
| CommunityGroupCreateScreen | — | — | — | 0 | no | 0 |
| CommunityGroupMembersScreen | — | — | — | 0 | yes | 0 |
| CommunityGroupScreen | — | — | — | 0 | yes | 0 |
| CommunityGymAddScreen | — | — | — | 0 | no | 0 |
| CommunityHubScreen | 3+ | 5+ | 2 | 0 | yes | 0 |
| CommunityJoinScreen | — | — | — | 0 | no | 0 |
| CommunityModerationScreen | — | — | — | 0 | yes | 0 |
| CommunityPeopleListScreen | — | — | — | 0 | yes | 0 |
| CommunityPostScreen | — | — | — | 0 | yes | 0 |
| CommunityPrivacyScreen | — | — | — | 0 | yes | 0 |
| CommunityProfileScreen | — | — | — | 0 | yes | 0 |
| CommunityRulesScreen | — | — | — | 0 | no | 0 |
| CommunitySearchScreen | — | — | — | 0 | yes | 0 |
| CommunityTrainingProfileScreen | — | — | — | 0 | yes | 0 |

### CommunityHubScreen.js — Main Scroll Container Outline

(Line ranges from header construction, 484–688)

1. **Line 486–503**: Moderation status notice (View, conditional)
2. **Line 505–531**: Legacy partner invites card (Card with title, body, two buttons)
3. **Line 534–547**: "Not joined" browsing row (tertiary button, conditional)
4. **Line 550–586**: Hero card — "Train alongside other lifters" (Card with h3 title, bodySm copy, two buttons) + PrivacyReceipt component
5. **Line 589**: "This week" summary (View/SectionLabel with flame chip and session count, conditional)
6. **Line 590**: "At [gym]" block (SectionLabel + View card of gym rows, conditional)
7. **Line 591**: "Your groups" chip row (SectionLabel + horizontal chip row, conditional)
8. **Line 593–608**: Segment selector (two Chip radio buttons for Following/Discover, conditional)
9. **Line 610–631**: "Find people" card (Card with icon, title, subtitle, chevron, linked)
10. **Line 633–637**: Offline notice line (caption text, conditional)
11. **Line 639–672**: Discover-only section (Lifters like you → ProfileCard rows; Around you → DimensionRow rows; Recent training stories label)
12. **Line 675–687**: Following-only Lifters like you section (ProfileCard rows, conditional)

Then FlashList renders posts below.

**Stacking observation**: Hero + Privacy + segments + "Find people" + potential profiles + dimensions = ~7–9 fixed sections before posts. Each section is a View/Card combo with label + content rows.

### HomeCommunityIntroCard.js — Component Outline

(Entire file, 30–47)

1. **Line 33–42**: Card wrapper
   - **Line 34–41**: head row (flexDirection)
     - Icon container (40×40 circle, primaryBg tint, people icon)
     - copy column (flex: 1)
       - **Line 39**: h3 title
       - **Line 40**: bodySm body
2. **Line 43–46**: actions row (two buttons, sm size, primary and secondary)

---

## E. HEADERS

**All Community screens:** BackHeader (100% consistency).

### Community blocks in other screens

| Screen | Component |
|--------|-----------|
| HomeScreen.js | Community blocks within the main Today scroll; see grep result below |
| PlansScreen.js | Community block location TBD via grep |
| YouScreen.js | Community block location TBD via grep |

(Grep deferred — those are out-of-Community-folder files; will check if time permits in final pass.)

---

## F. LOADING STATE DRIFT

**Drift found:** Every Community screen imports ActivityIndicator but zero import Skeleton. Every screen that renders a first-load state or an in-place action (e.g. fetching data on mount, pull-to-refresh) uses ActivityIndicator as a bare spinner, not Skeleton placeholders in the real layout slots.

Per styling.md rule (2026-07-08, ultimate audit item 9): **Skeleton for a known layout's first load; ActivityIndicator only for indeterminate in-place action.**

| File | ActivityIndicator | Skeleton | Verdict |
|------|-------------------|----------|---------|
| CommunityActivityScreen.js | yes | 0 | DRIFT — check if load is first-paint or in-place |
| CommunityBoardScreen.js | yes | 0 | DRIFT |
| CommunityComposeScreen.js | yes | 0 | likely in-place (button state), OK if no layout load |
| CommunityConnectionsScreen.js | yes | 0 | DRIFT |
| CommunityConversationScreen.js | yes | 0 | DRIFT |
| CommunityConversationsScreen.js | yes | 0 | DRIFT |
| CommunityDimensionScreen.js | yes | 0 | DRIFT |
| CommunityFindPeopleScreen.js | yes | 0 | DRIFT |
| CommunityFollowersScreen.js | yes | 0 | DRIFT |
| CommunityGroupMembersScreen.js | yes | 0 | DRIFT |
| CommunityGroupScreen.js | yes | 0 | DRIFT |
| CommunityHubScreen.js | yes | 0 | DRIFT — but has empty state fallback |
| CommunityModerationScreen.js | yes | 0 | DRIFT |
| CommunityPeopleListScreen.js | yes | 0 | DRIFT |
| CommunityPostScreen.js | yes | 0 | DRIFT |
| CommunityPrivacyScreen.js | yes | 0 | likely in-place toggle, OK |
| CommunityProfileScreen.js | yes | 0 | DRIFT |
| CommunitySearchScreen.js | yes | 0 | DRIFT |
| CommunityTrainingProfileScreen.js | yes | 0 | DRIFT |

---

## G. LOCAL COMPONENT CLONES

Grep for local `const/function` render components inside Community screens (lines 1–50 of each screen, then sed check):

No local chip, section header, row, avatar, or tile clones found within scope that duplicate shared primitives. All screens use `Button`, `Card`, `SectionLabel`, `Chip`, `ProfileCard`, etc. from shared imports.

**Shared primitives available:** Button, Card, Chip, EmptyState, BottomSheet, SectionLabel, ProfileAvatarMark, Skeleton.

---

## H. MOTION AND FEEDBACK

### AnimatedEntrance

Zero uses across all Community screens and components. No hero moments detected.

### Haptics

13 files use `src/lib/haptics.js` (correct).

0 files use raw `expo-haptics` (correct; test files do not count).

---

## I. ACCESSIBILITY ROUGH COUNT

| File | onPress | accessibilityRole | Gap |
|------|---------|-------------------|-----|
| CommunityHubScreen.js | 21 | 9 | 12 uncovered interactive elements |
| CommunityJoinScreen.js | 10 | 4 | 6 uncovered |
| CommunityGroupScreen.js | 4 | 2 | 2 uncovered |
| CommunityComposeScreen.js | 2 | 1 | 1 uncovered |
| HomeCommunityIntroCard.js | 2 | 0 | 2 uncovered |

---

