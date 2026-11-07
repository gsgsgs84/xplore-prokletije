#!/usr/bin/env python3
"""Prepares the header photo of Prokletije for the scan effect. The photo itself is never changed:
everything here is an overlay or a mask that lines up with it pixel for pixel.

usage: python3 tools/bake_scan.py [assets/prokletije-src.jpg] [preview-dir]
  -> assets/scan-photo.jpg   the photo (re-encoded, same size)
  -> assets/scan-mask.png    quarter size: R land (below the ridge), G mist, B forest
  -> data/scan.json          the wire mesh (vertices with weights, edges), the ridge line, summits, data paths
                             along the mesh and cube spawn points (all in 0..1 image coords)
"""
import heapq, json, os, sys
import cv2
import numpy as np
from scipy.ndimage import median_filter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "assets", "prokletije-src.jpg")
PREV = sys.argv[2] if len(sys.argv) > 2 else None
rng = np.random.default_rng(7)

im = cv2.imread(SRC)
h, w = im.shape[:2]
f = im.astype(np.float32) / 255
B, G, R = f[..., 0], f[..., 1], f[..., 2]
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(np.float32)
sat, val = hsv[..., 1] / 255, hsv[..., 2] / 255
lum = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
lap = np.abs(cv2.Laplacian(cv2.GaussianBlur(lum, (0, 0), 1.4), cv2.CV_32F))
tex = cv2.GaussianBlur(lap, (0, 0), 6)

