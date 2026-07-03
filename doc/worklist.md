# Työlista — projektin tilan tarkastus 2026-07-03

> Löydökset koko projektin tarkastuksesta (testit, buildi, dokumentaatio,
> dev-ympäristö, käyttäjäbugit). Status: `[ ]` avoin, `[x]` korjattu,
> `[ROADMAP]` isompi kokonaisuus, siirretty roadmapille.

## Testit

- [x] **Rikkinäinen testi: `dealer-action-buttons.test.ts`** — "during
  cards_dealt, nobody has isMyTurn=true" failasi deterministisesti. Juurisyy:
  testi indeksoi PRIVATE_STATE-emitit positiolla (`states[1]`), mutta
  `handleSitIn()` lähettää nykyään ylimääräisen tilapäivityksen sitting_out-
  pelaajalle ennen käden alkua, jolloin indeksi siirtyi. Korjattu mainissa
  (v1.27.2): snapshot valitaan semanttisesti. Sama juurisyy diagnosoitiin
  tässäkin sessiossa itsenäisesti — päällekkäinen patch pudotettu rebasessa.
- [x] **Flaky testi: `empty-table-cleanup.test.ts`** — "removes a connected
  player from pendingRemovals after hand completes" failasi ~50 % ajoista.
  Juurisyy: heads-up-diileri (= ensimmäinen toimija preflopissa) arvotaan
  Math.randomilla, ja testi foldasi aina sock-2:lla — kun vuoro olikin
  Alicella, fold ohitettiin eikä käsi koskaan päättynyt. Korjattu mainissa
  (v1.27.2) pinnaamalla Math.random. Sama juurisyy löydetty tässäkin
  sessiossa — päällekkäinen patch pudotettu rebasessa.
- [ ] **E2E-testit eivät ole ajettavissa tällä koneella** — Playwright-
  selaimia ei ole asennettu. `npx playwright install chromium` käynnistetty,
  mutta lataus CDN:stä on tässä ympäristössä erittäin hidas (kesken
  2026-07-03). Kun asennus valmistuu: `bun run build && bun run test:e2e`
  (käyttää eristettyjä portteja 4951/4952). Huom: yksikkötestit (618 kpl)
  ajettu kontissa — kaikki läpi.

## Dev-ympäristö (Node 26)

- [x] **better-sqlite3 12.6.2 ei käänny Node 26:lla** (V8 API-muutos:
  `PropertyCallbackInfo::This` poistettu). Päivitetty ^12.11.1:een, joka
  tukee Node 26:ta.
- [x] **Vitest + jsdom: localStorage puuttui** — Node ≥25 määrittelee
  globaalin `localStorage`-propertyn (arvo `undefined` ilman
  `--localstorage-file`-lippua), mikä esti vitestin jsdom-ympäristöä
  injektoimasta omaansa → kaikki localStorage-testit kaatuivat. Korjattu:
  `--no-experimental-webstorage` vitest-workereille (vitest.config.ts).
- [x] **bun puuttui koneelta** — asennettu (`npm i -g bun`). CLAUDE.md vaatii
  bunin kaikkiin komentoihin.
- [x] **vite.config.ts: kovakoodatut portit** — dev-proxy osoitti aina
  porttiin 3000, joten CLAUDE.md:n satunnaisporttisääntöä ei voinut noudattaa.
  Korjattu: `VITE_PORT`/`SERVER_PORT`-ympäristömuuttujat.

## Skillit / työkalut

- [x] **Legacy-skillit eivät lataudu** — `.claude/skills/*.md` (flat-tiedostot:
  test, bump, push, start-local, avatar_update, ohje, sync-layout, ui-editor)
  eivät näy Claude Coden skill-listassa, koska nykyinen muoto on
  `.claude/skills/<nimi>/SKILL.md`. CLAUDE.md viittaa mm. `/test`- ja
  `/bump`-skilleihin. Korjaus: migroitu hakemistomuotoon; skills/push.md ja
  skills/start-local.md poistettu duplikaatteina (commands/-versiot ovat
  tuoreemmat ja latautuvat).

## Dokumentaatio

- [x] **doc/user-bugs.md on tyhjä duplikaatti** — oikea tiedosto on
  `doc/user_bugs.md`. Poistettu.
- [x] **doc/structure.md** — päivitetty live-moodin tiedostokartalla.

## Käyttäjäbugit (doc/user_bugs.md)

- [x] **Bug #R1: UI hyppää kun action-napit katoavat** — kun pelaaja painaa
  fold/check/bet, napit katoavat ja koko UI putoaa alaspäin. Korjaus:
  action-alueelle vakiokorkeus käden aikana, jolloin asettelu ei muutu
  nappien ilmestyessä/kadotessa.
- [x] **Bug #R4: show/muck-prompt jää näkyviin** — jos pelaaja ei ehdi painaa
  muck/show ennen timeouttia, dialogi jää ruudulle. Korjaus: serveri lähettää
  SHOW_CARDS_OFFERissa deadlinen, ja prompt sulkeutuu automaattisesti siihen.
- [ROADMAP] **Bug #R2: showdown-paljastusten sekvensointi** — ensimmäisen
  näyttäjän kortit heti, sitten muut yksitellen, muckaavat animoidaan pois,
  lopuksi kaikki kortit pois animoituna. Vastaa roadmapin kohtaa 4.3
  (Showdown-esitys) — toteutetaan sen yhteydessä.
- [ROADMAP] **Bug #R3: away-tila + "I'm back"** — timeoutannut pelaaja siirtyy
  away-tilaan (auto-check/fold) ja palaa yhdellä napilla. Lisätty roadmapin
  vaiheeseen 3 (pelaajan puhelinnäkymä).

## Parannusehdotukset (ei kiireellisiä)

- [ ] **Bundle-koko**: client-buildissa useita >1 MB chunkkeja (XR-scenet,
  mm. music_room 2.1 MB). Three.js/XR-näkymät kannattaa ladata dynaamisella
  importilla vasta kun VR havaitaan.
- [ ] **WebXR Quest 3** (doc/bugs.md): vaatii mkcert CA:n asennuksen ja
  mkcert()-pluginin käyttöönoton vite.config.ts:ssä (HTTPS). Ympäristöasia,
  ei koodimuutosta.
- [ ] **Vercel CLI vanhentunut** koneella (54.18.0 → 54.20.0):
  `npm i -g vercel@latest`.
