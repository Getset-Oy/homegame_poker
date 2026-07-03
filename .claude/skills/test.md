---
name: test
description: Ajaa testit eristetyssä kontissa (docker/Apple container) kevyellä Haiku-mallilla ja raportoi tulokset. Käytä aina kun testejä pitää ajaa.
user_invocable: true
---

Aja testit käyttäen Haiku-agenttia kustannusten ja latenssin minimoimiseksi.
Testit ajetaan AINA eristetyssä kontissa (`bun run test:container` →
`scripts/test-container.sh`) CPU- ja muistirajattuna, jottei testiajo saturoi
hostin ytimiä. Älä koskaan aja koko suitea suoraan hostilla (`bun run test`).

## Ohjeet

Käynnistä Agent-työkalu näillä parametreillä:

- **subagent_type**: `general-purpose`
- **model**: `haiku`
- **description**: `Run tests in container`
- **prompt**: Alla oleva prompt (kopioi sellaisenaan, korvaa `{filter}` jos käyttäjä antoi suodattimen):

```
Aja testit komennolla: bun run test:container {filter}

Jos testit on ajettava tietyssä hakemistossa (worktree), käytä oikeaa polkua.
Komento ajaa vitestin kontissa (docker tai Apple container): asentaa riippuvuudet
konttivolumeen, buildaa shared-paketin ja ajaa testit CPU-rajattuna. Ensimmäinen
ajo on hidas (image-build + bun install) — käytä Bash-työkalussa timeout 600000.

Tehtäväsi:
1. Aja testit
2. Raportoi tulos tiivistetysti:
   - Montako testitiedostoa ajettiin, montako meni läpi / epäonnistui
   - Montako yksittäistä testiä meni läpi / epäonnistui
   - Ajoaika
3. Jos testejä epäonnistui, listaa JOKAISESTA epäonnistuneesta:
   - Testitiedoston nimi ja testin nimi
   - Assertion-virhe (odotettu vs saatu arvo)
   - Tarkka rivi ja tiedosto jossa virhe tapahtui
4. ÄLÄ yritä korjata mitään — raportoi vain tulokset

Palauta tulos suomeksi.
```

## Suodatin

Jos käyttäjä antoi argumentteja (esim. `/test hand-rank`), lisää ne vitest-suodattimeksi:
- `/test hand-rank` → `bun run test:container hand-rank`
- `/test` (ilman argumentteja) → `bun run test:container`

## Kontti-runtime

- Vaatii käynnissä olevan Docker Desktopin TAI Apple containerin (`container system start`).
- Skripti valitsee dockerin jos daemon vastaa, muuten Apple containerin.
- Pakota runtime: `CONTAINER_RUNTIME=container bun run test:container`
- Säädöt: `TEST_CPUS` (oletus 4, dockerilla katkaistaan VM:n ytimiin), `TEST_MEMORY` (oletus 4g)

## Tulosten käsittely

Kun Haiku-agentti palauttaa tulokset:
- Jos kaikki testit menivät läpi: raportoi lyhyesti käyttäjälle
- Jos testejä failasi: näytä failanneet testit ja kysy haluaako käyttäjä debugata niitä (debugging tehdään Opus-mallilla tässä sessiossa)
