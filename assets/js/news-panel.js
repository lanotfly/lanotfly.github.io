/* Simple text-first latest-five news view powered by podcast RSS feeds. */
(function () {
  'use strict';
  if (window.__libraryNewsPanelInstalled) return;
  window.__libraryNewsPanelInstalled = true;

  var feeds = [
    { id: 'english', source: 'The Guardian · Today in Focus', url: 'https://www.theguardian.com/news/series/todayinfocus/podcast.xml', lang: 'en' },
    { id: 'japanese', source: 'NHK ラジオニュース', url: 'https://www.nhk.or.jp/s-media/news/podcast/list/v1/all.xml', lang: 'ja' }
  ];
  var cache = {};
  var root = document.getElementById('library-news-panel');
  var mainToggle = document.getElementById('library-news-toggle');
  if (!root || !mainToggle) return;
  var initialized = false;

  function initializeFeeds() {
    if (initialized) return;
    initialized = true;
    feeds.forEach(renderFeed);
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

  initializeFeeds();

  function clean(value) {
    var box = document.createElement('div');
    box.innerHTML = String(value || '');
    box.querySelectorAll('script,style,iframe,object,embed').forEach(function (node) { node.remove(); });
    return (box.textContent || box.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function xmlItems(xml, feed) {
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('RSS XML parse error');
    var nodes = Array.prototype.slice.call(doc.getElementsByTagName('item'));
    if (!nodes.length) nodes = Array.prototype.slice.call(doc.getElementsByTagName('entry'));
    var items = nodes.map(function (node) {
      function value(tag) {
        var found = Array.prototype.slice.call(node.getElementsByTagName('*')).find(function (el) {
          return (el.localName || el.nodeName.split(':').pop()).toLowerCase() === tag.toLowerCase();
        });
        return found ? (found.textContent || '').trim() : '';
      }
      var link = value('link');
      if (!link) {
        var linkNode = node.getElementsByTagName('link')[0];
        if (linkNode) link = linkNode.getAttribute('href') || '';
      }
      return {
        title: clean(value('title')),
        summary: clean(value('encoded') || value('content') || value('description') || value('summary')),
        link: link,
        date: clean(value('pubDate') || value('published') || value('updated') || value('date')),
        source: feed.source
      };
    }).filter(function (item) { return item.title && /^https?:\/\//i.test(item.link); });
    if (!items.length) throw new Error('RSS feed contained no usable items');
    return items.slice(0, 5);
  }

  function jsonItems(data, feed) {
    if (!data || data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('RSS-to-JSON returned no items');
    var items = data.items.map(function (item) {
      return {
        title: clean(item.title),
        summary: clean(item.description || item.content || item.contentSnippet),
        link: item.link || '',
        date: clean(item.pubDate || item.date),
        source: feed.source
      };
    }).filter(function (item) { return item.title && /^https?:\/\//i.test(item.link); }).slice(0, 5);
    if (!items.length) throw new Error('RSS-to-JSON contained no usable items');
    return items;
  }

  function cachedItems(data, feed) {
    if (!data || !Array.isArray(data[feed.id])) throw new Error('No cached news items');
    var items = data[feed.id].map(function (item) {
      return {
        title: clean(item.title),
        summary: clean(item.summary || item.description || item.content),
        link: item.link || '',
        date: clean(item.date || item.pubDate),
        source: feed.source
      };
    }).filter(function (item) { return item.title && /^https?:\/\//i.test(item.link); }).slice(0, 5);
    if (!items.length) throw new Error('Cached feed is empty');
    return items;
  }

  function getText(url) {
    return fetch(url, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    });
  }
  function getJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });
  }

  function fetchFeed(feed) {
    if (cache[feed.id]) return Promise.resolve(cache[feed.id]);
    var encoded = encodeURIComponent(feed.url);
    var attempts = [
      function () { return getJson('/assets/data/news.json?v=20261025-3').then(function (data) { return cachedItems(data, feed); }); },
      function () { return getJson('https://api.rss2json.com/v1/api.json?rss_url=' + encoded).then(function (data) { return jsonItems(data, feed); }); },
      function () { return getText('https://api.allorigins.win/raw?url=' + encoded).then(function (xml) { return xmlItems(xml, feed); }); },
      function () { return getText('https://corsproxy.io/?url=' + encoded).then(function (xml) { return xmlItems(xml, feed); }); }
    ];
    function next(index) {
      return index >= attempts.length ? Promise.reject(new Error('All RSS providers failed')) :
        attempts[index]().catch(function () { return next(index + 1); });
    }
    return next(0).then(function (items) { cache[feed.id] = items; return items; });
  }

  function formatDate(value, lang) {
    if (!value) return '';
    var date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(lang === 'ja' ? 'ja-JP' : 'en-GB', {
      year: 'numeric', month: 'short', day: 'numeric'
    }).format(date);
  }

  function makeItem(item, lang) {
    var li = document.createElement('li');
    li.className = 'library-news-item';

    var heading = document.createElement('h3');
    heading.className = 'library-news-item__title';
    var link = document.createElement('a');
    link.className = 'library-news-item__link';
    link.href = item.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = item.title;
    heading.appendChild(link);
    li.appendChild(heading);

    if (item.date) {
      var date = document.createElement('p');
      date.className = 'library-news-date';
      date.textContent = formatDate(item.date, lang);
      li.appendChild(date);
    }

    if (item.summary) {
      var summary = document.createElement('p');
      summary.className = 'library-news-summary';
      summary.textContent = item.summary;
      li.appendChild(summary);
    }
    return li;
  }

  function renderFeed(feed) {
    var list = root.querySelector('[data-news-list="' + feed.id + '"]');
    var status = root.querySelector('[data-news-status="' + feed.id + '"]');
    if (!list || !status) return;
    status.textContent = feed.lang === 'ja' ? 'ニュースを読み込み中…' : 'Loading latest news…';
    list.textContent = '';

    fetchFeed(feed).then(function (items) {
      list.textContent = '';
      items.forEach(function (item) { list.appendChild(makeItem(item, feed.lang)); });
      status.textContent = feed.lang === 'ja' ?
        '最新' + items.length + '件 · ' + feed.source :
        'Latest ' + items.length + ' · ' + feed.source;
    }).catch(function () {
      status.textContent = feed.lang === 'ja' ? 'ニュースを読み込めませんでした。' : 'Could not load the latest news.';
      var retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'library-news-retry';
      retry.textContent = feed.lang === 'ja' ? '再読み込み' : 'Retry';
      retry.addEventListener('click', function () { delete cache[feed.id]; renderFeed(feed); });
      status.appendChild(document.createTextNode(' '));
      status.appendChild(retry);
    });
  }

  feeds.forEach(function (feed) {
    var toggle = root.querySelector('[data-news-toggle="' + feed.id + '"]');
    var body = root.querySelector('[data-news-body="' + feed.id + '"]');
    if (toggle && body) toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      body.hidden = !open;
      var mark = toggle.querySelector('.library-news-column__mark');
      if (mark) mark.textContent = open ? '−' : '+';
    });
  });
})();
