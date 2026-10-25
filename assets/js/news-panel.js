/* News reuses the same episode-row and selection styles as the two regular podcasts. */
(function () {
  'use strict';
  if (window.__libraryNewsPanelInstalled) return;
  window.__libraryNewsPanelInstalled = true;

  var feeds = [
    { id: 'bbc', title: 'Global News Podcast', language: 'en' },
    { id: 'chronicle', title: 'News Connect', language: 'ja' }
  ];
  var root = document.getElementById('library-news-panel');
  var mainToggle = document.getElementById('library-news-toggle');
  if (!root || !mainToggle) return;

  var episodesByFeed = {};
  var current = { feed: null, index: -1 };
  var initialized = false;

  function storageKey(feed, episode) {
    return 'personal-library-news-played:' + feed.id + ':' + String(episode.title || episode.link).toLowerCase();
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
  function audioFor(feed) {
    return document.getElementById('news-' + feed.id + '-audio');
  }
  function stopOtherAudio() {
    ['podcast-audio', 'radio4-audio', 'nhk-radio-audio', 'niv-bible-audio'].forEach(function (id) {
      var audio = document.getElementById(id);
      if (audio && !audio.paused) audio.pause();
    });
    root.querySelectorAll('audio').forEach(function (audio) {
      if (!audio.paused) audio.pause();
    });
    var podcastPanel = document.getElementById('podcast-episode-panel');
    if (podcastPanel) podcastPanel.hidden = true;
    var biblePanel = document.getElementById('niv-bible-panel');
    if (biblePanel) biblePanel.hidden = true;
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
    } else {
      mainToggle.classList.remove('is-active');
      if (typeof window.LibraryUpdatePrimaryActive === 'function') {
        window.LibraryUpdatePrimaryActive(window.location.pathname);
      }
    }
  }
  mainToggle.addEventListener('click', function () {
    setNewsOpen(mainToggle.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('click', function (event) {
    var tab = event.target.closest && event.target.closest('.site-tab');
    if (!tab || tab === mainToggle || root.hidden) return;
    setNewsOpen(false);
  });

  function render(feed) {
    var list = root.querySelector('[data-news-list="' + feed.id + '"]');
    var count = root.querySelector('[data-news-count="' + feed.id + '"]');
    var filter = root.querySelector('[data-news-filter="' + feed.id + '"]');
    if (!list || !filter) return;
    list.textContent = '';
    var all = episodesByFeed[feed.id] || [];
    var mode = filter.value || 'unplayed';
    var visible = all.map(function (episode, index) {
      return { episode: episode, index: index };
    }).filter(function (entry) {
      var played = isPlayed(feed, entry.episode);
      return mode === 'all' || (mode === 'played' ? played : !played);
    });
    if (count) {
      count.textContent = feed.language === 'ja' ?
        (mode === 'all' ? 'すべて ' : '') + visible.length + ' 件' :
        (mode === 'all' ? 'All ' : '') + visible.length + ' episodes';
    }
    if (!visible.length) {
      var empty = document.createElement('p');
      empty.className = 'podcast-episode-panel__status';
      empty.textContent = feed.language === 'ja' ? '表示できるエピソードはありません。' : 'No episodes in this filter.';
      list.appendChild(empty);
      return;
    }
    visible.forEach(function (entry) {
      var episode = entry.episode;
      var index = entry.index;
      var isCurrent = current.feed === feed.id && current.index === index;
      var audio = audioFor(feed);
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
      button.setAttribute('aria-pressed', String(!!isCurrent));
      button.setAttribute('aria-label', (isPlaying ? 'Pause ' : 'Play ') + episode.title);
      var number = document.createElement('span');
      number.className = 'podcast-episode-number';
      number.textContent = isCurrent ? (isPlaying ? 'Ⅱ' : '▶') : String(index + 1);
      var title = document.createElement('span');
      title.className = 'podcast-episode-name';
      title.textContent = episode.title || ('Episode ' + (index + 1));
      var state = document.createElement('span');
      state.className = 'podcast-episode-state';
      var played = isPlayed(feed, episode);
      state.textContent = played ? '✓ Played' : '○ Unplayed';
      state.setAttribute('aria-label', played ? 'Played' : 'Unplayed');
      button.appendChild(number);
      button.appendChild(title);
      button.appendChild(state);
      button.addEventListener('click', function () {
        var targetAudio = audioFor(feed);
        if (!episode.audioUrl) {
          var status = root.querySelector('[data-news-status="' + feed.id + '"]');
          if (status) status.textContent = feed.language === 'ja' ? 'このエピソードの音声URLがありません。' : 'This episode has no direct audio URL.';
          if (episode.link) window.open(episode.link, '_blank', 'noopener');
          return;
        }
        if (current.feed === feed.id && current.index === index &&
            targetAudio.src === episode.audioUrl && !targetAudio.paused) {
          targetAudio.pause();
          render(feed);
          return;
        }
        stopOtherAudio();
        current = { feed: feed.id, index: index };
        targetAudio.src = episode.audioUrl;
        targetAudio.dataset.episodeTitle = episode.title;
        targetAudio.load();
        renderAll();
        var attempt = targetAudio.play();
        if (attempt && attempt.catch) attempt.catch(function () {
          var status = root.querySelector('[data-news-status="' + feed.id + '"]');
          if (status) status.textContent = 'Playback was blocked. Tap the selected episode again.';
          renderAll();
        });
      });
      row.appendChild(button);
      list.appendChild(row);
    });
  }
  function renderAll() {
    feeds.forEach(render);
  }
  function initialize() {
    if (initialized) return;
    initialized = true;
    feeds.forEach(function (feed) {
      var filter = root.querySelector('[data-news-filter="' + feed.id + '"]');
      var audio = audioFor(feed);
      if (filter) filter.addEventListener('change', function () { render(feed); });
      if (audio) {
        audio.addEventListener('play', function () { renderAll(); });
        audio.addEventListener('pause', function () { renderAll(); });
        audio.addEventListener('ended', function () {
          var episode = (episodesByFeed[feed.id] || [])[current.index];
          if (current.feed === feed.id && episode) setPlayed(feed, episode, true);
          renderAll();
        });
      }
    });
    fetch('/assets/data/news.json?v=20261025-6', { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('Unable to load News cache');
      return response.json();
    }).then(function (data) {
      feeds.forEach(function (feed) {
        episodesByFeed[feed.id] = (Array.isArray(data[feed.id]) ? data[feed.id] : []).slice(0, 5);
        var artwork = data.artwork && data.artwork[feed.id];
        var image = root.querySelector('[data-news-artwork="' + feed.id + '"]');
        if (image && artwork) image.src = artwork;
        var count = root.querySelector('[data-news-count="' + feed.id + '"]');
        if (count && !episodesByFeed[feed.id].length) count.textContent = feed.language === 'ja' ? 'エピソードなし' : 'No episodes';
        var status = root.querySelector('[data-news-status="' + feed.id + '"]');
        if (status) {
          var state = data.feedStatus && data.feedStatus[feed.id];
          status.textContent = episodesByFeed[feed.id].length ? '' :
            (state && state.error ? state.error : 'Could not load episodes.');
        }
      });
      renderAll();
    }).catch(function () {
      feeds.forEach(function (feed) {
        var status = root.querySelector('[data-news-status="' + feed.id + '"]');
        if (status) status.textContent = 'Could not load episodes. Please try again later.';
      });
    });
  }
  initialize();
})();
