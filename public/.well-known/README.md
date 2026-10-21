# Well-known files

This folder holds two files that phones read to connect volyume.app with the Volyume app.

assetlinks.json is read by Android. The deploy step fills in the signing fingerprints, so the copy kept in the repository is a template.

apple-app-site-association is read by iPhone. It lists the paths the app can open from a link.

Links to the app also work through the volyume:// address, which needs no check.
