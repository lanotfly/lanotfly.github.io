/* Compact market overview panel, opened from the Market navigation tab. */
(function () {
  'use strict';
  var button = document.getElementById('library-market-toggle');
  var panel = document.getElementById('library-market-panel');
  if (!button || !panel || button.dataset.marketPanelReady === 'true') return;
  button.dataset.marketPanelReady = 'true';

  function closeMarket() {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.classList.remove('is-open', 'is-active');
  }
  button.addEventListener('click', function () {
    var open = panel.hidden;
    if (open) {
      ['library-radio-panel', 'library-book-panel', 'library-podcast-panel', 'niv-bible-panel'].forEach(function (id) {
        var other = document.getElementById(id);
        if (other) other.hidden = true;
      });
      ['library-radio-toggle', 'library-book-toggle', 'library-podcast-toggle', 'niv-bible-toggle'].forEach(function (id) {
        var otherButton = document.getElementById(id);
        if (otherButton) {
          otherButton.setAttribute('aria-expanded', 'false');
          otherButton.classList.remove('is-open', 'is-active');
        }
      });
    }
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.classList.toggle('is-open', open);
    button.classList.toggle('is-active', open);
  });
  document.addEventListener('click', function (event) {
    if (panel.hidden || panel.contains(event.target) || button.contains(event.target)) return;
    if (event.target.closest && event.target.closest('#library-radio-toggle, #library-book-toggle, #library-podcast-toggle, #niv-bible-toggle')) closeMarket();
  }, true);
})();
