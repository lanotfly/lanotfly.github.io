/* Layout owner for the primary navigation stack.
   Tab-specific scripts decide which panel is visible; this script only guarantees
   a stable document-flow order. Market/News is deliberately portaled above the page. */
(function (window, document) {
  'use strict';
  if (window.LibraryNavigationLayout) return;

  function init() {
    var body = document.body;
    var inner = document.querySelector('.content-wrapper__inner');
    var shell = document.querySelector('.site-nav-shell');
    if (!body || !inner || !shell) return;

    body.classList.add('library-layout-ready');
    shell.classList.add('library-nav-flow');

    var market = document.getElementById('library-market-panel');
    if (market && market.parentElement !== body) body.appendChild(market);

    /* These panels occupy the shared slot between L1 and the article. Do not
       force visibility: their owning tab scripts retain exclusive control. */
    var orderedPanels = [
      document.getElementById('niv-bible-panel'),
      document.getElementById('library-podcast-panel')
    ].filter(Boolean);

    orderedPanels.forEach(function (panel) {
      if (panel.parentElement !== inner) {
        inner.insertBefore(panel, shell.nextSibling);
      }
    });

    /* Make the layout contract observable for debugging without changing state. */
    function syncLayoutState() {
      var book = document.getElementById('library-book-panel');
      var radio = document.getElementById('library-radio-panel');
      var kjv = document.getElementById('niv-bible-panel');
      var podcast = document.getElementById('library-podcast-panel');
      shell.dataset.navLayout = 'flow';
      shell.dataset.visibleSubpanel =
        book && !book.hidden ? (book.querySelector('.book-chapter-tabs:not([hidden])') ? 'book-l3' : 'book-l2') :
        radio && !radio.hidden ? 'radio-l2' :
        kjv && !kjv.hidden ? 'kjv-panel' :
        podcast && !podcast.hidden ? 'podcast-panel' : 'none';
    }

    syncLayoutState();
    if (window.MutationObserver) {
      var observer = new MutationObserver(syncLayoutState);
      [shell,
       document.getElementById('library-book-panel'),
       document.getElementById('library-radio-panel'),
       document.getElementById('niv-bible-panel'),
       document.getElementById('library-podcast-panel')]
        .filter(Boolean)
        .forEach(function (node) {
          observer.observe(node, { attributes: true, attributeFilter: ['hidden', 'class'] });
        });
    }

    window.LibraryNavigationLayout = { refresh: syncLayoutState };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
