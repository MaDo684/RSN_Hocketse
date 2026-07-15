# RSN Hocketse Kasse - Version 2.1

Bugfix-Version: Icon- und Admin-Fenster lassen sich zuverlaessig schliessen.

## Was ist neu

- Overlay-Bugfix: Fenster schliessen bei X, Backdrop-Klick und ESC.
- CSS: [hidden] und .overlay[hidden] mit display:none !important.
- JS: open/close-Funktionen setzen hidden UND style.display.

## Struktur nach dem Upload

```
RSN_Hocketse/
+-- index.html
+-- README.md
+-- css/style.css
+-- js/config.js
+-- js/app.js
```

## Nach dem Upload

Browser hart neu laden: Strg+F5 oder URL mit ?v=21 aufrufen.
Bei alten Testdaten: F12 Konsole -> localStorage.clear(); location.reload();

## Admin-Passwort

FV_RSN2025 (nur SHA-256-Hash im Code).

## Supabase Policies

```sql
alter table products enable row level security;

create policy "public read" on products for select using (true);
create policy "public write" on products for all using (true) with check (true);
```
