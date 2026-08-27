# Device checklist — Volyume 1.3.1

Automation cannot prove native behaviour. This is the smallest set that does.
Everything else in the campaign is covered by 14,770 automated tests.

Run on a **physical Android device with an EAS build**, and on **iPhone via
TestFlight** for the two iOS-only items. Roughly 15 minutes.

---

## 1. Rest timer (the largest native change — do this one properly)

Four surfaces derive from one wall-clock anchor: the in-app countdown, the
lock-screen notification, the Android foreground chronometer, and the iOS Live
Activity. The bug being closed was an anchor that never expired.

| # | Step | Expected |
|---|---|---|
| 1 | Start a workout, log a set | Rest timer starts and counts down |
| 2 | Press **+15** five times fast | Time goes up by 75s. Countdown stays smooth, never blank, never "NaN" |
| 3 | Press **−15** five times fast | Time comes back down. Never drops below ~5s, never goes negative |
| 4 | Hold **+15** for ~10 seconds | Keeps rising, then **stops climbing** rather than refusing the tap. No freeze |
| 5 | Background the app mid-rest | Lock-screen / shade notification shows a **live counting-down** timer |
| 6 | Lock the phone, wait ~30s | Countdown on the lock screen is still correct, not frozen or stuck |
| 7 | Return to the app | In-app countdown matches the notification, having caught up in real time |
| 8 | **Force-kill the app during an active rest** | — |
| 9 | Relaunch immediately | Workout is restored **and** the rest timer resumes with roughly the right remaining time |
| 10 | Force-kill during rest, wait until the rest would have ended, relaunch | Timer is **expired/stopped**, not stuck showing a countdown |
| 11 | Let a rest run to zero in the background | **Rest Done** notification fires once, no duplicate |
| 12 | Throughout | No crash, no white screen |

**The one to watch for:** at step 10, a timer still counting is the old bug.

## 2. Progress capture level (sensor guard)

| # | Step | Expected |
|---|---|---|
| 1 | Open progress photo capture | Level indicator appears and responds to tilting the phone |
| 2 | Tilt to level, hold | Turns to the "aligned" state |
| 3 | Tilt away and back several times | Returns to aligned **every** time, not just the first |

**The one to watch for:** an indicator that stops reaching "aligned" and never
recovers was the defect.

## 3. Authentication (the PKCE/callback change)

Do all four. This is the change with the widest blast radius.

| # | Step | Expected |
|---|---|---|
| 1 | Sign in with **Apple** | Signs in normally |
| 2 | Sign in with **Google** | Signs in normally |
| 3 | Sign out, then **sign up with a new email address** | Verification email arrives; tapping its link completes verification and signs you in |
| 4 | **Password reset** on an existing email | Reset email arrives; the link works |
| 5 | Sign out and back in with email/password | Works |
| 6 | Sign out | Signs out cleanly; no session survives |

**If step 3 or 4 fails**, the callback did not reach the app or was refused.
That is the one regression this change could plausibly cause — report it
immediately and do not ship.

## 4. Workout notes (cloud sync, newly working)

| # | Step | Expected |
|---|---|---|
| 1 | Add a note to a workout | Saves |
| 2 | Force-close, reopen | Note is still there |
| 3 | Sign out and back in | Note is **still there** — it now round-trips through the cloud for the first time |

## 5. Menus (the dispatcher change)

| # | Step | Expected |
|---|---|---|
| 1 | Long-press a routine, choose an action from the sheet | Acts once |
| 2 | Long-press again and tap **two different items** quickly | Only the **first** runs. No double action, no crash |

---

## Founder actions outside the device

1. **Supabase dashboard — closes the auth hole completely.**
   - Authentication → URL Configuration → Additional Redirect URLs: add
     `volyume://*`
   - Authentication → Email Templates → *Confirm signup* and *Reset password*:
     change the link to
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
     (and `type=recovery` for reset).

   After this, every email link arrives by the unforgeable mechanism and the
   implicit-token path becomes dead code. Re-run checks 3.3 and 3.4 afterwards.

2. **Confirm the TestFlight build carries symbols.** Sentry → Volyume →
   Settings → Debug Files should show a dSYM for this build.
