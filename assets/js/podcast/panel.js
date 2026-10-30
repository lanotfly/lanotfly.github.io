/* Unified Podcast engine: every show uses the same episode list, progress, and playback logic. */
(function (window, document) {
  'use strict';
  if (window.__libraryPodcastPanelInstalled) return;
  window.__libraryPodcastPanelInstalled = true;

  var feeds = [
    { id: 'bbc', title: 'BBC Global News Podcast', language: 'en' },
    { id: 'chronicle', title: 'Chronicle News Connect', language: 'ja' },
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
    ['radio4-audio', 'nhk-radio-audio', 'niv-bible-audio'].forEach(function (id) {
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
  /* Every podcast feed uses the same list-collapse control, expanded by default. */
  root.querySelectorAll('[data-podcast-collapse]').forEach(function (button) {
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
  root.querySelectorAll('[data-podcast-tab]').forEach(function (button) {
    button.addEventListener('click', function () {
      var nextFeed = button.getAttribute('data-podcast-tab');
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
  /* If any non-Podcast player starts, stop Podcast and remove its selected row. */
  document.addEventListener('play', function (event) {
    var media = event.target;
    if (!media || (media.tagName !== 'AUDIO' && media.tagName !== 'VIDEO')) return;
    if (media.tagName === 'VIDEO') {
      if (!root.hidden) setPodcastOpen(false);
      return;
    }
    if (!media.id || media.id.indexOf('podcast-') === 0) return;
    stopAllPodcasts(true);
  }, true);

  /* Audio controls are listening-first: selecting another audio source closes Podcast.
     Wiki chapter links are deliberately excluded so Podcast can continue while reading. */
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest && event.target.closest(
      '#radio4-toggle, #nhk-radio-toggle, #niv-bible-toggle, #podcast-episode-list .podcast-episode-choice'
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
      var heading = root.querySelector('[data-podcast-title="' + feed.id + '"]');
      if (window.LibraryPodcastTitle) window.LibraryPodcastTitle.animate(heading);
    });
    audio.addEventListener('pause', function () {
      savePosition(feed, true);
      var heading = root.querySelector('[data-podcast-title="' + feed.id + '"]');
      if (window.LibraryPodcastTitle) window.LibraryPodcastTitle.stop(heading);
      renderAll();
    });
    audio.addEventListener('timeupdate', function () {
      audio.dataset.podcastLastProgressAt = String(Date.now());
      savePosition(feed, false);
      updateProgress(feed);
    });
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
    });
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
      feeds.forEach(function (feed) { savePosition(feed, true); });
    } else if (current.feed) {
      adoptSavedPosition(getFeed(current.feed));
    }
  });
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
