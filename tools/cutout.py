"""Remove the flat grey background from a generated character.
Usage: python3 tools/cutout.py in.png out.png [x,y ...]  (extra seeds for enclosed background, raw image coords)"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
im = Image.open(sys.argv[1]).convert("RGB"); W, H = im.size; work = im.copy(); KEY = (255, 0, 255)
extra = [tuple(map(int, a.split(','))) for a in sys.argv[3:]]
for s in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, 0), (W // 2, H - 1), (0, H // 2), (W - 1, H // 2)] + extra:
    if work.getpixel(s) != KEY:
        ImageDraw.floodfill(work, s, KEY, thresh=22)
mask = Image.eval(ImageChops.difference(work, Image.new("RGB", (W, H), KEY)).convert("L"), lambda v: 255 if v > 8 else 0)
mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
out = im.convert("RGBA"); out.putalpha(mask)
bb = out.getbbox(); out = out.crop(bb); out.save(sys.argv[2]); print(sys.argv[2], out.size, "bbox", bb)
