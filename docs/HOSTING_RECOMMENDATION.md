# Hosting recommendation for volyume.app

Status: RECOMMENDATION | Date: 2026-06-05 | Scope: the web platform (user web app,
admin, B2B/coaches). Not the mobile app (that ships via Play/App Store).

Researched and price-checked against current (2026) free-tier terms. Sources at
the bottom.

---

## TL;DR

**Use Cloudflare Pages.** It is the only one of the candidates that is free,
explicitly allows commercial use, has unlimited bandwidth, deploys automatically
on a `git push` (which is exactly how Claude Code works), gives free custom
domains and SSL, and, because volyume.app's DNS will live on Cloudflare, wiring
`app.volyume.app` is one click with no manual DNS record juggling.

Second choice is **Vercel Pro ($20/month)** if you want the smoothest possible
Next.js experience and don't mind paying. **Vercel's free Hobby tier is not an
option**, its terms prohibit commercial use and Volyume is a commercial product.

Run the three interfaces as **three separate Cloudflare Pages projects on
subdomains** (`app.`, `admin.`, `coaches.`) from one monorepo.

---

## The comparison

| Host | Free tier reality | Commercial use on free? | Claude Code push-to-deploy | Custom domain (free) | Next.js | Bandwidth |
|---|---|---|---|---|---|---|
| **Cloudflare Pages** | 500 builds/mo, **unlimited bandwidth + requests** (static), 100 domains/project | **Yes** | Yes, Git App auto-builds on push | Yes, 1-click when DNS is on Cloudflare | Yes (static export, or SSR via the OpenNext adapter) | Unlimited |
| Vercel (Hobby) | Generous DX, but **non-commercial only** | **No, will suspend** | Yes | Yes | Best-in-class (native) | Metered, pricey at scale |
| Vercel (Pro) | $20/mo per member | Yes | Yes | Yes | Best-in-class | Metered ($/GB) |
| Netlify | Now credit-based (300 credits/mo); legacy 100GB bandwidth | Yes | Yes | Yes | Supported, less seamless | Metered, burns fast on media |
| Render | Free static + free web service (spins down, cold starts) | Yes | Yes | Yes | Supported | Limited |
| Railway | No real free tier (trial credit, then usage-based) | Yes | Yes | Yes | Supported | Usage-based |
| GitHub Pages | Static only, **no SSR, no server env vars/secrets** | Yes | Yes (Actions) | Yes | Static export only | Soft 100GB |
| Fly.io | Pay-as-you-go, free allowances largely gone | Yes | Yes | Yes | Supported (Docker) | Usage-based |

The two facts that decide it: **Vercel Hobby bans commercial use** (account
suspension risk), and **Cloudflare is the only free tier with unlimited
bandwidth and commercial use allowed**. For a media-light marketing + admin +
coaches platform talking to Supabase, Cloudflare wins on cost, terms, and the
push-to-deploy workflow.

### Supabase compatibility

Supabase is a separate hosted backend (Postgres, Auth, Edge Functions). The web
app just calls its API. This works identically on every host, there is no
host-specific integration issue. With server-side rendering and Supabase Auth
cookies, use the `@supabase/ssr` package; it runs on Cloudflare Pages Functions
and on Vercel alike. One honest note: Cloudflare serves from a global edge while
your Supabase project sits in one region, so server-side calls hop to that
region. That is true of any host and is negligible at launch scale.

### Where the free tier runs out (honest)

Cloudflare Pages free runs out only when you hit **500 builds/month** (every push
is a build) or, if you use SSR, **100,000 Worker requests/day**. Either pushes
you to **Pro at $5/month** (5,000 builds) and/or Workers paid ($5/month + tiny
usage). Realistic cost: **£0 for months**, then about **£4-5/month** if you build
very often or your SSR traffic grows. For comparison the same workload is $20/mo
minimum on Vercel (commercial floor) and burns Netlify's metered bandwidth.

Keeping the marketing/admin/coaches surfaces as a **static export** (Next.js
`output: 'export'`) avoids the Workers request limit entirely, everything is then
unlimited. Use SSR only where a page genuinely needs per-request server logic.

---

## The three interfaces: how to lay them out

Run them as **three separate Cloudflare Pages projects, each on its own
subdomain**, from a single monorepo:

- `app.volyume.app` — user web app
- `admin.volyume.app` — internal admin
- `coaches.volyume.app` — B2B / coaches

Why separate projects, not one app with route-based separation:

- **Blast radius and security.** Admin and B2B have different auth and risk. A
  bug or a leaked admin route should never be reachable from the public app
  bundle. Separate deployments keep them isolated.
- **Separate env vars and access.** Admin can hold a different (server-only)
  Supabase key set than the public app, scoped per project.
- **Independent deploys.** A change to admin doesn't rebuild or risk the user
  app.
- **Free tier allows it.** Cloudflare gives unlimited projects and 100 custom
  domains per project, this costs nothing extra.

Monorepo layout (one repo Claude Code pushes to):

```
/apps/web      -> Pages project "volyume-web"     -> app.volyume.app
/apps/admin    -> Pages project "volyume-admin"   -> admin.volyume.app
/apps/coaches  -> Pages project "volyume-coaches" -> coaches.volyume.app
/packages/*    -> shared UI / supabase client
```

