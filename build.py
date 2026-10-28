# Baut index.html und verwaltung.html aus src/: setzt das Rotary-Logo (SVG-Symbol) und die Sponsorenliste ein.
import html
from pathlib import Path

hier = Path(__file__).parent
logo = (hier / 'bilder' / 'logo-sprite.svg.part').read_text()

# Sponsoren wie auf rotaryclub-kulmbach.de/sponsoren, exakte Doppelungen entfernt, alphabetisch sortiert
sponsoren = [
    'Adalbert-Raps-Stiftung', 'Apotheke im fritz', 'Arneth Optik & Akustik', 'Autohaus Förster Honda',
    'Autohaus Förster Hyundai', 'Autolackiererei Marcel Luse', 'Autotechnik Hahn', 'Bergophor',
    'Bestattungen Stübinger KG', 'Baugeschäft Popp', 'berrie & cream', 'Buchhandlung Friedrich GmbH & Co. KG',
    'Buchhandlung Rupprecht GmbH', 'Blumen im Ratskeller', 'Burger King Coburg GmbH', 'Cafe Stamm',
    'Allstadt & Wagner Notare in Kulmbach', 'face and body, Margit Drechsler', 'Ein : Raum',
    'eldorado E-Bike & Radsport', 'Forum Wohnbau GmbH', 'Der Fellmann, Hollert Naturfelleprodukte',
    'Elektro Weißmann', 'Elektro-Graß GmbH', 'Farben Geyer', 'fit`n fun Kulmbach', 'Franken Maxit',
    'HB Automobile', 'Helmut Herrmann Bauunternehmen', 'Der Holzbock', 'Herrenmode Türk am Holzmarkt',
    'Hotel Dobrachtal', 'Högen Schneiderei', 'IFGO GmbH', 'JÖNA GmbH', 'Juwelier Kolanus',
    'KA2 Sport-Freizeit-Gesundheit', 'Kathrin´s Geschenkstadel', 'Kunz & Strobel Elektrotechnik GmbH',
    'Kommunbräu', 'Kranich Apotheke', 'Kulmbacher Brauerei AG', 'KRÜGER - Personal Headhunting',
    'Malerfachbetrieb Schirmer e. K.', 'Leidenschaft Hund', 'M.M. Warburg & Co', 'Markgrafen Getränkemarkt',
    'MEDIA-COM', 'MEIGO GmbH', 'Michaelas Bastelstube', 'Motor-Nützel Vertriebs-GmbH',
    'Naturfriseur Katharina Matthes', 'Optik Hackl', 'Partyservice Stöcker', 'Reisecenter Schaffranek GmbH',
    'Rechtsanwälte Horn & Kollegen', 'Schneiderei Högen', 'REWE Hollweg oHG', 'Schlösslas Bistro und Biergarten',
    'Sanitätshaus Barkhofen GmbH & Co.KG', 'Sanremo Eis- und Kaffeemanufaktur De Pellegrin E.K.',
    'Sinnemeisterei Schmidtmeier Optik & Akustik', 'Schlösslas Bistro und Biergarten', 'Schuh und Sport Mücke GmbH',
    'Schweizerhof', 'Sell GmbH', 'Sintenis Deko & Schenken', 'SKO Bernd Ruff e.K.', 'Stadtwerke Kulmbach',
    'style your life', 't.morck premium kosmetik', 'Taubenreuther GmbH', 'Teeladen "Der blaue Laden"',
    'Theater "Das Baumann"', 'Thomas Kolb Reifen- und Fahrzeugtechnik GmbH', 'Trapper GmbH', 'Wäschetraum',
    'Waschies GmbH', 'Wiegel Gebäudetechnik GmbH', 'Wimmer GmbH', 'Zieher KG',
]
links = {'Zieher KG': 'https://www.zieher.com'}

def schluessel(name):
    n = name.lower()
    for praefix in ('der ', 'das ', 'die '):
        if n.startswith(praefix):
            n = n[len(praefix):]
    return n.replace('ä', 'a').replace('ö', 'o').replace('ü', 'u')

eindeutig = sorted(dict.fromkeys(sponsoren), key=schluessel)
eintraege = []
for s in eindeutig:
    text = html.escape(s, quote=False)
    if s in links:
        text = f'<a href="{links[s]}" rel="noopener">{text}</a>'
    eintraege.append(f'<li>{text}</li>')

for name in ('index.html', 'verwaltung.html'):
    seite = (hier / 'src' / name).read_text()
    seite = seite.replace('{{LOGO}}', logo).replace('{{SPONSOREN}}', '\n        '.join(eintraege))
    (hier / name).write_text(seite)
print(len(sponsoren), 'Sponsoren,', len(eindeutig), 'nach Entfernen von Doppelungen')
