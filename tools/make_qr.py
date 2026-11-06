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
    src = Image.open(os.path.join(HERE, "..", "icons", "icon-512.png")).convert("RGBA")
    a = np.asarray(src).copy(); cream = (np.abs(a[..., :3].astype(int) - [244, 239, 228]).max(-1) < 14)
    a[cream] = [255, 255, 255, 255]
    logo = Image.fromarray(a, "RGBA"); logo = logo.crop(Image.eval(logo.convert("L"), lambda v: 255 if v < 200 else 0).getbbox())
    M = matrix(URL); n = M.shape[0]; quiet = 4
    mod = 1500 // (n + 2 * quiet); side = mod * (n + 2 * quiet)
    b = int(round(n * 0.3)) | 1
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
    px, py, pw = ox + (c0 + quiet) * mod, oy + (r0 + quiet) * mod, b * mod
    d.rounded_rectangle([px, py, px + pw - 1, py + pw - 1], radius=mod, fill=WHITE)
    lg = logo.copy(); lg.thumbnail((pw - 2 * mod, pw - 2 * mod), Image.LANCZOS)
    img.paste(lg, (px + (pw - lg.width) // 2, py + (pw - lg.height) // 2), lg)
    ty = oy + side + 10
    serif = ImageFont.truetype(os.path.join(HERE, "..", "..", "src", "gsgsgs84", "gusinjska-bastina", "tools", "soba", "fonts", "Marcellus-Regular.ttf"), 96) \
        if os.path.exists(os.path.join(HERE, "..", "..", "src")) else ImageFont.load_default()
    d.text((W / 2, ty + 60), "Xplore Prokletije", font=serif, fill=INK, anchor="mm")
    sans = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    d.text((W / 2, ty + 150), "Sve aplikacije · All apps · Të gjitha aplikacionet", font=ImageFont.truetype(sans, 40), fill=GREY, anchor="mm")
    d.text((W / 2, ty + 215), URL.replace("https://", ""), font=ImageFont.truetype(sans, 32), fill=(128, 136, 146), anchor="mm")
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "xplore-prokletije.png")
    img.save(path, dpi=(300, 300))
    gray = cv2.cvtColor(np.asarray(img), cv2.COLOR_RGB2GRAY)
    for f in (0.35, 0.2):
        got = cv2.QRCodeDetector().detectAndDecode(cv2.resize(gray, None, fx=f, fy=f, interpolation=cv2.INTER_AREA))[0]
        print(f"scale {f}: {'OK' if got == URL else 'FAILED ' + repr(got)}")
    print(path, n, "modules")


main()
