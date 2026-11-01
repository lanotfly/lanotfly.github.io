/* Apple Podcasts Top chart: browse a region's top shows inside the
   Podcast panel and tap Add to turn one into a regular Podcast source
   (panel.js's LibraryUserPodcasts does the installing; this module is
   only the chart UI). Chart data is Apple's legacy RSS JSON, which
   sends CORS headers; episodes come from the lookup API via panel.js. */
(function (window, document) {
  'use strict';
  if (window.__libraryTopChartInstalled) return;
  window.__libraryTopChartInstalled = true;

  var section = document.querySelector('[data-podcast-feed-panel="topchart"]');
  var tab = document.querySelector('[data-podcast-tab="topchart"]');
  if (!section || !tab) return;
  var listEl = section.querySelector('[data-topchart-list]');
  var statusEl = section.querySelector('[data-topchart-status]');
  if (!listEl) return;

  var REGIONS = { jp: 'Japan', us: 'US', gb: 'UK' };
  var region = 'jp';
  try {
    var savedRegion = localStorage.getItem('personal-library-topchart-region');
    if (savedRegion && REGIONS[savedRegion]) region = savedRegion;
  } catch (_) {}
  var cache = {};
  var started = false;

  function paintRegions() {
    section.querySelectorAll('[data-topchart-region]').forEach(function (button) {
      var on = button.getAttribute('data-topchart-region') === region;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-selected', String(on));
    });
  }

  function entryArtwork(entry) {
    var images = entry['im:image'] || [];
    var best = images.length ? images[images.length - 1] : null;
    return best && best.label ? best.label : '';
  }

  function paintAddButton(button, cid) {
    var added = !!(window.LibraryUserPodcasts && window.LibraryUserPodcasts.has(cid));
    button.textContent = added ? 'Added ✓' : 'Add';
    button.classList.toggle('is-added', added);
    button.setAttribute('aria-pressed', String(added));
  }

  function render(entries) {
    listEl.innerHTML = '';
    entries.forEach(function (entry, i) {
      var cid = entry.id && entry.id.attributes ? entry.id.attributes['im:id'] : '';
      var name = entry['im:name'] ? entry['im:name'].label : '';
      var artist = entry['im:artist'] ? entry['im:artist'].label : '';
      if (!cid || !name) return;
      var row = document.createElement('div');
      row.className = 'podcast-topchart-row';
      row.setAttribute('role', 'listitem');

      var rank = document.createElement('span');
      rank.className = 'podcast-topchart-rank';
      rank.textContent = String(i + 1);

      var art = document.createElement('img');
      art.className = 'podcast-topchart-art';
      art.src = entryArtwork(entry);
      art.alt = '';
      art.loading = 'lazy';

      var text = document.createElement('span');
      text.className = 'podcast-topchart-text';
      var nameEl = document.createElement('span');
      nameEl.className = 'podcast-topchart-name';
      nameEl.textContent = name;
      var artistEl = document.createElement('span');
      artistEl.className = 'podcast-topchart-artist';
      artistEl.textContent = artist;
      text.appendChild(nameEl);
      text.appendChild(artistEl);

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'podcast-topchart-add';
      button.setAttribute('aria-label', 'Add ' + name + ' to my podcasts');
      paintAddButton(button, cid);
      button.addEventListener('click', function () {
        if (!window.LibraryUserPodcasts) return;
        if (window.LibraryUserPodcasts.has(cid)) window.LibraryUserPodcasts.remove(cid);
        else window.LibraryUserPodcasts.add({ cid: cid, name: name, artist: artist, artwork: entryArtwork(entry) });
        paintAddButton(button, cid);
      });

      row.appendChild(rank);
      row.appendChild(art);
      row.appendChild(text);
      row.appendChild(button);
      listEl.appendChild(row);
    });
    if (statusEl) {
      statusEl.textContent = entries.length
        ? 'Top ' + entries.length + ' in ' + REGIONS[region] + ' · tap Add and the show joins your Podcast tabs.'
        : 'The chart is empty right now.';
    }
  }

  function load() {
    if (cache[region]) { render(cache[region]); return; }
    if (statusEl) statusEl.textContent = 'Loading the chart…';
    fetch('https://itunes.apple.com/' + region + '/rss/toppodcasts/limit=50/json')
      .then(function (response) { if (!response.ok) throw new Error('chart failed'); return response.json(); })
      .then(function (data) {
        var entries = (data.feed && data.feed.entry) || [];
        cache[region] = entries;
        render(entries);
      })
      .catch(function () {
        if (statusEl) statusEl.textContent = 'Could not load the chart. Check the connection and try again.';
      });
  }

  section.querySelectorAll('[data-topchart-region]').forEach(function (button) {
    button.addEventListener('click', function () {
      region = button.getAttribute('data-topchart-region');
      try { localStorage.setItem('personal-library-topchart-region', region); } catch (_) {}
      paintRegions();
      load();
    });
  });

  /* The heading strip folds the chart list like every other card's. */
  var heading = section.querySelector('.podcast-episode-panel__heading');
  if (heading) {
    heading.addEventListener('click', function (event) {
      if (event.target.closest('button, select, a, input, textarea, label')) return;
      var frame = document.getElementById('podcast-topchart-list-frame');
      if (window.LibraryAudioSetFold && frame) window.LibraryAudioSetFold(frame.hidden);
    });
  }

  tab.addEventListener('click', function () {
    if (started) return;
    started = true;
    paintRegions();
    load();
  });
  paintRegions();
})(window, document);
