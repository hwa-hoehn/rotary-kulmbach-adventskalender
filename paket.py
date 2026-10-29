# Packt die fertige Seite für den IONOS-Webspace als ZIP:
# ohne Entwurfsleiste, für Google freigegeben (außer Verwaltung), nur Dateien, die auf den Server gehören.
#   python3 paket.py
import re
import subprocess
import sys
import zipfile
from datetime import date
from pathlib import Path

hier = Path(__file__).parent
ziel = hier.parent / 'pakete' / f'rotary-webseite-{date.today():%Y-%m-%d}.zip'

subprocess.run([sys.executable, str(hier / 'build.py')], check=True)

benutzer = hier / 'privat' / 'benutzer.php'
if not benutzer.is_file():
    sys.exit('privat/benutzer.php fehlt. Erst "php werkzeuge/benutzer-anlegen.php" ausführen.')

dateien = [
    'index.html', 'verwaltung.html', 'impressum.html', 'datenschutz.html', '404.html',
    'robots.txt', 'sitemap.xml',
    'api.php', '.htaccess', 'manifest.json', 'favicon.ico',
    'style.css', 'verwaltung.css', 'app.js', 'app-kopf.js', 'verwaltung.js', 'gewinnzahlen.js',
    'privat/kern.php', 'privat/.htaccess', 'privat/benutzer.php',
]
for ordner in ('bilder', 'fonts', 'icons'):
    dateien += sorted(str(p.relative_to(hier)) for p in (hier / ordner).rglob('*') if p.is_file() and p.name != '.DS_Store'
                      and not p.name.endswith('.part'))


def endfassung(name, text):
    if not name.endswith('.html'):
        return text
    text = re.sub(r'<p class="entwurf">Gestaltungsvorschlag[^<]*</p>\n?', '', text)
    if name not in ('verwaltung.html', '404.html'):
        text = text.replace('<meta name="robots" content="noindex">', '<meta name="robots" content="index, follow">')
    if name == '404.html':
        # wird unter beliebigen Adressen ausgeliefert, daher feste Pfade ab der Domain
        text = text.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">', 1)
    return text


ziel.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(ziel, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in dateien:
        pfad = hier / name
        # Rechte immer 644: sonst darf der Webserver von IONOS die Dateien nicht lesen (403)
        info = zipfile.ZipInfo(name, date_time=(date.today().year, date.today().month, date.today().day, 12, 0, 0))
        info.external_attr = 0o100644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        inhalt = endfassung(name, pfad.read_text()).encode() if pfad.suffix == '.html' else pfad.read_bytes()
        z.writestr(info, inhalt)

print(f'{len(dateien)} Dateien → {ziel}')
