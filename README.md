# RSN Hocketse Kasse - Version 2

Mobile-First Kassen-App für die Realschule Neuffen. Diese Version ist bewusst neu und sauber aufgebaut.

## Dateien

```text
RSN_Hocketse_V2/
├── index.html
├── css/style.css
├── js/config.js
├── js/app.js
└── README.md
```

## Was ist neu in Version 2?

- Sauberes Mobile-First-Design für Handy und Tablet.
- Keine fehlenden favicon.ico-Fehler mehr, da ein eingebettetes SVG-Favicon verwendet wird.
- Kein fehlerhafter `{icon}`-Platzhalter mehr.
- Supabase ist direkt eingebunden.
- Produkte werden aus der Tabelle `products` geladen.
- Änderungen im Admin-Bereich werden wieder nach Supabase geschrieben.
- Admin-Passwort liegt nur als SHA-256-Hash im Code.
- Falls kein echtes Schul-Logo hinterlegt ist, wird ein sauberes RSN-Badge angezeigt.

## Supabase

Die App nutzt diese Struktur:

```text
products
---------
id
name
price
icon
sort_order
updated_at
```

Die Supabase-Konfiguration steht in:

```text
js/config.js
```

## Wichtig: Supabase Policies

Damit die statische GitHub-Pages-App lesen und schreiben kann, müssen die Policies gesetzt sein:

```sql
alter table products enable row level security;

create policy "public read"
on products
for select
using (true);

create policy "public write"
on products
for all
using (true)
with check (true);
```

Hinweis: Das ist für Schulfest-Produktdaten pragmatisch. Für sensible oder personenbezogene Daten ist dieses Modell nicht geeignet, weil der Publishable Key im Frontend sichtbar ist.

## Upload nach GitHub

1. ZIP entpacken.
2. Alle Inhalte aus `RSN_Hocketse_V2` direkt in das leere Repository `RSN_Hocketse` hochladen.
3. Wichtig: `index.html` muss im Root-Verzeichnis liegen, nicht in einem Unterordner.
4. Danach unter `Settings > Pages` prüfen:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / root
5. Seite öffnen.

## Admin-Passwort

```text
FV_RSN2025
```

Im Code steht nur der Hash, nicht das Klartext-Passwort.

## Logo

In `js/config.js` ist `logoUrl` aktuell leer. Deshalb zeigt die App ein sauberes RSN-Badge ohne 404-Fehler.

Wenn die echte Logo-Bild-URL bekannt ist, kann sie hier eingetragen werden:

```js
logoUrl: 'https://...'
```
