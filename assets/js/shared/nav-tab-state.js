/* One shared owner for primary navigation colors and active state. */
(function (window, document) {
  'use strict';
  if (window.LibraryNavTabState) return;

  var audioSelectors = [
    ['#library-radio-toggle', 'radio'],
    ['#niv-bible-toggle', 'kjv'],
    ['#library-podcast-toggle', 'podcast']
  ];
  var pale = { background: '#f3eef9', color: '#705493', border: '#cbb9df' };
  var active = { background: '#e9def5', color: '#50386a', border: '#9581b3' };

  function setImportant(el, palette, activeState) {
    if (!el) return;
    function setIfDifferent(property, value) {
      if (el.style.getPropertyValue(property) !== value ||
          el.style.getPropertyPriority(property) !== 'important') {
        el.style.setProperty(property, value, 'important');
      }
    }
    setIfDifferent('background-color', palette.background);
    setIfDifferent('color', palette.color);
    setIfDifferent('border-color', palette.border);
    setIfDifferent('border-style', 'solid');
    setIfDifferent('border-width', activeState ? '2px' : '1px');
    setIfDifferent('box-shadow', 'none');
    if (el.classList.contains('nav-state-active') !== !!activeState) {
      el.classList.toggle('nav-state-active', !!activeState);
    }
  }

  function removeLegacyDivider() {
    document.querySelectorAll(
      '.site-nav-row-divider, .site-nav-row-divider--wiki-bottom'
    ).forEach(function (el) { el.remove(); });
  }

  function apply(reason, clickedTab) {
    var shell = document.querySelector('.site-nav-shell');
    if (!shell) return;

    var selected = null;
    if (clickedTab) {
      selected = clickedTab;
    } else if (shell.getAttribute('data-active-family') === 'audio') {
      selected = shell.getAttribute('data-active-audio-tab');
    }

    audioSelectors.forEach(function (item) {
      var button = shell.querySelector(item[0]);
      var isActive = !!selected && selected === item[1];
      setImportant(button, isActive ? active : pale, isActive);
    });

    if (selected) {
      if (shell.getAttribute('data-active-family') !== 'audio') {
        shell.setAttribute('data-active-family', 'audio');
      }
      if (shell.getAttribute('data-active-audio-tab') !== selected) {
        shell.setAttribute('data-active-audio-tab', selected);
      }
    }

    removeLegacyDivider();
  }

  function handleClick(event) {
    var target = event.target && event.target.closest && event.target.closest(
      '#library-radio-toggle, #radio4-toggle, #nhk-radio-toggle, #niv-bible-toggle, #library-podcast-toggle'
    );
    if (!target) return;
    var selected = target.matches('#library-radio-toggle, #radio4-toggle, #nhk-radio-toggle')
      ? 'radio'
      : target.matches('#niv-bible-toggle') ? 'kjv' : 'podcast';
    apply('click', selected);
    /* Re-apply after existing playback handlers have updated aria/class state. */
    window.requestAnimationFrame(function () { apply('click-settled', selected); });
  }

  var api = {
    refresh: function () { apply('manual-refresh', null); },
    apply: apply
  };
  window.LibraryNavTabState = api;

  document.addEventListener('DOMContentLoaded', function () { apply('dom-ready', null); });
  window.addEventListener('load', function () { apply('load', null); });
  window.addEventListener('pageshow', function () { apply('pageshow', null); });
  document.addEventListener('click', handleClick, true);

  /* Catch other legacy scripts changing inline styles or adding the old divider. */
  if (window.MutationObserver && document.documentElement) {
    var observer = new MutationObserver(function () {
      if (observer._navRefreshQueued) return;
      observer._navRefreshQueued = true;
      window.requestAnimationFrame(function () {
        observer._navRefreshQueued = false;
        apply('mutation', null);
      });
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'aria-expanded', 'aria-pressed', 'data-active-family', 'data-active-audio-tab']
    });
  }

  apply('initial', null);
})(window, document);
