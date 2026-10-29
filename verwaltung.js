// Verwaltung der Gewinnzahlen.
// Mit Server (api.php auf dem Webspace): Anmeldung nötig, Zahlen werden für alle gespeichert.
// Ohne Server (z. B. Vorschau auf GitHub): Demo, Einträge bleiben nur in diesem Browser.
(function () {
  'use strict';

  var SPEICHER = 'rk-gewinnzahlen';
  var $ = function (id) { return document.getElementById(id); };
  var jahrFeld = $('jahr'), tagFeld = $('tag'), loseFeld = $('lose');
  var hilfe = $('hilfe'), vorschau = $('vorschau'), meldung = $('meldung'), tageListe = $('tage');

  var modus = null;      // 'server' oder 'demo'
  var schluessel = '';   // Schutz für schreibende Anfragen, kommt vom Server
  var eingetragen = {};  // Zahlen vom Server bzw. aus dem Browser

  function zweistellig(n) { return (n < 10 ? '0' : '') + n; }
  function zerlege(text) {
    return (text.match(/\d+/g) || []).filter(function (n, i, a) { return a.indexOf(n) === i; });
  }

  function api(aktion, daten) {
    var optionen = { cache: 'no-store', credentials: 'same-origin' };
    if (daten) {
      optionen.method = 'POST';
      optionen.headers = { 'Content-Type': 'application/json' };
      optionen.body = JSON.stringify(daten);
    }
    return fetch('api.php?aktion=' + aktion, optionen).then(function (r) {
      if ((r.headers.get('content-type') || '').indexOf('application/json') !== 0) throw new Error('kein Server');
      return r.json().then(function (j) {
        if (!r.ok) { var f = new Error(j.fehler || 'Fehler'); f.status = r.status; throw f; }
        return j;
      });
    });
  }

  function alle(jahr) {
    var basis = (window.GEWINNZAHLEN || {})[jahr] || {};
    var e = eingetragen[jahr] || {};
    var d = {};
    Object.keys(basis).forEach(function (t) { d[t] = basis[t]; });
    Object.keys(e).forEach(function (t) { d[t] = e[t]; });
    return d;
  }

  // Ansicht

  function zeige(bereich) {
    $('anmelden').hidden = bereich !== 'anmelden';
    $('bereich').hidden = bereich !== 'bereich';
  }

  for (var t = 1; t <= 24; t++) {
    var o = document.createElement('option');
    o.value = t; o.textContent = zweistellig(t) + '.12.';
    tagFeld.appendChild(o);
  }
  var heute = new Date();
  if (heute.getMonth() === 11 && heute.getDate() <= 24) tagFeld.value = heute.getDate();

  function zeigeVorschau() {
    var nummern = zerlege(loseFeld.value);
    var seltsam = nummern.filter(function (n) { return n.length !== 6; });
    vorschau.innerHTML = nummern.map(function (n) {
      return '<li' + (n.length !== 6 ? ' class="ist-ungewoehnlich" title="Keine sechsstellige Nummer"' : '') + '>' + n + '</li>';
    }).join('');
    hilfe.classList.toggle('ist-warnung', seltsam.length > 0);
    hilfe.textContent = !nummern.length ? 'Noch keine Nummern erkannt.'
      : nummern.length + (nummern.length === 1 ? ' Nummer' : ' Nummern') + ' erkannt' +
        (seltsam.length ? ', davon ' + seltsam.length + ' nicht sechsstellig. Bitte prüfen.' : '.');
  }

  function ladeTag() {
    loseFeld.value = (alle(jahrFeld.value)[tagFeld.value] || []).join('\n');
    meldung.textContent = '';
    zeigeVorschau();
    zeichneUeberblick();
  }

  function zeichneUeberblick() {
    var d = alle(jahrFeld.value);
    $('ueberblick-jahr').textContent = jahrFeld.value;
    var html = '';
    for (var t = 1; t <= 24; t++) {
      var n = (d[t] || []).length;
      var klassen = (n ? 'ist-voll' : '') + (String(t) === tagFeld.value ? ' ist-gewaehlt' : '');
      html += '<li><button type="button" class="' + klassen + '" data-tag="' + t + '"><b>' + t + '</b><span>' +
        (n ? n + ' Lose' : 'offen') + '</span></button></li>';
    }
    tageListe.innerHTML = html;
  }

  // Start: Server vorhanden?

  function starteDemo() {
    modus = 'demo';
    try { eingetragen = JSON.parse(localStorage.getItem(SPEICHER) || '{}'); } catch (e) { eingetragen = {}; }
    $('modus-hinweis').textContent = 'Demo der Verwaltung · Einträge werden nur in diesem Browser gespeichert';
    zeige('bereich');
    ladeTag();
  }

  var eingabeBehalten = false; // nach abgelaufener Sitzung die getippten Nummern nicht überschreiben

  function starteBereich(name) {
    $('konto').hidden = false;
    $('konto-name').textContent = name;
    return api('zahlen').then(function (j) {
      eingetragen = j.zahlen || {};
      zeige('bereich');
      if (eingabeBehalten) {
        eingabeBehalten = false;
        meldung.textContent = 'Wieder angemeldet. Bitte erneut auf Veröffentlichen tippen.';
        zeichneUeberblick();
      } else {
        ladeTag();
      }
    });
  }

  api('status').then(function (s) {
    modus = 'server';
    schluessel = s.schluessel;
    $('modus-hinweis').textContent = 'Verwaltung · Änderungen sind sofort für alle sichtbar';
    if (s.angemeldet) return starteBereich(s.benutzer);
    zeige('anmelden');
    $('benutzer').focus();
  }).catch(starteDemo);

  // Anmelden und Abmelden

  $('anmelde-formular').addEventListener('submit', function (e) {
    e.preventDefault();
    var knopf = e.target.querySelector('button');
    var hinweis = $('anmelde-meldung');
    hinweis.textContent = '';
    knopf.disabled = true;
    api('anmelden', { benutzer: $('benutzer').value, passwort: $('passwort').value })
      .then(function (s) {
        schluessel = s.schluessel;
        $('passwort').value = '';
        return starteBereich(s.benutzer);
      })
      .catch(function (f) { hinweis.textContent = f.message || 'Anmeldung nicht möglich.'; })
      .then(function () { knopf.disabled = false; });
  });

  $('abmelden').addEventListener('click', function () {
    api('abmelden', { schluessel: schluessel }).catch(function () {}).then(function () { location.reload(); });
  });

  // Eintragen

  tageListe.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    tagFeld.value = b.dataset.tag;
    ladeTag();
    loseFeld.focus();
  });
  jahrFeld.addEventListener('change', ladeTag);
  tagFeld.addEventListener('change', ladeTag);
  loseFeld.addEventListener('input', zeigeVorschau);

  function speichere() {
    var nummern = zerlege(loseFeld.value);
    var jahr = jahrFeld.value, tag = tagFeld.value;
    var text = nummern.length
      ? nummern.length + ' Losnummern für den ' + zweistellig(+tag) + '.12.' + jahr.slice(2) + ' veröffentlicht.'
      : 'Tag geleert.';

    if (modus === 'demo') {
      eingetragen[jahr] = eingetragen[jahr] || {};
      eingetragen[jahr][tag] = nummern;
      try { localStorage.setItem(SPEICHER, JSON.stringify(eingetragen)); meldung.textContent = text; }
      catch (e) { meldung.textContent = 'Speichern nicht möglich (privates Fenster?).'; }
      zeichneUeberblick();
      return;
    }

    meldung.textContent = 'Wird gespeichert …';
    api('speichern', { schluessel: schluessel, jahr: +jahr, tag: +tag, lose: nummern })
      .then(function (j) {
        eingetragen = j.zahlen || {};
        meldung.textContent = text;
        zeichneUeberblick();
      })
      .catch(function (f) {
        if (f.status === 401 || f.status === 403) {
          eingabeBehalten = true;
          $('anmelde-meldung').textContent = 'Sitzung abgelaufen. Bitte neu anmelden, die Eingabe bleibt erhalten.';
          api('status').then(function (s) { schluessel = s.schluessel; }).catch(function () {});
          zeige('anmelden');
          $('benutzer').focus();
        } else {
          meldung.textContent = 'Nicht gespeichert: ' + (f.message || 'Verbindung prüfen.');
        }
      });
  }

  $('formular').addEventListener('submit', function (e) { e.preventDefault(); speichere(); });
  $('loeschen').addEventListener('click', function () {
    if (!loseFeld.value.trim() || confirm('Alle Losnummern für diesen Tag entfernen?')) {
      loseFeld.value = '';
      zeigeVorschau();
      speichere();
    }
  });
})();
