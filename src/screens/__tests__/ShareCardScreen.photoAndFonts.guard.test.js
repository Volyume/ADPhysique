/**
 * The share screen's photo framing, fonts and hand-off (founder orders
 * 2026-09-26). Verbatim: "when adding a photo id like people to be able to
 * crop the photo or even move the alignment so that it shows best in the
 * background ... if I can move it up down left or right it will show
 * better", then "People can use camera or My Photo. Both should be
 * adjustable in position and size on the render and final share in the most
 * elegant way", "Use styles from the rest of the app", and "I don't want
 * exercise names list to be an option or show at all".
 *
 * Source guards, because the pieces are native (Skia, gestures) and the
 * wiring is what can silently break:
 *  - a photo from the camera or the gallery makes the preview itself live:
 *    the photo moves and resizes right on the card, which the one renderer
 *    draws over it (`omitPhoto`); a drag that starts on the photo blocks the
 *    page's scroll through the gesture system, not a timing trick;
 *  - the preview, the export and the thumbnails all draw the same framing;
 *  - the app's Inter faces load in the background and the system faces stay
 *    the fallback, so a font can never gate sharing (VOLYUME-2V);
 *  - the workout summary hands over the lifts to choose from and the
 *    session's own date, and no list of exercise names.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');
const SCREEN = read('screens/ShareCardScreen.js');
const FRAMER = read('components/SharePhotoFramer.js');
const FONTS = read('lib/shareCard/cardTypefaces.js');
const SUMMARY = read('screens/WorkoutSummaryScreen.js');

describe('moving and resizing the photo, right on the preview', () => {
  test('a photo from the camera or the gallery starts centred, and the preview is where it moves', () => {
    const accept = SCREEN.slice(SCREEN.indexOf('const acceptPhoto = useCallback('), SCREEN.indexOf('const clearPhoto = useCallback('));
    expect(accept).toContain('setPhotoCrop(null);');
    expect(accept).toContain('setFramerPhoto(makeFramerPhoto(bounded));');
    expect(SCREEN.match(/if \(img\) acceptPhoto\(img\);/g)).toHaveLength(2);
    // No separate editing step to open or close.
    expect(SCREEN).not.toMatch(/setFraming|Move and zoom photo|onDone=/);
    expect(SCREEN).toContain('const livePhoto = !!framerPhoto && !!bgPhoto && !isSticker;');
    expect(SCREEN).toMatch(/\{livePhoto \? \(\s*<SharePhotoFramer/);
  });

  test('the live preview lays the real card over the photo, drawn with the photo left out', () => {
    const overlay = SCREEN.slice(SCREEN.indexOf('const framerOverlay = useMemo('), SCREEN.indexOf('}, [livePhoto, typefaces'));
    expect(overlay).toContain('omitPhoto: true');
    expect(overlay).toContain('photoCrop');
    expect(SCREEN).toMatch(/<SharePhotoFramer[\s\S]*overlayUri=\{framerOverlay\}[\s\S]*onChange=\{setPhotoCrop\}/);
  });

  test('a drag on the photo can never scroll the page: the gestures block the page scroll', () => {
    expect(SCREEN).toContain('const scrollGesture = useMemo(() => Gesture.Native(), []);');
    expect(SCREEN).toMatch(/<GestureDetector gesture=\{scrollGesture\}>\s*<ScrollView contentContainerStyle=\{styles\.content\}>/);
    expect(SCREEN).toContain('blocksGesture={scrollGesture}');
    expect(FRAMER).toContain('pinch = pinch.blocksExternalGesture(blocksGesture);');
    expect(FRAMER).toContain('pan = pan.blocksExternalGesture(blocksGesture);');
  });

  test('the preview, the export and the thumbnails draw the same framing', () => {
    expect(SCREEN.match(/bgPhoto, photoCrop,\n/g)).toHaveLength(2);
    expect(SCREEN).toContain('}, [typefaces, wordmark, buildParams, bgPhoto, photoCrop, isSticker, cardType, format]);');
  });

  test('Reset appears once the photo has moved, and Dark clears the photo with its framing', () => {
    expect(SCREEN).toMatch(/!isCentreCrop\(photoCrop\) \? \([\s\S]{0,120}onPress=\{\(\) => setPhotoCrop\(null\)\}/);
    expect(SCREEN).toContain('Drag to move your photo. Pinch to resize it.');
    const clear = SCREEN.slice(SCREEN.indexOf('const clearPhoto = useCallback('), SCREEN.indexOf('}, []);', SCREEN.indexOf('const clearPhoto = useCallback(')));
    expect(clear).toContain('setBgPhoto(null);');
    expect(clear).toContain('setPhotoCrop(null);');
    expect(SCREEN).toMatch(/label="Dark"[\s\S]{0,80}onPress=\{clearPhoto\}/);
  });

  test('the photo moves and resizes on the UI thread, down to where it fits, with a screen-reader route', () => {
    expect(FRAMER).toContain('Gesture.Simultaneous(pinch, pan)');
    expect(FRAMER).toMatch(/function clampAxis\([^)]*\) \{\n\s*'worklet';/);
    expect(FRAMER).toContain('Math.max(minZoom, savedZoom.value * e.scale)');
    expect(FRAMER).toContain("{ name: 'moveUp', label: 'Move photo up' }");
    expect(FRAMER).toContain("{ name: 'increment', label: 'Zoom in' }");
    // The ground behind a resized-down photo is the card's own, whatever the theme.
    expect(FRAMER).toContain('backgroundColor: CARD_GROUND');
  });
});

describe("the app's typefaces", () => {
  test('Inter loads in the background and the system faces stay the floor', () => {
    expect(SCREEN).toContain('loadCardTypefaces(Skia)');
    expect(SCREEN).toContain('const merged = { ...(systemTypefaces || {}), ...(appTypefaces || {}) };');
    // Readiness is still Skia plus ANY usable faces (VOLYUME-2V).
    expect(SCREEN).toMatch(/const cardReady = !!\(Skia && typefaces\);/);
  });

  test('the loader reads the bundled Inter files and never throws', () => {
    ['Inter-Regular.ttf', 'Inter-Medium.ttf', 'Inter-SemiBold.ttf', 'Inter-Bold.ttf', 'InterDisplay-Bold.ttf', 'InterDisplay-ExtraBold.ttf']
      .forEach((f) => expect(FONTS).toContain(`assets/fonts/${f}`));
    expect(FONTS).toContain('Skia.Typeface.MakeFreeTypeFaceFromData');
  });
});

describe('the workout summary hand-off', () => {
  const share = SUMMARY.slice(SUMMARY.indexOf('function handleShareCard()'), SUMMARY.indexOf("navigation.navigate('ShareCard', { sessionData"));

  test('it hands over the lifts to choose from and the session date', () => {
    expect(share).toContain('liftOptions: liftOptionsFromExerciseData(shareExerciseData),');
    expect(share).toContain('date: startedAt ?? endedAt ?? null,');
  });

  test('no exercise names travel to the share image, not even in the title', () => {
    expect(share).not.toMatch(/exercises: exerciseNames/);
    expect(share).toContain('const sessionName = shareCardTitle(routineName, startedAt ?? endedAt);');
  });
});
