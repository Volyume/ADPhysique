# The redrawn body figure: path data for build lane 1

`02-FIGURE-PATHS.json` holds the SVG path data of the anatomical figure the
mockup lane drew for the plan (`00-AUDIT-AND-PLAN.md` section 7.5,
`BodyFigure`): a 360 x 320 viewBox with the front view at x 0 to 160 and the
back view translated by 200, the silhouette parts (outline and fill passes)
and 62 muscle paths, each tagged with the engine muscle key it belongs to
(all seventeen keys: neck, front_delts, side_delts, chest, biceps, forearms,
abs, quads, adductors, tibialis, calves, traps, rear_delts, back, triceps,
glutes, hamstrings). It is the geometry rendered in the published mockups
(https://claude.ai/artifact/QNdFaAWBta6abvGMmQhkvY) and reviewed by the
lead; lane 1 starts from it rather than from the current ellipses in
`src/components/BodyDiagramHeatmap.js`. Plain M/L/C/Z commands, so it
converts to `react-native-svg` `Path` elements directly. Design material,
not shipped code.
