# Einrichtung auf dem IONOS-Webspace

Die Seite läuft ohne WordPress und ohne Datenbank. `api.php` speichert die Gewinnzahlen als Datei im Ordner `privat/daten/`, der vom Browser aus gesperrt ist.

## Voraussetzungen

- IONOS Webhosting (vorhanden: Webhosting Plus) mit PHP 8.1 oder neuer. Die PHP-Version stellt man im IONOS-Konto unter Hosting ein.
- Ein SFTP-Programm, z. B. Cyberduck oder FileZilla.

## 1. Benutzer anlegen (am eigenen Rechner)

```
php werkzeuge/benutzer-anlegen.php
```

Name und Passwort (mindestens 12 Zeichen) eingeben. Das Skript schreibt nur den Hash nach `privat/benutzer.php`, das Passwort selbst steht nirgends. Für jede Person aus der Projektgruppe einen eigenen Benutzer anlegen. Erneuter Aufruf mit demselben Namen ändert das Passwort.

## 2. SFTP-Zugang anlegen

IONOS-Konto → Hosting → SFTP → Einrichten. Benutzer und Passwort im Passwortmanager speichern.

## 3. Hochladen

In einen eigenen Ordner, z. B. `/rotary/`:

- `index.html`, `verwaltung.html`, `impressum.html`, `datenschutz.html`
- `api.php`, `.htaccess`, `manifest.json`, `favicon.ico`
- `style.css`, `verwaltung.css`, `app.js`, `app-kopf.js`, `verwaltung.js`, `gewinnzahlen.js`
- Ordner `bilder/`, `fonts/`, `icons/`
- Ordner `privat/` mit `kern.php`, `.htaccess` und `benutzer.php`

Nicht hochladen: `src/`, `werkzeuge/`, `build.py`, `audit.js`, `README.md`, diese Datei.

Der Ordner `privat/daten/` entsteht beim ersten Speichern von selbst.

## 4. Prüfen, bevor die Domain umgestellt wird

Vorab über die IONOS-Testadresse des Webspace oder eine Subdomain (z. B. `neu.rotaryclub-kulmbach.de`):

- `…/privat/benutzer.php` und `…/privat/kern.php` müssen 403 oder 404 liefern, nie Inhalt
- `…/api.php?aktion=zahlen` liefert `{"zahlen":{}}`
- Anmelden unter `…/verwaltung.html`, Testnummer eintragen, auf der Startseite suchen, Testnummer wieder löschen

## 5. Domain umstellen

IONOS-Konto → Domains → rotaryclub-kulmbach.de → Ziel: Webspace, Ordner `/rotary/`. Danach ist die alte Baukasten-Seite nicht mehr erreichbar.

Vorher klären: Werden E-Mail-Adressen auf der Domain genutzt? (MX zeigt auf IONOS.) Die Umstellung des Website-Ziels ändert die E-Mail nicht, trotzdem einmal prüfen.

## Im Betrieb

- Wer was eingetragen hat, steht in `privat/daten/protokoll.log` (per SFTP abrufbar).
- Nach 5 falschen Passwörtern ist die Anmeldung von diesem Anschluss aus 15 Minuten gesperrt.
- Nach 2 Stunden ohne Aktion wird man abgemeldet.
- Sicherung: `privat/daten/gewinnzahlen.json` nach der Saison herunterladen.
- Neues Jahr: in `app.js` `aktuellesJahr` hochsetzen, Jahr in `src/verwaltung.html` ergänzen, Vorjahreszahlen in `gewinnzahlen.js` übernehmen.
