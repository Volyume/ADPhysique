#!/usr/bin/env python3
"""
scripts/site/make-images.py: the site's raster images, made with Pillow.

Run by hand when an image changes (the outputs are committed):

    python3 scripts/site/make-images.py SCREENS_DIR

SCREENS_DIR holds the app screen captures as 1080 x 1920 PNGs named as in
SCREENS below (the paper-render harness writes them as store/play/*.png).
A few are cut short (see CROPS), so their height is less than 1280 at 720 wide:
the page's width and height attributes follow the file.

Writes, under public/assets/:
  screens/NAME-360.webp, NAME-720.webp, NAME-720.jpg
      each app screen at two widths in WebP, plus a JPEG for browsers
      without WebP. Pages give width and height, so nothing jumps.
  brand/wordmark.png, wordmark@2x.png, wordmark@3x.png
      the header wordmark at 28, 56 and 84 px tall, cut from
      public/volyume-wordmark.png (which stays as it is: emails use it).
  share.png
      the 1200 x 630 share image: the wordmark at the top left and the
      site's opening line below it, left-aligned, on the app's dark
      background, read from public/assets/tokens.css.
  ../screenshots/*.jpg
      the four old store-style URLs, each holding the current crop of one
      app screen (see LEGACY_SCREENSHOTS).

Nothing here edits public/volyume-wordmark.png, public/volyume-v.png or
public/favicon.png.
"""
import os
import re
import shutil
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PUBLIC = os.path.join(ROOT, 'public')
ASSETS = os.path.join(PUBLIC, 'assets')

# capture file name -> name on the site
SCREENS = {
    '01-today.png': 'today',
    '02-train.png': 'train',
    '03-set-logged.png': 'set-logged',
    '04-workout-summary.png': 'workout-summary',
    '05-progress.png': 'progress',
    '06-recovery.png': 'recovery',
    '08-nutrition.png': 'nutrition',
    '09-weekly-coaching.png': 'coaching-decision',
}
WIDTHS = (360, 720)

# name on the site -> (top, bottom) rows of the 1080 x 1920 capture to keep.
# The capture is only ever cut, never edited. Each cut leaves out what the
# site's wording rules (docs/site-rebuild-2026-10/REVIEW-1.md, F3 and F4)
# do not allow on a page, so a page never shows it:
#   today              stops above the card that lists morning weigh-ins and
#                      the morning weight
#   train              stops above the plan tools, which name a population
#   progress           stops above the body card (trend in kg a week) and
#                      above the Your progress list, so no result shows
#   coaching-decision  stops above the line naming the weigh-ins it is based on
#   workout-summary    starts below the card that names the strongest
#                      workout in recent weeks
# Every row count is a multiple of 3, so 360 and 720 wide come out exact.
CROPS = {
    'today': (0, 1038),
    'train': (0, 1005),
    'progress': (0, 966),
    'coaching-decision': (0, 1251),
    'workout-summary': (849, 1920),
}

# Four old store-style URLs stay served, though no page links them. Each
# now holds the current crop of one app screen (REVIEW-1, N2), so none shows
# what the site's wording rules do not allow. File name -> screen name.
LEGACY_SCREENSHOTS = {
    '02_know_what_to_do_today.jpg': 'today',
    '03_plan_that_moves_with_you.jpg': 'train',
    '05_log_every_set.jpg': 'set-logged',
    '06_meals_planned_to_your_targets.jpg': 'nutrition',
}


def token(name):
    css = open(os.path.join(ASSETS, 'tokens.css'), encoding='utf-8').read()
    root = css.split(':root {', 1)[1].split('}', 1)[0]
    match = re.search(r'--color-' + re.escape(name) + r':\s*(#[0-9A-Fa-f]{6});', root)
    if not match:
        raise SystemExit('tokens.css has no dark --color-' + name + '; run node scripts/site/build.mjs first')
    value = match.group(1)
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def screens(src_dir):
    out = os.path.join(ASSETS, 'screens')
    os.makedirs(out, exist_ok=True)
    for capture, name in SCREENS.items():
        im = Image.open(os.path.join(src_dir, capture)).convert('RGB')
        if im.size != (1080, 1920):
            raise SystemExit(capture + ' is ' + str(im.size) + ', expected (1080, 1920)')
        top, bottom = CROPS.get(name, (0, im.height))
        im_cut = im.crop((0, top, im.width, bottom))
        for width in WIDTHS:
            height = round(im_cut.height * width / im_cut.width)
            small = im_cut.resize((width, height), Image.LANCZOS)
            small.save(os.path.join(out, name + '-' + str(width) + '.webp'), 'WEBP', quality=80, method=6)
            if width == max(WIDTHS):
                small.save(os.path.join(out, name + '-' + str(width) + '.jpg'), 'JPEG',
                           quality=80, optimize=True, progressive=True)
    legacy = os.path.join(PUBLIC, 'screenshots')
    os.makedirs(legacy, exist_ok=True)
    for file_name, name in LEGACY_SCREENSHOTS.items():
        shutil.copyfile(os.path.join(out, name + '-' + str(max(WIDTHS)) + '.jpg'),
                        os.path.join(legacy, file_name))


def wordmark_source():
    im = Image.open(os.path.join(PUBLIC, 'volyume-wordmark.png')).convert('RGBA')
    return im.crop(im.getbbox())


def wordmark():
    out = os.path.join(ASSETS, 'brand')
    os.makedirs(out, exist_ok=True)
    src = wordmark_source()
    for scale, suffix in ((1, ''), (2, '@2x'), (3, '@3x')):
        height = 28 * scale
        width = round(src.width * height / src.height)
        src.resize((width, height), Image.LANCZOS).save(
            os.path.join(out, 'wordmark' + suffix + '.png'), 'PNG', optimize=True)


def share_image():
    """Left-aligned and asymmetric: the wordmark at the top left, the line
    below it, also left-aligned, with the right side left empty."""
    width, height = 1200, 630
    margin = 88
    canvas = Image.new('RGB', (width, height), token('background'))
    mark = wordmark_source()
    mark_w = 420
    mark_h = round(mark.height * mark_w / mark.width)
    mark = mark.resize((mark_w, mark_h), Image.LANCZOS)
    canvas.paste(mark, (margin, margin), mark)

    font = ImageFont.truetype(os.path.join(PUBLIC, 'assets', 'fonts', 'Inter-Medium.ttf'), 52)
    lines = ['Training, food and a weekly check-in,', 'with a coach that shows its reasons.']
    draw = ImageDraw.Draw(canvas)
    line_h = 70
    y = height - margin - line_h * len(lines) + 10
    ink = token('text-primary')
    for line in lines:
        draw.text((margin, y), line, font=font, fill=ink)
        y += line_h
    canvas = canvas.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    canvas.save(os.path.join(ASSETS, 'share.png'), 'PNG', optimize=True)


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    screens(sys.argv[1])
    wordmark()
    share_image()


if __name__ == '__main__':
    main()
