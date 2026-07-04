---
name: pending
description: Tarkasta kesken jääneet työt tiedostosta doc/pending-tasks.md ja jatka niitä. Käytä kun käyttäjä kysyy "mitä oli kesken", "jatka keskeneräisiä", "pending", tai session/koneen boottauksen jälkeen.
user_invocable: true
---

Tarkasta ja jatka kesken jääneitä töitä, jotka on tallennettu tiedostoon
`doc/pending-tasks.md`. Nämä työt säilyvät sessioiden ja koneen boottausten yli.

## Ohjeet

1. **Lue** `doc/pending-tasks.md`. Jos tiedostoa ei ole tai siinä ei ole
   avoimia (`- [ ]` tai `- [~]`) tehtäviä, raportoi "Ei keskeneräisiä töitä" ja
   lopeta.

2. **Listaa avoimet tehtävät** käyttäjälle tiiviisti: otsikko + tila-rivi.
   Merkinnät:
   - `- [ ]` = avoin, ei aloitettu
   - `- [~]` = osittain tehty (lue "Tila"-rivi mistä jatketaan)
   - `- [x]` = valmis (näitä ei tarvitse listata)

3. **Jatka tehtäviä** kunkin tehtävän "Miten jatketaan" -ohjeiden mukaan.
   Aloita ensimmäisestä avoimesta. Jos tehtävä on riippuvainen ympäristöstä
   (esim. lataus, boottaus), tarkasta ensin onko este poistunut.

4. **Päivitä tiedosto** kun tehtävä etenee tai valmistuu:
   - Valmis → merkkaa `- [x]` tai poista tehtävä
   - Osittain → päivitä "Tila"-rivi kuvaamaan mistä jatketaan seuraavalla kerralla
   - Uusi kesken jäävä työ → lisää se tänne samalla muotoilulla (otsikko,
     Konteksti, Tila, Miten jatketaan)

## Milloin lisätä tehtävä pending-tiedostoon

Lisää työ `doc/pending-tasks.md`:hen aina kun:
- Työ jää kesken ympäristösyistä (hidas lataus, boottaus, puuttuva riippuvuus)
- Käyttäjä keskeyttää työn ja haluaa jatkaa myöhemmin
- Jokin on tehty mutta verifiointi (testit, deploy) jäi kesken

Käytä samaa muotoilua kuin tiedostossa jo on: `## [ ] Otsikko`, sitten
**Konteksti**, **Tila (pvm)** ja **Miten jatketaan** -osiot, jotta seuraava
sessio voi jatkaa ilman tätä keskustelukontekstia.
