// Verwaltung (Demo): speichert Gewinnzahlen im Browser. Später übernimmt das ein Redaktionssystem.
(function () {
  'use strict';

  var SPEICHER = 'rk-gewinnzahlen';
  var jahrFeld = document.getElementById('jahr');
  var tagFeld = document.getElementById('tag');
  var loseFeld = document.getElementById('lose');
  var hilfe = document.getElementById('hilfe');
  var vorschau = document.getElementById('vorschau');
  var meldung = document.getElementById('meldung');
  var tageListe = document.getElementById('tage');

  function eigene() {
    try { return JSON.parse(localStorage.getItem(SPEICHER) || '{}'); } catch (e) { return {}; }
  }
  function speichere(d) {
    try { localStorage.setItem(SPEICHER, JSON.stringify(d)); return true; } catch (e) { return false; }
  }
  function alle(jahr) {
    var basis = (window.GEWINNZAHLEN || {})[jahr] || {};
    var e = eigene()[jahr] || {};
    var d = {};
    Object.keys(basis).forEach(function (t) { d[t] = basis[t]; });
    Object.keys(e).forEach(function (t) { d[t] = e[t]; });
    return d;
  }
  function zerlege(text) {
    return (text.match(/\d+/g) || []).filter(function (n, i, a) { return a.indexOf(n) === i; });
  }
  function zweistellig(n) { return (n < 10 ? '0' : '') + n; }

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
    var d = alle(jahrFeld.value);
    loseFeld.value = (d[tagFeld.value] || []).join('\n');
    meldung.textContent = '';
    zeigeVorschau();
    zeichneUeberblick();
  }

  function zeichneUeberblick() {
    var d = alle(jahrFeld.value);
    document.getElementById('ueberblick-jahr').textContent = jahrFeld.value;
    var html = '';
    for (var t = 1; t <= 24; t++) {
      var n = (d[t] || []).length;
      var klassen = (n ? 'ist-voll' : '') + (String(t) === tagFeld.value ? ' ist-gewaehlt' : '');
      html += '<li><button type="button" class="' + klassen + '" data-tag="' + t + '"><b>' + t + '</b><span>' +
        (n ? n + ' Lose' : 'offen') + '</span></button></li>';
    }
    tageListe.innerHTML = html;
  }

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

  document.getElementById('formular').addEventListener('submit', function (e) {
    e.preventDefault();
    var nummern = zerlege(loseFeld.value);
    var d = eigene();
    d[jahrFeld.value] = d[jahrFeld.value] || {};
    d[jahrFeld.value][tagFeld.value] = nummern;
    meldung.textContent = speichere(d)
      ? (nummern.length ? nummern.length + ' Losnummern für den ' + zweistellig(+tagFeld.value) + '.12.' + jahrFeld.value.slice(2) + ' veröffentlicht.' : 'Tag geleert.')
      : 'Speichern nicht möglich (privates Fenster?).';
    zeichneUeberblick();
  });

  document.getElementById('loeschen').addEventListener('click', function () {
    loseFeld.value = '';
    zeigeVorschau();
    document.getElementById('formular').requestSubmit();
  });

  ladeTag();
})();
