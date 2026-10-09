import { View, StyleSheet } from 'react-native';
import Text from './Text';
import Svg, { G, Path } from 'react-native-svg';
import { spacing, radius, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import InfoTooltip from './InfoTooltip';
import LegendRow from './LegendRow';
import { GLOSSARY } from '../lib/coachGlossary';
import { LOOKBACK_DAYS } from '../lib/recovery/constants';
import { TONE, toneColors } from '../lib/volumeJudgement';
import { VOLUME_TONE_LABELS } from '../lib/volumeBandLabels';

// The body figure (register D214, build lane 1 of the Progress elevation;
// plan docs/audit/progress-recovery-consistency-audit-2026-10-01/
// 00-AUDIT-AND-PLAN.md sections 7.2 c, 7.4 item 4 and 7.5).
//
// Two anatomical views (front and back) drawn from the path data in
// 02-FIGURE-PATHS.json: a silhouette (an outline pass, then a fill pass, so
// overlapping limbs read as one body with one outline) and 62 muscle paths,
// each tagged with the engine muscle key it belongs to. ALL seventeen engine
// keys have a region: neck, front_delts, side_delts, chest, biceps, forearms,
// abs, quads, adductors, tibialis, calves, traps, rear_delts, back, triceps,
// glutes, hamstrings (the back is drawn as upper back, lats and lower back
// sharing the one `back` key).
//
// One component, two palettes, chosen by the caller:
//   - VOLUME (no `recoveryByMuscle`): each region takes the entry's `color`
//     exactly as the screen resolved it; an entry with no colour is "No sets"
//     (no fill, the silhouette ground, a hairline). Legend (D219, the four
//     tones of volumeJudgement.js, read from volumeBandLabels.js): Below
//     maintenance, Maintenance to growth, Growth range, Beyond the studied
//     range, No sets.
//   - RECOVERY (`recoveryByMuscle`, D201 + D214 Q1 = A): one hue, the
//     `recovery` token, at graded intensity by how much is left to recover
//     (under 50% solid, 50 to 74% at alpha.half, 75 to 89% at alpha.edge with
//     a 1 px outline of its own), recovered = `surface3` with a solid
//     hairline, no session in 14 days = no fill with a DASHED hairline, so the
//     two quiet states differ in shape as well as tone. Legend: a three-step
//     ramp "More to recover ... less", Recovered, No session in 14 days.
//   - NEUTRAL VOLUME (`neutralVolume`, a recovery week on the Volume heatmap,
//     plan 7.4 item 2): no verdict is drawn, so a muscle with any logged sets
//     takes the quiet `surface3` fill with the `border` hairline and the
//     legend names just that ("Trained") beside "No sets"; the band words and
//     their (i) are withheld, since nothing on the figure is judged.
//   Both legends are `LegendRow`, so every colour on the figure has one named
//   swatch in one style. A status surface carries no amber: the division
//   markers below are ink.
//
// Co-ordinate system per view: 160 x 320. Front sits at x 0 and the back is
// translated by 200 inside one 360 x 320 viewBox, so both scale uniformly
// with the container width. The Svg is sized by aspect ratio, so the figure
// fills the width at every phone size with no blank bands above or below.
//
// Hit model. AX-04 stands: the whole figure is ONE accessible image carrying
// the summary label below, no shape has an accessibility prop, and the muscle
// list on the screen is the real accessible path. The sighted tap-to-jump is
// unchanged: every visible shape has an `onPress` through `region()`. Most
// regions are far smaller than a thumb (34 of the 62 paths are under 12 dp in
// one dimension on a 412 dp phone), so a transparent twin of every shape under
// a 24 dp target is drawn BEHIND all the visible shapes with a wider stroke
// (`fill="transparent"`, same geometry). The rule of no overlap is the draw
// order: react-native-svg hit-tests the topmost shape first, and a shape with
// no handler that is hit swallows the touch on both platforms, so the order,
// bottom to top, is silhouette (no handler), hit twins (smallest region on
// top), visible muscles (the selected one last), division markers
// (`pointerEvents="none"`). A hit twin can therefore never take a tap that
// lands on a neighbour's visible shape; it only claims bare skin around its
// own muscle.
//
// Stroke maths for the twins: 24 dp at a 412 dp phone, where the figure card
// leaves 348 dp for 360 units, is 24 / (348 / 360) = 24.8 units. A shape gets a
// twin when min(width, height) is at least 2 units short of that, and its
// stroke is ceil(24.8 - min(width, height)), so the twin reaches 24.8 units in
// both directions. The strokes are baked into the rows below and re-derived
// from the path data in BodyDiagramHeatmap.test.js, so the table cannot drift.

const FIGURE_WIDTH = 160;
const FIGURE_HEIGHT = 320;
const GAP = 40;
const TOTAL_WIDTH = FIGURE_WIDTH * 2 + GAP;
const BACK_OFFSET_X = FIGURE_WIDTH + GAP;

// Stroke widths, in figure units.
const OUTLINE_STROKE = 2; // silhouette outline pass; the fill pass hides the inner half, leaving a 1 unit line
const HAIRLINE = 0.75; // muscle shapes
const NEARLY_STROKE = 1; // the 75 to 89% recovery outline
const SELECTED_STROKE = 1.5; // the selected muscle's outline
const DASH = '3 2'; // the no-session hairline

// "No fill": drawn as `transparent`, not `none`, so the whole muscle stays
// hit-testable and shows the silhouette ground through it.
const NO_FILL = 'transparent';

// The seventeen engine keys, every one drawn.
const FIGURE_MUSCLE_KEYS = [
  'neck', 'front_delts', 'side_delts', 'chest', 'biceps', 'forearms', 'abs', 'quads', 'adductors',
  'tibialis', 'calves', 'traps', 'rear_delts', 'back', 'triceps', 'glutes', 'hamstrings',
];

// Figure data. SILHOUETTE: nine parts per view (head, two ears, neck, torso,
// two arms, two legs). MUSCLES: [engine muscle key, path data, hit stroke in
// figure units (0 = no twin)], one row per shape, bilateral shapes listed
// left then right, the anatomical name in the trailing comment.
const FRONT_SILHOUETTE = [
  'M 80 4 C 89.5 4 94 11.5 94 22 C 94 31 91 38.5 86 42.5 C 84 44.5 82 45.6 80 45.6 C 78 45.6 76 44.5 74 42.5 C 69 38.5 66 31 66 22 C 66 11.5 70.5 4 80 4 Z',
  'M 66.2 20.5 C 63.6 20.5 62.4 24 63.4 27.6 C 64 29.6 65.2 30.4 66.2 29.4 Z',
  'M 93.8 20.5 C 96.4 20.5 97.6 24 96.6 27.6 C 96 29.6 94.8 30.4 93.8 29.4 Z',
  'M 71 40 L 70.2 57 L 89.8 57 L 89 40 Z',
  'M 70 55 C 62 56 54 58 47 61.5 C 44.5 70 45.5 80 49.5 91 C 52 100 54.5 111 56.5 122 C 57.6 129 57.4 136 55.6 143 C 53.4 149 51.6 153 51.8 158 C 52.6 165 61 169 72 171.5 L 80 172.5 L 88 171.5 C 99 169 107.4 165 108.2 158 C 108.4 153 106.6 149 104.4 143 C 102.6 136 102.4 129 103.5 122 C 105.5 111 108 100 110.5 91 C 114.5 80 115.5 70 113 61.5 C 106 58 98 56 90 55 Z',
  'M 48 60.5 C 41 61 34.5 64.5 31.5 72.5 C 29.5 79.5 29.5 88 31.5 96 C 31.4 104 30.6 112 30.2 119 C 28.4 126 27 134 27 142 C 27.2 151 28.6 160 30.4 168 C 29.4 177 28.6 188 29.4 197 C 30.2 202.5 33.4 203.8 35.4 201.8 C 38 199 38.6 192.5 39.8 186 C 40.6 180 40.8 175 40 169.5 C 41 161 42.6 153 43.6 146 C 44.8 138 45.2 129 45.2 121 C 45.8 112 46.8 104 47.6 97 C 48.4 94 49.6 92 50.4 90 Z',
  'M 112 60.5 C 119 61 125.5 64.5 128.5 72.5 C 130.5 79.5 130.5 88 128.5 96 C 128.6 104 129.4 112 129.8 119 C 131.6 126 133 134 133 142 C 132.8 151 131.4 160 129.6 168 C 130.6 177 131.4 188 130.6 197 C 129.8 202.5 126.6 203.8 124.6 201.8 C 122 199 121.4 192.5 120.2 186 C 119.4 180 119.2 175 120 169.5 C 119 161 117.4 153 116.4 146 C 115.2 138 114.8 129 114.8 121 C 114.2 112 113.2 104 112.4 97 C 111.6 94 110.4 92 109.6 90 Z',
  'M 52 158 C 49.8 170 49 186 50 200 C 51.5 210 54 218 56 227 C 57 233 56 240 54 247 C 52.5 255 53 266 56 277 C 58 285 60 292 61 297 C 59 301 56 306 56 311 C 57 315 66 317 72 315 C 74 313 73 307 72 301 C 72 293 72.5 285 73.5 277 C 75 268 75 258 74.5 250 C 75.5 243 76.5 236 76.5 229 C 77.5 218 79 204 79.5 192 C 79.7 183 79.8 178 80 172 L 80 158 Z',
  'M 108 158 C 110.2 170 111 186 110 200 C 108.5 210 106 218 104 227 C 103 233 104 240 106 247 C 107.5 255 107 266 104 277 C 102 285 100 292 99 297 C 101 301 104 306 104 311 C 103 315 94 317 88 315 C 86 313 87 307 88 301 C 88 293 87.5 285 86.5 277 C 85 268 85 258 85.5 250 C 84.5 243 83.5 236 83.5 229 C 82.5 218 81 204 80.5 192 C 80.3 183 80.2 178 80 172 L 80 158 Z',
];

const BACK_SILHOUETTE = [
  'M 80 4 C 89.5 4 94 11.5 94 22 C 94 30 91.5 36.5 87.5 40.5 C 85.5 42.2 83 43 80 43 C 77 43 74.5 42.2 72.5 40.5 C 68.5 36.5 66 30 66 22 C 66 11.5 70.5 4 80 4 Z',
  'M 66.2 20.5 C 63.6 20.5 62.4 24 63.4 27.6 C 64 29.6 65.2 30.4 66.2 29.4 Z',
  'M 93.8 20.5 C 96.4 20.5 97.6 24 96.6 27.6 C 96 29.6 94.8 30.4 93.8 29.4 Z',
  'M 71 38 L 70.2 57 L 89.8 57 L 89 38 Z',
  'M 70 55 C 62 56 54 58 47 61.5 C 44.5 70 45.5 80 49.5 91 C 52 100 54.5 111 56.5 122 C 57.6 129 57.4 136 55.6 143 C 53.4 149 51.6 153 51.8 158 C 52.6 165 61 169 72 171.5 L 80 172.5 L 88 171.5 C 99 169 107.4 165 108.2 158 C 108.4 153 106.6 149 104.4 143 C 102.6 136 102.4 129 103.5 122 C 105.5 111 108 100 110.5 91 C 114.5 80 115.5 70 113 61.5 C 106 58 98 56 90 55 Z',
  'M 48 60.5 C 41 61 34.5 64.5 31.5 72.5 C 29.5 79.5 29.5 88 31.5 96 C 31.4 104 30.6 112 30.2 119 C 28.4 126 27 134 27 142 C 27.2 151 28.6 160 30.4 168 C 29.4 177 28.6 188 29.4 197 C 30.2 202.5 33.4 203.8 35.4 201.8 C 38 199 38.6 192.5 39.8 186 C 40.6 180 40.8 175 40 169.5 C 41 161 42.6 153 43.6 146 C 44.8 138 45.2 129 45.2 121 C 45.8 112 46.8 104 47.6 97 C 48.4 94 49.6 92 50.4 90 Z',
  'M 112 60.5 C 119 61 125.5 64.5 128.5 72.5 C 130.5 79.5 130.5 88 128.5 96 C 128.6 104 129.4 112 129.8 119 C 131.6 126 133 134 133 142 C 132.8 151 131.4 160 129.6 168 C 130.6 177 131.4 188 130.6 197 C 129.8 202.5 126.6 203.8 124.6 201.8 C 122 199 121.4 192.5 120.2 186 C 119.4 180 119.2 175 120 169.5 C 119 161 117.4 153 116.4 146 C 115.2 138 114.8 129 114.8 121 C 114.2 112 113.2 104 112.4 97 C 111.6 94 110.4 92 109.6 90 Z',
  'M 52 158 C 49.8 170 49 186 50 200 C 51.5 210 54 218 56 227 C 57 233 56 240 54 247 C 52.5 255 53 266 56 277 C 58 285 60 292 61 297 C 59 301 56 306 56 311 C 57 315 66 317 72 315 C 74 313 73 307 72 301 C 72 293 72.5 285 73.5 277 C 75 268 75 258 74.5 250 C 75.5 243 76.5 236 76.5 229 C 77.5 218 79 204 79.5 192 C 79.7 183 79.8 178 80 172 L 80 158 Z',
  'M 108 158 C 110.2 170 111 186 110 200 C 108.5 210 106 218 104 227 C 103 233 104 240 106 247 C 107.5 255 107 266 104 277 C 102 285 100 292 99 297 C 101 301 104 306 104 311 C 103 315 94 317 88 315 C 86 313 87 307 88 301 C 88 293 87.5 285 86.5 277 C 85 268 85 258 85.5 250 C 84.5 243 83.5 236 83.5 229 C 82.5 218 81 204 80.5 192 C 80.3 183 80.2 178 80 172 L 80 158 Z',
];

const FRONT_MUSCLES = [
  ['neck', 'M 71.6 41.4 C 73 46.6 75.2 52.2 78.2 58.2 C 76.4 58.8 74.4 57.8 73.2 55.8 C 71.4 52 70.6 47.4 70.6 42.4 Z', 18], // sternocleidomastoid, left
  ['neck', 'M 88.4 41.4 C 87 46.6 84.8 52.2 81.8 58.2 C 83.6 58.8 85.6 57.8 86.8 55.8 C 88.6 52 89.4 47.4 89.4 42.4 Z', 18], // sternocleidomastoid, right
  ['front_delts', 'M 55 63.5 C 52 62.6 49.5 62 47 61.5 C 42.6 64.6 38.8 71 37 78.6 C 36.2 83 36 88 36.4 92.4 C 38.4 93 40.8 92.8 42.8 91.4 C 44.4 86.6 46.6 80.6 48.6 75 C 50.6 70 53 66 55 63.5 Z', 7], // anterior deltoid, left
  ['front_delts', 'M 105 63.5 C 108 62.6 110.5 62 113 61.5 C 117.4 64.6 121.2 71 123 78.6 C 123.8 83 124 88 123.6 92.4 C 121.6 93 119.2 92.8 117.2 91.4 C 115.6 86.6 113.4 80.6 111.4 75 C 109.4 70 107 66 105 63.5 Z', 7], // anterior deltoid, right
  ['side_delts', 'M 47 61.5 C 40.5 61.4 34.3 65.5 31.4 72.6 C 29.7 78 29.5 85 31.4 91.5 C 32.4 93 33.8 93.4 35 93.2 C 35.8 93.1 36.2 92.8 36.4 92.4 C 36 88 36.2 83 37 78.6 C 38.8 71 42.6 64.6 47 61.5 Z', 8], // lateral deltoid, left
  ['side_delts', 'M 113 61.5 C 119.5 61.4 125.7 65.5 128.6 72.6 C 130.3 78 130.5 85 128.6 91.5 C 127.6 93 126.2 93.4 125 93.2 C 124.2 93.1 123.8 92.8 123.6 92.4 C 124 88 123.8 83 123 78.6 C 121.2 71 117.4 64.6 113 61.5 Z', 8], // lateral deltoid, right
  ['chest', 'M 78.4 68.8 C 72 66.4 63 65.2 56.4 66 C 53.8 70.4 50.8 76 48.4 81.6 C 47 84.8 46.6 87.6 47.4 89.8 C 52 95.6 66 99 78.4 95.6 L 78.4 68.8 Z', 0], // pectoralis major, left
  ['chest', 'M 81.6 68.8 C 88 66.4 97 65.2 103.6 66 C 106.2 70.4 109.2 76 111.6 81.6 C 113 84.8 113.4 87.6 112.6 89.8 C 108 95.6 94 99 81.6 95.6 L 81.6 68.8 Z', 0], // pectoralis major, right
  ['biceps', 'M 38 94.6 C 33.4 97.6 31.8 105 32.4 112 C 32.8 117 34.4 120.4 37 122.2 C 40.4 121.8 43.4 120.2 45 117 C 46.6 111 46 101.6 43 96 C 41.8 94.4 39.8 94 38 94.6 Z', 12], // biceps brachii, left
  ['biceps', 'M 122 94.6 C 126.6 97.6 128.2 105 127.6 112 C 127.2 117 125.6 120.4 123 122.2 C 119.6 121.8 116.6 120.2 115 117 C 113.4 111 114 101.6 117 96 C 118.2 94.4 120.2 94 122 94.6 Z', 12], // biceps brachii, right
  ['forearms', 'M 30.6 124.8 C 33.4 123.4 40.2 123.2 43.4 125.8 C 44.2 133 43.6 141 42.2 148.6 C 41.2 155 39.8 162 38.4 168.2 C 36.2 169.6 33.2 169.6 31.4 168.2 C 29.6 161 28.2 154 28 146.4 C 27.8 139 28.6 131 30.6 124.8 Z', 10], // forearm flexors, left
  ['forearms', 'M 129.4 124.8 C 126.6 123.4 119.8 123.2 116.6 125.8 C 115.8 133 116.4 141 117.8 148.6 C 118.8 155 120.2 162 121.6 168.2 C 123.8 169.6 126.8 169.6 128.6 168.2 C 130.4 161 131.8 154 132 146.4 C 132.2 139 131.4 131 129.4 124.8 Z', 10], // forearm flexors, right
  ['abs', 'M 73.2 98.6 L 76.4 98.6 C 77.8 98.6 79 99.8 79 101.2 L 79 105.8 C 79 107.2 77.8 108.4 76.4 108.4 L 73.2 108.4 C 71.8 108.4 70.6 107.2 70.6 105.8 L 70.6 101.2 C 70.6 99.8 71.8 98.6 73.2 98.6 Z', 17], // rectus row 1, left
  ['abs', 'M 86.8 98.6 L 83.6 98.6 C 82.2 98.6 81 99.8 81 101.2 L 81 105.8 C 81 107.2 82.2 108.4 83.6 108.4 L 86.8 108.4 C 88.2 108.4 89.4 107.2 89.4 105.8 L 89.4 101.2 C 89.4 99.8 88.2 98.6 86.8 98.6 Z', 17], // rectus row 1, right
  ['abs', 'M 73.2 110.2 L 76.6 110.2 C 77.9 110.2 79 111.3 79 112.6 L 79 118.6 C 79 119.9 77.9 121 76.6 121 L 73.2 121 C 71.9 121 70.8 119.9 70.8 118.6 L 70.8 112.6 C 70.8 111.3 71.9 110.2 73.2 110.2 Z', 17], // rectus row 2, left
  ['abs', 'M 86.8 110.2 L 83.4 110.2 C 82.1 110.2 81 111.3 81 112.6 L 81 118.6 C 81 119.9 82.1 121 83.4 121 L 86.8 121 C 88.1 121 89.2 119.9 89.2 118.6 L 89.2 112.6 C 89.2 111.3 88.1 110.2 86.8 110.2 Z', 17], // rectus row 2, right
  ['abs', 'M 73.6 122.8 L 76.6 122.8 C 77.9 122.8 79 123.9 79 125.2 L 79 132 C 79 133.3 77.9 134.4 76.6 134.4 L 73.6 134.4 C 72.3 134.4 71.2 133.3 71.2 132 L 71.2 125.2 C 71.2 123.9 72.3 122.8 73.6 122.8 Z', 18], // rectus row 3, left
  ['abs', 'M 86.4 122.8 L 83.4 122.8 C 82.1 122.8 81 123.9 81 125.2 L 81 132 C 81 133.3 82.1 134.4 83.4 134.4 L 86.4 134.4 C 87.7 134.4 88.8 133.3 88.8 132 L 88.8 125.2 C 88.8 123.9 87.7 122.8 86.4 122.8 Z', 18], // rectus row 3, right
  ['abs', 'M 74.8 136.2 L 76.4 136.2 C 77.8 136.2 79 137.4 79 138.8 L 79 146.8 C 79 148.2 77.8 149.4 76.4 149.4 L 74.8 149.4 C 73.4 149.4 72.2 148.2 72.2 146.8 L 72.2 138.8 C 72.2 137.4 73.4 136.2 74.8 136.2 Z', 19], // rectus row 4, left
  ['abs', 'M 85.2 136.2 L 83.6 136.2 C 82.2 136.2 81 137.4 81 138.8 L 81 146.8 C 81 148.2 82.2 149.4 83.6 149.4 L 85.2 149.4 C 86.6 149.4 87.8 148.2 87.8 146.8 L 87.8 138.8 C 87.8 137.4 86.6 136.2 85.2 136.2 Z', 19], // rectus row 4, right
  ['abs', 'M 52.8 98.4 C 58 100.4 64 101 69.2 100.4 L 69.2 148.4 C 65.6 147.6 61.4 145 57.2 141.4 C 58.6 136.4 59 131 58.6 125.4 C 57.8 116.8 55.6 107.4 52.8 98.4 Z', 9], // external oblique, left
  ['abs', 'M 107.2 98.4 C 102 100.4 96 101 90.8 100.4 L 90.8 148.4 C 94.4 147.6 98.6 145 102.8 141.4 C 101.4 136.4 101 131 101.4 125.4 C 102.2 116.8 104.4 107.4 107.2 98.4 Z', 9], // external oblique, right
  ['quads', 'M 53.2 164.8 C 51 175 50.2 188 51.6 200 C 52.8 210 56 219 59.8 226.4 C 61.6 226.4 62.8 225.2 62.8 223.4 C 61.4 214 59.4 205 58.4 196 C 57.6 188 58.2 178 57.4 168 C 56 164.2 54.6 164 53.2 164.8 Z', 13], // vastus lateralis, left
  ['quads', 'M 106.8 164.8 C 109 175 109.8 188 108.4 200 C 107.2 210 104 219 100.2 226.4 C 98.4 226.4 97.2 225.2 97.2 223.4 C 98.6 214 100.6 205 101.6 196 C 102.4 188 101.8 178 102.6 168 C 104 164.2 105.4 164 106.8 164.8 Z', 13], // vastus lateralis, right
  ['quads', 'M 64.6 163.5 C 61.2 170 59.4 180 59.6 190 C 59.8 201 62 212 63.8 224 L 67.8 224 C 69.2 212 70.4 200 70.6 189 C 70.4 178 68.4 169 64.6 163.5 Z', 14], // rectus femoris, left
  ['quads', 'M 95.4 163.5 C 98.8 170 100.6 180 100.4 190 C 100.2 201 98 212 96.2 224 L 92.2 224 C 90.8 212 89.6 200 89.4 189 C 89.6 178 91.6 169 95.4 163.5 Z', 14], // rectus femoris, right
  ['quads', 'M 75 198 C 77.2 206 77.6 215 76 223.6 C 74.6 228 71.6 228.6 70.2 225.4 C 70 218 70.8 209 72.6 202 C 73.4 199.4 74 198 75 198 Z', 19], // vastus medialis, left
  ['quads', 'M 85 198 C 82.8 206 82.4 215 84 223.6 C 85.4 228 88.4 228.6 89.8 225.4 C 90 218 89.2 209 87.4 202 C 86.6 199.4 86 198 85 198 Z', 19], // vastus medialis, right
  ['adductors', 'M 78.8 168 C 79 180 78 189 75.8 194 C 74.2 192.6 72.6 192 71.4 192.4 C 72.8 185 72.8 177 71.4 168.8 C 73.8 167.4 76.6 167.2 78.8 168 Z', 18], // adductor group, left
  ['adductors', 'M 81.2 168 C 81 180 82 189 84.2 194 C 85.8 192.6 87.4 192 88.6 192.4 C 87.2 185 87.2 177 88.6 168.8 C 86.2 167.4 83.4 167.2 81.2 168 Z', 18], // adductor group, right
  ['tibialis', 'M 59.6 240 C 57.8 250 58.2 264 61.4 280 C 62.4 285 63.6 290 65.6 294 L 68.2 293 C 67.8 284 67 274 66.4 264 C 65.8 254 64.4 246 62.6 240.4 C 61.6 239.6 60.6 239.6 59.6 240 Z', 16], // tibialis anterior, left
  ['tibialis', 'M 100.4 240 C 102.2 250 101.8 264 98.6 280 C 97.6 285 96.4 290 94.4 294 L 91.8 293 C 92.2 284 93 274 93.6 264 C 94.2 254 95.6 246 97.4 240.4 C 98.4 239.6 99.4 239.6 100.4 240 Z', 16], // tibialis anterior, right
  ['calves', 'M 70.4 242 C 73 249 74.4 258 73.4 268 C 73 273 72.2 277 71.2 280 C 69.8 276 69.2 270 69.4 262 C 69.6 254 69.8 247 69.2 243 C 69.6 242.2 70 242 70.4 242 Z', 21], // medial gastrocnemius, left
  ['calves', 'M 89.6 242 C 87 249 85.6 258 86.6 268 C 87 273 87.8 277 88.8 280 C 90.2 276 90.8 270 90.6 262 C 90.4 254 90.2 247 90.8 243 C 90.4 242.2 90 242 89.6 242 Z', 21], // medial gastrocnemius, right
];

const BACK_MUSCLES = [
  ['traps', 'M 78.6 44.4 L 71.6 45.2 C 71.6 50.6 66.6 55.4 59.4 58.8 C 56 60.4 52.8 61.6 49.8 62.8 C 50.8 65.4 52.4 67 54.6 68 C 61.2 70.4 70 71.2 78.6 71.6 Z', 0], // upper trapezius, left
  ['traps', 'M 81.4 44.4 L 88.4 45.2 C 88.4 50.6 93.4 55.4 100.6 58.8 C 104 60.4 107.2 61.6 110.2 62.8 C 109.2 65.4 107.6 67 105.4 68 C 98.8 70.4 90 71.2 81.4 71.6 Z', 0], // upper trapezius, right
  ['traps', 'M 78.6 73.2 C 70.4 72.8 61 71.8 54.6 69.4 C 56.4 77 60.6 84 66 90.4 C 70 95 74.4 101.6 78.6 110 Z', 0], // middle trapezius, left
  ['traps', 'M 81.4 73.2 C 89.6 72.8 99 71.8 105.4 69.4 C 103.6 77 99.4 84 94 90.4 C 90 95 85.6 101.6 81.4 110 Z', 0], // middle trapezius, right
  ['rear_delts', 'M 47 61.8 C 49 63.6 51 65.4 52.2 67.4 C 51.8 73 50 79 47.2 85 C 45.8 88 44 90.4 42.6 91.4 C 40.6 92.4 38.2 92.6 36.4 92.4 C 36 88 36.2 83 37 78.6 C 38.8 71 42.6 65 47 61.8 Z', 9], // posterior deltoid, left
  ['rear_delts', 'M 113 61.8 C 111 63.6 109 65.4 107.8 67.4 C 108.2 73 110 79 112.8 85 C 114.2 88 116 90.4 117.4 91.4 C 119.4 92.4 121.8 92.6 123.6 92.4 C 124 88 123.8 83 123 78.6 C 121.2 71 117.4 65 113 61.8 Z', 9], // posterior deltoid, right
  ['side_delts', 'M 47 61.5 C 40.5 61.4 34.3 65.5 31.4 72.6 C 29.7 78 29.5 85 31.4 91.5 C 32.4 93 33.8 93.4 35 93.2 C 35.8 93.1 36.2 92.8 36.4 92.4 C 36 88 36.2 83 37 78.6 C 38.8 71 42.6 64.6 47 61.5 Z', 8], // lateral deltoid, left
  ['side_delts', 'M 113 61.5 C 119.5 61.4 125.7 65.5 128.6 72.6 C 130.3 78 130.5 85 128.6 91.5 C 127.6 93 126.2 93.4 125 93.2 C 124.2 93.1 123.8 92.8 123.6 92.4 C 124 88 123.8 83 123 78.6 C 121.2 71 117.4 64.6 113 61.5 Z', 8], // lateral deltoid, right
  ['back', 'M 53.6 72.6 C 56.4 77.4 59 82 61.4 86 C 62.8 89.6 63 94.8 62 100.2 C 58.6 100 55.4 98.6 52.6 96 C 50.8 88 51.4 79 53.6 72.6 Z', 14], // infraspinatus and teres, left
  ['back', 'M 106.4 72.6 C 103.6 77.4 101 82 98.6 86 C 97.2 89.6 97 94.8 98 100.2 C 101.4 100 104.6 98.6 107.4 96 C 109.2 88 108.6 79 106.4 72.6 Z', 14], // infraspinatus and teres, right
  ['back', 'M 66.6 102.2 C 61.4 101.2 56.4 99.6 52.8 98 C 54.2 106 56.4 114.6 58 122.8 C 59 129 58.8 136 57.2 142.6 C 61.4 146.6 66 148.6 70.2 148.8 C 70.6 138 70.8 126 70.4 118 C 69.8 110 69 105.6 66.6 102.2 Z', 8], // latissimus dorsi, left
  ['back', 'M 93.4 102.2 C 98.6 101.2 103.6 99.6 107.2 98 C 105.8 106 103.6 114.6 102 122.8 C 101 129 101.2 136 102.8 142.6 C 98.6 146.6 94 148.6 89.8 148.8 C 89.4 138 89.2 126 89.6 118 C 90.2 110 91 105.6 93.4 102.2 Z', 8], // latissimus dorsi, right
  ['back', 'M 78.6 110 C 76 107 73.4 108 72 112 C 71.2 122 71 133 71.8 140.6 C 72.6 144.4 75.2 147 78.6 148.4 Z', 18], // erector spinae, left
  ['back', 'M 81.4 110 C 84 107 86.6 108 88 112 C 88.8 122 89 133 88.2 140.6 C 87.4 144.4 84.8 147 81.4 148.4 Z', 18], // erector spinae, right
  ['triceps', 'M 36 93.8 C 32.4 96.8 31 104 31.4 112 C 31.6 116.6 33 119.8 35 121.6 C 39.2 121.8 43.6 120.2 45.4 116.6 C 47 110.6 46.4 101.8 42.6 96 C 40.8 94 38 93.2 36 93.8 Z', 10], // triceps brachii, left
  ['triceps', 'M 124 93.8 C 127.6 96.8 129 104 128.6 112 C 128.4 116.6 127 119.8 125 121.6 C 120.8 121.8 116.4 120.2 114.6 116.6 C 113 110.6 113.6 101.8 117.4 96 C 119.2 94 122 93.2 124 93.8 Z', 10], // triceps brachii, right
  ['forearms', 'M 30.6 124.8 C 33.4 123.4 40.2 123.2 43.4 125.8 C 44.2 133 43.6 141 42.2 148.6 C 41.2 155 39.8 162 38.4 168.2 C 36.2 169.6 33.2 169.6 31.4 168.2 C 29.6 161 28.2 154 28 146.4 C 27.8 139 28.6 131 30.6 124.8 Z', 10], // forearm extensors, left
  ['forearms', 'M 129.4 124.8 C 126.6 123.4 119.8 123.2 116.6 125.8 C 115.8 133 116.4 141 117.8 148.6 C 118.8 155 120.2 162 121.6 168.2 C 123.8 169.6 126.8 169.6 128.6 168.2 C 130.4 161 131.8 154 132 146.4 C 132.2 139 131.4 131 129.4 124.8 Z', 10], // forearm extensors, right
  ['glutes', 'M 78.8 151 C 72 149.6 64 150 58.2 153 C 54 156.4 52 162 52.8 167.6 C 53.8 173 58.4 175.4 64 176 C 70.4 176.4 76 175 78.8 172.6 C 79.6 164 79.6 156 78.8 151 Z', 0], // gluteus maximus, left
  ['glutes', 'M 81.2 151 C 88 149.6 96 150 101.8 153 C 106 156.4 108 162 107.2 167.6 C 106.2 173 101.6 175.4 96 176 C 89.6 176.4 84 175 81.2 172.6 C 80.4 164 80.4 156 81.2 151 Z', 0], // gluteus maximus, right
  ['hamstrings', 'M 56.6 179.4 C 53.6 190 52.6 202 54.6 212 C 55.8 218 57.8 222 60.6 224.4 C 63.2 223 64.4 220 64.6 216.6 C 64 206 64.4 193 65 183 C 62.6 180 59.6 179 56.6 179.4 Z', 14], // biceps femoris, left
  ['hamstrings', 'M 103.4 179.4 C 106.4 190 107.4 202 105.4 212 C 104.2 218 102.2 222 99.4 224.4 C 96.8 223 95.6 220 95.4 216.6 C 96 206 95.6 193 95 183 C 97.4 180 100.4 179 103.4 179.4 Z', 14], // biceps femoris, right
  ['hamstrings', 'M 67 183 C 66.4 194 66.6 206 67.6 216.6 C 68 220.4 69.4 223.6 71.8 225 C 74.6 224 76.4 221 76.8 217.4 C 77.8 208 78.6 195 78.6 183.4 C 76 180.6 70.6 180.2 67 183 Z', 13], // semitendinosus and semimembranosus, left
  ['hamstrings', 'M 93 183 C 93.6 194 93.4 206 92.4 216.6 C 92 220.4 90.6 223.6 88.2 225 C 85.4 224 83.6 221 83.2 217.4 C 82.2 208 81.4 195 81.4 183.4 C 84 180.6 89.4 180.2 93 183 Z', 13], // semitendinosus and semimembranosus, right
  ['calves', 'M 56.6 237 C 54.2 244 53.8 254 55.4 262 C 56.4 266.6 58.6 270.4 61.2 273.6 C 62.6 270 63.6 264 63.8 258 C 64 250 63.2 242 61.6 237 C 60 236 58.2 236 56.6 237 Z', 16], // lateral gastrocnemius, left
  ['calves', 'M 103.4 237 C 105.8 244 106.2 254 104.6 262 C 103.6 266.6 101.4 270.4 98.8 273.6 C 97.4 270 96.4 264 96.2 258 C 96 250 96.8 242 98.4 237 C 100 236 101.8 236 103.4 237 Z', 16], // lateral gastrocnemius, right
  ['calves', 'M 66.4 237 C 66 244 66.2 252 67.2 259 C 68 264.6 69.8 270.2 72 274.6 C 73.6 270.6 74.4 264 74.6 257.4 C 74.8 249.8 74.4 242.4 72.6 237.4 C 70.4 235.8 68.2 235.8 66.4 237 Z', 17], // medial gastrocnemius, left
  ['calves', 'M 93.6 237 C 94 244 93.8 252 92.8 259 C 92 264.6 90.2 270.2 88 274.6 C 86.4 270.6 85.6 264 85.4 257.4 C 85.2 249.8 85.6 242.4 87.4 237.4 C 89.6 235.8 91.8 235.8 93.6 237 Z', 17], // medial gastrocnemius, right
];

// Hit twins, per view, in draw order (bottom to top): the smallest region
// last, ties by row order, so a tiny muscle keeps the bare skin around it
// when two twins overlap.
function hitTwins(rows) {
  return rows
    .map(([key, d, hit], i) => ({ key, d, hit, i }))
    .filter((row) => row.hit > 0)
    .sort((a, b) => (a.hit - b.hit) || (a.i - b.i));
}
const FRONT_HITS = hitTwins(FRONT_MUSCLES);
const BACK_HITS = hitTwins(BACK_MUSCLES);

// A4 division fingerprint: where each marked muscle's small triangle sits, in
// each view's own 160 x 320 co-ordinate space. Each point is the centre of the
// bounding box of the muscle's LEFT-side shapes on that view, so the marker
// lies over the muscle; where that centre falls in a gap or outside a thin
// shape (side delts, hamstrings, calves) it is the middle of the widest run of
// the muscle's own shape at that height, and for the abs it is the left
// rectus rows. BodyDiagramHeatmap.test.js re-derives every point from the path
// data and checks it lies inside one of the muscle's own shapes. Side delts
// are drawn now, so they take a marker (front view); forearms and adductors
// still take none, as before: the routine-detail fingerprint line names them.
const DIVISION_MARKER_ANCHORS = {
  front: {
    front_delts: { x: 45.6, y: 77.1 },
    side_delts:  { x: 33.9, y: 77.4 },
    chest:       { x: 62.7, y: 81.4 },
    biceps:      { x: 39.1, y: 108.3 },
    abs:         { x: 74.8, y: 124 },
    quads:       { x: 63.9, y: 195.5 },
  },
  back: {
    traps:       { x: 64.2, y: 77.2 },
    rear_delts:  { x: 44.2, y: 77.1 },
    back:        { x: 65.1, y: 110.7 },
    triceps:     { x: 38.8, y: 107.6 },
    glutes:      { x: 66, y: 163.1 },
    hamstrings:  { x: 72.5, y: 202.2 },
    calves:      { x: 59.3, y: 255.4 },
  },
};

// ─── Palettes ────────────────────────────────────────────────────────────────
// Each takes the LIVE colour table (`t.colors`, so a theme flip repaints) and
// one entry, and returns the paint props of one muscle shape. A filled region
// is separated from its neighbours by a hairline in the card's own ground
// (`surface`); a quiet region (no fill, recovered) keeps the visible `border`
// hairline.

// Volume: the colour the screen resolved for the entry, exactly as before.
// No entry, or an entry with no colour, is "No sets".
function volumePaint(c, entry) {
  const fill = entry && entry.color;
  if (!fill) return { fill: NO_FILL, stroke: c.border, strokeWidth: HAIRLINE };
  return { fill, stroke: c.surface, strokeWidth: HAIRLINE };
}

// Neutral volume (a recovery week): any logged work is one quiet shade; no
// colour on the figure claims a verdict.
// A trained muscle is the quiet fill with a solid hairline and an untrained
// one no fill with a DASHED hairline, so the two differ by shape as well as
// tone (surface3 against the card ground is 1.4:1 in the dark palette, lane
// 5 review S3), the same rule the recovery palette's quiet states follow.
function neutralVolumePaint(c, entry) {
  const trained = !!entry && (!!entry.color || (Number(entry.workingSets) || 0) > 0);
  if (!trained) return { fill: NO_FILL, stroke: c.border, strokeWidth: HAIRLINE, strokeDasharray: DASH };
  return { fill: c.surface3, stroke: c.border, strokeWidth: HAIRLINE };
}

// Recovery: which of the five looks a muscle takes. `status` decides first
// ('no_recent_session' carries recoveredPercent 100, so the percent alone
// would misread it as recovered); inside 'recovering' the percent picks the
// depth, and an entry with no usable percent takes the strongest, the most
// cautious reading of a muscle that is certainly still recovering.
function recoveryBand(entry) {
  const status = entry && entry.status;
  if (status === 'recovered') return 'recovered';
  if (status === 'nearly') return 'nearly';
  if (status === 'recovering') {
    const percent = Number(entry.recoveredPercent);
    return Number.isFinite(percent) && percent >= 50 ? 'half' : 'deep';
  }
  return 'none';
}

function recoveryPaint(c, entry) {
  switch (recoveryBand(entry)) {
    case 'deep':
      return { fill: c.recovery, stroke: c.surface, strokeWidth: HAIRLINE };
    case 'half':
      return { fill: withAlpha(c.recovery, alpha.half), stroke: c.surface, strokeWidth: HAIRLINE };
    case 'nearly':
      return { fill: withAlpha(c.recovery, alpha.edge), stroke: c.recovery, strokeWidth: NEARLY_STROKE };
    case 'recovered':
      return { fill: c.surface3, stroke: c.border, strokeWidth: HAIRLINE };
    default:
      return { fill: NO_FILL, stroke: c.border, strokeWidth: HAIRLINE, strokeDasharray: DASH };
  }
}

// ─── Legends (both through LegendRow) ───────────────────────────────────────
// D219 (design 5.3, lane A5): the legend names the four tones the one judgement
// paints (volumeJudgement.toneColors: no warning or error token; the highest
// band is an information colour), in the words of volumeBandLabels.js.
function volumeLegendItems(c) {
  const tone = toneColors(c);
  return [
    { key: TONE.BELOW, label: VOLUME_TONE_LABELS[TONE.BELOW], swatch: { fill: tone[TONE.BELOW] } },
    { key: TONE.BUILDING, label: VOLUME_TONE_LABELS[TONE.BUILDING], swatch: { fill: tone[TONE.BUILDING] } },
    { key: TONE.GROWTH, label: VOLUME_TONE_LABELS[TONE.GROWTH], swatch: { fill: tone[TONE.GROWTH] } },
    { key: TONE.BEYOND, label: VOLUME_TONE_LABELS[TONE.BEYOND], swatch: { fill: tone[TONE.BEYOND] } },
    { key: 'none', label: 'No sets', swatch: { outline: 'solid' } },
  ];
}

function neutralVolumeLegendItems(c) {
  return [
    { key: 'trained', label: 'Trained', swatch: { fill: c.surface3, outline: 'solid' } },
    { key: 'none', label: 'No sets', swatch: { outline: 'dashed' } },
  ];
}

function recoveryLegendItems(c) {
  return [
    {
      key: 'ramp',
      label: 'More to recover',
      endLabel: 'less',
      spokenLabel: 'Stronger fill, more to recover; lighter fill, less',
      swatch: {
        ramp: [
          c.recovery,
          withAlpha(c.recovery, alpha.half),
          { fill: withAlpha(c.recovery, alpha.edge), borderColor: c.recovery },
        ],
      },
    },
    { key: 'recovered', label: 'Recovered', swatch: { fill: c.surface3, outline: 'solid' } },
    { key: 'none', label: `No session in ${LOOKBACK_DAYS} days`, swatch: { outline: 'dashed' } },
  ];
}

// AX-04 (launch accessibility audit, docs/ux-world-class-audit-2026-07-09/):
// one concise spoken summary for the WHOLE diagram (front + back views
// together), read once as a single image. Previously each tiny shape carried
// its own accessible/accessibilityRole="button"/accessibilityLabel (15-29dp
// targets, bilateral shapes repeating identical labels, and react-native-svg's
// per-shape focusability is platform-fragile). The muscle-by-muscle detail
// lives in the screen's muscle rows, which are the real accessible + operable
// path. D201: when `recoveryByMuscle` is supplied the colouring swaps to
// recovery, so the one spoken summary swaps with it. D214: it is still one
// sentence, and now says how many muscles have no session.
function diagramSummaryLabel(volumeByMuscle, recoveryByMuscle, neutralVolume = false) {
  const total = FIGURE_MUSCLE_KEYS.length;
  if (recoveryByMuscle) {
    // The count follows the paint: a muscle counts as having a recent
    // session exactly when it is drawn with one (an unknown status is drawn
    // as no session and is spoken as no session, review S6).
    const withRecentSession = FIGURE_MUSCLE_KEYS.filter(
      m => recoveryBand(recoveryByMuscle?.[m]) !== 'none',
    ).length;
    const noSession = total - withRecentSession;
    return 'Body diagram, front and back views, colour-coded by estimated muscle recovery: '
      + `${withRecentSession} of ${total} muscles ${withRecentSession === 1 ? 'has' : 'have'} a recent session `
      + `and ${noSession} ${noSession === 1 ? 'has' : 'have'} no session in the last ${LOOKBACK_DAYS} days; `
      + 'the muscle list below has the full detail for each one.';
  }
  const withVolume = FIGURE_MUSCLE_KEYS.filter(
    m => (volumeByMuscle?.[m]?.workingSets || 0) > 0,
  ).length;
  // Neutral mode (a recovery week) draws no verdict, so the summary claims
  // none (lane 5 review N5).
  const lead = neutralVolume
    ? 'Body diagram, front and back views, showing which muscles have logged sets this window, with no verdict this recovery week. '
    : 'Body diagram, front and back views, colour-coded by weekly training volume. ';
  return lead
    + `${withVolume} of ${total} muscles have logged sets this window. `
    + 'The muscle list below has the full detail for each one.';
}

// Small solid triangle: up for a division-elevated muscle (ink, `textPrimary`),
// down for a capped one (`textMuted`). Ink, not amber: it records a fact about
// the plan, it is not the thing to do. A hairline of the card ground keeps it
// legible on any fill. Static and decorative: `pointerEvents="none"` so a tap
// on it reaches the muscle beneath (a shape with no handler would otherwise
// swallow the touch). AX-04: no accessibility props; the sighted-only
// division legend text at the foot of this component is the sole description.
function DivisionMarker({ x, y, direction, muscle, c }) {
  const up = direction === 'elevated';
  const d = up
    ? `M ${x - 4} ${y + 3} L ${x + 4} ${y + 3} L ${x} ${y - 4} Z`
    : `M ${x - 4} ${y - 3} L ${x + 4} ${y - 3} L ${x} ${y + 4} Z`;
  return (
    <Path
      d={d}
      fill={up ? c.textPrimary : c.textMuted}
      stroke={c.surface}
      strokeWidth={1}
      strokeLinejoin="round"
      pointerEvents="none"
      testID={`division-marker-${muscle}`}
    />
  );
}

function renderDivisionMarkers(figure, divisionMarkers, c) {
  if (!divisionMarkers) return null;
  const anchors = DIVISION_MARKER_ANCHORS[figure];
  return Object.entries(anchors)
    .filter(([muscle]) => divisionMarkers[muscle])
    .map(([muscle, pos]) => (
      <DivisionMarker key={muscle} muscle={muscle} x={pos.x} y={pos.y} direction={divisionMarkers[muscle]} c={c} />
    ));
}

// The silhouette, outline pass then fill pass. The outline is a 2 unit stroke
// with no fill; the fill pass paints every part in the card ground on top, so
// the inner half of each stroke (and every line where one part overlaps
// another) disappears and only a 1 unit outline of the whole body remains.
// None of it has a handler, which is why it is drawn first: it must sit below
// everything that can be tapped.
function Silhouette({ paths, c }) {
  return (
    <>
      <G>
        {paths.map((d, i) => (
          // eslint-disable-next-line react/no-array-index-key -- fixed geometry, no id of its own
          <Path key={`o${i}`} d={d} fill="none" stroke={c.border} strokeWidth={OUTLINE_STROKE} strokeLinejoin="round" />
        ))}
      </G>
      <G>
        {paths.map((d, i) => (
          // eslint-disable-next-line react/no-array-index-key -- fixed geometry, no id of its own
          <Path key={`f${i}`} d={d} fill={c.surface} />
        ))}
      </G>
    </>
  );
}

export default function BodyDiagramHeatmap({
  volumeByMuscle = {},
  onMuscleTap,
  // A4: { muscleKey: 'elevated' | 'capped' } from divisionDiff.fingerprintMarkers,
  // plus the division's display label ("Bikini"). Both omitted for everyone
  // without an active generated division plan; nothing renders then.
  divisionMarkers = null,
  divisionLabel = null,
  // D201: { [muscle]: { recoveredPercent, status } } from
  // muscleRecoveryModel.buildMuscleRecoveryMap. Additive and optional --
  // omitted (null), the figure and its legend are the volume palette.
  recoveryByMuscle = null,
  // D214: the muscle whose region is drawn selected (a 1.5 px textPrimary
  // outline on all of its shapes, drawn last so no neighbour overpaints it).
  // The caller owns the selection; the figure only draws it.
  selectedMuscle = null,
  // D214 (plan 7.4 item 2): a recovery week on the Volume heatmap draws no
  // verdict. Ignored when `recoveryByMuscle` is supplied.
  neutralVolume = false,
}) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const handle = muscle => () => {
    if (onMuscleTap) onMuscleTap(muscle);
  };

  // AX-04: per-shape onPress remains (the sighted tap-to-jump-to-the-row
  // interaction is unchanged), but the accessible/accessibilityRole/
  // accessibilityLabel trio is gone. The wrapping View below carries the
  // diagram's ONE accessible node. `testID` names the muscle for tests and
  // tooling; it is not an accessibility prop.
  const paintVolume = neutralVolume ? neutralVolumePaint : volumePaint;
  const region = muscleKey => ({
    ...(recoveryByMuscle
      ? recoveryPaint(t.colors, recoveryByMuscle?.[muscleKey])
      : paintVolume(t.colors, volumeByMuscle?.[muscleKey])),
    ...(muscleKey === selectedMuscle
      ? { stroke: t.colors.textPrimary, strokeWidth: SELECTED_STROKE, strokeDasharray: undefined }
      : null),
    strokeLinejoin: 'round',
    onPress: handle(muscleKey),
    testID: `muscle-${muscleKey}`,
  });

  const renderView = (figure, silhouette, rows, hits, offsetX) => {
    const shapes = rows.map(([key, d], i) => ({ key, d, i }));
    // The selected muscle's shapes go last so a neighbour never paints over its outline.
    const ordered = [
      ...shapes.filter(s => s.key !== selectedMuscle),
      ...shapes.filter(s => s.key === selectedMuscle),
    ];
    return (
      <G x={offsetX} y={0}>
        <Silhouette paths={silhouette} c={t.colors} />
        {hits.map(h => (
          <Path
            key={`h${h.i}`}
            d={h.d}
            fill={NO_FILL}
            stroke={NO_FILL}
            strokeWidth={h.hit}
            strokeLinejoin="round"
            strokeLinecap="round"
            onPress={handle(h.key)}
            testID={`muscle-hit-${h.key}`}
          />
        ))}
        {ordered.map(s => (
          <Path key={`${figure}-${s.i}`} d={s.d} {...region(s.key)} />
        ))}
        {/* A4: division fingerprint markers for this view's muscles */}
        {renderDivisionMarkers(figure, divisionMarkers, t.colors)}
      </G>
    );
  };

  return (
    <View style={[styles.container, live.container]}>
      <View style={styles.figureBox}>
        {/* AX-04: the SVG is one labelled summary image for assistive tech --
            see diagramSummaryLabel() above. Matches the existing
            SvgBarSparkline.js convention for wrapping a react-native-svg
            chart in a single accessible image node. */}
        <View
          style={styles.imageBox}
          accessible
          accessibilityRole="image"
          accessibilityLabel={diagramSummaryLabel(volumeByMuscle, recoveryByMuscle, neutralVolume)}
        >
          <Svg
            viewBox={`0 0 ${TOTAL_WIDTH} ${FIGURE_HEIGHT}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
          >
            {renderView('front', FRONT_SILHOUETTE, FRONT_MUSCLES, FRONT_HITS, 0)}
            {renderView('back', BACK_SILHOUETTE, BACK_MUSCLES, BACK_HITS, BACK_OFFSET_X)}
          </Svg>
        </View>

        {/* Figure labels, centred under each view */}
        <View style={styles.labelRow}>
          <View style={styles.labelCell}>
            <Text style={live.figureLabel}>Front</Text>
          </View>
          <View style={styles.labelCell}>
            <Text style={live.figureLabel}>Back</Text>
          </View>
        </View>
      </View>

      {/* Legend. D214: one legend style for both palettes (LegendRow), every
          colour on the figure named once. The recovery legend carries no
          tooltip; the volume legend keeps the plain-English gloss of the band
          words (U-F-5). */}
      <View style={[styles.legendWrap, live.legendWrap]}>
        {recoveryByMuscle ? (
          <LegendRow items={recoveryLegendItems(t.colors)} />
        ) : neutralVolume ? (
          <LegendRow items={neutralVolumeLegendItems(t.colors)} />
        ) : (
          <LegendRow
            items={volumeLegendItems(t.colors)}
            trailing={<InfoTooltip text={GLOSSARY.volumeHeatmapBands} size={14} />}
          />
        )}
      </View>

      {/* A4: division fingerprint legend, only when markers are shown. The
          triangles re-present the volume overlay the plan generator already
          applied for this division; nothing here is computed fresh. */}
      {/* F6 (progress-tab audit 2026-09-24, D200): "Elevated"/"Capped" named
          the division overlay's internal mechanism, not what it means for
          the user -- the triangles mark where THIS division's weekly target
          differs from the general plan's. Copy now says that directly. D214:
          the up triangle is ink, like the marker it names. */}
      {divisionMarkers && divisionLabel ? (
        <Text
          style={live.divisionLegendText}
          accessibilityLabel={`Triangle up means the weekly target is raised for ${divisionLabel}, triangle down means it is capped`}
        >
          <Text style={{ color: t.colors.textPrimary }}>▲</Text>
          {` weekly target raised for ${divisionLabel} · `}
          <Text style={{ color: t.colors.textMuted }}>▼</Text>
          {' capped'}
        </Text>
      ) : null}
    </View>
  );
}

// The frozen block holds only layout, spacing and radius; every colour and
// type role is live (buildLiveStyles below), the same frozen-plus-live
// pattern the tree carries.
const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  // The figure never grows past its drawing's own width, so the labels under
  // it stay centred under each view on a wide screen too.
  figureBox: {
    width: '100%',
    maxWidth: TOTAL_WIDTH,
    alignSelf: 'center',
  },
  imageBox: {
    width: '100%',
    aspectRatio: TOTAL_WIDTH / FIGURE_HEIGHT,
  },
  // Each label cell is as wide as one view and sits under it: the two views
  // are centred at 22.2% and 77.8% of the width.
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelCell: {
    width: `${(FIGURE_WIDTH / TOTAL_WIDTH) * 100}%`,
    alignItems: 'center',
  },
  legendWrap: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
});

// CP-10 theming batch (component sweep, 2026-07-10): live colours and type
// for the frozen `styles` block above (same "frozen base + live override"
// pattern as BottomSheet.js's buildLiveStyles).
function buildLiveStyles(t) {
  return {
    container: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    figureLabel: { ...t.type.overline, color: t.colors.textMuted },
    legendWrap: { borderTopColor: t.colors.border },
    divisionLegendText: { ...t.type.caption, color: t.colors.textMuted },
  };
}
