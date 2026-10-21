#!/usr/bin/env python3
"""
scripts/site/make-images.py: the site's raster images, made with Pillow.

Run by hand when an image changes (the outputs are committed):

    python3 scripts/site/make-images.py SCREENS_DIR

SCREENS_DIR holds the app screen captures as 1080 x 1920 PNGs named as in
SCREENS below (the paper-render harness writes them as store/play/*.png).

Writes, under public/assets/:
  screens/NAME-360.webp, NAME-720.webp, NAME-720.jpg
      each app screen at two widths in WebP, plus a JPEG for browsers
      without WebP. Pages give width and height, so nothing jumps.
  brand/wordmark.png, wordmark@2x.png, wordmark@3x.png
      the header wordmark at 28, 56 and 84 px tall, cut from
      public/volyume-wordmark.png (which stays as it is: emails use it).
  share.png
      the 1200 x 630 share image: the wordmark and the site's opening line
      on the app's dark background, read from public/assets/tokens.css.

Nothing here edits public/volyume-wordmark.png, public/volyume-v.png or
public/favicon.png.
"""
import os
import re
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
        for width in WIDTHS:
            height = round(im.height * width / im.width)
            small = im.resize((width, height), Image.LANCZOS)
            small.save(os.path.join(out, name + '-' + str(width) + '.webp'), 'WEBP', quality=80, method=6)
            if width == max(WIDTHS):
                small.save(os.path.join(out, name + '-' + str(width) + '.jpg'), 'JPEG',
                           quality=80, optimize=True, progressive=True)


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
    width, height = 1200, 630
    canvas = Image.new('RGB', (width, height), token('background'))
    mark = wordmark_source()
    mark_w = 640
    mark_h = round(mark.height * mark_w / mark.width)
    mark = mark.resize((mark_w, mark_h), Image.LANCZOS)

    font = ImageFont.truetype(os.path.join(PUBLIC, 'assets', 'fonts', 'Inter-Medium.ttf'), 40)
    lines = ['Training, food and a weekly check-in,', 'with a coach that explains every change.']
    draw = ImageDraw.Draw(canvas)
    line_h = 54
    gap = 56
    block = mark_h + gap + line_h * len(lines)
    top = (height - block) // 2
    canvas.paste(mark, ((width - mark_w) // 2, top), mark)
    y = top + mark_h + gap
    ink = token('text-primary')
    for line in lines:
        w = draw.textlength(line, font=font)
        draw.text(((width - w) / 2, y), line, font=font, fill=ink)
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
