# Growth Ledger

Append-only record of every marketing action and result. Will migrate to the Supabase `marketing_ledger` table once the schema lands; this file then holds only the bootstrap entries.

## Ledger

| Date | Action | Channel | Cost | Result | Notes |
|------|--------|---------|------|--------|-------|
| 2026-07-12 | Marketing HQ system build started; governing documents authored (PRODUCT-FACTS, CLAIMS-STANDARDS, OPERATING-CHARTER) | internal | £0 | Foundation laid | Built by the founding session |
| 2026-07-12 | Founder decision: everything hosts on Vercel (public site + HQ dashboard in the web/ monorepo); volyume.app DNS repoints only after assetlinks.json, /privacy/ and /support/ are verified identical on Vercel; Pages deploy retired after cut-over | internal | £0 | Hosting architecture settled | DNS change is a founder action; cut-over checklist owned by the build |
| 2026-07-12 | Migrations 119 (marketing_waitlist, anon INSERT-only) and 120 (HQ tables) written and lead-reviewed; awaiting founder apply | internal | £0 | Schema staged | Landing-page form inserts must use return=minimal (anon cannot read rows back) |
| 2026-07-12 | Compliance gate first production run: landing page + articles hub + 3 articles reviewed adversarially | web | £0 | PASS on all 5 artefacts (Claim Rule, trial §3 verbatim, pricing §4, prohibited §5, qualified §6, ASA §7, tone §8) | Full verdict records in the founding session; artefacts publish-ready pending founder go |
