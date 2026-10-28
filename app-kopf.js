// Menü am Handy (alle Seiten)
(function () {
  'use strict';

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
})();
