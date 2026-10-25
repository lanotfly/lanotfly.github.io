/* News: two nested podcast tabs sharing the site's native episode-list UI. */
(function (window, document) {
  'use strict';
  if (window.__libraryNewsPanelInstalled) return;
  window.__libraryNewsPanelInstalled = true;

  var feeds = [
    { id: 'bbc', title: 'BBC Global News Podcast', language: 'en' },
    { id: 'chronicle', title: 'Chronicle · News Connect', language: 'ja' }
  ];
  var root = document.getElementById('library-news-panel');
  var mainToggle = document.getElementById('library-news-toggle');
  if (!root || !mainToggle) return;

  var episodesByFeed = { bbc: [], chronicle: [] };
  var activeFeed = 'bbc';
  var current = { feed: null, index: -1 };
  var loaded = false;
  var pendingAutoplay = false;
  var filters = { bbc: 'unplayed', chronicle: 'unplayed' };

  function getFeed(id) { return feeds.find(function (feed) { return feed.id === id; }) || feeds[0]; }
  function audioFor(feedId) { return document.getElementById('news-' + feedId + '-audio'); }
  function storageKey(feed, episode) {
    return 'personal-library-news-played:' + feed.id + ':' + String(episode.link || episode.title).toLowerCase();
  }
  function isPlayed(feed, episode) {
    try { return localStorage.getItem(storageKey(feed, episode)) === '1'; } catch (_) { return false; }
  }
  function setPlayed(feed, episode, value) {
    try {
      if (value) localStorage.setItem(storageKey(feed, episode), '1');
      else localStorage.removeItem(storageKey(feed, episode));
    } catch (_) {}
  }
  function dateLabel(value, language) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'en-GB', {
      year: 'numeric', month: 'short', day: 'numeric'
    }).format(date);
  }
  function parseDuration(value) {
    if (value === undefined || value === null || value === '') return 0;
    var raw = String(value).trim(), seconds = 0;
    if (/^\d+(?:\.\d+)?$/.test(raw)) seconds = Number(raw);
    else if (/^\d+(?::\d{1,2}){1,2}$/.test(raw)) {
      var parts = raw.split(':').map(Number);
      seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
    } else {
      var iso = raw.match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
      if (iso) seconds = Number(iso[1] || 0) * 3600 + Number(iso[2] || 0) * 60 + Number(iso[3] || 0);
    }
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  }
  function formatDuration(value) {
    var seconds = typeof value === 'number' ? value : parseDuration(value);
    if (!seconds) return '';
    var minutes = Math.max(1, Math.round(seconds / 60));
    var hours = Math.floor(minutes / 60), remainder = minutes % 60;
    return hours ? hours + 'h ' + remainder + 'm' : minutes + 'm';
  }
  function counts(feed) {
    var all = episodesByFeed[feed.id] || [];
    var played = all.filter(function (episode) { return isPlayed(feed, episode); }).length;
    return { all: all.length, played: played, unplayed: all.length - played };
  }
  function syncFilterOptions(feed) {
    var select = root.querySelector('[data-news-filter="' + feed.id + '"]');
    if (!select) return;
    var tally = counts(feed);
    Array.prototype.forEach.call(select.options, function (option) {
      var label = option.value === 'all' ? 'All episodes' : option.value === 'played' ? 'Played' : 'Unplayed';
      option.textContent = label + ' (' + tally[option.value] + ')';
    });
    select.value = filters[feed.id];
  }
  function stopAllNews(clearSelection) {
    feeds.forEach(function (feed) {
      var audio = audioFor(feed.id);
      if (audio && !audio.paused) audio.pause();
    });
    if (clearSelection) current = { feed: null, index: -1 };
    renderAll();
  }
  function stopOtherAudio() {
    var coordinator = window.LibraryAudioCoordinator;
    if (coordinator && typeof coordinator.switchTo === 'function') {
      coordinator.switchTo('news');
      return;
    }
    ['podcast-audio', 'radio4-audio', 'nhk-radio-audio', 'niv-bible-audio'].forEach(function (id) {
      var audio = document.getElementById(id);
      if (audio && !audio.paused) audio.pause();
    });
  }
  function setActiveFeed(feedId) {
    activeFeed = feedId;
    Array.prototype.forEach.call(root.querySelectorAll('[data-news-tab]'), function (button) {
      var selected = button.getAttribute('data-news-tab') === feedId;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-news-feed-panel]'), function (panel) {
      panel.hidden = panel.getAttribute('data-news-feed-panel') !== feedId;
    });
  }
  function setNewsOpen(open) {
    mainToggle.setAttribute('aria-expanded', String(open));
    mainToggle.classList.toggle('is-open', open);
    mainToggle.classList.toggle('is-active', open);
    root.hidden = !open;
    var inner = document.querySelector('.content-wrapper__inner');
    if (inner) inner.classList.toggle('news-panel-open', open);
    if (open) {
      document.querySelectorAll('.site-tab-links a.site-tab').forEach(function (link) {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
      });
      setActiveFeed(activeFeed || 'bbc');
      pendingAutoplay = true;
      if (loaded) playDefaultEpisode(activeFeed);
    } else {
      stopAllNews(true);
      mainToggle.classList.remove('is-active');
      if (typeof window.LibraryUpdatePrimaryActive === 'function') {
        window.LibraryUpdatePrimaryActive(window.location.pathname);
      }
    }
  }
  function playEpisode(feed, index) {
    var episode = (episodesByFeed[feed.id] || [])[index];
    var audio = audioFor(feed.id);
    if (!episode || !audio || !episode.audioUrl) {
      var missingStatus = root.querySelector('[data-news-status="' + feed.id + '"]');
      if (missingStatus) missingStatus.textContent = 'This episode does not provide a direct audio URL.';
      if (episode && episode.link) window.open(episode.link, '_blank', 'noopener');
      return;
    }
    stopOtherAudio();
    feeds.filter(function (other) { return other.id !== feed.id; }).forEach(function (other) {
      var otherAudio = audioFor(other.id);
      if (otherAudio && !otherAudio.paused) otherAudio.pause();
    });
    current = { feed: feed.id, index: index };
    audio.src = episode.audioUrl;
    audio.dataset.episodeTitle = episode.title || feed.title;
    audio.dataset.episodeArtist = feed.title;
    audio.dataset.episodeArtwork = (root.querySelector('[data-news-artwork="' + feed.id + '"]') || {}).src || '';
    audio.load();
    renderAll();
    var promise = audio.play();
    if (promise && promise.catch) promise.catch(function () {
      var status = root.querySelector('[data-news-status="' + feed.id + '"]');
      if (status) status.textContent = 'Autoplay was blocked by your browser. Tap the episode to start playback.';
      renderAll();
    });
  }
  function playDefaultEpisode(feedId) {
    var feed = getFeed(feedId);
    var all = episodesByFeed[feed.id] || [];
    if (all.length) playEpisode(feed, 0);
  }
  function render(feed) {
    var list = root.querySelector('[data-news-list="' + feed.id + '"]');
    var count = root.querySelector('[data-news-count="' + feed.id + '"]');
    var filter = root.querySelector('[data-news-filter="' + feed.id + '"]');
    if (!list || !filter) return;
    syncFilterOptions(feed);
    list.textContent = '';
    var all = episodesByFeed[feed.id] || [];
    var mode = filters[feed.id] || 'unplayed';
    var visible = all.map(function (episode, index) {
      return { episode: episode, index: index };
    }).filter(function (entry) {
      var played = isPlayed(feed, entry.episode);
      return mode === 'all' || (mode === 'played' ? played : !played);
    });
    if (count) count.textContent = feed.language === 'ja'
      ? '全 ' + all.length + ' 件 · 表示 ' + visible.length + ' 件'
      : all.length + ' episodes · Showing ' + visible.length;
    if (!visible.length) {
      var empty = document.createElement('p');
      empty.className = 'podcast-episode-panel__status';
      empty.textContent = feed.language === 'ja' ? '表示できるエピソードはありません。' : 'No episodes in this filter.';
      list.appendChild(empty);
      return;
    }
    visible.forEach(function (entry) {
      var episode = entry.episode, index = entry.index;
      var isCurrent = current.feed === feed.id && current.index === index;
      var audio = audioFor(feed.id);
      var isPlaying = isCurrent && audio && !audio.paused && !audio.ended;
      var row = document.createElement('div');
      row.className = 'podcast-episode-row';
      row.setAttribute('role', 'listitem');
      row.dataset.episodeIndex = String(index);
      if (isCurrent) row.classList.add('is-current');
      if (isPlaying) row.classList.add('is-playing');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'podcast-episode-choice' + (isCurrent ? ' is-current' : '');
      button.setAttribute('aria-pressed', String(!!isPlaying));
      button.setAttribute('aria-current', String(!!isCurrent));
      button.setAttribute('aria-label', (isPlaying ? 'Pause ' : 'Play ') + episode.title);
      var number = document.createElement('span');
      number.className = 'podcast-episode-number';
      number.textContent = isCurrent ? (isPlaying ? 'Ⅱ' : '▶') : String(index + 1);
      var textWrap = document.createElement('span');
      textWrap.className = 'podcast-episode-text';
      textWrap.style.cssText = 'display:flex;flex:1;min-width:0;flex-direction:column;gap:4px;';
      var title = document.createElement('span');
      title.className = 'podcast-episode-name';
      title.textContent = episode.title || ('Episode ' + (index + 1));
      var meta = document.createElement('span');
      meta.className = 'podcast-episode-meta';
      var date = document.createElement('span');
      date.className = 'podcast-episode-date';
      date.textContent = dateLabel(episode.date || episode.published || episode.pubDate, feed.language);
      if (date.textContent) meta.appendChild(date);
      var state = document.createElement('span');
      state.className = 'podcast-episode-state';
      var played = isPlayed(feed, episode);
      state.textContent = played ? '✓ Played' : '○ Unplayed';
      meta.appendChild(state);
      textWrap.appendChild(title);
      textWrap.appendChild(meta);
      var duration = document.createElement('span');
      duration.className = 'podcast-episode-duration';
      duration.textContent = formatDuration(episode.duration);
      if (duration.textContent) button.appendChild(number), button.appendChild(textWrap), button.appendChild(duration);
      else { button.appendChild(number); button.appendChild(textWrap); }
      button.addEventListener('click', function () {
        var targetAudio = audioFor(feed.id);
        if (current.feed === feed.id && current.index === index && !targetAudio.paused) {
          targetAudio.pause();
          renderAll();
          return;
        }
        playEpisode(feed, index);
      });
      row.appendChild(button);
      list.appendChild(row);
    });
  }
  function renderAll() { feeds.forEach(render); }

  mainToggle.addEventListener('click', function () {
    setNewsOpen(mainToggle.getAttribute('aria-expanded') !== 'true');
  });
  root.querySelectorAll('[data-news-tab]').forEach(function (button) {
    button.addEventListener('click', function () {
      var nextFeed = button.getAttribute('data-news-tab');
      if (nextFeed === activeFeed) {
        playDefaultEpisode(nextFeed);
        return;
      }
      stopAllNews(true);
      setActiveFeed(nextFeed);
      if (loaded) playDefaultEpisode(nextFeed);
      else pendingAutoplay = true;
    });
  });
  root.querySelectorAll('[data-news-filter]').forEach(function (select) {
    select.addEventListener('change', function () {
      filters[select.getAttribute('data-news-filter')] = select.value;
      render(getFeed(select.getAttribute('data-news-filter')));
    });
  });
  document.addEventListener('click', function (event) {
    var tab = event.target.closest && event.target.closest('.site-tab');
    if (!tab || tab === mainToggle || root.hidden) return;
    setNewsOpen(false);
  });
  /* If any non-News player starts, stop News and remove its selected row. */
  document.addEventListener('play', function (event) {
    var audio = event.target;
    if (!audio || audio.tagName !== 'AUDIO' || !audio.id || audio.id.indexOf('news-') === 0) return;
    stopAllNews(true);
  }, true);

  feeds.forEach(function (feed) {
    var audio = audioFor(feed.id);
    if (!audio) return;
    audio.addEventListener('play', renderAll);
    audio.addEventListener('pause', renderAll);
    audio.addEventListener('ended', function () {
      var episode = (episodesByFeed[feed.id] || [])[current.index];
      if (current.feed === feed.id && episode) setPlayed(feed, episode, true);
      renderAll();
    });
    audio.addEventListener('loadedmetadata', function () {
      var episode = (episodesByFeed[feed.id] || [])[current.index];
      if (current.feed === feed.id && episode && !episode.duration && Number.isFinite(audio.duration)) {
        episode.duration = Math.floor(audio.duration);
        renderAll();
      }
    });
  });

  fetch('/assets/data/news.json?v=20261025-20', { cache: 'no-store' }).then(function (response) {
    if (!response.ok) throw new Error('Unable to load News cache');
    return response.json();
  }).then(function (data) {
    feeds.forEach(function (feed) {
      episodesByFeed[feed.id] = Array.isArray(data[feed.id]) ? data[feed.id] : [];
      var artwork = data.artwork && data.artwork[feed.id];
      var image = root.querySelector('[data-news-artwork="' + feed.id + '"]');
      if (image && artwork) image.src = artwork;
      var status = root.querySelector('[data-news-status="' + feed.id + '"]');
      if (status) {
        var state = data.feedStatus && data.feedStatus[feed.id];
        status.textContent = episodesByFeed[feed.id].length ? '' :
          (state && state.error ? state.error : 'Could not load episodes.');
      }
    });
    loaded = true;
    renderAll();
    if (pendingAutoplay && !root.hidden) {
      pendingAutoplay = false;
      playDefaultEpisode(activeFeed);
    }
  }).catch(function () {
    feeds.forEach(function (feed) {
      var status = root.querySelector('[data-news-status="' + feed.id + '"]');
      if (status) status.textContent = 'Could not load episodes. Please try again later.';
    });
  });
})(window, document);
