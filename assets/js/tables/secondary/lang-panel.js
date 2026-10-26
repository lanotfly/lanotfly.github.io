/* Lang: group the two language-learning podcasts under one parent tab. */
(function (window, document) {
  'use strict';
  if (window.__libraryLangPanelInstalled) return;
  window.__libraryLangPanelInstalled = true;

  var toggle = document.getElementById('library-lang-toggle');
  var panel = document.getElementById('library-lang-panel');
  if (!toggle || !panel) return;

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(!!open));
  }

  panel.querySelectorAll('[role="tab"]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      panel.querySelectorAll('[role="tab"]').forEach(function (other) {
        var selected = other === tab;
        other.classList.toggle('is-active', selected);
        other.setAttribute('aria-selected', String(selected));
      });
    });
  });

  toggle.addEventListener('click', function () {
    var newsToggle = document.getElementById('library-news-toggle');
    var newsPanel = document.getElementById('library-news-panel');
    if (newsPanel && !newsPanel.hidden && newsToggle) newsToggle.click();
    setOpen(panel.hidden);
  });

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest && event.target.closest(
      '#radio4-toggle, #nhk-radio-toggle, #niv-bible-toggle, #library-news-toggle, #site-tab-home, .site-tab--home, .site-tab--data, .site-tab--algorithm, .site-tab--ai, .site-tab--linux, .site-tab--cloud'
    );
    if (target && !panel.hidden) setOpen(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
})(window, document);
