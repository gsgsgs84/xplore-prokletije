#!/usr/bin/env python3
"""QR card for the launcher, in the same style as the other Xplore Prokletije QR cards
(error correction H, the logo in the middle, blue finder squares). Checked by decoding it again.

usage: python3 tools/make_qr.py  ->  qr/xplore-prokletije.png
"""
import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from reportlab.graphics.barcode.qrencoder import QRCode, QRErrorCorrectLevel

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "qr")
URL = "https://gsgsgs84.github.io/xplore-prokletije/"
SITE_TEXT = "www.xplore-prokletije.com"          # printed under the code
INK, BLUE, WHITE, GREY = (23, 33, 42), (0, 92, 248), (255, 255, 255), (96, 104, 114)
FONTS = os.path.join(HERE, "..", "fonts")


def matrix(text):
    for ver in range(1, 41):
        try:
            q = QRCode(ver, QRErrorCorrectLevel.H); q.addData(text); q.make()
            n = q.getModuleCount()
            return np.array([[q.isDark(r, c) for c in range(n)] for r in range(n)], bool)
        except Exception:
            continue
    raise ValueError("too long")


def main():
    logo = Image.open(os.path.join(HERE, "..", "icons", "emblem.png")).convert("RGBA")   # made by tools/make_icons.py
    M = matrix(URL); n = M.shape[0]; quiet = 4
    mod = 1500 // (n + 2 * quiet); side = mod * (n + 2 * quiet)
    b = int(round(n * 0.32)) | 1                          # odd, so the cleared square sits exactly in the middle
    r0 = c0 = (n - b) // 2
    M = M.copy(); M[r0:r0 + b, c0:c0 + b] = False
    W, H = side + 160, side + 380
    img = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(img)
    ox, oy = 80, 70
    finder = lambda r, c: (r < 7 and c < 7) or (r < 7 and c >= n - 7) or (r >= n - 7 and c < 7)
    for r in range(n):
        for c in range(n):
            if M[r, c]:
                x, y = ox + (c + quiet) * mod, oy + (r + quiet) * mod
                col = INK
                if finder(r, c):
                    rr = r % (n - 7) if r >= n - 7 else r; cc = c % (n - 7) if c >= n - 7 else c
                    col = INK if (2 <= rr <= 4 and 2 <= cc <= 4) else BLUE
                d.rectangle([x, y, x + mod - 1, y + mod - 1], fill=col)
    # the emblem, centred in the cleared square with a margin of one module all round
    px, py, pw = ox + (c0 + quiet) * mod, oy + (r0 + quiet) * mod, b * mod
    lg = logo.copy(); lg.thumbnail((pw - 2 * mod, pw - 2 * mod), Image.LANCZOS)
    cx, cy = px + pw / 2, py + pw / 2
    img.paste(lg, (round(cx - lg.width / 2), round(cy - lg.height / 2)), lg)
    ty = oy + side + 10
    serif = ImageFont.truetype(os.path.join(FONTS, "marcellus.woff"), 96)
    sans = ImageFont.truetype(os.path.join(FONTS, "golos.woff"), 40)
    d.text((W / 2, ty + 60), "Xplore Prokletije", font=serif, fill=INK, anchor="mm")
    d.text((W / 2, ty + 150), "Sve aplikacije · All apps · Të gjitha aplikacionet", font=sans, fill=GREY, anchor="mm")
    d.text((W / 2, ty + 218), SITE_TEXT, font=ImageFont.truetype(os.path.join(FONTS, "golos.woff"), 46), fill=BLUE, anchor="mm")
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "xplore-prokletije.png")
    img.save(path, dpi=(300, 300))
    gray = cv2.cvtColor(np.asarray(img), cv2.COLOR_RGB2GRAY)
    for f in (0.35, 0.2):
        got = cv2.QRCodeDetector().detectAndDecode(cv2.resize(gray, None, fx=f, fy=f, interpolation=cv2.INTER_AREA))[0]
        print(f"scale {f}: {'OK' if got == URL else 'FAILED ' + repr(got)}")
    # check the emblem is centred: its visible pixels' bounding box against the cleared square
    a = np.asarray(img.crop((px, py, px + pw, py + pw)).convert("L")) < 200
    ys, xs = np.where(a)
    print("emblem margins L/R/T/B px:", xs.min(), pw - 1 - xs.max(), ys.min(), pw - 1 - ys.max())
    print(path, n, "modules")

main()
