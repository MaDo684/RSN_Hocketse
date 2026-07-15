# RSN Hocketse Kasse - Version 2.3

## Neue Funktionen in V2.3

- Offizielles Realschule-Neuffen-Logo eingebunden (SVG von der Schulwebsite)
- Blaues Realschul-Farbschema (Navy #003d78 + Gold #f5b921)
- Mengen-Badge oben rechts in der Produktkachel zeigt, wie oft ein Artikel im Warenkorb liegt
- Neuer gruener "Kauf abschliessen"-Button unterhalb der Rueckgeld-Anzeige
- Deutlich mehr Schulfest-Icons: Fleisch, Steak, Bier, Wein, Sekt, Whisky, Cocktail, Cola, Saftpackung, Eiswuerfel etc.
- Bugfix beibehalten: Overlays schliessen zuverlaessig ueber X, Backdrop-Klick und ESC
- Cache-Buster ?v=23 fuer CSS und JS

## Dateien

```
RSN_Hocketse_V23/
+-- index.html
+-- README.md
+-- css/style.css
+-- js/config.js
+-- js/app.js
```

## GitHub-Upload

1. ZIP entpacken
2. Alle Dateien direkt in den Root des Repositories `RSN_Hocketse` hochladen (bestehende Dateien ersetzen)
3. `index.html` muss im Root liegen, nicht in einem Unterordner
4. Nach dem Upload einmal: Strg+F5 oder URL mit ?v=23 aufrufen
5. Bei alten Testdaten: F12 -> Console -> `localStorage.clear(); location.reload();`

## Admin-Passwort

FV_RSN2025 (im Code liegt nur der SHA-256-Hash)

## Supabase-Setup (schon erledigt)

Tabelle `products` mit UUID-Primary-Key und Policies fuer public read/write.
