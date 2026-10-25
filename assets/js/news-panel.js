/* Four compact podcast-style news players using the site's RSS cache. */
(function () {
  'use strict';
  if (window.__libraryNewsPanelInstalled) return;
  window.__libraryNewsPanelInstalled = true;

  var feeds = [
    { id: 'bbc', source: 'BBC Global News Podcast', lang: 'en' },
    { id: 'guardian', source: 'The Guardian · Today in Focus', lang: 'en' },
    { id: 'nhk', source: 'NHK ラジオニュース', lang: 'ja' },
    { id: 'chronicle', source: 'Chronicle · News Connect', lang: 'ja' }
  ];
  var root = document.getElementById('library-news-panel');
  var mainToggle = document.getElementById('library-news-toggle');
  if (!root || !mainToggle) return;
  var feedItems = {};
  var activeEpisode = {};
  var initialized = false;

  function clean(value) {
    var box = document.createElement('div');
    box.innerHTML = String(value || '');
    box.querySelectorAll('script,style,iframe,object,embed').forEach(function (node) { node.remove(); });
    return (box.textContent || box.innerText || '').replace(/\\s+/g, ' ').trim();
  }
  function historyKey(feed, item) {
    return 'personal-library-news-played:' + feed.id + ':' + (item.title || item.link || '').trim().toLowerCase();
  }
  function isPlayed(feed, item) {
    try { return localStorage.getItem(historyKey(feed, item)) === '1'; } catch (_) { return false; }
  }
  function setPlayed(feed, item, played) {
    try {
      if (played) localStorage.setItem(historyKey(feed, item), '1');
      else localStorage.removeItem(historyKey(feed, item));
    } catch (_) {}
  }
  function formatDate(value, lang) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(lang === 'ja' ? 'ja-JP' : 'en-GB', {
      year: 'numeric', month: 'short', day: 'numeric'
    }).format(date);
  }
  function setNewsOpen(open) {
    mainToggle.setAttribute('aria-expanded', String(open));
    root.hidden = !open;
    mainToggle.classList.toggle('is-open', open);
    var inner = document.querySelector('.content-wrapper__inner');
    if (inner) inner.classList.toggle('news-panel-open', open);
    if (open) {
      document.querySelectorAll('.site-tab-links a.site-tab').forEach(function (link) {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
        ['color','background-color','border-color','border-style','border-width','box-shadow'].forEach(function (property) {
          link.style.removeProperty(property);
        });
      });
    } else if (typeof window.LibraryUpdatePrimaryActive === 'function') {
      window.LibraryUpdatePrimaryActive(window.location.pathname);
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

  function renderFeed(feed) {
    var list = root.querySelector('[data-news-list="' + feed.id + '"]');
    var status = root.querySelector('[data-news-status="' + feed.id + '"]');
    var count = root.querySelector('[data-news-count="' + feed.id + '"]');
    var filter = root.querySelector('[data-news-filter="' + feed.id + '"]');
    if (!list || !status || !filter) return;
    list.textContent = '';
    var all = feedItems[feed.id] || [];
    var mode = filter.value || 'all';
    var visible = all.filter(function (item) {
      if (mode === 'played') return isPlayed(feed, item);
      if (mode === 'unplayed') return !isPlayed(feed, item);
      return true;
    });
    if (count) count.textContent = feed.lang === 'ja' ?
      (mode === 'all' ? '最新 ' : '') + visible.length + ' 件' :
      (mode === 'all' ? 'Latest ' : '') + visible.length + ' episode' + (visible.length === 1 ? '' : 's');
    if (!visible.length) {
      var empty = document.createElement('li');
      empty.className = 'news-podcast-empty';
      empty.textContent = feed.lang === 'ja' ? 'この条件のエピソードはありません。' : 'No episodes in this filter.';
      list.appendChild(empty);
      return;
    }
    visible.forEach(function (item, index) {
      var row = document.createElement('li');
      row.className = 'news-podcast-episode';
      var play = document.createElement('button');
      play.type = 'button';
      play.className = 'news-podcast-episode__play';
      play.setAttribute('aria-label', (feed.lang === 'ja' ? '再生: ' : 'Play: ') + item.title);
      play.textContent = '▶';
      var text = document.createElement('span');
      text.className = 'news-podcast-episode__text';
      var title = document.createElement('span');
      title.className = 'news-podcast-episode__title';
      title.textContent = item.title;
      var meta = document.createElement('span');
      meta.className = 'news-podcast-episode__meta';
      var dateText = formatDate(item.date, feed.lang);
      var played = isPlayed(feed, item);
      meta.textContent = (dateText ? dateText + ' · ' : '') + (feed.lang === 'ja' ? (played ? '再生済み' : '未再生') : (played ? 'Played' : 'Unplayed'));
      if (played) row.classList.add('is-played');
      text.appendChild(title);
      text.appendChild(meta);
      row.appendChild(play);
      row.appendChild(text);
      play.addEventListener('click', function () {
        var audio = root.querySelector('[data-news-audio="' + feed.id + '"]');
        if (!item.audioUrl) {
          if (item.link) window.open(item.link, '_blank', 'noopener');
          status.textContent = feed.lang === 'ja' ? '音声ファイルがないため、公式エピソードを開きます。' : 'No direct audio file in this feed; opening the official episode.';
          return;
        }
        root.querySelectorAll('.news-podcast-audio').forEach(function (other) {
          if (other !== audio) other.pause();
        });
        if (activeEpisode[feed.id] === item.audioUrl && audio.src === item.audioUrl && !audio.paused) {
          audio.pause();
          return;
        }
        activeEpisode[feed.id] = item.audioUrl;
        audio.src = item.audioUrl;
        audio.dataset.episodeTitle = item.title;
        audio.load();
        var attempt = audio.play();
        if (attempt && attempt.catch) attempt.catch(function () {
          status.textContent = feed.lang === 'ja' ? '再生できませんでした。下のプレーヤーでもう一度お試しください。' : 'Playback could not start. Try the player controls below.';
        });
        status.textContent = item.title;
      });
      list.appendChild(row);
    });
  }
  function initializeFeeds() {
    if (initialized) return;
    initialized = true;
    var audioElements = root.querySelectorAll('.news-podcast-audio');
    audioElements.forEach(function (audio) {
      audio.addEventListener('ended', function () {
        var feed = feeds.find(function (candidate) { return candidate.id === audio.getAttribute('data-news-audio'); });
        var item = feed && (feedItems[feed.id] || []).find(function (episode) { return episode.audioUrl === audio.currentSrc || episode.audioUrl === activeEpisode[feed.id]; });
        if (feed && item) { setPlayed(feed, item, true); renderFeed(feed); }
      });
    });
    feeds.forEach(function (feed) {
      var filter = root.querySelector('[data-news-filter="' + feed.id + '"]');
      if (filter) filter.addEventListener('change', function () { renderFeed(feed); });
    });
    fetch('/assets/data/news.json?v=20261025-5', { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (data) {
      feeds.forEach(function (feed) {
        var status = root.querySelector('[data-news-status="' + feed.id + '"]');
        var items = Array.isArray(data[feed.id]) ? data[feed.id].map(function (item) {
          return {
            title: clean(item.title),
            summary: clean(item.summary || item.description),
            link: item.link || '',
            audioUrl: item.audioUrl || '',
            date: item.date || ''
          };
        }).filter(function (item) { return item.title; }).slice(0, 5) : [];
        feedItems[feed.id] = items;
        if (status) {
          var state = data.feedStatus && data.feedStatus[feed.id];
          status.textContent = items.length ?
            (feed.lang === 'ja' ? '最新エピソードを読み込みました' : 'Latest episodes ready') :
            (state && state.error ? state.error : (feed.lang === 'ja' ? 'エピソードがありません' : 'No episodes available'));
        }
        renderFeed(feed);
      });
    }).catch(function () {
      feeds.forEach(function (feed) {
        var status = root.querySelector('[data-news-status="' + feed.id + '"]');
        if (status) status.textContent = feed.lang === 'ja' ? '読み込みに失敗しました。時間をおいて再度お試しください。' : 'Could not load episodes. Please try again later.';
      });
    });
  }
  initializeFeeds();
})();
