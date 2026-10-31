/* Unified tab-state controller — the ONLY place tab colors are decided.
 *
 * Modules own the semantics: they flip aria-pressed / aria-selected /
 * aria-expanded or an .is-active / .is-playing / .is-open class, and never
 * paint colors themselves. This controller translates each element's state
 * into paint, for every tab, all the time:
 *
 *   unselected = light tint + DASHED border
 *   selected   = deeper tint + SOLID border
 *
 * Audio family (Radio, KJV, Podcast, station and feed tabs) is purple;
 * reading family (Home, Book links) is green. A MutationObserver repaints
 * whenever any module changes state — lock-screen pauses, source switches
 * and feed changes included — so the colors can never drift apart the way
 * they did when individual modules painted their own buttons. */
(function (window, document) {
  'use strict';
  if (window.LibraryNavTabState) return;

  var PALETTES = {
    audio: { normal: ['#f3eef9', '#705493', '#cbb9df'], active: ['#e2d0f6', '#4a2f66', '#8a6bb0'] },
    reading: { normal: ['#edf6ed', '#477653', '#c5dfc7'], active: ['#cdeccf', '#22522e', '#74a97c'] }
  };
  var TARGETS = [
    { selector: '#library-audio-toggle, #library-radio-toggle, #radio4-toggle, #nhk-radio-toggle, #niv-bible-toggle, #library-podcast-toggle', family: 'audio' },
    { selector: '[data-podcast-tab]', family: 'audio' },
    { selector: '.site-tab--home, #library-book-toggle, .book-secondary-link, .book-chapter-link', family: 'reading' }
  ];

  function isSelected(el) {
    if (el.getAttribute('aria-pressed') === 'true') return true;
    if (el.getAttribute('aria-selected') === 'true') return true;
    if (el.getAttribute('aria-expanded') === 'true') return true;
    if (el.classList.contains('is-active') || el.classList.contains('is-playing') ||
        el.classList.contains('is-open') || el.classList.contains('is-current')) return true;
    // The Home link carries no state of its own: it is selected on the home page.
    if (el.classList.contains('site-tab--home')) {
      var path = window.location.pathname || '/';
      return path === '/' || path === '/home/' || path === '/home';
    }
    return false;
  }

  function paint(el, palette) {
    var selected = isSelected(el);
    var values = selected ? palette.active : palette.normal;
    el.style.setProperty('background-color', values[0], 'important');
    el.style.setProperty('color', values[1], 'important');
    el.style.setProperty('border-color', values[2], 'important');
    el.style.setProperty('border-style', selected ? 'solid' : 'dashed', 'important');
    el.style.setProperty('border-width', selected ? '2px' : '1px', 'important');
    el.style.setProperty('box-shadow', 'none', 'important');
    el.classList.toggle('nav-state-active', selected);
  }

  function removeLegacyDivider() {
    document.querySelectorAll('.site-nav-row-divider, .site-nav-row-divider--wiki-bottom')
      .forEach(function (el) { el.remove(); });
  }

  function paintAll() {
    TARGETS.forEach(function (group) {
      document.querySelectorAll(group.selector).forEach(function (el) {
        paint(el, PALETTES[group.family]);
      });
    });
    removeLegacyDivider();
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () { scheduled = false; paintAll(); });
  }

  window.LibraryNavTabState = { refresh: paintAll, apply: paintAll };

  document.addEventListener('click', function (event) {
    schedule();
    /* Going Home or picking a book chapter folds any open audio lists into
       their mini bars right away, and flags the session so the panels also
       reopen folded after the navigation lands. */
    var t = event.target;
    if (t && t.closest && t.closest('.site-tab--home, .book-drawer-link, .book-chapter-link, .book-secondary-link')) {
      try { sessionStorage.setItem('library-fold-audio', '1'); } catch (e) {}
      if (window.LibraryAudioSetFold) window.LibraryAudioSetFold(false);
    }
  }, true);
  window.addEventListener('pageshow', paintAll);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintAll);
  if (document.body && window.MutationObserver) {
    new MutationObserver(schedule).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'aria-pressed', 'aria-selected', 'aria-expanded']
    });
  }
  paintAll();
})(window, document);
