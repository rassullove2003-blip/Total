"""Remove the flat grey background from a generated character.
Usage: python3 tools/cutout.py in.png out.png [x,y ...]  (extra seeds for enclosed background, raw image coords)"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
im = Image.open(sys.argv[1]).convert("RGB"); W, H = im.size; work = im.copy(); KEY = (255, 0, 255)
GLOBAL_ABOVE = next((int(a.split('=')[1]) for a in sys.argv[3:] if a.startswith('--global-above=')), None)
extra = [tuple(map(int, a.split(','))) for a in sys.argv[3:] if not a.startswith('--')]
for s in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, 0), (W // 2, H - 1), (0, H // 2), (W - 1, H // 2)] + extra:
    if work.getpixel(s) != KEY:
        ImageDraw.floodfill(work, s, KEY, thresh=22)
mask = Image.eval(ImageChops.difference(work, Image.new("RGB", (W, H), KEY)).convert("L"), lambda v: 255 if v > 8 else 0)
if GLOBAL_ABOVE is not None:  # drop background-coloured pixels in enclosed gaps above a row (e.g. between ship rigging)
    bg = im.getpixel((2, 2)); near = Image.eval(ImageChops.difference(im, Image.new("RGB", (W, H), bg)).convert("L"), lambda v: 0 if v < 7 else 255)
    keep = Image.new("L", (W, H), 255); keep.paste(near.crop((0, 0, W, GLOBAL_ABOVE)), (0, 0))
    mask = ImageChops.multiply(mask, keep)
mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
out = im.convert("RGBA"); out.putalpha(mask)
bb = out.getbbox(); out = out.crop(bb); out.save(sys.argv[2]); print(sys.argv[2], out.size, "bbox", bb)
