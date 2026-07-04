# Pending Tasks

> Kesken jääneet työt, jotka pitää jatkaa myöhemmin (esim. koneen boottauksen
> tai session vaihdon jälkeen). Tarkasta tämä `/pending`-skillillä.
>
> Muoto: `- [ ]` avoin, `- [~]` osittain tehty (katso "Tila"-rivi), `- [x]` valmis.
> Kun tehtävä valmistuu, merkkaa `- [x]` tai poista se.

---

## [~] E2E-testien ajo (Playwright)

**Konteksti:** Live-pelimoodi (v1.28.0) ja XR-bundlen lazy-load (v1.28.1) on
tehty, testattu (yksikkötestit 618/618 vihreät kontissa) ja pushattu mainiin.
Ainoa verifioimatta jäänyt asia on e2e-suite (`bun run test:e2e`).

**Tila (2026-07-04):** Playwright-selaimet puuttuivat koneelta. `npx playwright
install` latasi VÄÄRÄN buildin (1228), koska npx resolvoi uudemman
playwright-version kuin projektin `@playwright/test@1.58.2`, joka odottaa buildia
**1208**. Oikea lataus käynnistettiin projektin omalla binäärillä, mutta CDN oli
tässä ympäristössä erittäin hidas eikä ehtinyt valmistua. Koneen boottaus
keskeyttää latauksen.

**Miten jatketaan boottauksen jälkeen:**
1. Asenna selaimet PROJEKTIN omalla playwrightillä (ei `npx`, joka voi hakea
   väärän version):
   ```
   node_modules/.bin/playwright install chromium chromium-headless-shell
   ```
   (jos `node_modules` puuttuu, aja ensin `bun install` ja
   `bun run build:shared`)
2. Buildaa serveri (e2e:n webServer ajaa `server/dist/index.js`):
   `bun run build`
3. Aja e2e: `bun run test:e2e` (portit 4951/4952, ei törmää dev-serveriin)
4. Jos vihreä → merkkaa tämä tehtävä valmiiksi ja poista.
   Jos punainen → debuggaa failaukset (5 spec: login, table-lobby, game-flow).

**Huom:** Poista mahdolliset väärän version 1228-selaimet turhan tilan säästöksi:
`rm -rf ~/Library/Caches/ms-playwright/chromium-1228 ~/Library/Caches/ms-playwright/chromium_headless_shell-1228`

---

## [ ] Deploy (kun e2e vihreä)

v1.28.0 (live mode) + v1.28.1 (bundle) ovat mainissa mutta EI vielä tuotannossa.
Kun e2e on vihreä ja käyttäjä haluaa, deployaa molemmat palvelut yhdessä:
`/deploy` (Vercel frontend + Railway backend — aina yhdessä, muuten
versiomismatch).