Each Pages project sets its **Root directory** to its app folder, so a push that
touches `/apps/web` rebuilds only the web project. Start by creating just
`app.volyume.app`; add the other two projects when those interfaces are built.

(Do NOT use one Next.js app with subdomain middleware for this. It couples admin
and B2B into the public bundle, the opposite of what you want.)

---

## Setup: what Al does manually (one time)

### 1. Create the Cloudflare account
- Go to https://dash.cloudflare.com/sign-up, create a free account. No card
  needed for the free plan.

### 2. Put volyume.app on Cloudflare and point DNS
- In the dashboard: **Add a site** -> enter `volyume.app` -> choose the **Free**
  plan.
- Cloudflare shows **two nameservers** (e.g. `xxx.ns.cloudflare.com`).
- Go to wherever volyume.app was registered (the registrar) and set the domain's
  **nameservers** to those two. (If you bought the domain through Cloudflare
  Registrar, it is already on Cloudflare, skip this.)
- Propagation takes minutes to a couple of hours. Once "Active", DNS is on
  Cloudflare and custom domains for Pages become one-click.

### 3. Connect the GitHub repo (per project)
- **Workers & Pages -> Create -> Pages -> Connect to Git.**
- Authorize the **Cloudflare GitHub App** and pick the repo. (This is the piece
  that makes push-to-deploy work.)
- Set build config:
  - Framework preset: **Next.js** (or **Next.js (Static HTML Export)** if you go
    static).
  - Root directory: `apps/web` (for the user app project).
  - Build command / output: Cloudflare fills these from the preset. For SSR,
    add the **OpenNext Cloudflare** adapter (`@opennextjs/cloudflare`) and the
    `nodejs_compat` compatibility flag; for static export the default is fine.
- Production branch: **main**.

### 4. Add the custom subdomain (per project)
- In the Pages project: **Custom domains -> Set up a domain ->**
  `app.volyume.app`. Because DNS is on Cloudflare, it **creates the CNAME and
  SSL automatically**, nothing to add at a registrar.
- (If you ever keep DNS elsewhere, the manual record is:
  `CNAME app.volyume.app -> <project>.pages.dev`.)

### 5. Set environment variables (per project, NOT in the repo)
- Pages project -> **Settings -> Environment variables.** Add for Production
  (and Preview):
  - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL (public, fine in the client).
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key (public by design, RLS
    protects data).
  - **Server-only secrets** (e.g. `SUPABASE_SERVICE_ROLE_KEY` for admin/coaches)
    as **encrypted** variables, **never** prefixed `NEXT_PUBLIC_`. The service
    role key must only ever be read server-side.
- These never live in the codebase. The app reads them at build/run time from
  the platform.

That is the whole one-time setup. Repeat steps 3-5 for `admin` and `coaches`
when those apps exist.

---

## What Claude Code handles from there

Once the GitHub App is connected and env vars are set, Claude Code needs **no
hosting credentials at all**, deployment is driven entirely by git:

1. Claude Code commits and pushes to the repo (already how it works).
2. Cloudflare's GitHub App sees the push to `main`, runs the build, and deploys
   to `app.volyume.app`. Pushes to any other branch / PRs get an automatic
   **preview URL** (`<hash>.<project>.pages.dev`) so a change can be reviewed
   before it hits production.
3. Verifying a deploy succeeded:
   - The **Deployments** tab in the Pages project shows status + full build log.
   - Hit the URL: `curl -I https://app.volyume.app` (expect `200`), or open it.
   - If you give Claude Code a scoped **Cloudflare API token** (optional), it can
     query deployment status programmatically; otherwise the dashboard + a curl
     is the simple check.

Claude Code cannot create the account or change DNS (it has no Cloudflare
access), those are the manual steps above. Everything after that is push-driven.

---

## Recommendation, stated plainly

1. **Best: Cloudflare Pages.** Free, commercial-allowed, unlimited bandwidth,
   push-to-deploy via the GitHub App, free one-click subdomains because DNS is on
   Cloudflare, clean Supabase usage, scales to ~£5/mo only if you outgrow 500
   builds/month or 100k SSR requests/day.
2. **If you want the smoothest Next.js DX and will pay: Vercel Pro, $20/mo.**
   Same push-to-deploy, best framework integration, but metered bandwidth gets
   expensive and the free tier is off-limits for a commercial product.
3. **Free tier honesty:** Cloudflare costs nothing for a long time; the first
   real bill is ~£5/mo and only if you build very frequently or your server-
   rendered traffic grows. Static-export the marketing/admin/coaches surfaces to
   stay unlimited.

---

## Sources

- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Cloudflare Pages pricing 2026: https://www.devtoolreviews.com/reviews/cloudflare-pages-pricing-bandwidth-limits-2026
- Cloudflare free plan: https://www.cloudflare.com/plans/free/
- Vercel Hobby (non-commercial): https://vercel.com/docs/plans/hobby
- Vercel fair-use: https://vercel.com/docs/limits/fair-use-guidelines
- Vercel pricing: https://vercel.com/pricing
- Netlify pricing 2026: https://hamsterstack.com/pricing/netlify/
- Vercel vs Netlify vs Cloudflare 2026: https://www.devtoolreviews.com/reviews/vercel-vs-netlify-vs-cloudflare-pages-pricing-comparison-2026
- OpenNext Cloudflare adapter (Next.js on Cloudflare): https://opennext.js.org/cloudflare
