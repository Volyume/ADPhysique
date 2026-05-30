# Volyume Google OAuth branding audit

Date: 2026-05-30. Research and recommendation pass. No app code was
changed. The only file produced is this document.

Scope: make the Google sign-in flow show Volyume / volyume.app rather
than a Supabase URL, at the lowest sensible cost, working on both iOS
and Android in React Native + Expo.

---

## Executive summary

The problem is two separate surfaces that get blurred together:

1. **The Google consent screen** (the "Sign in to continue to X"
   page hosted by Google). Today X reads as the Supabase project
   domain, something like `abcd1234.supabase.co`, because the Google
   OAuth client has never been brand-verified. This is the surface
   the user actually reads and judges. It is fixable for free.
2. **The in-app browser URL bar** during the brief redirect hop.
   Volyume opens the flow with `expo-web-browser`, so for a moment
   the address bar can show `...supabase.co/auth/v1/authorize`. This
   surface is cosmetic, short-lived, and only fully removable by a
   paid Supabase custom domain or a fragile proxy.

The single most important fact: **the Supabase URL on the consent
screen is controlled by Google's brand-verification state, not by
the redirect URL.** Verifying Volyume's brand in the Google Cloud
console (app name, logo, support email, plus ownership of
volyume.app proved in Search Console) replaces the project-ref
domain with "Volyume" and the logo. This costs nothing. Supabase's
own Google doc confirms the consent screen shows
`<project-id>.supabase.co` until you brand and verify, and that the
default scopes are non-sensitive (`openid`, `email`, `profile`), so
this is the light brand-verification path, not the slow
sensitive-scope security review.

**Recommended fix (free):** complete Google OAuth brand verification
for the existing OAuth client. After it lands the consent screen
reads "Sign in to Volyume" with the Volyume logo on iOS and Android.
The only residual Supabase text is a sub-second redirect URL most
users never read. No app code change is required.

**What the user sees after the free fix:**
1. Taps "Continue with Google" in Volyume.
2. The in-app browser opens. A brief flash may show a supabase.co
   URL in the address bar.
3. Google's account picker reads "Sign in to Volyume", Volyume logo,
   support email, and a link to volyume.app. No raw project domain.
4. Picks an account, the sheet closes on `volyume://`, lands back in
   the app signed in.

**If Al wants the address-bar flash gone too:** the clean route is
Supabase Custom Domains, which needs the Pro plan ($25/month) plus
the custom-domain add-on ($10/month), so $35/month ongoing. That
moves the auth host to `auth.volyume.app`. It is the only fully
clean, production-grade way to remove the supabase.co string
everywhere. Given Volyume's budget posture, the free brand
verification is the right first move and very likely all that is
needed.

---

## Internal audit

Repo state at audit time: branch `main`, HEAD
`dd7c838`, working tree clean, `origin/main` equal to HEAD (0 ahead,
0 behind). `git fetch` could not reach the network in this
environment, so the comparison is against the local ref for
`origin/main`; the SHAs match.

### How the OAuth flow is wired today

The flow lives in `src/lib/supabase.js`. The relevant constant and
function:

- `src/lib/supabase.js:111` sets the redirect target:
  `const OAUTH_REDIRECT_URL = 'volyume://';`
- `src/lib/supabase.js:113-156` is `_signInWithOAuthProvider`. It:
  - calls `c.auth.signInWithOAuth({ provider, options: { redirectTo:
    OAUTH_REDIRECT_URL, skipBrowserRedirect: true } })`
    (`src/lib/supabase.js:122-128`),
  - takes the returned `data.url` (a `*.supabase.co/auth/v1/authorize?...`
    URL) and opens it with
    `WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URL)`
    (`src/lib/supabase.js:136-137`),
  - on success, parses `?code=` from the result URL and calls
    `exchangeCodeForSession` as a backup
    (`src/lib/supabase.js:139-147`).
- `src/lib/supabase.js:158-160` exposes `signInWithGoogle()`;
  `:162-169` exposes `signInWithApple()`.
- The header comment at `src/lib/supabase.js:94-109` documents the
  exact five-step flow and the requirement that `volyume://` be in
  the Supabase Allowed Redirect URLs.

The Supabase client is created with `detectSessionInUrl: false`
(`src/lib/supabase.js:36`), correct for React Native, and uses
SecureStore for the session (`src/lib/supabase.js:31-37`).

### Where the deep link is handled

`App.js` handles the return hop:

