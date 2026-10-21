# Sign-in setup (Batch 4, item 2)

Owner steps for Apple and Google on both iPhone and Android, automatic
same-email joining, and Account > Sign-in methods. Nothing here is automatic:
the app code is ready, these console steps and one native build finish it.

Needs a NATIVE build (app.json plugin option changed). The owner starts that
build; it is not started here.

## 1. Google on iPhone (Google Cloud + app.json + code)

1. Google Cloud Console > the project that holds the existing Web and Android
   OAuth clients > APIs and Services > Credentials > Create credentials >
   OAuth client ID > Application type iOS.
2. Bundle ID: `app.volyume`. Create it.
3. Copy the **iOS client ID** (looks like
   `1234567890-abc.apps.googleusercontent.com`).
4. In `app.json`, replace `REPLACE_WITH_IOS_CLIENT_ID` in the
   `iosUrlScheme` plugin option with the reversed form. For the id above the
   value is `com.googleusercontent.apps.1234567890-abc` (the client ID with
   `.apps.googleusercontent.com` reversed to the front).
5. In `src/lib/supabase.js`, set `GOOGLE_IOS_CLIENT_ID` to the full iOS client
   ID from step 3. Until it is set, Google on iPhone shows a calm "not
   available on this build yet" message.
6. Supabase Dashboard > Authentication > Providers > Google > add the iOS
   client ID to **Authorized Client IDs** (comma separated, after the Web
   client ID already there), so `signInWithIdToken` accepts iPhone tokens.
7. Make a new iOS build (native change).

## 2. Apple on Android (web OAuth, Apple Developer + Supabase)

Apple on Android uses the existing web flow (no native module).

1. Apple Developer > Certificates, Identifiers and Profiles > Identifiers >
   add a **Services ID** (for example `app.volyume.signin`). Enable Sign in
   with Apple, Configure, choose the primary App ID `app.volyume`.
2. Domains and Subdomains: `<project-ref>.supabase.co`. Return URL:
   `https://<project-ref>.supabase.co/auth/v1/callback`. Save.
3. Keys > add a key with Sign in with Apple enabled, primary App ID
   `app.volyume`. Download the `.p8` once. Note the Key ID and your Team ID.
4. Supabase Dashboard > Authentication > Providers > Apple: enable it, set
   **Client IDs** to `app.volyume,app.volyume.signin` (bundle ID for native
   iPhone first, Services ID for the web flow), and paste the secret key
   generated from the `.p8`, Key ID, Team ID and Services ID (Supabase docs:
   "Generate a client secret"). Apple secrets expire after at most six
   months: put a reminder in the calendar to regenerate.
5. Supabase Dashboard > Authentication > URL Configuration > Redirect URLs:
   confirm `volyume://` is listed (it already is for Google web OAuth).

## 3. Joining accounts and linking (Supabase Authentication settings)

1. **Automatic same-email linking**: Supabase links a new sign-in to an
   existing user when the provider returns the same **verified** email. This
   is the default; confirm in Authentication > Sign In / Providers that
   "Allow new users to sign up" is on and that email confirmation is
   required (so an unverified email never joins an account). Apple "Hide my
   email" gives a relay address that cannot match, so those people use Apple
   to sign in (the sign-in screen says so).
2. **Manual linking** (needed for Account > Sign-in methods): Authentication >
   Sign In / Providers > turn on **Enable Manual Linking**. Without it,
   adding or removing a method answers with an error and the app shows a calm
   "Could not add ..." message.
3. Password reset: Authentication > Email Templates > Reset Password keeps its
   current link. The recovery link opens the new Set a new password screen
   after the person is signed in and through consent.

## Not covered

No remote switch exists for any of this. No anonymous mode and no local-user
migration (IDENTITY_AND_OWNERSHIP_LOCKED). Linking never changes the user id.
