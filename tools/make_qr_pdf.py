#!/usr/bin/env python3
"""Printable A4 QR poster for www.xplore-prokletije.com, in the Xplore Prokletije style.

Vector throughout: the logo and the emblem in the middle of the code come from icons/logo.svg, the
Prokletije skyline at the bottom from data/skyline.json (Copernicus DEM, seen from 1.5 km north of Gusinje).
QR: error correction H, ink modules, blue finder rings (square: rounded finders don't decode reliably).

usage: python3 tools/make_qr_pdf.py <folder with Marcellus-Regular.ttf, Golos-Regular.ttf, Golos-SemiBold.ttf>
  -> qr/xplore-prokletije-qr.pdf   (then checked by rendering it and decoding the code)
"""
import json, os, re, sys
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode.qrencoder import QRCode, QRErrorCorrectLevel

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
FONTS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "fonts")
URL = "https://www.xplore-prokletije.com"
SHOWN = "www.xplore-prokletije.com"
OUT = os.path.join(ROOT, "qr", "xplore-prokletije-qr.pdf")

PAPER, INK, BLUE, LABEL, MUTED = HexColor("#f5f3ee"), HexColor("#17222a"), HexColor("#005af7"), HexColor("#0047c2"), HexColor("#55606b")
BANDS = [HexColor("#dfe8fb"), HexColor("#b4ccf8"), HexColor("#6f9df5"), HexColor("#0d3b9e")]   # far -> near
W, H = 210 * mm, 297 * mm

