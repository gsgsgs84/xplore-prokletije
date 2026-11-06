# Xplore Prokletije – the launcher

One page that opens every Xplore Prokletije app. A 3D copy of the printed AR cube floats over the real Prokletije
skyline. Each roll of the cube brings the next app's little scene up on its top face; tap the cube (or **Otvori**) and
the camera dives into the app.

**Live:** https://gsgsgs84.github.io/xplore-prokletije/ · QR card: `qr/xplore-prokletije.png` · A4 QR poster for
www.xplore-prokletije.com: `qr/xplore-prokletije-qr.pdf` (`tools/make_qr_pdf.py`, vector, checked by decoding)

Runs in the phone's browser (Safari on iPhone, Chrome on Android), no install. ME / SQ / EN.

## The apps on the cube

| # | App | Link | Scene on the cube | Real cube face (scan) |
|---|---|---|---|---|
| 1 | Muzej na kocki | gsgsgs84.github.io/gusinjska-bastina/kocka.html | limestone pedestal, brass plate; a copper džezva and a lantern take turns | top |
| 2 | Mapa Gusinja | wave84mn.github.io/city-map/ | the town model; the ring fills over a landmark and a light rises | right |
| 3 | Gusinjska kocka (v2) | bertiscus.github.io/gusinjska-kocka/v2/ | meadow maze with dry-stone walls; the marble rolls to a kula that lights up | front |
| 4 | Slagalica Gusinje | wave84mn.github.io/gusinje-slagalica/ | the 64 jigsaw pieces fly into the tray, Čekića džamija's piece last | left |
| 5 | Planinarske staze u 3D | gsgsgs84.github.io/gusinjska-bastina/staze.html | the real relief (Copernicus DEM) with three trails drawing themselves | back |
| 6 | Gdje su mace? | gsgsgs84.github.io/gusinjska-bastina/mace.html | a room corner with the sehara; a white kitten peeks, a grey one strolls by | bottom |

The list (**Aplikacije**) also links Mladina sehara (room test) and the museum app's home page.
Every link gets `?lang=me|sq|en`. Edit `js/apps.js` to change names, texts or links.

## Effects

- **Intro** (once per visit, tap to skip): the logo is built from the vector logo in 3D. The QR blocks fly in and
  snap together, the tower rises and the letters drop in. Then the cube "3D prints" itself layer by layer, with a
  glowing nozzle and a hot layer line, and its LED switches on.
- **Cube:** the real marker cells, layout and ids from the AR cube, in translucent green over black, glowing from inside.
- **Rolling:** drag, the arrows, the dots or the keyboard (← →). The cube hops over its edge; the old scene sinks into
  the face and the new one rises out of it (clipping plane) with a ring of light and sparks.
- **Sky:** the real skyline seen from 1.5 km north of Gusinje, 400 m up (same data as the museum home page), in three
  layers with mist between them. Colours, sun, moon and stars follow the real time of day in Gusinje. The far
  ridge gets snow caps from November to April, and it snows in December to February.
- **Dive:** the camera flies into the scene and the screen fills with the app's colour, then the app opens.
- **Skeniraj kocku:** hold up the real printed cube; the side facing the camera picks the app (hold still 1.3 s to
  open). It uses the same marker detector as the museum's cube page, runs only on the phone, and loads only when tapped.
- Small synthesised sounds (mute button), a short vibration on Android.

## For every phone

- Spinning works by dragging, so it doesn't need a gyroscope. Where the phone has one, tilting adds a little parallax.
- The first load is about 0.4 MB compressed (three.js included). The town model (0.9 MB) loads after that, in the background.
- If the phone can't keep 26 fps, it lowers the resolution and then turns off shadows.
- Without WebGL the page shows the plain list of apps. Reduced motion skips the intro and shortens the animations.
- It works offline after the first visit (service worker) and can be installed to the home screen.

## Testing options

`?t=19.5` (hour of the day), `?season=winter|summer`, `?app=mapa` (start on an app), `?intro=1|0`, `?lang=sq`,
`?debug` (fps and draw calls), `?no3d` (the plain list).

## Files

- `index.html`, `css/app.css`: the page and the card UI.
- `js/main.js`: renderer, camera, rolling, dive, intro, input, performance guard.
- `js/sky.js`: sky, skyline layers, sun and moon position (NOAA approximation), stars, mist, snow.
- `js/cube.js`: the cube with its markers and glow. `js/logo.js`: the 3D logo. `js/fx.js`: shared effects.
- `js/scenes/*.js`: the six scenes. `cat.js` is the kitten from Gdje su mace?. `common.js` loads the town model.
- `js/scan.js`, `js/cv/detector.js`: scanning the real cube (detector from the museum app, js-aruco licence beside it).
- `data/`: `skyline.json` (museum), `town.glb` (Mapa Gusinja), `teren.json` and `cube.json` made by
  `tools/bake_data.py` from the museum repo.
- `vendor/three/`: three.js r184 (MIT), the Safari-patched copy from Gusinjska kocka v2.
- `fonts/`: Marcellus and Golos Text, subset to Latin (SIL Open Font License, licences beside them).
- `tools/shot.cjs`, `tools/interact.cjs`: headless Chromium screenshots and an interaction test.
  `tools/make_qr.py` makes the QR card.

## Credits

Supported by Turistička organizacija Gusinje and the Ministry of Tourism of Montenegro. Panorama and relief:
Copernicus DEM GLO-30. Trails: © OpenStreetMap contributors (ODbL), peaksofthebalkans.info.
Albanian texts were written by Claude and should be checked by a native speaker.
