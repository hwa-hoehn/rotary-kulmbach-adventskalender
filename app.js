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

  // Menü am Handy
  var menueKnopf = document.querySelector('.menue-knopf');
  var navigation = document.getElementById('navigation');
  if (menueKnopf && navigation) {
    menueKnopf.addEventListener('click', function () {
      var offen = menueKnopf.getAttribute('aria-expanded') === 'true';
      menueKnopf.setAttribute('aria-expanded', String(!offen));
      navigation.classList.toggle('ist-offen', !offen);
    });
    navigation.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        menueKnopf.setAttribute('aria-expanded', 'false');
        navigation.classList.remove('ist-offen');
      }
    });
  }

  // Türchen
  var liste = document.getElementById('tuerchen');
  var status = document.getElementById('gewinn-status');
  var reiter = Array.prototype.slice.call(document.querySelectorAll('.jahre__knopf'));
  var daten = ladeDaten();
  var heute = new Date();
  var aktuellesJahr = '2026';
  var gewaehlt = anzahl(daten[aktuellesJahr]) ? aktuellesJahr : '2025';
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
      status.textContent = 'Alle Gewinnzahlen der Verlosung ' + jahr + '.';
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
            return '<li' + (treffer && treffer === n ? ' class="ist-treffer"' : '') + '>' + n + '</li>';
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
    ergebnis.classList.remove('ist-treffer');
    if (nr.length < 4) {
      treffer = null;
      ergebnis.textContent = 'Bitte geben Sie die Los-Nummer von der Vorderseite Ihres Kalenders ein.';
      zeichne(gewaehlt);
      return;
    }
    var fund = null;
    [aktuellesJahr, '2025'].some(function (jahr) {
      var jd = daten[jahr] || {};
      return Object.keys(jd).some(function (tag) {
        if ((jd[tag] || []).indexOf(nr) > -1) { fund = { jahr: jahr, tag: Number(tag) }; return true; }
        return false;
      });
    });

    if (fund) {
      treffer = nr;
      ergebnis.classList.add('ist-treffer');
      ergebnis.innerHTML = '<strong>Gewonnen!</strong> Die Losnummer ' + nr + ' ist unter den Gewinnzahlen vom ' +
        zweistellig(fund.tag) + '.12.' + fund.jahr.slice(2) + '. Wo Sie Ihren Preis abholen können, erfahren Sie unter der Hotline 09221 / 95730.';
      zeichne(fund.jahr);
      var tuer = liste.querySelector('.tuer[data-tag="' + fund.tag + '"]');
      if (tuer) {
        tuer.classList.add('ist-offen');
        tuer.scrollIntoView({ behavior: bewegungAus ? 'auto' : 'smooth', block: 'center' });
      }
    } else {
      treffer = null;
      ergebnis.textContent = 'Die Losnummer ' + nr + ' ist bisher nicht unter den Gewinnzahlen. Alle Zahlen sind ohne Gewähr!';
      zeichne(gewaehlt);
    }
  });

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
