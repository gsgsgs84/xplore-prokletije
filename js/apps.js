// The Xplore Prokletije apps the launcher opens, and the launcher's own texts (ME / SQ / EN).
// Albanian texts were written by Claude and should be checked by a native speaker.

export const APPS = [
  {
    id: 'muzej', face: 'top', color: '#c8923e',
    url: 'https://gsgsgs84.github.io/gusinjska-bastina/kocka.html',
    name: { me: 'Muzej na kocki', sq: 'Muzeu mbi kub', en: 'Museum on the cube' },
    play: { me: 'S kockom', sq: 'Me kubin', en: 'With the cube' },
    desc: {
      me: 'Eksponati Gusinjske kulturne baštine izranjaju na vašoj kocki. Okrenite kocku i razgledajte ih sa svih strana.',
      sq: 'Eksponatet e trashëgimisë kulturore të Gucisë dalin mbi kubin tuaj. Rrotullojeni kubin dhe shihini nga të gjitha anët.',
      en: 'Exhibits from Gusinje’s cultural heritage rise onto your cube. Turn the cube to see them from every side.',
    },
  },
  {
    id: 'mapa', face: 'right', color: '#1a66f0',
    url: 'https://wave84mn.github.io/city-map/',
    name: { me: 'Mapa Gusinja', sq: 'Harta e Gucisë', en: 'Gusinje City Map' },
    play: { me: 'S kockom', sq: 'Me kubin', en: 'With the cube' },
    desc: {
      me: 'Cijelo Gusinje na kocki. Zadržite krug na građevini i ona izraste pred vama.',
      sq: 'E gjithë Gucia mbi kub. Mbajeni rrethin mbi një ndërtesë dhe ajo rritet para jush.',
      en: 'All of Gusinje on your cube. Hold the ring over a building and it grows in front of you.',
    },
  },
  {
    id: 'kocka', face: 'front', color: '#2f9e5c',
    url: 'https://bertiscus.github.io/gusinjska-kocka/v2/',
    name: { me: 'Gusinjska kocka', sq: 'Kubi i Gucisë', en: 'The Gusinje Cube' },
    play: { me: 'S kockom ili bez nje', sq: 'Me kub ose pa të', en: 'With or without the cube' },
    desc: {
      me: 'Nagnite kocku i provedite kuglu kroz lavirint do devet gusinjskih građevina.',
      sq: 'Anojeni kubin dhe çojeni topin nëpër labirint deri te nëntë ndërtesa të Gucisë.',
      en: 'Tilt the cube and roll the ball through the maze to nine Gusinje buildings.',
    },
  },
  {
    id: 'slagalica', face: 'left', color: '#d0643b',
    url: 'https://wave84mn.github.io/gusinje-slagalica/',
    name: { me: 'Slagalica Gusinje', sq: 'Bashko Gucinë', en: 'Gusinje Puzzle' },
    play: { me: 'Na stolu', sq: 'Në tavolinë', en: 'On the table' },
    desc: {
      me: 'Složite Gusinje od 64 dijela. Igra se prstima, a tabla može stajati i na vašem stolu.',
      sq: 'Bashkoni Gucinë nga 64 copa. Luhet me gishta, dhe tabela mund të qëndrojë edhe në tavolinën tuaj.',
      en: 'Put Gusinje together from 64 pieces. Play with your fingers, or set the tray on your own table.',
    },
  },
  {
    id: 'staze', face: 'back', color: '#1f8a8f',
    url: 'https://gsgsgs84.github.io/gusinjska-bastina/staze.html',
    name: { me: 'Planinarske staze u 3D', sq: 'Shtigjet malore në 3D', en: 'Hiking Trails in 3D' },
    play: { me: 'U 3D i na stolu', sq: 'Në 3D dhe në tavolinë', en: 'In 3D and on the table' },
    desc: {
      me: 'Prokletije u reljefu, s 18 staza oko Gusinja. Postavite planine na sto i obiđite ih.',
      sq: 'Bjeshkët e Nemuna në reliev, me 18 shtigje rreth Gucisë. Vendosini malet në tavolinë dhe ecni rreth tyre.',
      en: 'Prokletije in relief, with 18 trails around Gusinje. Put the mountains on your table and walk around them.',
    },
  },
  {
    id: 'mace', face: 'bottom', color: '#c2689a',
    url: 'https://gsgsgs84.github.io/gusinjska-bastina/mace.html',
    name: { me: 'Gdje su mace?', sq: 'Ku janë macet?', en: 'Where are the kittens?' },
    play: { me: 'U vašoj sobi', sq: 'Në dhomën tuaj', en: 'In your room' },
    desc: {
      me: 'Devet mačića krije se po vašoj sobi. Pronađite ih kamerom telefona.',
      sq: 'Nëntë kotele fshihen nëpër dhomën tuaj. Gjejini me kamerën e telefonit.',
      en: 'Nine kittens hide around your room. Find them with your phone’s camera.',
    },
  },
];

// Shown in the list only
export const EXTRA = [
  {
    id: 'sehara', color: '#8a5a2b', soon: true,
    url: 'https://gsgsgs84.github.io/gusinjska-bastina/soba-test.html',
    name: { me: 'Mladina sehara', sq: 'Sehareja e nuses', en: 'The Bride’s Chest' },
    play: { me: 'Escape room u muzeju · test sobe', sq: 'Escape room në muze · testi i dhomës', en: 'Museum escape room · room test' },
  },
  {
    id: 'bastina', color: '#2f4337',
    url: 'https://gsgsgs84.github.io/gusinjska-bastina/',
    name: { me: 'Gusinjska kulturna baština', sq: 'Trashëgimia kulturore e Gucisë', en: 'Gusinje Cultural Heritage' },
    play: { me: 'Cijela zbirka muzeja u 3D', sq: 'E gjithë koleksioni i muzeut në 3D', en: 'The whole museum collection in 3D' },
  },
];

