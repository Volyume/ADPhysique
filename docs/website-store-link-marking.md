# Website store links: the one marking scheme (LOC-663)

Source: accepted plan LOC-583 revision 7 ("Accurate pages"). Scope: every link
from volyume.app to the App Store or Google Play. Nothing is added to the
pages to count installs: the link carries the marking, with no script, cookie,
pixel or analytics tag.

## The scheme

| Store | Link | Where it shows |
|---|---|---|
| App Store (UK) | `https://apps.apple.com/gb/app/volyume/id6777083702?pt=<provider token>&ct=<campaign>&mt=8` | App Store Connect, Analytics, Campaigns (a campaign shows once it has 5 first-time downloads from distinct people and 24 hours have passed) |
| Google Play | `https://play.google.com/store/apps/details?id=app.volyume&referrer=utm_source%3Dvolyume.app%26utm_medium%3Dwebsite%26utm_campaign%3D<campaign>` | Play Console, Grow users overview, filtered by UTM source and UTM campaign |

`<campaign>` is the page that carries the link, from the table in
`scripts/site/storeLinks.cjs` (`CAMPAIGNS`): `home`, `get`, `support`,
`survey`, `privacy`, `articles`, `article-explainable-coaching`,
`article-training-volume`, `article-change-calories`, `challenge-terms`,
`challenge`, `community-profile`, `community-group`, `community-story`,
`community-programme`, `partner`, `email-preferences`, `email-unsubscribe`.
Apple allows 40 characters; the check enforces it.

`pt` is the App Store Connect provider token. It cannot be derived: App Store
Connect shows it when the first campaign link is made. Until it is set in
`APPLE_PROVIDER_TOKEN` (scripts/site/storeLinks.cjs) the App Store links carry
`ct` and `mt` only, and Apple will not count them.

The challenge page adds `&challenge=<code>` to the Play referrer at run time
(encoded, after the marking). The app reads that part
(`parseChallengeFromReferrer`, src/lib/challenges/pending.js), so a challenge
join still works.

## Commands

    node scripts/site/storeLinks.cjs --check      # exit 1 on any unmarked or mis-marked store link
    node scripts/site/storeLinks.cjs --apply      # rewrite every store link under public/ to the scheme
    node scripts/site/publicStatements.cjs        # exit 1 on a forbidden statement under public/

A new page with a store link must be added to `CAMPAIGNS`, or the check fails.
Both checks run in `src/__tests__/websiteCorrections.guard.test.js`.

## Setting the provider token (one time)

1. In App Store Connect, open the app, Analytics, Campaigns, and make a
   campaign link (any campaign name). The link shows `pt=<number>`.
2. Put that number in `APPLE_PROVIDER_TOKEN` in `scripts/site/storeLinks.cjs`.
3. Run `node scripts/site/storeLinks.cjs --apply`, then `--check`, and publish.

## Reading the numbers

App Store campaigns are read in App Store Connect; Play referrers in Play
Console. The two stores' figures are separate and are not added together
here. Counts below store thresholds are hidden by the stores, not by us.

## Record: the live site against main's public/ at 942a44e0d (2026-11-21)

Fetched every page and asset under https://volyume.app and compared it byte for
byte with `public/` at the base commit.

- Identical: every page, script and image except the two below.
- `index.html` differs from the live page in three ways (all from the October
  rebuild, commits 078f17421 and 616b47c6f): the header button reads "Get the
  app" and is hidden on a phone; the "iOS coming soon" text is a working
  "Download on the App Store" link; the Free plan's price label is gone.
- `.well-known/assetlinks.json` differs only because the deploy workflow
  injects the real signing fingerprints into the served copy; the committed
  file is a template. Not a content change.

So publishing main's `public/` at the base commit would change one live page
(the home page), and nothing else. The October rebuild is therefore small, and
publishing the corrections here needs no other rebuild to go with it.
