/* Custom dropdowns for the deck's <select> controls. iOS renders a native
   select's option list as a huge system popover that no CSS can resize, so
   the filters, the KJV book chooser and the book-drawer chooser wear a
   custom button + menu instead. The real <select> stays in the DOM
   (visually hidden) and remains the single source of truth: choosing a
   menu item sets its value and dispatches 'change', so every existing
   listener keeps working untouched. */
(function (window, document) {
  'use strict';
  if (window.LibraryEnhanceSelect) return;
  var instances = [];
  var CHEVRON = '<svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true" focusable="false"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function closeInstance(inst) {
    inst.menu.hidden = true;
    inst.button.setAttribute('aria-expanded', 'false');
  }
  function closeAll(except) {
    instances.forEach(function (inst) { if (inst !== except) closeInstance(inst); });
  }
  document.addEventListener('click', function (event) {
    instances.forEach(function (inst) {
      if (!inst.wrap.contains(event.target)) closeInstance(inst);
    });
  }, true);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeAll(null);
  });

  function syncInstance(inst) {
    var select = inst.select;
    var option = select.options[select.selectedIndex];
    inst.label.textContent = option ? option.textContent : '';
  }
  function buildMenu(inst) {
    var select = inst.select;
    inst.menu.textContent = '';
    Array.prototype.forEach.call(select.options, function (option) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'lx-select__option';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.selected));
      if (option.selected) item.classList.add('is-current');
      item.textContent = option.textContent;
      item.addEventListener('click', function () {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncInstance(inst);
        closeInstance(inst);
        inst.button.focus();
      });
      inst.menu.appendChild(item);
    });
  }
  function openInstance(inst) {
    buildMenu(inst);
    syncInstance(inst);
    closeAll(inst);
    inst.menu.hidden = false;
    inst.button.setAttribute('aria-expanded', 'true');
  }

  function enhance(select, opts) {
    if (!select || select.dataset.lxEnhanced) return null;
    opts = opts || {};
    select.dataset.lxEnhanced = '1';
    var wrap = document.createElement('span');
    wrap.className = 'lx-select lx-select--' + (opts.variant || 'filter');
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add('lx-select__native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');
    /* A click the label forwards onto the hidden select must never open
       the native popover. */
    select.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
    }, true);

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'lx-select__button' + (opts.buttonClass ? ' ' + opts.buttonClass : '');
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    var ariaLabel = select.getAttribute('aria-label');
    if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
    var label = document.createElement('span');
    label.className = 'lx-select__label';
    var chevron = document.createElement('span');
    chevron.className = 'lx-select__chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = CHEVRON;
    button.appendChild(label);
    button.appendChild(chevron);
    wrap.appendChild(button);

    var menu = document.createElement('div');
    menu.className = 'lx-select__menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    wrap.appendChild(menu);

    var inst = { select: select, wrap: wrap, button: button, menu: menu, label: label };
    button.addEventListener('click', function () {
      if (menu.hidden) openInstance(inst); else closeInstance(inst);
    });
    if (window.MutationObserver) {
      new MutationObserver(function () { syncInstance(inst); }).observe(select, { childList: true, characterData: true, subtree: true });
    }
    select.addEventListener('change', function () { syncInstance(inst); });
    instances.push(inst);
    syncInstance(inst);
    return inst;
  }

  window.LibraryEnhanceSelect = enhance;
  window.LibrarySyncCustomSelects = function () { instances.forEach(syncInstance); };

  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('select.podcast-panel-filter'), function (select) {
      enhance(select, { variant: 'filter', buttonClass: 'podcast-panel-filter' });
    });
    /* The KJV controls are created/moved by niv-bible.js during its own
       init; enhancing here (after every deferred script has run) catches
       them regardless of script order. enhance() is idempotent. */
    var book = document.getElementById('niv-book-select');
    if (book) enhance(book, { variant: 'book', buttonClass: 'niv-bible-book-select' });
    var kjvFilter = document.getElementById('niv-bible-list-mode');
    if (kjvFilter) enhance(kjvFilter, { variant: 'filter', buttonClass: 'podcast-panel-filter' });
  });
})(window, document);
