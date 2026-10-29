# Einrichtung auf dem IONOS-Webspace

Die Seite läuft ohne WordPress und ohne Datenbank. `api.php` speichert die Gewinnzahlen als Datei im Ordner `privat/daten/`, der vom Browser aus gesperrt ist.

## Voraussetzungen

- IONOS Webhosting (vorhanden: Webhosting Plus) mit PHP 8.1 oder neuer. Die PHP-Version stellt man im IONOS-Konto unter Hosting ein.
- Ein SFTP-Programm, z. B. Cyberduck oder FileZilla.

## 1. Zugang anlegen (am eigenen Rechner)

```
php werkzeuge/benutzer-anlegen.php
```

Ein gemeinsamer Zugang reicht, z. B. Benutzername `verwaltung`. Passwort: lange Passphrase (mindestens 12 Zeichen), im Passwortmanager speichern und Robert Zietz persönlich geben, nicht per Mail. Das Skript schreibt nur den Hash nach `privat/benutzer.php`. Erneuter Aufruf mit demselben Namen ändert das Passwort.

## 1b. Paket bauen

```
python3 paket.py
```

Erzeugt `../pakete/rotary-webseite-DATUM.zip` mit genau den Dateien für den Server, ohne Entwurfsleiste und für Google freigegeben (Verwaltung bleibt gesperrt). Das ZIP enthält den Passwort-Hash: nicht weitergeben, nach dem Hochladen löschen.

## 2. SFTP-Zugang anlegen

IONOS-Konto → Hosting → SFTP → Einrichten. Benutzer und Passwort im Passwortmanager speichern.

## 3. Hochladen

Inhalt des ZIP-Pakets in einen eigenen Ordner auf dem Webspace hochladen, z. B. `/rotary/`. Versteckte Dateien (`.htaccess`) im SFTP-Programm einblenden und mit hochladen. Der Ordner `privat/daten/` entsteht beim ersten Speichern von selbst.

## 4. Prüfen, bevor die Domain umgestellt wird

Vorab über die IONOS-Testadresse des Webspace oder eine Subdomain (z. B. `neu.rotaryclub-kulmbach.de`):

- `…/privat/benutzer.php` und `…/privat/kern.php` müssen 403 oder 404 liefern, nie Inhalt
- `…/api.php?aktion=zahlen` liefert `{"zahlen":{}}`
- Anmelden unter `…/verwaltung.html`, Testnummer eintragen, auf der Startseite suchen, Testnummer wieder löschen

## 5. Domain umstellen

IONOS-Konto → Domains → rotaryclub-kulmbach.de → Ziel: Webspace, Ordner `/rotary/`. Danach ist die alte Baukasten-Seite nicht mehr erreichbar.

Vorher klären: Werden E-Mail-Adressen auf der Domain genutzt? (MX zeigt auf IONOS.) Die Umstellung des Website-Ziels ändert die E-Mail nicht, trotzdem einmal prüfen.

## Im Betrieb

- Nach Änderungen an CSS oder JavaScript die Versionsnummer `?v=JJJJMMTTNN` in `src/*.html` erhöhen, `python3 build.py` und neu hochladen. Sonst sehen Besucher bis zu ein Jahr den alten Stand.

- Täglich: `…/verwaltung.html` öffnen, anmelden, Tag wählen, Losnummern einfügen, veröffentlichen. Geht von jedem Rechner und Handy, ohne SFTP.
- Wann eingetragen wurde, steht in `privat/daten/protokoll.log` (per SFTP abrufbar).
- Nach 5 falschen Passwörtern ist die Anmeldung von diesem Anschluss aus 15 Minuten gesperrt.
- Nach 2 Stunden ohne Aktion wird man abgemeldet.
- Sicherung: `privat/daten/gewinnzahlen.json` nach der Saison herunterladen.
- Neues Jahr: in `app.js` `aktuellesJahr` hochsetzen, Jahr in `src/verwaltung.html` ergänzen, Vorjahreszahlen in `gewinnzahlen.js` übernehmen.