- `handleAuthDeepLink(url)` at `App.js:133-164` accepts both
  `volyume://` and `https://volyume.app` URLs (`App.js:135`),
  supports PKCE (`?code=` then `exchangeCodeForSession`,
  `App.js:140-143`) and the implicit fallback (`#access_token=...`
  then `setSession`, `App.js:146-162`).
- Listeners are registered at `App.js:342-343`:
  `Linking.getInitialURL()` and `Linking.addEventListener('url', ...)`.

So there are two code paths that can complete the exchange: the
in-flow handler in `supabase.js` and the global deep-link handler in
`App.js`. Both target `volyume://`.

### Where the OAuth buttons live

- `src/screens/LoginScreen.js:19` imports `signInWithGoogle` /
  `signInWithApple`; `handleOAuth(provider)` at
  `LoginScreen.js:180-189`; Google button at `LoginScreen.js:281`,
  Apple at `:270`.
- `src/screens/ProUpgradeScreen.js:11` imports the same functions;
  `handleOAuth` at `:68-73`; buttons at `:272` (Apple) and `:283`
  (Google).
- `src/screens/ProOnboardingScreen.js:17` imports them;
  `handleOAuthOnboarding` at `:233-241`; buttons at `:582` (Apple)
  and `:593` (Google).

All three screens funnel into the one `_signInWithOAuthProvider`
helper, so a config-only fix needs no screen changes.

### Deep-link and domain config

`app.json`:
- `scheme: "volyume"` (`app.json:5`).
- iOS `associatedDomains: ["applinks:volyume.app"]`
  (`app.json:25-27`).
- Android intent filters for both the `volyume` scheme
  (`app.json:60-73`) and `https` host `volyume.app` with
  `autoVerify: true` (`app.json:74-87`).

`public/`:
- `public/CNAME` contains `volyume.app` (GitHub Pages custom domain).
- `public/.well-known/assetlinks.json` exists but the SHA-256
  fingerprint is still the placeholder
  `REPLACE_WITH_SHA256_OF_UPLOAD_KEY_CERT`. Android App Links
  auto-verify will fail until that is the real Play upload-key
  fingerprint. This does not affect the OAuth fix, the flow returns
  via the `volyume://` custom scheme, not the App Link.
- `public/.well-known/README.md` confirms the apple-app-site-
  association file is not shipped (iOS deferred) and that
  `volyume://` deep links work regardless of Play-side verification.

### Supabase / DNS config inferred from docs

- `DOMAIN_SETUP.md:22-43`: Site URL `https://volyume.app`; Allowed
  Redirect URLs listed as `volyume://`, `https://volyume.app/**`,
  `https://volyume.app/auth/callback`. The app uses `volyume://`.
- `DOMAIN_SETUP.md:41`, `.env.example:1-3`,
  `INFRASTRUCTURE.md:380-381`: the project URL is the standard
  `https://<project-id>.supabase.co` form, fed in via
  `EXPO_PUBLIC_SUPABASE_URL`. No Supabase custom domain is
  configured anywhere in the repo.
- `INFRASTRUCTURE.md:406`: a checklist item still open notes the
  Google Cloud OAuth client should be created with the Play App
  Signing SHA-1 (provided by Play Console after first upload). This
  is the Android OAuth client wiring, separate from brand
  verification.
- `INFRASTRUCTURE.md:40`: confirms auth is Supabase email/password +
  Google OAuth + Apple OAuth, deep link `volyume://`.

There is no existing custom-domain or proxy config in the repo. The
Google Cloud consent-screen config cannot be read from the repo
(it lives in the Google Cloud console), but its symptom is the
reported one, so it is almost certainly unverified.

### What the user sees today, step by step

1. User taps "Continue with Google" on Login, ProUpgrade, or
   ProOnboarding.
2. `signInWithOAuth` returns a `https://<project-id>.supabase.co/
   auth/v1/authorize?...` URL.
3. `openAuthSessionAsync` opens that URL in the in-app browser.
   **Ugliness surface A:** the address bar can briefly show
   `<project-id>.supabase.co`.
4. Google takes over and shows the account picker / consent screen.
   Because the OAuth client is unverified, it reads roughly "to
   continue to `<project-id>.supabase.co`". **Ugliness surface B,
   the one that matters:** the user sees a Supabase domain where
   they expect "Volyume".
5. User picks an account, Google redirects to
   `<project-id>.supabase.co/auth/v1/callback`, which 302s to
   `volyume://?code=...`.
