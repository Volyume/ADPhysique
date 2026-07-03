# Track 5: whole-app cohesion / nav / retention feel

TAP-DEPTH: daily actions all 0-1 taps (start workout, log food/cardio, mini-bar). Only
>2-tap daily-adjacent violation: notification settings at 4 taps (hub-of-a-hub,
SettingsNotificationsScreen is a pure router). Widgets: NO in-app discovery at all.

FINDINGS RANKED:
1. S: Android widgets ORPHANED — zero Settings row/onboarding/promo mentions anywhere.
   Fix: Settings row + WhatsNew entry.
2. S: notifications settings 4 taps deep — flatten two rows onto Settings root.
3. M: cross-tab nav workaround (getParent()?.navigate) copy-pasted 15x/7 files (F4 bug
   class, already bitten once; guard test exists) — extract navigateCrossTab helper.
4. M: coach plan-change visibility single-surfaced: Home banner ONLY; dismiss = gone;
   Diary/Plans get zero signal targets moved. Fix: tab-icon dot/badge reusing dismissal
   infra.
5. M-L FOUNDER DESIGN CALL: seven competing banner state machines for one Home slot
   (coach review/trial/deload/phase-mismatch/plateau/free-line/differential) — calm
   today, accretion risk; consider merging 2-3 into one "worth your attention" card.
6. S: motion token drift: Toast.js 260/180/180 hardcoded, WorkoutSummary 320/360/280/320,
   PRCelebration raw tension/friction — tokenise onto motion.*.
7. S cosmetic: stale duplicate assets icon.png/splash.png.
8. PROCESS: WhatsNewSheet map has ONE version populated — release-checklist item or the
   fortnight's shipping never reaches existing users.
POSITIVES: WorkoutSummary payoff flow strong; share cards enforce privacy in field list;
tab bar+mini-bar craft; CoachOutput staged reveal; notifications genuinely calm.

ELEVATION: widget discovery; tab badge for unseen coach changes; flatten notif settings;
navigateCrossTab helper; banner consolidation (founder call); in-app echo of the
consistency-widget stat near Home hero (S, reuses writer data); rest-day framing
confirmation Q for ED reviewer; keep WhatsNew current per release; motion tokenisation.
