# Growth Ledger

Append-only record of every marketing action and result. Will migrate to the Supabase `marketing_ledger` table once the schema lands; this file then holds only the bootstrap entries.

## Ledger

| Date | Action | Channel | Cost | Result | Notes |
|------|--------|---------|------|--------|-------|
| 2026-07-12 | Marketing HQ system build started; governing documents authored (PRODUCT-FACTS, CLAIMS-STANDARDS, OPERATING-CHARTER) | internal | £0 | Foundation laid | Built by the founding session |
| 2026-07-12 | Founder decision: everything hosts on Vercel (public site + HQ dashboard in the web/ monorepo); volyume.app DNS repoints only after assetlinks.json, /privacy/ and /support/ are verified identical on Vercel; Pages deploy retired after cut-over | internal | £0 | Hosting architecture settled | DNS change is a founder action; cut-over checklist owned by the build |
| 2026-07-12 | Migrations 119 (marketing_waitlist, anon INSERT-only) and 120 (HQ tables) written and lead-reviewed; awaiting founder apply | internal | £0 | Schema staged | Landing-page form inserts must use return=minimal (anon cannot read rows back) |
| 2026-07-12 | Compliance gate first production run: landing page + articles hub + 3 articles reviewed adversarially | web | £0 | PASS on all 5 artefacts (Claim Rule, trial §3 verbatim, pricing §4, prohibited §5, qualified §6, ASA §7, tone §8) | Full verdict records in the founding session; artefacts publish-ready pending founder go |
| 2026-07-12 | FIRST PUBLISH: volyume.app landing page + 3 articles went live (founder go given; deploy run 52 green; live URL, articles and privacy page all verified serving) | web | £0 | Site live; homepage now sells the app instead of redirecting to the privacy policy | Updates form later removed by founder ruling (no pre-register concept; iOS launch days away) |
| 2026-07-12 | DECISION (founder + lead): retention email loop approved. Feedback-reply email (always) + day-12 trial check-in (segmented active/inactive). Survey on volyume.app writing to Supabase. Reward: free week via Play promo codes (no billing code touched). Provider: Brevo free tier. Suppression: open wellbeing flag blocks sends; global opt-out honoured | email | £0 | Design locked; build follows feedback-table recon | Founder actions: create Brevo account; generate Play promo code batch |
| 2026-07-12 | AUTONOMY ON: three Routines created and enabled. Weekly cycle Mondays 07:00 UTC (first run 2026-07-13, digest to founder inbox); executor every 6 hours (set 6-hourly rather than hourly for token frugality per founder instruction; tighten on request); review-poll Tuesdays and Fridays 08:00 UTC (site health checks until Play API granted) | internal | £0 | The department now runs on its own clock | Trigger IDs recorded in RUNBOOK; founder can pause any Routine at any time |
