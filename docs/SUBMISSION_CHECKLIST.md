# Volyume — Play Store Beta Submission Checklist

_Complete every item before triggering the first internal test build._

---

## 1. Developer Account Setup

- [ ] Google Play developer account verified and active
- [ ] Payment profile set up (required even for free apps)
- [ ] App created in Play Console with package name `app.volyume`
- [ ] Developer identity confirmed (Google Play requires valid address)

---

## 2. Supabase — Before First Build

- [ ] **Run migrate_003_delete_rpc.sql** in Supabase SQL Editor
  - Go to: Supabase Dashboard > SQL Editor
  - Paste contents of `supabase/migrate_003_delete_rpc.sql` and run
  - Verify function appears under Database > Functions
- [ ] **Run migrate_004_schema_improvements.sql** in Supabase SQL Editor
  - Creates `weekly_checkins` table (required for GDPR delete RPC to work)
  - Adds `tension_at_stretch` column to exercises
  - Updates canonical exercise metadata
- [ ] **Rotate anon key** — the key in `.env` may have been seen in development
  - Go to: Project Settings > API > Anon key > Regenerate
  - Update `.env` with new key
- [ ] RLS policies active on all tables (verify in Supabase dashboard)
- [ ] Auth email templates customised (Settings > Auth > Email Templates)

---

## 3. EAS Build Setup

- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Log in: `eas login`
- [ ] Link project: `eas init` (this gives you the EAS project ID)
- [ ] Update `app.json` — replace `"your-eas-project-id"` with real ID from `eas init`
- [ ] Configure environment variables in EAS:
  ```bash
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxx.supabase.co"
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
  ```

---

## 4. Google Play Service Account (for EAS Submit)

- [ ] Create a service account in Google Cloud Console:
  1. Go to: console.cloud.google.com > IAM > Service Accounts
  2. Create account with role: Service Account User
  3. Download JSON key as `google-play-service-account.json`
  4. Add `.gitignore` entry: `google-play-service-account.json`
- [ ] Grant Play Console access:
  1. Go to: Play Console > Setup > API Access
  2. Link your Google Cloud project
  3. Grant the service account "Release manager" permissions
- [ ] Update `eas.json` submit config:
  ```json
  "serviceAccountKeyPath": "./google-play-service-account.json"
  ```

---

## 5. Store Listing (Play Console)

- [ ] App name entered: **Volyume — Hypertrophy Logbook**
- [ ] Short description added (see `docs/PLAY_STORE_LISTING.md`)
- [ ] Full description added (see `docs/PLAY_STORE_LISTING.md`)
- [ ] App icon uploaded (512 × 512 px, PNG)
- [ ] Feature graphic uploaded (1024 × 500 px)
- [ ] Minimum 2 screenshots uploaded (6 recommended)
- [ ] Category set: **Health & Fitness**
- [ ] Contact email set: support@volyume.app
- [ ] Privacy Policy URL added: https://volyume.app/privacy
  - Note: You need a hosted version of the Privacy Policy. Copy from
    `src/screens/PrivacyPolicyScreen.js` and publish at this URL.

---

## 6. Content Rating

- [ ] Complete content rating questionnaire in Play Console
- [ ] Target rating: PEGI 3 / Everyone
- [ ] Answer data safety questionnaire (answers in `docs/PLAY_STORE_LISTING.md`)

---

## 7. Build and Upload

```bash
# Production build (generates signed AAB)
eas build --platform android --profile production

# After build completes, submit to Play Console internal track
eas submit --platform android --profile production --latest
```

- [ ] Build completes without errors
- [ ] AAB uploaded to Play Console Internal Testing track
- [ ] Release notes entered (see `docs/PLAY_STORE_LISTING.md`)

---

## 8. Internal Testing

- [ ] Add tester emails in Play Console > Internal Testing > Testers
- [ ] Share opt-in URL with testers
- [ ] Confirm testers can install from Play Store
- [ ] Verify the app opens, account creation works, and basic workout logging works
- [ ] Confirm account deletion cascade works (test with a throwaway account)

---

## 9. Privacy Policy Hosting

The in-app privacy policy (`PrivacyPolicyScreen.js`) is ready, but Play Store also
requires a URL. Options:

- Host as a static page at `https://volyume.app/privacy`
- Use GitHub Pages with the markdown content
- Use a service like Termly or PrivacyPolicies.com as a temporary host

**This is required before Play Store submission.**

---

## 10. Beta to Production (Later)

When ready to move from internal testing to closed/open beta or production:

1. Complete all internal testing
2. Address any crashes from Play Console Android Vitals
3. Move to closed beta (limited invites)
4. Move to open beta (anyone can join)
5. Promote to production when confidence is high

_Note: When Pro goes paid, add Google Play Billing SDK and configure in-app
purchases in Play Console before the pricing change._
