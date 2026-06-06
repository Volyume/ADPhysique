# Phase 5: Sign in with Apple (Guideline 4.8)

Status: COMPLETE. Date 2026-06-06.

## Requirement
Guideline 4.8 requires offering an equivalent privacy-respecting login service
when the app uses a third-party/social login. Google sign-in is offered
(`LoginScreen`, `ProOnboardingScreen`), so this applies. The equivalent must:
limit collection to name + email, allow keeping the email private, and not track
for ads without consent. Sign in with Apple satisfies this.

## Current state
- An Apple option EXISTS and leads on iOS (shown above Google in
  `src/components/auth/OAuthButtons.js`, gated `Platform.OS === 'ios'`). Equal/
  greater prominence: satisfied.
- BUT `signInWithApple` (`src/lib/supabase.js`) is
  `_signInWithOAuthProvider('apple')`: a Supabase WEB OAuth redirect via the
  browser, not the native Sign in with Apple sheet. The code comment itself
  notes native (`expo-apple-authentication`) is "a future enhancement".
- The button is a CUSTOM Ionicons `logo-apple` button, not Apple's required Sign
  in with Apple button.
- No `com.apple.developer.applesignin` entitlement (confirmed in the generated
  entitlements), because the native flow is not used.

## Risks
1. Button styling: Apple rejects non-compliant Sign in with Apple buttons (must
   use Apple's button or follow the exact spec: corner radius, height, logo,
   wording, localisation). The custom Ionicons button is a likely rejection.
2. Web vs native: the web-OAuth Apple flow opens a browser rather than the native
   sheet. It is genuine Sign in with Apple and can pass, but it is a worse
   experience and a higher review risk, and depends on Apple OAuth being
   configured in Supabase with an Apple Services ID + return URL (UNVERIFIED; if
   not configured the Apple button errors, which is a 2.1 failure).

## Recommended fix (native)
Per `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` lines 374-381:
1. Add `expo-apple-authentication`; add the `applesignin` entitlement (Expo adds
   it when the plugin is configured).
2. Replace the iOS Apple button with `AppleAuthentication.AppleAuthenticationButton`
   (official component, correct style/locale), keep Google as secondary.
3. On press: native `signInAsync({ requestedScopes: [fullName, email] })` then
   Supabase `signInWithIdToken({ provider: 'apple', token: identityToken })`.
4. Handle first-time name/email capture (Apple returns these only once), credential
   state check on launch (`getCredentialStateAsync`), and revocation.
5. Keep the web-OAuth path as the Android/non-iOS fallback (Apple sign-in is not
   required on Android).

## Severity
HIGH. Either implement native Sign in with Apple (recommended), or at minimum
verify the Supabase Apple web flow works AND replace the custom button with a
compliant Apple button before submission. The Apple option must function and look
right, or 4.8 + 2.1 reject.
