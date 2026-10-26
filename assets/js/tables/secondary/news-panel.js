/* Unified Podcast engine: every show uses the same episode list, progress, and playback logic. */
(function (window, document) {
  'use strict';
  if (window.__libraryNewsPanelInstalled) return;
  window.__libraryNewsPanelInstalled = true;

  var feeds = [
    { id: 'bbc', title: 'BBC Global News Podcast', language: 'en' },
    { id: 'chronicle', title: 'Chronicle News Connect', language: 'ja' },
    { id: 'english', title: 'Easy Natural English', language: 'en' },
    { id: 'japanese', title: 'Bite Size Japanese', language: 'ja' }
  ];
  var root = document.getElementById('library-news-panel');
  var mainToggle = document.getElementById('library-news-toggle');
  if (!root || !mainToggle) return;

  var episodesByFeed = { bbc: [], chronicle: [], english: [], japanese: [] };
  var activeFeed = 'bbc';
  var activeTab = 'bbc';
  var current = { feed: null, index: -1 };
  var loaded = false;
  var pendingAutoplay = false;
  var filters = { bbc: 'unplayed', chronicle: 'unplayed', english: 'unplayed', japanese: 'unplayed' };
  var lastSavedAt = { bbc: 0, chronicle: 0, english: 0, japanese: 0 };
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
  function setActiveTab(tabId) {
    activeTab = tabId;
    Array.prototype.forEach.call(root.querySelectorAll('[data-news-tab]'), function (button) {
      var selected = button.getAttribute('data-news-tab') === tabId;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-news-feed-panel]'), function (panel) {
      panel.hidden = panel.getAttribute('data-news-feed-panel') !== tabId;
    });
  }
  function setActiveFeed(feedId) {
    activeFeed = feedId;
    setActiveTab(feedId);
  }
  function setNewsOpen(open) {
    if (open && window.LibraryAudioCoordinator) {
      window.LibraryAudioCoordinator.setRadioPanelOpen(false);
      window.LibraryAudioCoordinator.setBookPanelOpen(false);
    }
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
      setActiveTab(activeTab || 'bbc');
      pendingAutoplay = true;
      if (loaded && pendingAutoplay) { pendingAutoplay = false; playDefaultEpisode(activeFeed); }
    } else {
      /* Hiding a visual panel is not an audio-source switch. Keep the current
         episode playing in the background; only an actual audio resource
         selected through stopOtherAudio()/LibraryAudioCoordinator may replace it. */
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
    /* The heading beside the artwork is the current episode title, like the shared Podcast panel. */
    var heading = root.querySelector('[data-news-title="' + feed.id + '"]');
    var selectedEpisode = current.feed === feed.id ? (episodesByFeed[feed.id] || [])[current.index] : null;
    if (heading) {
      var titleText = selectedEpisode && selectedEpisode.title
        ? selectedEpisode.title
        : (heading.getAttribute('data-news-show-title') || feed.title);
      if (window.LibraryPodcastTitle) window.LibraryPodcastTitle.set(heading, titleText);
      else heading.textContent = titleText;
    }
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
          return total + ' ' + (total === 1 ? 'episode' : 'episodes');
        }
      });
    });
  }
  function renderAll() { feeds.forEach(function (feed) { render(feed); updateProgress(feed); }); }
  function setNewsBulkMenuOpen(feedId, open) {
    var toggle = root.querySelector('[data-news-bulk-toggle="' + feedId + '"]');
    var menu = root.querySelector('[data-news-bulk-options="' + feedId + '"]');
    if (!toggle || !menu) return;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(!!open));
  }
  root.querySelectorAll('[data-news-bulk-toggle]').forEach(function (toggle) {
    var feedId = toggle.getAttribute('data-news-bulk-toggle');
    var menu = root.querySelector('[data-news-bulk-options="' + feedId + '"]');
    if (!menu) return;
    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      setNewsBulkMenuOpen(feedId, menu.hidden);
    });
    menu.addEventListener('click', function (event) { event.stopPropagation(); });
  });
  root.querySelectorAll('[data-news-bulk-played]').forEach(function (action) {
    action.addEventListener('click', function () {
      var feedId = action.getAttribute('data-news-feed');
      var feed = getFeed(feedId);
      var played = action.getAttribute('data-news-bulk-played') === 'true';
      setNewsBulkMenuOpen(feedId, false);
      var episodes = episodesByFeed[feedId] || [];
      if (!loaded || !episodes.length) {
        var emptyStatus = root.querySelector('[data-news-status="' + feedId + '"]');
        if (emptyStatus) emptyStatus.textContent = 'No episodes are loaded yet.';
        return;
      }
      episodes.forEach(function (episode) { setPlayed(feed, episode, played); });
      render(feed);
      var status = root.querySelector('[data-news-status="' + feedId + '"]');
      if (status) status.textContent = played
        ? 'Marked all ' + episodes.length + ' episodes as played.'
        : 'Marked all ' + episodes.length + ' episodes as unplayed.';
    });
  });
  document.addEventListener('click', function () {
    feeds.forEach(function (feed) { setNewsBulkMenuOpen(feed.id, false); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    feeds.forEach(function (feed) {
      var menu = root.querySelector('[data-news-bulk-options="' + feed.id + '"]');
      if (menu && !menu.hidden) {
        setNewsBulkMenuOpen(feed.id, false);
        var toggle = root.querySelector('[data-news-bulk-toggle="' + feed.id + '"]');
        if (toggle) toggle.focus();
      }
    });
  });

  mainToggle.addEventListener('click', function () {
    /* Podcast is persistent like Radio and KJV: tapping it must not hide its player.
       If already open, the remembered episode can toggle playback via playDefaultEpisode. */
    setNewsOpen(true);
  });
  /* Every podcast feed uses the same list-collapse control, expanded by default. */
  root.querySelectorAll('[data-news-collapse]').forEach(function (button) {
    button.addEventListener('click', function () {
      var frame = document.getElementById(button.getAttribute('aria-controls'));
      if (!frame) return;
      var expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      button.classList.toggle('is-collapsed', !expanded);
      button.setAttribute('aria-label', expanded ? 'Collapse episode list' : 'Expand episode list');
      button.title = expanded ? 'Collapse episode list' : 'Expand episode list';
      frame.hidden = !expanded;
    });
  });
  root.querySelectorAll('[data-news-tab]').forEach(function (button) {
    button.addEventListener('click', function () {
      var nextFeed = button.getAttribute('data-news-tab');
      var alreadySelectedNewsTab = activeTab === nextFeed;
      if (alreadySelectedNewsTab && nextFeed === activeFeed) {
        playDefaultEpisode(nextFeed);
        return;
      }
      stopAllNews(true);
      setActiveFeed(nextFeed);
      if (loaded) playDefaultEpisode(nextFeed);
      else pendingAutoplay = true;
    });
  });
  /* All four podcasts use the same PodcastList renderer, including swipe-to-mark-played. */
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

  /* Audio controls are listening-first: selecting another audio source closes News.
     Wiki chapter links are deliberately excluded so News can continue while reading. */
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest && event.target.closest(
      '#radio4-toggle, #nhk-radio-toggle, #niv-bible-toggle, #podcast-episode-list .podcast-episode-choice'
    );
    if (target && !root.hidden) setNewsOpen(false);
  }, true);

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
    audio.addEventListener('play', function () {
      var episode = current.feed === feed.id ? (episodesByFeed[feed.id] || [])[current.index] : null;
      if (window.LibraryAudioIdentity && episode) {
        window.LibraryAudioIdentity.setNowPlaying(feed.id === 'bbc' ? 'newsBbc' : feed.id === 'chronicle' ? 'newsChronicle' : 'newsPodcast', audio, {
          title: episode.title || feed.title,
          artist: feed.title,
          album: feed.title,
          artwork: audio.dataset.episodeArtwork || ((root.querySelector('[data-news-artwork="' + feed.id + '"]') || {}).src || '')
        });
      }
      renderAll();
      var heading = root.querySelector('[data-news-title="' + feed.id + '"]');
      if (window.LibraryPodcastTitle) window.LibraryPodcastTitle.animate(heading);
    });
    audio.addEventListener('pause', function () {
      savePosition(feed, true);
      var heading = root.querySelector('[data-news-title="' + feed.id + '"]');
      if (window.LibraryPodcastTitle) window.LibraryPodcastTitle.stop(heading);
      renderAll();
    });
    audio.addEventListener('timeupdate', function () { savePosition(feed, false); updateProgress(feed); });
    audio.addEventListener('seeking', function () { updateProgress(feed); });
    audio.addEventListener('ended', function () {
      savePosition(feed, true);
      var finishedIndex = current.index;
      var queue = episodesByFeed[feed.id] || [];
      var episode = queue[finishedIndex];
      if (current.feed !== feed.id || !episode) {
        renderAll();
        return;
      }

      /* Mark the finished episode, then continue to the next item in this
         feed's visible list order. For the Unplayed filter, skip items already
         marked played; for Played/All, use the same queue order. */
      setPlayed(feed, episode, true);
      /* Force the Unplayed filter totals and rows to refresh before auto-advance. */
      syncFilterOptions(feed);
      if (listModules[feed.id]) listModules[feed.id].render();
      var mode = filters[feed.id] || 'unplayed';
      var nextIndex = -1;
      for (var i = finishedIndex + 1; i < queue.length; i += 1) {
        var nextIsPlayed = isPlayed(feed, queue[i]);
        if (mode === 'all' || (mode === 'played' && nextIsPlayed) || (mode === 'unplayed' && !nextIsPlayed)) {
          nextIndex = i;
          break;
        }
      }
      renderAll();
      if (nextIndex >= 0) {
        playEpisode(feed, nextIndex);
      }
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

  fetch('/assets/data/news.json?v=20261026-5', { cache: 'no-store' }).then(function (response) {
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