6. The OS routes `volyume://` to the app, the sheet auto-closes,
   `exchangeCodeForSession` runs, the session lands, and the
   `onAuthStateChange` listener routes the user on.

The flow works. The branding problem is surface B (consent screen,
fixable free) plus a flash of surface A (address bar, fixable only
with paid custom domain or a proxy).

---

## Research

Note on method: outbound `git fetch` was blocked, but general web
search and most page fetches worked. The Supabase Custom Domains
docs page and the Google branding support page both returned HTTP
403 to the fetch tool; their content below is drawn from the live
search-result summaries and from training knowledge, and is flagged
where it could not be fetched verbatim. The Supabase Google
social-login doc was fetched directly from the GitHub raw source
and is quoted.

### 1. Google OAuth consent screen: what it shows and what controls it

The consent screen branding (app name, logo, support email, app
home page, links) is set in the Google Cloud console under APIs &
Services, the OAuth / Google Auth Platform "Branding" section. Two
states matter:

- **Unverified:** Google does not trust the app name or logo yet, so
  it falls back to showing the application domain, in Supabase's case
  the `<project-id>.supabase.co` redirect/host domain. This is
  exactly the reported symptom. The Supabase GitHub issue #33387
  describes it precisely: the consent screen "displays the Supabase
  project URL instead of the app name" even though "All OAuth
  configuration in Google Cloud Console is correct (app name, logo,
  homepage URL)". Correct config alone is not enough; verification
  is the gate.
- **Verified:** after brand verification, Google shows the app name
  ("Volyume") and logo instead of the domain.

Google support: "Without verification, only your application domain
will be visible to users. In order for your app name and/or logo to
be displayed, you must submit your app for verification."

Authorized domains and domain verification:
- The OAuth consent screen's "Authorized domains" list must contain
  the top-private domains used in the app's URIs: home page, privacy
  policy, terms, and the redirect URIs / JavaScript origins. For
  Volyume that means **both** `volyume.app` and the Supabase project
  domain `<project-id>.supabase.co`.
- You verify ownership of `volyume.app` in Google Search Console,
  using a Google account that is an Owner or Editor on the Cloud
  project. Volyume already controls volyume.app DNS (GitHub Pages via
  `public/CNAME`), so a DNS TXT or HTML-file verification is
  straightforward.
- For the supabase.co entry, which Volyume does not own, the standard
  guidance during verification is to reply to Google's verification
  email stating it is a third-party redirect domain
  (Supabase) that the app integrates with but does not own.

Does branding + verification resolve the perceived problem regardless
of redirect URL? **Yes for the consent screen.** The redirect URL can
remain supabase.co; once the brand is verified Google shows "Volyume"
on the page the user reads. It does **not** change the address-bar
string during the redirect hop.

Scope and verification weight: the Supabase Google doc confirms the
default requested scopes are `openid`, `.../userinfo.email`,
`.../userinfo.profile`, which are non-sensitive. That means this is
the lighter **brand verification** path (logo and name review),
typically 2 to 3 business days, not the heavy sensitive/restricted
scope security assessment that can take weeks. Do not add extra
scopes, or you trip the slow path.

Quoted from the Supabase Google social-login doc: without a custom
domain "users will see `<project-id>.supabase.co` which does not
inspire trust and can make your application more susceptible to
successful phishing attempts", and "Brand verification is not
automatic and may take a few business days."

### 2. Supabase custom domain

What it does: routes Supabase auth (and API) through a vanity host
you own, for example `auth.volyume.app`, instead of
`<project-id>.supabase.co`. That changes the OAuth `authorize` and
`callback` host, so the address-bar flash and any residual
supabase.co string become `auth.volyume.app`. Combined with Google
brand verification it produces a fully branded flow with no
supabase.co anywhere.

Plan and pricing (2026, from live search): requires the **Pro plan
at $25/month**, plus the **Custom Domain add-on at $10/month**,
billed in full (not usage-prorated). So roughly **$35/month
ongoing**. The Supabase Custom Domains docs page returned 403 to the
fetch tool, so the exact configuration steps are from training
knowledge: you set the vanity subdomain via the Supabase CLI
(`supabase domains create` / `--experimental`) or the dashboard, add
the CNAME and a TXT record at your DNS provider, then activate.
There is no official free tier for custom domains.

Free workaround: none that is officially supported. The community
route is a reverse proxy (next section), which is not the same thing
and carries real caveats.

