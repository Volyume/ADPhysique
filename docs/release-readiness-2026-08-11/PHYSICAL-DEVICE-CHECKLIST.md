# Campaign 7 — WS-12: changed-flow physical smoke checklist

Scope: ONLY what changed between the currently-live build and this
update. Not a full-product QA matrix. Run on a physical device from an
EAS/CI build (custom native modules rule out Expo Go).

Legend: **[A]** Android · **[i]** iOS · **[A+i]** both, same expectation.

## 0. Upgrade the existing account (the release gate)

1. **[A+i]** Install the CURRENT LIVE store build first. Sign in to a
   real account with history (a plan, a finished block, workouts,
   weigh-ins, a coach output you have applied). Use it once.
2. **[A+i]** Install this update OVER it (do not uninstall).
   - Expected: no re-onboarding, no Article 9 re-prompt, straight to
     Home with your data.
3. **[A+i]** Check each survived: active plan; block week counter;
   workout history; PRs; weigh-ins (including one you deleted — it must
   stay deleted); nutrition history; manual volume targets; calm/settings;
   notification preferences; tier/trial state.
4. **[A+i]** Open Coach → the previously applied week still shows its
   receipt and the Apply buttons are NOT live again.

## 1. Free / Pro boundary (P-8 fix)

5. **[A+i]** On a Free account with recent check-in history: Plans tab
   shows **no** recovery/deload coaching card and no signal chips.
6. **[A+i]** Upgrade that account to Pro: the coaching card returns from
   the same data, immediately.
7. **[A+i]** Next-block card on Free: Repeat is reachable and its copy
   promises the same targets; Adjust is Pro-marked.

## 2. Trial / billing (P-7 fail-closed)

8. **[A+i]** Fresh account → Article 9 consent → trial starts and Pro
   unlocks. Expected: **14-day cardless** trial, no card requested.
9. **[A+i]** Paywall: the price shown comes from the store; **Terms of
   use** and **Privacy policy** links are present and open (new this
   release) — required for App Review.
10. **[A+i]** Airplane mode → tap the trial start → expect a calm
    failure, **no Pro unlock**, and the retry lands the trial when back
    online.
11. **[A+i]** Subscribe: confirm the store sheet shows the **7-day**
    introductory period, then paid. Restore purchases on a reinstall.

## 3. Workout, feedback, block (the coaching delta)

12. **[A+i]** Log a session with a "too easy" difficulty → next session's
    load steps up and says why.
13. **[A+i]** Session adjustment copy: an added set now reads *"took a
    light pump last time and nothing's been flagged sore"* — it must NOT
    say "recovered fast and last session was strong".
14. **[A+i]** Finish a block → the block-end story shows per-muscle
    rationales; a muscle whose climb was withheld reads *"deliberately
    kept steady rather than increased this block"* with **no** mention
    of any reason.
15. **[A+i]** Continue with adjustments → seed receipt matches the next
    block's numbers. Then a Repeat on another account → identical
    targets to last block.

## 4. Volume + nutrition provenance (B1/B4, new copy)

16. **[A+i]** Progress → Volume screen: **every muscle row now shows a
    provenance caption** — "Your own targets" / "Adjusted from your
    logged training" / "Research starting point". Edit one target and
    confirm that row flips to "Your own targets".
17. **[A+i]** Nutrition targets: the line under the calorie number says
    "…adjusted from your own weigh-ins and logging" only if a calorie
    change has actually been applied; a new account keeps the day-0
    wording.

## 5. Weigh-ins, deletes, sync (RC6 fixes)

18. **[A+i]** Delete a weigh-in → force a sync → reinstall → it stays
    deleted (tombstone carry).
19. **[A+i] TWO DEVICES:** apply a coach change on device A; open the
    same week on device B (just view it); sync both. **Expected: device
    A's receipt survives and Apply does NOT go live again on either.**
20. **[A+i]** Offline: delete a workout, stay offline, reopen the app,
    reconnect → the delete propagates, nothing resurrects.

## 6. Notifications (delta)

21. **[A]** Settings → Notifications: channels appear with names —
    Training reminders, Coaching reminders, Rest timer, Rest finished,
    and **Updates** (new). None unnamed.
22. **[A+i] SIGN-OUT LEAK (new fix):** with reminders scheduled, sign
    out. **Expected: no further reminders arrive** (previously the old
    user's named reminders kept firing).
23. **[A+i]** Reinstall + sign in → reminders re-lay within the same
    session (no need for a second cold launch).
24. **[A+i]** Turn on calm mode → weight/food-adjacent notifications
    stop.
25. **[i]** Deny notification permission → the app never claims a
    reminder is "scheduled".

## 7. Deep links (new iOS capability)

26. **[i] NEW:** tap a `https://volyume.app/partner/<code>` invite link —
    **it must now open the app, not Safari** (associated domains added
    this release; requires the AASA to be live on the domain).
27. **[A]** Same link opens the app; a non-partner volyume.app link
    (e.g. the privacy page) now opens the **browser**, not the app.
28. **[A+i]** Tap each notification type from a cold app, a backgrounded
    app, and in the foreground — the destination opens or degrades
    gracefully; nothing crashes.

## 8. Camera / photos

29. **[A+i]** First camera use: the permission prompt text mentions
    barcode scanning, nutrition labels **and** progress photos (string
    corrected this release).
30. **[A+i]** Take a progress photo → reinstall → confirm the photos are
    gone (local-only promise) and the app says so honestly rather than
    showing broken thumbnails.

## 9. Android/iOS-specific

31. **[A]** Share a workout card → the WhatsApp/SMS/email share sheet
    resolves (package-visibility query fix — previously these checks
    could fail silently on Android 11+).
32. **[A]** Widgets: add both widgets; tap each → the app opens on the
    right screen. Neither shows weight or calorie data.
33. **[A]** Hardware back during an active workout → does not silently
    abandon the session.
34. **[i]** Swipe-back during an active workout / Article 9 consent →
    the gate cannot be bypassed.
35. **[A+i]** About screen → long-press the version → the build number
    shown is the REAL native build (not a stale config value).
