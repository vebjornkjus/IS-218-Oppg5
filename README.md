# 🌊 FlomsoneVisualisering – IS-218 Hovedprosjekt

## 📌 Problemstilling
Hvordan kan geografiske data og enkle analyser brukes til raskt å identifisere og visualisere områder som er utsatt for flomfare?

## 🧠 Kort beskrivelse
Dette prosjektet er en webapplikasjon som hjelper innbyggere, lokale myndigheter og beredskapstjenester med å identifisere flomutsatte områder. Ved hjelp av høydedata, vannføringsdata og historiske flomsoner, utfører løsningen enkle romlige analyser og visualiserer risikoområder på et interaktivt kart.

## 🧰 Teknologivalg

| Komponent     | Teknologi        | Begrunnelse |
|---------------|------------------|-------------|
| Kart          | Leaflet.js       | Lettvektig og fleksibel kartbibliotek |
| Analyse       | Turf.js          | Effektivt verktøy for buffer og overlay-analyser |
| Backend       | Supabase         | Hosting, PostGIS-støtte og REST API i ett |
| Dataformat    | GeoJSON          | Kompatibelt med Leaflet og Turf.js |
| Visualisering | HTML/CSS/JS      | For enkel frontendutvikling uten rammeverk |

## 🗺 Datasett

| Datasettype       | Kilde                                         | Lenke |
|--------------------|-----------------------------------------------|-------|
| Høydedata (DTM)    | Kartverket (Geonorge)                         | [DTM 10m Grid](https://kartkatalog.geonorge.no/metadata/kartverket/dtm-terrengmodell-10-m-grid/33bd46cb-0a9c-427f-a8f5-6eb78b0b7ff0) |
| Elvenett og vannføring | NVE (Geonorge)                          | [Elvenett](https://kartkatalog.geonorge.no/metadata/norges-vassdrags-og-energidirektorat/elvenett/669e622b-33fc-4740-a0ee-3f74d52f5238) |
| Historiske flomsoner | NVE Flomsonekart                        | [Flomsonekart](https://kartkatalog.geonorge.no/metadata/norges-vassdrags-og-energidirektorat/flomsonekart/3db3b857-4370-41c8-9fd4-150dd58f9d44) |

## 🧪 Hvordan fungerer det?

1. Brukeren får opp et interaktivt kart.
2. Brukeren velger punkt og radius for analyse.
3. Turf.js brukes til å lage buffer rundt valgt punkt.
4. GeoJSON-data analyseres og overlays visualiseres.
5. Resultatet viser områder med potensiell flomfare.

## 🧠 Muligheter for KI (Bonus)
Vi har begynt å utforske bruk av kunstig intelligens til å identifisere bygninger innenfor flomsonene, for å vurdere potensiell skade og risiko. Dette er fortsatt under utvikling.

## 🖼 Skjermbilder

> *(Her legger dere inn GIF eller skjermbilde fra appen)*

![Demo](docs/flomsoner.gif)

## 👥 Gruppemedlemmer

- Oliver C. Gyve – olivercg@uia.no  
- Gaute J. Hoel – gautejh@uia.no  
- Fredrik S. Husebø – fredriksh@uia.no  
- Kristoffer F. Holmsen – kristofffh@uia.no  
- Kristian Kalleberg – kristianka@uia.no  
- Vebjørn F. Kjus – vebjornfk@uia.no

## 📁 Kjør prosjektet lokalt

> Dette oppdateres avhengig av hvordan dere velger å strukturere ting – men eksempel for lokal kjøring:

```bash
cd frontend/public
open index.html  # eller bruk Live Server i VS Code