Technically, pointing it at `auth.volyume.app` would mean: create the
custom domain in Supabase, add the CNAME at the volyume.app DNS,
update `EXPO_PUBLIC_SUPABASE_URL` to the vanity host, and add the new
host to the Google OAuth client's authorized redirect URIs and
authorized domains.

### 3. Free proxy / redirect approaches (Cloudflare Worker, Vercel Edge)

Feasibility: a Cloudflare Worker (free tier, 100,000 requests/day)
or a Vercel Edge Function can sit on `auth.volyume.app` and forward
requests to `<project-id>.supabase.co`, rewriting the host so the
user only ever sees volyume.app. Community guides exist, mostly
written to bypass ISP-level Supabase blocks in India, and they
explicitly cover Auth: you must add the Worker URL to Supabase's
Allowed Redirect URLs and rewrite email-template links to the proxy.

Reliability for production OAuth: this is the weak point. Proxying
Supabase Auth (GoTrue) means correctly forwarding cookies, the
`Location` headers on the 302 redirects, the PKCE `code` exchange,
and CORS. OAuth is sensitive to host and redirect mismatches: if the
proxy rewrites a `Location` header inconsistently, or Google's
registered redirect URI does not exactly match what GoTrue emits, the
flow breaks. It is doable but it is a bespoke piece of
runtime-critical infrastructure that you then own, monitor, and debug.
For a solo founder this is more operational risk than the address-bar
flash is worth.

What the user sees: with a working proxy, both the address bar and
(after Google brand verification) the consent screen show
volyume.app. Cost: free on Cloudflare's tier at Volyume's volume.
Complexity: high. iOS/Android: no app-side difference, the app just
points `EXPO_PUBLIC_SUPABASE_URL` at the proxy host.

### 4. React Native deep linking / custom URI schemes as the redirect

Volyume already uses `volyume://` as `redirectTo`
(`src/lib/supabase.js:111`) and has the scheme plus
`applinks:volyume.app` / Android App Link intent filters wired in
`app.json`. This is the right RN pattern and it is the reason the
return hop is already branded: the final redirect the OS catches is
`volyume://`, not a supabase URL.

But the custom scheme only controls the **final** hop back into the
app. It does not change the `authorize`/`callback` hops that run on
the supabase.co host in the middle, and it has nothing to do with
what Google prints on the consent screen. So the existing
`volyume://` setup is necessary and correct, but it cannot on its own
remove the supabase.co surfaces. Using a Universal Link
(`https://volyume.app/...`) as the redirect target instead of
`volyume://` would not help the branding problem either; it would
add App Links verification work (the assetlinks fingerprint is still
a placeholder) for no branding gain.

### 5. Any other viable method

- **Native Google Sign-In SDK** (for example
  `@react-native-google-signin/google-signin`) with Supabase
  `signInWithIdToken`. This shows the OS-native Google account
  sheet, which is Google-branded and never shows a supabase.co URL or
  an in-app browser at all. It is arguably the most polished result,
  but it is a code change (new native dependency, new sign-in path,
  config for iOS and Android client IDs) and out of scope for a
  config-only fix. Worth noting as a future enhancement, not a quick
  branding fix. It still benefits from brand verification for the
  account-chooser app name.
- **Custom SMTP** (`DOMAIN_SETUP.md:47-64`) only affects auth emails,
  not the OAuth consent screen, so it is irrelevant to this problem.

---

## Comparison

| Approach | What the user sees | Cost | Complexity | Reliability | iOS + Android | volyume.app / Volyume branding |
|---|---|---|---|---|---|---|
| **Google brand verification** (recommended) | Consent screen reads "Sign in to Volyume" + logo. Address bar may still flash supabase.co for under a second. | Free | Low. Console config + Search Console domain proof + one email reply. No code. | High. Standard Google path, nothing bespoke to maintain. | Identical on both. No app change. | Strong on the screen the user reads. Logo + name + volyume.app links. |
| **Supabase Custom Domain** (auth.volyume.app) | supabase.co gone everywhere, including the address bar. Consent screen still needs verification to show name+logo. | $25/mo Pro + $10/mo add-on = ~$35/mo ongoing | Medium. DNS CNAME/TXT + CLI/dashboard + update env + Google client redirect URIs. | High. Officially supported. | Identical on both. | Full. auth.volyume.app + Volyume name once verified. |
| **Cloudflare Worker / Vercel proxy** | supabase.co gone if the proxy is solid. Consent screen still needs verification. | Free (CF free tier) | High. Bespoke OAuth proxy you own and debug. | Medium. OAuth redirect/cookie/header rewriting is fragile. | Identical app-side. | Full if it works, fragile. |
| **Native Google Sign-In SDK** | Native OS Google sheet, no browser, no supabase.co at all. | Free (libraries) | Medium-High. New native dep + new code path + iOS/Android client IDs. Out of scope here. | High once built. | Both, with per-platform config. | Strong. No supabase.co surface. |
| **volyume:// scheme alone** (already in place) | Only the final return hop is branded. Mid-flow and consent screen still show supabase.co. | Free | Already done | High | Both | Partial. Does not fix the consent screen. |

