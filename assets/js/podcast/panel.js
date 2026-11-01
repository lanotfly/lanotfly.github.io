/* Unified Podcast engine: every show uses the same episode list, progress, and playback logic. */
(function (window, document) {
  'use strict';
  if (window.__libraryPodcastPanelInstalled) return;
  window.__libraryPodcastPanelInstalled = true;

  var feeds = [
    { id: 'bbc', title: 'BBC Global News Podcast', language: 'en' },
    { id: 'chronicle', title: 'News Connect', language: 'ja' },
    { id: 'english', title: 'Easy Natural English', language: 'en' },
    { id: 'japanese', title: 'Bite Size Japanese', language: 'ja' }
  ];
  var root = document.getElementById('library-podcast-panel');
  var mainToggle = document.getElementById('library-podcast-toggle');
  if (!root || !mainToggle) return;

  var episodesByFeed = { bbc: [], chronicle: [], english: [], japanese: [] };
  var rememberedFeed = 'bbc';
  try {
    var savedFeed = localStorage.getItem('personal-library-podcast-active-feed');
    if (['bbc', 'chronicle', 'english', 'japanese'].indexOf(savedFeed) >= 0) rememberedFeed = savedFeed;
  } catch (_) {}
  var activeFeed = rememberedFeed;
  var activeTab = rememberedFeed;
  var current = { feed: null, index: -1 };
  var loaded = false;
  var pendingAutoplay = false;
  var filters = { bbc: 'unplayed', chronicle: 'unplayed', english: 'unplayed', japanese: 'unplayed' };
  var lastSavedAt = { bbc: 0, chronicle: 0, english: 0, japanese: 0 };
  var foldExpanded = true;
  var listModules = {};

  function getFeed(id) { return feeds.find(function (feed) { return feed.id === id; }) || feeds[0]; }
  function audioFor(feedId) { return document.getElementById('podcast-' + feedId + '-audio'); }
  function absoluteAudioUrl(url) {
    try { return new URL(String(url || ''), document.baseURI).href; }
    catch (_) { return String(url || ''); }
  }
  function sameAudioSource(audio, url) {
    return !!audio && !!url && absoluteAudioUrl(audio.currentSrc || audio.src) === absoluteAudioUrl(url);
  }
  function episodeIdentity(episode) { return String(episode.link || episode.title || episode.audioUrl || '').toLowerCase(); }
  function storageKey(feed, episode) {
    return 'personal-library-podcast-played:' + feed.id + ':' + episodeIdentity(episode);
  }
  function positionKey(feed, episode) { return 'personal-library-podcast-position:' + feed.id + ':' + episodeIdentity(episode); }
  function selectedEpisodeKey(feed) { return 'personal-library-podcast-last-episode:' + feed.id; }
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
    var audio = audioFor(feed.id), wrap = root.querySelector('[data-podcast-progress="' + feed.id + '"]');
    var slider = root.querySelector('[data-podcast-progress-slider="' + feed.id + '"]');
    var currentLabel = root.querySelector('[data-podcast-current-time="' + feed.id + '"]');
    var totalLabel = root.querySelector('[data-podcast-total-time="' + feed.id + '"]');
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
    var select = root.querySelector('[data-podcast-filter="' + feed.id + '"]');
    if (!select) return;
    var tally = counts(feed);
    Array.prototype.forEach.call(select.options, function (option) {
      var label = option.value === 'all' ? 'All episodes' : option.value === 'played' ? 'Played' : 'Unplayed';
      option.textContent = label + ' (' + tally[option.value] + ')';
    });
    select.value = filters[feed.id];
  }
  function stopAllPodcasts(clearSelection) {
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
      coordinator.switchTo('podcast');
      return;
    }
    ['radio4-audio', 'nhk-radio-audio', 'npr-radio-audio', 'niv-bible-audio'].forEach(function (id) {
      var audio = document.getElementById(id);
      if (audio && !audio.paused) audio.pause();
    });
  }
  function setActiveTab(tabId) {
    activeTab = tabId;
    Array.prototype.forEach.call(root.querySelectorAll('[data-podcast-tab]'), function (button) {
      var selected = button.getAttribute('data-podcast-tab') === tabId;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-podcast-feed-panel]'), function (panel) {
      panel.hidden = panel.getAttribute('data-podcast-feed-panel') !== tabId;
    });
  }
  function setActiveFeed(feedId) {
    if (['bbc', 'chronicle', 'english', 'japanese'].indexOf(feedId) < 0) return;
    activeFeed = feedId;
    setActiveTab(feedId);
    try { localStorage.setItem('personal-library-podcast-active-feed', feedId); } catch (_) {}
  }
  function setPodcastOpen(open) {
    if (open && window.LibraryAudioCoordinator) {
      window.LibraryAudioCoordinator.setRadioPanelOpen(false);
    }
    mainToggle.setAttribute('aria-expanded', String(open));
    mainToggle.classList.toggle('is-open', open);
    mainToggle.classList.toggle('is-active', open);
    root.hidden = !open;
    var inner = document.querySelector('.content-wrapper__inner');
    if (inner) inner.classList.toggle('podcast-panel-open', open);
    if (open) {
      document.querySelectorAll('.site-tab-links a.site-tab').forEach(function (link) {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
      });
      setActiveTab(activeTab || 'bbc');
      /* Opening the visual panel must not toggle or restart an audio source. */
      pendingAutoplay = false;
    } else {
      /* Hiding a visual panel is not an audio-source switch. Keep the current
         episode playing in the background; only an actual audio resource
         selected through stopOtherAudio()/LibraryAudioCoordinator may replace it. */
      mainToggle.classList.remove('is-active');
      /* The caller owns the selected navigation family. Closing this panel must not
         reset Radio/KJV/Podcast back to the reading family. */
    }
  }
  window.LibraryClosePodcastPanel = function () { setPodcastOpen(false); };
  /* Open without the toggle handler's autoplay: the Audio shell reveals
     the panel on its own schedule and starts sources via their buttons. */
  window.LibraryOpenPodcastPanel = function () { setPodcastOpen(true); };
  /* Advance to the next episode in the feed's visible order (marks
     the finished one played, honours the filter, wraps around).
     Called from 'ended' — and, on iOS, preferably just BEFORE the
     end via maybeEarlyAdvance below. */
  function playNextInFeed(feed) {
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
    /* Search forward through the queue and wrap to the beginning.
       This avoids stopping just because the remembered/current episode is
       near the end of the feed, while still respecting the selected filter. */
    for (var offset = 1; offset < queue.length; offset += 1) {
      var candidateIndex = (finishedIndex + offset) % queue.length;
      var nextIsPlayed = isPlayed(feed, queue[candidateIndex]);
      if (mode === 'all' || (mode === 'played' && nextIsPlayed) || (mode === 'unplayed' && !nextIsPlayed)) {
        nextIndex = candidateIndex;
        break;
      }
    }
    renderAll();
    if (nextIndex >= 0) {
      playEpisode(feed, nextIndex);
    } else {
      var finishedStatus = root.querySelector('[data-podcast-status="' + feed.id + '"]');
      if (finishedStatus) finishedStatus.textContent = 'No more episodes in this filter.';
    }
  }

  /* iOS releases the audio session the moment a track has fully
     ENDED; a play() issued from the 'ended' handler then often never
     starts while the phone is locked, and continuous playback dies
     between episodes. So switch while the current episode is still
     playing — inside its last fraction of a second: the session is
     alive, 'timeupdate' is driven by the media pipeline (it keeps
     firing in the background), and the next episode inherits a live
     session. 'ended' remains as the backstop; the dataset mark makes
     sure one episode instance can only early-advance once. */
  function maybeEarlyAdvance(feed, audio) {
    if (!audio || audio.paused || audio.ended) return;
    if (current.feed !== feed.id || current.index < 0) return;
    var d = audio.duration, t = audio.currentTime;
    if (!isFinite(d) || d <= 0 || !isFinite(t)) return;
    var remaining = d - t;
    if (remaining < 0 || remaining > 0.6) return;
    var mark = feed.id + '|' + current.index + '|' + (audio.currentSrc || audio.src || '');
    if (audio.dataset.earlyAdvanceFor === mark) return;
    audio.dataset.earlyAdvanceFor = mark;
    playNextInFeed(feed);
  }

  /* Lock-screen previous: the episode before the current one in the
     feed's full list, wrapping at the top (mirrors how the radio
     transport wraps its stations). Next reuses playNextInFeed, the
     same filter-aware advance as automatic continuous playback. */
  function playPreviousInFeed(feed) {
    var queue = episodesByFeed[feed.id] || [];
    if (!queue.length || current.feed !== feed.id || current.index < 0) return;
    var prevIndex = (current.index - 1 + queue.length) % queue.length;
    if (prevIndex === current.index) return;
    playEpisode(feed, prevIndex);
  }

  function playEpisode(feed, index) {
    var episode = (episodesByFeed[feed.id] || [])[index];
    var audio = audioFor(feed.id);
    if (!episode || !audio || !episode.audioUrl) {
      var missingStatus = root.querySelector('[data-podcast-status="' + feed.id + '"]');
      if (missingStatus) missingStatus.textContent = 'This episode does not provide a direct audio URL.';
      if (episode && episode.link) window.open(episode.link, '_blank', 'noopener');
      return;
    }
    if (current.feed === feed.id && current.index === index && sameAudioSource(audio, episode.audioUrl)) {
      if (!audio.paused && !audio.ended) {
        audio.pause();
        renderAll();
        return;
      }
      stopOtherAudio();
      var resume = audio.play();
      renderAll();
      if (resume && resume.catch) resume.catch(function () {
        var resumeStatus = root.querySelector('[data-podcast-status="' + feed.id + '"]');
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
    audio.src = absoluteAudioUrl(episode.audioUrl);
    audio.dataset.podcastSourceChangedAt = String(Date.now());
    audio.dataset.podcastLastProgressAt = audio.dataset.podcastSourceChangedAt;
    audio.dataset.restoreSrc = '';
    audio.dataset.episodeTitle = episode.title || feed.title;
    audio.dataset.episodeArtist = feed.title;
    audio.dataset.episodeArtwork = (root.querySelector('[data-podcast-artwork="' + feed.id + '"]') || {}).src || '';
    audio.load();
    renderAll();
    var promise;
    try {
      /* A background/lock-screen track change can leave iOS showing stale
         Now Playing state even when the new source has not fully started.
         Keep the active source and Media Session in sync after play resolves. */
      promise = audio.play();
    } catch (playError) {
      promise = Promise.reject(playError);
    }
    if (promise && promise.then) promise.then(function () {
      if (current.feed !== feed.id || current.index !== index) return;
      if (window.LibraryAudioIdentity && typeof window.LibraryAudioIdentity.setNowPlaying === 'function') {
        window.LibraryAudioIdentity.setNowPlaying(
          feed.id === 'bbc' ? 'podcastBbc' : feed.id === 'chronicle' ? 'podcastChronicle' : 'podcastFeed',
          audio,
          {
            title: episode.title || feed.title,
            artist: feed.title,
            album: feed.title,
            artwork: audio.dataset.episodeArtwork || ((root.querySelector('[data-podcast-artwork="' + feed.id + '"]') || {}).src || '')
          }
        );
      }
      try {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      } catch (_) {}
      renderAll();
    }).catch(function (playError) {
      if (current.feed !== feed.id || current.index !== index) return;
      var status = root.querySelector('[data-podcast-status="' + feed.id + '"]');
      var reason = playError && playError.name ? ' (' + playError.name + ')' : '';
      if (status) status.textContent = 'Playback did not start' + reason + '. Open the app and tap Play to resume.';
      try {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      } catch (_) {}
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

  /* Bluetooth / iOS Media Session Play should resume the real current episode
     and must not toggle a currently playing item off. */
  window.LibraryPodcastResumeCurrent = function (fallbackAudio) {
    var feed = current.feed ? getFeed(current.feed) : getFeed(activeFeed);
    var index = current.feed === feed.id ? current.index : -1;
    if (index < 0) {
      var all = episodesByFeed[feed.id] || [];
      var identity = '';
      try { identity = localStorage.getItem(selectedEpisodeKey(feed)) || ''; } catch (_) {}
      index = identity ? all.findIndex(function (episode) { return episodeIdentity(episode) === identity; }) : -1;
      if (index < 0) index = 0;
    }
    var episode = (episodesByFeed[feed.id] || [])[index];
    var audio = audioFor(feed.id) || fallbackAudio;
    if (!episode || !audio) return;
    if (current.feed !== feed.id || current.index !== index || !sameAudioSource(audio, episode.audioUrl)) {
      playEpisode(feed, index);
      return;
    }
    if (!audio.paused && !audio.ended) {
      var sourceChangedAt = Number(audio.dataset.podcastSourceChangedAt || 0);
      var lastProgressAt = Number(audio.dataset.podcastLastProgressAt || sourceChangedAt || 0);
      var appearsStalled = sourceChangedAt > 0 && Date.now() - sourceChangedAt > 8000 && Date.now() - lastProgressAt > 8000;
      if (!appearsStalled) return;
      /* iOS can report a successful play() while a background-switched source is silent.
         A fresh lock-screen Play gesture gets one chance to reload that same source. */
      try { audio.pause(); audio.load(); } catch (_) {}
    }
    stopOtherAudio();
    var result;
    audio.dataset.podcastSourceChangedAt = String(Date.now());
    audio.dataset.podcastLastProgressAt = audio.dataset.podcastSourceChangedAt;
    try { result = audio.play(); } catch (error) { result = Promise.reject(error); }
    if (result && result.then) result.then(function () {
      if (window.LibraryAudioIdentity) {
        window.LibraryAudioIdentity.setNowPlaying(
          feed.id === 'bbc' ? 'podcastBbc' : feed.id === 'chronicle' ? 'podcastChronicle' : 'podcastFeed',
          audio,
          {
            title: episode.title || feed.title,
            artist: feed.title,
            album: feed.title,
            artwork: audio.dataset.episodeArtwork || ((root.querySelector('[data-podcast-artwork="' + feed.id + '"]') || {}).src || '')
          }
        );
      }
      renderAll();
    }).catch(function (error) {
      var status = root.querySelector('[data-podcast-status="' + feed.id + '"]');
      var reason = error && error.name ? ' (' + error.name + ')' : '';
      if (status) status.textContent = 'Could not resume from lock screen' + reason + '. Open the app and tap Play.';
      try { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; } catch (_) {}
      renderAll();
    });
  };
  function render(feed) {
    syncFilterOptions(feed);
    /* The heading beside the artwork is the current episode title, like the shared Podcast panel. */
    var heading = root.querySelector('[data-podcast-title="' + feed.id + '"]');
    var selectedEpisode = current.feed === feed.id ? (episodesByFeed[feed.id] || [])[current.index] : null;
    if (heading) {
      var titleText = selectedEpisode && selectedEpisode.title
        ? selectedEpisode.title
        : (heading.getAttribute('data-podcast-show-title') || feed.title);
      if (window.LibraryPodcastTitle) window.LibraryPodcastTitle.set(heading, titleText);
      else heading.textContent = titleText;
    }
    if (listModules[feed.id]) listModules[feed.id].render();
    else {
      var list = root.querySelector('[data-podcast-list="' + feed.id + '"]');
      if (list) list.textContent = '';
    }
  }
  function createListModules() {
    if (!window.LibraryPodcastList || !window.LibraryPodcastList.create) return;
    feeds.forEach(function (feed) {
      var list = root.querySelector('[data-podcast-list="' + feed.id + '"]');
      var count = root.querySelector('[data-podcast-count="' + feed.id + '"]');
      var status = root.querySelector('[data-podcast-status="' + feed.id + '"]');
      var filter = root.querySelector('[data-podcast-filter="' + feed.id + '"]');
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
        getProgressSeconds: function (episode) {
          try { return Number(localStorage.getItem(positionKey(feed, episode)) || 0); } catch (_) { return 0; }
        },
        getLiveFraction: function () {
          if (current.feed !== feed.id || current.index < 0) return null;
          var audio = audioFor(feed.id);
          if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return null;
          return (audio.currentTime || 0) / audio.duration;
        },
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
  function setPodcastBulkMenuOpen(feedId, open) {
    var toggle = root.querySelector('[data-podcast-bulk-toggle="' + feedId + '"]');
    var menu = root.querySelector('[data-podcast-bulk-options="' + feedId + '"]');
    if (!toggle || !menu) return;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(!!open));
  }
  root.querySelectorAll('[data-podcast-bulk-toggle]').forEach(function (toggle) {
    var feedId = toggle.getAttribute('data-podcast-bulk-toggle');
    var menu = root.querySelector('[data-podcast-bulk-options="' + feedId + '"]');
    if (!menu) return;
    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      setPodcastBulkMenuOpen(feedId, menu.hidden);
    });
    menu.addEventListener('click', function (event) { event.stopPropagation(); });
  });
  root.querySelectorAll('[data-podcast-bulk-played]').forEach(function (action) {
    action.addEventListener('click', function () {
      var feedId = action.getAttribute('data-podcast-feed');
      var feed = getFeed(feedId);
      var played = action.getAttribute('data-podcast-bulk-played') === 'true';
      setPodcastBulkMenuOpen(feedId, false);
      var episodes = episodesByFeed[feedId] || [];
      if (!loaded || !episodes.length) {
        var emptyStatus = root.querySelector('[data-podcast-status="' + feedId + '"]');
        if (emptyStatus) emptyStatus.textContent = 'No episodes are loaded yet.';
        return;
      }
      episodes.forEach(function (episode) { setPlayed(feed, episode, played); });
      render(feed);
      var status = root.querySelector('[data-podcast-status="' + feedId + '"]');
      if (status) status.textContent = played
        ? 'Marked all ' + episodes.length + ' episodes as played.'
        : 'Marked all ' + episodes.length + ' episodes as unplayed.';
    });
  });
  document.addEventListener('click', function () {
    feeds.forEach(function (feed) { setPodcastBulkMenuOpen(feed.id, false); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    feeds.forEach(function (feed) {
      var menu = root.querySelector('[data-podcast-bulk-options="' + feed.id + '"]');
      if (menu && !menu.hidden) {
        setPodcastBulkMenuOpen(feed.id, false);
        var toggle = root.querySelector('[data-podcast-bulk-toggle="' + feed.id + '"]');
        if (toggle) toggle.focus();
      }
    });
  });

  function anyPodcastPlaying() {
    return feeds.some(function (feed) {
      var audio = audioFor(feed.id);
      return !!audio && !audio.paused && !audio.ended;
    });
  }
  mainToggle.addEventListener('click', function () {
    var wasOpen = !root.hidden;
    setPodcastOpen(true);
    consumeFoldFlag();
    /* Selecting Podcast is an audio-source switch, exactly like Radio and
       KJV: pause the outgoing source, close its panel, then play. Only
       opening the panel left Radio/KJV audio running underneath and never
       started a podcast, which read as "the audio did not switch". */
    if (wasOpen && current.feed && current.index >= 0) {
      var currentAudio = audioFor(current.feed);
      if (currentAudio && !currentAudio.paused && !currentAudio.ended) {
        /* Panel already open and this episode is playing: toggle to pause,
           the same convention as the Radio and KJV buttons. */
        currentAudio.pause();
        renderAll();
        return;
      }
    }
    /* Podcast is already the live source (e.g. background or lock-screen
       playback with the panel closed): just reveal the panel. */
    if (anyPodcastPlaying()) return;
    /* stopOtherAudio() routes through LibraryAudioCoordinator.switchTo,
       which pauses Radio/KJV and hides the KJV panel; setPodcastOpen(true)
       above already closed the Radio panel. */
    stopOtherAudio();
    if (loaded) playDefaultEpisode(activeFeed);
    else pendingAutoplay = true;
  });
  /* Mini-bar transport, modelled on the Apple Podcasts mini player: when a
     feed is folded, the heading's right side carries a glass play/pause
     button and a skip-forward-30 button. Each feed panel also carries a
     data-playing flag that swaps the play button's icon. */
  function syncPlayingBadge(feed) {
    var section = root.querySelector('[data-podcast-feed-panel="' + feed.id + '"]');
    if (section) section.dataset.playing = String(!audioFor(feed.id).paused);
  }
  function toggleFeedPlayback(feed) {
    var audio = audioFor(feed.id);
    if (!audio.paused) { audio.pause(); return; }
    if (current.feed === feed.id && current.index >= 0) {
      if (window.LibraryAudioCoordinator) window.LibraryAudioCoordinator.switchTo('podcast:' + feed.id);
      audio.play().catch(function () {});
    } else {
      playDefaultEpisode(feed.id);
    }
  }
  root.querySelectorAll('[data-podcast-feed-panel]').forEach(function (section) {
    /* Strict lookup: getFeed() falls back to the first feed for unknown
       ids, which would wire a BBC play button into the KJV card. */
    var feedId = section.getAttribute('data-podcast-feed-panel');
    var feed = feeds.find(function (f) { return f.id === feedId; });
    var actions = section.querySelector('.podcast-panel-actions');
    if (!feed || !actions) return;
    var playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'podcast-mini-btn podcast-mini-play';
    playBtn.setAttribute('aria-label', 'Play or pause ' + feed.title);
    playBtn.innerHTML = '<svg class="icon-play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6.5v11l9-5.5z" fill="currentColor"/></svg><svg class="icon-pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.5 6h3v12h-3zM13.5 6h3v12h-3z" fill="currentColor"/></svg>';
    playBtn.addEventListener('click', function () { toggleFeedPlayback(feed); });
    actions.insertBefore(playBtn, actions.firstChild);
  });
  /* Set when the reader taps Home or a book chapter: lists reopen folded. */
  function consumeFoldFlag() {
    var fold = false;
    try {
      fold = sessionStorage.getItem('library-fold-audio') === '1';
      if (fold) sessionStorage.removeItem('library-fold-audio');
    } catch (e) {}
    if (!fold) return;
    applyFeedFold(false);
    if (window.LibraryKjvApplyFold) window.LibraryKjvApplyFold(false);
  }
  /* Folding is global across the whole audio deck: every feed AND the
     KJV chapter list share one list state. There are no fold buttons
     any more — each panel's heading strip (artwork + title, in its
     solid box) is the toggle, identical folded or expanded. Clicks on
     real controls inside the strip (play, options, selects) never
     toggle. */
  function applyFeedFold(expanded) {
    foldExpanded = expanded;
    feeds.forEach(function (feed) {
      var frame = document.getElementById('podcast-' + feed.id + '-list-frame');
      if (frame) frame.hidden = !expanded;
    });
  }
  window.LibraryPodcastApplyFold = applyFeedFold;
  window.LibraryAudioSetFold = function (expanded) {
    applyFeedFold(expanded);
    if (window.LibraryKjvApplyFold) window.LibraryKjvApplyFold(expanded);
  };
  /* Reading tap: with the lists expanded, a tap anywhere outside the
     purple audio frame (and outside the nav / market / book chrome)
     folds the lists away so the page can be read. Taps inside the
     panel never fold; the heading strips keep their own toggle. */
  document.addEventListener('click', function (event) {
    if (!foldExpanded) return;
    var t = event.target;
    if (!t || !t.closest) return;
    if (t.closest('#library-audio-panel, .site-nav-shell, #library-market-panel, #library-book-chapter-handle, #library-book-chapter-drawer, .lx-select')) return;
    window.LibraryAudioSetFold(false);
  });
  feeds.forEach(function (feed) {
    var panelEl = root.querySelector('[data-podcast-feed-panel="' + feed.id + '"]');
    var heading = panelEl && panelEl.querySelector('.podcast-episode-panel__heading');
    if (!heading) return;
    heading.addEventListener('click', function (event) {
      if (event.target.closest('button, select, a, input, textarea, label')) return;
      window.LibraryAudioSetFold(!foldExpanded);
    });
  });
  root.querySelectorAll('[data-podcast-tab]').forEach(function (button) {
    button.addEventListener('click', function () {
      var nextFeed = button.getAttribute('data-podcast-tab');
      if (nextFeed === 'kjv') {
        /* KJV lives in this panel as a fifth source now: show its card and
           stop the podcast feeds; its own module owns playback. */
        setActiveTab('kjv');
        try { localStorage.setItem('personal-library-podcast-active-feed', 'kjv'); } catch (_) {}
        stopAllPodcasts(true);
        return;
      }
      if (['bbc', 'chronicle', 'english', 'japanese'].indexOf(nextFeed) < 0) return;
      /* Compare BEFORE setActiveFeed: it rewrites activeTab and activeFeed,
         so checking afterwards always reported "already selected" and the
         stop-then-play switch path below could never run. */
      var alreadySelectedPodcastTab = activeTab === nextFeed && nextFeed === activeFeed;
      /* Remember the chosen show immediately, even if playback has not started yet. */
      setActiveFeed(nextFeed);
      if (alreadySelectedPodcastTab) {
        if (loaded) playDefaultEpisode(nextFeed);
        else pendingAutoplay = true;
        return;
      }
      stopAllPodcasts(true);
      if (loaded) playDefaultEpisode(nextFeed);
      else pendingAutoplay = true;
    });
  });
  /* All four podcasts use the same PodcastList renderer, including swipe-to-mark-played. */
  createListModules();
  /* If any non-Podcast player starts, pause Podcast but keep its place:
     the selected row and progress bar stay where the listener left them. */
  document.addEventListener('play', function (event) {
    var media = event.target;
    if (!media || (media.tagName !== 'AUDIO' && media.tagName !== 'VIDEO')) return;
    if (media.tagName === 'VIDEO') {
      if (!root.hidden) setPodcastOpen(false);
      return;
    }
    if (!media.id || media.id.indexOf('podcast-') === 0) return;
    stopAllPodcasts(false);
  }, true);

  /* The Podcast panel is the Audio panel's home view now: Radio and KJV
     are quick buttons inside it, so their controls must NOT close it.
     (Mutual pausing is the coordinator's job, not the panel's.) */
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest && event.target.closest(
      '#podcast-episode-list .podcast-episode-choice'
    );
    if (target && !root.hidden) setPodcastOpen(false);
  }, true);

  feeds.forEach(function (feed) {
    var slider = root.querySelector('[data-podcast-progress-slider="' + feed.id + '"]');
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
        window.LibraryAudioIdentity.setNowPlaying(feed.id === 'bbc' ? 'podcastBbc' : feed.id === 'chronicle' ? 'podcastChronicle' : 'podcastFeed', audio, {
          title: episode.title || feed.title,
          artist: feed.title,
          album: feed.title,
          artwork: audio.dataset.episodeArtwork || ((root.querySelector('[data-podcast-artwork="' + feed.id + '"]') || {}).src || '')
        });
      }
      renderAll();
      syncPlayingBadge(feed);
      var heading = root.querySelector('[data-podcast-title="' + feed.id + '"]');
      if (window.LibraryPodcastTitle) window.LibraryPodcastTitle.animate(heading);
    });
    audio.addEventListener('pause', function () {
      savePosition(feed, true);
      var heading = root.querySelector('[data-podcast-title="' + feed.id + '"]');
      if (window.LibraryPodcastTitle) window.LibraryPodcastTitle.stop(heading);
      renderAll();
      syncPlayingBadge(feed);
    });
    audio.addEventListener('timeupdate', function () {
      audio.dataset.podcastLastProgressAt = String(Date.now());
      savePosition(feed, false);
      updateProgress(feed);
      var lm = listModules[feed.id];
      if (lm && lm.updateLiveProgress) lm.updateLiveProgress();
      maybeEarlyAdvance(feed, audio);
    });
    audio.addEventListener('seeking', function () { updateProgress(feed); });
    audio.addEventListener('ended', function () { playNextInFeed(feed); });
    audio.addEventListener('loadedmetadata', function () {
      if (audio.dataset.adoptPosition) {
        var adoptTo = Number(audio.dataset.adoptPosition);
        delete audio.dataset.adoptPosition;
        if (Number.isFinite(adoptTo) && adoptTo > 0 && Number.isFinite(audio.duration) && adoptTo < audio.duration - 5) {
          try { audio.currentTime = adoptTo; } catch (_) {}
        }
      }
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

  /* Cross-tab progress: positions live in localStorage, which Safari shares
     across tabs of this site (the IndexedDB store in storage.js is shared
     the same way). Save when a tab is hidden, not only when it closes, and
     adopt a newer position written by another tab when this tab becomes
     visible again or hears the storage event — listening continues where
     the other tab left off, with no server involved. (iOS keeps a
     home-screen web app's storage in a separate container from Safari's;
     that boundary is the platform's and cannot be crossed from the page.) */
  function adoptSavedPosition(feed) {
    if (!feed || current.feed !== feed.id || current.index < 0) return;
    var audio = audioFor(feed.id);
    var episode = (episodesByFeed[feed.id] || [])[current.index];
    if (!audio || !episode || !audio.paused) return;
    var saved = 0;
    try { saved = Number(localStorage.getItem(positionKey(feed, episode)) || 0); } catch (_) {}
    if (!Number.isFinite(saved) || saved <= 0) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      if (Math.abs(saved - (audio.currentTime || 0)) > 3 && saved < audio.duration - 5) {
        try { audio.currentTime = saved; } catch (_) {}
        updateProgress(feed);
      }
    } else {
      audio.dataset.adoptPosition = String(saved);
    }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (!current.feed) return;
      var awayFeed = getFeed(current.feed);
      var awayAudio = awayFeed ? audioFor(awayFeed.id) : null;
      if (awayAudio && !awayAudio.paused && !awayAudio.ended) persistResumeMark(awayFeed.id);
      return;
    }
    attemptResumeOnReturn();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      feeds.forEach(function (feed) { savePosition(feed, true); });
    } else if (current.feed) {
      adoptSavedPosition(getFeed(current.feed));
    }
  });

  /* Returning-listener resume. iOS gives a web page no interruption
     signal and no right to restart sound from the background, so a
     podcast interrupted while the user is away (a call, another
     app's voice mode) can never restart itself out there. What the
     page CAN do: remember it was playing when the user left, and if
     it comes back paused, pick it up the moment the page becomes
     visible again — no tap inside the page needed. One shot per
     departure, only for the still-selected feed, and never over
     another source that is already playing. A deliberate lock-screen
     pause (identity.js) clears the mark.
     The mark is persisted: a LONG interruption can cost the page its
     place in memory, and the mark must survive long enough for the
     return either way. And the resume verifies itself — a long
     interruption leaves the element's stream torn down, so if the
     first play() does not take, it reloads the same source once
     (the saved position is re-adopted on metadata load) and plays
     again. Short interruptions never notice any of this. */
  if (window.LibraryAudioIdentity && typeof window.LibraryAudioIdentity.setTransport === 'function') {
    var podcastTransport = {
      previous: function () { if (current.feed && current.feed !== 'kjv') playPreviousInFeed(getFeed(current.feed)); },
      next: function () { if (current.feed && current.feed !== 'kjv') playNextInFeed(getFeed(current.feed)); }
    };
    ['podcastBbc', 'podcastChronicle', 'podcastFeed'].forEach(function (id) { window.LibraryAudioIdentity.setTransport(id, podcastTransport); });
  }
  var RESUME_MARK_KEY = 'personal-library-podcast-resume-mark';
  var RESUME_MARK_MAX_AGE = 45 * 60 * 1000;
  var resumeWhenVisible = null;
  var resumeAttemptToken = 0;
  function persistResumeMark(feedId) {
    resumeWhenVisible = feedId;
    try { localStorage.setItem(RESUME_MARK_KEY, JSON.stringify({ feed: feedId, at: Date.now() })); } catch (_) {}
  }
  function readResumeMark() {
    if (resumeWhenVisible) return resumeWhenVisible;
    try {
      var raw = localStorage.getItem(RESUME_MARK_KEY);
      if (!raw) return null;
      var mark = JSON.parse(raw);
      if (!mark || !mark.feed || !mark.at || Date.now() - mark.at > RESUME_MARK_MAX_AGE) return null;
      return mark.feed;
    } catch (_) { return null; }
  }
  function clearResumeMark() {
    resumeWhenVisible = null;
    resumeAttemptToken += 1;
    try { localStorage.removeItem(RESUME_MARK_KEY); } catch (_) {}
  }
  window.addEventListener('library-user-pause', clearResumeMark);
  function resumeGuards(targetFeed) {
    if (current.feed !== targetFeed) return null;
    var feed = getFeed(targetFeed);
    var audio = feed ? audioFor(feed.id) : null;
    if (!audio || !audio.paused || audio.ended) return null;
    if (!(episodesByFeed[targetFeed] || [])[current.index]) return null;
    var all = document.querySelectorAll('audio');
    for (var i = 0; i < all.length; i += 1) { if (all[i] !== audio && !all[i].paused) return null; }
    return audio;
  }
  function doResume(targetFeed) {
    var feed = getFeed(targetFeed);
    if (feed && resumeGuards(targetFeed)) toggleFeedPlayback(feed);
  }
  /* If every timed attempt fails — the interrupting app is slow to
     release the audio session, or this page instance is fresh and
     has no gesture standing at all — the user's next tap anywhere
     outside the audio controls lends the resume its gesture. The
     deck's own buttons are excluded: they already do the right
     thing from the saved state and must never be double-fired. */
  var resumeArmCleanup = null;
  function armTapResume(targetFeed, token, audio) {
    if (resumeArmCleanup) resumeArmCleanup();
    var until = Date.now() + 2 * 60 * 1000;
    function cleanup() {
      document.removeEventListener('pointerdown', onTap, true);
      if (audio) audio.removeEventListener('play', onPlay);
      if (resumeArmCleanup === cleanup) resumeArmCleanup = null;
    }
    /* Disarm when a play STICKS. A gesture prime also fires 'play'
       but re-pauses inside the same task — that must not disarm. */
    function onPlay() { setTimeout(function () { if (audio && !audio.paused) cleanup(); }, 60); }
    function onTap(event) {
      if (token !== resumeAttemptToken || Date.now() > until) { cleanup(); return; }
      if (event.target && event.target.closest && event.target.closest('#library-audio-panel,.site-nav-shell')) return;
      cleanup();
      doResume(targetFeed);
    }
    document.addEventListener('pointerdown', onTap, true);
    if (audio) audio.addEventListener('play', onPlay);
    resumeArmCleanup = cleanup;
  }
  function attemptResumeOnReturn() {
    var targetFeed = readResumeMark();
    if (!targetFeed) return;
    clearResumeMark();
    var audio = resumeGuards(targetFeed);
    if (!audio) return;
    var token = resumeAttemptToken;
    doResume(targetFeed);
    armTapResume(targetFeed, token, audio);
    /* Verify, don't trust: a long interruption can leave the stream
       torn down or the audio session not yet released. Retry on a
       short ladder — first with a source reload (the saved position
       is re-adopted on metadata load), then plain re-plays. */
    [1600, 4500, 10000].forEach(function (delay, attemptIndex) {
      setTimeout(function () {
        if (token !== resumeAttemptToken) return;
        var a2 = resumeGuards(targetFeed);
        if (!a2) return;
        if (attemptIndex === 0) {
          if (a2.currentTime > 0) a2.dataset.adoptPosition = String(a2.currentTime);
          try { a2.load(); } catch (_) {}
        }
        var retry = a2.play();
        if (retry && retry.catch) retry.catch(function () {});
      }, delay);
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      feeds.forEach(function (feed) { savePosition(feed, true); });
    } else if (current.feed) {
      adoptSavedPosition(getFeed(current.feed));
    }
  });

  window.addEventListener('pageshow', function () { if (!document.hidden) attemptResumeOnReturn(); });
  window.addEventListener('storage', function (event) {
    if (!event.key || event.key.indexOf('personal-library-podcast-position:') !== 0) return;
    if (current.feed) adoptSavedPosition(getFeed(current.feed));
  });

  fetch('/assets/data/podcast.json?v=20261026-1', { cache: 'no-store' }).then(function (response) {
    if (!response.ok) throw new Error('Unable to load Podcast cache');
    return response.json();
  }).then(function (data) {
    feeds.forEach(function (feed) {
      episodesByFeed[feed.id] = Array.isArray(data[feed.id]) ? data[feed.id] : [];
      episodesByFeed[feed.id].forEach(function (episode) { episode.url = episode.audioUrl || episode.url || ''; episode.published = episode.published || episode.date || episode.pubDate || ''; });
      var artwork = data.artwork && data.artwork[feed.id];
      var image = root.querySelector('[data-podcast-artwork="' + feed.id + '"]');
      if (image && artwork) image.src = artwork;
      var status = root.querySelector('[data-podcast-status="' + feed.id + '"]');
      if (status) {
        var state = data.feedStatus && data.feedStatus[feed.id];
        status.textContent = episodesByFeed[feed.id].length ? '' :
          (state && state.error ? state.error : 'Could not load episodes.');
      }
    });
    loaded = true;
    /* Restore the last selected episode before the first user interaction. This also
       installs fresh Media Session handlers after a page/app reload, instead of
       leaving iOS with stale Now Playing metadata and no live Play callback. */
    var restoreFeed = getFeed(activeFeed);
    var restoreIdentity = '';
    try { restoreIdentity = localStorage.getItem(selectedEpisodeKey(restoreFeed)) || ''; } catch (_) {}
    var restoreIndex = restoreIdentity
      ? (episodesByFeed[restoreFeed.id] || []).findIndex(function (episode) { return episodeIdentity(episode) === restoreIdentity; })
      : -1;
    if (restoreIndex >= 0) {
      current = { feed: restoreFeed.id, index: restoreIndex };
      var restoreEpisode = episodesByFeed[restoreFeed.id][restoreIndex];
      var restoreAudio = audioFor(restoreFeed.id);
      if (restoreAudio && window.LibraryAudioIdentity && typeof window.LibraryAudioIdentity.setNowPlaying === 'function') {
        window.LibraryAudioIdentity.setNowPlaying(
          restoreFeed.id === 'bbc' ? 'podcastBbc' : restoreFeed.id === 'chronicle' ? 'podcastChronicle' : 'podcastFeed',
          restoreAudio,
          {
            title: restoreEpisode.title || restoreFeed.title,
            artist: restoreFeed.title,
            album: restoreFeed.title,
            artwork: (root.querySelector('[data-podcast-artwork="' + restoreFeed.id + '"]') || {}).src || ''
          }
        );
      }
    }
    renderAll();
    if (pendingAutoplay && !root.hidden) {
      pendingAutoplay = false;
      playDefaultEpisode(activeFeed);
    }
  }).catch(function () {
    feeds.forEach(function (feed) {
      var status = root.querySelector('[data-podcast-status="' + feed.id + '"]');
      if (status) status.textContent = 'Could not load episodes. Please try again later.';
    });
  });
})(window, document);
