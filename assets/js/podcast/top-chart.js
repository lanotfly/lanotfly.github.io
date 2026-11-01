/* Manage Podcasts: one panel to look after reader-added shows —
   the shows already added (with Remove), a search box (Apple's
   search API), and the Top Podcasts chart. Two chart regions only:
   Japan, and English (the US and UK charts interleaved, de-duped).
   Adding installs a real feed via panel.js's LibraryUserPodcasts;
   this module is only the management UI. All endpoints used here
   send CORS headers, so everything loads live in the browser. */
(function (window, document) {
  'use strict';
  if (window.__libraryTopChartInstalled) return;
  window.__libraryTopChartInstalled = true;

  var section = document.querySelector('[data-podcast-feed-panel="topchart"]');
  var tab = document.querySelector('[data-podcast-tab="topchart"]');
  if (!section || !tab) return;
  var mineEl = section.querySelector('[data-topchart-mine]');
  var searchInput = section.querySelector('[data-topchart-search]');
  var resultsEl = section.querySelector('[data-topchart-results]');
  var listEl = section.querySelector('[data-topchart-list]');
  var statusEl = section.querySelector('[data-topchart-status]');
  if (!mineEl || !listEl) return;

  var REGIONS = { jp: 'Japan', en: 'English' };
  var region = 'jp';
  try {
    var savedRegion = localStorage.getItem('personal-library-topchart-region');
    if (savedRegion === 'jp') region = 'jp';
    else if (savedRegion) region = 'en'; /* us/gb picks fold into English */
  } catch (_) {}
  var cache = {};
  var started = false;

  function userPodcasts() { return window.LibraryUserPodcasts || null; }
  function isAdded(cid) {
    var api = userPodcasts();
    return !!(api && api.has(cid));
  }

  /* ---- shared show rows (chart + search) ---- */
  function paintAddButton(button, cid) {
    var added = isAdded(cid);
    button.textContent = added ? 'Added ✓' : 'Add';
    button.classList.toggle('is-added', added);
    button.setAttribute('aria-pressed', String(added));
  }
  function repaintAddButtons(cid) {
    section.querySelectorAll('[data-topchart-add-for="' + cid + '"]').forEach(function (button) {
      paintAddButton(button, cid);
    });
  }
  function makeShowRow(show, rank) {
    var row = document.createElement('div');
    row.className = 'podcast-topchart-row';
    row.setAttribute('role', 'listitem');
    if (rank) {
      var rankEl = document.createElement('span');
      rankEl.className = 'podcast-topchart-rank';
      rankEl.textContent = String(rank);
      row.appendChild(rankEl);
    }
    var art = document.createElement('img');
    art.className = 'podcast-topchart-art';
    art.src = show.artwork || '';
    art.alt = '';
    art.loading = 'lazy';
    row.appendChild(art);
    var text = document.createElement('span');
    text.className = 'podcast-topchart-text';
    var nameEl = document.createElement('span');
    nameEl.className = 'podcast-topchart-name';
    nameEl.textContent = show.name;
    var artistEl = document.createElement('span');
    artistEl.className = 'podcast-topchart-artist';
    artistEl.textContent = show.artist || '';
    text.appendChild(nameEl);
    text.appendChild(artistEl);
    row.appendChild(text);
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'podcast-topchart-add';
    button.setAttribute('data-topchart-add-for', show.cid);
    button.setAttribute('aria-label', 'Add ' + show.name + ' to my podcasts');
    paintAddButton(button, show.cid);
    button.addEventListener('click', function () {
      var api = userPodcasts();
      if (!api) return;
      if (api.has(show.cid)) api.remove(show.cid);
      else api.add({ cid: show.cid, name: show.name, artist: show.artist, artwork: show.artwork }, { stay: true });
      repaintAddButtons(show.cid);
      renderMine();
    });
    row.appendChild(button);
    return row;
  }

  /* ---- My Podcasts ---- */
  function renderMine() {
    var api = userPodcasts();
    var mine = api ? api.list() : [];
    mineEl.innerHTML = '';
    if (!mine.length) {
      var empty = document.createElement('p');
      empty.className = 'podcast-topchart-empty';
      empty.textContent = 'Nothing added yet — add a show from Search or the Top list below.';
      mineEl.appendChild(empty);
      return;
    }
    mine.forEach(function (show) {
      var row = document.createElement('div');
      row.className = 'podcast-topchart-row';
      var art = document.createElement('img');
      art.className = 'podcast-topchart-art';
      art.src = show.artwork || '';
      art.alt = '';
      art.loading = 'lazy';
      row.appendChild(art);
      var go = document.createElement('button');
      go.type = 'button';
      go.className = 'podcast-topchart-goto';
      go.setAttribute('aria-label', 'Open ' + show.name);
      var nameEl = document.createElement('span');
      nameEl.className = 'podcast-topchart-name';
      nameEl.textContent = show.name;
      var artistEl = document.createElement('span');
      artistEl.className = 'podcast-topchart-artist';
      artistEl.textContent = show.artist || '';
      go.appendChild(nameEl);
      go.appendChild(artistEl);
      go.addEventListener('click', function () {
        var feedTab = document.querySelector('[data-podcast-tab="u' + show.cid + '"]');
        if (feedTab) feedTab.click();
      });
      row.appendChild(go);
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'podcast-topchart-add is-remove';
      remove.setAttribute('data-topchart-remove-for', show.cid);
      remove.setAttribute('aria-label', 'Remove ' + show.name);
      remove.textContent = 'Remove';
      remove.addEventListener('click', function () {
        var apiNow = userPodcasts();
        if (apiNow) apiNow.remove(show.cid);
        repaintAddButtons(show.cid);
        renderMine();
      });
      row.appendChild(remove);
      mineEl.appendChild(row);
    });
  }

  /* ---- Top chart ---- */
  function normalizeChartEntry(entry) {
    var images = entry['im:image'] || [];
    var best = images.length ? images[images.length - 1] : null;
    return {
      cid: entry.id && entry.id.attributes ? entry.id.attributes['im:id'] : '',
      name: entry['im:name'] ? entry['im:name'].label : '',
      artist: entry['im:artist'] ? entry['im:artist'].label : '',
      artwork: best && best.label ? best.label : ''
    };
  }
  function fetchChart(cc) {
    return fetch('https://itunes.apple.com/' + cc + '/rss/toppodcasts/limit=50/json')
      .then(function (response) { if (!response.ok) throw new Error('chart failed'); return response.json(); })
      .then(function (data) {
        return ((data.feed && data.feed.entry) || []).map(normalizeChartEntry).filter(function (show) { return show.cid && show.name; });
      });
  }
  function mergeEnglish(us, gb) {
    var seen = {}, merged = [];
    var n = Math.max(us.length, gb.length);
    for (var i = 0; i < n && merged.length < 50; i += 1) {
      [us[i], gb[i]].forEach(function (show) {
        if (show && !seen[show.cid] && merged.length < 50) {
          seen[show.cid] = true;
          merged.push(show);
        }
      });
    }
    return merged;
  }
  function renderChart(shows) {
    listEl.innerHTML = '';
    shows.forEach(function (show, i) { listEl.appendChild(makeShowRow(show, i + 1)); });
    if (statusEl) {
      statusEl.textContent = shows.length
        ? 'Top ' + shows.length + ' · ' + (region === 'en' ? 'US + UK combined' : REGIONS[region]) + ' · tap Add to keep a show.'
        : 'The chart is empty right now.';
    }
  }
  function loadChart() {
    if (cache[region]) { renderChart(cache[region]); return; }
    if (statusEl) statusEl.textContent = 'Loading the chart…';
    var work = region === 'en'
      ? Promise.all([fetchChart('us').catch(function () { return null; }), fetchChart('gb').catch(function () { return null; })])
          .then(function (pair) {
            if (!pair[0] && !pair[1]) throw new Error('chart failed');
            return mergeEnglish(pair[0] || [], pair[1] || []);
          })
      : fetchChart('jp');
    work.then(function (shows) {
      cache[region] = shows;
      renderChart(shows);
    }).catch(function () {
      if (statusEl) statusEl.textContent = 'Could not load the chart. Check the connection and try again.';
    });
  }
  function paintRegions() {
    section.querySelectorAll('[data-topchart-region]').forEach(function (button) {
      var on = button.getAttribute('data-topchart-region') === region;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-selected', String(on));
    });
  }
  section.querySelectorAll('[data-topchart-region]').forEach(function (button) {
    button.addEventListener('click', function () {
      region = button.getAttribute('data-topchart-region');
      try { localStorage.setItem('personal-library-topchart-region', region); } catch (_) {}
      paintRegions();
      loadChart();
    });
  });

  /* Panel layout, three states:
       - browsing (chart in view): the list runs all the way down to
         the bottom of the viewport, so the 50 chart rows are easy
         to pick from;
       - searching: the Top Podcasts block steps aside entirely and
         the panel fits the results (last row visible, viewport cap);
       - chart folded by hand: the stylesheet default stands. */
  var searchActive = false;
  var chartFolded = false;
  var chartToggleEl = null;
  var chartBodyEl = null;
  function applyChartVisibility() {
    if (chartToggleEl) chartToggleEl.hidden = searchActive;
    if (chartBodyEl) chartBodyEl.hidden = searchActive || chartFolded;
  }
  function layoutFrame() {
    var frame = document.getElementById('podcast-topchart-list-frame');
    if (!frame || section.hidden) return;
    applyChartVisibility();
    var scroller = section.querySelector('.podcast-topchart-scroll');
    if (!scroller || !resultsEl) { frame.style.height = ''; return; }
    var maxH = window.innerHeight - frame.getBoundingClientRect().top - 12;
    if (searchActive) {
      var needed = (resultsEl.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top)
        + scroller.scrollTop + 6;
      var target = Math.min(needed, maxH);
      frame.style.height = '';
      var defaultH = frame.getBoundingClientRect().height;
      if (target > defaultH) frame.style.height = Math.round(target) + 'px';
      return;
    }
    if (chartFolded) { frame.style.height = ''; return; }
    if (maxH > 0) frame.style.height = Math.round(maxH) + 'px';
  }
  window.addEventListener('resize', layoutFrame);

  /* ---- Search ---- */
  var searchTimer = null;
  var searchSeq = 0;
  function renderSearch(shows, note, keepHeight) {
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    if (note) {
      var noteEl = document.createElement('p');
      noteEl.className = 'podcast-topchart-empty';
      noteEl.textContent = note;
      resultsEl.appendChild(noteEl);
    } else {
      shows.forEach(function (show) { resultsEl.appendChild(makeShowRow(show, 0)); });
    }
    if (!keepHeight) layoutFrame();
  }
  function fetchSearch(term, country) {
    return fetch('https://itunes.apple.com/search?term=' + encodeURIComponent(term) + '&media=podcast&entity=podcast&limit=25&country=' + country)
      .then(function (response) { if (!response.ok) throw new Error('search failed'); return response.json(); })
      .then(function (data) {
        return (data.results || []).filter(function (row) { return row.collectionId && row.collectionName; }).map(function (row) {
          return {
            cid: String(row.collectionId),
            name: row.collectionName,
            artist: row.artistName || '',
            artwork: row.artworkUrl100 || ''
          };
        });
      });
  }
  function runSearch() {
    var term = (searchInput.value || '').trim();
    var seq = ++searchSeq;
    if (term.length < 2) {
      searchActive = false;
      renderSearch([], term ? 'Type at least 2 characters.' : '');
      return;
    }
    searchActive = true;
    applyChartVisibility();
    renderSearch([], 'Searching…', true);
    Promise.all([fetchSearch(term, 'JP').catch(function () { return []; }), fetchSearch(term, 'US').catch(function () { return []; })])
      .then(function (pair) {
        if (seq !== searchSeq) return;
        var seen = {}, merged = [];
        pair[0].concat(pair[1]).forEach(function (show) {
          if (!seen[show.cid] && merged.length < 30) { seen[show.cid] = true; merged.push(show); }
        });
        renderSearch(merged, merged.length ? '' : 'No podcasts found for “' + term + '”.');
      })
      .catch(function () {
        if (seq === searchSeq) renderSearch([], 'Search failed. Check the connection and try again.');
      });
  }
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(runSearch, 450);
    });
    searchInput.addEventListener('search', runSearch);
  }

  /* The "Top Podcasts" title folds just its own block (region tabs,
     status and the chart list), leaving My Podcasts and Search up. */
  chartToggleEl = section.querySelector('[data-topchart-chart-toggle]');
  chartBodyEl = section.querySelector('[data-topchart-chart-body]');
  if (chartToggleEl && chartBodyEl) {
    var toggleChart = function () {
      chartFolded = !chartFolded;
      chartToggleEl.setAttribute('aria-expanded', String(!chartFolded));
      chartToggleEl.classList.toggle('is-collapsed', chartFolded);
      layoutFrame();
    };
    chartToggleEl.addEventListener('click', toggleChart);
    chartToggleEl.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleChart();
      }
    });
  }

  /* The heading strip folds the whole manager like every other card's. */
  var heading = section.querySelector('.podcast-episode-panel__heading');
  if (heading) {
    heading.addEventListener('click', function (event) {
      if (event.target.closest('button, select, a, input, textarea, label')) return;
      var frame = document.getElementById('podcast-topchart-list-frame');
      if (window.LibraryAudioSetFold && frame) window.LibraryAudioSetFold(frame.hidden);
    });
  }

  tab.addEventListener('click', function () {
    renderMine();
    if (!started) {
      started = true;
      paintRegions();
      loadChart();
    }
    layoutFrame();
  });
  paintRegions();
  renderMine();
})(window, document);
