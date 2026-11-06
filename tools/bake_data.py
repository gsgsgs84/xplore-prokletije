#!/usr/bin/env python3
"""Bakes the small data files the launcher needs from the other Xplore Prokletije repos.

usage: python3 tools/bake_data.py <path to gusinjska-bastina checkout>
  -> data/teren.json  relief of the trails area as a small height grid + three trails (for the trails face)
  -> data/cube.json   the AR cube's marker cells per face (same layout as every cube app)
"""
import base64, json, os, struct, sys
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else "../src/gsgsgs84/gusinjska-bastina"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data")


def glb_positions(path):
    b = open(path, "rb").read()
    jl = struct.unpack("<I", b[12:16])[0]
    j = json.loads(b[20:20 + jl])
    bin_off = 20 + jl + 8
    acc = j["accessors"][j["meshes"][0]["primitives"][0]["attributes"]["POSITION"]]
    bv = j["bufferViews"][acc["bufferView"]]
    start = bin_off + bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    return np.frombuffer(b, dtype="<f4", count=acc["count"] * 3, offset=start).reshape(-1, 3)


def bake_relief():
    pos = glb_positions(os.path.join(SRC, "models/staze/teren.glb"))
    NX, NZ = 96, 93                       # the relief is 1 x 0.966 model units
    x0, x1, z0, z1 = -0.5, 0.5, -0.48283, 0.48283
    ix = np.clip(((pos[:, 0] - x0) / (x1 - x0) * (NX - 1)).round().astype(int), 0, NX - 1)
    iz = np.clip(((pos[:, 2] - z0) / (z1 - z0) * (NZ - 1)).round().astype(int), 0, NZ - 1)
    s = np.zeros((NZ, NX)); n = np.zeros((NZ, NX))
    np.add.at(s, (iz, ix), pos[:, 1]); np.add.at(n, (iz, ix), 1)
    h = np.where(n > 0, s / np.maximum(n, 1), np.nan)
    for _ in range(6):                   # fill empty cells from neighbours
        m = np.isnan(h)
        if not m.any(): break
        p = np.pad(h, 1, constant_values=np.nan)
        nb = np.nanmean(np.stack([p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]]), axis=0)
        h[m] = nb[m]
    lo, hi = float(np.nanmin(h)), float(np.nanmax(h))
    q = np.round((h - lo) / (hi - lo) * 255).astype(np.uint8)
    st = json.load(open(os.path.join(SRC, "data/staze.json")))
    pick = ["alipasini-izvori", "tri-vrha", "zla-kolata"]
    trails = []
    for t in st["trails"]:
        if t["id"] not in pick: continue
        pts = np.array(t["segs"][0]).reshape(-1, 3)
        keep = [pts[0]]
        for p in pts[1:]:
            if np.linalg.norm(p[[0, 2]] - keep[-1][[0, 2]]) > 0.006: keep.append(p)
        keep.append(pts[-1])
        trails.append({"id": t["id"], "color": t["color"], "name": t["name"],
                       "xz": [round(float(v), 4) for p in keep for v in (p[0], p[2])]})
    trails.sort(key=lambda t: pick.index(t["id"]))
    places = [{"id": p["id"], "xz": [p["pos"][0], p["pos"][2]], "name": p["name"]} for p in st["places"] if p["id"] in ("gusinje", "vusanje", "grebaje")]
    out = {"nx": NX, "nz": NZ, "x": [x0, x1], "z": [z0, z1], "y": [round(lo, 5), round(hi, 5)],
           "h": base64.b64encode(q.tobytes()).decode(), "trails": trails, "places": places,
           "credit": "Copernicus DEM GLO-30; trails: OpenStreetMap contributors (ODbL), peaksofthebalkans.info"}
    json.dump(out, open(os.path.join(OUT, "teren.json"), "w"), separators=(",", ":"))
    print("teren.json", NX, NZ, [len(t["xz"]) // 2 for t in trails])


def bake_cube():
    lay = json.load(open(os.path.join(SRC, "data/layout.json")))
    faces = [{"name": f["name"], "U": f["U"], "V": f["V"], "N": f["N"]} for f in lay["faces"]]
    markers = [{"id": m["id"], "face": m["face"], "c": m["center_uv"],
                "cells": "".join("".join(str(v) for v in row) for row in m["cells"])} for m in lay["markers"]]
    json.dump({"edge": lay["edge"], "cell": lay["cell"], "faces": faces, "markers": markers},
              open(os.path.join(OUT, "cube.json"), "w"), separators=(",", ":"))
    print("cube.json", len(markers), "markers")


bake_relief()
bake_cube()
