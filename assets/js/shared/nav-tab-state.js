(function (window, document) {
  'use strict';
  if (window.LibraryNavTabState) return;

  /* Navigation styling owns colors only. It never opens/closes panels or touches audio. */
  var audio = [
    { selector: '#library-radio-toggle, #radio4-toggle, #nhk-radio-toggle', id: 'radio', palette: 'audio' },
    { selector: '#niv-bible-toggle', id: 'kjv', palette: 'audio' },
    { selector: '#library-podcast-toggle', id: 'podcast', palette: 'audio' }
  ];
  var reading = [
    { selector: '.site-tab--home', id: 'home' },
    { selector: '#library-book-toggle, .book-secondary-link, .book-chapter-link', id: 'book' }
  ];
  var colors = {
    audio: { normal: ['#f3eef9', '#705493', '#cbb9df'], active: ['#e9def5', '#50386a', '#9581b3'] },
    reading: { normal: ['#edf6ed', '#477653', '#c5dfc7'], active: ['#d9ecd9', '#285d37', '#83b78b'] }
  };

  function paint(el, palette, selected) {
    if (!el) return;
    var values = selected ? palette.active : palette.normal;
    el.style.setProperty('background-color', values[0], 'important');
    el.style.setProperty('color', values[1], 'important');
    el.style.setProperty('border-color', values[2], 'important');
    el.style.setProperty('border-style', 'solid', 'important');
    el.style.setProperty('border-width', selected ? '2px' : '1px', 'important');
    el.style.setProperty('box-shadow', 'none', 'important');
    el.classList.toggle('nav-state-active', !!selected);
  }

  function removeLegacyDivider() {
    document.querySelectorAll('.site-nav-row-divider, .site-nav-row-divider--wiki-bottom')
      .forEach(function (el) { el.remove(); });
  }

  function apply(family, selected) {
    var shell = document.querySelector('.site-nav-shell');
    if (!shell) return;
    if (family !== 'audio' && family !== 'reading') {
      family = shell.getAttribute('data-active-family') || 'reading';
      selected = family === 'audio'
        ? (shell.getAttribute('data-active-audio-tab') || 'radio')
        : (shell.getAttribute('data-active-reading-tab') || 'home');
    }
    shell.setAttribute('data-active-family', family);
    if (family === 'audio') shell.setAttribute('data-active-audio-tab', selected);
    else shell.setAttribute('data-active-reading-tab', selected);

    audio.forEach(function (item) {
      var isSelected = family === 'audio' && item.id === selected;
      document.querySelectorAll(item.selector).forEach(function (el) {
        paint(el, colors.audio, isSelected);
      });
    });
    reading.forEach(function (item) {
      var isSelected = family === 'reading' && item.id === selected;
      document.querySelectorAll(item.selector).forEach(function (el) {
        paint(el, colors.reading, isSelected);
      });
    });
    removeLegacyDivider();
  }

  function handleClick(event) {
    var target = event.target && event.target.closest && event.target.closest(
      '#library-radio-toggle, #radio4-toggle, #nhk-radio-toggle, #niv-bible-toggle, #library-podcast-toggle, .site-tab--home, #library-book-toggle, .book-secondary-link, .book-chapter-link'
    );
    if (!target) return;
    var audioItem = audio.find(function (item) { return target.matches(item.selector); });
    if (audioItem) {
      apply('audio', audioItem.id);
    } else {
      var readingItem = reading.find(function (item) { return target.matches(item.selector); });
      if (readingItem) apply('reading', readingItem.id);
    }
  }

  function initialState() {
    var path = window.location.pathname || '/';
    if (/^\/(data|algorithms|linux|cloud)(\/|$)/.test(path)) return ['reading', 'book'];
    var shell = document.querySelector('.site-nav-shell');
    if (shell && shell.getAttribute('data-active-family') === 'audio') {
      return ['audio', shell.getAttribute('data-active-audio-tab') || 'radio'];
    }
    return ['reading', 'home'];
  }

  window.LibraryNavTabState = {
    refresh: function () { var state = initialState(); apply(state[0], state[1]); },
    apply: apply
  };
  document.addEventListener('click', handleClick, true);
  document.addEventListener('DOMContentLoaded', function () {
    var state = initialState(); apply(state[0], state[1]);
  });
  window.addEventListener('pageshow', function () {
    var state = initialState(); apply(state[0], state[1]);
  });
  apply.apply(null, initialState());
})(window, document);
