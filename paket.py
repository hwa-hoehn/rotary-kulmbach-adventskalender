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
    'index.html', 'verwaltung.html', 'impressum.html', 'datenschutz.html',
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
    if name != 'verwaltung.html':
        text = text.replace('<meta name="robots" content="noindex">', '<meta name="robots" content="index, follow">')
    return text


ziel.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(ziel, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in dateien:
        pfad = hier / name
        if pfad.suffix in ('.html',):
            z.writestr(name, endfassung(name, pfad.read_text()))
        else:
            z.write(pfad, name)

print(f'{len(dateien)} Dateien → {ziel}')
