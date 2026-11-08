"""Draws the app icons (icons/*.png): a green reticle with an amber centre on the dark theme background.
Run: python tools/make_icons.py"""
import colorsys, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
def hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb(h / 360, l, s)
    return tuple(round(c * 255) for c in (r, g, b))
BG, CARD, GREEN, AMBER, LINE = hsl(220, .2, .04), hsl(220, .18, .07), hsl(140, .7, .55), hsl(36, .9, .55), hsl(140, .3, .18)

def draw(size, pad):
    """pad: share of the canvas kept clear around the art (maskable icons need ~10% each side)."""
    S = size * 4  # draw big, then shrink for smooth edges
    im = Image.new('RGB', (S, S), BG); d = ImageDraw.Draw(im)
    c, R = S / 2, S * (.5 - pad)
    d.rounded_rectangle([c - R, c - R, c + R, c + R], radius=R * .22, fill=CARD, outline=LINE, width=round(S * .012))
    w = round(S * .045); r = R * .58
    d.ellipse([c - r, c - r, c + r, c + r], outline=GREEN, width=w)
    gap, out = R * .2, R * .82  # crosshair ticks, open in the middle
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        d.line([c + dx * gap, c + dy * gap, c + dx * out, c + dy * out], fill=GREEN, width=w)
    k = R * .13  # amber diamond, same shape as the in-game pips
    d.polygon([(c, c - k), (c + k, c), (c, c + k), (c - k, c)], fill=AMBER)
    return im.resize((size, size), Image.LANCZOS)

for name, size, pad in [('icon-192', 192, .04), ('icon-512', 512, .04), ('maskable-512', 512, .14), ('apple-touch-icon', 180, .0)]:
    draw(size, pad).save(os.path.join(HERE, '..', 'public', 'icons', name + '.png'))
print('icons written')