export const UI = {
  me: {
    htmlLang: 'sr-Latn-ME',
    open: 'Otvori', scan: 'Skeniraj kocku', all: 'Aplikacije', prev: 'Prethodna', next: 'Sljedeća',
    of: 'od', soon: 'Uskoro', test: 'Test', close: 'Zatvori', sound: 'Zvuk', skip: 'Dodirnite za preskakanje',
    listTitle: 'Sve aplikacije', listLead: 'Sve rade u pregledniku telefona, bez instaliranja.',
    hint: 'Povucite kocku lijevo ili desno',
    support: 'Uz podršku', partners: ['Turistička organizacija Gusinje', 'Ministarstvo turizma Crne Gore'],
    part: 'Projekat Xplore Prokletije',
    credits: 'Panorama: Copernicus DEM GLO-30. Staze: OpenStreetMap (ODbL), peaksofthebalkans.info.',
    scanTitle: 'Pokažite kocku kameri', scanLead: 'Strana okrenuta prema kameri bira aplikaciju.',
    scanHold: 'Držite mirno…', scanStart: 'Uključujem kameru…', scanNoCam: 'Kamera nije dostupna.',
    scanDenied: 'Pristup kameri je odbijen. Dozvolite kameru u postavkama preglednika.',
    scanInApp: 'Otvorite stranicu u Safariju ili Chromeu da biste koristili kameru.',
    scanNoCube: 'Nemate kocku? Odštampajte je iz muzejske aplikacije.',
    night: 'noć', lang: 'Jezik',
  },
  sq: {
    htmlLang: 'sq',
    open: 'Hape', scan: 'Skano kubin', all: 'Aplikacionet', prev: 'I mëparshmi', next: 'I radhës',
    of: 'nga', soon: 'Së shpejti', test: 'Test', close: 'Mbyll', sound: 'Zëri', skip: 'Prekni për ta kaluar',
    listTitle: 'Të gjitha aplikacionet', listLead: 'Të gjitha punojnë në shfletuesin e telefonit, pa instalim.',
    hint: 'Tërhiqeni kubin majtas ose djathtas',
    support: 'Me mbështetjen e', partners: ['Organizata Turistike e Gucisë', 'Ministria e Turizmit e Malit të Zi'],
    part: 'Projekti Xplore Prokletije',
    credits: 'Panorama: Copernicus DEM GLO-30. Shtigjet: OpenStreetMap (ODbL), peaksofthebalkans.info.',
    scanTitle: 'Tregojani kubin kamerës', scanLead: 'Ana që shikon nga kamera zgjedh aplikacionin.',
    scanHold: 'Mbajeni të qetë…', scanStart: 'Po ndez kamerën…', scanNoCam: 'Kamera nuk është e qasshme.',
    scanDenied: 'Qasja në kamerë u refuzua. Lejojeni kamerën te cilësimet e shfletuesit.',
    scanInApp: 'Hapeni faqen në Safari ose Chrome për të përdorur kamerën.',
    scanNoCube: 'Nuk keni kub? Shtypeni nga aplikacioni i muzeut.',
    night: 'natë', lang: 'Gjuha',
  },
  en: {
    htmlLang: 'en',
    open: 'Open', scan: 'Scan the cube', all: 'All apps', prev: 'Previous', next: 'Next',
    of: 'of', soon: 'Coming soon', test: 'Test', close: 'Close', sound: 'Sound', skip: 'Tap to skip',
    listTitle: 'All apps', listLead: 'They all run in your phone’s browser, with nothing to install.',
    hint: 'Drag the cube left or right',
    support: 'Supported by', partners: ['Gusinje Tourist Organisation', 'Ministry of Tourism of Montenegro'],
    part: 'Xplore Prokletije project',
    credits: 'Panorama: Copernicus DEM GLO-30. Trails: OpenStreetMap (ODbL), peaksofthebalkans.info.',
    scanTitle: 'Show the cube to the camera', scanLead: 'The side facing the camera picks the app.',
    scanHold: 'Hold still…', scanStart: 'Starting the camera…', scanNoCam: 'The camera isn’t available.',
    scanDenied: 'Camera access was refused. Allow the camera in your browser settings.',
    scanInApp: 'Open this page in Safari or Chrome to use the camera.',
    scanNoCube: 'No cube? Print one from the museum app.',
    night: 'night', lang: 'Language',
  },
};

export const LANGS = ['me', 'sq', 'en'];

export function detectLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) return q;
  try { const s = localStorage.getItem('xp.lang'); if (LANGS.includes(s)) return s; } catch { /* storage blocked */ }
  for (const l of navigator.languages || [navigator.language || '']) {
    const p = (l || '').toLowerCase().slice(0, 2);
    if (p === 'sq') return 'sq';
    if (['sr', 'bs', 'hr', 'me', 'sh'].includes(p) || (l || '').toLowerCase().startsWith('cnr')) return 'me';
    if (p === 'en') return 'en';
  }
  return 'me';
}

export function appUrl(app, lang) {
  return app.url + (app.url.includes('?') ? '&' : '?') + 'lang=' + lang;
}
