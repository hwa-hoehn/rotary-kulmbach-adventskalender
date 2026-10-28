// Prüfskript: Überlauf, Schrift < 12 px, gequetschter Text. Im Browser ausführen: fetch('audit.js').then(r=>r.text()).then(eval)
window.__audit = function () {
  var W = document.documentElement.clientWidth, out = { w: innerWidth, overflow: [], small: [], squeezed: [] };
  if (document.documentElement.scrollWidth > W) out.pageOverflow = document.documentElement.scrollWidth;
  document.querySelectorAll('body *').forEach(function (el) {
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('svg') || el.closest('.navigation') || el.classList.contains('tuer__fluegel')) return;
    var r = el.getBoundingClientRect(); if (!r.width) return;
    if (r.right > W + 1 || r.left < -1) out.overflow.push((el.className || el.tagName) + ' ' + Math.round(r.left) + '-' + Math.round(r.right));
    var hasText = [].some.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); });
    if (hasText) {
      if (parseFloat(cs.fontSize) < 12) out.small.push(el.className || el.tagName);
      if (el.textContent.length > 60 && r.width < 170) out.squeezed.push((el.className || el.tagName) + ' ' + Math.round(r.width));
    }
  });
  ['overflow', 'small', 'squeezed'].forEach(function (k) { out[k] = Array.from(new Set(out[k])).slice(0, 10); });
  return out;
};
