#!/usr/bin/env python3
"""App icons and the emblem (tower + QR blocks, no lettering) cut from the project logo.

usage: python3 tools/make_icons.py <path to the logo PNG (xplore-prokletije-original.png, transparent)>
  -> icons/emblem.png, icon-192/512, maskable, apple-touch-icon, og.png
"""
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = os.path.join(HERE, "..", "icons")
src = Image.open(sys.argv[1]).convert("RGBA")
a = np.asarray(src).copy()
# the emblem ends at x ~ 1055 (tip of the blue base); the "X" of Xplore starts at x = 1039 above y = 560
a[:, 1070:] = 0
a[:560, 1030:] = 0
emb = Image.fromarray(a, "RGBA"); emb = emb.crop(emb.getbbox())
emb.save(os.path.join(ICONS, "emblem.png"))
print("emblem", emb.size)


def icon(size, pad=0.16, bg=(244, 239, 228, 255)):
    im = Image.new("RGBA", (size, size), bg)
    e = emb.copy(); e.thumbnail((int(size * (1 - 2 * pad)),) * 2, Image.LANCZOS)
    im.alpha_composite(e, ((size - e.width) // 2, (size - e.height) // 2))
    return im


icon(512).save(os.path.join(ICONS, "icon-512.png"))
icon(192).save(os.path.join(ICONS, "icon-192.png"))
icon(180, pad=0.14).convert("RGB").save(os.path.join(ICONS, "apple-touch-icon.png"))
icon(512, pad=0.22).save(os.path.join(ICONS, "icon-maskable-512.png"))
og = Image.new("RGBA", (1200, 630), (244, 239, 228, 255))
full = src.crop(src.getbbox()); full.thumbnail((980, 420), Image.LANCZOS)
og.alpha_composite(full, ((1200 - full.width) // 2, (630 - full.height) // 2))
og.convert("RGB").save(os.path.join(ICONS, "og.png"), optimize=True)
