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
  var lastSavedAt = { bbc: 0, chronicle: 0 };
  var listModules = {};

  function getFeed(id) { return feeds.find(function (feed) { return feed.id === id; }) || feeds[0]; }
  function audioFor(feedId) { return document.getElementById('news-' + feedId + '-audio'); }
  function episodeIdentity(episode) { return String(episode.link || episode.title || episode.audioUrl || '').toLowerCase(); }
  function storageKey(feed, episode) {
    return 'personal-library-news-played:' + feed.id + ':' + episodeIdentity(episode);
  }
  function positionKey(feed, episode) { return 'personal-library-news-position:' + feed.id + ':' + episodeIdentity(episode); }
  function selectedEpisodeKey(feed) { return 'personal-library-news-last-episode:' + feed.id; }
  function savePosition(feed, force) {
    var audio = audioFor(feed.id);
    var episode = current.feed === feed.id ? (episodesByFeed[feed.id] || [])[current.index] : null;
    if (!audio || !episode || !Number.isFinite(audio.currentTime) || audio.currentTime < 0) return;
    var now = Date.now();
    if (!force && now - lastSavedAt[feed.id] < 4000) return;
    lastSavedAt[feed.id] = now;
    try {
      if (audio.ended || audio.currentTime < 2) localStorage.removeItem(positionKey(feed, episode));
      else localStorage.setItem(positionKey(feed, episode), String(audio.currentTime));
      localStorage.setItem(selectedEpisodeKey(feed), episodeIdentity(episode));
    } catch (_) {}
  }
  function formatClock(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    seconds = Math.floor(seconds);
    var h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    return h ? h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') : m + ':' + String(s).padStart(2, '0');
  }
  function updateProgress(feed) {
    var audio = audioFor(feed.id), wrap = root.querySelector('[data-news-progress="' + feed.id + '"]');
    var slider = root.querySelector('[data-news-progress-slider="' + feed.id + '"]');
    var currentLabel = root.querySelector('[data-news-current-time="' + feed.id + '"]');
    var totalLabel = root.querySelector('[data-news-total-time="' + feed.id + '"]');
    var episode = current.feed === feed.id ? (episodesByFeed[feed.id] || [])[current.index] : null;
    if (!wrap || !audio || !episode) { if (wrap) wrap.hidden = true; return; }
    wrap.hidden = false;
    var duration = Number.isFinite(audio.duration) ? audio.duration : parseDuration(episode.duration);
    if (slider && document.activeElement !== slider) slider.value = duration > 0 ? String(Math.round(Math.min(1, audio.currentTime / duration) * 1000)) : '0';
    if (currentLabel) currentLabel.textContent = formatClock(audio.currentTime || 0);
    if (totalLabel) totalLabel.textContent = duration > 0 ? formatClock(duration) : '--:--';
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
    if (current.feed === feed.id && current.index === index && audio.src === episode.audioUrl) {
      if (!audio.paused && !audio.ended) {
        audio.pause();
        renderAll();
        return;
      }
      stopOtherAudio();
      var resume = audio.play();
      renderAll();
      if (resume && resume.catch) resume.catch(function () {
        var resumeStatus = root.querySelector('[data-news-status="' + feed.id + '"]');
        if (resumeStatus) resumeStatus.textContent = 'Playback was blocked. Tap the episode again to resume.';
        renderAll();
      });
      return;
    }
    stopOtherAudio();
    feeds.filter(function (other) { return other.id !== feed.id; }).forEach(function (other) {
      var otherAudio = audioFor(other.id);
      if (otherAudio && !otherAudio.paused) otherAudio.pause();
    });
    current = { feed: feed.id, index: index };
    try { localStorage.setItem(selectedEpisodeKey(feed), episodeIdentity(episode)); } catch (_) {}
    audio.src = episode.audioUrl;
    audio.dataset.restoreSrc = '';
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
    if (!all.length) return;
    var identity = '';
    try { identity = localStorage.getItem(selectedEpisodeKey(feed)) || ''; } catch (_) {}
    var remembered = identity ? all.findIndex(function (episode) { return episodeIdentity(episode) === identity; }) : -1;
    playEpisode(feed, remembered >= 0 ? remembered : 0);
  }
  function render(feed) {
    syncFilterOptions(feed);
    if (listModules[feed.id]) listModules[feed.id].render();
    else {
      var list = root.querySelector('[data-news-list="' + feed.id + '"]');
      if (list) list.textContent = '';
    }
  }
  function createListModules() {
    if (!window.LibraryPodcastList || !window.LibraryPodcastList.create) return;
    feeds.forEach(function (feed) {
      var list = root.querySelector('[data-news-list="' + feed.id + '"]');
      var count = root.querySelector('[data-news-count="' + feed.id + '"]');
      var status = root.querySelector('[data-news-status="' + feed.id + '"]');
      var filter = root.querySelector('[data-news-filter="' + feed.id + '"]');
      if (!list || !filter) return;
      listModules[feed.id] = window.LibraryPodcastList.create({
        listElement: list,
        countElement: count,
        statusElement: status,
        filterElement: filter,
        getQueue: function () { return episodesByFeed[feed.id] || []; },
        getIndex: function () { return current.feed === feed.id ? current.index : -1; },
        getListMode: function () { return filters[feed.id] || 'unplayed'; },
        setListMode: function (mode) { filters[feed.id] = mode; syncFilterOptions(feed); },
        getPanelMode: function () { return 'full'; },
        getActiveId: function () { return feed.id; },
        isPlayed: function (episode) { return isPlayed(feed, episode); },
        setPlayed: function (episode, played) { setPlayed(feed, episode, played); },
        onChange: function () { syncFilterOptions(feed); },
        isPlaying: function () {
          var audio = audioFor(feed.id);
          return current.feed === feed.id && !!audio && !audio.paused && !audio.ended;
        },
        toggleCurrentEpisode: function () {
          var audio = audioFor(feed.id);
          if (current.feed !== feed.id || current.index < 0) return;
          if (audio && !audio.paused && !audio.ended) audio.pause();
          else playEpisode(feed, current.index);
        },
        playEpisodeAt: function (index) { playEpisode(feed, index); },
        formatCount: function (matching, total, mode) {
          return total + ' episodes · Showing ' + matching;
        }
      });
    });
  }
  function renderAll() { feeds.forEach(function (feed) { render(feed); updateProgress(feed); }); }

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
  /* Each News feed uses the same shared PodcastList renderer, including swipe-to-mark-played. */
  createListModules();
  /* If any non-News player starts, stop News and remove its selected row. */
  document.addEventListener('play', function (event) {
    var media = event.target;
    if (!media || (media.tagName !== 'AUDIO' && media.tagName !== 'VIDEO')) return;
    if (media.tagName === 'VIDEO') {
      if (!root.hidden) setNewsOpen(false);
      return;
    }
    if (!media.id || media.id.indexOf('news-') === 0) return;
    stopAllNews(true);
  }, true);

  /* Keep News audio alive when wiki navigation uses soft navigation.
     The navigation module preserves this panel and its audio element in place. */

  feeds.forEach(function (feed) {
    var slider = root.querySelector('[data-news-progress-slider="' + feed.id + '"]');
    if (slider) {
      slider.addEventListener('input', function () {
        var audio = audioFor(feed.id);
        var episode = current.feed === feed.id ? (episodesByFeed[feed.id] || [])[current.index] : null;
        var duration = audio && Number.isFinite(audio.duration) ? audio.duration : (episode ? parseDuration(episode.duration) : 0);
        if (audio && duration > 0) { audio.currentTime = duration * (Number(slider.value) / 1000); updateProgress(feed); }
      });
      slider.addEventListener('change', function () { savePosition(feed, true); });
    }
    var audio = audioFor(feed.id);
    if (!audio) return;
    audio.addEventListener('play', renderAll);
    audio.addEventListener('pause', function () { savePosition(feed, true); renderAll(); });
    audio.addEventListener('timeupdate', function () { savePosition(feed, false); updateProgress(feed); });
    audio.addEventListener('seeking', function () { updateProgress(feed); });
    audio.addEventListener('ended', function () {
      savePosition(feed, true);
      var episode = (episodesByFeed[feed.id] || [])[current.index];
      if (current.feed === feed.id && episode) setPlayed(feed, episode, true);
      renderAll();
    });
    audio.addEventListener('loadedmetadata', function () {
      var episode = (episodesByFeed[feed.id] || [])[current.index];
      if (current.feed === feed.id && episode && audio.dataset.restoreSrc !== episode.audioUrl) {
        audio.dataset.restoreSrc = episode.audioUrl;
        var savedPosition = 0;
        try { savedPosition = Number(localStorage.getItem(positionKey(feed, episode)) || 0); } catch (_) {}
        if (savedPosition > 0 && Number.isFinite(audio.duration) && savedPosition < audio.duration - 5) audio.currentTime = savedPosition;
      }
      if (current.feed === feed.id && episode && !episode.duration && Number.isFinite(audio.duration)) {
        episode.duration = Math.floor(audio.duration);
        renderAll();
      }
    });
  });

  window.addEventListener('pagehide', function () { feeds.forEach(function (feed) { savePosition(feed, true); }); });

  fetch('/assets/data/news.json?v=20261025-20', { cache: 'no-store' }).then(function (response) {
    if (!response.ok) throw new Error('Unable to load News cache');
    return response.json();
  }).then(function (data) {
    feeds.forEach(function (feed) {
      episodesByFeed[feed.id] = Array.isArray(data[feed.id]) ? data[feed.id] : [];
      episodesByFeed[feed.id].forEach(function (episode) { episode.url = episode.audioUrl || episode.url || ''; episode.published = episode.published || episode.date || episode.pubDate || ''; });
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
