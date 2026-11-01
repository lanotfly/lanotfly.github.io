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
  var pasteInput = section.querySelector('[data-topchart-paste]');
  var pasteBtn = section.querySelector('[data-topchart-paste-add]');
  var pasteStatus = section.querySelector('[data-topchart-paste-status]');
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

  /* Built-in shows are already in the library, so search and chart
     rows for them must not offer an Add button — a show the reader
     already has (above all a pinned built-in) simply gets no button.
     Apple ids of the shows behind the built-in feeds: BBC Global
     News Podcast, Chronicle's News Connect, Luke's English Podcast,
     Bite Size Japanese. Name aliases cover storefront naming
     differences and are matched whole-word from the start. */
  var BUILTIN_SHOWS = [
    { feed: 'bbc', cid: '135067274', names: ['bbc global news podcast', 'global news podcast'] },
    { feed: 'chronicle', cid: '1608666340', names: ['news connect', 'chronicle news connect'] },
    { feed: 'english', cid: '312059190', names: ['luke s english podcast'] },
    { feed: 'japanese', cid: '1588405417', names: ['bite size japanese', 'the bite size japanese podcast'] }
  ];
  var BUILTIN_CIDS = {};
  BUILTIN_SHOWS.forEach(function (s) { BUILTIN_CIDS[s.cid] = true; });
  function normShowName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function nameMatchesBuiltin(name, builtin) {
    var n = normShowName(name);
    return builtin.names.some(function (alias) {
      return n === alias || n.indexOf(alias + ' ') === 0;
    });
  }
  function isBuiltinShow(show) {
    if (!show) return false;
    if (BUILTIN_CIDS[String(show.cid)]) return true;
    return BUILTIN_SHOWS.some(function (builtin) { return nameMatchesBuiltin(show.name, builtin); });
  }
  /* The feed a search/chart row stands for: a built-in's own feed,
     or 'u'+cid for a reader-added show; null when not in the library. */
  function feedIdForShow(show) {
    if (!show) return null;
    for (var i = 0; i < BUILTIN_SHOWS.length; i += 1) {
      if (BUILTIN_SHOWS[i].cid === String(show.cid) || nameMatchesBuiltin(show.name, BUILTIN_SHOWS[i])) return BUILTIN_SHOWS[i].feed;
    }
    return isAdded(show.cid) ? 'u' + show.cid : null;
  }

  /* ---- shared show rows (chart + search) ---- */
  function paintAddButton(button, cid) {
    /* In the library (built-in or added): no button at all. The way
       out for an added show is the ✕ on its My Podcasts tile, which
       repaints here and brings the Add button back. */
    var inLibrary = isAdded(cid) || !!BUILTIN_CIDS[String(cid)] || button.getAttribute('data-topchart-builtin') === '1';
    button.hidden = inLibrary;
    button.textContent = 'Add';
    button.classList.toggle('is-added', inLibrary);
    button.setAttribute('aria-pressed', 'false');
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
    if (isBuiltinShow(show)) {
      button.setAttribute('data-topchart-builtin', '1');
      BUILTIN_CIDS[String(show.cid)] = true; /* learn the id for cid-only repaints */
    }
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
    /* A show already in the library has no Add button; tapping its
       row jumps straight to its feed instead (the listener asked for
       exactly that on the pinned Luke's row). */
    var jumpFeed = feedIdForShow(show);
    if (jumpFeed) {
      row.classList.add('is-openable');
      row.addEventListener('click', function (event) {
        if (event.target && event.target.closest && event.target.closest('button')) return;
        var tab = document.querySelector('[data-podcast-tab="' + jumpFeed + '"]');
        if (tab) tab.click();
      });
    }
    return row;
  }

  /* ---- My Podcasts: an artwork wall ---- */
  function renderMine() {
    var api = userPodcasts();
    var mine = api ? api.list() : [];
    mineEl.innerHTML = '';
    mineEl.classList.toggle('podcast-topchart-mine--grid', mine.length > 0);
    if (!mine.length) {
      var empty = document.createElement('p');
      empty.className = 'podcast-topchart-empty';
      empty.textContent = 'Nothing added yet — search above, paste a link, or pick from Top Podcasts below.';
      mineEl.appendChild(empty);
      return;
    }
    mine.forEach(function (show) {
      var tile = document.createElement('div');
      tile.className = 'podcast-topchart-tile';
      tile.setAttribute('data-mine-cid', show.cid);
      var go = document.createElement('button');
      go.type = 'button';
      go.className = 'podcast-topchart-goto podcast-topchart-tile__open';
      go.setAttribute('aria-label', 'Open ' + show.name);
      var art = document.createElement('img');
      art.className = 'podcast-topchart-tile__art';
      art.src = show.artwork || '';
      art.alt = '';
      art.loading = 'lazy';
      go.appendChild(art);
      var nameEl = document.createElement('span');
      nameEl.className = 'podcast-topchart-tile__name';
      nameEl.textContent = show.name;
      go.appendChild(nameEl);
      go.addEventListener('click', function () {
        var feedTab = document.querySelector('[data-podcast-tab="u' + show.cid + '"]');
        if (feedTab) feedTab.click();
      });
      tile.appendChild(go);
      var fav = document.createElement('button');
      fav.type = 'button';
      fav.className = 'podcast-topchart-tile__badge podcast-topchart-tile__fav' + (show.fav ? ' is-fav' : '');
      fav.setAttribute('data-topchart-fav-for', show.cid);
      fav.setAttribute('aria-label', (show.fav ? 'Unpin ' : 'Pin ') + show.name + (show.fav ? ' from Pinned' : ' to Pinned'));
      fav.setAttribute('aria-pressed', String(!!show.fav));
      fav.textContent = show.fav ? '★' : '☆';
      fav.addEventListener('click', function () {
        var apiNow = userPodcasts();
        if (apiNow && apiNow.setFavorite) apiNow.setFavorite(show.cid, !show.fav);
        renderMine();
      });
      tile.appendChild(fav);
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'podcast-topchart-tile__badge podcast-topchart-tile__del';
      remove.setAttribute('data-topchart-remove-for', show.cid);
      remove.setAttribute('aria-label', 'Remove ' + show.name);
      remove.textContent = '✕';
      remove.addEventListener('click', function () {
        var apiNow = userPodcasts();
        if (apiNow) apiNow.remove(show.cid);
        repaintAddButtons(show.cid);
        renderMine();
      });
      tile.appendChild(remove);
      mineEl.appendChild(tile);
    });
  }

  /* ---- Add by pasted link: an Apple Podcasts URL resolves through
     the lookup API; any other http(s) address is tried as an RSS
     feed (its channel title/artwork name the show here, panel.js
     parses the episodes). */
  function setPasteStatus(text) { if (pasteStatus) pasteStatus.textContent = text; }
  function decodeText(html) {
    var area = document.createElement('textarea');
    area.innerHTML = html || '';
    return area.value.trim();
  }
  function rssCidFor(url) {
    var hash = 0;
    for (var i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) | 0;
    return 'rss' + Math.abs(hash);
  }
  function finishLinkAdd(cid) {
    repaintAddButtons(cid);
    renderMine();
    if (pasteInput) pasteInput.value = '';
  }
  function addFromLink() {
    var api = userPodcasts();
    if (!api || !pasteInput) return;
    var raw = (pasteInput.value || '').trim();
    if (!raw) { setPasteStatus('Paste a link first.'); return; }
    var appleMatch = raw.match(/id(\d{5,})/) || raw.match(/[?&]i=(\d{5,})/);
    if (appleMatch || /podcasts\.apple\.com/i.test(raw)) {
      if (!appleMatch) { setPasteStatus('That Apple link has no show id in it.'); return; }
      var cid = appleMatch[1];
      if (api.has(cid)) { setPasteStatus('Already in My Podcasts.'); return; }
      setPasteStatus('Adding…');
      fetch('https://itunes.apple.com/lookup?id=' + encodeURIComponent(cid) + '&media=podcast&entity=podcast')
        .then(function (response) { if (!response.ok) throw new Error('lookup failed'); return response.json(); })
        .then(function (data) {
          var row = (data.results || [])[0];
          if (!row || !row.collectionName) throw new Error('not found');
          api.add({ cid: String(row.collectionId || cid), name: row.collectionName, artist: row.artistName || '', artwork: row.artworkUrl600 || row.artworkUrl100 || '' }, { stay: true });
          setPasteStatus('Added ' + row.collectionName + '.');
          finishLinkAdd(String(row.collectionId || cid));
        })
        .catch(function () { setPasteStatus('Could not add that show.'); });
      return;
    }
    if (/^https?:\/\//i.test(raw)) {
      var rssCid = rssCidFor(raw);
      if (api.has(rssCid)) { setPasteStatus('Already in My Podcasts.'); return; }
      setPasteStatus('Adding…');
      fetch(raw)
        .then(function (response) { if (!response.ok) throw new Error('feed failed'); return response.text(); })
        .then(function (text) {
          var channel = text.split(/<item[\s>]/)[0];
          var titleMatch = channel.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
          var title = titleMatch ? decodeText(titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '')) : '';
          if (!title) throw new Error('no title');
          var artMatch = channel.match(/<itunes:image[^>]*href="([^"]+)"/) || channel.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/);
          api.add({ cid: rssCid, name: title, artist: '', artwork: artMatch ? decodeText(artMatch[1]) : '', rss: raw }, { stay: true });
          setPasteStatus('Added ' + title + '.');
          finishLinkAdd(rssCid);
        })
        .catch(function () { setPasteStatus('That feed could not be loaded — the publisher may block direct access.'); });
      return;
    }
    setPasteStatus('Paste an Apple Podcasts link or an RSS feed address.');
  }
  if (pasteBtn) pasteBtn.addEventListener('click', addFromLink);
  if (pasteInput) {
    pasteInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); addFromLink(); }
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
  var chartFolded = true;
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
