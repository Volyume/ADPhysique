# Founder Setup Pack — accounts and grants for Volyume Marketing HQ

For the founder, to work through on a phone. Plain steps, in order. Do
these away from the gym if possible (some need a laptop for file
downloads) but most work fine on mobile.

**Rule that never changes:** no password, API key, or secret file ever
goes in chat or in the repo. Where a step produces a secret, the step
tells you exactly where it goes instead.

---

## Order of value — if you only do three things today

1. **Brevo** (Section 1) — unlocks email sending, currently off.
2. **Google Play promo codes** (Section 2) — unlocks reviewer/creator
   outreach immediately.
3. **r/Volyume** (Section 3) — unlocks the whole Reddit lane, the
   cheapest channel we have.
4. **Trustpilot business profile** (Section 3a) — free, a few minutes,
   unlocks the Trustpilot invitation line in the retention email loop and
   the review-poll watch on the page.

Everything else can wait a day or two; the platform approvals (Section 6)
are the exception — start those early because they take weeks to clear,
even though nothing depends on them today.

---

## 1. Brevo (email sending — free)

1. Go to brevo.com and sign up using the Volyume business email.
2. Verify the sender domain `volyume.app`: Brevo will show you a set of
   DNS records to add. Typically this is 2–3 DKIM CNAME records and one
   TXT record. Add them wherever volyume.app's DNS is managed (your
   domain registrar or DNS host). If you're not sure where that is, stop
   and say so rather than guessing.
3. Wait for Brevo to confirm the domain as verified (can take a few
   hours for DNS to propagate).
4. Create an API key: Settings → SMTP & API → API Keys → Generate a new
   API key. Name it something like `volyume-marketing-hq`.
5. **What to send back:** do NOT paste the key into chat or the repo.
   Add it as an environment secret in the Claude Code environment
   settings, name it exactly `BREVO_API_KEY`, then just tell the
   marketing session "Brevo API key added."

---

## 2. Google Play promo codes

1. Open Play Console → app.volyume → Monetise → Promotions.
2. Create promotion → Promo codes.
3. Select the `pro_monthly` subscription.
4. Quantity: 50.
5. Expiry: no end date, or the maximum Play allows if "no end date"
   isn't an option.
6. Confirm and download the CSV Play generates.
7. **What to send back:** paste the CSV contents into the marketing
   session, or attach the file. The codes will be loaded into the
   service-role-only promo pool table — nobody outside that table can
   read them.

---

## 3. r/Volyume (Reddit community)

1. Open the Reddit app or reddit.com.
2. Create a community: name it `Volyume`, type **Public**.
3. When asked for the topic, choose **Fitness**.
4. Leave the description and rules as placeholders for now — a ready
   pack (description, rules, welcome post) is prepared in
   `marketing/hq/copy-library/community/` and the next digest. Paste
   those in once they land rather than writing your own.
5. **What to send back:** confirm the subreddit exists and paste its
   URL (e.g. `reddit.com/r/Volyume`) into the marketing session.

---

## 3a. Trustpilot business profile (free)

1. Go to business.trustpilot.com and claim the profile for `volyume.app`.
2. Verify using the volyume.app email.
3. No paid plan is needed for this; skip any upsell offered during signup.
4. **What to send back:** the public Trustpilot page URL.

---

## 4. Quora account

1. Go to quora.com and sign up using your own founder identity — real
   name is best for credibility here.
2. Add a short bio that mentions you're the founder of Volyume. This is
   a disclosure requirement, not optional — never post as Volyume on
   Quora without it being clear you're the founder.
3. Answer drafts will arrive in future digests for you to review before
   posting; nothing auto-posts to Quora.
4. **What to send back:** confirm the account is set up.

---

## 5. Instagram, TikTok and YouTube accounts

Create all three using the volyume.app email (not your personal one).

1. **Username:** try `volyumeapp` first on each platform. If taken,
   fall back to `getvolyume`. Use the same one across all three
   platforms if possible for consistency.
2. **Instagram:** create the account, then switch it to a Professional
   (Business) account — Settings → Account type → switch to
   Professional Account → Business.
3. **TikTok:** create the account as normal; no special account type
   needed yet (Content Posting API approval is Section 6).
4. **YouTube:** create the channel under a **Brand Account**, not your
   personal Google account, so the app team can manage it without
   sharing your personal login.
5. **What to send back:** the handle actually chosen for each platform
   (they may differ if `volyumeapp` was taken on some but not others).

---

## 6. Platform developer approvals — start these now, they take weeks

These don't block anything today — until they clear, content packs are
pasted and posted manually. But approval queues are slow, so start them
in parallel with everything else.

1. **Meta (Instagram):**
   - Go to developers.facebook.com → create an app.
   - Add the Instagram Graph API product.
   - In App Review, request the `instagram_content_publish` permission.
2. **Google (YouTube):**
   - Go to console.cloud.google.com → create a new project.
   - Enable the **YouTube Data API v3**.
   - Set up the OAuth consent screen for that project.
3. **TikTok:**
   - Go to developers.tiktok.com → register as a developer.
   - Create an app and request the **Content Posting API**.
4. **What to send back:** confirm each of the three applications has
   been submitted (doesn't need to be approved yet, just submitted).

---

## 6a. Canva brand kit

1. Once the two marketing typefaces are confirmed (the display face —
   provisionally Schibsted Grotesk — and the monospace face — provisionally
   IBM Plex Mono — per `marketing/hq/MARKETING-VISUAL-IDENTITY-LOCKED.md`
   §3), set up a Volyume brand kit in Canva: either you do this directly in
   Canva, or the creative-designer agent does it in an interactive session
   once you confirm the fonts.
2. The brand kit holds: the locked palette (near-black `#0D0D0D`, surface
   tones, amber `#F5A623` as the one accent — no other colours available to
   select), the two locked fonts uploaded/selected as brand fonts, the
   device-frame components, and the decision-card template (locked spec §5
   and §10). Canva's free Brand Kit tier supports a palette plus
   uploaded/selected fonts, so no paid plan is needed for this step.
3. The aim is that Canva executes this locked system precisely, rather than
   supplying its own look — no asset should ever start from a stock Canva
   template.
4. **What to send back:** confirmation the brand kit exists in Canva (no
   credentials needed in chat or the repo).

---

## 7. Play Console API access (review replies + install metrics)

1. Play Console → Setup → API access.
2. Link a Google Cloud project (can be the same one from Section 6, or
   a new one — either works).
3. Create a service account with two permissions:
   - **Reply to reviews**
   - **View app information** (financial/statistics data)
4. Download the service account's JSON key file.
5. **What to send back:** do NOT paste the JSON into chat or the repo.
   Add its full contents as an environment secret in the Claude Code
   environment settings, name it exactly `PLAY_SERVICE_ACCOUNT_JSON`,
   then just tell the marketing session "Play service account JSON
   added."

---

## What happens after each item is confirmed

Once you confirm an item here (or add the matching secret), the
corresponding lane switches on automatically the next time the relevant
Routine fires — no further setup needed from you. `CHANNEL-INVENTORY.md`
and the dashboard track live status, so you can always check what's on
and what's still waiting on you.
