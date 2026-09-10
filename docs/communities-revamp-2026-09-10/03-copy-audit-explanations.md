# Community Copy Audit — All Mentions of Community in App

**Scope:** src/, docs/PLAY_STORE_LISTING.md, docs/APP_STORE_CONNECT_LISTING.md, docs/community-safety/, app.json, app.config.js, supabase/functions/

**Classification:**
- **WRONG** = explains or frames Community as programme/plan/routine sharing, or names programmes as what Community is for
- **RIGHT** = explains it as connecting, consistency, progress, encouragement, friends, gym users
- **NEUTRAL** = navigation label, button, setting name, code comment, or internal identifier
- **CHECK** = cannot tell from context

---

## SRC/ TREE (SCREENS, COMPONENTS, LIB)

| File:Line | Exact String (trimmed to 140 chars) | Where User Meets It | Class |
|---|---|---|---|
| `src/components/HomeCommunityIntroCard.js:25` | `'Other lifters, their programmes, your stories'` | Card title on HomeScreen (first workout completion intro) | WRONG |
| `src/components/HomeCommunityIntroCard.js:28` | `'Use a programme another lifter built, as-is or refitted to your kit, and share the training you actually did.'` | Card body on HomeScreen | WRONG |
| `src/components/community/PrivacyReceipt.js:40` | `'Programmes you publish'` | Privacy receipt list (Others can see / Never shared), shown on Join and Privacy screen | WRONG |
| `src/screens/CommunityRulesScreen.js:42-45` | `'Community is where you share your training, follow people you rate, and use or adapt the programmes other lifters have built. It works best when it stays about training. Here is what that means in practice.'` | Rules intro paragraph (shown on CommunityRulesScreen, pasted on Join) | WRONG |
| `src/screens/CommunityRulesScreen.js:94-96` | `'If you post a personal best, the weight and reps on that specific lift are shown because you chose to share that result. Programmes you publish share their structure (days, exercises, sets, reps, rest) and never a weight.'` | Privacy section → note (detailed rules explaining what is shared) | WRONG |
| `src/screens/CommunityRulesScreen.js:107,113,116` | `'Every profile, post, comment and programme has a Report option...' 'neither of you can see the other's profile, posts, programmes or comments...' 'If a post, comment or programme gets reported by three different people...'` | Reporting and blocking section (three mentions of programme in rules text) | WRONG |
| `src/screens/CommunityHubScreen.js:488-493` | Hero card: `'Train alongside other lifters'` + `'Follow people, find a training partner and share the training you actually did.'` | Hub screen hero (non-members, before creating profile) | RIGHT |
| `src/screens/NotificationSettingsScreen.js:880` | `'When someone reacts to or comments on your posts, or uses your programme.'` | Helper text below Reactions & comments toggle | WRONG |
| `src/components/community/DimensionRow.js:4` | Comment: `'One dimension the user shares with other people: a style, a programme,'` | Code comment (dimension types for Find People feature) | NEUTRAL (comment only) |
| `src/lib/notifications/categories.js:60` | Comment: `'comment / programme use. Both are server-sendable'` | Code comment describing COMMUNITY_ACTIVITY notification category | NEUTRAL (comment only, historical reference) |

---

## DOCS/ TREE (RULES, STORE LISTINGS)

| File:Line | Exact String (trimmed to 140 chars) | Where User Meets It | Class |
|---|---|---|---|
| `docs/community-safety/COMMUNITY-RULES.md:23-24` | `'Community is where you share your training, follow people you rate, and use or adapt the programmes other lifters have built.'` | Rules welcome section (source of truth for versioned rules; mirrored to code) | WRONG |
| `docs/community-safety/COMMUNITY-RULES.md:62-63` | `'Programmes you publish share their structure (days, exercises, sets, reps, rest) and never a weight.'` | Privacy section note (rules text) | WRONG |
| `docs/community-safety/COMMUNITY-RULES.md:73,78,83` | `'Every profile, post, comment and programme has a Report option...' 'neither of you can see the other's profile, posts, programmes or comments...' 'If a post, comment or programme gets reported by three different people...'` | Reporting and blocking section | WRONG |
| `docs/PLAY_STORE_LISTING.md` | (no Community mention found; file predates Community feature) | Store copy | N/A |
| `docs/APP_STORE_CONNECT_LISTING.md` | (not checked — does not exist or no Community content found) | Store copy | N/A |

---

## RETIRED / REMOVED (FOR RECORD)

| File:Line | What was there | Status | Evidence |
|---|---|---|---|
| `src/screens/PlansScreen.js:1692-1695` | Card: `'Programmes from the community'` linking to Community discover focused on programmes | REMOVED (comment explaining removal) | Founder correction 2026-09-08; shared-programme layer retired in 2026-09-07 product audit |

---

## PROGRAMME WORDS WITHIN 3 LINES OF COMMUNITY WORD (SRC/SCREENS, SRC/COMPONENTS)

All significant co-occurrences have been captured in the main table above. Additional occurrences are internal code variables (e.g. `programmeId`, `programme` as database field names) or historical references in migration records, not user-facing copy.

---

## SUMMARY BY CLASS

| Class | Count | Locations |
|---|---|---|
| WRONG | 8 user-facing | HomeCommunityIntroCard (2), PrivacyReceipt (1), CommunityRulesScreen (5, including rules text), NotificationSettingsScreen (1) |
| RIGHT | 1 user-facing | CommunityHubScreen hero (hub non-member intro) |
| NEUTRAL | 2 code comments | DimensionRow, notifications/categories.js |
| **Total mentions of Community in user-facing copy** | **9** | — |

### Per Tree

**src/** (screens + components): WRONG × 8, RIGHT × 1, NEUTRAL × 2
**docs/** (rules): WRONG × 3 (same text mirrored from code)
**Removed:** PlansScreen card (programmes from the community)

