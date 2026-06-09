# iOS go-live: the complete click-by-click guide

You have never used App Store Connect or the Apple Developer site before. This
guide assumes that. Every step says exactly where to click, what to type, and
what to copy where. Do them **in order** — later steps need values from earlier
ones. Where Apple has renamed a menu (they do, occasionally), I tell you what to
search for instead.

The **code is already done and on the branch** (native Sign in with Apple +
StoreKit purchases). Everything below is account/console setup that only you can
do, because it needs your Apple and Supabase logins. None of it touches `main`.

---

## The two websites you will use

| Site | Address | What it's for |
|---|---|---|
| **App Store Connect** | https://appstoreconnect.apple.com | Your app's listing, subscriptions, agreements, TestFlight |
| **Apple Developer** | https://developer.apple.com/account | Low-level identifiers + capabilities (Sign in with Apple) |
| **Supabase dashboard** | https://supabase.com/dashboard | Where the server functions + their secrets live |

Sign in to all three with the right accounts before you start (the Apple ones
use your Apple Developer account; Supabase uses your usual Supabase login).

## Values you'll need (already filled in for you)

| Thing | Value |
|---|---|
| App name | **Volyume** |
| Bundle ID | **app.volyume** |
| Apple App ID (numeric) | **6777083702** |
| Monthly product ID | **pro_monthly** — £4.99/month |
| Annual product ID | **pro_annual** — £29.99/year |
| Free trial | **7 days**, on each product |
| Supabase project | **sujrylzzxcqxxfygptns** |
| Notifications URL (you'll paste this into Apple) | `https://sujrylzzxcqxxfygptns.supabase.co/functions/v1/app-store-notifications` |

---

# PHASE 1 — Sign the agreements (without this, nothing sells and submit fails)

Your last build uploaded fine but **submission failed**. The single most common
cause is an unsigned paid-apps agreement. Fix that first.

1. Go to **App Store Connect** → on the top bar click **Business**
   (older name: "Agreements, Tax, and Banking").
2. You'll see a list of agreements. Find **Paid Applications** (a.k.a. "Paid
   Apps"). If its status is not **Active**, click **View** / **Review** and
   accept it.
3. It will ask for two things before it goes Active:
   - **Tax forms** — click **Set Up Tax** and complete at least the form for
     your country (UK). Follow the prompts; it's a web form, no uploads.
   - **Bank details** — click **Add Bank Account** and enter the account the
     payouts go to.
4. Also accept any banner that says **"The Apple Developer Program License
   Agreement has been updated"** at the top of App Store Connect.
5. Wait until **Paid Applications** shows **Active** (can take a few minutes).

> Until Paid Applications is Active you cannot create subscriptions and the
> store submission keeps failing.

---

# PHASE 2 — Turn on Sign in with Apple

The app now shows Apple's official sign-in button. Apple has to be told the app
is allowed to use it, and Supabase has to be told to trust Apple's tokens.

### 2a. Enable the capability on the App ID (Apple Developer site)

1. Go to **https://developer.apple.com/account**.
2. Left menu → **Certificates, Identifiers & Profiles**.
3. Click **Identifiers**.
4. In the list, click **app.volyume** (the App ID; identifier type "App IDs").
5. Scroll the capabilities list to **Sign In with Apple**, tick its checkbox.
6. Click **Save** (top right). If it asks to confirm a configuration, accept
   the default ("Enable as a primary App ID").

That's all that's needed for the **native** iOS button. (You do **not** need a
"Services ID" — that's only for websites/Android. Our iOS app uses the native
sheet.)

### 2b. Tell Supabase to trust Apple (Supabase dashboard)

1. Go to **https://supabase.com/dashboard** → your project
   (**sujrylzzxcqxxfygptns**).
2. Left menu → **Authentication** → **Providers** (older name: "Sign In /
   Providers").
3. Find **Apple** in the list and click to expand it.
4. Turn **Enable Sign in with Apple** **on**.
5. In the field labelled **Client IDs** (sometimes "Authorized Client IDs" or
   "Service ID"), type the bundle id exactly: **app.volyume**
   - If there's a separate "Services ID" box and a "Secret Key" box, leave them
     blank — they're only for the web flow. The Client IDs field with
     `app.volyume` is what the native iOS sign-in needs.
6. Click **Save**.

✅ After this, tapping "Continue with Apple" on an iOS build signs the user in.

---

# PHASE 3 — Create the two subscriptions

This is what makes Pro actually purchasable on iPhone, the same as your two
Google Play subscriptions.

1. **App Store Connect** → **Apps** → click **Volyume**.
2. Left sidebar, scroll to the **Monetization** section → click
   **Subscriptions**.
3. Click **Create** next to "Subscription Groups". Name the group
   **Volyume Pro** (users only ever see one of the plans at a time within a
   group). Click **Create**.
4. Inside the group, click **Create** to add the first subscription:
   - **Reference Name**: `Pro Monthly` (internal only, users don't see it)
   - **Product ID**: `pro_monthly` ← must be exactly this
   - Click **Create**.
5. On the subscription's page set:
   - **Subscription Duration**: **1 Month**
   - **Subscription Prices** → **Add Subscription Price** → choose country
     **United Kingdom** → price **£4.99** → Apple auto-fills every other
     country; click through **Next/Confirm**.
   - **Localization** (App Store display info) → **Add** → Language **English
     (U.K.)** → Display Name `Volyume Pro (Monthly)` → Description (a sentence,
     e.g. "Unlock food diary, coaching adjustments, and all Pro features.").
6. Add the **free trial**. This is an **Introductory Offer** — the offer type
   for *brand-new* subscribers. It is **not** a *Promotional Offer*: that's a
   separate win-back feature for people who already subscribed/lapsed, it needs
   its own signing key, and its options are different — don't use it here.
   - On the subscription's page open the **Introductory Offers** section →
     **Create** / **Set Up Introductory Offer**.
   - **Countries or Regions**: select all.
   - **Start Date / End Date**: App Store Connect makes the offer available
     **between two dates**, not as a free-standing period. Set the **Start Date**
     to today (or your launch day) and the **End Date** to **No End Date** so the
     trial is always on the shelf for new users. (These dates are how long the
     *offer is available*; the 7 days is the trial's own length, set next.)
   - **Offer Type / what they get**: choose **Free for the first week** (that's
     the 7-day free trial — same as the Google Play trial).
   - Save.

   > **If it says you must create a key first:** the button takes you to **App
   > Store Connect API → Team Keys**. That's the key in **Phase 4 below** (the
   > same *type* of key as your iOS build key — you may already have it). Go do
   > Phase 4 now, then come back here. It's the key the server uses to confirm
   > purchases, so you need it either way.
7. Repeat steps 4–6 for the annual plan:
   - **Reference Name**: `Pro Annual`, **Product ID**: `pro_annual`
   - **Duration**: **1 Year**, **Price**: **£29.99**
   - Display Name `Volyume Pro (Annual)`, same kind of description.
   - **Introductory Offer**: same as step 6 — **Free for the first week**,
     Start Date today, **No End Date**, all countries.
8. Each subscription needs a **review screenshot** and a **review note** before
   Apple will approve it (a box on the subscription page). A screenshot of the
   in-app paywall is fine; you can add it when you do the app screenshots in
   Phase 6.

> The product IDs **must** be `pro_monthly` and `pro_annual` — the app asks the
> App Store for exactly those names. A typo here = "product not found" at the
> paywall.

---

# PHASE 4 — The App Store Connect API key (lets our server confirm purchases)

When someone buys, our server asks Apple "is this real?" before granting Pro.
That uses an **App Store Connect API key (Team Key)** — the same *type* of key
you created for the iOS build. The server token the app builds uses this key's
**Issuer ID + Key ID + the bundle id**, which is exactly the App Store Connect
API shape, so the code already matches it.

> **You may already have this key.** The iOS build setup created an App Store
> Connect API Team Key (its three values are the `ASC_API_KEY_P8`, `ASC_KEY_ID`,
> `ASC_ISSUER_ID` GitHub secrets). If you still have that **`.p8`** file you
> downloaded back then, you can reuse it here — skip to 4b and use the same Key
> ID, Issuer ID and `.p8`. The `.p8` only downloads once, so if you don't have
> the file any more, generate a fresh key below (having two keys is fine).

1. **App Store Connect** → **Users and Access** (top nav) → **Integrations** tab.
2. In the left list choose **App Store Connect API** → the **Team Keys** tab.
3. Click the **+** / **Generate API Key**. Name it `volyume-server`, give it the
   **Admin** access role (so it can call the App Store Server API), **Generate**.
4. Three things to copy — the file downloads only once:
   - Click **Download** to get the **`.p8`** file. Open it in TextEdit/Notepad;
     it's a few lines starting `-----BEGIN PRIVATE KEY-----`. You'll paste the
     whole text shortly.
   - Note the **Key ID** (a 10-character code next to the key).
   - Note the **Issuer ID** (a long UUID shown at the **top** of this Team Keys
     page — the same Issuer ID your build key already uses).

### 4b. Put those three values into Supabase (so the function can use them)

You did this same screen for the Google keys, so it'll be familiar.

1. **Supabase dashboard** → your project → **Project Settings** (gear, bottom
   left) → **Edge Functions** → **Secrets** (a section titled "Function
   Secrets" / "Add new secret").
2. Add these three secrets (Name on the left exactly as written, Value on the
   right):
   - `APP_STORE_ISSUER_ID` = the Issuer ID (the long UUID)
   - `APP_STORE_KEY_ID` = the 10-character Key ID
   - `APP_STORE_PRIVATE_KEY` = paste the **entire** contents of the `.p8` file
     (including the `-----BEGIN/END PRIVATE KEY-----` lines)
3. Save. (`APP_STORE_BUNDLE_ID` is optional; it defaults to `app.volyume`.)

> The two server functions (`app-store-verify`, `app-store-notifications`)
> deploy automatically when this branch reaches `main`. Until these three
> secrets are set they run safely and just log "can't verify" instead of
> granting — so setting them is what switches purchases on.

---

# PHASE 5 — Point Apple's renewal notifications at our server

This is how cancellations, renewals and refunds keep the app in sync (Apple's
version of the Google "RTDN" you already set up).

1. **App Store Connect** → **Apps** → **Volyume** → left sidebar **General** →
   **App Information**.
2. Scroll to **App Store Server Notifications**.
3. Set **Version** to **Version 2** (very important — Version 1 won't work).
4. **Production Server URL** → paste:
   `https://sujrylzzxcqxxfygptns.supabase.co/functions/v1/app-store-notifications`
5. **Sandbox Server URL** → paste the **same** URL.
6. Save. (There may be a "Send Test Notification" button — you can use it after
   Phase 7's build is live to confirm wiring.)

---

# PHASE 6 — The store listing (screenshots, icon, ratings, privacy)

Apple won't let you submit until these exist. None are code.

1. **App Store Connect** → **Apps** → **Volyume**. On the left you'll see your
   version (e.g. **1.2.0**). Click it.
2. **Screenshots** — you need at least one set for the **6.9-inch iPhone**
   (that's iPhone 16 Pro Max size, **1320 × 2868** pixels, portrait, PNG/JPEG,
   **no transparency**). 3–5 good ones is plenty. Take them on a device or
   simulator, drag them into the "iPhone 6.9" Display" box. (iPad is not
   needed — the app is iPhone-only.)
3. **App icon** — Apple takes the 1024×1024 icon from the build automatically;
   you don't upload it separately. Just make sure the build's icon has **no
   transparency** (ours is fine).
4. **Description / Keywords / Subtitle / Promotional text** — copy from
   `docs/APP_STORE_CONNECT_LISTING.md` in this repo.
5. **Support URL** (required): `https://volyume.app/support` — this page must
   load. If it doesn't exist yet, tell me and I'll add it next to the privacy
   page. **Privacy Policy URL**: `https://volyume.app/privacy` (already live).
6. **Age Rating** — left sidebar → **Age Rating** → answer the questionnaire
   honestly (health/body data → it'll come out around 12+). Save.
7. **App Privacy** — left sidebar → **App Privacy** → **Get Started** /
   **Edit**. Declare the data the app collects. Safe answer set: Health &
   Fitness, Contact Info (email), Identifiers, User Content, Usage Data,
   Diagnostics, Purchases. **Do not** declare Location. (Detail in
   `docs/appstore-readiness-2026-06-06/appstore-02-privacy-audit.md`.)
8. **Primary Category**: Health & Fitness. **Secondary**: Sports.

---

# PHASE 7 — Build and send it to your phone

Now the automated part. The build pipeline is already set up.

1. Go to the repo on GitHub → **Actions** tab → **Build iOS (EAS)** workflow →
   **Run workflow** (leave "Submit to TestFlight" ticked) → **Run**.
   - (Or: once this branch is merged to `main`, a build runs automatically.)
2. It takes ~20–40 min. When it finishes green, the build has been sent to
   TestFlight.
3. **App Store Connect** → **Volyume** → **TestFlight** tab. The build shows
   "Processing" for ~15 min, then is ready.
   - If it says **"Missing Compliance"**, click it and answer the encryption
     question — choose the exemption (the app only uses standard HTTPS). *(We
     already set the flag for this, so it should not appear, but if it does,
     that's the answer.)*
4. Under **Internal Testing**, add **yourself** as a tester (your Apple email).
5. On your iPhone, install the **TestFlight** app from the App Store, open the
   invite email, accept, and install Volyume.

---

# PHASE 8 — Test on your phone before going public

Use a **Sandbox** Apple account for purchase testing so you're not charged
(App Store Connect → **Users and Access** → **Sandbox** → **Testers** → add a
test email; sign into it on the phone under Settings → App Store → Sandbox
Account when prompted during a test purchase).

Check, in the TestFlight build:
1. **Sign in with Apple** — tap "Continue with Apple", the native sheet appears,
   you land signed in.
2. **Purchase** — go Pro, pick a plan, complete the sandbox purchase. Pro should
   unlock. (Behind the scenes the app calls `app-store-verify`, which checks
   with Apple and grants Pro.)
3. **Restore** — delete + reinstall, "Restore Purchases", Pro comes back.
4. (Optional) In App Store Connect's App Store Server Notifications section,
   **Send Test Notification** and confirm it returns success.

If a purchase doesn't unlock Pro: check **Supabase → Edge Functions →
app-store-verify → Logs**. The log lines (prefixed `[app-store]`) tell you which
step failed (usually a missing Phase 4 secret).

---

# PHASE 9 — Submit for App Store review (go live)

1. **App Store Connect** → **Volyume** → your version (1.2.0).
2. Make sure every section has a green tick (screenshots, description, age
   rating, privacy, the two subscriptions attached, build selected).
3. Under **Build**, click **+** / **Select a build** and pick the TestFlight
   build you tested.
4. Fill **App Review Information** → give Apple a **demo account** (an email +
   password they can sign in with) and notes ("Tap Continue with Apple or use
   the demo login; Pro features unlock after subscribing").
5. Click **Add for Review** → **Submit**.
6. Review usually takes 24–48 h. If rejected, the reason appears in the
   **Resolution Center** in App Store Connect — send it to me and I'll fix it.

---

## Quick "what blocks what" summary

- **Submission keeps failing right now** → Phase 1 (agreements).
- **Apple sign-in button does nothing** → Phase 2.
- **Paywall says "product not found"** → Phase 3 (and exact product IDs).
- **Purchase succeeds but Pro doesn't unlock** → Phase 4 (the three secrets).
- **Renewals/cancellations don't update the app** → Phase 5.
- **Can't even press Submit** → Phase 6 (listing assets).

Anything in here that's unclear when you're in front of the screen, tell me
which phase + step number and I'll talk you through that exact screen.
