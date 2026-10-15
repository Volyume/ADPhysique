/**
 * The scrim tier under a video survives the look (D229 addendum 4, rule 3;
 * fresh-eyes review 2026-10-15, blocker B3). A video's scrim tone is handed
 * in already lifted to the bright tier (videoTier in clipTone.js); the look
 * is then applied to it, and applyLookToTone recomputes luminance from the
 * frame's own dark colours, which used to drop a dark video back to the
 * lighter photo tier (topAlpha 0.52 instead of 0.74). holdVideoTier is the
 * pure rule the renderer applies after the look: never below the handed-in
 * tone's luminance (whole and top band); brighter is allowed; a photo (no
 * handed-in tone) is untouched.
 */
import { holdVideoTier, applyLookToTone } from '../drawShareCard';
import { videoTier, VIDEO_SCRIM_TIER_LUMINANCE } from '../../shareVideo/clipTone';
import { PHOTO_LOOKS } from '../photoLooks';

const DARK_FRAME = { r: 26, g: 26, b: 28, luminance: 26, topLuminance: 26 };

describe('holdVideoTier', () => {
  test('a dark video lifted to the tier stays on the tier after a look that recomputes a dark luminance', () => {
    const handedIn = videoTier(DARK_FRAME);
    expect(handedIn.luminance).toBe(VIDEO_SCRIM_TIER_LUMINANCE);
    // Any look with a colour matrix recomputes the luminance from the frame's
    // own dark colours (26, 26, 28), far below the tier.
    const afterLook = applyLookToTone(handedIn, PHOTO_LOOKS.find((l) => l.matrix).key, 1);
    expect(afterLook.luminance).toBeLessThan(VIDEO_SCRIM_TIER_LUMINANCE);
    const held = holdVideoTier(afterLook, handedIn);
    expect(held.luminance).toBe(VIDEO_SCRIM_TIER_LUMINANCE);
    expect(held.topLuminance).toBe(VIDEO_SCRIM_TIER_LUMINANCE);
    expect(held.r).toBe(afterLook.r); // the colour the look made is kept
  });

  test('every look at 0.5 and 1.0 leaves a dark and a mid video at or above the tier', () => {
    const frames = [DARK_FRAME, { r: 110, g: 110, b: 112, luminance: 110, topLuminance: 118 }];
    PHOTO_LOOKS.filter((l) => l.matrix).forEach((look) => {
      [0.5, 1].forEach((strength) => {
        frames.forEach((frame) => {
          const handedIn = videoTier(frame);
          const held = holdVideoTier(applyLookToTone(handedIn, look.key, strength), handedIn);
          expect({ look: look.key, strength, ok: held.luminance >= VIDEO_SCRIM_TIER_LUMINANCE })
            .toEqual({ look: look.key, strength, ok: true });
          expect(held.topLuminance).toBeGreaterThanOrEqual(VIDEO_SCRIM_TIER_LUMINANCE);
        });
      });
    });
  });

  test('a look may brighten the judged tone, never lower it below the handed-in one', () => {
    const handedIn = videoTier({ r: 200, g: 200, b: 200, luminance: 200, topLuminance: 210 });
    expect(holdVideoTier({ r: 90, g: 90, b: 90, luminance: 90, topLuminance: 95 }, handedIn))
      .toMatchObject({ luminance: 200, topLuminance: 210 });
    expect(holdVideoTier({ r: 230, g: 230, b: 230, luminance: 230, topLuminance: 240 }, handedIn))
      .toMatchObject({ luminance: 230, topLuminance: 240 });
  });

  test('a photo (no handed-in tone) and the untouched no-look path are returned as they are', () => {
    const tone = { r: 40, g: 40, b: 40, luminance: 40 };
    expect(holdVideoTier(tone, null)).toBe(tone);
    expect(holdVideoTier(tone, tone)).toBe(tone);
    expect(holdVideoTier(null, tone)).toBeNull();
  });
});
