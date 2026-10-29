// Rotary Adventskalender Kulmbach · Gestaltungsvorschlag HWA
(function () {
  'use strict';

  var SPEICHER = 'rk-gewinnzahlen';
  var bewegungAus = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Gewinnzahlen: feste Daten (Vorjahr) plus eingetragene Zahlen.
  // Mit Server (api.php) kommen die Einträge von dort, sonst aus der Demo-Verwaltung im Browser.
  function zusammenfuehren(basis, eigen) {
    var daten = JSON.parse(JSON.stringify(basis || {}));
    Object.keys(eigen || {}).forEach(function (jahr) {
      daten[jahr] = daten[jahr] || {};
      Object.keys(eigen[jahr]).forEach(function (tag) { daten[jahr][tag] = eigen[jahr][tag]; });
    });
    return daten;
  }

  function demoDaten() {
    try { return JSON.parse(localStorage.getItem(SPEICHER) || '{}'); } catch (e) { return {}; }
  }

  function ladeDaten(fertig) {
    var abbruch = window.AbortController ? new AbortController() : null;
    var zeit = setTimeout(function () { if (abbruch) abbruch.abort(); }, 5000);
    fetch('api.php?aktion=zahlen', { cache: 'no-store', signal: abbruch && abbruch.signal })
      .then(function (r) {
        if (!r.ok || (r.headers.get('content-type') || '').indexOf('application/json') !== 0) throw new Error('kein Server');
        return r.json();
      })
      .then(function (j) { fertig(zusammenfuehren(window.GEWINNZAHLEN, j.zahlen || {})); })
      .catch(function () { fertig(zusammenfuehren(window.GEWINNZAHLEN, demoDaten())); })
      .then(function () { clearTimeout(zeit); });
  }

  function anzahl(jahrDaten) {
    return Object.keys(jahrDaten || {}).filter(function (t) { return (jahrDaten[t] || []).length; }).length;
  }

  function zweistellig(n) { return (n < 10 ? '0' : '') + n; }

  // Türchen
  var liste = document.getElementById('tuerchen');
  var status = document.getElementById('gewinn-status');
  var reiter = Array.prototype.slice.call(document.querySelectorAll('.jahre__knopf'));
  var daten = zusammenfuehren(window.GEWINNZAHLEN, {});
  var heute = new Date();
  var aktuellesJahr = '2026';
  // Immer mit dem laufenden Jahr starten; Gewinne zählen nur für dieses Jahr
  var gewaehlt = aktuellesJahr;
  var treffer = null;
  var fluegelBeobachter = null;

  function zeichne(jahr) {
    gewaehlt = jahr;
    reiter.forEach(function (r) { r.setAttribute('aria-selected', String(r.dataset.jahr === jahr)); });

    var jahrDaten = daten[jahr] || {};
    var kurz = jahr.slice(2);
    var offenAnzahl = anzahl(jahrDaten);
    if (jahr === aktuellesJahr && !offenAnzahl) {
      status.textContent = 'Die Gewinnzahlen 2026 erscheinen ab dem 01.12.26, täglich zwischen 07.30 und 10.00 Uhr.';
    } else if (jahr === aktuellesJahr) {
      status.textContent = offenAnzahl + ' von 24 Türchen geöffnet. Aktualisierung der Losnummern täglich zwischen 07.30 und 10.00 Uhr.';
    } else {
      status.textContent = 'Gewinnzahlen der Verlosung ' + jahr + ' (Vorjahr). Sie gelten nicht für den Kalender ' + aktuellesJahr + '.';
    }

    var html = '';
    for (var tag = 1; tag <= 24; tag++) {
      var lose = jahrDaten[tag] || [];
      var datum = zweistellig(tag) + '.12.' + kurz;
      var istHeute = jahr === String(heute.getFullYear()) && heute.getMonth() === 11 && heute.getDate() === tag;
      if (lose.length) {
        html += '<li class="tuer" data-tag="' + tag + '">' +
          '<div class="tuer__kopf"><span class="tuer__tag">' + tag + '</span><span class="tuer__datum">' + datum + '</span></div>' +
          '<ul class="tuer__lose" aria-label="Gewinnzahlen vom ' + datum + '">' +
          lose.map(function (n) {
            return '<li' + (treffer && jahr === aktuellesJahr && treffer === n ? ' class="ist-treffer"' : '') + '>' + n + '</li>';
          }).join('') +
          '</ul></li>';
      } else {
        // Geschlossenes Türchen: Ausschnitt vom Kalendermotiv, Text bleibt für Screenreader darunter
        var deckel = jahr === aktuellesJahr
          ? '<span class="tuer__deckel" aria-hidden="true" data-tag="' + tag + '">' +
            '<span class="tuer__schild">' + (istHeute ? 'Heute ab 07.30 Uhr' : zweistellig(tag) + '.12.') + '</span></span>'
          : '';
        html += '<li class="tuer tuer--zu' + (istHeute ? ' tuer--heute' : '') + (deckel ? ' tuer--deckel' : '') + '" data-tag="' + tag + '">' +
          '<div class="tuer__kopf"><span class="tuer__tag">' + tag + '</span><span class="tuer__datum">' + datum + '</span></div>' +
          '<p class="tuer__zu">' + (istHeute ? 'Heute zwischen 07.30 und 10.00 Uhr' : 'Noch nicht gezogen') + '</p>' + deckel + '</li>';
      }
    }
    liste.innerHTML = html;
    if (treffer) markiereTreffer();
    deckelZeichnen();
    fluegel();
  }

  function deckelZeichnen() {
    liste.querySelectorAll('.tuer__deckel').forEach(function (d) { motivAusschnitt(d, Number(d.dataset.tag)); });
  }

  var groesseZeit = null;
  window.addEventListener('resize', function () {
    clearTimeout(groesseZeit);
    groesseZeit = setTimeout(deckelZeichnen, 150);
  });

  // Lage der 24 Türchen auf dem Kalendermotiv 2026 (x, y, Kantenlänge in Pixeln bei 1268 × 896),
  // ermittelt aus den Stanzlinien der Druckvorlage
  var MOTIV = { breite: 1268, hoehe: 896, bild: 'bilder/kalender-2026-900.webp' };
  var TUEREN = {
    1: [1100, 730, 135], 2: [898, 137, 135], 3: [472, 450, 135], 4: [64, 694, 135],
    5: [1098, 410, 135], 6: [192, 214, 135], 7: [660, 700, 135], 8: [692, 244, 135],
    9: [1104, 67, 135], 10: [426, 676, 135], 11: [832, 530, 135], 12: [22, 294, 135],
    13: [1084, 247, 135], 14: [272, 50, 135], 15: [250, 732, 135], 16: [665, 446, 135],
    17: [877, 330, 135], 18: [1014, 570, 135], 19: [477, 76, 135], 20: [26, 502, 135],
    21: [411, 250, 135], 22: [856, 732, 135], 23: [721, 59, 135], 24: [214, 422, 204]
  };

  // Türflügel zeigt den Ausschnitt des echten Kalendertürchens
  function motivAusschnitt(fluegelEl, tag) {
    var t = TUEREN[tag];
    if (!t) return;
    var b = fluegelEl.offsetWidth, h = fluegelEl.offsetHeight;
    // leicht nach innen versetzt, damit die Stanzlinien nicht mit ins Bild kommen
    t = [t[0] + t[2] * 0.06, t[1] + t[2] * 0.06, t[2] * 0.88];
    var massstab = Math.max(b, h) / t[2];
    fluegelEl.style.backgroundImage = 'url(' + MOTIV.bild + ')';
    fluegelEl.style.backgroundSize = Math.round(MOTIV.breite * massstab) + 'px auto';
    fluegelEl.style.backgroundPosition =
      Math.round(-t[0] * massstab - (t[2] * massstab - b) / 2) + 'px ' +
      Math.round(-t[1] * massstab - (t[2] * massstab - h) / 2) + 'px';
  }

  // Ein Türflügel je geöffnetem Tag, der beim ersten Sichtkontakt aufschwingt
  function fluegel() {
    if (fluegelBeobachter) fluegelBeobachter.disconnect();
    if (bewegungAus || !('IntersectionObserver' in window)) return;
    var tueren = liste.querySelectorAll('.tuer:not(.tuer--zu)');
    var jahrIstMotiv = gewaehlt === aktuellesJahr;
    tueren.forEach(function (t) {
      var f = document.createElement('span');
      f.className = 'tuer__fluegel';
      f.setAttribute('aria-hidden', 'true');
      t.appendChild(f);
      if (jahrIstMotiv) motivAusschnitt(f, Number(t.dataset.tag));
      else f.textContent = t.dataset.tag;
    });
    fluegelBeobachter = new IntersectionObserver(function (eintraege) {
      var verzoegerung = 0;
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        fluegelBeobachter.unobserve(t);
        var fl = t.querySelector('.tuer__fluegel');
        if (fl && jahrIstMotiv) motivAusschnitt(fl, Number(t.dataset.tag));
        setTimeout(function () { t.classList.add('ist-offen'); }, verzoegerung);
        verzoegerung += 70;
      });
    }, { threshold: 0.35 });
    tueren.forEach(function (t) { fluegelBeobachter.observe(t); });
  }

  function markiereTreffer() {
    liste.querySelectorAll('.tuer').forEach(function (t) {
      var hat = !!t.querySelector('.tuer__lose li.ist-treffer');
      t.classList.toggle('ist-treffer', hat);
    });
  }

  reiter.forEach(function (r) {
    r.addEventListener('click', function () { zeichne(r.dataset.jahr); });
  });

  // Losnummer prüfen
  var suche = document.getElementById('suche');
  var feld = document.getElementById('losnummer');
  var ergebnis = document.getElementById('suche-ergebnis');

  feld.addEventListener('input', function () {
    feld.value = feld.value.replace(/\D/g, '');
  });

  suche.addEventListener('submit', function (e) {
    e.preventDefault();
    var nr = feld.value.trim();
    var jd = daten[aktuellesJahr] || {};
    if (nr.length >= 4 && window.rkZaehlen) window.rkZaehlen('suche');
    ergebnis.classList.remove('ist-treffer', 'ist-neu');
    treffer = null;

    if (nr.length < 4) {
      ergebnis.textContent = 'Bitte geben Sie die Los-Nummer von der Vorderseite Ihres Kalenders ein.';
      zeichne(aktuellesJahr);
      return;
    }
    if (!anzahl(jd)) {
      ergebnis.textContent = 'Die Gewinnzahlen 2026 erscheinen ab dem 01.12.26, täglich zwischen 07.30 und 10.00 Uhr.';
      zeichne(aktuellesJahr);
      return;
    }

    // Nur die Gewinnzahlen des laufenden Jahres zählen
    var tag = null;
    Object.keys(jd).some(function (t) {
      if ((jd[t] || []).indexOf(nr) > -1) { tag = Number(t); return true; }
      return false;
    });

    if (!tag) {
      ergebnis.textContent = 'Die Losnummer ' + nr + ' ist bisher nicht unter den Gewinnzahlen 2026. Alle Zahlen sind ohne Gewähr!';
      zeichne(aktuellesJahr);
      return;
    }

    treffer = nr;
    if (window.rkZaehlen) window.rkZaehlen('treffer');
    ergebnis.innerHTML = '<strong>Gewonnen!</strong> Die Losnummer ' + nr + ' ist unter den Gewinnzahlen vom ' +
      zweistellig(tag) + '.12.' + aktuellesJahr.slice(2) + '. Wo Sie Ihren Preis abholen können, erfahren Sie unter der Hotline <a href="tel:+49922195730">09221 / 95730</a>.';
    zeichne(aktuellesJahr);
    var tuer = liste.querySelector('.tuer[data-tag="' + tag + '"]');
    if (!tuer) return;
    tuer.classList.add('ist-offen');
    // Ergebnis einblenden (Neustart der Animation auch bei erneuter Suche)
    void ergebnis.offsetWidth;
    ergebnis.classList.add('ist-treffer', 'ist-neu');
    if (bewegungAus) return;
    // Erst an der Meldung feiern, dann zum Türchen, das sich kurz hebt
    var meldungSichtbar = ergebnis.getBoundingClientRect();
    if (meldungSichtbar.top < 0 || meldungSichtbar.bottom > window.innerHeight) ergebnis.scrollIntoView({ block: 'center' });
    funken(ergebnis);
    setTimeout(function () {
      var r = tuer.getBoundingClientRect();
      if (r.top >= 80 && r.bottom <= window.innerHeight) { heben(tuer); return; }
      tuer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      warteAufRuhe(function () { heben(tuer); });
    }, 1300);
  });

  // Wartet, bis das sanfte Scrollen zur Ruhe gekommen ist
  function warteAufRuhe(fertig) {
    var letzte = window.scrollY, ruhig = 0, erledigt = false;
    function einmal() { if (!erledigt) { erledigt = true; fertig(); } }
    setTimeout(einmal, 1200);
    (function pruefe() {
      if (erledigt) return;
      ruhig = window.scrollY === letzte ? ruhig + 1 : 0;
      letzte = window.scrollY;
      if (ruhig > 6) einmal(); else requestAnimationFrame(pruefe);
    })();
  }

  // Gewinn-Animation: goldene Funken an der Meldung, danach hebt sich das Türchen (nur transform und opacity)
  function heben(tuer) {
    tuer.classList.remove('ist-gewinn');
    void tuer.offsetWidth;
    tuer.classList.add('ist-gewinn');
  }

  function funken(ziel) {
    var r = ziel.getBoundingClientRect();
    var buehne = document.createElement('div');
    buehne.className = 'funken';
    buehne.style.left = (r.left + r.width / 2) + 'px';
    buehne.style.top = (r.top + r.height / 2) + 'px';
    buehne.setAttribute('aria-hidden', 'true');
    document.body.appendChild(buehne);

    var kurve = 'cubic-bezier(.22, .61, .21, 1)';
    var anzahlFunken = 34;
    for (var i = 0; i < anzahlFunken; i++) {
      var f = document.createElement('span');
      f.className = 'funke' + (i % 3 === 0 ? ' funke--hell' : '');
      buehne.appendChild(f);
      var winkel = (i / anzahlFunken) * Math.PI * 2 + Math.random() * 0.4;
      var weite = Math.min(Math.max(r.width, r.height), 260) * (0.5 + Math.random() * 0.5);
      var x = Math.cos(winkel) * weite, y = Math.sin(winkel) * weite - 30;
      var dreh = (Math.random() * 360) | 0;
      f.animate([
        { transform: 'translate(-50%, -50%) rotate(' + dreh + 'deg) scale(.2)', opacity: 0 },
        { transform: 'translate(calc(-50% + ' + x * 0.7 + 'px), calc(-50% + ' + y * 0.7 + 'px)) rotate(' + (dreh + 90) + 'deg) scale(1)', opacity: 1, offset: 0.45 },
        { transform: 'translate(calc(-50% + ' + x + 'px), calc(-50% + ' + (y + 40) + 'px)) rotate(' + (dreh + 180) + 'deg) scale(.6)', opacity: 0 }
      ], { duration: 1400, delay: Math.random() * 120, easing: kurve, fill: 'forwards' });
    }
    setTimeout(function () { buehne.remove(); }, 1800);
  }

  zeichne(gewaehlt);
  ladeDaten(function (neu) {
    daten = neu;
    zeichne(gewaehlt);
  });

  // Abschnitte sanft einblenden
  if (!bewegungAus && 'IntersectionObserver' in window) {
    var ziele = document.querySelectorAll('.titel, .vorzeile, .verlosung__gross, .erloese__zitat, .projekte, .tag, .stellen, .sponsoren__liste, .gruppe, .club__lead, .hotline__innen');
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-sichtbar'); beobachter.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    ziele.forEach(function (z) { z.classList.add('zeigen'); beobachter.observe(z); });
  }
})();
