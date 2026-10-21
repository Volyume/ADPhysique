# Over-the-air updates runbook

Nothing is published as part of the work that added this. This file only records how to do it when the founder decides to.

## What is configured
- `app.json`: `runtimeVersion.policy` is `fingerprint`; `updates.url` is the EAS Update URL for this project; `checkAutomatically` is `NEVER`; `fallbackToCacheTimeout` is 0; the channel is set by the request header `expo-channel-name: production` (app config only, no `app.config.js`).
- `eas.json`: the `production` build profile has `channel: production`.
- `App.js`: one explicit check at launch, production builds only. It downloads in the background. The update is applied on the next cold start. There is no restart prompt and start-up never waits.
- Failures are reported as `App.otaUpdate` with the stage (`check` or `fetch`) only. Offline is a warning, not an error.

## Takes effect only in the next store build
These settings are native config. Builds already in the stores cannot receive updates. Updates work only for installs of a store build made after this change.

## Publish to production
1. Land the change on main with `npm run lint && npm test` green.
2. Confirm the fingerprint is unchanged from the store build you are targeting (`npx eas-cli fingerprint:compare`, or check that the publish lists the same runtime version as the live build).
3. `eas update --channel production --message "<short why>"` (founder-run, same go rule as builds).
4. Cold-start a device on that store build twice: first launch downloads, second launch runs the update.

## Roll back
- Republish the previous good commit: check it out and run `eas update --channel production --message "Roll back to <hash>"`.
- Or `eas update:roll-back` (select the production channel and runtime version) to return to the embedded bundle or the previous update.
- Devices pick the rollback up the same way: download at launch, apply on the next cold start.

## What can and cannot ship over the air
- Can: JavaScript and bundled assets (images, fonts, JSON) only.
- Cannot: any native change, any Expo config plugin change, any native `app.json` setting, any new or upgraded native module or SDK bump. These need a store build.
- The fingerprint runtime version enforces this. A native change gives a new fingerprint, so an update built from it never reaches devices on the old build.
- Safety-adjacent code (ED floors, gates, consent) follows the normal review and test rules; an OTA publish is a release.
