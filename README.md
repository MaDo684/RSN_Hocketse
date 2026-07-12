# 🎉 Schulfest-Kasse — Realschule Neuffen

Eine einfache, mobil nutzbare Kassen-App für Schulfeste. Läuft direkt im
Browser (auch auf dem Handy), keine Installation nötig.

## Funktionen

- Produkte per Fingertipp in den Warenkorb legen
- Automatische Rückgeld-Berechnung mit Schnellauswahl-Beträgen
- Passwortgeschützter Admin-Bereich (Passwort ist **nicht** im Klartext
  gespeichert, sondern nur als SHA-256-Hash im Code hinterlegt)
- Im Admin-Bereich: Preise/Namen ändern, Produkte löschen, neue Produkte
  mit auswählbarem Symbol aus einem Icon-Repository anlegen
- Layout angelehnt an realschule-neuffen.de (Farben, Logo, Kontaktdaten)

## Wichtiger Hinweis zur Datenspeicherung

Diese App ist eine **rein statische Webseite** (kein Server, keine
Datenbank). Änderungen, die im Admin-Bereich vorgenommen werden
(Preise, neue Produkte), werden **nur lokal im Browser des jeweiligen
Geräts** gespeichert (`localStorage`).

Das bedeutet:

- Auf **einem** Kassen-Handy/Tablet funktioniert das einwandfrei —
  einmal im Admin-Bereich angepasst, bleiben die Preise auf diesem
  Gerät erhalten (auch nach Neuladen der Seite).
- Werden **mehrere Geräte** als Kasse genutzt, müssen die Preise auf
  jedem Gerät einzeln im Admin-Bereich gepflegt werden, **oder**: im
  Admin-Bereich auf „Exportieren" tippen, die erzeugte
  `produkte-export.json` öffnen und die Werte direkt im Code
  (`js/app.js`, Abschnitt `DEFAULT_PRODUCTS`) eintragen, bevor die
  Seite z. B. über GitHub Pages neu veröffentlicht wird.

## Veröffentlichung über GitHub Pages (kostenlos, in 5 Minuten)

1. Auf [github.com](https://github.com) ein neues, öffentliches
   Repository anlegen (z. B. `schulfest-kasse`).
2. Alle Dateien aus diesem Ordner (`index.html`, `css/`, `js/`,
   `README.md`) in das Repository hochladen (per Drag & Drop im
   Browser über „Add file → Upload files", oder per `git push`).
3. Im Repository auf **Settings → Pages**.
4. Unter „Build and deployment" → „Source" die Option **„Deploy from a
   branch"** wählen, als Branch **`main`** und Ordner **`/ (root)`**
   auswählen, dann **Save**.
5. Nach ca. 1 Minute ist die Seite erreichbar unter:
   `https://<dein-github-name>.github.io/schulfest-kasse/`
6. Diesen Link auf dem Kassen-Handy öffnen und zum Homescreen
   hinzufügen (Browser-Menü → „Zum Home-Bildschirm hinzufügen") — dann
   startet die App wie eine normale App per Klick auf das Icon.

## Admin-Zugang

Auf das ⚙️-Symbol oben rechts tippen und das Passwort eingeben, das
euch mitgeteilt wurde. Der Zugang bleibt für die Dauer der
Browser-Sitzung gespeichert (kein erneutes Eintippen nötig, solange
der Tab/Browser nicht komplett geschlossen wird).

## Projektstruktur

```
schulfest-kasse/
├── index.html      Hauptseite (Kasse + Admin-Bereich)
├── css/
│   └── style.css   Layout im Realschule-Neuffen-Design
├── js/
│   └── app.js       Kassenlogik, Admin-Logik, Passwort-Hash
└── README.md
```

## Passwort ändern

Falls das Admin-Passwort geändert werden soll: Einen neuen SHA-256-Hash
erzeugen (z. B. über eine Kommandozeile:
`echo -n "NeuesPasswort" | sha256sum`) und den Wert in `js/app.js` in
der Zeile `ADMIN_PASSWORD_HASH = "..."` ersetzen.
