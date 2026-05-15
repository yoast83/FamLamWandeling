# Lammersen Wandeling+

Mobiele GPS-webapp voor de familiewandeling.

## Bestanden voor opdrachten

Plaats deze bestanden in een map `assets` naast `index.html`:

- `assets/FamilieWeekend-Wandeling.mp3`
- `assets/RebusPlus.jpg`

De app toont een duidelijke melding bij de opdracht als een bestand nog ontbreekt.

## Lokaal bekijken

Gebruik een lokale webserver, niet direct dubbelklikken op `index.html`. GPS werkt alleen via `https` of `localhost`.

Een simpele optie:

```powershell
python -m http.server 4173
```

Open daarna `http://localhost:4173`.

## Mobiel gebruiken

Host de map via een beveiligde `https`-link, bijvoorbeeld Netlify, Vercel, GitHub Pages of je eigen webserver. Open de link op de telefoon en geef toestemming voor locatie.