Plain-language tradeoff: the cheap, low-risk move (brand
verification) fixes the surface the user actually reads, for free,
with no code. The expensive move (custom domain) additionally scrubs
a sub-second address-bar flash that most users never notice. The
free proxy can match the custom domain visually but you take on
fragile OAuth plumbing. The native SDK is the nicest end result but
it is a build, not a config tweak.

---

## Recommended approach

**Do Google OAuth brand verification for the existing OAuth client.
Free, no code, fixes the surface that matters.**

What the user sees after the fix:
1. Taps "Continue with Google".
2. In-app browser opens (brief, possibly a supabase.co flash in the
   address bar).
3. Google account picker reads "Sign in to Volyume", Volyume logo,
   support email, link to volyume.app.
4. Picks account, sheet closes on `volyume://`, signed in.

### Exactly what to configure

Google Cloud console (the project that owns the OAuth client used by
Supabase):
1. APIs & Services, OAuth consent screen / Branding. Set:
   - App name: `Volyume`
   - App logo: the Volyume mark (square, meets Google's size rules)
   - User support email
   - App home page: `https://volyume.app`
   - Privacy policy: `https://volyume.app/privacy` (already the
     canonical URL per `src/lib/links.js:19`)
   - Terms of service: a volyume.app URL if one exists
2. Authorized domains: add `volyume.app` **and** the Supabase project
   domain `<project-id>.supabase.co`.
3. User type: External. Publishing status: In production (not
   Testing, or you stay capped at 100 users and keep the unverified
   warning).
4. Confirm scopes are only `openid`, `email`, `profile`. Do not add
   more, that triggers the slow sensitive-scope review.

Domain ownership (Google Search Console):
5. Add and verify `volyume.app` in Search Console with the same
   Google account that owns/edits the Cloud project. DNS TXT
   verification is easiest since Volyume controls the DNS.

Submit and respond:
6. Submit for brand verification.
7. When Google emails about the supabase.co authorized domain, reply
   that it is a third-party redirect/integration domain (Supabase)
   that the app uses but does not own.

Supabase: no change required. Site URL and redirect URLs already fit
(`DOMAIN_SETUP.md:22-43`).

volyume.app DNS/hosting: one TXT record for Search Console
verification. Nothing else.

React Native app code: **no change.** The existing `volyume://`
redirect and deep-link handling are correct.

### Implementation order
1. Confirm which Google Cloud project owns the OAuth client wired
   into Supabase (Authentication, Providers, Google).
2. Fill in Branding fields.
3. Add both authorized domains.
4. Verify volyume.app in Search Console.
5. Set publishing status to In production.
6. Submit for verification, reply to the third-party-domain email.
7. Wait 2 to 3 business days, re-test on a real iOS and Android
   device.

### Gotchas
- Correct app name + logo without verification will NOT fix it; the
  GitHub issue #33387 shows that exact trap. Verification is the gate.
- Staying in Testing status keeps the 100-user cap and the unverified
  screen. Move to In production.
- Adding extra OAuth scopes flips you to the slow security review.
- Brand verification fixes the consent screen only. The address-bar
  flash remains; that is expected and acceptable.
- Unrelated but worth fixing before any Android App Link work: the
  assetlinks.json fingerprint is still the placeholder
  (`public/.well-known/assetlinks.json`). It does not block this
  OAuth fix because the flow returns via `volyume://`.

### If a fully clean result is wanted (what the paid version adds)
The free brand verification gives a branded consent screen and leaves
a sub-second supabase.co flash in the address bar. The paid Supabase
Custom Domain ($25/mo Pro + $10/mo add-on = ~$35/mo) additionally
removes that flash by moving auth to `auth.volyume.app`. Given
Volyume's budget posture and that the flash is on a surface users do
not read, the paid step is hard to justify until there is evidence
users notice it. Start free.

---

## Alternative approach (second-best, free)

If, after brand verification, the address-bar flash is judged a real
problem and paying is off the table, the next free option is a
**Cloudflare Worker reverse proxy** on `auth.volyume.app` forwarding
to the Supabase host, with `EXPO_PUBLIC_SUPABASE_URL` repointed at the
proxy and the proxy host added to Supabase's redirect URLs and the
Google client's authorized redirect URIs. Free on Cloudflare's tier
at Volyume's volume. The cost is operational: you own a piece of
runtime-critical OAuth plumbing that can break on header/cookie/
redirect rewriting, which under the project's own engineering rules
(runtime-critical systems, tests alongside changes) is a meaningful
commitment. Recommend only if the flash genuinely matters and paying
is ruled out.

A separate, nicer-but-larger alternative is the native Google
Sign-In SDK with `signInWithIdToken`, which removes the browser and
the supabase.co surface entirely. That is a code change and a future
enhancement, not a config fix.

---

## Open questions

1. Which exact Google Cloud project and OAuth client are wired into
   the Supabase Google provider? Needs confirming in the Supabase
   dashboard before editing Branding. (Cannot be read from the repo.)
2. Is the OAuth consent screen currently in Testing or In production?
   This decides whether the 100-user cap is already biting.
3. Is there a published Terms of Service URL on volyume.app? Branding
   wants one; privacy is already at volyume.app/privacy.
4. Does the founder want the address-bar flash gone enough to pay
   ~$35/month, or is a branded consent screen sufficient?
5. The Supabase Custom Domains pricing here ($25 Pro + $10 add-on)
   comes from live search summaries; the docs page returned 403 to
   the fetch tool. Confirm current numbers on supabase.com/pricing
   before committing budget.

---

## Appendix: sources

Internal files cited (all under /home/user/ADPhysique):
- `src/lib/supabase.js` (OAuth flow: lines 94-169, redirect const 111)
- `App.js` (deep-link handler: lines 133-164, listeners 342-343)
- `src/screens/LoginScreen.js` (lines 19, 180-189, 270, 281)
- `src/screens/ProUpgradeScreen.js` (lines 11, 68-73, 272, 283)
- `src/screens/ProOnboardingScreen.js` (lines 17, 233-241, 582, 593)
- `src/lib/links.js` (privacy/marketing URLs: lines 19-25)
- `app.json` (scheme 5, associatedDomains 25-27, intent filters 60-87)
- `public/CNAME`, `public/.well-known/assetlinks.json`,
  `public/.well-known/README.md`
- `DOMAIN_SETUP.md` (lines 22-110), `INFRASTRUCTURE.md` (40, 380-381,
  406), `.env.example` (1-3)

External sources (live, 2026-05-30):
- Supabase, Login with Google (fetched from raw GitHub source):
  https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/social-login/auth-google.mdx
  and https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase issue #33387, consent screen shows project URL:
  https://github.com/supabase/supabase/issues/33387
- Supabase discussion #2532, Google Auth app name:
  https://github.com/orgs/supabase/discussions/2532
- Supascale, fix Supabase Google OAuth branding without custom
  domains (403 to fetch tool, used via search summary):
  https://www.supascale.app/blog/supabase-google-oauth-branding-without-custom-domain
- Supabase Custom Domains docs (403 to fetch tool, used via search
  summary): https://supabase.com/docs/guides/platform/custom-domains
- Supabase pricing: https://supabase.com/pricing
- Google, manage OAuth app branding (403 to fetch tool, used via
  search summary): https://support.google.com/cloud/answer/15549049
- Google, brand verification:
  https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification
- Google, when verification is not needed:
  https://support.google.com/cloud/answer/13464323
- Google, unverified apps:
  https://support.google.com/cloud/answer/7454865
- Cloudflare Worker Supabase proxy guides (Auth handling):
  https://jiobase.com/blog/self-host-supabase-proxy-tutorial and
  https://github.com/sunithvs/jiobase

Verification note: the Supabase Custom Domains docs page, the
Supascale blog, and the Google branding support page each returned
HTTP 403 to the fetch tool, so their specifics rest on live
search-result summaries plus training knowledge and are flagged as
such above. Everything quoted verbatim was fetched directly. The
Supabase Google social-login doc and the GitHub issue were fetched
successfully.