# ---------- ridge line: top of the large textured regions, then snapped to the sky edge ----------
k = 2
texs = cv2.resize(tex, (w // k, h // k), interpolation=cv2.INTER_AREA)
Hs, Ws = texs.shape
L = (texs > np.percentile(texs, 62)).astype(np.uint8)
L = cv2.morphologyEx(L, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
L = cv2.morphologyEx(L, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
n, lab, st, _ = cv2.connectedComponentsWithStats(L, 8)
keep = [i for i in range(1, n) if st[i, 4] > 0.004 * Hs * Ws]
K = np.isin(lab, keep)
auto = np.array([np.argmax(K[:, x]) if K[:, x].any() else Hs for x in range(Ws)]) * k
auto = median_filter(auto, 41)

# Right of x ~ 0.70 the far peaks sit in cloud: a hand-drawn guide (0..1 coords) that the snapping refines.
GUIDE = [(0.695, 0.465), (0.715, 0.49), (0.74, 0.535), (0.757, 0.562), (0.772, 0.558), (0.79, 0.552), (0.808, 0.536),
         (0.823, 0.533), (0.84, 0.548), (0.86, 0.572), (0.88, 0.595), (0.905, 0.625), (0.93, 0.64), (0.95, 0.63),
         (0.97, 0.585), (0.985, 0.565), (1.0, 0.565)]
gx = np.array([p[0] for p in GUIDE]) * w
gy = np.array([p[1] for p in GUIDE]) * h
xs = np.arange(w)
ridge = np.interp(xs, np.arange(Ws) * k, auto)
right = xs >= gx[0]
ridge[right] = np.interp(xs[right], gx, gy)

# snap: in each column, the y within +-R where "sky above, land below" is strongest
skyness = np.clip((B - R) * 4.0, 0, 1) * 0.65 + np.clip((val - 0.68) * 3, 0, 1) * 0.55 * (tex < 0.02)
skyness = cv2.GaussianBlur(skyness, (0, 0), 2)
cs = np.vstack([np.zeros((1, w)), np.cumsum(skyness, axis=0)])
snapped = ridge.copy()
for x in range(w):
    y0 = int(ridge[x]); best, by = -9, y0
    for y in range(max(8, y0 - 26), min(h - 9, y0 + 26)):
        s = (cs[y, x] - cs[y - 8, x]) / 8 - (cs[y + 8, x] - cs[y, x]) / 8 - abs(y - y0) * 0.004
        if s > best: best, by = s, y
    snapped[x] = by
ridge = median_filter(snapped, 9).astype(np.float32)
ridge = cv2.GaussianBlur(ridge.reshape(1, -1), (0, 0), 2).ravel()

yy = np.arange(h).reshape(-1, 1).astype(np.float32)
land = np.clip((yy - ridge.reshape(1, -1)) / 3.0 + 0.5, 0, 1)            # ~3 px feather

# ---------- regions below the ridge ----------
forest = np.clip((G - np.maximum(R, B)) * 9 + 0.15, 0, 1) * np.clip((0.75 - val) * 3, 0, 1)
forest = cv2.GaussianBlur(forest, (0, 0), 6) * land
mist = np.clip((val - 0.55) * 4, 0, 1) * np.clip((0.22 - sat) * 6, 0, 1) * np.clip((0.04 - tex) * 40, 0, 1)
mist = cv2.GaussianBlur(mist, (0, 0), 8) * land
rock = np.clip(land - forest * 1.2 - mist * 1.4, 0, 1)

# x-ray edges of the rock: soft gradient magnitude (blurred first so JPEG blocks don't show)
gl = cv2.GaussianBlur(lum, (0, 0), 1.6)
gxm, gym = cv2.Sobel(gl, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(gl, cv2.CV_32F, 0, 1, ksize=3)
edges = np.sqrt(gxm ** 2 + gym ** 2)
edges = np.clip(edges / np.percentile(edges[land > 0.5], 97), 0, 1) ** 0.8 * (0.35 + 0.65 * land)

# ---------- mesh points and Delaunay ----------
pts = []
for x in range(0, w, 34):                                                    # along the ridge
    pts.append((x, ridge[x] + 2))
rock8 = ((rock > 0.5) * 255).astype(np.uint8)
c = cv2.goodFeaturesToTrack(gl, maxCorners=1100, qualityLevel=0.006, minDistance=27, mask=rock8)
pts += [tuple(p) for p in c.reshape(-1, 2)] if c is not None else []
for dens, region, md in ((0.0010, forest, 74), (0.0006, mist, 90)):          # sparser on forest and mist
    cand = np.argwhere(region > 0.5)
    rng.shuffle(cand)
    chosen = []
    for y, x in cand[: int(len(cand) * dens * 4)]:
        if all((x - a) ** 2 + (y - b) ** 2 > md * md for a, b in chosen[-200:]): chosen.append((x, y))
    pts += chosen
# fill the gaps (shaded slopes have few corners): a point wherever nothing is within 52 px
grid, GC = {}, 80
def near(x, y, r):
    gx0, gy0 = int(x // GC), int(y // GC)
    for a in (-1, 0, 1):
        for b in (-1, 0, 1):
            for (px, py) in grid.get((gx0 + a, gy0 + b), []):
                if (px - x) ** 2 + (py - y) ** 2 < r * r: return True
    return False
def add(x, y): grid.setdefault((int(x // GC), int(y // GC)), []).append((x, y))
for x, y in pts: add(x, y)
cand = np.argwhere(land > 0.6)
rng.shuffle(cand)
for y, x in cand[:60000]:
    r = 40 if y < h * 0.6 else 76
    if not near(x, y, r): add(x, y); pts.append((x, y))
pts = np.array([p for p in pts if 1 <= p[0] < w - 1 and 1 <= p[1] < h - 1], np.float32)
sub = cv2.Subdiv2D((0, 0, w, h))
for p in pts: sub.insert((float(p[0]), float(p[1])))
tris = sub.getTriangleList().reshape(-1, 3, 2)
edges_set = {}
def key(p): return (int(round(p[0])), int(round(p[1])))
for t in tris:
    if (t < 0).any() or (t[:, 0] >= w).any() or (t[:, 1] >= h).any(): continue
    cxy = t.mean(0)
    if land[int(cxy[1]), int(cxy[0])] < 0.5: continue
    for a, b in ((0, 1), (1, 2), (2, 0)):
        pa, pb = key(t[a]), key(t[b])
        L2 = (pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2
        if L2 > 165 ** 2: continue
        mid = ((pa[0] + pb[0]) // 2, (pa[1] + pb[1]) // 2)
        if land[mid[1], mid[0]] < 0.5: continue
        edges_set[tuple(sorted((pa, pb)))] = 1
print("mesh:", len(pts), "points,", len(edges_set), "edges")

deg = {}
for (pa, pb) in edges_set:
    deg[pa] = deg.get(pa, 0) + 1; deg[pb] = deg.get(pb, 0) + 1

# ---------- summits, data paths, cube spawns ----------
peaks = []
win = 110
for x in range(40, w - 40):
    lo, hi = max(0, x - win), min(w, x + win)
    if ridge[x] <= ridge[lo:hi].min() + 0.01 and ridge[x] < h * 0.62:
        if not peaks or x - peaks[-1][0] > win: peaks.append((x, float(ridge[x])))
peaks = sorted(peaks, key=lambda p: p[1])[:4]
peaks.sort()
print("summits:", peaks)

graph = {}
for (pa, pb) in edges_set:
    d = ((pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2) ** 0.5
    mx, my = (pa[0] + pb[0]) // 2, (pa[1] + pb[1]) // 2
    cost = d * (1.0 + 2.0 * forest[my, mx] + 3.0 * mist[my, mx])        # paths prefer the rock faces
    graph.setdefault(pa, []).append((pb, cost)); graph.setdefault(pb, []).append((pa, cost))
vlist = list(graph.keys())
def nearest(x, y): return min(vlist, key=lambda v: (v[0] - x) ** 2 + (v[1] - y) ** 2)
def dijkstra(a, b):
    dist, prev, pq = {a: 0}, {}, [(0, a)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == b: break
        if d > dist[u]: continue
        for v, c2 in graph[u]:
            nd = d + c2
            if nd < dist.get(v, 1e18): dist[v] = nd; prev[v] = u; heapq.heappush(pq, (nd, v))
    path = [b]
    while path[-1] != a and path[-1] in prev: path.append(prev[path[-1]])
    return path[::-1]
ends = [((0.06, 0.42), (0.44, 0.62)), ((0.30, 0.47), (0.66, 0.66)), ((0.52, 0.52), (0.86, 0.70))]
paths = []
for (ax, ay), (bx, by) in ends:
    p = dijkstra(nearest(ax * w, ay * h), nearest(bx * w, by * h))
    paths.append([[round(x / w, 4), round(y / h, 4)] for x, y in p])
spawns = [[round(x / w, 4), round(y / h, 4)] for x, y in peaks]
for _ in range(10):
    x = int(rng.uniform(0.04, 0.96) * w); spawns.append([round(x / w, 4), round(float(ridge[x] + rng.uniform(20, 120)) / h, 4)])

# ---------- write ----------
def smoothstep(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
verts = list(deg.keys())
vid = {v: i for i, v in enumerate(verts)}
vout = []
for (x, y) in verts:
    wgt = float(np.clip(rock[y, x] + forest[y, x] * 0.45 + mist[y, x] * 0.3, 0.25, 1)) * (1 - 0.7 * smoothstep(h * 0.58, h * 0.92, y))
    vout.append([round(x / w, 4), round(y / h, 4), round(wgt, 2), deg[(x, y)]])
eout = [[vid[a], vid[b]] for a, b in edges_set]
ridge_pts = [[round(x / w, 4), round(float(ridge[x]) / h, 4)] for x in range(0, w, 6)] + [[1.0, round(float(ridge[-1]) / h, 4)]]
os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
cv2.imwrite(os.path.join(ROOT, "assets", "scan-photo.jpg"), im, [cv2.IMWRITE_JPEG_QUALITY, 82, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
m = np.dstack([forest, mist, land])                                         # OpenCV writes BGR: R=land, G=mist, B=forest
m = cv2.resize(m, (w // 4, h // 4), interpolation=cv2.INTER_AREA)
cv2.imwrite(os.path.join(ROOT, "assets", "scan-mask.png"), (m * 255).astype(np.uint8), [cv2.IMWRITE_PNG_COMPRESSION, 9])
json.dump({"w": w, "h": h, "focus": [0.42, 0.42],
           "verts": vout, "edges": eout, "ridge": ridge_pts,
           "summits": [[round(x / w, 4), round(y / h, 4)] for x, y in peaks],
           "paths": paths, "spawns": spawns,
           "credit": "Photo: Grebaje valley, Prokletije"},
          open(os.path.join(ROOT, "data", "scan.json"), "w"), separators=(",", ":"))
print("verts", len(vout), "edges", len(eout))

if PREV:
    os.makedirs(PREV, exist_ok=True)
    v = (im * 0.5).astype(np.uint8)
    for a, b in edges_set: cv2.line(v, a, b, (255, 230, 120), 1, cv2.LINE_AA)
    for p in deg: cv2.circle(v, p, 3, (200, 255, 255), -1, cv2.LINE_AA)
    cv2.polylines(v, [np.stack([xs, ridge], 1).astype(np.int32)], False, (0, 0, 255), 2)
    for p in paths: cv2.polylines(v, [(np.array(p) * [w, h]).astype(np.int32)], False, (0, 255, 255), 3)
    for x, y in peaks: cv2.drawMarker(v, (int(x), int(y)), (255, 255, 255), cv2.MARKER_CROSS, 40, 3)
    cv2.imwrite(os.path.join(PREV, "bake.jpg"), cv2.resize(v, (1024, 683)))
print("done")