pdfmetrics.registerFont(TTFont("Marcellus", os.path.join(FONTS, "Marcellus-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Golos", os.path.join(FONTS, "Golos-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Golos-SemiBold", os.path.join(FONTS, "Golos-SemiBold.ttf")))


def svg_paths():
    s = open(os.path.join(ROOT, "icons", "logo.svg")).read()
    out = []
    for fill, d in re.findall(r'<path[^>]*fill="(#[0-9a-fA-F]{6})"[^>]*d="([^"]+)"', s):
        polys = []
        for sub in re.split(r"(?=M)", d.strip()):
            pts = [(float(x), float(y)) for x, y in re.findall(r"(-?[\d.]+),(-?[\d.]+)", sub)]
            if len(pts) > 2: polys.append(pts)
        out.append((fill, polys))
    return out


def draw_logo(c, paths, x, y, w, keep=lambda poly: True, colors=None):
    """Logo (1152 x 472 units) with its lower-left corner at x, y and width w."""
    s = w / 1152
    for fill, polys in paths:
        p = c.beginPath()
        n = 0
        for poly in polys:
            if not keep(poly): continue
            for i, (px, py) in enumerate(poly):
                X, Y = x + px * s, y + (472 - py) * s
                p.moveTo(X, Y) if i == 0 else p.lineTo(X, Y)
            p.close(); n += 1
        if n:
            c.setFillColor((colors or {}).get(fill.lower(), HexColor(fill)))
            c.drawPath(p, stroke=0, fill=1, fillMode=0)       # even-odd: windows and counters stay open


def emblem_box(paths):
    xs, ys = [], []
    for _, polys in paths:
        for poly in polys:
            if min(p[0] for p in poly) < 480:
                xs += [p[0] for p in poly]; ys += [p[1] for p in poly]
    return min(xs), min(ys), max(xs), max(ys)


def qr_matrix(text):
    for ver in range(1, 41):
        try:
            q = QRCode(ver, QRErrorCorrectLevel.H); q.addData(text); q.make()
            n = q.getModuleCount()
            return [[q.isDark(r, cc) for cc in range(n)] for r in range(n)]
        except Exception:
            continue


def spaced(c, text, font, size, y, color, space):
    c.saveState()
    c.setFont(font, size); c.setFillColor(color)
    w = pdfmetrics.stringWidth(text, font, size) + space * (len(text) - 1)
    t = c.beginText((W - w) / 2, y); t.setFont(font, size); t.setCharSpace(space); t.textLine(text)
    c.drawText(t)
    c.restoreState()


def main():
    paths = svg_paths()
    c = canvas.Canvas(OUT, pagesize=(W, H))
    c.setTitle("Xplore Prokletije – QR"); c.setAuthor("Xplore Prokletije"); c.setSubject(URL)
    c.setFillColor(PAPER); c.rect(0, 0, W, H, stroke=0, fill=1)

    # --- logo ---
    lw = 112 * mm
    draw_logo(c, paths, (W - lw) / 2, H - 20 * mm - lw * 472 / 1152, lw)
    spaced(c, "SKENIRAJTE TELEFONOM  ·  SCAN WITH YOUR PHONE  ·  SKANONI ME TELEFON", "Golos-SemiBold", 8.4, H - 79 * mm, LABEL, 0.9)

    # --- QR card ---
    M = qr_matrix(URL); n = len(M)
    card = 124 * mm
    m = card / (n + 7)                      # 3.5 modules of white on every side, then the light paper
    cx0, cy0 = (W - card) / 2, H - 87 * mm - card
    for i in range(7):                      # soft shadow
        g = (7 - i) * 0.9
        c.setFillColor(Color(0.09, 0.13, 0.17, alpha=0.018))
        c.roundRect(cx0 - g * 0.25, cy0 - 1.4 * mm - g * 0.35, card + g * 0.5, card + g * 0.5, 8 * mm, stroke=0, fill=1)
    c.setFillColor(HexColor("#ffffff")); c.setStrokeColor(Color(0.09, 0.13, 0.17, alpha=0.1)); c.setLineWidth(0.6)
    c.roundRect(cx0, cy0, card, card, 7 * mm, stroke=1, fill=1)
    b = int(round(n * 0.32)) | 1                                  # odd, so the clear square sits exactly in the middle
    r0 = (n - b) // 2
    qx, qy = cx0 + 3.5 * m, cy0 + 3.5 * m
    finder = lambda r, k: (r < 7 and k < 7) or (r < 7 and k >= n - 7) or (r >= n - 7 and k < 7)
    for r in range(n):
        for k in range(n):
            if not M[r][k] or (r0 <= r < r0 + b and r0 <= k < r0 + b): continue
            col = INK
            if finder(r, k):
                rr = r - (n - 7) if r >= n - 7 else r; kk = k - (n - 7) if k >= n - 7 else k
                col = INK if (2 <= rr <= 4 and 2 <= kk <= 4) else BLUE
            c.setFillColor(col)
            c.rect(qx + k * m, qy + (n - 1 - r) * m, m + 0.05, m + 0.05, stroke=0, fill=1)   # tiny overlap: no hairline gaps
    # the emblem in the middle: a fine blue frame, and the tower with its QR blocks
    px, py, pw = qx + r0 * m, qy + (n - r0 - b) * m, b * m
    c.setStrokeColor(BLUE); c.setLineWidth(0.7)
    c.roundRect(px + 0.55 * m, py + 0.55 * m, pw - 1.1 * m, pw - 1.1 * m, 1.6 * mm, stroke=1, fill=0)
    ex0, ey0, ex1, ey1 = emblem_box(paths)
    room = pw - 2.6 * m
    s = min(room / (ex1 - ex0), room / (ey1 - ey0))
    ew = s * 1152                                                   # logo width that gives the emblem this scale
    ox = px + pw / 2 - ((ex0 + ex1) / 2) * s
    oy = py + pw / 2 - (472 - (ey0 + ey1) / 2) * s
    draw_logo(c, paths, ox, oy, ew, keep=lambda poly: min(p[0] for p in poly) < 480)

    # --- under the card ---
    spaced(c, "Sve aplikacije  ·  All apps  ·  Të gjitha aplikacionet", "Golos", 10.5, cy0 - 12 * mm, MUTED, 0.2)
    c.setFont("Golos-SemiBold", 25); c.setFillColor(INK)
    c.drawCentredString(W / 2, cy0 - 24 * mm, SHOWN)

    # --- the Prokletije skyline ---
    sky = json.load(open(os.path.join(ROOT, "data", "skyline.json")))
    A0, A1, N = sky["A0"], sky["A1"], sky["N"]
    az0, az1 = 133.0, 249.4                                          # Bora ... Trojan
    k = 3.7 * mm
    ymap = lambda el: 7 * mm + (el + 6.2) * k
    xmap = lambda az: (az - az0) / (az1 - az0) * W
    lift = {3: 0, 2: 1.5 * mm, 1: 4 * mm, 0: 0}
    near_lo = min(sky["prof"][0][i] for i in range(N) if az0 <= A0 + (A1 - A0) * i / (N - 1) <= az1)             # nearer ridges a little higher: depth, and a dark foreground
    for j, col in zip([3, 2, 1], BANDS):             # the nearest band (the valley floor below the eye) is the footer itself
        prof = sky["prof"][j]
        p = c.beginPath(); p.moveTo(0, 0)
        for i in range(N):
            az = A0 + (A1 - A0) * i / (N - 1)
            if az < az0 - 2 or az > az1 + 2: continue
            el = (prof[max(0, i - 1)] + 2 * prof[i] + prof[min(N - 1, i + 1)]) / 4
            y = ymap(max(el, -6)) + lift[j] if j else 15 * mm + (el - near_lo) * 2.3 * mm   # the near hills below the eye: own scale
            p.lineTo(xmap(az), y)
        p.lineTo(W, 0); p.close()
        c.setFillColor(col); c.drawPath(p, stroke=0, fill=1)
    c.setFillColor(BANDS[3]); c.rect(0, 0, W, 19 * mm, stroke=0, fill=1)
    # peak names on the far ridge
    c.setFont("Golos-SemiBold", 6.6)
    for pk in sky["peaks"]:
        if pk["id"] not in ("zla-kolata", "maja-rosit", "karanfili", "trojan", "bora", "talijanka"): continue
        x, y = xmap(pk["az"]), ymap(pk["el"])
        c.setStrokeColor(LABEL); c.setLineWidth(0.45); c.line(x, y + 1.2 * mm, x, y + 4.2 * mm)
        label = f'{pk["name"]["me"]} {pk["ele"]}'
        tw = pdfmetrics.stringWidth(label, "Golos-SemiBold", 6.6)
        tx = min(max(x, 8 * mm + tw / 2), W - 8 * mm - tw / 2)         # keep the name on the page
        c.setFillColor(LABEL); c.drawCentredString(tx, y + 5.4 * mm, label)
    # footer
    spaced(c, "GUSINJE  ·  PROKLETIJE  ·  CRNA GORA", "Golos-SemiBold", 9, 11.6 * mm, HexColor("#ffffff"), 2.2)
    c.setFont("Golos", 7.6); c.setFillColor(Color(1, 1, 1, alpha=0.82))
    c.drawCentredString(W / 2, 6.0 * mm, "Uz podršku: Turistička organizacija Gusinje  ·  Ministarstvo turizma Crne Gore")
    c.showPage(); c.save()
    print(OUT, f"QR version {(n - 17) // 4}, {n} modules, module {m / mm:.2f} mm, centre {b}x{b}")


main()
