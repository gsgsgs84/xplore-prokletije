# Xplore Prokletije – the launcher

One page that opens every Xplore Prokletije app, built in three.js after the approved design mockup:
the real Prokletije peaks at the top, scanned into a digital "x-ray" and back in a slow loop, the living logo below,
and a menu of five apps, each with a live 3D thumbnail made from that app's own models.

**Live:** https://gsgsgs84.github.io/xplore-prokletije/ · QR card: `qr/xplore-prokletije.png` · A4 QR poster for
www.xplore-prokletije.com: `qr/xplore-prokletije-qr.pdf` (`tools/make_qr_pdf.py`, vector, checked by decoding)

The first version, where the AR cube rolls through the apps, is kept at **kocka.html**.

Runs in the phone's browser (Safari on iPhone, Chrome on Android), no install. ME / SQ / EN.

## The page (index.html)

- **Header: the mountain scan** (`js/home/scan.js`). The photo of the peaks above Grebaje. A 16 s loop:
  - 0–2 s: the photo as it is.
  - 2–6 s: a slanted scan beam sweeps across and digitises everything behind it. The sky turns navy, the rock
    becomes a cold steel-blue x-ray with glowing contours, and a triangulated wire mesh draws itself over the
    mountains, with nodes, a glowing skyline, dotted data paths, "+" marks on the summits and glass cubes rising.
  - 6–10 s: it holds, with pulses running through the mesh.
  - 10–14 s: a second sweep clears it, and the photo is back.
  The photo's pixels are never moved, so the mountains stay exactly as photographed. Only the mist breathes a
  little, and the whole picture zooms in and out 3.5 % over the loop. The lower part fades into the paper.
- **Logo** (`js/home/logo3d.js`). The kula from the emblem is a real 3D tower: window faces with the arched door,
  QR faces, a hip roof, and the blue base frame with its square. It turns once every 24 s. The letters are cut from the
  vector logo and ride a calm wave, like boats on still water.
- **Menu.** Five rows, each with a live 3D thumbnail (`js/home/thumbs.js`):
  - Muzej na kocki: the museum's scanned džezva and fenjer take turns on a limestone pedestal.
  - Mapa Gusinja: the town model of Mapa Gusinja, with its hold-to-choose ring and light.
  - Gusinjska kocka: the meadow maze with the photo-scanned Kula Rašića of Gusinjska kocka. The ball rolls to it
    and it lights up.
  - Slagalica Gusinje: the 64 jigsaw pieces fly into the tray.
  - Planinarske staze u 3D: the Copernicus relief with real trails drawing themselves.
  The rows rise in one after another and a slow light sweeps across them. Tapping a row plays a glassy chime (one note
  per row) and vibrates briefly on Android. The row then glows in the app's colour while its thumbnail spins with
  sparks and a ring of light, the screen fills with that colour, and the app opens in the chosen language.
- "Uskoro još igrica" and the supporters' line at the bottom.

One WebGL canvas lies over the page and draws the header, the logo and the five thumbnails into their HTML boxes,
so the text stays real text. If a phone can't keep up, it lowers the resolution step by step. Without WebGL, the page
shows the photo, the logo image and still thumbnails (`assets/thumbs/`). Reduced motion stops the loop and the waves.

### Using the mountain scan elsewhere

`js/home/scan.js` is self-contained:
`new MountainScan({ photo, mask, data })`, then `setSize(width, height, dpr)`, `update(seconds)`, and render
`.scene` with `.camera` into a viewport of that size. `timeline(p)` and `digitalAt(u, v, state)` give the scan state
for anything else you want to sync.

## The apps

| # | App | Link |
|---|---|---|
| 1 | Muzej na kocki | gsgsgs84.github.io/gusinjska-bastina/kocka.html |
| 2 | Mapa Gusinja | wave84mn.github.io/city-map/ |
| 3 | Gusinjska kocka (v2) | bertiscus.github.io/gusinjska-kocka/v2/ |
| 4 | Slagalica Gusinje | wave84mn.github.io/gusinje-slagalica/ |
| 5 | Planinarske staze u 3D | gsgsgs84.github.io/gusinjska-bastina/staze.html |

Every link gets `?lang=me|sq|en`. Names and links are in `js/apps.js`; the short lines under the names and the page
texts are in `js/home/texts.js`.

## Testing options

`?lang=sq`, `?debug` (fps, and `window.__home.fix(seconds)` drives every animation from one clock),
`?t=8` (freeze the mountain loop at that second: 1 photo, 4 sweeping, 8 digital, 12 clearing), `?motion=0`,
`?no3d` (no WebGL).

## Files

- `index.html`, `css/home.css`, `js/home/main.js`: the page, the shared canvas, texts, tapping and opening.
- `js/home/scan.js`: the mountain scan. `js/home/logo3d.js`: the living logo. `js/home/thumbs.js`: the thumbnails.
  `js/home/gkm.js`: loader for the compact GKM1 models. `js/sound.js`: the chime (and the cube launcher's sounds).
- `assets/scan-photo.jpg` (the photo), `assets/scan-mask.png` (land, mist and forest masks) and `data/scan.json`
  (wire mesh, skyline, summits, data paths, cube spawns), all made by `tools/bake_scan.py` from
  `assets/prokletije-src.jpg`.
- `assets/models/`: džezva and fenjer from the museum app, simplified in Chromium by `tools/bake_models.cjs` +
  `tools/bake_models.html`; Kula Rašića from Gusinjska kocka with a smaller texture.
- `assets/thumbs/`: still thumbnails for phones without WebGL (`tools/thumbs_png.cjs`).
- `tools/home_test.cjs` (languages, tap, opening), `tools/record.cjs` (preview video frame by frame),
  `tools/shot.cjs` (screenshots).
- The cube launcher: `kocka.html`, `css/app.css`, `js/main.js`, `js/sky.js`, `js/cube.js`, `js/logo.js`, `js/scan.js`,
  `js/scenes/*.js` (the scenes are shared with the menu thumbnails).
- `vendor/three/`: three.js r184 (MIT), the Safari-patched copy from Gusinjska kocka v2.
- `fonts/`: Marcellus and Golos Text, subset to Latin (SIL Open Font License, licences beside them).

## Credits

Supported by Turistička organizacija Gusinje and the Ministry of Tourism of Montenegro. Relief: Copernicus DEM
GLO-30. Trails: © OpenStreetMap contributors (ODbL), peaksofthebalkans.info. Exhibit models: Gusinjska kulturna
baština. Building scan: Gusinjska kocka. Albanian texts were written by Claude and should be checked by a native speaker.
