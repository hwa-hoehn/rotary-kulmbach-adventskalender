// Rotary Adventskalender Kulmbach · Gestaltungsvorschlag HWA
(function () {
  'use strict';

  var SPEICHER = 'rk-gewinnzahlen';
  var bewegungAus = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Gewinnzahlen: feste Daten plus Einträge aus der Verwaltung (Demo: im Browser gespeichert)
  function ladeDaten() {
    var daten = JSON.parse(JSON.stringify(window.GEWINNZAHLEN || {}));
    try {
      var eigen = JSON.parse(localStorage.getItem(SPEICHER) || '{}');
      Object.keys(eigen).forEach(function (jahr) {
        daten[jahr] = daten[jahr] || {};
        Object.keys(eigen[jahr]).forEach(function (tag) { daten[jahr][tag] = eigen[jahr][tag]; });
      });
    } catch (e) { /* ohne Speicher gelten die festen Daten */ }
    return daten;
  }

  function anzahl(jahrDaten) {
    return Object.keys(jahrDaten || {}).filter(function (t) { return (jahrDaten[t] || []).length; }).length;
  }

  function zweistellig(n) { return (n < 10 ? '0' : '') + n; }

  // Türchen
  var liste = document.getElementById('tuerchen');
  var status = document.getElementById('gewinn-status');
  var reiter = Array.prototype.slice.call(document.querySelectorAll('.jahre__knopf'));
  var daten = ladeDaten();
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
        html += '<li class="tuer tuer--zu' + (istHeute ? ' tuer--heute' : '') + '" data-tag="' + tag + '">' +
          '<div class="tuer__kopf"><span class="tuer__tag">' + tag + '</span><span class="tuer__datum">' + datum + '</span></div>' +
          '<p class="tuer__zu">' + (istHeute ? 'Heute zwischen 07.30 und 10.00 Uhr' : 'Noch nicht gezogen') + '</p></li>';
      }
    }
    liste.innerHTML = html;
    if (treffer) markiereTreffer();
    fluegel();
  }

  // Ein Türflügel je geöffnetem Tag, der beim ersten Sichtkontakt aufschwingt
  function fluegel() {
    if (fluegelBeobachter) fluegelBeobachter.disconnect();
    if (bewegungAus || !('IntersectionObserver' in window)) return;
    var tueren = liste.querySelectorAll('.tuer:not(.tuer--zu)');
    tueren.forEach(function (t) {
      var f = document.createElement('span');
      f.className = 'tuer__fluegel';
      f.setAttribute('aria-hidden', 'true');
      f.textContent = t.dataset.tag;
      t.appendChild(f);
    });
    fluegelBeobachter = new IntersectionObserver(function (eintraege) {
      var verzoegerung = 0;
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        fluegelBeobachter.unobserve(t);
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
